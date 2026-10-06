(() => {
  const CONFIG = window.DIGUL_CONFIG;
  const EXP = window.DigulExperience;
  if (!CONFIG || !EXP) return;

  const API = CONFIG.store?.souffleApi || "";
  const TIMEOUT = CONFIG.store?.requestTimeoutMs || 3500;
  const REMOTE_ENABLED = Boolean(CONFIG.souffle?.remoteSync && API);
  const QUEUE_KEY = "caffiend:souffle-sync:v3";
  const ARCHIVE_KEY = "caffiend:souffle-archive:v1";
  const MAX_QUEUE = 120;
  const MAX_ARCHIVE = 120;
  const HEALTH_TTL_MS = 60_000;
  const COOLDOWN_MS = 30_000;

  let backend = {
    state: REMOTE_ENABLED ? "unknown" : "disabled",
    checkedAt:0,
    cooldownUntil:0,
    error:""
  };
  let healthPromise = null;

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function readQueue() {
    const value = readJson(QUEUE_KEY, []);
    return Array.isArray(value) ? value.slice(-MAX_QUEUE) : [];
  }

  function writeQueue(queue) {
    writeJson(QUEUE_KEY, queue.slice(-MAX_QUEUE));
  }

  function archive(kind, payload, status = "local") {
    const rows = readJson(ARCHIVE_KEY, []);
    const list = Array.isArray(rows) ? rows : [];
    const key = `${kind}:${payload?.sessionId || ""}`;
    const next = list.filter(item => item.key !== key);
    next.push({ key, kind, payload, status, savedAt:new Date().toISOString() });
    writeJson(ARCHIVE_KEY, next.slice(-MAX_ARCHIVE));
  }

  function markArchivedSynced(kind, sessionId) {
    const rows = readJson(ARCHIVE_KEY, []);
    if (!Array.isArray(rows)) return;
    rows.forEach(item => {
      if (item.key === `${kind}:${sessionId}`) {
        item.status = "synced";
        item.syncedAt = new Date().toISOString();
      }
    });
    writeJson(ARCHIVE_KEY, rows.slice(-MAX_ARCHIVE));
  }

  function enqueue(kind, payload, error = "") {
    archive(kind, payload, "queued");
    const queue = readQueue();
    const existing = queue.find(item => item.kind === kind && item.payload?.sessionId === payload?.sessionId);
    if (existing) {
      existing.payload = payload;
      existing.lastError = error;
      existing.updatedAt = new Date().toISOString();
    } else {
      queue.push({
        kind,
        payload,
        queuedAt:new Date().toISOString(),
        attempts:0,
        lastError:error
      });
    }
    writeQueue(queue);
  }

  function setBackend(state, error = "") {
    backend = {
      state,
      checkedAt:Date.now(),
      cooldownUntil:state === "offline" ? Date.now() + COOLDOWN_MS : 0,
      error
    };
    window.dispatchEvent(new CustomEvent("caffiend:souffle-sync-state", { detail:status() }));
  }

  async function fetchJson(url, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(TIMEOUT, 2800));
    try {
      const response = await fetch(url, { ...init, signal:controller.signal, cache:"no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data?.error || `HTTP_${response.status}`);
        error.status = response.status;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function probeHealth(force = false) {
    if (!REMOTE_ENABLED) {
      setBackend("disabled", "REMOTE_DISABLED");
      return false;
    }
    if (!navigator.onLine) {
      setBackend("offline", "BROWSER_OFFLINE");
      return false;
    }
    const now = Date.now();
    if (!force && backend.state === "online" && now - backend.checkedAt < HEALTH_TTL_MS) return true;
    if (!force && backend.state === "offline" && now < backend.cooldownUntil) return false;
    if (healthPromise) return healthPromise;

    healthPromise = (async () => {
      try {
        const data = await fetchJson(`${API}/health`, { method:"GET" });
        const ok = data?.ok === true && data?.service === "souffle-api";
        setBackend(ok ? "online" : "offline", ok ? "" : "INVALID_HEALTH");
        return ok;
      } catch (error) {
        setBackend("offline", String(error?.message || error));
        return false;
      } finally {
        healthPromise = null;
      }
    })();
    return healthPromise;
  }

  async function request(path, payload) {
    if (!(await probeHealth(false))) throw new Error("SOUFFLE_BACKEND_UNAVAILABLE");
    try {
      const data = await fetchJson(`${API}${path}`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify(payload)
      });
      if (backend.state !== "online") setBackend("online");
      return data;
    } catch (error) {
      if (Number(error?.status || 0) >= 500 || !error?.status) {
        setBackend("offline", String(error?.message || error));
      }
      throw error;
    }
  }

  function basePayload() {
    return {
      storeId: CONFIG.store.id,
      playerId: EXP.getPlayerId(),
      nickname: EXP.getNickname()
    };
  }

  async function submitRun(run) {
    const payload = { ...basePayload(), ...run };
    archive("run", payload, "local");
    try {
      const data = await request("/run", payload);
      markArchivedSynced("run", payload.sessionId);
      return { ok:true, queued:false, data, backend:backend.state };
    } catch (error) {
      const reason = String(error?.message || error);
      enqueue("run", payload, reason);
      return { ok:false, queued:true, local:true, backend:backend.state, error:reason };
    }
  }

  async function submitFeedback(feedback) {
    const payload = { ...basePayload(), ...feedback };
    archive("feedback", payload, "local");
    try {
      const data = await request("/feedback", payload);
      markArchivedSynced("feedback", payload.sessionId);
      return { ok:true, queued:false, data, backend:backend.state };
    } catch (error) {
      if (String(error?.message || "") === "RUN_NOT_FOUND") {
        await sleep(850);
        try {
          const data = await request("/feedback", payload);
          markArchivedSynced("feedback", payload.sessionId);
          return { ok:true, queued:false, data, retried:true, backend:backend.state };
        } catch (_) {}
      }
      const reason = String(error?.message || error);
      enqueue("feedback", payload, reason);
      return { ok:false, queued:true, local:true, backend:backend.state, error:reason };
    }
  }

  async function flushQueue({ forceHealth = false } = {}) {
    const queue = readQueue();
    if (!queue.length) return { sent:0, remaining:0, backend:backend.state };
    if (!(await probeHealth(forceHealth))) {
      return { sent:0, remaining:queue.length, backend:backend.state };
    }

    const ordered = [...queue].sort((a,b) => Number(a.kind === "feedback") - Number(b.kind === "feedback"));
    const remaining = [];
    let sent = 0;
    for (const item of ordered) {
      try {
        await request(item.kind === "feedback" ? "/feedback" : "/run", item.payload);
        markArchivedSynced(item.kind, item.payload?.sessionId);
        sent++;
      } catch (error) {
        remaining.push({
          ...item,
          attempts:Number(item.attempts || 0) + 1,
          lastError:String(error?.message || error),
          updatedAt:new Date().toISOString()
        });
        if (backend.state !== "online") {
          const rest = ordered.slice(ordered.indexOf(item) + 1).filter(x => !remaining.includes(x));
          remaining.push(...rest);
          break;
        }
      }
    }
    writeQueue(remaining);
    return { sent, remaining:remaining.length, backend:backend.state };
  }

  function status() {
    const archiveRows = readJson(ARCHIVE_KEY, []);
    return {
      enabled:REMOTE_ENABLED,
      backend:backend.state,
      lastError:backend.error,
      checkedAt:backend.checkedAt,
      queued:readQueue().length,
      archived:Array.isArray(archiveRows) ? archiveRows.length : 0,
      online:navigator.onLine
    };
  }

  function exportLocal() {
    return {
      exportedAt:new Date().toISOString(),
      configVersion:CONFIG.version,
      status:status(),
      queue:readQueue(),
      archive:readJson(ARCHIVE_KEY, [])
    };
  }

  window.CaffiendSouffleService = {
    submitRun,
    submitFeedback,
    flushQueue,
    probeHealth,
    status,
    exportLocal,
    queuedCount:() => readQueue().length
  };

  window.addEventListener("online", () => {
    probeHealth(true).then(ok => ok && flushQueue()).catch(() => {});
  });
  window.addEventListener("offline", () => setBackend("offline", "BROWSER_OFFLINE"));

  setTimeout(() => {
    probeHealth(false).then(ok => ok && flushQueue()).catch(() => {});
  }, 900);
})();
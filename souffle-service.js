(() => {
  const CONFIG = window.DIGUL_CONFIG;
  const EXP = window.DigulExperience;
  if (!CONFIG || !EXP) return;

  const API = CONFIG.store?.souffleApi || "";
  const TIMEOUT = CONFIG.store?.requestTimeoutMs || 3500;
  const QUEUE_KEY = "caffiend:souffle-sync:v2";
  const MAX_QUEUE = 24;

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function readQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      return Array.isArray(value) ? value.slice(-MAX_QUEUE) : [];
    } catch (_) {
      return [];
    }
  }

  function writeQueue(queue) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))); } catch (_) {}
  }

  function enqueue(kind, payload) {
    const queue = readQueue();
    const duplicate = queue.some(item => item.kind === kind && item.payload?.sessionId === payload?.sessionId);
    if (!duplicate) queue.push({ kind, payload, queuedAt:new Date().toISOString() });
    writeQueue(queue);
  }

  async function request(path, payload) {
    if (!API) throw new Error("SOUFFLE_API_DISABLED");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const response = await fetch(`${API}${path}`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify(payload),
        signal:controller.signal,
        cache:"no-store"
      });
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

  function basePayload() {
    return {
      storeId: CONFIG.store.id,
      playerId: EXP.getPlayerId(),
      nickname: EXP.getNickname()
    };
  }

  async function submitRun(run) {
    const payload = { ...basePayload(), ...run };
    try {
      const data = await request("/run", payload);
      return { ok:true, queued:false, data };
    } catch (error) {
      enqueue("run", payload);
      return { ok:false, queued:true, error:String(error?.message || error) };
    }
  }

  async function submitFeedback(feedback) {
    const payload = { ...basePayload(), ...feedback };
    try {
      const data = await request("/feedback", payload);
      return { ok:true, queued:false, data };
    } catch (error) {
      // Result submission and survey submission can happen nearly together.
      // Give the run row a short chance to land before falling back to the offline queue.
      if (String(error?.message || "") === "RUN_NOT_FOUND") {
        await sleep(850);
        try {
          const data = await request("/feedback", payload);
          return { ok:true, queued:false, data, retried:true };
        } catch (_) {}
      }
      enqueue("feedback", payload);
      setTimeout(() => flushQueue().catch(() => {}), 1400);
      return { ok:false, queued:true, error:String(error?.message || error) };
    }
  }

  async function flushQueue() {
    if (!API || !navigator.onLine) return { sent:0, remaining:readQueue().length };
    const queue = readQueue();
    if (!queue.length) return { sent:0, remaining:0 };

    // Runs must be synced before their linked feedback rows.
    const ordered = [...queue].sort((a,b) => Number(a.kind === "feedback") - Number(b.kind === "feedback"));
    const remaining = [];
    let sent = 0;
    for (const item of ordered) {
      try {
        await request(item.kind === "feedback" ? "/feedback" : "/run", item.payload);
        sent++;
      } catch (_) {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    return { sent, remaining:remaining.length };
  }

  window.CaffiendSouffleService = {
    submitRun,
    submitFeedback,
    flushQueue,
    queuedCount:() => readQueue().length
  };

  window.addEventListener("online", () => flushQueue().catch(() => {}));
  setTimeout(() => flushQueue().catch(() => {}), 1200);
})();
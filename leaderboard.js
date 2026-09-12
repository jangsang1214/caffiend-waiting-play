(() => {
  const CONFIG = window.CAFFIEND_CONFIG;
  const EXPERIENCE = window.CaffiendExperience;
  const PREFIX = "caffiend-rise";
  const TABLE_KEY = `${PREFIX}:table-session`;

  const todayKey = () => new Date().toISOString().slice(0, 10);
  const seasonKey = (seasonId) => `${PREFIX}:best:${todayKey()}:${seasonId}`;
  const allTimeKey = (seasonId) => `${PREFIX}:alltime:${seasonId}`;
  const historyKey = (seasonId) => `${PREFIX}:history:${todayKey()}:${seasonId}`;
  const rewardKey = (seasonId) => `${PREFIX}:reward:${todayKey()}:${seasonId}`;

  const safeNumber = (value) => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const safeJson = (raw, fallback) => {
    try { return JSON.parse(raw) ?? fallback; } catch (_) { return fallback; }
  };

  function readHistory(seasonId) {
    const list = safeJson(localStorage.getItem(historyKey(seasonId)), []);
    return Array.isArray(list) ? list : [];
  }

  function writeHistory(seasonId, entry) {
    const next = [entry, ...readHistory(seasonId)].slice(0, 30);
    localStorage.setItem(historyKey(seasonId), JSON.stringify(next));
    return next;
  }

  function localTop(seasonId) {
    const history = readHistory(seasonId)
      .filter((item) => Number.isFinite(Number(item?.score)))
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 5);
    return history.map((item, index) => ({
      rank: index + 1,
      score: Number(item.score),
      label: index === 0 ? "BEST ON THIS DEVICE" : `PLAY ${index + 1}`,
      mine: true
    }));
  }

  function readTable() {
    const parsed = safeJson(sessionStorage.getItem(TABLE_KEY), null);
    if (!parsed || parsed.date !== todayKey()) return { date: todayKey(), scores: [] };
    return parsed;
  }

  function writeTable(table) {
    sessionStorage.setItem(TABLE_KEY, JSON.stringify(table));
  }

  function getApiBase() {
    return String(CONFIG?.store?.leaderboardApi || "").trim().replace(/\/$/, "");
  }

  async function remoteRequest(path, options = {}) {
    const base = getApiBase();
    if (!base) throw new Error("REMOTE_DISABLED");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG?.store?.timeoutMs || 3500);
    try {
      const response = await fetch(`${base}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(options.headers || {}) }
      });
      if (!response.ok) throw new Error(`REMOTE_${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function normalizeTop(top = []) {
    if (!Array.isArray(top)) return [];
    return top.slice(0, 10).map((item, index) => ({
      rank: Number(item.rank || index + 1),
      score: safeNumber(item.score),
      label: String(item.label || item.nickname || `PLAYER ${index + 1}`).slice(0, 24),
      mine: Boolean(item.mine)
    }));
  }

  async function getSnapshot(seasonId) {
    const localDaily = safeNumber(localStorage.getItem(seasonKey(seasonId)));
    const localAllTime = safeNumber(localStorage.getItem(allTimeKey(seasonId)));
    if (getApiBase()) {
      try {
        const params = new URLSearchParams({
          storeId: CONFIG.store.id,
          seasonId,
          date: todayKey(),
          limit: "5",
          deviceId: EXPERIENCE?.getDeviceId?.() || ""
        });
        const data = await remoteRequest(`/leaderboard?${params.toString()}`);
        return {
          dailyBest: safeNumber(data.dailyBest),
          allTimeBest: safeNumber(data.allTimeBest),
          rank: data.rank ? Number(data.rank) : null,
          top: normalizeTop(data.top),
          source: "store-live",
          connected: true,
          localDaily,
          localAllTime
        };
      } catch (error) {
        console.debug("Store leaderboard unavailable; using preview mode", error);
      }
    }
    return {
      dailyBest: localDaily,
      allTimeBest: localAllTime,
      rank: localDaily > 0 ? 1 : null,
      top: localTop(seasonId),
      source: "local-preview",
      connected: false,
      localDaily,
      localAllTime
    };
  }

  async function submitScore({ seasonId, score, metrics = {}, playId = "" }) {
    const numericScore = Math.max(0, Math.round(Number(score || 0)));
    const dailyBefore = safeNumber(localStorage.getItem(seasonKey(seasonId)));
    const allTimeBefore = safeNumber(localStorage.getItem(allTimeKey(seasonId)));
    const localDailyRecord = numericScore > dailyBefore;
    const localAllTimeRecord = numericScore > allTimeBefore;

    if (localDailyRecord) localStorage.setItem(seasonKey(seasonId), String(numericScore));
    if (localAllTimeRecord) localStorage.setItem(allTimeKey(seasonId), String(numericScore));
    writeHistory(seasonId, { score: numericScore, at: Date.now(), playId });

    if (getApiBase()) {
      try {
        const data = await remoteRequest("/scores", {
          method: "POST",
          body: JSON.stringify({
            storeId: CONFIG.store.id,
            seasonId,
            score: numericScore,
            date: todayKey(),
            playId,
            deviceId: EXPERIENCE?.getDeviceId?.() || "",
            sessionId: EXPERIENCE?.getSessionId?.() || "",
            attribution: EXPERIENCE?.getAttribution?.() || {},
            metrics
          })
        });
        return {
          dailyBefore: safeNumber(data.dailyBefore),
          dailyBest: safeNumber(data.dailyBest),
          allTimeBest: safeNumber(data.allTimeBest),
          rank: data.rank ? Number(data.rank) : null,
          top: normalizeTop(data.top),
          isDailyRecord: Boolean(data.isDailyRecord),
          isAllTimeRecord: Boolean(data.isAllTimeRecord),
          reward: data.reward || null,
          source: "store-live",
          connected: true
        };
      } catch (error) {
        console.debug("Store score submit unavailable; saved locally", error);
      }
    }

    const dailyBest = Math.max(dailyBefore, numericScore);
    return {
      dailyBefore,
      dailyBest,
      allTimeBest: Math.max(allTimeBefore, numericScore),
      rank: numericScore > 0 ? localTop(seasonId).findIndex((item) => item.score === numericScore) + 1 : null,
      top: localTop(seasonId),
      isDailyRecord: localDailyRecord,
      isAllTimeRecord: localAllTimeRecord,
      reward: null,
      source: "local-preview",
      connected: false
    };
  }

  function getPrototypeRewardState(seasonId) {
    const claimed = localStorage.getItem(rewardKey(seasonId)) === "1";
    return { claimed, available: !claimed };
  }

  function markPrototypeRewardShown(seasonId) {
    localStorage.setItem(rewardKey(seasonId), "1");
    return getPrototypeRewardState(seasonId);
  }

  async function addTableScore({ seasonId, score }) {
    const table = readTable();
    const playerNumber = table.scores.length + 1;
    table.scores.push({ playerNumber, seasonId, score: Math.round(score), at: Date.now() });
    writeTable(table);
    return getTableSnapshot();
  }

  async function getTableSnapshot() {
    const table = readTable();
    const ranked = [...table.scores].sort((a, b) => b.score - a.score);
    return {
      count: table.scores.length,
      nextPlayer: table.scores.length + 1,
      latest: table.scores[table.scores.length - 1] || null,
      leader: ranked[0] || null,
      scores: ranked,
      source: "session-device"
    };
  }

  async function clearTable() {
    sessionStorage.removeItem(TABLE_KEY);
    return getTableSnapshot();
  }

  window.CaffiendLeaderboard = {
    mode: getApiBase() ? "store-live" : "local-preview",
    getSnapshot,
    submitScore,
    getPrototypeRewardState,
    markPrototypeRewardShown,
    addTableScore,
    getTableSnapshot,
    clearTable
  };
})();
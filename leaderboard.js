(() => {
  const CONFIG = window.DIGUL_CONFIG;
  const EXP = window.DigulExperience;
  const PREFIX = "diguldigul";

  const timeoutMs = () => CONFIG.store.requestTimeoutMs || 3500;
  const apiBase = () => String(CONFIG.store.leaderboardApi || "").trim().replace(/\/$/, "");
  const weeklyKey = () => EXP.getWeekKey();
  const bestKey = () => `${PREFIX}:best:${weeklyKey()}:${EXP.getPlayerId()}`;
  const reachedKey = () => `${PREFIX}:reached:${weeklyKey()}:${EXP.getPlayerId()}`;

  const safeNumber = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const safeJson = (raw, fallback) => {
    try { return JSON.parse(raw) ?? fallback; } catch (_) { return fallback; }
  };

  async function request(path, options = {}) {
    const base = apiBase();
    if (!base) throw new Error("REMOTE_DISABLED");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs());
    try {
      const response = await fetch(`${base}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { "Content-Type":"application/json", ...(options.headers || {}) }
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function normalizeRows(rows = []) {
    if (!Array.isArray(rows)) return [];
    return rows.slice(0, 50).map((row, index) => ({
      rank: safeNumber(row.rank || index + 1),
      playerId: String(row.playerId || row.player_id || ""),
      nickname: String(row.nickname || "PLAYER").slice(0, 10),
      score: safeNumber(row.score),
      mine: Boolean(row.mine)
    }));
  }

  function getLocalBest() {
    return safeNumber(localStorage.getItem(bestKey()));
  }

  function setLocalBest(score) {
    const before = getLocalBest();
    const next = Math.max(before, safeNumber(score));
    if (next > before) {
      localStorage.setItem(bestKey(), String(next));
      localStorage.setItem(reachedKey(), String(Date.now()));
    }
    return { before, best:next, improved:next > before };
  }

  function localSnapshot() {
    const score = getLocalBest();
    const nickname = EXP.getNickname() || "나";
    return {
      connected:false,
      source:"local-preview",
      weekKey:weeklyKey(),
      weekLabel:EXP.getWeekLabel(),
      myRank: score > 0 ? 1 : null,
      myBest:score,
      topScore:score,
      rows: score > 0 ? [{
        rank:1,
        playerId:EXP.getPlayerId(),
        nickname,
        score,
        mine:true
      }] : []
    };
  }

  async function getLeaderboard() {
    if (!apiBase()) return localSnapshot();
    try {
      const q = new URLSearchParams({
        storeId:CONFIG.store.id,
        weekKey:weeklyKey(),
        playerId:EXP.getPlayerId()
      });
      const data = await request(`/leaderboard?${q.toString()}`);
      return {
        connected:true,
        source:"store-live",
        weekKey:data.weekKey || weeklyKey(),
        weekLabel:EXP.getWeekLabel(),
        myRank:data.myRank ? safeNumber(data.myRank) : null,
        myBest:safeNumber(data.myBest),
        topScore:safeNumber(data.topScore),
        rows:normalizeRows(data.rows)
      };
    } catch (error) {
      console.debug("Leaderboard fallback", error);
      return localSnapshot();
    }
  }

  async function startGame({ gameId, nickname }) {
    if (!apiBase()) return { connected:false, source:"local-preview", gameId };
    try {
      const data = await request("/game/start", {
        method:"POST",
        body:JSON.stringify({
          storeId:CONFIG.store.id,
          weekKey:weeklyKey(),
          gameId,
          playerId:EXP.getPlayerId(),
          nickname
        })
      });
      return { connected:true, source:"store-live", ...data };
    } catch (error) {
      console.debug("Game start fallback", error);
      return { connected:false, source:"local-preview", gameId };
    }
  }

  async function pushEvents({ gameId, nickname, events, currentScore, maxLevel }) {
    const local = setLocalBest(currentScore);
    if (!apiBase()) {
      return {
        connected:false,
        source:"local-preview",
        accepted:events.length,
        myBest:local.best,
        myRank:local.best > 0 ? 1 : null,
        topScore:local.best
      };
    }
    try {
      const data = await request("/game/events", {
        method:"POST",
        body:JSON.stringify({
          storeId:CONFIG.store.id,
          weekKey:weeklyKey(),
          gameId,
          playerId:EXP.getPlayerId(),
          nickname,
          events,
          currentScore:safeNumber(currentScore),
          maxLevel:safeNumber(maxLevel)
        })
      });
      return {
        connected:true,
        source:"store-live",
        accepted:safeNumber(data.accepted),
        myBest:safeNumber(data.myBest),
        myRank:data.myRank ? safeNumber(data.myRank) : null,
        topScore:safeNumber(data.topScore)
      };
    } catch (error) {
      console.debug("Event sync fallback", error);
      return {
        connected:false,
        source:"local-preview",
        accepted:0,
        myBest:local.best,
        myRank:local.best > 0 ? 1 : null,
        topScore:local.best
      };
    }
  }

  async function finishGame({ gameId, nickname, currentScore, maxLevel, lastSeq }) {
    const local = setLocalBest(currentScore);
    if (!apiBase()) {
      return {
        connected:false,
        source:"local-preview",
        myBest:local.best,
        myRank:local.best > 0 ? 1 : null,
        topScore:local.best
      };
    }
    try {
      const data = await request("/game/finish", {
        method:"POST",
        body:JSON.stringify({
          storeId:CONFIG.store.id,
          weekKey:weeklyKey(),
          gameId,
          playerId:EXP.getPlayerId(),
          nickname,
          currentScore:safeNumber(currentScore),
          maxLevel:safeNumber(maxLevel),
          lastSeq:safeNumber(lastSeq)
        })
      });
      return {
        connected:true,
        source:"store-live",
        myBest:safeNumber(data.myBest),
        myRank:data.myRank ? safeNumber(data.myRank) : null,
        topScore:safeNumber(data.topScore)
      };
    } catch (error) {
      console.debug("Finish sync fallback", error);
      return {
        connected:false,
        source:"local-preview",
        myBest:local.best,
        myRank:local.best > 0 ? 1 : null,
        topScore:local.best
      };
    }
  }

  window.DigulLeaderboard = {
    mode: apiBase() ? "store-live" : "local-preview",
    getLeaderboard,
    startGame,
    pushEvents,
    finishGame,
    getLocalBest,
    setLocalBest
  };
})();
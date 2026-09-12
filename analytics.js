(() => {
  const EXPERIENCE = window.CaffiendExperience;
  const PREFIX = "caffiend-moments:analytics";
  const today = () => new Date().toISOString().slice(0, 10);
  const key = () => `${PREFIX}:${today()}`;

  const safeParse = (raw, fallback) => {
    try { return JSON.parse(raw) ?? fallback; } catch (_) { return fallback; }
  };

  function read() {
    const data = safeParse(localStorage.getItem(key()), {});
    return data && typeof data === "object" ? data : {};
  }

  function write(data) {
    localStorage.setItem(key(), JSON.stringify(data));
  }

  function track(event, meta = {}) {
    const data = read();
    data.counts = data.counts || {};
    data.counts[event] = Number(data.counts[event] || 0) + 1;
    data.events = Array.isArray(data.events) ? data.events : [];
    const payload = {
      event,
      at: new Date().toISOString(),
      meta,
      attribution: EXPERIENCE?.getAttribution?.() || {}
    };
    data.events.push(payload);
    data.events = data.events.slice(-80);
    data.lastEvent = payload;
    data.updatedAt = payload.at;
    write(data);
    return data;
  }

  function funnel() {
    const counts = read().counts || {};
    const starts = Number(counts.game_start || 0);
    const completes = Number(counts.game_complete || 0);
    const shares = Number(counts.result_share || 0) + Number(counts.challenge_share || 0);
    return {
      starts,
      completes,
      shares,
      completionRate: starts ? Math.round((completes / starts) * 100) : 0,
      shareRate: completes ? Math.round((shares / completes) * 100) : 0
    };
  }

  window.CaffiendAnalytics = {
    mode: "local-experiment",
    track,
    snapshot: read,
    funnel
  };
})();
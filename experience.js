(() => {
  const PREFIX = "caffiend-moments";
  const DEVICE_KEY = `${PREFIX}:device-id`;
  const PASSPORT_KEY = `${PREFIX}:season-passport`;
  const SESSION_KEY = `${PREFIX}:session-id`;
  const SEASONS = ["spring", "summer", "autumn", "winter"];

  const safeParse = (raw, fallback) => {
    try { return JSON.parse(raw) ?? fallback; } catch (_) { return fallback; }
  };

  const uid = (prefix) => {
    if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  };

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = uid("device");
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uid("session");
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function readPassport() {
    const raw = safeParse(localStorage.getItem(PASSPORT_KEY), {});
    return SEASONS.reduce((acc, season) => {
      const value = raw?.[season];
      acc[season] = value && typeof value === "object" ? value : null;
      return acc;
    }, {});
  }

  function writePassport(passport) {
    localStorage.setItem(PASSPORT_KEY, JSON.stringify(passport));
  }

  function getPassport() {
    const entries = readPassport();
    const completed = SEASONS.filter((season) => Boolean(entries[season]));
    return {
      entries,
      completed,
      count: completed.length,
      total: SEASONS.length,
      complete: completed.length === SEASONS.length
    };
  }

  function stampSeason(seasonId, score) {
    if (!SEASONS.includes(seasonId)) return getPassport();
    const passport = readPassport();
    const before = passport[seasonId];
    passport[seasonId] = {
      firstAt: before?.firstAt || new Date().toISOString(),
      lastAt: new Date().toISOString(),
      plays: Number(before?.plays || 0) + 1,
      best: Math.max(Number(before?.best || 0), Number(score || 0))
    };
    writePassport(passport);
    return getPassport();
  }

  function getAttribution() {
    const params = new URLSearchParams(location.search);
    return {
      source: params.get("src") || params.get("utm_source") || "direct",
      campaign: params.get("campaign") || params.get("utm_campaign") || "store-waiting-play",
      table: params.get("table") || "",
      medium: params.get("utm_medium") || "qr",
      content: params.get("utm_content") || ""
    };
  }

  function getChallenge() {
    const params = new URLSearchParams(location.search);
    const enabled = params.get("challenge") === "1";
    const target = Math.max(0, Number(params.get("target") || 0));
    const season = params.get("season");
    if (!enabled || !target) return null;
    return {
      target,
      seasonId: SEASONS.includes(season) ? season : null,
      source: params.get("src") || "challenge"
    };
  }

  function buildChallengeUrl({ score, seasonId }) {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("challenge", "1");
    url.searchParams.set("target", String(Math.max(0, Math.round(score || 0))));
    if (SEASONS.includes(seasonId)) url.searchParams.set("season", seasonId);
    url.searchParams.set("src", "challenge");
    return url.toString();
  }

  window.CaffiendExperience = {
    getDeviceId,
    getSessionId,
    getPassport,
    stampSeason,
    getAttribution,
    getChallenge,
    buildChallengeUrl
  };
})();
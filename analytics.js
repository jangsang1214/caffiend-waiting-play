(() => {
  const EXP = window.DigulExperience;
  const PREFIX = "diguldigul:analytics";

  const key = () => `${PREFIX}:${EXP.getWeekKey()}`;

  function read() {
    try { return JSON.parse(localStorage.getItem(key()) || "{}") || {}; }
    catch (_) { return {}; }
  }

  function write(data) {
    try { localStorage.setItem(key(), JSON.stringify(data)); } catch (_) {}
  }

  function track(event, meta = {}) {
    const data = read();
    data[event] = Number(data[event] || 0) + 1;
    data.lastEvent = event;
    data.lastMeta = meta;
    data.updatedAt = new Date().toISOString();
    write(data);
    return data;
  }

  window.DigulAnalytics = { track, snapshot:read };
})();
(() => {
  const PREFIX = "caffiend-moments:analytics";
  const today = () => new Date().toISOString().slice(0, 10);
  const key = () => `${PREFIX}:${today()}`;

  function read() {
    try {
      return JSON.parse(localStorage.getItem(key()) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function write(data) {
    localStorage.setItem(key(), JSON.stringify(data));
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

  window.CaffiendAnalytics = {
    mode: "local-mvp",
    track,
    snapshot: read
  };
})();
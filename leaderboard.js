(() => {
  const PREFIX = "caffiend-rise";
  const TABLE_KEY = `${PREFIX}:table-session`;

  const todayKey = () => new Date().toISOString().slice(0, 10);
  const seasonKey = (seasonId) => `${PREFIX}:best:${todayKey()}:${seasonId}`;
  const allTimeKey = (seasonId) => `${PREFIX}:alltime:${seasonId}`;

  const safeNumber = (value) => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function readTable() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(TABLE_KEY) || "null");
      if (!parsed || parsed.date !== todayKey()) return { date: todayKey(), scores: [] };
      return parsed;
    } catch (_) {
      return { date: todayKey(), scores: [] };
    }
  }

  function writeTable(table) {
    sessionStorage.setItem(TABLE_KEY, JSON.stringify(table));
  }

  window.CaffiendLeaderboard = {
    mode: "local-mvp",

    async getSnapshot(seasonId) {
      return {
        dailyBest: safeNumber(localStorage.getItem(seasonKey(seasonId))),
        allTimeBest: safeNumber(localStorage.getItem(allTimeKey(seasonId))),
        source: "this-device"
      };
    },

    async submitScore({ seasonId, score }) {
      const dailyBefore = safeNumber(localStorage.getItem(seasonKey(seasonId)));
      const allTimeBefore = safeNumber(localStorage.getItem(allTimeKey(seasonId)));
      const isDailyRecord = score > dailyBefore;
      const isAllTimeRecord = score > allTimeBefore;

      if (isDailyRecord) localStorage.setItem(seasonKey(seasonId), String(score));
      if (isAllTimeRecord) localStorage.setItem(allTimeKey(seasonId), String(score));

      return {
        dailyBefore,
        dailyBest: Math.max(dailyBefore, score),
        allTimeBefore,
        allTimeBest: Math.max(allTimeBefore, score),
        isDailyRecord,
        isAllTimeRecord,
        source: "this-device"
      };
    },

    async addTableScore({ seasonId, score }) {
      const table = readTable();
      const playerNumber = table.scores.length + 1;
      table.scores.push({ playerNumber, seasonId, score, at: Date.now() });
      writeTable(table);
      return this.getTableSnapshot();
    },

    async getTableSnapshot() {
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
    },

    async clearTable() {
      sessionStorage.removeItem(TABLE_KEY);
      return this.getTableSnapshot();
    }
  };
})();
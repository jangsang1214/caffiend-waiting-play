(() => {
  const PREFIX = "caffiend-rise";

  const todayKey = () => new Date().toISOString().slice(0, 10);
  const seasonKey = (seasonId) => `${PREFIX}:best:${todayKey()}:${seasonId}`;
  const allTimeKey = (seasonId) => `${PREFIX}:alltime:${seasonId}`;

  const safeNumber = (value) => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

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
    }
  };
})();
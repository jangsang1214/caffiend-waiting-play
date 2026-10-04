(() => {
  const CONFIG = window.DIGUL_CONFIG;
  const PREFIX = "diguldigul";
  const PLAYER_KEY = `${PREFIX}:player-id`;
  const NICKNAME_KEY = `${PREFIX}:nickname`;

  function uuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "xxxxxxxxyxxx4xxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }

  function getPlayerId() {
    let id = localStorage.getItem(PLAYER_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(PLAYER_KEY, id);
    }
    return id;
  }

  function getNickname() {
    return (localStorage.getItem(NICKNAME_KEY) || "").trim();
  }

  function validateNickname(value) {
    const raw = String(value || "").trim();
    if (raw.length < CONFIG.nickname.min || raw.length > CONFIG.nickname.max) {
      return { ok:false, value:raw, reason:`${CONFIG.nickname.min}~${CONFIG.nickname.max}자로 입력해 주세요.` };
    }
    if (!(new RegExp(CONFIG.nickname.pattern)).test(raw)) {
      return { ok:false, value:raw, reason:"한글·영문·숫자만 사용할 수 있어요." };
    }
    return { ok:true, value:raw, reason:"" };
  }

  function setNickname(value) {
    const checked = validateNickname(value);
    if (!checked.ok) return checked;
    localStorage.setItem(NICKNAME_KEY, checked.value);
    return checked;
  }

  function getKstParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: CONFIG.timezone,
      year:"numeric", month:"2-digit", day:"2-digit",
      weekday:"short", hour:"2-digit", minute:"2-digit", second:"2-digit",
      hourCycle:"h23"
    }).formatToParts(date);
    return Object.fromEntries(parts.map(p => [p.type, p.value]));
  }

  function getKstDateKey(date = new Date()) {
    const p = getKstParts(date);
    return `${p.year}-${p.month}-${p.day}`;
  }

  function getWeekKey(date = new Date()) {
    const p = getKstParts(date);
    const kstMidnightUtc = new Date(`${p.year}-${p.month}-${p.day}T00:00:00+09:00`);
    const weekday = kstMidnightUtc.getUTCDay();
    const mondayOffset = (weekday + 6) % 7;
    const monday = new Date(kstMidnightUtc.getTime() - mondayOffset * 86400000);
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    const f = d => new Intl.DateTimeFormat("en-CA", {
      timeZone: CONFIG.timezone, year:"numeric", month:"2-digit", day:"2-digit"
    }).format(d);
    return `${f(monday)}_${f(sunday)}`;
  }

  function getWeekLabel(date = new Date()) {
    const key = getWeekKey(date);
    const [start, end] = key.split("_");
    const short = s => {
      const [,m,d] = s.split("-");
      return `${Number(m)}/${Number(d)}`;
    };
    return `${short(start)}–${short(end)}`;
  }

  function newGameId() {
    return uuid();
  }

  window.DigulExperience = {
    getPlayerId,
    getNickname,
    setNickname,
    validateNickname,
    getKstDateKey,
    getWeekKey,
    getWeekLabel,
    newGameId
  };
})();
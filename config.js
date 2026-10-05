window.DIGUL_CONFIG = {
  version: "2.0.0",
  gameName: "디굴디굴",
  subtitle: "디저트가 데굴데굴",
  timezone: "Asia/Seoul",
  ranking: {
    period: "weekly",
    weekStartsOn: 1,
    label: "이번 주",
    refreshMs: 2000,
    eventFlushMs: 1000
  },
  store: {
    id: "caffiend-yangdeok",
    leaderboardApi: "https://pygyhbtipxhpuypjofqe.supabase.co/functions/v1/digul-api",
    souffleApi: "https://pygyhbtipxhpuypjofqe.supabase.co/functions/v1/souffle-api",
    requestTimeoutMs: 3500
  },
  nickname: {
    min: 2,
    max: 10,
    pattern: "^[가-힣A-Za-z0-9]+$"
  },
  physics: {
    width: 360,
    height: 560,
    dropY: 48,
    dangerY: 96,
    dangerHoldMs: 2000,
    freshBodyGraceMs: 1200,
    dropCooldownMs: 500,
    gravity: 1.08,
    baseRadius: 15,
    restitution: 0.11,
    friction: 0.26,
    frictionStatic: 0.52,
    density: 0.00115
  },
  gameplay: {
    droppableLevels: 5,
    completionBonus: 150,
    maxEventBuffer: 80
  },
  souffle: {
    targetSeconds: 270,
    steps: 12,
    season: "auto",
    interactions: ["tap","drag","swipe","continuous-drag"],
    remoteSync: true,
    feedback: {
      enabled: true,
      questions: ["fun","wait","anticipation"],
      scaleMin: 1,
      scaleMax: 5
    },
    scoring: {
      fixed: { "1":100, "2":100, "3":100, "4":100, "5":90, "6":130, "7":100, "10":110, "11":120 },
      fold8: { perfect:120, good:75 },
      fold9: { perfect:140, good:80 },
      finalBase: 120,
      overtimePenaltyPerSecond: 2
    },
    seasons: {
      spring: { label:"SPRING", months:[3,4,5], className:"spring", message:"천천히 피어나는 봄" },
      summer: { label:"SUMMER", months:[6,7,8], className:"summer", message:"가볍고 산뜻한 여름" },
      autumn: { label:"AUTUMN", months:[9,10,11], className:"autumn", message:"포근하게 익어가는 가을" },
      winter: { label:"WINTER", months:[12,1,2], className:"winter", message:"따뜻하게 기다리는 겨울" }
    }
  },
  assets: {
    base: "assets/menu/",
    renderer: "dom-procedural-raster-v1"
  },
  menus: [
    { level:1,  name:"로투스 수플레",      points:0,  diameter:1.00, file:"로투스 수플레.png",       fallback:"L", tone:"#D79B61" },
    { level:2,  name:"꿀자몽빙수",          points:3,  diameter:1.25, file:"꿀자몽빙수.png",           fallback:"G", tone:"#EE9A7F" },
    { level:3,  name:"밤 수플레",           points:6,  diameter:1.50, file:"밤 수플레.png",            fallback:"B", tone:"#A96E4E" },
    { level:4,  name:"흑임자 수플레",       points:10, diameter:1.80, file:"흑임자 수플레.png",        fallback:"S", tone:"#77706E" },
    { level:5,  name:"복숭아 수플레",       points:15, diameter:2.10, file:"복숭아 수플레.png",        fallback:"P", tone:"#F2A9A6" },
    { level:6,  name:"옛날인절미팥빙수",    points:21, diameter:2.45, file:"옛날인절미팥빙수.png",     fallback:"I", tone:"#C9925D" },
    { level:7,  name:"두바이 초코 수플레",  points:28, diameter:2.80, file:"두바이초코 수플레.png",    fallback:"D", tone:"#735040" },
    { level:8,  name:"코코망고리치빙수",    points:36, diameter:3.20, file:"코코망고리치빙수.png",     fallback:"M", tone:"#F0C45A" },
    { level:9,  name:"인절미 수플레",       points:45, diameter:3.65, file:"인절미 수플레.png",        fallback:"I", tone:"#D5B57A" },
    { level:10, name:"흑임자빙수",          points:55, diameter:4.10, file:"흑임자빙수.png",           fallback:"S", tone:"#514B4B" },
    { level:11, name:"크림브륄레 수플레",   points:66, diameter:4.60, file:"크림브륄레 수플레.png",    fallback:"C", tone:"#E7B76C" }
  ]
};
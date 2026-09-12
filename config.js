window.CAFFIEND_CONFIG = {
  version: "0.4.0",
  gameSeconds: 25,
  hapticsDefault: true,
  allowSeasonPreview: true,

  brand: {
    experience: "CAFFIEND MOMENTS",
    game: "RISE",
    campaignLine: "기다리는 순간도, 카피엔드답게.",
    promise: "맛있는 메뉴와 기분 좋은 기다림, 더 좋은 경험을 선물하는 공간.",
    signature: "GOOD TASTE TAKES A MOMENT.",
    sharePrompt: "너는 몇 점?",
    waitingCopy: [
      "좋은 맛에는 조금의 시간이 필요합니다.",
      "서두르지 않을수록 더 폭신해집니다.",
      "지금, 당신의 디저트도 가장 좋은 순간을 향해 가는 중."
    ]
  },

  store: {
    id: "caffiend-yangdeok",
    label: "CAFFIEND YANGDEOK",
    leaderboardApi: "",
    timeoutMs: 3500,
    liveLabel: "STORE LIVE",
    previewLabel: "LOCAL PREVIEW"
  },

  reward: {
    enabled: true,
    status: "prototype",
    recordOnly: true,
    minimumScore: 1800,
    dailyClaimsPerDevice: 1,
    title: "RECORD MOMENT",
    headline: "오늘의 기록을 새로 썼어요.",
    body: "매장 운영 버전에서는 실제 기록 검증 후 시즌 서비스 또는 혜택과 연결할 수 있습니다.",
    pendingCopy: "보상 항목은 매장 정책 확정 후 활성화됩니다."
  },

  passport: {
    enabled: true,
    title: "FOUR SEASONS PASSPORT",
    copy: "카피엔드의 네 계절을 하나씩 모아보세요.",
    completionCopy: "네 계절의 RISE를 모두 경험했어요."
  },

  difficulty: [
    { id: "EASY", start: 0, end: 5, speed: 1.95, perfectMin: 0.66, perfectMax: 0.90, multiplier: 1.0 },
    { id: "FLOW", start: 5, end: 12, speed: 2.25, perfectMin: 0.72, perfectMax: 0.88, multiplier: 1.15 },
    { id: "HARD", start: 12, end: 20, speed: 2.58, perfectMin: 0.77, perfectMax: 0.87, multiplier: 1.35 },
    { id: "FINAL RISE", start: 20, end: 25, speed: 2.92, perfectMin: 0.80, perfectMax: 0.86, multiplier: 1.65 }
  ],

  seasons: {
    spring: {
      id: "spring", campaign: "SEASON 01", label: "SPRING", ko: "봄", note: "BLOOM MODE",
      storyHeadline: "천천히 피어나는 계절",
      storyBody: "카피엔드의 봄은 가볍고 부드럽게 시작합니다. 기다리는 동안 한 번 더, 가장 좋은 순간을 찾아보세요.",
      productLabel: "TODAY'S SEASONAL DESSERT", productName: "오늘의 봄 제철 디저트",
      productCopy: "실제 제철 메뉴는 매장에서 오늘 준비된 구성으로 연결됩니다.",
      shareTag: "CAFFIEND SPRING RISE", accent: "#a55363", accentSoft: "#ead4d9", surface: "#f6eee9", paper: "#fffaf7", deep: "#274d3b", ink: "#222820",
      rhythm: "calm", speedFactor: 0.96, perfectExpand: 0.018, scoreFactor: 1.0, bonusEvery: 4, bonusPoints: 260, bonusCopy: "SEASON BLOOM",
      process: ["머랭에 공기를 천천히 쌓는 중", "오븐 안에서 폭신함을 올리는 중", "오늘의 제철을 마지막에 더하는 중"],
      brandLines: ["천천히 피어날수록 더 좋은 순간.", "좋은 맛은 서두르지 않습니다.", "오늘의 제철이 마지막 한입을 완성합니다."],
      tip: "수플레의 폭신함과 크림, 오늘의 제철 토핑을 한입에 함께 즐겨보세요."
    },
    summer: {
      id: "summer", campaign: "SEASON 02", label: "SUMMER", ko: "여름", note: "BRIGHT MODE",
      storyHeadline: "가장 산뜻한 순간을 잡다",
      storyBody: "카피엔드의 여름은 조금 더 빠르고 선명합니다. 짧은 순간을 잡아내고, 계절의 산뜻함을 만나보세요.",
      productLabel: "TODAY'S SEASONAL DESSERT", productName: "오늘의 여름 제철 디저트",
      productCopy: "실제 제철 메뉴는 매장에서 오늘 준비된 구성으로 연결됩니다.",
      shareTag: "CAFFIEND SUMMER RISE", accent: "#d36b45", accentSoft: "#f2d2bf", surface: "#f7efe0", paper: "#fffbf3", deep: "#245345", ink: "#202823",
      rhythm: "quick", speedFactor: 1.08, perfectExpand: 0, scoreFactor: 1.08, bonusEvery: 4, bonusPoints: 300, bonusCopy: "FRESH BONUS",
      process: ["가벼운 머랭의 결을 만드는 중", "빠르게 오르는 순간을 읽는 중", "오늘의 제철로 산뜻함을 더하는 중"],
      brandLines: ["짧은 순간도 맛있게 기억되도록.", "기다림 사이, 가장 산뜻한 한 번.", "오늘의 제철이 여름을 완성합니다."],
      tip: "따뜻한 수플레와 차가운 크림·오늘의 제철 토핑이 만드는 온도 차이를 함께 느껴보세요."
    },
    autumn: {
      id: "autumn", campaign: "SEASON 03", label: "AUTUMN", ko: "가을", note: "RHYTHM MODE",
      storyHeadline: "기다림에도 리듬이 있습니다",
      storyBody: "카피엔드의 가을은 일정하지 않은 리듬을 읽는 계절입니다. 익숙해질수록 더 깊어지는 한 번의 타이밍을 만나보세요.",
      productLabel: "TODAY'S SEASONAL DESSERT", productName: "오늘의 가을 제철 디저트",
      productCopy: "실제 제철 메뉴는 매장에서 오늘 준비된 구성으로 연결됩니다.",
      shareTag: "CAFFIEND AUTUMN RISE", accent: "#9d5443", accentSoft: "#e4c7ba", surface: "#f2eadc", paper: "#fffaf1", deep: "#3f4932", ink: "#25271f",
      rhythm: "swing", speedFactor: 1.0, perfectExpand: -0.006, scoreFactor: 1.12, bonusEvery: 5, bonusPoints: 360, bonusCopy: "HARVEST BONUS",
      process: ["머랭의 밀도를 고르게 맞추는 중", "달라지는 리듬 속 타이밍을 찾는 중", "오늘의 제철로 깊은 향을 더하는 중"],
      brandLines: ["좋은 기다림에는 자신만의 리듬이 있습니다.", "한 번 더 할수록, 좋은 순간이 보입니다.", "오늘의 제철이 기다림의 끝을 완성합니다."],
      tip: "먼저 수플레 본연의 결을 맛본 뒤, 오늘의 제철 토핑과 함께 두 번째 한입을 즐겨보세요."
    },
    winter: {
      id: "winter", campaign: "SEASON 04", label: "WINTER", ko: "겨울", note: "PRECISION MODE",
      storyHeadline: "가장 정확한 온기를 기다리다",
      storyBody: "카피엔드의 겨울은 가장 작은 차이를 즐기는 계절입니다. 좁아진 타이밍만큼, 성공의 순간은 더 선명해집니다.",
      productLabel: "TODAY'S SEASONAL DESSERT", productName: "오늘의 겨울 제철 디저트",
      productCopy: "실제 제철 메뉴는 매장에서 오늘 준비된 구성으로 연결됩니다.",
      shareTag: "CAFFIEND WINTER RISE", accent: "#7f4d54", accentSoft: "#dac9cd", surface: "#f1f1ed", paper: "#fbfbf7", deep: "#263f39", ink: "#202725",
      rhythm: "precise", speedFactor: 1.02, perfectExpand: -0.018, scoreFactor: 1.18, bonusEvery: 5, bonusPoints: 420, bonusCopy: "WINTER BONUS",
      process: ["차분하게 머랭의 결을 세우는 중", "가장 정확한 폭신함을 기다리는 중", "오늘의 제철로 달콤함을 완성하는 중"],
      brandLines: ["조금 더 기다리면, 더 좋은 순간이 옵니다.", "정확한 한 번이 오늘의 기록을 만듭니다.", "따뜻한 한입으로 기다림을 마무리합니다."],
      tip: "첫 한입은 천천히. 따뜻한 수플레가 가장 부드러울 때 오늘의 제철 토핑과 함께 즐겨보세요."
    }
  }
};
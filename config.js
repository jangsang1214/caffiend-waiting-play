window.CAFFIEND_CONFIG = {
  version: "0.2.0",
  gameSeconds: 25,
  hapticsDefault: true,
  difficulty: [
    { id: "EASY", start: 0, end: 5, speed: 1.95, perfectMin: 0.66, perfectMax: 0.90, multiplier: 1.0 },
    { id: "FLOW", start: 5, end: 12, speed: 2.25, perfectMin: 0.72, perfectMax: 0.88, multiplier: 1.15 },
    { id: "HARD", start: 12, end: 20, speed: 2.58, perfectMin: 0.77, perfectMax: 0.87, multiplier: 1.35 },
    { id: "FINAL RISE", start: 20, end: 25, speed: 2.92, perfectMin: 0.80, perfectMax: 0.86, multiplier: 1.65 }
  ],
  seasons: {
    spring: {
      id: "spring",
      label: "SPRING",
      ko: "봄",
      note: "BLOOM MODE",
      fruitLabel: "봄 제철 과일",
      accent: "#b65766",
      surface: "#f6eee8",
      deep: "#274d3b",
      rhythm: "calm",
      speedFactor: 0.96,
      perfectExpand: 0.018,
      scoreFactor: 1.0,
      bonusEvery: 4,
      bonusPoints: 260,
      bonusCopy: "SEASON BLOOM",
      process: [
        "머랭에 공기를 천천히 쌓는 중",
        "오븐 안에서 폭신함을 올리는 중",
        "제철의 향을 마지막에 더하는 중"
      ],
      tip: "수플레의 폭신함과 크림, 제철 과일을 한입에 함께 즐겨보세요."
    },
    summer: {
      id: "summer",
      label: "SUMMER",
      ko: "여름",
      note: "BRIGHT MODE",
      fruitLabel: "여름 제철 과일",
      accent: "#d86e45",
      surface: "#f7efe0",
      deep: "#245345",
      rhythm: "quick",
      speedFactor: 1.08,
      perfectExpand: 0,
      scoreFactor: 1.08,
      bonusEvery: 4,
      bonusPoints: 300,
      bonusCopy: "FRESH BONUS",
      process: [
        "가벼운 머랭의 결을 만드는 중",
        "빠르게 오르는 순간을 읽는 중",
        "제철의 산뜻함을 올리는 중"
      ],
      tip: "따뜻한 수플레와 차가운 크림·과일의 온도 차이를 함께 느껴보세요."
    },
    autumn: {
      id: "autumn",
      label: "AUTUMN",
      ko: "가을",
      note: "RHYTHM MODE",
      fruitLabel: "가을 제철 과일",
      accent: "#9d5443",
      surface: "#f2eadc",
      deep: "#3f4932",
      rhythm: "swing",
      speedFactor: 1.0,
      perfectExpand: -0.006,
      scoreFactor: 1.12,
      bonusEvery: 5,
      bonusPoints: 360,
      bonusCopy: "HARVEST BONUS",
      process: [
        "머랭의 밀도를 고르게 맞추는 중",
        "달라지는 리듬 속 타이밍을 찾는 중",
        "제철의 깊은 향을 더하는 중"
      ],
      tip: "먼저 수플레 본연의 결을 맛본 뒤, 제철 토핑과 함께 두 번째 한입을 즐겨보세요."
    },
    winter: {
      id: "winter",
      label: "WINTER",
      ko: "겨울",
      note: "PRECISION MODE",
      fruitLabel: "겨울 제철 과일",
      accent: "#7f4d54",
      surface: "#f2f1ed",
      deep: "#263f39",
      rhythm: "precise",
      speedFactor: 1.02,
      perfectExpand: -0.018,
      scoreFactor: 1.18,
      bonusEvery: 5,
      bonusPoints: 420,
      bonusCopy: "WINTER BONUS",
      process: [
        "차분하게 머랭의 결을 세우는 중",
        "가장 정확한 폭신함을 기다리는 중",
        "겨울 제철의 달콤함을 완성하는 중"
      ],
      tip: "첫 한입은 천천히. 따뜻한 수플레가 가장 부드러울 때 제철 토핑과 함께 즐겨보세요."
    }
  }
};
(() => {
  const GAME_SECONDS = 25;
  const PERFECT_MIN = 0.74;
  const PERFECT_MAX = 0.92;
  const GREAT_MIN = 0.60;
  const GREAT_MAX = 0.98;
  const STORAGE_KEY = "caffiend-rise-best";

  const $ = (id) => document.getElementById(id);

  const screens = {
    intro: $("introScreen"),
    game: $("gameScreen"),
    result: $("resultScreen"),
  };

  const els = {
    startBtn: $("startBtn"),
    retryBtn: $("retryBtn"),
    shareBtn: $("shareBtn"),
    tapBtn: $("tapBtn"),
    soundBtn: $("soundBtn"),
    souffle: $("souffle"),
    meterNeedle: $("meterNeedle"),
    timeValue: $("timeValue"),
    scoreValue: $("scoreValue"),
    comboValue: $("comboValue"),
    feedback: $("feedback"),
    fruitBonus: $("fruitBonus"),
    processLabel: $("processLabel"),
    stepDot1: $("stepDot1"),
    stepDot2: $("stepDot2"),
    stepDot3: $("stepDot3"),
    finalScore: $("finalScore"),
    bestScore: $("bestScore"),
    resultBadge: $("resultBadge"),
    resultMessage: $("resultMessage"),
    recordStatus: $("recordStatus"),
    rewardNotice: $("rewardNotice"),
    seasonEmoji: $("seasonEmoji"),
    seasonLabel: $("seasonLabel"),
    resultEmoji: $("resultEmoji"),
    resultSeason: $("resultSeason"),
  };

  const seasons = [
    { months: [2, 3, 4], label: "SPRING SEASON", short: "SPRING", emoji: "🍓", process: "제철 과일을 올릴 준비를 하는 중" },
    { months: [5, 6, 7], label: "SUMMER SEASON", short: "SUMMER", emoji: "🍑", process: "여름 과일의 향을 더하는 중" },
    { months: [8, 9, 10], label: "AUTUMN SEASON", short: "AUTUMN", emoji: "🍇", process: "가을 제철의 향을 더하는 중" },
    { months: [11, 0, 1], label: "WINTER SEASON", short: "WINTER", emoji: "🍓", process: "겨울의 달콤함을 올리는 중" },
  ];

  let currentSeason = seasons.find((s) => s.months.includes(new Date().getMonth())) || seasons[2];
  let vibrationEnabled = true;
  let raf = 0;
  let startedAt = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let phase = 0;
  let speed = 2.25;
  let rise = 0;
  let gameRunning = false;
  let lastTapAt = 0;
  let successfulPerfects = 0;

  function showScreen(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function applySeason() {
    els.seasonEmoji.textContent = currentSeason.emoji;
    els.seasonLabel.textContent = currentSeason.label;
    els.resultEmoji.textContent = currentSeason.emoji;
    els.resultSeason.textContent = currentSeason.short;
  }

  function vibrate(pattern = 12) {
    if (!vibrationEnabled || !navigator.vibrate) return;
    navigator.vibrate(pattern);
  }

  function getStoredBest() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = Number(raw || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function setStoredBest(value) {
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  function resetGame() {
    cancelAnimationFrame(raf);
    score = 0;
    combo = 0;
    maxCombo = 0;
    phase = 0;
    speed = 2.25;
    rise = 0;
    elapsed = 0;
    lastFrame = 0;
    lastTapAt = 0;
    successfulPerfects = 0;
    gameRunning = false;
    els.scoreValue.textContent = "0";
    els.comboValue.textContent = "×0";
    els.timeValue.textContent = GAME_SECONDS.toFixed(1);
    setProcessStep(0);
    renderRise(0);
  }

  function startGame() {
    resetGame();
    showScreen("game");
    gameRunning = true;
    startedAt = performance.now();
    lastFrame = startedAt;
    raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!gameRunning) return;

    const dt = Math.min((now - lastFrame) / 1000, 0.04);
    lastFrame = now;
    elapsed = (now - startedAt) / 1000;

    const remaining = Math.max(0, GAME_SECONDS - elapsed);
    els.timeValue.textContent = remaining.toFixed(1);

    phase += dt * speed;
    const sine = (Math.sin(phase - Math.PI / 2) + 1) / 2;
    rise = Math.pow(sine, 0.82);
    renderRise(rise);

    if (remaining <= 0) {
      finishGame();
      return;
    }

    raf = requestAnimationFrame(loop);
  }

  function renderRise(value) {
    const scaleY = 0.72 + value * 0.68;
    const scaleX = 0.96 + value * 0.08;
    els.souffle.style.transform = `scale(${scaleX}, ${scaleY})`;
    els.souffle.style.filter = value > PERFECT_MIN && value < PERFECT_MAX ? "saturate(1.08) brightness(1.03)" : "none";
    els.meterNeedle.style.left = `${Math.max(0, Math.min(100, value * 100))}%`;
  }

  function handleTap() {
    if (!gameRunning) return;

    const now = performance.now();
    if (now - lastTapAt < 280) return;
    lastTapAt = now;

    let label = "조금만 더";
    let points = 0;
    let feedbackType = "miss";

    if (rise >= PERFECT_MIN && rise <= PERFECT_MAX) {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      successfulPerfects += 1;
      const comboBonus = 1 + Math.min(combo - 1, 10) * 0.12;
      points = Math.round(120 * comboBonus);
      label = combo >= 5 ? `PERFECT ×${combo}` : "PERFECT";
      feedbackType = "perfect";
      speed = Math.min(3.35, speed + 0.055);
      vibrate([9, 22, 9]);

      if (combo > 0 && combo % 5 === 0) {
        points += 220;
        showFruitBonus();
      }
    } else if (rise >= GREAT_MIN && rise <= GREAT_MAX) {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      points = 65 + Math.min(combo * 4, 40);
      label = "폭신!";
      feedbackType = "great";
      speed = Math.min(3.2, speed + 0.025);
      vibrate(10);
    } else {
      combo = 0;
      points = rise < 0.38 ? 12 : 22;
      label = rise < 0.38 ? "조금 더 기다려요" : "넘치기 직전!";
      feedbackType = "miss";
      speed = Math.max(2.15, speed - 0.04);
      vibrate(18);
    }

    score += points;
    els.scoreValue.textContent = score.toLocaleString("ko-KR");
    els.comboValue.textContent = `×${combo}`;
    showFeedback(label, feedbackType);
    updateProcessStep();

    // A clean, fast restart of the rise cycle makes the core loop immediately replayable.
    phase = 0;
    rise = 0;
    renderRise(0);
  }

  function showFeedback(text, type) {
    els.feedback.textContent = text;
    els.feedback.style.color = type === "perfect" ? "#315b42" : type === "great" ? "#b95648" : "#7c7b72";
    els.feedback.classList.remove("show");
    void els.feedback.offsetWidth;
    els.feedback.classList.add("show");
  }

  function showFruitBonus() {
    els.fruitBonus.textContent = currentSeason.emoji;
    els.fruitBonus.classList.remove("show");
    void els.fruitBonus.offsetWidth;
    els.fruitBonus.classList.add("show");
  }

  function updateProcessStep() {
    if (successfulPerfects >= 8) setProcessStep(2);
    else if (successfulPerfects >= 3) setProcessStep(1);
    else setProcessStep(0);
  }

  function setProcessStep(step) {
    [els.stepDot1, els.stepDot2, els.stepDot3].forEach((dot, i) => dot.classList.toggle("active", i === step));
    if (step === 0) els.processLabel.textContent = "머랭의 공기를 살려 천천히 올리는 중";
    if (step === 1) els.processLabel.textContent = "오븐에서 가장 폭신한 순간을 만드는 중";
    if (step === 2) els.processLabel.textContent = currentSeason.process;
  }

  function finishGame() {
    gameRunning = false;
    cancelAnimationFrame(raf);

    const previousBest = getStoredBest();
    const isNewRecord = score > previousBest;
    const best = Math.max(previousBest, score);
    if (isNewRecord) setStoredBest(score);

    els.finalScore.textContent = score.toLocaleString("ko-KR");
    els.bestScore.textContent = best.toLocaleString("ko-KR");

    const result = getResultCopy(score, maxCombo);
    els.resultBadge.textContent = result.badge;
    els.resultMessage.textContent = result.message;

    if (isNewRecord && score > 0) {
      els.recordStatus.textContent = "NEW RECORD";
      els.rewardNotice.classList.remove("hidden");
      vibrate([18, 45, 18, 45, 28]);
    } else {
      els.recordStatus.textContent = previousBest > 0 ? `${Math.max(0, previousBest - score).toLocaleString("ko-KR")}점 차이` : "첫 기록";
      els.rewardNotice.classList.add("hidden");
    }

    showScreen("result");
  }

  function getResultCopy(value, comboValue) {
    if (value >= 2500 || comboValue >= 10) {
      return {
        badge: "카피엔드 폭신 마스터",
        message: "가장 좋은 순간을 잘 기다릴 줄 아는 타입. 실제 수플레도 천천히, 가장 맛있는 순간에 즐겨보세요.",
      };
    }
    if (value >= 1600 || comboValue >= 6) {
      return {
        badge: "폭신 타이밍 장인",
        message: "기다림의 리듬을 찾았어요. 지금 카피엔드에서는 당신의 메뉴도 정성껏 완성되는 중이에요.",
      };
    }
    if (value >= 900) {
      return {
        badge: "포근한 기다림",
        message: "서두르지 않아도 괜찮아요. 맛있는 메뉴가 완성되는 동안 한 번 더 도전해보세요.",
      };
    }
    return {
      badge: "폭신 연습생",
      message: "한 번만 더 하면 감이 올 거예요. 가장 폭신한 순간은 생각보다 금방 찾아옵니다.",
    };
  }

  async function shareResult() {
    const text = `CAFFIEND RISE ${score.toLocaleString("ko-KR")}점 · ${els.resultBadge.textContent}\n내 기록을 이길 수 있어?`;
    const shareData = {
      title: "CAFFIEND RISE",
      text,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        els.shareBtn.textContent = "기록이 복사됐어요";
        setTimeout(() => (els.shareBtn.textContent = "기록 공유하기"), 1600);
      }
    } catch (error) {
      // User-cancelled shares should not interrupt the experience.
      console.debug("Share cancelled or unavailable", error);
    }
  }

  els.startBtn.addEventListener("click", startGame);
  els.retryBtn.addEventListener("click", startGame);
  els.tapBtn.addEventListener("click", handleTap);
  els.shareBtn.addEventListener("click", shareResult);
  els.soundBtn.addEventListener("click", () => {
    vibrationEnabled = !vibrationEnabled;
    els.soundBtn.textContent = vibrationEnabled ? "◌" : "–";
    els.soundBtn.setAttribute("aria-label", vibrationEnabled ? "진동 피드백 끄기" : "진동 피드백 켜기");
  });

  document.addEventListener("visibilitychange", () => {
    // Avoid giving hidden-tab time an unfair gameplay advantage.
    if (document.hidden && gameRunning) finishGame();
  });

  applySeason();
  resetGame();
  els.bestScore.textContent = getStoredBest().toLocaleString("ko-KR");
})();

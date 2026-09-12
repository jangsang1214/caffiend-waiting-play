(() => {
  const CONFIG = window.CAFFIEND_CONFIG;
  const LEADERBOARD = window.CaffiendLeaderboard;
  if (!CONFIG || !LEADERBOARD) return;

  const $ = (id) => document.getElementById(id);
  const screens = {
    intro: $("introScreen"),
    game: $("gameScreen"),
    result: $("resultScreen")
  };

  const els = {
    soundBtn: $("soundBtn"),
    hapticText: $("hapticText"),
    seasonIndex: $("seasonIndex"),
    seasonLabel: $("seasonLabel"),
    introBest: $("introBest"),
    startBtn: $("startBtn"),
    gameSeason: $("gameSeason"),
    gameMode: $("gameMode"),
    phasePill: $("phasePill"),
    timeValue: $("timeValue"),
    scoreValue: $("scoreValue"),
    comboValue: $("comboValue"),
    perfectValue: $("perfectValue"),
    processStep: $("processStep"),
    processLabel: $("processLabel"),
    gameStage: $("gameStage"),
    souffle: $("souffle"),
    fruitBonus: $("fruitBonus"),
    feedback: $("feedback"),
    bonusToast: $("bonusToast"),
    meterMode: $("meterMode"),
    greatZone: $("greatZone"),
    perfectZone: $("perfectZone"),
    meterNeedle: $("meterNeedle"),
    tapBtn: $("tapBtn"),
    resultSeason: $("resultSeason"),
    resultDate: $("resultDate"),
    recordStatus: $("recordStatus"),
    finalScore: $("finalScore"),
    resultBadge: $("resultBadge"),
    resultMessage: $("resultMessage"),
    maxComboValue: $("maxComboValue"),
    perfectRateValue: $("perfectRateValue"),
    bestScore: $("bestScore"),
    rewardNotice: $("rewardNotice"),
    tasteTip: $("tasteTip"),
    retryBtn: $("retryBtn"),
    shareBtn: $("shareBtn")
  };

  const seasonButtons = Array.from(document.querySelectorAll(".season-option"));
  const difficultyItems = Array.from(document.querySelectorAll(".difficulty-strip span"));
  const seasonOrder = ["spring", "summer", "autumn", "winter"];

  let currentSeasonId = getSeasonFromMonth();
  let currentSeason = CONFIG.seasons[currentSeasonId];
  let hapticsEnabled = CONFIG.hapticsDefault;
  let raf = 0;
  let gameRunning = false;
  let startedAt = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let phase = 0;
  let rise = 0;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let perfectCount = 0;
  let tapCount = 0;
  let lastTapAt = 0;
  let currentDifficultyIndex = -1;
  let currentWindow = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getSeasonFromMonth() {
    const month = new Date().getMonth();
    if ([2, 3, 4].includes(month)) return "spring";
    if ([5, 6, 7].includes(month)) return "summer";
    if ([8, 9, 10].includes(month)) return "autumn";
    return "winter";
  }

  function showScreen(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function vibrate(pattern = 10) {
    if (!hapticsEnabled || !navigator.vibrate) return;
    navigator.vibrate(pattern);
  }

  async function applySeason(seasonId, { updateRecord = true } = {}) {
    currentSeasonId = seasonId;
    currentSeason = CONFIG.seasons[seasonId];
    const seasonNumber = String(seasonOrder.indexOf(seasonId) + 1).padStart(2, "0");

    document.body.dataset.season = seasonId;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", currentSeason.surface);
    els.seasonIndex.textContent = `SEASON ${seasonNumber}`;
    els.seasonLabel.textContent = `${currentSeason.label} · ${currentSeason.note}`;
    els.gameSeason.textContent = currentSeason.label;
    els.gameMode.textContent = currentSeason.note;
    els.resultSeason.textContent = `${currentSeason.label} · ${currentSeason.note}`;
    els.tasteTip.textContent = currentSeason.tip;

    seasonButtons.forEach((button) => button.classList.toggle("active", button.dataset.season === seasonId));

    if (updateRecord) {
      const snapshot = await LEADERBOARD.getSnapshot(seasonId);
      els.introBest.textContent = snapshot.dailyBest.toLocaleString("ko-KR");
    }
  }

  function getDifficulty(time) {
    const index = CONFIG.difficulty.findIndex((item) => time >= item.start && time < item.end);
    const resolvedIndex = index === -1 ? CONFIG.difficulty.length - 1 : index;
    return { stage: CONFIG.difficulty[resolvedIndex], index: resolvedIndex };
  }

  function getTimingWindow(stage) {
    const halfAdjust = currentSeason.perfectExpand / 2;
    const perfectMin = clamp(stage.perfectMin - halfAdjust, 0.50, 0.90);
    const perfectMax = clamp(stage.perfectMax + halfAdjust, perfectMin + 0.035, 0.98);
    const greatMin = clamp(perfectMin - 0.105, 0.40, perfectMin - 0.02);
    const greatMax = clamp(perfectMax + 0.075, perfectMax + 0.02, 0.995);
    return { perfectMin, perfectMax, greatMin, greatMax };
  }

  function getRhythmModifier() {
    if (currentSeason.rhythm === "quick") return 1 + 0.055 * Math.sin(elapsed * 2.4);
    if (currentSeason.rhythm === "swing") return 1 + 0.15 * Math.sin(elapsed * 1.75) + 0.045 * Math.sin(elapsed * 3.8);
    if (currentSeason.rhythm === "precise") return 1 + 0.035 * Math.sin(elapsed * 2.1);
    return 1 + 0.018 * Math.sin(elapsed * 1.2);
  }

  function setDifficultyUI(index, stage) {
    if (index === currentDifficultyIndex) return;
    currentDifficultyIndex = index;
    els.phasePill.textContent = stage.id;
    els.meterMode.textContent = stage.id === "FINAL RISE" ? "FINAL" : stage.id;
    difficultyItems.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === index));
    if (stage.id === "FINAL RISE") vibrate([12, 25, 12]);
  }

  function updateMeterWindow(window) {
    const greatLeft = window.greatMin * 100;
    const greatWidth = (window.greatMax - window.greatMin) * 100;
    const perfectLeft = window.perfectMin * 100;
    const perfectWidth = (window.perfectMax - window.perfectMin) * 100;
    els.greatZone.style.left = `${greatLeft}%`;
    els.greatZone.style.width = `${greatWidth}%`;
    els.perfectZone.style.left = `${perfectLeft}%`;
    els.perfectZone.style.width = `${perfectWidth}%`;
  }

  function renderRise(value, window = currentWindow) {
    const scaleY = 0.68 + value * 0.78;
    const scaleX = 0.955 + value * 0.075;
    els.souffle.style.transform = `scale(${scaleX}, ${scaleY})`;
    els.meterNeedle.style.left = `${clamp(value * 100, 0, 100)}%`;

    if (window && value >= window.perfectMin && value <= window.perfectMax) {
      els.souffle.style.filter = "saturate(1.06) brightness(1.045)";
    } else {
      els.souffle.style.filter = "none";
    }
  }

  function updateProcess() {
    let step = 0;
    if (elapsed >= 17) step = 2;
    else if (elapsed >= 8) step = 1;

    const labels = ["01 / MERINGUE", "02 / RISE", "03 / SEASON"];
    els.processStep.textContent = labels[step];
    els.processLabel.textContent = currentSeason.process[step];
  }

  function resetGame() {
    cancelAnimationFrame(raf);
    gameRunning = false;
    elapsed = 0;
    phase = 0;
    rise = 0;
    score = 0;
    combo = 0;
    maxCombo = 0;
    perfectCount = 0;
    tapCount = 0;
    lastTapAt = 0;
    currentDifficultyIndex = -1;
    currentWindow = getTimingWindow(CONFIG.difficulty[0]);

    els.timeValue.textContent = CONFIG.gameSeconds.toFixed(1);
    els.scoreValue.textContent = "0";
    els.comboValue.textContent = "×0";
    els.perfectValue.textContent = "0";
    els.processStep.textContent = "01 / MERINGUE";
    els.processLabel.textContent = currentSeason.process[0];
    difficultyItems.forEach((item, index) => item.classList.toggle("active", index === 0));
    updateMeterWindow(currentWindow);
    renderRise(0, currentWindow);
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

    const remaining = Math.max(0, CONFIG.gameSeconds - elapsed);
    els.timeValue.textContent = remaining.toFixed(1);

    const { stage, index } = getDifficulty(elapsed);
    setDifficultyUI(index, stage);
    currentWindow = getTimingWindow(stage);
    updateMeterWindow(currentWindow);
    updateProcess();

    const skillPressure = 1 + Math.min(combo, 12) * 0.006;
    const speed = stage.speed * currentSeason.speedFactor * getRhythmModifier() * skillPressure;
    phase += dt * speed;
    const sine = (Math.sin(phase - Math.PI / 2) + 1) / 2;
    rise = Math.pow(sine, 0.84);
    renderRise(rise, currentWindow);

    if (remaining <= 0) {
      finishGame();
      return;
    }

    raf = requestAnimationFrame(loop);
  }

  function showFeedback(text, type) {
    els.feedback.textContent = text;
    els.feedback.style.color = type === "perfect" ? "var(--deep)" : type === "great" ? "var(--accent)" : "var(--muted)";
    els.feedback.classList.remove("show");
    void els.feedback.offsetWidth;
    els.feedback.classList.add("show");
  }

  function showSeasonBonus(points) {
    els.fruitBonus.classList.remove("show");
    void els.fruitBonus.offsetWidth;
    els.fruitBonus.classList.add("show");

    els.bonusToast.textContent = `${currentSeason.bonusCopy} +${points}`;
    els.bonusToast.classList.remove("show");
    void els.bonusToast.offsetWidth;
    els.bonusToast.classList.add("show");
  }

  function handleTap() {
    if (!gameRunning) return;

    const now = performance.now();
    if (now - lastTapAt < 220) return;
    lastTapAt = now;
    tapCount += 1;

    const { stage } = getDifficulty(elapsed);
    const window = currentWindow || getTimingWindow(stage);
    let points = 0;
    let type = "miss";
    let label = "EARLY";

    if (rise >= window.perfectMin && rise <= window.perfectMax) {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      perfectCount += 1;
      const comboMultiplier = 1 + Math.min(combo - 1, 12) * 0.095;
      points = Math.round(145 * stage.multiplier * currentSeason.scoreFactor * comboMultiplier);
      type = "perfect";
      label = combo >= 3 ? `PERFECT ×${combo}` : "PERFECT";
      vibrate([8, 18, 8]);

      if (combo > 0 && combo % currentSeason.bonusEvery === 0) {
        const bonus = Math.round(currentSeason.bonusPoints * stage.multiplier);
        points += bonus;
        showSeasonBonus(bonus);
      }
    } else if (rise >= window.greatMin && rise <= window.greatMax) {
      combo = 0;
      points = Math.round(62 * stage.multiplier * currentSeason.scoreFactor);
      type = "great";
      label = "SOFT";
      vibrate(9);
    } else {
      combo = 0;
      const penalty = Math.round(36 * stage.multiplier);
      score = Math.max(0, score - penalty);
      const direction = Math.cos(phase - Math.PI / 2) >= 0 ? "EARLY" : "LATE";
      label = direction;
      type = "miss";
      vibrate(18);
    }

    score += points;
    els.scoreValue.textContent = score.toLocaleString("ko-KR");
    els.comboValue.textContent = `×${combo}`;
    els.perfectValue.textContent = String(perfectCount);
    showFeedback(label, type);

    phase = 0;
    rise = 0;
    renderRise(0, window);
  }

  async function finishGame() {
    if (!gameRunning) return;
    gameRunning = false;
    cancelAnimationFrame(raf);

    const perfectRate = tapCount > 0 ? Math.round((perfectCount / tapCount) * 100) : 0;
    const result = getResultCopy(score, maxCombo, perfectRate);
    const submit = await LEADERBOARD.submitScore({ seasonId: currentSeasonId, score });

    els.finalScore.textContent = score.toLocaleString("ko-KR");
    els.maxComboValue.textContent = `×${maxCombo}`;
    els.perfectRateValue.textContent = `${perfectRate}%`;
    els.bestScore.textContent = submit.dailyBest.toLocaleString("ko-KR");
    els.resultBadge.textContent = result.badge;
    els.resultMessage.textContent = result.message;
    els.resultDate.textContent = new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short" }).toUpperCase();
    els.tasteTip.textContent = currentSeason.tip;

    if (submit.isDailyRecord && score > 0) {
      els.recordStatus.textContent = "NEW DAILY RECORD";
      els.rewardNotice.classList.remove("hidden");
      vibrate([16, 35, 16, 35, 26]);
    } else {
      const gap = Math.max(0, submit.dailyBest - score);
      els.recordStatus.textContent = gap > 0 ? `${gap.toLocaleString("ko-KR")} TO BEST` : "YOUR SCORE";
      els.rewardNotice.classList.add("hidden");
    }

    els.introBest.textContent = submit.dailyBest.toLocaleString("ko-KR");
    showScreen("result");
  }

  function getResultCopy(value, comboValue, rate) {
    if (value >= 4200 || comboValue >= 10 || rate >= 72) {
      return {
        badge: "CAFFIEND RISE MASTER",
        message: "기다려야 할 순간과 눌러야 할 순간을 정확히 읽었어요. 이제 실제 디저트의 가장 좋은 순간을 즐겨보세요."
      };
    }
    if (value >= 2800 || comboValue >= 6 || rate >= 55) {
      return {
        badge: "폭신 타이밍 장인",
        message: "리듬을 찾았습니다. 조금만 더 정교해지면 오늘의 기록에 가까워질 수 있어요."
      };
    }
    if (value >= 1500 || rate >= 35) {
      return {
        badge: "포근한 기다림",
        message: "좋은 타이밍이 보이기 시작했어요. 메뉴가 완성되는 동안 한 번 더 기록을 올려보세요."
      };
    }
    return {
      badge: "폭신 연습생",
      message: "서두르지 않아도 괜찮아요. 한 번만 더 하면 가장 폭신한 순간이 보일 거예요."
    };
  }

  async function shareResult() {
    const text = `${currentSeason.label} CAFFIEND RISE · ${score.toLocaleString("ko-KR")}점\n내 기록을 이길 수 있어?`;
    const shareData = { title: "CAFFIEND RISE", text, url: window.location.href };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        const original = els.shareBtn.textContent;
        els.shareBtn.textContent = "기록 링크가 복사됐어요";
        setTimeout(() => (els.shareBtn.textContent = original), 1500);
      }
    } catch (error) {
      console.debug("Share cancelled or unavailable", error);
    }
  }

  els.startBtn.addEventListener("click", startGame);
  els.retryBtn.addEventListener("click", startGame);
  els.tapBtn.addEventListener("click", handleTap);
  els.gameStage.addEventListener("click", handleTap);
  els.shareBtn.addEventListener("click", shareResult);

  els.soundBtn.addEventListener("click", () => {
    hapticsEnabled = !hapticsEnabled;
    els.hapticText.textContent = hapticsEnabled ? "HAPTIC ON" : "HAPTIC OFF";
    els.soundBtn.querySelector(".utility-dot").style.opacity = hapticsEnabled ? "1" : ".25";
  });

  seasonButtons.forEach((button) => {
    button.addEventListener("click", () => applySeason(button.dataset.season));
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && gameRunning) finishGame();
  });

  applySeason(currentSeasonId).then(resetGame);
})();
(() => {
  const CONFIG = window.CAFFIEND_CONFIG;
  const EXPERIENCE = window.CaffiendExperience;
  const LEADERBOARD = window.CaffiendLeaderboard;
  const ANALYTICS = window.CaffiendAnalytics;
  if (!CONFIG || !EXPERIENCE || !LEADERBOARD) return;

  const $ = (id) => document.getElementById(id);
  const screens = { intro: $("introScreen"), game: $("gameScreen"), result: $("resultScreen") };
  const els = {
    soundBtn: $("soundBtn"), hapticText: $("hapticText"),
    seasonIndex: $("seasonIndex"), seasonLabel: $("seasonLabel"), seasonCampaign: $("seasonCampaign"), seasonMode: $("seasonMode"), seasonStoryHeadline: $("seasonStoryHeadline"), seasonStoryBody: $("seasonStoryBody"),
    challengeBanner: $("challengeBanner"), challengeTarget: $("challengeTarget"), gameChallenge: $("gameChallenge"), gameChallengeTarget: $("gameChallengeTarget"),
    introStoreBest: $("introStoreBest"), introRank: $("introRank"), introTop: $("introTop"), leaderboardStatus: $("leaderboardStatus"), boardDisclosure: $("boardDisclosure"),
    passportCount: $("passportCount"), passportCopy: $("passportCopy"), introBest: $("introBest"), modeDescription: $("modeDescription"), startBtn: $("startBtn"),
    gameSeason: $("gameSeason"), gameMode: $("gameMode"), brandLine: $("brandLine"), phasePill: $("phasePill"), timeValue: $("timeValue"), scoreValue: $("scoreValue"), comboValue: $("comboValue"), perfectValue: $("perfectValue"),
    processStep: $("processStep"), processLabel: $("processLabel"), gameStage: $("gameStage"), souffle: $("souffle"), fruitBonus: $("fruitBonus"), feedback: $("feedback"), bonusToast: $("bonusToast"), meterMode: $("meterMode"), greatZone: $("greatZone"), perfectZone: $("perfectZone"), meterNeedle: $("meterNeedle"), tapBtn: $("tapBtn"),
    resultSeason: $("resultSeason"), shareSeason: $("shareSeason"), shareCopy: $("shareCopy"), resultDate: $("resultDate"), finalScore: $("finalScore"), resultBadge: $("resultBadge"), resultMessage: $("resultMessage"), maxComboValue: $("maxComboValue"), perfectRateValue: $("perfectRateValue"), bestScore: $("bestScore"),
    challengeOutcome: $("challengeOutcome"), challengeOutcomeTitle: $("challengeOutcomeTitle"), challengeOutcomeCopy: $("challengeOutcomeCopy"),
    resultBoardStatus: $("resultBoardStatus"), storeRanking: $("storeRanking"), resultRank: $("resultRank"), rankGap: $("rankGap"),
    rewardNotice: $("rewardNotice"), rewardEyebrow: $("rewardEyebrow"), rewardHeadline: $("rewardHeadline"), rewardBody: $("rewardBody"),
    tablePanel: $("tablePanel"), tableCount: $("tableCount"), tableRanking: $("tableRanking"), nextPlayerBtn: $("nextPlayerBtn"),
    resultPassportTitle: $("resultPassportTitle"), resultPassportCount: $("resultPassportCount"), resultPassportCopy: $("resultPassportCopy"),
    productSeason: $("productSeason"), productLabel: $("productLabel"), productName: $("productName"), productCopy: $("productCopy"), seasonCta: $("seasonCta"), seasonStoryPanel: $("seasonStoryPanel"), storyPanelTitle: $("storyPanelTitle"), storyPanelBody: $("storyPanelBody"), tasteTip: $("tasteTip"),
    retryBtn: $("retryBtn"), challengeShareBtn: $("challengeShareBtn"), shareBtn: $("shareBtn")
  };

  const seasonButtons = Array.from(document.querySelectorAll(".season-option"));
  const modeButtons = Array.from(document.querySelectorAll(".mode-option"));
  const difficultyItems = Array.from(document.querySelectorAll(".difficulty-strip span"));
  const passportStamps = Array.from(document.querySelectorAll("[data-passport]"));
  const resultPassportStamps = Array.from(document.querySelectorAll("[data-result-passport]"));
  const seasonOrder = ["spring", "summer", "autumn", "winter"];
  const challenge = EXPERIENCE.getChallenge();

  let currentSeasonId = challenge?.seasonId || getSeasonFromMonth();
  let currentSeason = CONFIG.seasons[currentSeasonId];
  let currentPlayMode = "solo";
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
  let currentProcessStep = -1;
  let currentPlayId = "";
  let lastSubmit = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const track = (event, meta = {}) => ANALYTICS?.track?.(event, { season: currentSeasonId, mode: currentPlayMode, ...meta });

  function getSeasonFromMonth() {
    const month = new Date().getMonth();
    if ([2,3,4].includes(month)) return "spring";
    if ([5,6,7].includes(month)) return "summer";
    if ([8,9,10].includes(month)) return "autumn";
    return "winter";
  }

  function showScreen(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove("active"));
    screens[name].classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function vibrate(pattern = 10) {
    if (!hapticsEnabled || !navigator.vibrate) return;
    navigator.vibrate(pattern);
  }

  function setStatusChip(element, connected) {
    if (!element) return;
    element.classList.toggle("live", connected);
    element.innerHTML = `<i></i>${connected ? CONFIG.store.liveLabel : CONFIG.store.previewLabel}`;
  }

  function renderMiniRanking(top = []) {
    if (!top.length) {
      els.introTop.innerHTML = "<p>첫 기록이 오늘의 기준이 됩니다.</p>";
      return;
    }
    els.introTop.innerHTML = top.slice(0,3).map((item, index) => `
      <div class="mini-rank-row">
        <span>0${index + 1}</span><strong>${escapeHtml(item.label || `PLAYER ${index + 1}`)}</strong><b>${Number(item.score || 0).toLocaleString("ko-KR")}</b>
      </div>`).join("");
  }

  function renderStoreRanking(snapshot) {
    setStatusChip(els.resultBoardStatus, snapshot.connected);
    if (!snapshot.top?.length) {
      els.storeRanking.innerHTML = '<p class="ranking-empty">아직 기록이 없어요. 첫 기록을 만들어보세요.</p>';
    } else {
      els.storeRanking.innerHTML = snapshot.top.slice(0,5).map((item, index) => `
        <div class="store-rank-row ${item.mine ? "mine" : ""}">
          <span class="rank-number">${String(item.rank || index + 1).padStart(2,"0")}</span>
          <div class="rank-name"><strong>${escapeHtml(item.label || `PLAYER ${index + 1}`)}</strong><small>${snapshot.connected ? "TODAY · STORE" : "THIS DEVICE"}</small></div>
          <span class="rank-points">${Number(item.score || 0).toLocaleString("ko-KR")}</span>
        </div>`).join("");
    }
    els.resultRank.textContent = snapshot.rank ? `#${snapshot.rank}` : "—";
    const topScore = Number(snapshot.dailyBest || 0);
    const gap = Math.max(0, topScore - score);
    els.rankGap.textContent = snapshot.rank === 1 && score > 0 ? "지금 이 기록이 기준입니다." : gap > 0 ? `${gap.toLocaleString("ko-KR")}점 더 올리면 TOP RECORD` : "첫 기록이 기준이 됩니다.";
  }

  async function refreshBoard(snapshot = null) {
    const board = snapshot || await LEADERBOARD.getSnapshot(currentSeasonId);
    setStatusChip(els.leaderboardStatus, board.connected);
    els.introStoreBest.textContent = Number(board.dailyBest || 0).toLocaleString("ko-KR");
    els.introRank.textContent = board.rank ? `#${board.rank}` : "—";
    els.introBest.textContent = Number(board.localDaily ?? board.dailyBest ?? 0).toLocaleString("ko-KR");
    renderMiniRanking(board.top || []);
    els.boardDisclosure.textContent = board.connected ? "현재 매장 전체 기록과 연결되어 있습니다." : "LOCAL PREVIEW · 매장 전체 실시간 순위는 서버 연결 후 활성화됩니다.";
    renderStoreRanking(board);
    return board;
  }

  function renderPassport(passport = EXPERIENCE.getPassport()) {
    els.passportCount.textContent = `${passport.count} / ${passport.total}`;
    els.resultPassportCount.textContent = `${passport.count} / ${passport.total}`;
    const copy = passport.complete ? CONFIG.passport.completionCopy : CONFIG.passport.copy;
    els.passportCopy.textContent = copy;
    els.resultPassportTitle.textContent = passport.complete ? "네 계절의 RISE를 완성했어요." : `${passport.count}개의 계절을 기록했어요.`;
    els.resultPassportCopy.textContent = passport.complete ? CONFIG.passport.completionCopy : "다음 계절의 RISE도 만나보세요.";
    passportStamps.forEach((stamp) => stamp.classList.toggle("collected", Boolean(passport.entries[stamp.dataset.passport])));
    resultPassportStamps.forEach((stamp) => stamp.classList.toggle("collected", Boolean(passport.entries[stamp.dataset.resultPassport])));
  }

  function renderChallengeIntro() {
    if (!challenge) return;
    els.challengeBanner.classList.remove("hidden");
    els.challengeTarget.textContent = challenge.target.toLocaleString("ko-KR");
    els.gameChallenge.classList.remove("hidden");
    els.gameChallengeTarget.textContent = challenge.target.toLocaleString("ko-KR");
  }

  function renderChallengeOutcome() {
    if (!challenge) {
      els.challengeOutcome.classList.add("hidden");
      return;
    }
    const cleared = score > challenge.target;
    els.challengeOutcome.classList.remove("hidden");
    els.challengeOutcomeTitle.textContent = cleared ? "CHALLENGE CLEARED" : "ONE MORE RISE";
    els.challengeOutcomeCopy.textContent = cleared
      ? `${(score - challenge.target).toLocaleString("ko-KR")}점 차이로 친구의 기록을 넘었어요. 이제 새로운 기록을 보내보세요.`
      : `${(challenge.target - score).toLocaleString("ko-KR")}점만 더 올리면 친구의 기록을 넘을 수 있어요.`;
    track(cleared ? "challenge_cleared" : "challenge_failed", { target: challenge.target, score });
  }

  async function applySeason(seasonId, { updateBoard = true, trackSelection = false } = {}) {
    currentSeasonId = seasonId;
    currentSeason = CONFIG.seasons[seasonId];
    const seasonNumber = String(seasonOrder.indexOf(seasonId) + 1).padStart(2,"0");
    document.body.dataset.season = seasonId;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", currentSeason.surface);
    els.seasonIndex.textContent = currentSeason.campaign || `SEASON ${seasonNumber}`;
    els.seasonLabel.textContent = `${currentSeason.label} · ${currentSeason.note}`;
    els.seasonCampaign.textContent = currentSeason.campaign;
    els.seasonMode.textContent = currentSeason.note;
    els.seasonStoryHeadline.textContent = currentSeason.storyHeadline;
    els.seasonStoryBody.textContent = currentSeason.storyBody;
    els.gameSeason.textContent = currentSeason.label;
    els.gameMode.textContent = currentSeason.note;
    els.resultSeason.textContent = `${currentSeason.label} · ${currentSeason.note}`;
    els.shareSeason.textContent = currentSeason.shareTag;
    els.shareCopy.textContent = CONFIG.brand.campaignLine;
    els.productSeason.textContent = currentSeason.campaign;
    els.productLabel.textContent = currentSeason.productLabel;
    els.productName.textContent = currentSeason.productName;
    els.productCopy.textContent = currentSeason.productCopy;
    els.storyPanelTitle.textContent = currentSeason.storyHeadline;
    els.storyPanelBody.textContent = currentSeason.storyBody;
    els.tasteTip.textContent = currentSeason.tip;
    els.seasonStoryPanel.classList.add("hidden");
    seasonButtons.forEach((button) => button.classList.toggle("active", button.dataset.season === seasonId));
    if (updateBoard) await refreshBoard();
    renderPassport();
    if (trackSelection) track("season_select", { selectedSeason: seasonId });
  }

  function setPlayMode(mode, { trackSelection = false } = {}) {
    currentPlayMode = mode;
    modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
    if (mode === "table") {
      els.modeDescription.textContent = "한 테이블에서 번갈아 플레이하고, 오늘의 RISE MASTER를 정해보세요.";
      els.startBtn.querySelector("span").textContent = "START TABLE CHALLENGE";
    } else {
      els.modeDescription.textContent = challenge ? `${challenge.target.toLocaleString("ko-KR")}점 기록에 도전 중입니다.` : "한 번 더 할수록 좋은 순간이 보입니다.";
      els.startBtn.querySelector("span").textContent = challenge ? "BEAT THE RECORD" : "PLAY RISE";
    }
    if (trackSelection) track("play_mode_select", { selectedMode: mode });
  }

  function getDifficulty(time) {
    const index = CONFIG.difficulty.findIndex((item) => time >= item.start && time < item.end);
    const resolvedIndex = index === -1 ? CONFIG.difficulty.length - 1 : index;
    return { stage: CONFIG.difficulty[resolvedIndex], index: resolvedIndex };
  }

  function getTimingWindow(stage) {
    const halfAdjust = currentSeason.perfectExpand / 2;
    const perfectMin = clamp(stage.perfectMin - halfAdjust, .50, .90);
    const perfectMax = clamp(stage.perfectMax + halfAdjust, perfectMin + .035, .98);
    return { perfectMin, perfectMax, greatMin: clamp(perfectMin - .105,.40,perfectMin-.02), greatMax: clamp(perfectMax + .075,perfectMax+.02,.995) };
  }

  function getRhythmModifier() {
    if (currentSeason.rhythm === "quick") return 1 + .055 * Math.sin(elapsed * 2.4);
    if (currentSeason.rhythm === "swing") return 1 + .15 * Math.sin(elapsed * 1.75) + .045 * Math.sin(elapsed * 3.8);
    if (currentSeason.rhythm === "precise") return 1 + .035 * Math.sin(elapsed * 2.1);
    return 1 + .018 * Math.sin(elapsed * 1.2);
  }

  function setDifficultyUI(index, stage) {
    if (index === currentDifficultyIndex) return;
    currentDifficultyIndex = index;
    els.phasePill.textContent = stage.id;
    els.meterMode.textContent = stage.id === "FINAL RISE" ? "FINAL" : stage.id;
    difficultyItems.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === index));
    if (stage.id === "FINAL RISE") vibrate([12,25,12]);
  }

  function updateMeterWindow(window) {
    els.greatZone.style.left = `${window.greatMin * 100}%`;
    els.greatZone.style.width = `${(window.greatMax - window.greatMin) * 100}%`;
    els.perfectZone.style.left = `${window.perfectMin * 100}%`;
    els.perfectZone.style.width = `${(window.perfectMax - window.perfectMin) * 100}%`;
  }

  function renderRise(value, window = currentWindow) {
    const scaleY = .68 + value * .78;
    const scaleX = .955 + value * .075;
    els.souffle.style.transform = `scale(${scaleX}, ${scaleY})`;
    els.meterNeedle.style.left = `${clamp(value * 100,0,100)}%`;
    els.souffle.style.filter = window && value >= window.perfectMin && value <= window.perfectMax ? "saturate(1.06) brightness(1.045)" : "none";
  }

  function updateProcess() {
    let step = 0;
    if (elapsed >= 17) step = 2;
    else if (elapsed >= 8) step = 1;
    if (step === currentProcessStep) return;
    currentProcessStep = step;
    const labels = ["01 / MERINGUE","02 / RISE","03 / SEASON"];
    els.processStep.textContent = labels[step];
    els.processLabel.textContent = currentSeason.process[step];
    els.brandLine.textContent = currentSeason.brandLines[step] || CONFIG.brand.waitingCopy[step];
  }

  function resetGame() {
    cancelAnimationFrame(raf);
    gameRunning = false;
    elapsed = 0; phase = 0; rise = 0; score = 0; combo = 0; maxCombo = 0; perfectCount = 0; tapCount = 0; lastTapAt = 0;
    currentDifficultyIndex = -1; currentProcessStep = -1;
    currentWindow = getTimingWindow(CONFIG.difficulty[0]);
    currentPlayId = `${EXPERIENCE.getSessionId()}_${Date.now().toString(36)}`;
    els.timeValue.textContent = CONFIG.gameSeconds.toFixed(1);
    els.scoreValue.textContent = "0"; els.comboValue.textContent = "×0"; els.perfectValue.textContent = "0";
    difficultyItems.forEach((item,index) => item.classList.toggle("active", index === 0));
    updateMeterWindow(currentWindow); renderRise(0,currentWindow); updateProcess();
  }

  function startGame() {
    resetGame(); showScreen("game"); gameRunning = true; startedAt = performance.now(); lastFrame = startedAt;
    track("game_start", { challengeTarget: challenge?.target || null, playId: currentPlayId });
    raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!gameRunning) return;
    const dt = Math.min((now - lastFrame) / 1000,.04);
    lastFrame = now; elapsed = (now - startedAt) / 1000;
    const remaining = Math.max(0,CONFIG.gameSeconds - elapsed);
    els.timeValue.textContent = remaining.toFixed(1);
    const { stage,index } = getDifficulty(elapsed);
    setDifficultyUI(index,stage); currentWindow = getTimingWindow(stage); updateMeterWindow(currentWindow); updateProcess();
    const skillPressure = 1 + Math.min(combo,12) * .006;
    const speed = stage.speed * currentSeason.speedFactor * getRhythmModifier() * skillPressure;
    phase += dt * speed;
    const sine = (Math.sin(phase - Math.PI / 2) + 1) / 2;
    rise = Math.pow(sine,.84); renderRise(rise,currentWindow);
    if (remaining <= 0) return finishGame();
    raf = requestAnimationFrame(loop);
  }

  function showFeedback(text,type) {
    els.feedback.textContent = text;
    els.feedback.style.color = type === "perfect" ? "var(--deep)" : type === "great" ? "var(--accent)" : "var(--muted)";
    els.feedback.classList.remove("show"); void els.feedback.offsetWidth; els.feedback.classList.add("show");
  }

  function showSeasonBonus(points) {
    els.fruitBonus.classList.remove("show"); void els.fruitBonus.offsetWidth; els.fruitBonus.classList.add("show");
    els.bonusToast.textContent = `${currentSeason.bonusCopy} +${points}`;
    els.bonusToast.classList.remove("show"); void els.bonusToast.offsetWidth; els.bonusToast.classList.add("show");
  }

  function handleTap() {
    if (!gameRunning) return;
    const now = performance.now(); if (now - lastTapAt < 220) return;
    lastTapAt = now; tapCount += 1;
    const { stage } = getDifficulty(elapsed);
    const window = currentWindow || getTimingWindow(stage);
    let points = 0; let type = "miss"; let label = "EARLY";
    if (rise >= window.perfectMin && rise <= window.perfectMax) {
      combo += 1; maxCombo = Math.max(maxCombo,combo); perfectCount += 1;
      const comboMultiplier = 1 + Math.min(combo - 1,12) * .095;
      points = Math.round(145 * stage.multiplier * currentSeason.scoreFactor * comboMultiplier);
      type = "perfect"; label = combo >= 3 ? `PERFECT ×${combo}` : "PERFECT"; vibrate([8,18,8]);
      if (combo > 0 && combo % currentSeason.bonusEvery === 0) {
        const bonus = Math.round(currentSeason.bonusPoints * stage.multiplier); points += bonus; showSeasonBonus(bonus);
      }
    } else if (rise >= window.greatMin && rise <= window.greatMax) {
      combo = 0; points = Math.round(62 * stage.multiplier * currentSeason.scoreFactor); type = "great"; label = "SOFT"; vibrate(9);
    } else {
      combo = 0; score = Math.max(0,score - Math.round(36 * stage.multiplier));
      label = Math.cos(phase - Math.PI / 2) >= 0 ? "EARLY" : "LATE"; vibrate(18);
    }
    score += points;
    els.scoreValue.textContent = score.toLocaleString("ko-KR"); els.comboValue.textContent = `×${combo}`; els.perfectValue.textContent = String(perfectCount);
    showFeedback(label,type); phase = 0; rise = 0; renderRise(0,window);
  }

  function getResultCopy(value,comboValue,rate) {
    if (value >= 4300 || comboValue >= 10 || rate >= 72) return { badge:"CAFFIEND RISE MASTER", message:"좋은 순간을 정확히 기다릴 줄 아는 사람. 오늘의 디저트도 가장 좋은 순간을 향해 가고 있어요." };
    if (value >= 3000 || comboValue >= 7 || rate >= 55) return { badge:"TIMING ARTISAN", message:"기다림의 리듬을 찾았어요. 한 번 더 도전하면 오늘의 기록이 달라질 수 있어요." };
    if (value >= 1800 || rate >= 35) return { badge:"SOFT MOMENT", message:"서두르지 않아도 괜찮아요. 카피엔드의 기다림은 조금씩 더 좋은 순간으로 이어집니다." };
    return { badge:"FIRST RISE", message:"첫 번째 좋은 순간을 찾았어요. 다음 한 번은 분명 더 폭신할 거예요." };
  }

  async function renderTable(snapshot) {
    if (currentPlayMode !== "table") { els.tablePanel.classList.add("hidden"); return; }
    els.tablePanel.classList.remove("hidden");
    els.tableCount.textContent = `${snapshot.count} PLAYER${snapshot.count === 1 ? "" : "S"}`;
    els.tableRanking.innerHTML = snapshot.scores.slice(0,4).map((entry,index) => `
      <div class="rank-row"><span class="rank-no">0${index + 1}</span><div class="rank-player"><strong>PLAYER ${entry.playerNumber}</strong><small>${entry.seasonId.toUpperCase()} RISE</small></div><span class="rank-score">${entry.score.toLocaleString("ko-KR")}</span></div>`).join("");
  }

  function renderReward(submit) {
    const eligible = CONFIG.reward.enabled && submit.isDailyRecord && score >= CONFIG.reward.minimumScore;
    if (!eligible) { els.rewardNotice.classList.add("hidden"); return; }
    els.rewardNotice.classList.remove("hidden");
    els.rewardEyebrow.textContent = submit.connected && submit.reward ? "VERIFIED RECORD REWARD" : `${CONFIG.reward.title} · PROTOTYPE`;
    els.rewardHeadline.textContent = submit.connected && submit.reward?.headline ? submit.reward.headline : CONFIG.reward.headline;
    els.rewardBody.textContent = submit.connected && submit.reward?.body ? submit.reward.body : `${CONFIG.reward.body} ${CONFIG.reward.pendingCopy}`;
    if (!submit.connected) LEADERBOARD.markPrototypeRewardShown(currentSeasonId);
    vibrate([16,35,16,35,26]);
  }

  async function finishGame() {
    if (!gameRunning) return;
    gameRunning = false; cancelAnimationFrame(raf);
    const perfectRate = tapCount > 0 ? Math.round((perfectCount / tapCount) * 100) : 0;
    const result = getResultCopy(score,maxCombo,perfectRate);
    const metrics = { maxCombo, perfectRate, perfectCount, tapCount, duration: Math.min(elapsed,CONFIG.gameSeconds) };
    const submit = await LEADERBOARD.submitScore({ seasonId: currentSeasonId, score, metrics, playId: currentPlayId });
    lastSubmit = submit;
    const passport = EXPERIENCE.stampSeason(currentSeasonId,score);

    els.finalScore.textContent = score.toLocaleString("ko-KR");
    els.maxComboValue.textContent = `×${maxCombo}`; els.perfectRateValue.textContent = `${perfectRate}%`; els.bestScore.textContent = Number(submit.dailyBest || score).toLocaleString("ko-KR");
    els.resultBadge.textContent = result.badge; els.resultMessage.textContent = result.message;
    els.resultDate.textContent = new Date().toLocaleDateString("en-US",{day:"2-digit",month:"short"}).toUpperCase(); els.tasteTip.textContent = currentSeason.tip;
    renderChallengeOutcome(); renderReward(submit); renderPassport(passport); renderStoreRanking(submit);

    if (currentPlayMode === "table") {
      const table = await LEADERBOARD.addTableScore({ seasonId: currentSeasonId, score }); await renderTable(table); track("table_player_complete",{score,player:table.count});
    } else els.tablePanel.classList.add("hidden");

    await refreshBoard({ ...submit, localDaily: Math.max(Number(els.introBest.textContent.replace(/,/g,"")) || 0, score) });
    if (submit.isDailyRecord) track(submit.connected ? "new_store_record" : "new_local_record",{score});
    track("game_complete",{score,maxCombo,perfectRate,newRecord:submit.isDailyRecord,connected:submit.connected,passportCount:passport.count});
    showScreen("result");
  }

  function openSeasonStory() {
    els.seasonStoryPanel.classList.toggle("hidden");
    const open = !els.seasonStoryPanel.classList.contains("hidden");
    els.seasonCta.innerHTML = open ? '시즌 스토리 닫기 <span>×</span>' : '이번 시즌 경험 보기 <span>↗</span>';
    if (open) track("season_story_open");
  }

  function resultBadgeSafe() { return els.resultBadge?.textContent || "CAFFIEND RISE"; }

  function drawShareCanvas() {
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = currentSeason.deep; ctx.fillRect(0,0,1080,1920);
    ctx.globalAlpha = .72; ctx.fillStyle = currentSeason.accent; ctx.beginPath(); ctx.arc(970,130,260,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = .16; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; [250,340,430].forEach((r) => { ctx.beginPath(); ctx.arc(930,180,r,0,Math.PI*2); ctx.stroke(); });
    ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.font = "700 34px Arial"; ctx.fillText("CAFFIEND MOMENTS",86,118);
    ctx.globalAlpha = .62; ctx.font = "700 25px Arial"; ctx.fillText(currentSeason.shareTag,86,170);
    ctx.globalAlpha = 1; ctx.textAlign = "center"; ctx.font = "500 210px Georgia"; ctx.fillText(score.toLocaleString("en-US"),540,910);
    ctx.globalAlpha = .55; ctx.font = "700 28px Arial"; ctx.fillText("POINTS",540,970);
    ctx.globalAlpha = 1; ctx.font = "700 43px Arial"; ctx.fillText(CONFIG.brand.campaignLine,540,1150);
    ctx.globalAlpha = .7; ctx.font = "400 30px Arial"; ctx.fillText(resultBadgeSafe(),540,1220);
    ctx.textAlign = "left"; ctx.globalAlpha = .55; ctx.font = "700 25px Arial"; ctx.fillText(new Date().toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase(),86,1770);
    ctx.textAlign = "right"; ctx.globalAlpha = 1; ctx.font = "700 34px Arial"; ctx.fillText(CONFIG.brand.sharePrompt,994,1770);
    return canvas;
  }

  async function canvasToFile(canvas) {
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ? new File([blob],"caffiend-rise.png",{type:"image/png"}) : null),"image/png",.94));
  }

  async function shareResultCard() {
    const text = `${currentSeason.shareTag} · ${score.toLocaleString("ko-KR")}점\n${CONFIG.brand.campaignLine}\n${CONFIG.brand.sharePrompt}`;
    try {
      const file = await canvasToFile(drawShareCanvas());
      if (file && navigator.share && navigator.canShare?.({files:[file]})) await navigator.share({title:"CAFFIEND MOMENTS",text,files:[file]});
      else if (navigator.share) await navigator.share({title:"CAFFIEND MOMENTS",text,url:location.href});
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${text}\n${location.href}`); els.shareBtn.textContent = "기록이 복사됐어요"; setTimeout(() => els.shareBtn.textContent = "결과 카드 공유",1600); }
      track("result_share",{score});
    } catch (error) { console.debug("Share cancelled or unavailable",error); }
  }

  async function shareChallenge() {
    const url = EXPERIENCE.buildChallengeUrl({score,seasonId:currentSeasonId});
    const text = `내 CAFFIEND RISE 기록은 ${score.toLocaleString("ko-KR")}점.\n${CONFIG.brand.sharePrompt} ${currentSeason.shareTag}`;
    try {
      if (navigator.share) await navigator.share({title:"CAFFIEND RISE CHALLENGE",text,url});
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${text}\n${url}`); els.challengeShareBtn.textContent = "도전 링크 복사 완료"; setTimeout(() => els.challengeShareBtn.textContent = "친구에게 도전 보내기",1600); }
      track("challenge_share",{score,target:score});
    } catch (error) { console.debug("Challenge share cancelled",error); }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g,(char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  seasonButtons.forEach((button) => button.addEventListener("click",() => applySeason(button.dataset.season,{trackSelection:true})));
  modeButtons.forEach((button) => button.addEventListener("click",() => setPlayMode(button.dataset.mode,{trackSelection:true})));
  els.soundBtn.addEventListener("click",() => { hapticsEnabled = !hapticsEnabled; els.hapticText.textContent = hapticsEnabled ? "HAPTIC ON" : "HAPTIC OFF"; els.soundBtn.querySelector(".utility-dot").style.opacity = hapticsEnabled ? "1" : ".25"; });
  els.startBtn.addEventListener("click",startGame); els.retryBtn.addEventListener("click",startGame); els.nextPlayerBtn.addEventListener("click",startGame);
  els.gameStage.addEventListener("click",handleTap); els.tapBtn.addEventListener("click",handleTap); els.seasonCta.addEventListener("click",openSeasonStory);
  els.shareBtn.addEventListener("click",shareResultCard); els.challengeShareBtn.addEventListener("click",shareChallenge);
  document.addEventListener("visibilitychange",() => { if (document.hidden && gameRunning) finishGame(); });

  renderChallengeIntro();
  renderPassport();
  setPlayMode("solo");
  applySeason(currentSeasonId,{updateBoard:true});
  track("page_view",{attribution:EXPERIENCE.getAttribution(),challenge:Boolean(challenge),version:CONFIG.version});
})();
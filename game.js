(() => {
  const CONFIG = window.DIGUL_CONFIG;
  const EXP = window.DigulExperience;
  const BOARD = window.DigulLeaderboard;
  const ANALYTICS = window.DigulAnalytics;
  const SPRITES = window.DigulSpriteRenderer;
  if (!CONFIG || !EXP || !BOARD || !SPRITES || !window.Matter) {
    console.error("DIGUL boot dependency missing", {
      config:!!CONFIG, experience:!!EXP, leaderboard:!!BOARD, sprites:!!SPRITES, matter:!!window.Matter
    });
    return;
  }

  const $ = id => document.getElementById(id);
  const {
    Engine, Bodies, Composite, Events, Body
  } = Matter;

  const menus = CONFIG.menus.map((menu, index) => ({
    ...menu,
    index,
    radius: CONFIG.physics.baseRadius * menu.diameter,
    image: null,
    imageFailed: false
  }));

  const state = {
    score:0,
    best:0,
    currentLevel:0,
    nextLevel:0,
    dropX:CONFIG.physics.width / 2,
    canDrop:true,
    gameOver:false,
    gameStarted:false,
    dangerMs:0,
    maxLevel:0,
    gameId:"",
    eventSeq:0,
    eventBuffer:[],
    flushBusy:false,
    pressing:false,
    pauseReasons:new Set(),
    lastLeaderboard:null,
    lastFlushAt:0,
    lastRankRefreshAt:0,
    firstDrop:true,
    frameCount:0,
    dessertDraws:0,
    lastDessertDrawAt:0
  };

  const els = {
    entry:$("entryScreen"), game:$("gameScreen"),
    nicknameInput:$("nicknameInput"), nicknameError:$("nicknameError"), startButton:$("startButton"),
    weekLabelEntry:$("weekLabelEntry"), nicknameButton:$("nicknameButton"), nicknameDisplay:$("nicknameDisplay"),
    pauseButton:$("pauseButton"), score:$("scoreValue"), personalBest:$("personalBestValue"),
    nextPreview:$("nextPreview"), recipeButtonPreview:$("recipeButtonPreview"), canvas:$("gameCanvas"), boardWrap:document.querySelector(".board-wrap"),
    dropGuide:$("dropGuide"), connectionPill:$("connectionPill"), connectionText:$("connectionText"),
    myRank:$("myRankValue"), weekLabel:$("weekLabel"), topScore:$("topScoreValue"),
    recipeButton:$("recipeButton"), rankingButton:$("rankingButton"),
    resultOverlay:$("resultOverlay"), resultScore:$("resultScore"), resultBest:$("resultBest"),
    resultRank:$("resultRank"), resultMenuThumb:$("resultMenuThumb"), resultMenuName:$("resultMenuName"),
    restartButton:$("restartButton"), pauseOverlay:$("pauseOverlay"), resumeButton:$("resumeButton"),
    nicknameOverlay:$("nicknameOverlay"), nicknameEditInput:$("nicknameEditInput"), nicknameEditError:$("nicknameEditError"),
    saveNicknameButton:$("saveNicknameButton"), recipeOverlay:$("recipeOverlay"), recipeList:$("recipeList"),
    rankingOverlay:$("rankingOverlay"), rankingStatus:$("rankingStatus"), rankingList:$("rankingList"),
    digulHomeButton:$("digulHomeButton")
  };

  const ctx = els.canvas.getContext("2d");
  const engine = Engine.create();
  engine.gravity.y = CONFIG.physics.gravity;
  const world = engine.world;
  const W = CONFIG.physics.width;
  const H = CONFIG.physics.height;
  const wallOpt = { isStatic:true, friction:.32, restitution:.04, label:"wall" };

  Composite.add(world, [
    Bodies.rectangle(-28, H / 2, 56, H * 3, wallOpt),
    Bodies.rectangle(W + 28, H / 2, 56, H * 3, wallOpt),
    Bodies.rectangle(W / 2, H + 24, W + 100, 48, wallOpt)
  ]);

  let renderScale = 1;
  let dpr = 1;
  let lastFrame = performance.now();
  let accumulator = 0;
  const STEP = 1000 / 60;
  const mergeQueue = [];
  const fx = [];

  function track(event, meta = {}) {
    ANALYTICS?.track?.(event, { gameId:state.gameId, score:state.score, ...meta });
  }

  function loadAssets() {
    SPRITES.load().then(() => {
      updateNextPreview();
      menuThumb(els.recipeButtonPreview, 0, 48);
      renderRecipe();
    });
  }

  function menuThumb(target, level, size = 48) {
    SPRITES.mount(target, level, size);
  }

  function createInlineThumb(level) {
    const el = document.createElement("div");
    el.className = "thumb menu-sprite";
    SPRITES.mount(el, level, 52);
    return el;
  }

  function showGameScreen() {
    document.querySelectorAll(".screen.active").forEach(screen => screen.classList.remove("active"));
    els.game.classList.add("active");
    resizeCanvas();
    requestAnimationFrame(resizeCanvas);
    setTimeout(resizeCanvas, 60);
  }

  function showEntryScreen() {
    document.querySelectorAll(".screen.active").forEach(screen => screen.classList.remove("active"));
    els.entry.classList.add("active");
  }

  function openLayer(el, pauseReason) {
    if (el.classList.contains("sheet")) el.classList.add("show");
    else el.classList.add("show");
    el.setAttribute("aria-hidden", "false");
    if (pauseReason) addPause(pauseReason);
  }

  function closeLayer(el, pauseReason) {
    el.classList.remove("show");
    el.setAttribute("aria-hidden", "true");
    if (pauseReason) removePause(pauseReason);
  }

  function addPause(reason) {
    state.pauseReasons.add(reason);
    if (state.gameStarted && !state.gameOver) {
      els.pauseButton.textContent = "▶";
    }
  }

  function removePause(reason) {
    state.pauseReasons.delete(reason);
    if (state.pauseReasons.size === 0 && state.gameStarted && !state.gameOver) {
      els.pauseButton.textContent = "Ⅱ";
      lastFrame = performance.now();
    }
  }

  function isPaused() {
    return state.pauseReasons.size > 0;
  }

  function resizeCanvas() {
    const rect = els.boardWrap.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderScale = Math.min(rect.width / W, rect.height / H);
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = Math.floor(W * renderScale);
    const cssH = Math.floor(H * renderScale);
    els.canvas.style.width = `${cssW}px`;
    els.canvas.style.height = `${cssH}px`;
    els.canvas.style.margin = "0 auto";
    els.canvas.width = Math.max(1, Math.floor(cssW * dpr));
    els.canvas.height = Math.max(1, Math.floor(cssH * dpr));
  }

  window.addEventListener("resize", resizeCanvas);

  function randomDropLevel() {
    return Math.floor(Math.random() * CONFIG.gameplay.droppableLevels);
  }

  function isItem(body) {
    return body.plugin && Number.isInteger(body.plugin.level);
  }

  function createBody(level, x, y) {
    const menu = menus[level];
    const body = Bodies.circle(x, y, menu.radius, {
      restitution:CONFIG.physics.restitution,
      friction:CONFIG.physics.friction,
      frictionStatic:CONFIG.physics.frictionStatic,
      density:CONFIG.physics.density,
      label:`menu-${level + 1}`
    });
    body.plugin = {
      level,
      bornAt:performance.now(),
      merging:false,
      bodyId:crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    };
    Composite.add(world, body);
    return body;
  }

  function clearItems() {
    Composite.allBodies(world).filter(isItem).forEach(body => Composite.remove(world, body));
    mergeQueue.length = 0;
    fx.length = 0;
  }

  function clampDropX(x) {
    const radius = menus[state.currentLevel].radius;
    return Math.max(radius + 2, Math.min(W - radius - 2, x));
  }

  function updateScore(value) {
    state.score = Math.max(0, Math.round(value));
    els.score.textContent = state.score.toLocaleString("ko-KR");
  }

  function updateNextPreview() {
    menuThumb(els.nextPreview, state.nextLevel, 70);
  }

  function updateRankUi(snapshot = state.lastLeaderboard) {
    if (!snapshot) return;
    state.lastLeaderboard = snapshot;
    state.best = Math.max(state.best, Number(snapshot.myBest || 0));
    els.personalBest.textContent = state.best.toLocaleString("ko-KR");
    els.myRank.textContent = snapshot.myRank ? `#${snapshot.myRank}` : "–";
    els.topScore.textContent = Number(snapshot.topScore || 0).toLocaleString("ko-KR");
    els.weekLabel.textContent = snapshot.weekLabel || EXP.getWeekLabel();
    els.weekLabelEntry.textContent = `이번 주 · ${snapshot.weekLabel || EXP.getWeekLabel()}`;

    els.connectionPill.classList.remove("is-live", "is-local", "is-offline");
    if (snapshot.connected) {
      els.connectionPill.classList.add("is-live");
      els.connectionText.textContent = "실시간";
    } else if (CONFIG.store.leaderboardApi) {
      els.connectionPill.classList.add("is-offline");
      els.connectionText.textContent = "오프라인";
    } else {
      els.connectionPill.classList.add("is-local");
      els.connectionText.textContent = "내 기록";
    }
  }

  function renderRecipe() {
    els.recipeList.innerHTML = "";
    menus.forEach((menu, index) => {
      const row = document.createElement("div");
      row.className = `recipe-row${index <= state.maxLevel ? " reached" : ""}`;
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = String(index + 1).padStart(2, "0");
      row.appendChild(num);
      row.appendChild(createInlineThumb(index));
      const text = document.createElement("div");
      text.innerHTML = `<strong>${menu.name}</strong><br><small>${index === 0 ? "START" : `+${menu.points}`}</small>`;
      row.appendChild(text);
      const arrow = document.createElement("small");
      arrow.textContent = index === menus.length - 1 ? "★" : "→";
      row.appendChild(arrow);
      els.recipeList.appendChild(row);
    });
  }

  function renderRanking(snapshot) {
    updateRankUi(snapshot);
    els.rankingStatus.textContent = snapshot.connected
      ? `실시간 · ${snapshot.weekLabel}`
      : CONFIG.store.leaderboardApi
        ? "연결이 끊겨 내 기기 기록을 표시해요."
        : "서버 연결 전 · 내 기기 미리보기";
    els.rankingList.innerHTML = "";
    const rows = snapshot.rows || [];
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "ranking-status";
      empty.textContent = "아직 기록이 없어요.";
      els.rankingList.appendChild(empty);
      return;
    }
    rows.forEach(row => {
      const item = document.createElement("div");
      const rankClass = row.rank <= 3 ? ` rank-${row.rank}` : "";
      item.className = `ranking-row${rankClass}${row.mine ? " mine" : ""}`;
      const mineBadge = row.mine ? '<span class="mine-badge">나</span>' : "";
      item.innerHTML = `<span class="rank">${row.rank}</span><span class="name">${mineBadge}${escapeHtml(row.nickname)}</span><span class="points">${Number(row.score).toLocaleString("ko-KR")}</span>`;
      els.rankingList.appendChild(item);
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[c]));
  }

  async function refreshLeaderboard(force = false) {
    const now = performance.now();
    if (!force && now - state.lastRankRefreshAt < CONFIG.ranking.refreshMs) return;
    state.lastRankRefreshAt = now;
    const snapshot = await BOARD.getLeaderboard();
    renderRanking(snapshot);
  }

  function queueEvent(event) {
    state.eventSeq += 1;
    state.eventBuffer.push({
      seq:state.eventSeq,
      atMs:Math.round(performance.now()),
      ...event
    });
    if (state.eventBuffer.length > CONFIG.gameplay.maxEventBuffer) {
      state.eventBuffer.splice(0, state.eventBuffer.length - CONFIG.gameplay.maxEventBuffer);
    }
  }

  async function flushEvents(force = false) {
    if (state.flushBusy || !state.gameStarted) return;
    const now = performance.now();
    if (!force && now - state.lastFlushAt < CONFIG.ranking.eventFlushMs) return;
    if (!state.eventBuffer.length && !force) return;
    state.flushBusy = true;
    state.lastFlushAt = now;
    const batch = state.eventBuffer.splice(0, state.eventBuffer.length);
    try {
      const result = await BOARD.pushEvents({
        gameId:state.gameId,
        nickname:EXP.getNickname(),
        events:batch,
        currentScore:state.score,
        maxLevel:state.maxLevel + 1
      });
      updateRankUi({
        ...(state.lastLeaderboard || {}),
        connected:result.connected,
        source:result.source,
        myBest:result.myBest,
        myRank:result.myRank,
        topScore:result.topScore,
        weekLabel:EXP.getWeekLabel(),
        rows:state.lastLeaderboard?.rows || []
      });
      if (!result.connected && CONFIG.store.leaderboardApi && batch.length) {
        state.eventBuffer.unshift(...batch);
      }
    } catch (_) {
      if (batch.length) state.eventBuffer.unshift(...batch);
    } finally {
      state.flushBusy = false;
    }
  }

  function beginGame() {
    clearItems();
    state.gameId = EXP.newGameId();
    state.eventSeq = 0;
    state.eventBuffer.length = 0;
    state.score = 0;
    state.currentLevel = randomDropLevel();
    state.nextLevel = randomDropLevel();
    state.dropX = W / 2;
    state.canDrop = true;
    state.gameOver = false;
    state.gameStarted = true;
    state.dangerMs = 0;
    state.maxLevel = 0;
    state.firstDrop = true;
    state.pauseReasons.clear();
    updateScore(0);
    els.dropGuide.style.opacity = "1";
    closeLayer(els.resultOverlay);
    closeLayer(els.pauseOverlay, "manual");
    els.pauseButton.textContent = "Ⅱ";
    updateNextPreview();
    menuThumb(els.recipeButtonPreview, 0, 48);
    renderRecipe();
    lastFrame = performance.now();
    drawBoard(lastFrame);
    track("game_start");

    BOARD.startGame({
      gameId:state.gameId,
      nickname:EXP.getNickname()
    }).then(result => {
      if (result?.connected) refreshLeaderboard(true);
    }).catch(() => {});

    refreshLeaderboard(true).catch(() => {});
  }

  function dropCurrent() {
    if (!state.gameStarted || state.gameOver || isPaused() || !state.canDrop) return;
    createBody(state.currentLevel, clampDropX(state.dropX), CONFIG.physics.dropY);
    queueEvent({ type:"drop", level:state.currentLevel + 1 });
    state.currentLevel = state.nextLevel;
    state.nextLevel = randomDropLevel();
    updateNextPreview();
    state.canDrop = false;
    if (state.firstDrop) {
      state.firstDrop = false;
      els.dropGuide.style.opacity = "0";
    }
    setTimeout(() => { state.canDrop = true; }, CONFIG.physics.dropCooldownMs);
  }

  function onCollision(event) {
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      if (!isItem(a) || !isItem(b)) continue;
      if (a.plugin.level !== b.plugin.level) continue;
      if (a.plugin.merging || b.plugin.merging) continue;
      a.plugin.merging = true;
      b.plugin.merging = true;
      mergeQueue.push([a, b]);
    }
  }

  Events.on(engine, "collisionStart", onCollision);
  Events.on(engine, "collisionActive", onCollision);

  function bodyStillExists(body) {
    return Composite.allBodies(world).includes(body);
  }

  function processMerges() {
    while (mergeQueue.length) {
      const [a, b] = mergeQueue.shift();
      if (!bodyStillExists(a) || !bodyStillExists(b)) continue;
      const level = a.plugin.level;
      const x = (a.position.x + b.position.x) / 2;
      const y = (a.position.y + b.position.y) / 2;
      const velocity = {
        x:(a.velocity.x + b.velocity.x) / 2,
        y:(a.velocity.y + b.velocity.y) / 2
      };

      Composite.remove(world, a);
      Composite.remove(world, b);

      let points = 0;
      let toLevel = null;
      if (level < menus.length - 1) {
        toLevel = level + 1;
        const created = createBody(toLevel, x, Math.max(y, menus[toLevel].radius + 2));
        Body.setVelocity(created, velocity);
        points = menus[toLevel].points;
        if (toLevel > state.maxLevel) {
          state.maxLevel = toLevel;
          renderRecipe();
        }
      } else {
        points = CONFIG.gameplay.completionBonus;
      }

      updateScore(state.score + points);
      queueEvent({
        type:"merge",
        fromLevel:level + 1,
        toLevel:toLevel === null ? null : toLevel + 1,
        points
      });
      fx.push({ x, y, points, born:performance.now() });
      track("merge", { fromLevel:level + 1, toLevel:toLevel === null ? 0 : toLevel + 1, points });
    }
  }

  function checkDanger(dt) {
    if (!state.gameStarted || state.gameOver || isPaused()) return;
    const now = performance.now();
    const above = Composite.allBodies(world).some(body =>
      isItem(body) &&
      now - body.plugin.bornAt > CONFIG.physics.freshBodyGraceMs &&
      body.position.y - body.circleRadius < CONFIG.physics.dangerY
    );
    state.dangerMs = above ? state.dangerMs + dt : 0;
    if (state.dangerMs >= CONFIG.physics.dangerHoldMs) endGame();
  }

  async function endGame() {
    if (state.gameOver) return;
    state.gameOver = true;
    state.canDrop = false;
    await flushEvents(true);
    const result = await BOARD.finishGame({
      gameId:state.gameId,
      nickname:EXP.getNickname(),
      currentScore:state.score,
      maxLevel:state.maxLevel + 1,
      lastSeq:state.eventSeq
    });
    state.best = Math.max(state.best, Number(result.myBest || 0), state.score);
    els.resultScore.textContent = state.score.toLocaleString("ko-KR");
    els.resultBest.textContent = state.best.toLocaleString("ko-KR");
    els.resultRank.textContent = result.myRank ? `#${result.myRank}` : "–";
    els.resultMenuName.textContent = menus[state.maxLevel].name;
    menuThumb(els.resultMenuThumb, state.maxLevel, 54);
    updateRankUi({
      ...(state.lastLeaderboard || {}),
      connected:result.connected,
      source:result.source,
      myBest:state.best,
      myRank:result.myRank,
      topScore:result.topScore,
      weekLabel:EXP.getWeekLabel(),
      rows:state.lastLeaderboard?.rows || []
    });
    openLayer(els.resultOverlay);
    track("game_finish", { maxLevel:state.maxLevel + 1 });
  }

  function drawMenu(level, x, y, angle = 0, alpha = 1) {
    const menu = menus[level];
    const radius = menu.radius;
    const size = radius * (3.62 + Math.min(level, 10) * 0.065);
    SPRITES.draw(ctx, level, x, y, size, angle, alpha);
    state.dessertDraws += 1;
    state.lastDessertDrawAt = performance.now();
  }

  function drawBoard(now) {
    ctx.setTransform(renderScale * dpr, 0, 0, renderScale * dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#fff8ed");
    bg.addColorStop(.58, "#f8e8d4");
    bg.addColorStop(1, "#ecd0ae");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = .20;
    ctx.translate(-70, 80);
    ctx.rotate(-.22);
    const sunlight = ctx.createLinearGradient(0, 0, 0, H);
    sunlight.addColorStop(0, "rgba(255,255,235,.95)");
    sunlight.addColorStop(1, "rgba(255,244,200,0)");
    ctx.fillStyle = sunlight;
    ctx.fillRect(0, 0, 52, H * .82);
    ctx.fillRect(92, 18, 28, H * .70);
    ctx.restore();

    ctx.fillStyle = "rgba(170,110,68,.10)";
    ctx.beginPath();
    ctx.ellipse(W / 2, H - 9, W * .45, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    const danger = state.dangerMs > 0;
    ctx.save();
    ctx.setLineDash([8, 7]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = danger && Math.floor(now / 180) % 2 === 0 ? "#c84e45" : "rgba(127,81,55,.20)";
    ctx.beginPath();
    ctx.moveTo(7, CONFIG.physics.dangerY);
    ctx.lineTo(W - 7, CONFIG.physics.dangerY);
    ctx.stroke();
    ctx.restore();

    if (state.gameStarted && !state.gameOver) {
      const x = clampDropX(state.dropX);
      ctx.save();
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = "rgba(125,57,25,.54)";
      ctx.beginPath();
      ctx.moveTo(x, CONFIG.physics.dropY + menus[state.currentLevel].radius);
      ctx.lineTo(x, H - 15);
      ctx.stroke();
      ctx.restore();
      if (state.canDrop) drawMenu(state.currentLevel, x, CONFIG.physics.dropY);
    }

    for (const body of Composite.allBodies(world)) {
      if (isItem(body)) drawMenu(body.plugin.level, body.position.x, body.position.y, body.angle);
    }

    for (let i = fx.length - 1; i >= 0; i--) {
      const item = fx[i];
      const t = (now - item.born) / 650;
      if (t >= 1) {
        fx.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = 1 - t;
      const pulse = 18 + t * 24;
      ctx.strokeStyle = "rgba(245,183,52,.9)";
      ctx.lineWidth = Math.max(1, 3 - t * 2);
      ctx.beginPath();
      ctx.arc(item.x, item.y, pulse, 0, Math.PI * 2);
      ctx.stroke();

      for (let s = 0; s < 6; s++) {
        const a = s * Math.PI / 3 + t * .7;
        const rr = 16 + t * 32;
        ctx.fillStyle = s % 2 ? "#fff1a6" : "#f4aa31";
        ctx.beginPath();
        ctx.arc(item.x + Math.cos(a) * rr, item.y + Math.sin(a) * rr, 2.6 * (1 - t * .55), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#d9781e";
      ctx.font = "900 18px system-ui";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(255,255,255,.9)";
      ctx.shadowBlur = 5;
      ctx.fillText(`+${item.points}`, item.x, item.y - 10 - t * 28);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = "rgba(164,104,62,.20)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 112);
    ctx.quadraticCurveTo(10, H * .76, 36, H - 15);
    ctx.moveTo(W - 15, 112);
    ctx.quadraticCurveTo(W - 10, H * .76, W - 36, H - 15);
    ctx.stroke();
    ctx.restore();
  }

  function frame(now) {
    state.frameCount += 1;
    const dt = Math.min(now - lastFrame, 100);
    lastFrame = now;
    if (state.gameStarted && !state.gameOver && !isPaused()) {
      accumulator += dt;
      while (accumulator >= STEP) {
        Engine.update(engine, STEP);
        processMerges();
        accumulator -= STEP;
      }
      checkDanger(dt);
      flushEvents(false);
      refreshLeaderboard(false);
    }
    drawBoard(now);
    requestAnimationFrame(frame);
  }

  function pointerToWorldX(event) {
    const rect = els.canvas.getBoundingClientRect();
    return ((event.clientX - rect.left) / rect.width) * W;
  }

  els.canvas.addEventListener("pointerdown", event => {
    if (!state.gameStarted || state.gameOver || isPaused()) return;
    state.pressing = true;
    state.dropX = pointerToWorldX(event);
    els.canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  els.canvas.addEventListener("pointermove", event => {
    if (!state.pressing || state.gameOver || isPaused()) return;
    state.dropX = pointerToWorldX(event);
    event.preventDefault();
  });

  els.canvas.addEventListener("pointerup", event => {
    if (!state.pressing || state.gameOver || isPaused()) return;
    state.pressing = false;
    state.dropX = pointerToWorldX(event);
    dropCurrent();
    event.preventDefault();
  });

  els.canvas.addEventListener("pointercancel", () => {
    state.pressing = false;
  });

  function validateAndSave(input, errorEl) {
    const checked = EXP.setNickname(input.value);
    errorEl.textContent = checked.reason || "";
    if (!checked.ok) return null;
    return checked.value;
  }

  els.startButton.addEventListener("click", () => {
    const nickname = validateAndSave(els.nicknameInput, els.nicknameError);
    if (!nickname) return;
    els.nicknameDisplay.textContent = nickname;
    showGameScreen();
    beginGame();
  });

  els.nicknameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") els.startButton.click();
  });

  els.pauseButton.addEventListener("click", () => {
    if (state.gameOver) return;
    if (state.pauseReasons.has("manual")) {
      closeLayer(els.pauseOverlay, "manual");
    } else {
      openLayer(els.pauseOverlay, "manual");
    }
  });

  els.resumeButton.addEventListener("click", () => closeLayer(els.pauseOverlay, "manual"));
  els.restartButton.addEventListener("click", beginGame);

  els.digulHomeButton?.addEventListener("click", () => {
    state.gameStarted = false;
    state.gameOver = false;
    state.pauseReasons.clear();
    clearItems();
    closeLayer(els.resultOverlay);
    closeLayer(els.pauseOverlay, "manual");
    showEntryScreen();
    track("return_home");
  });

  els.nicknameButton.addEventListener("click", () => {
    els.nicknameEditInput.value = EXP.getNickname();
    els.nicknameEditError.textContent = "";
    openLayer(els.nicknameOverlay, "nickname");
  });

  els.saveNicknameButton.addEventListener("click", () => {
    const nickname = validateAndSave(els.nicknameEditInput, els.nicknameEditError);
    if (!nickname) return;
    els.nicknameDisplay.textContent = nickname;
    closeLayer(els.nicknameOverlay, "nickname");
    track("nickname_change");
    refreshLeaderboard(true);
  });

  els.recipeButton.addEventListener("click", () => {
    renderRecipe();
    openLayer(els.recipeOverlay, "recipe");
    track("recipe_open");
  });

  els.rankingButton.addEventListener("click", async () => {
    openLayer(els.rankingOverlay, "ranking");
    await refreshLeaderboard(true);
    track("ranking_open");
  });

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.close;
      const el = $(id);
      const reason = id === "recipeOverlay" ? "recipe" : id === "rankingOverlay" ? "ranking" : id === "nicknameOverlay" ? "nickname" : "";
      closeLayer(el, reason);
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) addPause("hidden");
    else removePause("hidden");
  });

  function diagnostics() {
    return {
      version:CONFIG.version,
      renderer:SPRITES.status(),
      rendererTest:SPRITES.selfTest(),
      frameCount:state.frameCount,
      dessertDraws:state.dessertDraws,
      lastDessertDrawAt:state.lastDessertDrawAt,
      canvas:{
        width:els.canvas.width,
        height:els.canvas.height,
        cssWidth:els.canvas.getBoundingClientRect().width,
        cssHeight:els.canvas.getBoundingClientRect().height
      },
      gameStarted:state.gameStarted,
      bodies:Composite.allBodies(world).filter(isItem).length,
      currentLevel:state.currentLevel + 1,
      nextLevel:state.nextLevel + 1
    };
  }
  window.__DIGUL_DIAGNOSTICS__ = diagnostics;

  function boot() {
    loadAssets();
    const saved = EXP.getNickname();
    els.nicknameInput.value = saved;
    els.nicknameDisplay.textContent = saved || "PLAYER";
    els.weekLabel.textContent = EXP.getWeekLabel();
    els.weekLabelEntry.textContent = `이번 주 · ${EXP.getWeekLabel()}`;
    state.best = BOARD.getLocalBest();
    els.personalBest.textContent = state.best.toLocaleString("ko-KR");
    menuThumb(els.recipeButtonPreview, 0, 48);
    renderRecipe();

    // Rendering starts immediately and never waits for network or leaderboard work.
    resizeCanvas();
    lastFrame = performance.now();
    requestAnimationFrame(frame);

    refreshLeaderboard(true).catch(() => {});
  }

  boot();
})();
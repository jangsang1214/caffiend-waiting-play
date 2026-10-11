(() => {
  const $ = id => document.getElementById(id);
  const INTERNAL_TO_VISIBLE = {1:1,2:2,3:3,4:4,5:5,6:6,7:null,8:7,9:8,10:9,11:10,12:11};
  const INTERNAL_BY_TITLE = {
    "달걀 분리":1,
    "노른자 반죽":2,
    "박력분 체치기":3,
    "반죽 섞기":4,
    "흰자 풀기":5,
    "머랭 만들기":6,
    "뿔 확인":7,
    "1차 머랭 섞기":8,
    "마지막 폴딩":9,
    "팬 준비":10,
    "첫 번째 굽기":11,
    "뒤집고 완성":12
  };
  const FALLBACK_GUIDES = {
    1:"달걀을 톡 깨뜨린 뒤 노른자를 노른자 볼로 옮겨주세요.",
    2:"설탕 → 우유 → 바닐라 → 소금 순서로 재료를 볼에 드래그해주세요.",
    3:"박력분이 고르게 내려가도록 체를 좌우로 흔들어주세요.",
    4:"가루가 보이지 않을 때까지 거품기를 원을 그리듯 움직여주세요.",
    5:"흰자가 충분히 풀리도록 거품기를 빠르게 움직여주세요.",
    6:"설탕을 3번에 나누어 넣고, 넣을 때마다 충분히 휘핑해주세요.",
    8:"완성된 머랭의 1/3을 노른자 반죽에 넣고 천천히 섞어주세요.",
    9:"남은 머랭과 반죽을 바닥에서 위로 퍼올리듯 천천히 섞어주세요.",
    10:"팬에 기름을 고르게 바른 뒤 반죽을 원 안에 도톰하게 올려주세요.",
    11:"팬 빈 공간에 물 1큰술을 넣고 뚜껑을 닫아 익혀주세요.",
    12:"수플레를 조심스럽게 뒤집고 다시 물과 뚜껑을 사용한 뒤 타이밍에 맞춰 마무리해주세요."
  };
  const INGREDIENT_KIND = ["sugar","milk","vanilla","salt"];
  let peakSkipped = false;
  let lastInternalStep = 0;
  let rootObserver = null;

  function setText(el,value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function internalStep() {
    const title = $("souffleStepTitle")?.textContent?.trim() || "";
    if (INTERNAL_BY_TITLE[title]) return INTERNAL_BY_TITLE[title];
    const badge = $("souffleStepBadge")?.textContent || "";
    const parsed = Number((badge.match(/\d+/) || [0])[0]);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function ensureGuide() {
    const play = $("soufflePlayPanel");
    if (!play) return null;
    let guide = $("souffleGuideMessage");
    if (guide) return guide;
    guide = document.createElement("div");
    guide.id = "souffleGuideMessage";
    guide.className = "souffle-guide-message";
    guide.setAttribute("role","status");
    guide.setAttribute("aria-live","polite");
    guide.innerHTML = '<span class="guide-badge">지금 할 일</span><strong></strong><small></small>';
    const progress = $("souffleProgressTrack");
    progress?.insertAdjacentElement("afterend", guide);
    return guide;
  }

  function updateVisibleProgress(step) {
    if (!step || step === 7) return;
    const visible = INTERNAL_TO_VISIBLE[step];
    if (!visible) return;
    const badge = $("souffleStepBadge");
    setText(badge,`${visible} / 11`);
    const progress = $("souffleProgressTrack");
    if (progress) {
      if (progress.getAttribute("aria-valuemax") !== "11") progress.setAttribute("aria-valuemax","11");
      if (progress.getAttribute("aria-valuenow") !== String(visible)) progress.setAttribute("aria-valuenow",String(visible));
      const title = $("souffleStepTitle")?.textContent || "";
      const aria = `${visible}단계: ${title}`;
      if (progress.getAttribute("aria-valuetext") !== aria) progress.setAttribute("aria-valuetext",aria);
    }
    const fill = $("souffleProgressFill");
    const width = `${visible / 11 * 100}%`;
    if (fill && fill.style.width !== width) fill.style.width = width;
  }

  function guideForStep(step) {
    const hint = $("souffleStepHint")?.textContent?.trim();
    return FALLBACK_GUIDES[step] || hint || "화면 안내에 따라 진행해주세요.";
  }

  function updateGuide(step) {
    if (!step || step === 7) return;
    const guide = ensureGuide();
    if (!guide) return;
    const title = $("souffleStepTitle")?.textContent || "수플레 만들기";
    setText(guide.querySelector("strong"),title);
    setText(guide.querySelector("small"),guideForStep(step));
    const visible = String(INTERNAL_TO_VISIBLE[step] || step);
    if (guide.dataset.step !== visible) guide.dataset.step = visible;
  }

  function applyNotionAsset(el, kind) {
    const url = window.CAFFIEND_SOUFFLE_NOTION_ASSETS?.[kind];
    if (!url) return false;
    const pic = document.createElement("span");
    pic.className = "ingredient-picture has-image";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.decoding = "async";
    pic.appendChild(img);
    el.prepend(pic);
    return true;
  }

  function enhanceIngredients() {
    const work = $("souffleWorkArea");
    if (!work) return;
    work.querySelectorAll(".ingredient-token").forEach((token,index) => {
      if (token.dataset.visualized === "1") return;
      const kind = INGREDIENT_KIND[Number(token.dataset.i ?? index)] || "ingredient";
      token.dataset.visualized = "1";
      token.dataset.ingredientKind = kind;
      const oldMark = token.querySelector("b");
      if (oldMark) oldMark.hidden = true;
      if (!applyNotionAsset(token,kind)) {
        const pic = document.createElement("span");
        pic.className = `ingredient-picture kind-${kind}`;
        pic.setAttribute("aria-hidden","true");
        token.prepend(pic);
      }
    });

    const singletons = [
      [".sugar-dose","sugar"],
      [".sifter","flour"],
      [".oil-brush","oil"],
      [".batter-cup","batter"],
      [".water-spoon","water"]
    ];
    singletons.forEach(([selector,kind]) => {
      work.querySelectorAll(selector).forEach(el => {
        if (el.dataset.visualized === "1") return;
        el.dataset.visualized = "1";
        el.dataset.ingredientKind = kind;
        if (!applyNotionAsset(el,kind)) {
          const pic = document.createElement("span");
          pic.className = `ingredient-picture compact kind-${kind}`;
          pic.setAttribute("aria-hidden","true");
          el.prepend(pic);
        }
      });
    });
  }

  function updateSubGuide() {
    const step = internalStep();
    if (!step || step === 7) return;
    const guide = ensureGuide();
    if (!guide) return;
    const copy = guide.querySelector("small");
    const sugar = $("sugarSlot")?.querySelector(".sugar-dose span")?.textContent?.trim();
    if (step === 6 && sugar) {
      setText(copy,`설탕 ${sugar}을 볼에 넣은 뒤 거품기를 움직여 충분히 휘핑해주세요.`);
      return;
    }
    const cue = $("souffleWorkArea")?.querySelector(".gesture-cue")?.textContent?.trim() || "";
    const cueGuide = {
      "DRAG BATTER":"반죽을 팬 중앙의 원 안으로 드래그해주세요.",
      "DRAG WATER":"물 1큰술을 팬의 빈 공간으로 드래그해주세요.",
      "TAP LID":"뚜껑을 탭해 팬을 덮어주세요.",
      "WAIT":"수플레가 부풀어 오르는 동안 잠시 기다려주세요.",
      "12 SEC":"조금만 더 익혀주세요.",
      "GREEN = TAP":"바늘이 초록 영역에 들어왔을 때 ‘지금!’을 눌러주세요."
    }[cue];
    if (cueGuide) setText(copy,cueGuide);
  }

  function autoSkipPeak() {
    const step = internalStep();
    const title = $("souffleStepTitle")?.textContent?.trim();
    if (step !== 7 && title !== "뿔 확인") return false;
    const work = $("souffleWorkArea");
    work?.classList.add("auto-skip-step");
    const whisk = $("liftWhisk");
    if (!whisk) return false;
    peakSkipped = true;
    const originalCapture = whisk.setPointerCapture;
    try { whisk.setPointerCapture = () => {}; } catch (_) {}
    const Evt = window.PointerEvent || window.MouseEvent;
    const down = new Evt("pointerdown", { bubbles:true, cancelable:true, pointerId:77, clientY:220 });
    const up = new Evt("pointerup", { bubbles:true, cancelable:true, pointerId:77, clientY:100 });
    whisk.dispatchEvent(down);
    whisk.dispatchEvent(up);
    try {
      if (originalCapture) whisk.setPointerCapture = originalCapture.bind(whisk);
      else delete whisk.setPointerCapture;
    } catch (_) {}
    return true;
  }

  function cleanResultForVisibleFlow() {
    const panel = $("souffleResultPanel");
    if (!panel || panel.hidden) return;
    const list = $("souffleResultList");
    if (list && peakSkipped && list.dataset.revised !== "1") {
      [...list.querySelectorAll("span")].forEach(item => {
        const b = item.querySelector("b");
        const n = Number(b?.textContent || 0);
        if (n === 7) item.remove();
        else if (n > 7 && b) b.textContent = String(n - 1).padStart(2,"0");
      });
      list.dataset.revised = "1";
    }
    const perfect = $("soufflePerfectCount");
    if (perfect && peakSkipped && perfect.dataset.revised !== "1") {
      perfect.textContent = String(Math.max(0, Number(perfect.textContent || 0) - 1));
      perfect.dataset.revised = "1";
    }
  }

  function syncRevision() {
    const step = internalStep();
    if (step && step !== lastInternalStep) {
      lastInternalStep = step;
      if (step === 7) {
        requestAnimationFrame(() => autoSkipPeak());
        return;
      }
      $("souffleWorkArea")?.classList.remove("auto-skip-step");
      updateVisibleProgress(step);
      updateGuide(step);
      requestAnimationFrame(() => {
        enhanceIngredients();
        updateSubGuide();
      });
    } else if (step && step !== 7) {
      updateVisibleProgress(step);
      enhanceIngredients();
      updateSubGuide();
    }
    cleanResultForVisibleFlow();
  }

  function boot() {
    ensureGuide();
    rootObserver?.disconnect();
    rootObserver = new MutationObserver(() => queueMicrotask(syncRevision));
    const screen = $("souffleScreen");
    if (screen) rootObserver.observe(screen,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["hidden","class"]});
    syncRevision();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
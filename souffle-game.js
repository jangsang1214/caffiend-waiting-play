(() => {
  const $ = id => document.getElementById(id);
  const CONFIG = window.DIGUL_CONFIG;
  const EXP = window.DigulExperience;
  const SCREENS = window.CaffiendScreens;
  const ART = window.DigulDessertArt;
  const ANALYTICS = window.DigulAnalytics;
  const SERVICE = window.CaffiendSouffleService;
  if (!CONFIG || !EXP || !SCREENS || !ART) return;

  const MENU_IDS = {
    "로투스 수플레":"lotus",
    "밤 수플레":"chestnut",
    "흑임자 수플레":"sesame",
    "복숭아 수플레":"peach",
    "두바이 초코 수플레":"dubai",
    "인절미 수플레":"injeolmi",
    "크림브륄레 수플레":"brulee"
  };

  const MENUS = CONFIG.menus
    .filter(menu => String(menu.name || "").includes("수플레"))
    .map(menu => ({
      id:MENU_IDS[menu.name] || `menu-${menu.level}`,
      name:menu.name,
      level:Math.max(0, Number(menu.level || 1) - 1)
    }));

  const STEP_COPY = [
    ["달걀 분리","톡! 깨고 노른자를 옮겨요"],
    ["노른자 반죽","설탕 · 우유 · 바닐라 · 소금"],
    ["박력분 체치기","체를 좌우로 흔들어요"],
    ["반죽 섞기","가루가 안 보일 때까지"],
    ["흰자 풀기","거품기로 빠르게"],
    ["머랭 만들기","설탕 3번 · 휘핑 3번"],
    ["뿔 확인","거품기를 위로 들어요"],
    ["1차 머랭 섞기","머랭 1/3을 가볍게"],
    ["마지막 폴딩","바닥에서 위로 천천히"],
    ["팬 준비","기름 → 반죽"],
    ["첫 번째 굽기","물 → 뚜껑 → 20초"],
    ["뒤집고 완성","뒤집기 → 물 → 12초 → 타이밍"]
  ];

  const state = {
    selected:null,
    season:"autumn",
    step:1,
    score:0,
    startedAt:0,
    targetSeconds:CONFIG.souffle?.targetSeconds || 270,
    timer:null,
    elapsed:0,
    overtime:0,
    sound:true,
    stepResults:[],
    cleanup:[],
    finalTimingScore:0,
    transitioning:false,
    transitionTimer:null,
    runId:"",
    runActive:false,
    runFinished:false,
    feedback:{ fun:0, wait:0, anticipation:0 }
  };

  function seasonForNow() {
    const configured = CONFIG.souffle?.season;
    if (configured && configured !== "auto" && CONFIG.souffle?.seasons?.[configured]) return configured;
    const month = Number(new Intl.DateTimeFormat("en-US", {
      timeZone:CONFIG.timezone || "Asia/Seoul",
      month:"numeric"
    }).format(new Date()));
    const entries = Object.entries(CONFIG.souffle?.seasons || {});
    return entries.find(([,value]) => Array.isArray(value.months) && value.months.includes(month))?.[0] || "autumn";
  }

  function applySeason() {
    state.season = seasonForNow();
    const meta = CONFIG.souffle?.seasons?.[state.season] || { label:"AUTUMN", className:"autumn", message:"포근하게 익어가는 가을" };
    const screen = $("souffleScreen");
    if (screen) screen.dataset.season = state.season;
    document.querySelectorAll("#souffleScreen .season-window").forEach(el => {
      el.classList.remove("spring","summer","autumn","winter");
      el.classList.add(meta.className || state.season);
    });
    if ($("souffleSeasonLabel")) $("souffleSeasonLabel").textContent = `${meta.label} · CAFFIEND`;
    if ($("souffleSeasonMessage")) $("souffleSeasonMessage").textContent = meta.message || "";
  }

  function on(el,type,fn,opts){
    if(!el) return;
    el.addEventListener(type,fn,opts);
    state.cleanup.push(()=>el.removeEventListener(type,fn,opts));
  }

  function cleanupStep(){
    state.cleanup.splice(0).forEach(fn=>{try{fn()}catch(_){}});
  }

  function clearTransition(){
    if(state.transitionTimer) clearTimeout(state.transitionTimer);
    state.transitionTimer=null;
    state.transitioning=false;
  }

  function stopTimer(){
    clearInterval(state.timer);
    state.timer=null;
    updateTimer();
  }

  function leaveGame(){
    if(state.runActive && !state.runFinished){
      ANALYTICS?.track?.("souffle_game_abort",{step:state.step,elapsed:Math.round(state.elapsed),menu:state.selected?.id||""});
    }
    state.runActive=false;
    cleanupStep();
    clearTransition();
    stopTimer();
    state.startedAt=0;
  }

  function formatTime(sec){
    sec=Math.max(0,Math.floor(sec));
    return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
  }

  function updateTimer(){
    if(!state.startedAt) return;
    state.elapsed=(performance.now()-state.startedAt)/1000;
    const remain=state.targetSeconds-state.elapsed;
    state.overtime=Math.max(0,-remain);
    const el=$("souffleTimer");
    if(!el) return;
    el.textContent=remain>=0?formatTime(remain):`+${formatTime(-remain)}`;
    el.classList.toggle("overtime",remain<0);
  }

  function startTimer(){
    clearInterval(state.timer);
    state.startedAt=performance.now();
    state.elapsed=0;
    state.overtime=0;
    updateTimer();
    state.timer=setInterval(updateTimer,250);
  }

  function beep(kind="ok"){
    if(!state.sound) return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      const ac=beep.ctx||(beep.ctx=new AC());
      const osc=ac.createOscillator();
      const gain=ac.createGain();
      osc.type="sine";
      osc.frequency.value=kind==="bad"?180:kind==="finish"?660:440;
      gain.gain.setValueAtTime(.035,ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.12);
      osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+.13);
    }catch(_){}
  }

  function mountArt(target,level,size){
    if(!target) return;
    target.innerHTML="";
    const canvas=ART.render(level,size);
    canvas.className="dessert-canvas";
    target.appendChild(canvas);
  }

  function flash(text,good=true){
    const el=$("souffleToast");
    if(!el) return;
    el.textContent=text;
    el.className=`souffle-toast show ${good?"good":"bad"}`;
    clearTimeout(flash.t);
    flash.t=setTimeout(()=>el.className="souffle-toast",650);
    beep(good?"ok":"bad");
  }

  function setPanel(name){
    ["select","tutorial","play","result"].forEach(key=>{
      const el=$(`souffle${key[0].toUpperCase()+key.slice(1)}Panel`);
      if(el) el.hidden=key!==name;
    });
  }

  function setSyncState(kind,text){
    const el=$("souffleSyncState");
    if(!el) return;
    el.className=`souffle-sync-state ${kind?`is-${kind}`:""}`.trim();
    const label=el.querySelector("span");
    if(label) label.textContent=text;
  }

  function renderMenuSelect(){
    const grid=$("souffleMenuGrid");
    if(!grid) return;
    grid.innerHTML="";
    MENUS.forEach(menu=>{
      const btn=document.createElement("button");
      btn.type="button";
      btn.className="souffle-menu-card";
      btn.setAttribute("aria-pressed","false");
      btn.innerHTML=`<span class="menu-art"></span><strong>${menu.name.replace(" 수플레","")}</strong><small class="menu-meta">SOUFFLÉ</small>`;
      mountArt(btn.querySelector(".menu-art"),menu.level,96);
      btn.addEventListener("click",()=>{
        state.selected=menu;
        grid.querySelectorAll(".souffle-menu-card").forEach(x=>{
          const selected=x===btn;
          x.classList.toggle("selected",selected);
          x.setAttribute("aria-pressed",selected?"true":"false");
        });
        if($("souffleSelectedName")) $("souffleSelectedName").textContent=menu.name;
        if($("souffleContinueButton")) $("souffleContinueButton").disabled=false;
        ANALYTICS?.track?.("souffle_menu_select",{menu:menu.id});
        beep();
      });
      grid.appendChild(btn);
    });
  }

  function resetFeedback(){
    state.feedback={fun:0,wait:0,anticipation:0};
    document.querySelectorAll("[data-feedback-question]").forEach(btn=>{
      btn.disabled=false;
      btn.classList.remove("selected");
      btn.setAttribute("aria-pressed","false");
    });
    const submit=$("souffleFeedbackSubmit");
    if(submit){submit.disabled=true;submit.textContent="평가 보내기";}
    const status=$("souffleFeedbackStatus");
    if(status){status.textContent="";status.className="souffle-feedback-status";}
  }

  function openGame(){
    if(!SCREENS.ensureNickname()) return;
    leaveGame();
    SCREENS.showOnly("souffle");
    applySeason();
    state.selected=null;
    state.step=1;
    state.score=0;
    state.elapsed=0;
    state.overtime=0;
    state.stepResults=[];
    state.finalTimingScore=0;
    state.runFinished=false;
    if($("souffleContinueButton")) $("souffleContinueButton").disabled=true;
    if($("souffleSelectedName")) $("souffleSelectedName").textContent="메뉴를 골라주세요";
    if($("souffleTimer")) {
      $("souffleTimer").textContent=formatTime(state.targetSeconds);
      $("souffleTimer").classList.remove("overtime");
    }
    setSyncState("",SERVICE?.queuedCount?.()?`이전 기록 ${SERVICE.queuedCount()}건 동기화 대기`:"플레이 기록은 완료 후 저장돼요");
    setPanel("select");
    renderMenuSelect();
    resetFeedback();
    SERVICE?.flushQueue?.().then(result=>{
      if(result?.sent) setSyncState("synced",`이전 기록 ${result.sent}건 동기화 완료`);
    }).catch(()=>{});
    ANALYTICS?.track?.("souffle_open_v3",{season:state.season});
  }

  function resetRun(){
    cleanupStep();
    clearTransition();
    stopTimer();
    state.step=1;
    state.score=0;
    state.elapsed=0;
    state.overtime=0;
    state.stepResults=[];
    state.finalTimingScore=0;
    state.runId=EXP.newGameId();
    state.runActive=true;
    state.runFinished=false;
    resetFeedback();
    if($("souffleScoreLive")) $("souffleScoreLive").textContent="0";
    setPanel("play");
    startTimer();
    renderStep();
    ANALYTICS?.track?.("souffle_game_start",{menu:state.selected?.id||"",season:state.season,runId:state.runId});
  }

  function renderProgress(){
    if($("souffleStepBadge")) $("souffleStepBadge").textContent=`${state.step} / ${CONFIG.souffle?.steps||12}`;
    const percent=state.step/(CONFIG.souffle?.steps||12)*100;
    if($("souffleProgressFill")) $("souffleProgressFill").style.width=`${percent}%`;
    const progress=$("souffleProgressTrack");
    if(progress){
      progress.setAttribute("aria-valuenow",String(state.step));
      progress.setAttribute("aria-valuetext",`${state.step}단계: ${STEP_COPY[state.step-1]?.[0]||""}`);
    }
    if($("souffleStepTitle")) $("souffleStepTitle").textContent=STEP_COPY[state.step-1][0];
    if($("souffleStepHint")) $("souffleStepHint").textContent=STEP_COPY[state.step-1][1];
  }

  function completeStep(points=100,quality="GOOD",delay=420){
    if(state.transitioning) return;
    state.transitioning=true;
    const completed=state.step;
    const awarded=Math.max(0,Math.round(points));
    state.score+=awarded;
    if($("souffleScoreLive")) $("souffleScoreLive").textContent=state.score.toLocaleString("ko-KR");
    state.stepResults.push({step:completed,quality,points:awarded});
    ANALYTICS?.track?.("souffle_step_complete",{step:completed,quality,points:awarded});
    flash(quality==="PERFECT"?"완벽해요!":quality==="OK"?"완성!":"좋아요!");
    cleanupStep();
    state.transitionTimer=setTimeout(()=>{
      state.transitionTimer=null;
      state.transitioning=false;
      if(completed>=12) finishRun();
      else {state.step=completed+1;renderStep();}
    },delay);
  }

  function stage(html){
    const el=$("souffleWorkArea");
    if(!el) return document.createElement("div");
    el.innerHTML=html;
    return el;
  }

  function resetDragged(el){
    el.style.position="";
    el.style.left="";
    el.style.top="";
  }

  function makeDrag(el,target,onDrop){
    if(!el||!target)return;
    let active=false,ox=0,oy=0,lastPoint=null;
    const down=e=>{
      if(el.disabled) return;
      active=true;lastPoint={x:e.clientX,y:e.clientY};
      el.setPointerCapture?.(e.pointerId);
      const r=el.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;
      el.classList.add("dragging");e.preventDefault();
    };
    const move=e=>{
      if(!active)return;
      lastPoint={x:e.clientX,y:e.clientY};
      const host=el.offsetParent?.getBoundingClientRect?.();
      if(!host) return;
      el.style.position="absolute";
      el.style.left=`${e.clientX-host.left-ox}px`;
      el.style.top=`${e.clientY-host.top-oy}px`;
      e.preventDefault();
    };
    const finish=(e,cancelled=false)=>{
      if(!active)return;
      active=false;el.classList.remove("dragging");
      const p=lastPoint || {x:e.clientX||0,y:e.clientY||0};
      const b=target.getBoundingClientRect();
      const hit=!cancelled&&p.x>b.left&&p.x<b.right&&p.y>b.top&&p.y<b.bottom;
      if(hit){onDrop();return;}
      resetDragged(el);
    };
    on(el,"pointerdown",down);on(el,"pointermove",move);
    on(el,"pointerup",e=>finish(e,false));on(el,"pointercancel",e=>finish(e,true));
  }

  function continuousGesture(el,{need=500,maxSpeed=9999,onProgress,onDone}){
    if(!el)return;
    let down=false,last=null,total=0,fast=0,done=false;
    const pd=e=>{if(done)return;down=true;last={x:e.clientX,y:e.clientY,t:performance.now()};el.setPointerCapture?.(e.pointerId);e.preventDefault()};
    const pm=e=>{
      if(!down||done||!last)return;
      const now=performance.now(),dx=e.clientX-last.x,dy=e.clientY-last.y,dist=Math.hypot(dx,dy),dt=Math.max(1,now-last.t);
      total+=dist;if(dist/dt>maxSpeed)fast++;last={x:e.clientX,y:e.clientY,t:now};
      onProgress?.(Math.min(1,total/need),fast);
      if(total>=need){done=true;down=false;onDone?.(fast)}
      e.preventDefault();
    };
    const pu=()=>{down=false;last=null};
    on(el,"pointerdown",pd);on(el,"pointermove",pm);on(el,"pointerup",pu);on(el,"pointercancel",pu);
  }

  function horizontalSwipes(el,need,onProgress,onDone){
    if(!el)return;
    let down=false,lastX=0,dir=0,count=0,done=false;
    const pd=e=>{if(done)return;down=true;lastX=e.clientX;el.setPointerCapture?.(e.pointerId);e.preventDefault()};
    const pm=e=>{
      if(!down||done)return;
      const dx=e.clientX-lastX,nd=Math.abs(dx)>8?Math.sign(dx):0;
      if(nd&&nd!==dir){dir=nd;count++;lastX=e.clientX;onProgress?.(Math.min(1,count/need));if(count>=need){done=true;down=false;onDone?.()}}
      e.preventDefault();
    };
    on(el,"pointerdown",pd);on(el,"pointermove",pm);on(el,"pointerup",()=>down=false);on(el,"pointercancel",()=>down=false);
  }

  function renderStep(){
    cleanupStep();
    applySeason();
    renderProgress();
    switch(state.step){
      case 1:return stepEgg();case 2:return stepIngredients();case 3:return stepSift();case 4:return stepMix();
      case 5:return stepWhite();case 6:return stepMeringue();case 7:return stepPeak();case 8:return stepFirstFold();
      case 9:return stepFinalFold();case 10:return stepPanPrep();case 11:return stepFirstBake();case 12:return stepFinishBake();
    }
  }

  function stepEgg(){
    const root=stage(`<div class="kitchen-scene egg-scene"><div class="season-window ${state.season}"><i></i><b></b></div><button class="egg-object" type="button" aria-label="달걀 깨기"><span></span></button><div class="mini-bowls"><div class="cook-bowl white-bowl"><small>흰자</small></div><div id="yolkBowl" class="cook-bowl yolk-bowl"><small>노른자</small></div></div><div id="yolkPiece" class="yolk-piece" hidden></div><div class="gesture-cue tap-cue">TAP</div></div>`);
    const egg=root.querySelector(".egg-object"),yolk=root.querySelector("#yolkPiece"),target=root.querySelector("#yolkBowl");
    on(egg,"click",()=>{
      if(egg.disabled)return;
      egg.disabled=true;egg.classList.add("cracked");yolk.hidden=false;flash("톡!");
      makeDrag(yolk,target,()=>{yolk.classList.add("dropped");completeStep(100,"PERFECT")});
    });
  }

  function stepIngredients(){
    const items=["설탕","우유","바닐라","소금"];
    const root=stage(`<div class="kitchen-scene"><div id="ingredientBowl" class="mix-bowl batter"><i></i></div><div class="ingredient-dock">${items.map((x,i)=>`<button class="ingredient-token" data-i="${i}" type="button"><b>${["S","M","V","·"][i]}</b><span>${x}</span></button>`).join("")}</div><div class="gesture-cue">DRAG</div></div>`);
    let expected=0;const bowl=root.querySelector("#ingredientBowl");
    root.querySelectorAll(".ingredient-token").forEach(token=>makeDrag(token,bowl,()=>{
      const i=Number(token.dataset.i);
      if(i!==expected){flash("순서대로!",false);resetDragged(token);return;}
      token.classList.add("used");token.disabled=true;expected++;beep();
      if(expected===items.length)completeStep(100,"PERFECT");
    }));
  }

  function stepSift(){
    const root=stage(`<div class="kitchen-scene"><div class="mix-bowl batter flour"><i></i></div><div id="sifter" class="sifter"><span>박력분</span></div><div class="powder-cloud"></div><div class="gesture-cue swipe-cue">↔ SWIPE</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    horizontalSwipes(root.querySelector("#sifter"),8,p=>$("stepMeter").style.width=`${p*100}%`,()=>completeStep(100,"PERFECT"));
  }

  function stepMix(){
    const root=stage(`<div class="kitchen-scene"><div id="mixTarget" class="mix-bowl batter rich"><i class="whisk-tool"></i><span class="swirl"></span></div><div class="gesture-cue">↻ DRAG</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    continuousGesture(root.querySelector("#mixTarget"),{need:620,onProgress:p=>{$("stepMeter").style.width=`${p*100}%`;root.querySelector(".swirl").style.opacity=String(.2+p*.8)},onDone:()=>completeStep(100,"PERFECT")});
  }

  function stepWhite(){
    const root=stage(`<div class="kitchen-scene"><div id="whiteTarget" class="mix-bowl whites"><i class="whisk-tool"></i><span class="foam"></span></div><div class="gesture-cue">↻ DRAG</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    continuousGesture(root.querySelector("#whiteTarget"),{need:520,onProgress:p=>{$("stepMeter").style.width=`${p*100}%`;root.querySelector(".foam").style.transform=`scale(${.55+p*.45})`},onDone:()=>completeStep(90,"GOOD")});
  }

  function stepMeringue(){
    let round=0;
    const root=stage(`<div class="kitchen-scene"><div id="meringueBowl" class="mix-bowl whites meringue"><i class="whisk-tool"></i><span class="foam"></span></div><div id="sugarSlot"></div><div class="gesture-cue">DRAG + WHISK</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    const bowl=root.querySelector("#meringueBowl"),slot=root.querySelector("#sugarSlot"),meter=$("stepMeter"),foam=root.querySelector(".foam");

    const spawnDose=()=>{
      const sugar=document.createElement("button");
      sugar.type="button";sugar.className="sugar-dose";
      sugar.innerHTML=`<b>설탕</b><span>${round+1} / 3</span>`;
      slot.replaceChildren(sugar);
      makeDrag(sugar,bowl,()=>{
        sugar.disabled=true;sugar.classList.add("used");flash("휘핑!");
        continuousGesture(bowl,{need:380,onProgress:p=>{meter.style.width=`${((round+p)/3)*100}%`;foam.style.transform=`scale(${.62+(round+p)*.12})`},onDone:()=>{
          round++;
          if(round>=3) completeStep(130,"PERFECT");
          else spawnDose();
        }});
      });
    };
    spawnDose();
  }

  function stepPeak(){
    const root=stage(`<div class="kitchen-scene"><div class="mix-bowl whites peak"><span class="foam peak-foam"></span></div><div id="liftWhisk" class="lift-whisk"><i></i></div><div class="gesture-cue up-cue">↑ SWIPE</div></div>`);
    const el=root.querySelector("#liftWhisk");let sy=null;
    on(el,"pointerdown",e=>{sy=e.clientY;el.setPointerCapture?.(e.pointerId);e.preventDefault()});
    on(el,"pointerup",e=>{if(sy===null)return;const dy=sy-e.clientY;sy=null;if(dy>70){el.classList.add("lifted");root.querySelector(".peak-foam").classList.add("show-peak");completeStep(100,"PERFECT",700)}else flash("위로 길게!",false)});
    on(el,"pointercancel",()=>{sy=null});
  }

  function stepFirstFold(){
    const root=stage(`<div class="kitchen-scene"><div id="foldBowl" class="mix-bowl batter fold"><span class="fold-batter"></span></div><button id="meringueThird" class="meringue-third" type="button">⅓</button><div class="gesture-cue">DRAG → SLOW</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    const bowl=root.querySelector("#foldBowl"),piece=root.querySelector("#meringueThird");
    makeDrag(piece,bowl,()=>{piece.disabled=true;piece.classList.add("used");flash("살살 섞어요");continuousGesture(bowl,{need:480,maxSpeed:1.8,onProgress:(p,fast)=>{$("stepMeter").style.width=`${p*100}%`;bowl.classList.toggle("too-fast",fast>2)},onDone:fast=>completeStep(fast<=2?120:75,fast<=2?"PERFECT":"GOOD")})});
  }

  function stepFinalFold(){
    const root=stage(`<div class="kitchen-scene"><div id="finalFold" class="mix-bowl batter fold final-fold"><span class="fold-batter"></span><i class="spatula-tool"></i></div><div class="gesture-cue">↓ ↗ SLOW</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    const bowl=root.querySelector("#finalFold");
    continuousGesture(bowl,{need:680,maxSpeed:1.55,onProgress:(p,fast)=>{$("stepMeter").style.width=`${p*100}%`;bowl.classList.toggle("too-fast",fast>3)},onDone:fast=>completeStep(fast<=3?140:80,fast<=3?"PERFECT":"GOOD")});
  }

  function stepPanPrep(){
    const root=stage(`<div class="kitchen-scene pan-scene"><div id="pan" class="cook-pan"><span class="pan-ring"></span></div><div id="oilBrush" class="oil-brush">기름</div><button id="batterCup" class="batter-cup" type="button">반죽</button><div id="panCue" class="gesture-cue">↔ OIL</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    const oil=root.querySelector("#oilBrush"),pan=root.querySelector("#pan"),batter=root.querySelector("#batterCup");
    batter.disabled=true;
    horizontalSwipes(oil,7,p=>$("stepMeter").style.width=`${p*50}%`,()=>{
      oil.classList.add("done");batter.disabled=false;$("panCue").textContent="DRAG BATTER";flash("팬 준비 완료");
      makeDrag(batter,pan,()=>{batter.disabled=true;batter.classList.add("used");pan.classList.add("with-batter");$("stepMeter").style.width="100%";completeStep(110,"PERFECT")});
    });
  }

  function stepFirstBake(){
    const root=stage(`<div class="kitchen-scene pan-scene bake"><div id="bakePan" class="cook-pan with-batter"><span class="pan-ring"></span><i class="steam"></i></div><button id="waterSpoon" class="water-spoon" type="button">물 1T</button><button id="lidButton" class="pan-lid" type="button" disabled>뚜껑</button><div id="bakeCount" class="bake-count">20</div><div id="bakeCue" class="gesture-cue">DRAG WATER</div></div>`);
    const pan=root.querySelector("#bakePan"),water=root.querySelector("#waterSpoon"),lid=root.querySelector("#lidButton"),count=root.querySelector("#bakeCount");
    makeDrag(water,pan,()=>{water.disabled=true;water.classList.add("used");lid.disabled=false;$("bakeCue").textContent="TAP LID";flash("물 1큰술")});
    on(lid,"click",()=>{
      if(lid.disabled)return;
      lid.disabled=true;lid.classList.add("closed");$("bakeCue").textContent="WAIT";count.classList.add("show");
      let left=20;const timer=setInterval(()=>{
        left--;count.textContent=String(left);pan.style.setProperty("--rise",String((20-left)/20));
        if(left<=0){clearInterval(timer);completeStep(120,"PERFECT")}
      },1000);
      state.cleanup.push(()=>clearInterval(timer));
    });
  }

  function stepFinishBake(){
    const root=stage(`<div class="kitchen-scene pan-scene finish"><div id="finishPan" class="cook-pan with-batter baked"><span class="pan-ring"></span><i class="souffle-disc"></i></div><div id="flipCue" class="gesture-cue up-cue">↑ FLIP</div><button id="finishWater" class="water-spoon" type="button" disabled>물 1T</button><button id="finishLid" class="pan-lid" type="button" disabled>뚜껑</button><div id="finishCount" class="bake-count">12</div><div id="finishTiming" class="finish-timing" hidden><span class="good-zone"></span><i></i></div><button id="finishTap" class="timing-tap" type="button" hidden>지금!</button></div>`);
    const pan=root.querySelector("#finishPan"),water=root.querySelector("#finishWater"),lid=root.querySelector("#finishLid"),count=root.querySelector("#finishCount"),track=root.querySelector("#finishTiming"),needle=track.querySelector("i"),tap=root.querySelector("#finishTap");
    let sy=null,flipped=false;
    on(pan,"pointerdown",e=>{if(flipped)return;sy=e.clientY;pan.setPointerCapture?.(e.pointerId);e.preventDefault()});
    on(pan,"pointerup",e=>{
      if(flipped||sy===null)return;
      const dy=sy-e.clientY;sy=null;
      if(dy<65){flash("위로 스와이프!",false);return;}
      flipped=true;pan.classList.add("flipped");water.disabled=false;$("flipCue").textContent="DRAG WATER";flash("뒤집기 성공!");
      makeDrag(water,pan,()=>{water.disabled=true;water.classList.add("used");lid.disabled=false;$("flipCue").textContent="TAP LID"});
    });
    on(pan,"pointercancel",()=>{sy=null});
    on(lid,"click",()=>{
      if(lid.disabled)return;
      lid.disabled=true;lid.classList.add("closed");count.classList.add("show");$("flipCue").textContent="12 SEC";
      let left=12;
      const bakeTimer=setInterval(()=>{
        left--;count.textContent=String(left);pan.style.setProperty("--rise",String(Math.min(1,.65+(12-left)/34)));
        if(left<=0){
          clearInterval(bakeTimer);count.classList.remove("show");track.hidden=false;tap.hidden=false;$("flipCue").textContent="GREEN = TAP";
          startTiming();
        }
      },1000);
      state.cleanup.push(()=>clearInterval(bakeTimer));
    });

    function startTiming(){
      const started=performance.now();let pos=0,raf=0;
      const loop=now=>{const phase=((now-started)%2200)/2200;pos=phase<.5?phase*200:(1-phase)*200;needle.style.left=`${pos}%`;raf=requestAnimationFrame(loop)};
      raf=requestAnimationFrame(loop);state.cleanup.push(()=>cancelAnimationFrame(raf));
      on(tap,"click",()=>{
        cancelAnimationFrame(raf);tap.disabled=true;
        state.finalTimingScore=Math.max(0,Math.round(100-Math.abs(pos-50)*2));
        const q=state.finalTimingScore>=82?"PERFECT":state.finalTimingScore>=55?"GOOD":"OK";
        completeStep(120+state.finalTimingScore,q,600);
      });
    }
  }

  function renderResultSummary(finalScore){
    const perfect=state.stepResults.filter(x=>x.quality==="PERFECT").length;
    const careful=state.stepResults.filter(x=>[8,9].includes(x.step)&&x.quality==="PERFECT").length;
    if($("soufflePerfectCount")) $("soufflePerfectCount").textContent=String(perfect);
    if($("souffleCareCount")) $("souffleCareCount").textContent=`${careful}/2`;
    if($("souffleTimingValue")) $("souffleTimingValue").textContent=String(state.finalTimingScore);
    return {perfect,careful,finalScore};
  }

  function finishRun(){
    stopTimer();cleanupStep();clearTransition();
    state.runActive=false;state.runFinished=true;
    setPanel("result");
    const overtimePenalty=Math.round(state.overtime*2);
    const finalScore=Math.max(0,state.score-overtimePenalty);
    if($("souffleResultMenu")) $("souffleResultMenu").textContent=state.selected?.name||"수플레";
    if($("souffleFinalScore")) $("souffleFinalScore").textContent=finalScore.toLocaleString("ko-KR");
    if($("souffleResultTime")) $("souffleResultTime").textContent=formatTime(state.elapsed);
    if($("souffleResultRemain")) $("souffleResultRemain").textContent=state.overtime>0?`+${formatTime(state.overtime)}`:formatTime(state.targetSeconds-state.elapsed);
    if($("souffleResultGrade")) $("souffleResultGrade").textContent=finalScore>=1250?"MASTER":finalScore>=1050?"FLUFFY":"NICE";
    if($("souffleResultList")) $("souffleResultList").innerHTML=state.stepResults.map(r=>`<span class="${r.quality.toLowerCase()}"><b>${String(r.step).padStart(2,"0")}</b>${r.quality}</span>`).join("");
    mountArt($("souffleResultArt"),state.selected?.level||0,230);
    renderResultSummary(finalScore);
    resetFeedback();
    beep("finish");
    ANALYTICS?.track?.("souffle_game_finish",{menu:state.selected?.id||"",score:finalScore,elapsed:Math.round(state.elapsed),overtime:Math.round(state.overtime),timing:state.finalTimingScore,season:state.season});

    const runPayload={
      sessionId:state.runId,
      menuId:state.selected?.id||"",
      season:state.season,
      elapsedMs:Math.round(state.elapsed*1000),
      stepResults:state.stepResults,
      timingScore:state.finalTimingScore
    };
    setSyncState("","플레이 기록 저장 중");
    if(SERVICE?.submitRun){
      SERVICE.submitRun(runPayload).then(result=>{
        setSyncState(result.ok?"synced":"queued",result.ok?"플레이 기록 저장 완료":"네트워크 연결 시 자동 저장");
        ANALYTICS?.track?.("souffle_remote_sync",{ok:result.ok,queued:result.queued});
      }).catch(()=>setSyncState("queued","네트워크 연결 시 자동 저장"));
    } else {
      setSyncState("queued","이 기기에서만 기록됨");
    }
  }

  function selectFeedback(question,value,button){
    state.feedback[question]=value;
    document.querySelectorAll(`[data-feedback-question="${question}"]`).forEach(btn=>{
      const selected=btn===button;
      btn.classList.toggle("selected",selected);
      btn.setAttribute("aria-pressed",selected?"true":"false");
    });
    const ready=Object.values(state.feedback).every(v=>Number(v)>=1);
    if($("souffleFeedbackSubmit")) $("souffleFeedbackSubmit").disabled=!ready;
  }

  async function submitFeedback(){
    if(!Object.values(state.feedback).every(v=>Number(v)>=1)) return;
    const button=$("souffleFeedbackSubmit");
    const status=$("souffleFeedbackStatus");
    if(button){button.disabled=true;button.textContent="보내는 중";}
    document.querySelectorAll("[data-feedback-question]").forEach(btn=>btn.disabled=true);
    const payload={sessionId:state.runId,...state.feedback};
    const result=SERVICE?.submitFeedback?await SERVICE.submitFeedback(payload):{ok:false,queued:true};
    if(button) button.textContent="평가 완료";
    if(status){
      status.textContent=result.ok?"고마워요. 다음 현장 테스트에 반영할게요.":"고마워요. 연결되면 자동으로 저장돼요.";
      status.className="souffle-feedback-status good";
    }
    ANALYTICS?.track?.("souffle_feedback_submit",{...state.feedback,ok:result.ok,queued:result.queued});
  }

  $("openSouffleButton")?.addEventListener("click",openGame);
  $("souffleContinueButton")?.addEventListener("click",()=>{if(state.selected){setPanel("tutorial");ANALYTICS?.track?.("souffle_tutorial_open",{menu:state.selected.id})}});
  $("souffleTutorialStart")?.addEventListener("click",resetRun);
  $("souffleRetryButton")?.addEventListener("click",resetRun);
  $("souffleReselectButton")?.addEventListener("click",()=>{leaveGame();setPanel("select");renderMenuSelect()});
  $("souffleSoundButton")?.addEventListener("click",()=>{state.sound=!state.sound;$("souffleSoundButton").textContent=state.sound?"♪":"×";$("souffleSoundButton").setAttribute("aria-label",state.sound?"사운드 끄기":"사운드 켜기")});
  $("souffleFeedbackSubmit")?.addEventListener("click",()=>submitFeedback().catch(()=>{}));
  document.querySelectorAll("[data-feedback-question]").forEach(btn=>{
    btn.addEventListener("click",()=>selectFeedback(btn.dataset.feedbackQuestion,Number(btn.dataset.feedbackValue),btn));
  });
  document.querySelectorAll('[data-home-from="souffle"]').forEach(btn=>btn.addEventListener("click",leaveGame,{capture:true}));

  applySeason();
})();
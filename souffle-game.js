(() => {
  const $ = id => document.getElementById(id);
  const SCREENS = window.CaffiendScreens;
  const ART = window.DigulDessertArt;
  const ANALYTICS = window.DigulAnalytics;
  if (!SCREENS || !ART) return;

  const MENUS = [
    {id:"lotus",name:"로투스 수플레",level:0,tone:"#c87739"},
    {id:"chestnut",name:"밤 수플레",level:2,tone:"#8e5735"},
    {id:"sesame",name:"흑임자 수플레",level:3,tone:"#65605e"},
    {id:"peach",name:"복숭아 수플레",level:4,tone:"#ef9c99"},
    {id:"dubai",name:"두바이 초코 수플레",level:6,tone:"#654235"},
    {id:"injeolmi",name:"인절미 수플레",level:8,tone:"#cda96d"},
    {id:"brulee",name:"크림브륄레 수플레",level:10,tone:"#dfad5d"}
  ];

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
    ["뒤집고 완성","뒤집기 → 마무리 굽기"]
  ];

  const state = {
    selected:null,
    step:1,
    score:0,
    startedAt:0,
    targetSeconds:270,
    timer:null,
    elapsed:0,
    overtime:0,
    sound:true,
    stepResults:[],
    cleanup:[],
    progress:0,
    sugarRound:0,
    firstFoldLoaded:false,
    finalTimingScore:0
  };

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
    }catch(_){ }
  }

  function cleanupStep(){
    state.cleanup.splice(0).forEach(fn=>{try{fn()}catch(_){}});
  }

  function on(el,type,fn,opts){
    el?.addEventListener(type,fn,opts);
    state.cleanup.push(()=>el?.removeEventListener(type,fn,opts));
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
    el.textContent=remain>=0?formatTime(remain):`+${formatTime(-remain)}`;
    el.classList.toggle("overtime",remain<0);
  }

  function startTimer(){
    clearInterval(state.timer);
    state.startedAt=performance.now();
    updateTimer();
    state.timer=setInterval(updateTimer,250);
  }

  function stopTimer(){clearInterval(state.timer);state.timer=null;updateTimer()}

  function mountArt(target,level,size){
    if(!target)return;
    target.innerHTML="";
    const c=ART.render(level,size);
    c.className="dessert-canvas";
    target.appendChild(c);
  }

  function flash(text,good=true){
    const el=$("souffleToast");
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

  function renderMenuSelect(){
    const grid=$("souffleMenuGrid");
    grid.innerHTML="";
    MENUS.forEach(menu=>{
      const btn=document.createElement("button");
      btn.type="button";
      btn.className="souffle-menu-card";
      btn.innerHTML=`<span class="menu-art"></span><strong>${menu.name.replace(" 수플레","")}</strong>`;
      mountArt(btn.querySelector(".menu-art"),menu.level,96);
      btn.addEventListener("click",()=>{
        state.selected=menu;
        document.querySelectorAll(".souffle-menu-card").forEach(x=>x.classList.toggle("selected",x===btn));
        $("souffleSelectedName").textContent=menu.name;
        $("souffleContinueButton").disabled=false;
        beep();
      });
      grid.appendChild(btn);
    });
  }

  function openGame(){
    if(!SCREENS.ensureNickname()) return;
    SCREENS.showOnly("souffle");
    cleanupStep();stopTimer();
    state.selected=null;
    state.startedAt=0;
    $("souffleContinueButton").disabled=true;
    $("souffleSelectedName").textContent="메뉴를 골라주세요";
    $("souffleTimer").textContent="04:30";
    $("souffleTimer").classList.remove("overtime");
    setPanel("select");
    renderMenuSelect();
    ANALYTICS?.track?.("souffle_open_v2");
  }

  function resetRun(){
    cleanupStep();stopTimer();
    state.step=1;
    state.score=0;
    state.stepResults=[];
    state.progress=0;
    state.sugarRound=0;
    state.firstFoldLoaded=false;
    state.finalTimingScore=0;
    $("souffleScoreLive").textContent="0";
    setPanel("play");
    startTimer();
    renderStep();
    ANALYTICS?.track?.("souffle_game_start",{menu:state.selected?.id});
  }

  function renderProgress(){
    $("souffleStepBadge").textContent=`${state.step} / 12`;
    $("souffleProgressFill").style.width=`${state.step/12*100}%`;
    $("souffleStepTitle").textContent=STEP_COPY[state.step-1][0];
    $("souffleStepHint").textContent=STEP_COPY[state.step-1][1];
  }

  function addScore(points,quality="GOOD"){
    state.score+=Math.max(0,Math.round(points));
    $("souffleScoreLive").textContent=state.score.toLocaleString("ko-KR");
    return quality;
  }

  function completeStep(points=100,quality="GOOD",delay=420){
    const step=state.step;
    addScore(points,quality);
    state.stepResults.push({step,quality,points:Math.round(points)});
    flash(quality==="PERFECT"?"완벽해요!":"좋아요!");
    cleanupStep();
    setTimeout(()=>{
      if(step>=12) finishRun();
      else {state.step=step+1;state.progress=0;renderStep();}
    },delay);
  }

  function stage(html){
    const el=$("souffleWorkArea");
    el.innerHTML=html;
    return el;
  }

  function makeDrag(el,target,onDrop){
    let active=false,ox=0,oy=0;
    const down=e=>{
      active=true;el.setPointerCapture?.(e.pointerId);
      const r=el.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;
      el.classList.add("dragging");e.preventDefault();
    };
    const move=e=>{
      if(!active)return;
      const host=el.offsetParent.getBoundingClientRect();
      el.style.position="absolute";
      el.style.left=`${e.clientX-host.left-ox}px`;
      el.style.top=`${e.clientY-host.top-oy}px`;
      e.preventDefault();
    };
    const up=e=>{
      if(!active)return;active=false;el.classList.remove("dragging");
      const a=el.getBoundingClientRect(),b=target.getBoundingClientRect();
      const hit=a.left+a.width/2>b.left&&a.left+a.width/2<b.right&&a.top+a.height/2>b.top&&a.top+a.height/2<b.bottom;
      if(hit){onDrop();return;}
      el.style.position="";el.style.left="";el.style.top="";
    };
    on(el,"pointerdown",down);on(el,"pointermove",move);on(el,"pointerup",up);on(el,"pointercancel",up);
  }

  function continuousGesture(el,{need=500,maxSpeed=9999,onProgress,onDone}){
    let down=false,last=null,total=0,start=0,fast=0;
    const pd=e=>{down=true;last={x:e.clientX,y:e.clientY,t:performance.now()};start=last.t;el.setPointerCapture?.(e.pointerId);e.preventDefault()};
    const pm=e=>{
      if(!down)return;
      const now=performance.now();const dx=e.clientX-last.x,dy=e.clientY-last.y;const dist=Math.hypot(dx,dy);const dt=Math.max(1,now-last.t);
      total+=dist;if(dist/dt>maxSpeed)fast+=1;last={x:e.clientX,y:e.clientY,t:now};
      onProgress?.(Math.min(1,total/need),fast,now-start);
      if(total>=need){down=false;onDone?.(fast,now-start)}
      e.preventDefault();
    };
    const pu=()=>{down=false;last=null};
    on(el,"pointerdown",pd);on(el,"pointermove",pm);on(el,"pointerup",pu);on(el,"pointercancel",pu);
  }

  function horizontalSwipes(el,need,onProgress,onDone){
    let down=false,lastX=0,dir=0,count=0;
    const pd=e=>{down=true;lastX=e.clientX;el.setPointerCapture?.(e.pointerId);e.preventDefault()};
    const pm=e=>{
      if(!down)return;const dx=e.clientX-lastX;
      const nd=Math.abs(dx)>8?Math.sign(dx):0;
      if(nd&&nd!==dir){dir=nd;count++;onProgress?.(count/need);lastX=e.clientX;if(count>=need){down=false;onDone?.()}}
      e.preventDefault();
    };
    on(el,"pointerdown",pd);on(el,"pointermove",pm);on(el,"pointerup",()=>down=false);on(el,"pointercancel",()=>down=false);
  }

  function renderStep(){
    cleanupStep();renderProgress();
    switch(state.step){
      case 1:return stepEgg();case 2:return stepIngredients();case 3:return stepSift();case 4:return stepMix();
      case 5:return stepWhite();case 6:return stepMeringue();case 7:return stepPeak();case 8:return stepFirstFold();
      case 9:return stepFinalFold();case 10:return stepPanPrep();case 11:return stepFirstBake();case 12:return stepFinishBake();
    }
  }

  function stepEgg(){
    const root=stage(`<div class="kitchen-scene egg-scene"><div class="season-window autumn"><i></i></div><button class="egg-object" type="button" aria-label="달걀 깨기"><span></span></button><div class="mini-bowls"><div class="cook-bowl white-bowl"><small>흰자</small></div><div id="yolkBowl" class="cook-bowl yolk-bowl"><small>노른자</small></div></div><div id="yolkPiece" class="yolk-piece" hidden></div><div class="gesture-cue tap-cue">TAP</div></div>`);
    const egg=root.querySelector(".egg-object"),yolk=root.querySelector("#yolkPiece"),target=root.querySelector("#yolkBowl");
    on(egg,"click",()=>{
      egg.classList.add("cracked");yolk.hidden=false;flash("톡!");
      setTimeout(()=>egg.disabled=true,120);
      makeDrag(yolk,target,()=>{yolk.classList.add("dropped");completeStep(100,"PERFECT")});
    });
  }

  function stepIngredients(){
    const items=["설탕","우유","바닐라","소금"];
    const root=stage(`<div class="kitchen-scene"><div id="ingredientBowl" class="mix-bowl batter"><i></i></div><div class="ingredient-dock">${items.map((x,i)=>`<button class="ingredient-token" data-i="${i}" type="button"><b>${["S","M","V","·"][i]}</b><span>${x}</span></button>`).join("")}</div><div class="gesture-cue">DRAG</div></div>`);
    let expected=0;const bowl=root.querySelector("#ingredientBowl");
    root.querySelectorAll(".ingredient-token").forEach(token=>makeDrag(token,bowl,()=>{
      const i=Number(token.dataset.i);
      if(i!==expected){flash("순서대로!",false);token.style.position="";token.style.left="";token.style.top="";return;}
      token.classList.add("used");token.disabled=true;expected++;bowl.dataset.fill=String(expected);beep();
      if(expected===items.length)completeStep(100,"PERFECT");
    }));
  }

  function stepSift(){
    const root=stage(`<div class="kitchen-scene"><div class="mix-bowl batter flour"><i></i></div><div id="sifter" class="sifter"><span>박력분</span></div><div class="powder-cloud"></div><div class="gesture-cue swipe-cue">↔ SWIPE</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    horizontalSwipes(root.querySelector("#sifter"),8,p=>$("stepMeter").style.width=`${Math.min(100,p*100)}%`,()=>completeStep(100,"PERFECT"));
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
    state.sugarRound=0;
    const root=stage(`<div class="kitchen-scene"><div id="meringueBowl" class="mix-bowl whites meringue"><i class="whisk-tool"></i><span class="foam"></span></div><button id="sugarDose" class="sugar-dose" type="button"><b>설탕</b><span>1 / 3</span></button><div class="gesture-cue">DRAG + WHISK</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    const bowl=root.querySelector("#meringueBowl"),sugar=root.querySelector("#sugarDose"),meter=$("stepMeter");
    const setupDose=()=>{
      sugar.style.position="";sugar.style.left="";sugar.style.top="";sugar.disabled=false;sugar.classList.remove("used");
      sugar.querySelector("span").textContent=`${state.sugarRound+1} / 3`;
      makeDrag(sugar,bowl,()=>{
        sugar.classList.add("used");sugar.disabled=true;flash("휘핑!");
        let local=0;
        continuousGesture(bowl,{need:380,onProgress:p=>{local=p;meter.style.width=`${((state.sugarRound+p)/3)*100}%`;root.querySelector(".foam").style.transform=`scale(${.62+(state.sugarRound+p)*.12})`},onDone:()=>{
          state.sugarRound++;
          if(state.sugarRound>=3)completeStep(130,"PERFECT");else setupDose();
        }});
      });
    };
    setupDose();
  }

  function stepPeak(){
    const root=stage(`<div class="kitchen-scene"><div class="mix-bowl whites peak"><span class="foam peak-foam"></span></div><div id="liftWhisk" class="lift-whisk"><i></i></div><div class="gesture-cue up-cue">↑ SWIPE</div></div>`);
    const el=root.querySelector("#liftWhisk");let sy=0;
    on(el,"pointerdown",e=>{sy=e.clientY;el.setPointerCapture?.(e.pointerId);e.preventDefault()});
    on(el,"pointerup",e=>{const dy=sy-e.clientY;if(dy>70){el.classList.add("lifted");root.querySelector(".peak-foam").classList.add("show-peak");completeStep(100,"PERFECT",700)}else flash("위로 길게!",false)});
  }

  function stepFirstFold(){
    const root=stage(`<div class="kitchen-scene"><div id="foldBowl" class="mix-bowl batter fold"><span class="fold-batter"></span></div><button id="meringueThird" class="meringue-third" type="button">⅓</button><div class="gesture-cue">DRAG → SLOW</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    const bowl=root.querySelector("#foldBowl"),piece=root.querySelector("#meringueThird");
    makeDrag(piece,bowl,()=>{
      piece.classList.add("used");flash("살살 섞어요");
      continuousGesture(bowl,{need:480,maxSpeed:1.8,onProgress:(p,fast)=>{$("stepMeter").style.width=`${p*100}%`;bowl.classList.toggle("too-fast",fast>2)},onDone:(fast)=>completeStep(fast<=2?120:75,fast<=2?"PERFECT":"GOOD")});
    });
  }

  function stepFinalFold(){
    const root=stage(`<div class="kitchen-scene"><div id="finalFold" class="mix-bowl batter fold final-fold"><span class="fold-batter"></span><i class="spatula-tool"></i></div><div class="gesture-cue">↓ ↗ SLOW</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    const bowl=root.querySelector("#finalFold");
    continuousGesture(bowl,{need:680,maxSpeed:1.55,onProgress:(p,fast)=>{$("stepMeter").style.width=`${p*100}%`;bowl.classList.toggle("too-fast",fast>3)},onDone:(fast)=>completeStep(fast<=3?140:80,fast<=3?"PERFECT":"GOOD")});
  }

  function stepPanPrep(){
    const root=stage(`<div class="kitchen-scene pan-scene"><div id="pan" class="cook-pan"><span class="pan-ring"></span></div><div id="oilBrush" class="oil-brush">기름</div><button id="batterCup" class="batter-cup" type="button">반죽</button><div id="panCue" class="gesture-cue">↔ OIL</div><div class="action-meter"><i id="stepMeter"></i></div></div>`);
    const oil=root.querySelector("#oilBrush"),pan=root.querySelector("#pan"),batter=root.querySelector("#batterCup");
    batter.disabled=true;
    horizontalSwipes(oil,7,p=>$("stepMeter").style.width=`${p*50}%`,()=>{
      oil.classList.add("done");batter.disabled=false;$("panCue").textContent="DRAG BATTER";flash("팬 준비 완료");
      makeDrag(batter,pan,()=>{batter.classList.add("used");pan.classList.add("with-batter");$("stepMeter").style.width="100%";completeStep(110,"PERFECT")});
    });
  }

  function stepFirstBake(){
    const root=stage(`<div class="kitchen-scene pan-scene bake"><div id="bakePan" class="cook-pan with-batter"><span class="pan-ring"></span><i class="steam"></i></div><button id="waterSpoon" class="water-spoon" type="button">물 1T</button><button id="lidButton" class="pan-lid" type="button" disabled>뚜껑</button><div id="bakeCount" class="bake-count">20</div><div id="bakeCue" class="gesture-cue">DRAG WATER</div></div>`);
    const pan=root.querySelector("#bakePan"),water=root.querySelector("#waterSpoon"),lid=root.querySelector("#lidButton"),count=root.querySelector("#bakeCount");
    makeDrag(water,pan,()=>{water.classList.add("used");lid.disabled=false;$("bakeCue").textContent="TAP LID";flash("물 1큰술")});
    on(lid,"click",()=>{
      lid.classList.add("closed");lid.disabled=true;$("bakeCue").textContent="WAIT";let left=20;count.classList.add("show");
      const t=setInterval(()=>{left--;count.textContent=String(left);pan.style.setProperty("--rise",String((20-left)/20));if(left<=0){clearInterval(t);completeStep(120,"PERFECT")}},1000);
      state.cleanup.push(()=>clearInterval(t));
    });
  }

  function stepFinishBake(){
    const root=stage(`<div class="kitchen-scene pan-scene finish"><div id="finishPan" class="cook-pan with-batter baked"><span class="pan-ring"></span><i class="souffle-disc"></i></div><div id="flipCue" class="gesture-cue up-cue">↑ FLIP</div><button id="finishWater" class="water-spoon" type="button" disabled>물 1T</button><button id="finishLid" class="pan-lid" type="button" disabled>뚜껑</button><div id="finishTiming" class="finish-timing" hidden><span class="good-zone"></span><i></i></div><button id="finishTap" class="timing-tap" type="button" hidden>지금!</button></div>`);
    const pan=root.querySelector("#finishPan"),water=root.querySelector("#finishWater"),lid=root.querySelector("#finishLid"),track=root.querySelector("#finishTiming"),needle=track.querySelector("i"),tap=root.querySelector("#finishTap");
    let sy=0,flipped=false;
    on(pan,"pointerdown",e=>{if(flipped)return;sy=e.clientY;pan.setPointerCapture?.(e.pointerId);e.preventDefault()});
    on(pan,"pointerup",e=>{
      if(flipped)return;const dy=sy-e.clientY;if(dy<65){flash("위로 스와이프!",false);return;}
      flipped=true;pan.classList.add("flipped");water.disabled=false;$("flipCue").textContent="DRAG WATER";flash("뒤집기 성공!");
      makeDrag(water,pan,()=>{water.classList.add("used");lid.disabled=false;$("flipCue").textContent="TAP LID"});
    });
    on(lid,"click",()=>{
      lid.classList.add("closed");lid.disabled=true;track.hidden=false;tap.hidden=false;$("flipCue").textContent="GREEN = TAP";
      const started=performance.now();let pos=0,raf=0;const loop=now=>{const phase=((now-started)%2200)/2200;pos=phase<.5?phase*200:(1-phase)*200;needle.style.left=`${pos}%`;raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);state.cleanup.push(()=>cancelAnimationFrame(raf));
      on(tap,"click",()=>{cancelAnimationFrame(raf);state.finalTimingScore=Math.max(0,Math.round(100-Math.abs(pos-50)*2));const q=state.finalTimingScore>=82?"PERFECT":state.finalTimingScore>=55?"GOOD":"OK";completeStep(120+state.finalTimingScore,q,600)});
    });
  }

  function finishRun(){
    stopTimer();cleanupStep();setPanel("result");
    const overtimePenalty=Math.round(state.overtime*2);
    const finalScore=Math.max(0,state.score-overtimePenalty);
    $("souffleResultMenu").textContent=state.selected.name;
    $("souffleFinalScore").textContent=finalScore.toLocaleString("ko-KR");
    $("souffleResultTime").textContent=formatTime(state.elapsed);
    $("souffleResultRemain").textContent=state.overtime>0?`+${formatTime(state.overtime)}`:formatTime(state.targetSeconds-state.elapsed);
    $("souffleResultGrade").textContent=finalScore>=1250?"MASTER":finalScore>=1050?"FLUFFY":"NICE";
    $("souffleResultList").innerHTML=state.stepResults.map(r=>`<span class="${r.quality.toLowerCase()}"><b>${String(r.step).padStart(2,"0")}</b>${r.quality}</span>`).join("");
    mountArt($("souffleResultArt"),state.selected.level,230);
    beep("finish");
    ANALYTICS?.track?.("souffle_game_finish",{menu:state.selected.id,score:finalScore,elapsed:Math.round(state.elapsed),overtime:Math.round(state.overtime),timing:state.finalTimingScore});
  }

  $("openSouffleButton")?.addEventListener("click",openGame);
  $("souffleContinueButton")?.addEventListener("click",()=>{if(state.selected)setPanel("tutorial")});
  $("souffleTutorialStart")?.addEventListener("click",resetRun);
  $("souffleRetryButton")?.addEventListener("click",resetRun);
  $("souffleReselectButton")?.addEventListener("click",()=>{stopTimer();cleanupStep();setPanel("select");renderMenuSelect()});
  $("souffleSoundButton")?.addEventListener("click",()=>{state.sound=!state.sound;$("souffleSoundButton").textContent=state.sound?"♪":"×";$("souffleSoundButton").setAttribute("aria-label",state.sound?"사운드 끄기":"사운드 켜기")});
})();
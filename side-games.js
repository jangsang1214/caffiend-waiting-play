(() => {
  function loadStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=href;
    document.head.appendChild(link);
  }
  loadStyle("./souffle.css?v=2.0.0");
  loadStyle("./souffle-v2.css?v=2.0.0");

  const $ = id => document.getElementById(id);
  const EXP = window.DigulExperience;
  const ART = window.DigulDessertArt;
  const ANALYTICS = window.DigulAnalytics;

  const screens = {
    home:$("entryScreen"),
    digul:$("gameScreen"),
    souffle:$("souffleScreen"),
    mystery:$("mysteryScreen")
  };

  function showOnly(name){
    Object.values(screens).forEach(s => s?.classList.remove("active"));
    screens[name]?.classList.add("active");
    window.scrollTo({top:0,behavior:"instant"});
  }

  function ensureNickname(){
    const input=$("nicknameInput");
    const error=$("nicknameError");
    const saved=EXP.getNickname();
    if(saved) return saved;
    const checked=EXP.setNickname(input?.value || "");
    if(!checked.ok){
      if(error) error.textContent=checked.reason;
      input?.focus();
      return null;
    }
    if(error) error.textContent="";
    $("nicknameDisplay").textContent=checked.value;
    return checked.value;
  }

  function mountArt(target, level, size=100){
    if(!target || !ART) return;
    target.innerHTML="";
    const canvas=ART.render(level,size);
    canvas.className="dessert-canvas";
    target.appendChild(canvas);
  }

  function decorateHome(){mountArt($("homeDigulArt"),0,92)}

  window.CaffiendScreens={showOnly,ensureNickname,mountArt};

  document.querySelectorAll("[data-home-from]").forEach(btn=>{
    btn.addEventListener("click",()=>showOnly("home"));
  });

  const guests=[
    {name:"민트손님",mark:"M",seat:"창가",drink:"라떼",dessert:"복숭아 수플레",tone:"#79a889"},
    {name:"달콤손님",mark:"D",seat:"바",drink:"아메리카노",dessert:"로투스 수플레",tone:"#e69a55"},
    {name:"밤산책",mark:"B",seat:"창가",drink:"티",dessert:"밤 수플레",tone:"#9d7258"},
    {name:"구름손님",mark:"G",seat:"안쪽",drink:"라떼",dessert:"크림브륄레 수플레",tone:"#87a6c8"},
    {name:"코코손님",mark:"C",seat:"바",drink:"티",dessert:"두바이 초코 수플레",tone:"#8f6550"},
    {name:"봄손님",mark:"S",seat:"안쪽",drink:"아메리카노",dessert:"꿀자몽빙수",tone:"#d77f7f"}
  ];
  let mystery={suspects:[],answer:null,clues:[],clueIndex:0,time:30,timer:null,locked:false};
  const shuffled=arr=>[...arr].sort(()=>Math.random()-.5);

  function renderSuspects(){
    const grid=$("suspectGrid");grid.innerHTML="";
    mystery.suspects.forEach(g=>{
      const btn=document.createElement("button");
      btn.type="button";btn.className="suspect-card";
      btn.innerHTML=`<span class="suspect-avatar" style="--tone:${g.tone}">${g.mark}</span><strong>${g.name}</strong><small>${g.drink}</small>`;
      btn.addEventListener("click",()=>guessMystery(g));
      grid.appendChild(btn);
    });
  }

  function showClue(){
    const clue=mystery.clues[mystery.clueIndex];
    $("clueIndex").textContent=String(mystery.clueIndex+1);
    $("clueText").textContent=clue;
    $("nextClueButton").hidden=mystery.clueIndex>=2;
  }

  function resetMystery(){
    clearInterval(mystery.timer);
    mystery.suspects=shuffled(guests).slice(0,3);
    mystery.answer=mystery.suspects[Math.floor(Math.random()*3)];
    mystery.clues=[`예약자는 ${mystery.answer.seat} 자리를 골랐어요.`,`${mystery.answer.drink}를 함께 주문했어요.`,`${mystery.answer.dessert}를 기다리고 있어요.`];
    mystery.clueIndex=0;mystery.time=30;mystery.locked=false;
    $("mysteryTimer").textContent="30";$("mysteryResult").hidden=true;$("mysteryPlay").hidden=false;
    renderSuspects();showClue();
    mystery.timer=setInterval(()=>{mystery.time=Math.max(0,mystery.time-1);$("mysteryTimer").textContent=String(mystery.time);if(mystery.time<=0){clearInterval(mystery.timer);finishMystery(false,null)}},1000);
  }

  function finishMystery(correct,selected){
    if(mystery.locked)return;
    mystery.locked=true;clearInterval(mystery.timer);$("mysteryPlay").hidden=true;$("mysteryResult").hidden=false;
    $("mysteryResultTitle").textContent=correct?"정답!":"아쉽다!";
    $("mysteryResultCopy").textContent=correct?`${mystery.answer.name}이 비밀예약자였어요. · ${mystery.time}초 남음`:`비밀예약자는 ${mystery.answer.name}이었어요.`;
    ANALYTICS?.track?.("mystery_finish",{correct,time:mystery.time,selected:selected?.name||""});
  }
  function guessMystery(guest){finishMystery(guest===mystery.answer,guest)}

  $("openMysteryButton")?.addEventListener("click",()=>{if(!ensureNickname())return;showOnly("mystery");resetMystery();ANALYTICS?.track?.("mystery_open")});
  $("nextClueButton")?.addEventListener("click",()=>{if(mystery.clueIndex<2){mystery.clueIndex++;showClue()}});
  $("retryMysteryButton")?.addEventListener("click",resetMystery);

  decorateHome();
})();
(() => {
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const seeded=(seed)=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);

  function setupCanvas(size=256){
    const canvas=document.createElement("canvas");
    const ratio=Math.min(window.devicePixelRatio||2,3);
    canvas.width=Math.round(size*ratio);
    canvas.height=Math.round(size*ratio);
    canvas.style.width=size+"px";
    canvas.style.height=size+"px";
    const ctx=canvas.getContext("2d");
    ctx.scale(ratio,ratio);
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";
    return {canvas,ctx,size};
  }

  function ellipse(ctx,x,y,rx,ry,fill,stroke=null,line=1){
    ctx.save();ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}
    ctx.restore();
  }

  function rounded(ctx,x,y,w,h,r,fill,stroke=null,line=1){
    ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}
    ctx.restore();
  }

  function radial(ctx,x,y,r,inner,outer,ix=.34,iy=.28){
    const g=ctx.createRadialGradient(x-r*.25,y-r*.22,r*.06,x,y,r);
    g.addColorStop(0,inner);g.addColorStop(1,outer);return g;
  }

  function linear(ctx,x0,y0,x1,y1,a,b,c=null){
    const g=ctx.createLinearGradient(x0,y0,x1,y1);
    g.addColorStop(0,a); if(c){g.addColorStop(.55,b);g.addColorStop(1,c)}else g.addColorStop(1,b);
    return g;
  }

  function softShadow(ctx,x,y,rx,ry,alpha=.2){
    ctx.save();ctx.filter="blur(8px)";ctx.globalAlpha=alpha;ctx.fillStyle="#4a2616";
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();ctx.restore();
  }

  function plate(ctx){
    softShadow(ctx,128,211,82,13,.18);
    ellipse(ctx,128,198,84,18,linear(ctx,44,184,212,209,"#d7c6b4","#fffdf8","#c6ad97"),"#9e7659",1.2);
    ellipse(ctx,128,195,71,12,linear(ctx,55,183,201,202,"#fffefb","#ead8c5"),"rgba(133,92,63,.45)",.8);
    ctx.save();ctx.globalAlpha=.28;ellipse(ctx,116,190,45,4,"#fff");ctx.restore();
  }

  function pancake(ctx,y,w=134,h=30){
    const side=linear(ctx,0,y-h/2,0,y+h/2,"#ffd99d","#efad5e","#c87934");
    ellipse(ctx,128,y,w/2,h/2,side,"rgba(100,47,20,.45)",1.1);
    ellipse(ctx,128,y-h*.18,w*.46,h*.30,linear(ctx,75,y-15,180,y,"#fff0c7","#e9aa5e"),"rgba(130,72,35,.28)",.7);
    ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle="#f9d08f";ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(119,y-3,w*.34,h*.17,0,0,TAU);ctx.stroke();ctx.restore();
  }

  function stack(ctx,layers=3,offset=27){
    plate(ctx);
    for(let i=0;i<layers;i++) pancake(ctx,176-i*offset,138-i*2,31);
  }

  function creamBlob(ctx,x,y,w,h,shade="#fff8ed"){
    const g=radial(ctx,x,y,Math.max(w,h)*.52,"#fffef9",shade);
    ellipse(ctx,x,y,w/2,h/2,g,"rgba(116,79,55,.25)",.7);
    ctx.save();ctx.globalAlpha=.55;ellipse(ctx,x-w*.12,y-h*.16,w*.19,h*.09,"#fff");ctx.restore();
  }

  function whippedCream(ctx,baseY=100,tint="#fff8ef"){
    const blobs=[
      [92,baseY+18,64,32],[128,baseY+17,72,35],[164,baseY+18,62,31],
      [108,baseY-1,62,32],[145,baseY-2,65,33],[126,baseY-20,57,30],
      [128,baseY-38,35,27]
    ];
    blobs.forEach(v=>creamBlob(ctx,...v,tint));
  }

  function sauceDrip(ctx,color="#b96c35",dark="#7b3f24"){
    ctx.save();
    const g=linear(ctx,0,88,0,160,"#d99458",color,dark);
    ctx.fillStyle=g;ctx.strokeStyle="rgba(92,43,23,.42)";ctx.lineWidth=.8;
    ctx.beginPath();
    ctx.moveTo(64,100);ctx.bezierCurveTo(76,91,92,93,103,100);
    ctx.bezierCurveTo(112,108,111,134,121,139);
    ctx.bezierCurveTo(132,144,135,108,146,103);
    ctx.bezierCurveTo(158,96,178,99,191,108);
    ctx.lineTo(186,127);
    ctx.bezierCurveTo(173,122,168,128,166,144);
    ctx.bezierCurveTo(164,155,154,157,150,145);
    ctx.bezierCurveTo(145,129,138,130,132,145);
    ctx.bezierCurveTo(127,160,115,160,110,146);
    ctx.bezierCurveTo(104,127,96,125,88,140);
    ctx.bezierCurveTo(82,151,69,149,66,136);
    ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }

  function leaf(ctx,x,y,s=1,angle=-.45){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    const g=linear(ctx,-9,0,9,0,"#8bc766","#2f7f3d");
    ellipse(ctx,0,0,10*s,5.5*s,g,"#245c32",.7);
    ctx.restore();
  }

  function flower(ctx,x,y,s=1){
    ctx.save();ctx.translate(x,y);
    for(let i=0;i<5;i++){const a=i*TAU/5;ellipse(ctx,Math.cos(a)*7*s,Math.sin(a)*7*s,5*s,3.5*s,"#ffd44f","#d88a2c",.6)}
    ellipse(ctx,0,0,4*s,4*s,"#fff0a6","#b96e1d",.5);ctx.restore();
  }

  function cookie(ctx,x,y,w=56,h=35,angle=-.08){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    rounded(ctx,-w/2,-h/2,w,h,8,linear(ctx,0,-h/2,0,h/2,"#d88d4b","#a9572d"),"#773419",1);
    ctx.strokeStyle="rgba(255,210,140,.65)";ctx.lineWidth=1.3;ctx.strokeRect(-w*.31,-h*.18,w*.62,h*.36);
    for(let i=-2;i<=2;i++) ellipse(ctx,i*9,0,1.8,1.8,"#f2ba72");
    ctx.restore();
  }

  function crumb(ctx,x,y,n=30,color="#a85a31",seed=2,spread=48){
    const rnd=seeded(seed);
    ctx.save();
    for(let i=0;i<n;i++){
      const px=x+(rnd()-.5)*spread,py=y+(rnd()-.5)*spread*.5;
      const r=1+rnd()*2.1;
      ellipse(ctx,px,py,r,r*.65,color,null,0);
      if(i%5===0){ctx.globalAlpha=.5;ellipse(ctx,px-r*.3,py-r*.3,r*.35,r*.25,"#f3bd72");ctx.globalAlpha=1}
    }
    ctx.restore();
  }

  function chestnut(ctx,x,y,s=1){
    const g=radial(ctx,x,y,17*s,"#d48642","#71331f");
    ellipse(ctx,x,y,16*s,14*s,g,"#5a2719",1);
    ctx.save();ctx.globalAlpha=.6;ellipse(ctx,x-5*s,y-4*s,4*s,2*s,"#ffd198");ctx.restore();
    ctx.strokeStyle="#e4a566";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-8*s,y+4*s);ctx.quadraticCurveTo(x,y+10*s,x+8*s,y+3*s);ctx.stroke();
  }

  function peachSlice(ctx,x,y,s=1,angle=0){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    const g=linear(ctx,-13,-18,15,18,"#fff1d1","#ffb2a0","#ef7e77");
    ctx.beginPath();ctx.moveTo(-11*s,14*s);ctx.quadraticCurveTo(-4*s,-18*s,13*s,-12*s);ctx.quadraticCurveTo(18*s,2*s,8*s,18*s);ctx.closePath();
    ctx.fillStyle=g;ctx.fill();ctx.strokeStyle="#be5d55";ctx.lineWidth=.8;ctx.stroke();
    ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle="#fff6dc";ctx.beginPath();ctx.moveTo(-3*s,11*s);ctx.lineTo(8*s,-10*s);ctx.stroke();ctx.restore();ctx.restore();
  }

  function grapefruit(ctx,x,y,r=18){
    ellipse(ctx,x,y,r,r,radial(ctx,x,y,r,"#ff9c92","#ef4f55"),"#a93c40",1);
    ctx.strokeStyle="rgba(255,235,220,.8)";ctx.lineWidth=1;
    for(let i=0;i<8;i++){const a=i*TAU/8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r*.82,y+Math.sin(a)*r*.82);ctx.stroke()}
    ellipse(ctx,x,y,2.4,2.4,"#fff0dc");
  }

  function mochi(ctx,x,y,s=1){
    ellipse(ctx,x,y,12*s,10*s,radial(ctx,x,y,12*s,"#fff5d8","#e8c98e"),"rgba(105,67,38,.35)",.7);
  }

  function blackSesameBall(ctx,x,y,s=1){
    ellipse(ctx,x,y,18*s,17*s,radial(ctx,x,y,18*s,"#5b5350","#1f1d1d"),"#171515",1);
    const rnd=seeded(19);for(let i=0;i<26;i++){const a=rnd()*TAU,rr=Math.sqrt(rnd())*14*s;ellipse(ctx,x+Math.cos(a)*rr,y+Math.sin(a)*rr,1.2*s,.7*s,i%3?"#ded6c9":"#b9a883")}
  }

  function pistachioNest(ctx,x,y){
    ellipse(ctx,x,y,38,25,radial(ctx,x,y,38,"#e9b947","#9b6f19"),"#704419",1);
    const rnd=seeded(77);ctx.strokeStyle="#6b7c27";ctx.lineWidth=1.2;
    for(let i=0;i<34;i++){const px=x+(rnd()-.5)*56,py=y+(rnd()-.5)*25;ctx.beginPath();ctx.moveTo(px-5,py-2);ctx.lineTo(px+5,py+2);ctx.stroke()}
  }

  function caramelDisc(ctx,x,y,w=91,h=32){
    ellipse(ctx,x,y,w/2,h/2,linear(ctx,x-w/2,y-8,x+w/2,y+8,"#f3bd69","#a95c2c","#7a3b21"),"#733419",1);
    ctx.save();ctx.globalAlpha=.35;ctx.strokeStyle="#fff0ad";ctx.lineWidth=1;
    for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(x-w*.34,y+i*4);ctx.lineTo(x+w*.34,y-i*2);ctx.stroke()}ctx.restore();
  }

  function souffleBase(ctx,opts={}){
    stack(ctx,3,26);
    if(opts.sauce) sauceDrip(ctx,opts.sauce,opts.sauceDark||"#6d341d");
    whippedCream(ctx,103,opts.cream||"#fff7ec");
  }

  function bowl(ctx,fillA="#fff8ea",fillB="#edcfaa"){
    softShadow(ctx,128,208,70,12,.17);
    ctx.save();
    const g=linear(ctx,0,103,0,210,fillA,fillB,"#d2ad86");
    ctx.beginPath();ctx.moveTo(60,105);ctx.bezierCurveTo(63,162,78,204,101,209);ctx.lineTo(155,209);ctx.bezierCurveTo(179,204,193,161,196,105);ctx.closePath();
    ctx.fillStyle=g;ctx.fill();ctx.strokeStyle="rgba(103,60,36,.46)";ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
    ellipse(ctx,128,104,68,34,"#fffdf7","rgba(103,60,36,.42)",1.2);
  }

  function bingsuBase(ctx,iceA,iceB){
    bowl(ctx);
    const g=radial(ctx,128,106,66,iceA,iceB);
    ellipse(ctx,128,105,63,34,g,"rgba(99,58,36,.38)",.9);
  }

  function drawLotus(ctx){
    souffleBase(ctx,{sauce:"#b96935"});
    cookie(ctx,139,59,59,36,-.18);
    crumb(ctx,126,90,40,"#a85b31",4,105);
  }

  function drawGrapefruit(ctx){
    bingsuBase(ctx,"#ffb7ad","#ef7d80");
    grapefruit(ctx,95,94,21);grapefruit(ctx,132,78,22);grapefruit(ctx,163,101,21);grapefruit(ctx,125,111,18);
    leaf(ctx,156,64,.8);flower(ctx,166,78,.7);
  }

  function drawChestnut(ctx){
    souffleBase(ctx);
    chestnut(ctx,102,88,.95);chestnut(ctx,132,79,1);chestnut(ctx,157,95,.92);leaf(ctx,176,91,.78,-.1);
    creamBlob(ctx,171,112,38,25,"#f7ead4");
  }

  function drawBlackSesameSouffle(ctx){
    stack(ctx,3,26);whippedCream(ctx,104,"#d8d2cf");
    blackSesameBall(ctx,129,78,.82);crumb(ctx,124,106,34,"#302b29",31,92);flower(ctx,163,104,.55);
  }

  function drawPeach(ctx){
    souffleBase(ctx);
    [-2,-1,0,1,2].forEach((n,i)=>peachSlice(ctx,128+n*14,88+Math.abs(n)*3,.85,n*.1));
    leaf(ctx,166,71,.7,.1);leaf(ctx,174,78,.55,.6);
  }

  function drawRedBean(ctx){
    bingsuBase(ctx,"#9c5040","#713025");
    ellipse(ctx,128,101,49,27,radial(ctx,128,101,49,"#9f5445","#6d2f26"),"rgba(75,38,28,.5)",.8);
    const rnd=seeded(15);for(let i=0;i<21;i++){const x=91+rnd()*74,y=82+rnd()*35;ellipse(ctx,x,y,2.5,1.9,i%3?"#a95a48":"#78352e")}
    [[87,127],[105,139],[151,139],[169,126]].forEach(([x,y])=>mochi(ctx,x,y,.65));
  }

  function drawDubai(ctx){
    stack(ctx,3,26);sauceDrip(ctx,"#6d3827","#3f2219");whippedCream(ctx,107);
    pistachioNest(ctx,128,89);crumb(ctx,128,113,16,"#766a26",40,86);
  }

  function drawMango(ctx){
    bingsuBase(ctx,"#fff1aa","#f1ca55");
    const spots=[[95,88],[121,76],[151,88],[166,112],[123,113],[92,116]];
    spots.forEach(([x,y])=>rounded(ctx,x-10,y-9,20,18,5,linear(ctx,x-10,y-9,x+10,y+9,"#ffe36a","#e9a82f"),"#b77b23",.7));
    [[84,128],[174,105],[136,64]].forEach(([x,y])=>{ellipse(ctx,x,y,12,9,"#fffdf4","rgba(95,57,34,.3)",.7);for(let i=0;i<6;i++)ellipse(ctx,x-7+i*2.8,y+(i%2?2:-2),1,1,"#222")});
  }

  function drawInjeolmi(ctx){
    stack(ctx,3,26);whippedCream(ctx,105,"#f2dfb4");
    ctx.save();ctx.globalAlpha=.42;ellipse(ctx,128,105,58,25,"#c99d5b");ctx.restore();
    mochi(ctx,102,91,.9);mochi(ctx,128,82,.94);mochi(ctx,154,94,.9);
    crumb(ctx,128,111,38,"#b88749",81,103);
  }

  function drawBlackSesameBingsu(ctx){
    bingsuBase(ctx,"#c6bfbc","#88817f");
    blackSesameBall(ctx,128,82,.78);
    const rnd=seeded(51);for(let i=0;i<42;i++){const x=82+rnd()*92,y=82+rnd()*53;ellipse(ctx,x,y,1.1,.8,i%4?"#2e2a29":"#e5ddcf")}
    rounded(ctx,119,69,19,41,6,linear(ctx,0,69,0,110,"#6f6864","#332f2e"),"#262322",.8);
  }

  function drawBrulee(ctx){
    stack(ctx,3,26);whippedCream(ctx,107);
    caramelDisc(ctx,128,87,97,35);creamBlob(ctx,128,63,30,22,"#fff8ec");
    ctx.save();ctx.globalAlpha=.38;ellipse(ctx,113,81,23,4,"#fff1b4");ctx.restore();
  }

  const painters=[
    drawLotus,drawGrapefruit,drawChestnut,drawBlackSesameSouffle,drawPeach,
    drawRedBean,drawDubai,drawMango,drawInjeolmi,drawBlackSesameBingsu,drawBrulee
  ];

  function render(level,size=256){
    const {canvas,ctx}=setupCanvas(size);
    const scale=size/256;ctx.save();ctx.scale(scale,scale);
    painters[clamp(level|0,0,painters.length-1)](ctx);
    ctx.restore();return canvas;
  }

  function drawTo(ctx,level,x,y,size,rotation=0,alpha=1){
    const art=render(level,320);
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(rotation);
    ctx.drawImage(art,-size/2,-size/2,size,size);ctx.restore();
  }

  window.DigulDessertArt={render,drawTo};
})();
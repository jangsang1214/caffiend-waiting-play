(() => {
  const outline = "#6b321b";
  const cream = "#fff8ed";
  const pancake = "#eeb067";
  const pancakeTop = "#f8cf91";

  function setupCanvas(size = 256) {
    const canvas = document.createElement("canvas");
    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    return { canvas, ctx, size };
  }

  function ellipse(ctx,x,y,w,h,fill,stroke=outline,line=2) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2);
    ctx.fillStyle=fill; ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
    ctx.restore();
  }

  function roundRect(ctx,x,y,w,h,r,fill,stroke=outline,line=2){
    ctx.save();
    ctx.beginPath();
    const rr=Math.min(r,w/2,h/2);
    ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
    ctx.restore();
  }

  function shadow(ctx,cx,cy,rx,ry,alpha=.16){
    ctx.save();ctx.filter="blur(8px)";ctx.globalAlpha=alpha;ctx.fillStyle="#5e311c";
    ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  function plate(ctx){
    shadow(ctx,128,211,82,14,.18);
    ellipse(ctx,128,202,178,36,"#ead9c8",outline,2);
    ellipse(ctx,128,198,156,27,"#fffaf1","#b99578",1.5);
  }

  function stack(ctx,layers=3){
    for(let i=0;i<layers;i++){
      const y=178-i*28;
      ellipse(ctx,128,y,140,37,pancake,outline,2);
      ellipse(ctx,128,y-5,126,22,pancakeTop,"#d98942",1);
    }
    ellipse(ctx,128,178-layers*28-2,136,38,"#ffe2ab",outline,2);
  }

  function creamTop(ctx, tint="#fffaf4"){
    const ys=[125,111,98,87], ws=[116,98,74,48], hs=[37,34,30,24];
    for(let i=0;i<ys.length;i++) ellipse(ctx,128,ys[i],ws[i],hs[i],tint,outline,1.6);
    ellipse(ctx,128,76,18,28,tint,outline,1.4);
  }

  function leaf(ctx,x,y,scale=1){
    ctx.save();ctx.translate(x,y);ctx.rotate(-.55);
    ctx.fillStyle="#4f9a4a";ctx.strokeStyle=outline;ctx.lineWidth=1.3;
    ctx.beginPath();ctx.ellipse(0,0,9*scale,5*scale,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.restore();
  }

  function sparkle(ctx,x,y,r=3){
    ctx.save();ctx.translate(x,y);ctx.fillStyle="#ffd24c";
    ctx.beginPath();ctx.moveTo(0,-r*2);ctx.lineTo(r, -r*.5);ctx.lineTo(r*2,0);ctx.lineTo(r,.5*r);ctx.lineTo(0,r*2);ctx.lineTo(-r,.5*r);ctx.lineTo(-r*2,0);ctx.lineTo(-r,-r*.5);ctx.closePath();ctx.fill();ctx.restore();
  }

  function souffleBase(ctx){
    plate(ctx); stack(ctx,3); creamTop(ctx);
  }

  function grapefruitBingsu(ctx){
    shadow(ctx,128,207,78,14,.16);
    ellipse(ctx,128,117,140,73,"#fffaf1",outline,2);
    ellipse(ctx,128,104,126,72,"#f4949b",outline,1.5);
    ctx.save();ctx.fillStyle="#f9efe3";ctx.strokeStyle=outline;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(62,112);ctx.quadraticCurveTo(71,199,91,205);ctx.lineTo(165,205);ctx.quadraticCurveTo(185,199,194,112);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    [[92,91],[128,79],[163,99],[119,113]].forEach(([x,y])=>{
      ellipse(ctx,x,y,38,31,"#f75f63",outline,1.7);
      for(let a=0;a<8;a++){const ang=a*Math.PI/4;ctx.strokeStyle="#ffd6c5";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(ang)*16,y+Math.sin(ang)*12);ctx.stroke();}
    });
    leaf(ctx,148,62,.9);
  }

  function redBeanBingsu(ctx){
    shadow(ctx,128,207,78,14,.16);
    ellipse(ctx,128,111,136,72,"#f3ddba",outline,2);
    ctx.save();ctx.fillStyle="#fff9ed";ctx.strokeStyle=outline;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(64,112);ctx.quadraticCurveTo(73,199,92,205);ctx.lineTo(164,205);ctx.quadraticCurveTo(183,199,192,112);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    ellipse(ctx,128,104,99,56,"#7d362d",outline,1.8);
    [[89,128],[109,145],[151,143],[172,128]].forEach(([x,y])=>roundRect(ctx,x-9,y-7,18,15,3,"#eacb8a",outline,1));
  }

  function mangoBingsu(ctx){
    shadow(ctx,128,207,78,14,.16);
    ellipse(ctx,128,110,136,72,"#f9e8b5",outline,2);
    ctx.save();ctx.fillStyle="#fff9ed";ctx.strokeStyle=outline;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(64,112);ctx.quadraticCurveTo(73,199,92,205);ctx.lineTo(164,205);ctx.quadraticCurveTo(183,199,192,112);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    [[92,96],[116,80],[141,97],[163,80],[118,119],[153,121]].forEach(([x,y])=>roundRect(ctx,x-10,y-9,20,18,3,"#f5c33d",outline,1));
    [[82,121],[176,111],[132,64]].forEach(([x,y])=>{ellipse(ctx,x,y,22,16,"#fffdf4",outline,1);for(let k=0;k<5;k++)ellipse(ctx,x-6+k*3,y+(k%2?2:-2),2,2,"#24211f",null,0);});
  }

  function blackSesameBingsu(ctx){
    shadow(ctx,128,207,78,14,.16);
    ellipse(ctx,128,110,136,72,"#b7b0ae",outline,2);
    ctx.save();ctx.fillStyle="#f3eee7";ctx.strokeStyle=outline;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(64,112);ctx.quadraticCurveTo(73,199,92,205);ctx.lineTo(164,205);ctx.quadraticCurveTo(183,199,192,112);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    for(let i=0;i<36;i++){const x=76+(i*23)%105,y=75+((i*31)%61);ellipse(ctx,x,y,3,3,"#292524",null,0);}
    roundRect(ctx,112,79,32,44,7,"#524d4b",outline,1.5);ellipse(ctx,128,73,24,20,"#5d5755",outline,1.5);
  }

  function drawSouffleVariant(ctx,kind){
    souffleBase(ctx);
    if(kind==="lotus"){
      roundRect(ctx,104,53,62,40,8,"#bb6d38",outline,2);
      for(let x=114;x<160;x+=12)ellipse(ctx,x,74,4,4,"#edb06b",null,0);
      for(let i=0;i<18;i++)ellipse(ctx,81+(i*17)%94,103+((i*13)%30),5,4,"#a85a32",null,0);
    } else if(kind==="chestnut"){
      [[103,88],[132,81],[154,95]].forEach(([x,y])=>{ellipse(ctx,x,y,30,31,"#8f4b2f",outline,2);ctx.strokeStyle="#dda063";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-7,y-3);ctx.lineTo(x+8,y+2);ctx.stroke();});
      leaf(ctx,176,92,.9);
    } else if(kind==="black_sesame"){
      ellipse(ctx,128,111,108,48,"#bcb6b3",outline,1.8);
      for(let i=0;i<26;i++)ellipse(ctx,83+(i*19)%91,92+((i*17)%34),4,4,"#3e3836",null,0);
      sparkle(ctx,128,101,3);
    } else if(kind==="peach"){
      for(let i=0;i<5;i++){const x=90+i*18,y=91-Math.abs(2-i)*3;ctx.fillStyle="#ffaf96";ctx.strokeStyle=outline;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y+27);ctx.lineTo(x+12,y-5);ctx.lineTo(x+27,y+15);ctx.lineTo(x+15,y+31);ctx.closePath();ctx.fill();ctx.stroke();}
      leaf(ctx,160,79,.8);
    } else if(kind==="dubai"){
      ellipse(ctx,128,111,136,51,"#6f3828",outline,2);
      ellipse(ctx,128,89,74,54,"#d8a338",outline,2);
      for(let i=0;i<35;i++){const x=96+(i*13)%65,y=71+((i*17)%43);ctx.strokeStyle=i%5===0?"#57833f":"#f2c451";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+4,y+1);ctx.stroke();}
    } else if(kind==="injeolmi"){
      ellipse(ctx,128,110,112,49,"#dfc18a",outline,1.8);
      [[102,91],[128,83],[151,96]].forEach(([x,y])=>ellipse(ctx,x,y,26,23,"#f3dfae",outline,1.2));
    } else if(kind==="brulee"){
      ellipse(ctx,128,109,106,46,"#fff3d9",outline,1.8);
      ellipse(ctx,128,107,89,34,"#d9994d",outline,2);
      for(let i=-2;i<=2;i++){ctx.strokeStyle="#a96031";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(94,107+i*6);ctx.lineTo(162,107-i*4);ctx.stroke();}
    }
  }

  function render(level, size=256){
    const {canvas,ctx}=setupCanvas(size);
    const s=size/256;
    ctx.save();ctx.scale(s,s);
    switch(level){
      case 0: drawSouffleVariant(ctx,"lotus"); break;
      case 1: grapefruitBingsu(ctx); break;
      case 2: drawSouffleVariant(ctx,"chestnut"); break;
      case 3: drawSouffleVariant(ctx,"black_sesame"); break;
      case 4: drawSouffleVariant(ctx,"peach"); break;
      case 5: redBeanBingsu(ctx); break;
      case 6: drawSouffleVariant(ctx,"dubai"); break;
      case 7: mangoBingsu(ctx); break;
      case 8: drawSouffleVariant(ctx,"injeolmi"); break;
      case 9: blackSesameBingsu(ctx); break;
      case 10: drawSouffleVariant(ctx,"brulee"); break;
      default: drawSouffleVariant(ctx,"lotus");
    }
    ctx.restore();
    return canvas;
  }

  function drawTo(ctx, level, x, y, size, rotation=0, alpha=1){
    const c=render(level, 256);
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(rotation);
    ctx.drawImage(c,-size/2,-size/2,size,size);ctx.restore();
  }

  window.DigulDessertArt={ render, drawTo };
})();
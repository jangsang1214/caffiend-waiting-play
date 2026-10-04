(() => {
  const ATLAS_URL = "./assets/menu/menu-atlas-v2.webp?v=2";
  const COLS = 4;
  const ROWS = 3;
  const COUNT = 11;
  const atlas = new Image();
  atlas.decoding = "async";
  let loaded = false;
  let bounds = [];
  const waiters = [];

  function resolveWaiters() {
    while (waiters.length) waiters.shift()();
  }

  function computeBounds() {
    const cellW = atlas.naturalWidth / COLS;
    const cellH = atlas.naturalHeight / ROWS;
    const scratch = document.createElement("canvas");
    scratch.width = Math.round(cellW);
    scratch.height = Math.round(cellH);
    const sctx = scratch.getContext("2d", { willReadFrequently:true });

    bounds = Array.from({ length:COUNT }, (_, level) => {
      const col = level % COLS;
      const row = Math.floor(level / COLS);
      sctx.clearRect(0,0,scratch.width,scratch.height);
      sctx.drawImage(
        atlas,
        col * cellW, row * cellH, cellW, cellH,
        0, 0, scratch.width, scratch.height
      );
      const data = sctx.getImageData(0,0,scratch.width,scratch.height).data;
      let minX=scratch.width, minY=scratch.height, maxX=0, maxY=0, found=false;
      for (let y=0;y<scratch.height;y+=2) {
        for (let x=0;x<scratch.width;x+=2) {
          const a=data[(y*scratch.width+x)*4+3];
          if(a>14){found=true;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
        }
      }
      if(!found) return {sx:col*cellW,sy:row*cellH,sw:cellW,sh:cellH};
      const padX=(maxX-minX)*.045;
      const padY=(maxY-minY)*.045;
      return {
        sx:col*cellW+Math.max(0,minX-padX),
        sy:row*cellH+Math.max(0,minY-padY),
        sw:Math.min(cellW,maxX-minX+padX*2),
        sh:Math.min(cellH,maxY-minY+padY*2)
      };
    });
  }

  atlas.onload = () => {
    loaded = true;
    computeBounds();
    resolveWaiters();
  };
  atlas.onerror = () => resolveWaiters();
  atlas.src = ATLAS_URL;

  function ready() {
    if (loaded) return Promise.resolve();
    return new Promise(resolve => waiters.push(resolve));
  }

  function setup(size) {
    const ratio=Math.min(window.devicePixelRatio||2,3);
    const canvas=document.createElement("canvas");
    canvas.width=Math.round(size*ratio);
    canvas.height=Math.round(size*ratio);
    canvas.style.width=size+"px";
    canvas.style.height=size+"px";
    const ctx=canvas.getContext("2d");
    ctx.scale(ratio,ratio);
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";
    return {canvas,ctx};
  }

  function fallback(ctx,size,level){
    const hues=["#c9874e","#ed8d82","#a36b43","#6d6664","#f2a29d","#b5794b","#6b3b2d","#efbb43","#d9b979","#514b49","#d9a65e"];
    const g=ctx.createRadialGradient(size*.42,size*.36,size*.08,size*.5,size*.5,size*.42);
    g.addColorStop(0,"#fff4d9");g.addColorStop(1,hues[level]||"#c9874e");
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(size/2,size/2,size*.34,0,Math.PI*2);ctx.fill();
  }

  function paint(ctx,level,size){
    level=Math.max(0,Math.min(COUNT-1,level|0));
    ctx.clearRect(0,0,size,size);
    if(!loaded||!bounds[level]){fallback(ctx,size,level);return}
    const b=bounds[level];
    const visualScale = 1 + Math.min(level,10)*.012;
    const box=size*.94*visualScale;
    const aspect=b.sw/b.sh;
    let dw=box,dh=box/aspect;
    if(dh>box){dh=box;dw=box*aspect}
    const dx=(size-dw)/2;
    const dy=(size-dh)/2 + size*.015;
    ctx.save();
    ctx.shadowColor=level>=8?"rgba(112,55,25,.30)":"rgba(90,48,28,.18)";
    ctx.shadowBlur=level>=8?size*.035:size*.022;
    ctx.shadowOffsetY=size*.025;
    ctx.drawImage(atlas,b.sx,b.sy,b.sw,b.sh,dx,dy,dw,dh);
    ctx.restore();
  }

  function render(level,size=256){
    const {canvas,ctx}=setup(size);
    paint(ctx,level,size);
    if(!loaded){
      ready().then(()=>paint(ctx,level,size));
    }
    return canvas;
  }

  function drawTo(ctx,level,x,y,size,rotation=0,alpha=1){
    level=Math.max(0,Math.min(COUNT-1,level|0));
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.translate(x,y);
    ctx.rotate(rotation);

    if(!loaded || !bounds[level]){
      fallback(ctx,size,level);
      ctx.restore();
      return;
    }

    const b=bounds[level];
    const aspect=b.sw/b.sh;
    let dw=size,dh=size/aspect;
    if(dh>size){dh=size;dw=size*aspect}

    ctx.shadowColor=level>=8?"rgba(112,55,25,.28)":"rgba(72,39,23,.16)";
    ctx.shadowBlur=level>=8?9:5;
    ctx.shadowOffsetY=3;
    ctx.drawImage(atlas,b.sx,b.sy,b.sw,b.sh,-dw/2,-dh/2,dw,dh);
    ctx.restore();
  }

  window.DigulDessertArt={render,drawTo,ready,isReady:()=>loaded};
})();
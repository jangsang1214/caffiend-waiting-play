(() => {
  const CONFIG = window.DIGUL_CONFIG;
  const COLS = 4;
  const ROWS = 3;
  const URL = "./assets/menu/menu-atlas-v2.webp?v=8";
  const MIN_W = 512;
  const MIN_H = 384;

  const atlas = new Image();
  atlas.decoding = "async";

  let status = "loading";
  let readyPromise = null;
  let cells = [];
  const listeners = new Set();

  function notify() {
    listeners.forEach(fn => {
      try { fn(status); } catch (_) {}
    });
  }

  function scanCells() {
    const cellW = atlas.naturalWidth / COLS;
    const cellH = atlas.naturalHeight / ROWS;
    const scratch = document.createElement("canvas");
    scratch.width = Math.round(cellW);
    scratch.height = Math.round(cellH);
    const sctx = scratch.getContext("2d", { willReadFrequently:true });

    cells = Array.from({ length:CONFIG.menus.length }, (_, level) => {
      const col = level % COLS;
      const row = Math.floor(level / COLS);
      sctx.clearRect(0, 0, scratch.width, scratch.height);
      sctx.drawImage(
        atlas,
        col * cellW, row * cellH, cellW, cellH,
        0, 0, scratch.width, scratch.height
      );

      let minX = scratch.width, minY = scratch.height, maxX = -1, maxY = -1;
      try {
        const data = sctx.getImageData(0, 0, scratch.width, scratch.height).data;
        for (let y = 0; y < scratch.height; y += 2) {
          for (let x = 0; x < scratch.width; x += 2) {
            if (data[(y * scratch.width + x) * 4 + 3] > 18) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }
      } catch (_) {}

      if (maxX < minX || maxY < minY) {
        return { sx:col*cellW, sy:row*cellH, sw:cellW, sh:cellH };
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const padX = Math.max(2, w * .035);
      const padY = Math.max(2, h * .035);
      return {
        sx:col*cellW + Math.max(0, minX - padX),
        sy:row*cellH + Math.max(0, minY - padY),
        sw:Math.min(cellW, w + padX * 2),
        sh:Math.min(cellH, h + padY * 2)
      };
    });
  }

  function load() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise(resolve => {
      atlas.onload = () => {
        const valid =
          atlas.naturalWidth >= MIN_W &&
          atlas.naturalHeight >= MIN_H &&
          atlas.naturalWidth % COLS === 0 &&
          atlas.naturalHeight % ROWS === 0;

        if (valid) {
          scanCells();
          status = "ready";
        } else {
          status = "fallback";
          console.warn("DIGUL sprite atlas invalid", atlas.naturalWidth, atlas.naturalHeight);
        }
        notify();
        resolve(status);
      };
      atlas.onerror = () => {
        status = "fallback";
        notify();
        resolve(status);
      };
      atlas.src = URL;
    });
    return readyPromise;
  }

  function fallback(ctx, level, x, y, size, rotation = 0, alpha = 1) {
    const menu = CONFIG.menus[level];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const radius = size * .36;
    ctx.shadowColor = "rgba(74,39,21,.18)";
    ctx.shadowBlur = Math.max(4, size * .08);
    ctx.shadowOffsetY = Math.max(2, size * .05);

    const g = ctx.createRadialGradient(-radius*.25,-radius*.28,radius*.08,0,0,radius);
    g.addColorStop(0,"#fff5d8");
    g.addColorStop(1,menu.tone);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0,0,radius,0,Math.PI*2);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(92,50,28,.28)";
    ctx.lineWidth = Math.max(1.2,size*.018);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.82)";
    ctx.beginPath();
    ctx.ellipse(-radius*.22,-radius*.28,radius*.24,radius*.11,-.35,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = `900 ${Math.max(11,size*.21)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(menu.fallback,0,1);
    ctx.restore();
  }

  function draw(ctx, level, x, y, size, rotation = 0, alpha = 1) {
    const safe = Math.max(0, Math.min(CONFIG.menus.length - 1, level | 0));
    if (status !== "ready" || !cells[safe]) {
      fallback(ctx, safe, x, y, size, rotation, alpha);
      return false;
    }

    const c = cells[safe];
    const aspect = c.sw / c.sh;
    let dw = size;
    let dh = size / aspect;
    if (dh > size) {
      dh = size;
      dw = size * aspect;
    }

    const boost = 1 + Math.min(safe, 10) * .016;
    dw *= boost;
    dh *= boost;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = safe >= 8 ? "rgba(99,47,20,.34)" : "rgba(73,39,21,.22)";
    ctx.shadowBlur = safe >= 8 ? Math.max(7,size*.08) : Math.max(4,size*.055);
    ctx.shadowOffsetY = safe >= 8 ? Math.max(3,size*.035) : Math.max(2,size*.025);
    ctx.drawImage(atlas,c.sx,c.sy,c.sw,c.sh,-dw/2,-dh/2,dw,dh);
    ctx.restore();
    return true;
  }

  function mount(target, level, size) {
    if (!target) return;
    target.innerHTML = "";
    target.style.width = `${size}px`;
    target.style.height = `${size}px`;

    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const canvas = document.createElement("canvas");
    canvas.className = "dessert-canvas";
    canvas.width = Math.max(1, Math.round(size * ratio));
    canvas.height = Math.max(1, Math.round(size * ratio));
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.setAttribute("role","img");
    canvas.setAttribute("aria-label",CONFIG.menus[level].name);
    target.appendChild(canvas);

    const paint = () => {
      const cctx = canvas.getContext("2d");
      cctx.setTransform(ratio,0,0,ratio,0,0);
      cctx.clearRect(0,0,size,size);
      draw(cctx,level,size/2,size/2,size*.94,0,1);
    };

    paint();
    if (status === "loading") load().then(paint);
  }

  function onStatus(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function selfTest() {
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 96;
    const cctx = c.getContext("2d", { willReadFrequently:true });
    draw(cctx,0,48,48,80,0,1);
    const data = cctx.getImageData(0,0,96,96).data;
    let colored = 0;
    for (let i=0;i<data.length;i+=4) {
      if (data[i+3] > 30) colored++;
    }
    return {
      pass:colored > 250,
      status,
      coloredPixels:colored,
      atlas:[atlas.naturalWidth || 0, atlas.naturalHeight || 0]
    };
  }

  window.DigulSpriteRenderer = {
    load,
    draw,
    mount,
    onStatus,
    selfTest,
    status:() => status,
    url:URL
  };

  load();
})();
(() => {
  const CONFIG = window.DIGUL_CONFIG;
  const ART = window.DigulDessertArt;

  if (!CONFIG || !ART) {
    console.error("DIGUL raster renderer dependency missing");
    return;
  }

  const status = "procedural-raster";

  function load() {
    return Promise.resolve(status);
  }

  function draw(ctx, level, x, y, size, rotation = 0, alpha = 1) {
    const safe = Math.max(0, Math.min(CONFIG.menus.length - 1, level | 0));
    ART.drawTo(ctx, safe, x, y, size, rotation, alpha);
    return true;
  }

  function mount(target, level, size) {
    if (!target) return;
    const safe = Math.max(0, Math.min(CONFIG.menus.length - 1, level | 0));
    target.innerHTML = "";
    target.style.width = `${size}px`;
    target.style.height = `${size}px`;

    const canvas = ART.render(safe, size);
    canvas.className = "dessert-canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", CONFIG.menus[safe].name);
    target.appendChild(canvas);
  }

  function onStatus(fn) {
    try { fn(status); } catch (_) {}
    return () => {};
  }

  function selfTest() {
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 96;
    const cctx = c.getContext("2d", { willReadFrequently:true });
    draw(cctx, 0, 48, 48, 82, 0, 1);
    const data = cctx.getImageData(0,0,96,96).data;
    let colored = 0;
    for (let i=0;i<data.length;i+=4) {
      if (data[i+3] > 30) colored++;
    }
    return {
      pass:colored > 300,
      status,
      coloredPixels:colored
    };
  }

  window.DigulSpriteRenderer = {
    load,
    draw,
    mount,
    onStatus,
    selfTest,
    status:() => status,
    url:"canvas-raster-v1"
  };
})();
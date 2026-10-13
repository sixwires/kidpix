const W = 1920, H = 1080;
const ASSETS_PREFIX = "assets/";
const SAVE_KEY = 'kidpix-canvas';
const STAMP_SCALE = 12; // stamp height in canvas px per size unit (48..384 on 1080p)
const current = { tool: 'pencil', color: '#000000', size: 8, gif: 0 };

// Ordered bottom-to-top. Paint layers {g} are transparent Graphics; gif stamps {img,x,y,w,h}
// stay as objects so image() can keep animating them. A fresh paint layer is only opened when
// something is painted after a gif, so z-order follows creation order.
let layers = [];
let undo = null;

// p5 only loops while an animated gif is on canvas; everything else redraws on demand.
function setLayers(next) {
  layers = next;
  layers.some(l => l.img) ? loop() : noLoop();
}

const newPaint = () => createGraphics(W, H);
const paintLayers = () => layers.filter(l => l.g);
function topPaint() {
  if (!layers.at(-1)?.g) layers = [...layers, { g: newPaint() }];
  return layers.at(-1).g;
}
function resetLayers(next) { layers.forEach(l => l.g && l.g.remove()); setLayers(next); redraw(); }

// Animated GIF stamps
const GIFS = ["korie-cara.gif", "korie-kid.gif", "madi-baby.png"];
let stamps = [];

const tools = {
  pencil: {
    press(x, y) { this.drag(x, y, x, y); },
    drag(x, y, px, py) {
      const pg = topPaint();
      pg.stroke(current.color); pg.strokeWeight(current.size); pg.strokeCap(ROUND);
      pg.line(px, py, x, y);
    },
    cursor: "drag",
    release() {},
  },

  eraser: {
    press(x, y) { this.drag(x, y, x, y); },
    drag(x, y, px, py) {
      paintLayers().forEach(({ g }) => {
        g.erase(); g.strokeWeight(current.size * 2); g.strokeCap(ROUND);
        g.line(px, py, x, y);
        g.noErase();
      });
      // gifs can't be partially erased (stamps share one p5.Image), so drop any the eraser touches
      // ponytail: paint layers either side of a removed gif are never merged; fine until layer count hurts
      const r = current.size;
      const hit = s => x > s.x - r && x < s.x + s.w + r && y > s.y - r && y < s.y + s.h + r;
      setLayers(layers.filter(l => l.g || !hit(l)));
    },
    release() {},
  },

  // Stamps a BRUSHES entry along the stroke: by pointer spacing, or on a timer while held (anim).
  brush: {
    press(x, y) {
      if (this.key !== current.brush) { this.key = current.brush; this.pstep = 0; } // dot numbering restarts per pick
      this.step = 0; this.dist = 0; this.last = null; this.at = [x, y];
      this.place(x, y);
      const { anim } = BRUSHES[current.brush];
      if (anim) this.timer = setInterval(() => { this.place(...this.at); redraw(); }, anim);
    },
    drag(x, y, px, py) {
      const b = BRUSHES[current.brush];
      this.at = [x, y]; this.dist = dist(px, py, x, y);
      if (b.anim || !this.last || dist(...this.last, x, y) > b.spacing * brushScale()) this.place(x, y);
    },
    place(x, y) {
      const { brush, offset = 0, abspos } = BRUSHES[current.brush].make(current.color, this.step++, this.pstep++, this.dist);
      const [bx, by] = abspos ? [abspos.x, abspos.y] : [x - offset, y - offset];
      topPaint().drawingContext.drawImage(brush, Math.round(bx), Math.round(by));
      this.last = [x, y];
    },
    release() { clearInterval(this.timer); this.timer = null; },
  },

  gif: {
    press(x, y) { this.lx = x; this.ly = y; this.stamp(x, y); },
    drag(x, y) {
      if (dist(this.lx, this.ly, x, y) < current.size * STAMP_SCALE * 0.6) return;
      this.stamp(x, y);
    },
    stamp(x, y) {
      const img = stamps[current.gif];
      const h = current.size * STAMP_SCALE, w = h * img.width / img.height; // keep aspect
      const stamp = { img, x: x - w / 2, y: y - h / 2, w, h };
      if (img.gifProperties) setLayers([...layers, stamp]);     // animated: keep as object
      else topPaint().image(img, stamp.x, stamp.y, w, h);       // static: bake into paint
      this.lx = x; this.ly = y;
    },
    release() {},
  },
};

function preload() {
  stamps = GIFS.map(p => loadImage(`${ASSETS_PREFIX}${p}`));
}

function setup() {
  pixelDensity(1); // 1920x1080 backing store, not DPR-scaled
  createCanvas(W, H).parent('canvas');
  noLoop();
  layers = [{ g: newPaint() }];
  addBrushButtons();
  addGifButtons();
  wireButtons();
  cursor(renderCursor());
  const saved = localStorage.getItem(SAVE_KEY);
  const first = layers[0].g;
  if (saved) loadImage(saved, img => { if (layers[0]?.g !== first) return; first.image(img, 0, 0, W, H); redraw(); });
}

function draw() {
  background(255);
  layers.forEach(l => l.g ? image(l.g, 0, 0) : image(l.img, l.x, l.y, l.w, l.h)); // image() advances gif frame
}

function addBrushButtons() {
  const eraser = document.querySelector('[data-tool="eraser"]');
  Object.entries(BRUSHES).forEach(([key, { name, icon, img }]) => {
    const b = document.createElement('button');
    b.dataset.tool = 'brush'; b.dataset.brush = key; b.title = name;
    if (img) b.innerHTML = `<img src="${ASSETS_PREFIX}brushes/${img}" alt="">`; else b.textContent = icon;
    eraser.before(b);
  });
}

// One tool button per gif; the browser animates the <img> preview itself.
function addGifButtons() {
  const eraser = document.querySelector('[data-tool="eraser"]');
  GIFS.forEach((p, i) => {
    const b = document.createElement('button');
    b.dataset.tool = 'gif'; b.dataset.gif = i; b.title = `Stamp ${p}`;
    b.innerHTML = `<img src="${ASSETS_PREFIX}${p}" alt="">`;
    eraser.before(b);
  });
}

function wireButtons() {
  const pick = (sel, key, parse = v => v) => {
    const btns = document.querySelectorAll(sel);
    btns.forEach(b => b.onclick = () => {
      current[key] = parse(b.dataset[key]);
      if ('gif' in b.dataset) current.gif = Number(b.dataset.gif);
      if ('brush' in b.dataset) current.brush = b.dataset.brush;
      btns.forEach(o => o.classList.toggle('on', o === b));
      cursor(renderCursor());
    });
    [...btns].find(b => parse(b.dataset[key]) === current[key]).classList.add('on');
  };
  pick('[data-tool]', 'tool');
  pick('[data-size]', 'size', Number);
  document.querySelectorAll('[data-color]').forEach(b => b.onclick = () => current.color = b.dataset.color);
  document.getElementById('clear').onclick = () => { saveUndo(); resetLayers([{ g: newPaint() }]); };
  document.getElementById('undo').onclick = () => {
    if (!undo) return;
    const cur = layers;
    setLayers(undo); undo = cur; redraw(); // swap, so pressing again redoes (like kmpix)
  };
  document.getElementById('save').onclick = () => {
    try { localStorage.setItem(SAVE_KEY, drawingContext.canvas.toDataURL()); }
    catch (e) { alert('Could not save: ' + e.message); }
  };
  document.getElementById('export').onclick = () => saveCanvas('kidpix', 'png');
}

// GPU-side copy of each paint layer; no pixel readback.
function saveUndo() {
  undo?.forEach(l => l.g && l.g.remove());
  undo = layers.map(l => l.g ? { g: copyPaint(l.g) } : l);
}
function copyPaint(src) { const g = newPaint(); g.image(src, 0, 0); return g; }

function inCanvas() { return mouseX >= 0 && mouseX < W && mouseY >= 0 && mouseY < H; }

// p5 only refreshes pmouseX/Y inside its own frame loop, so under noLoop() track the previous point here.
let last = null;

function mousePressed() {
  if (!inCanvas()) return;
  saveUndo();
  last = [mouseX, mouseY];
  tools[current.tool].press(mouseX, mouseY);
  redraw();
}

function mouseDragged() {
  if (!last) return;
  const [px, py] = last;
  last = [mouseX, mouseY];
  if (!inCanvas()) return;
  tools[current.tool].drag(mouseX, mouseY, px, py);
  redraw();
}

function mouseReleased() { last = null; tools[current.tool].release(); }

function renderCursor() {
  if (current.tool === "pencil") return "drag";
  if (current.tool === "eraser") return "move";
  if (current.tool === "brush") return "crosshair";
  if (current.tool === "gif") return ASSETS_PREFIX + GIFS[current.gif];
  return "pointer";
}

// self-check
for (const [name, t] of Object.entries(tools)) {
  console.assert(['press', 'drag', 'release'].every(k => typeof t[k] === 'function'), `tool ${name} incomplete`);
}

document.querySelectorAll('[data-tool]').forEach(b => console.assert(tools[b.dataset.tool], `no tool for button ${b.dataset.tool}`));
console.assert(document.querySelectorAll('[data-color]').length >= 8, 'palette too small');
console.assert(document.querySelectorAll('[data-size]').length === 4, 'size picker incomplete');
console.assert(document.querySelectorAll('[data-gif]').length === GIFS.length, 'gif buttons missing');
for (const [k, b] of Object.entries(BRUSHES)) {
  console.assert((b.anim > 0) !== (b.spacing >= 0), `brush ${k} needs exactly one of anim/spacing`);
  console.assert(b.make('#000', 0, 0, 0).brush instanceof HTMLCanvasElement, `brush ${k} did not render`);
}

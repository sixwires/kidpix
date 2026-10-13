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

const newPaint = () => createGraphics(W, H);
const paintLayers = () => layers.filter(l => l.g);
function topPaint() {
  if (!layers.at(-1)?.g) layers = [...layers, { g: newPaint() }];
  return layers.at(-1).g;
}
function resetLayers(next) { layers.forEach(l => l.g && l.g.remove()); layers = next; }

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
      layers = layers.filter(l => l.g || !hit(l));
    },
    release() {},
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
      if (img.gifProperties) layers = [...layers, stamp];       // animated: keep as object
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
  createCanvas(W, H).parent('canvas');
  layers = [{ g: newPaint() }];
  addGifButtons();
  wireButtons();
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) loadImage(saved, img => layers[0].g.image(img, 0, 0, W, H)); // saved PNG is pixelDensity-scaled
}

function draw() {
  background(255);
  layers.forEach(l => l.g ? image(l.g, 0, 0) : image(l.img, l.x, l.y, l.w, l.h)); // image() advances gif frame
  cursor(renderCursor());
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
      btns.forEach(o => o.classList.toggle('on', o === b));
    });
    [...btns].find(b => parse(b.dataset[key]) === current[key]).classList.add('on');
  };
  pick('[data-tool]', 'tool');
  pick('[data-size]', 'size', Number);
  document.querySelectorAll('[data-color]').forEach(b => b.onclick = () => current.color = b.dataset.color);
  document.getElementById('clear').onclick = () => { saveUndo(); resetLayers([{ g: newPaint() }]); };
  document.getElementById('undo').onclick = () => {
    if (!undo) return;
    resetLayers(undo.map(l => l.snap ? { g: snapToPaint(l.snap) } : l));
  };
  document.getElementById('save').onclick = () => {
    try { localStorage.setItem(SAVE_KEY, drawingContext.canvas.toDataURL()); }
    catch (e) { alert('Could not save: ' + e.message); }
  };
  document.getElementById('export').onclick = () => saveCanvas('kidpix', 'png');
}

function saveUndo() { undo = layers.map(l => l.g ? { snap: l.g.get() } : l); }
function snapToPaint(img) { const g = newPaint(); g.image(img, 0, 0); return g; }

function inCanvas() { return mouseX >= 0 && mouseX < W && mouseY >= 0 && mouseY < H; }

function mousePressed() {
  if (!inCanvas()) return;
  saveUndo();
  tools[current.tool].press(mouseX, mouseY);
}

function mouseDragged() {
  if (!inCanvas()) return;
  tools[current.tool].drag(mouseX, mouseY, pmouseX, pmouseY);
}

function mouseReleased() { tools[current.tool].release(); }

function renderCursor() {
  if (current.tool === "pencil") return "drag";
  if (current.tool === "eraser") return "move";
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

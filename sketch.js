// Minimal KidPix-style paint. Pattern from vikrum/kidpix: one tool object
// per pen with press/drag/release, a current color + size, snapshot for undo.

const W = 640, H = 480;
const SAVE_KEY = 'kidpix-canvas';
const current = { tool: 'pencil', color: '#000000', size: 8 };
let undoImg = null;

// Animated GIF stamps. Drop files in gifs/ and list them here; p5 1.9 decodes
// GIF frames and image() advances them, so each stamp along a drag shows the
// next frame. Empty list → generated placeholder smiley.
const GIFS = []; // e.g. ['gifs/dino.gif', 'gifs/star.gif']
let stamps = [];

const tools = {
  pencil: {
    press(x, y) { this.drag(x, y, x, y); },
    drag(x, y, px, py) {
      stroke(current.color); strokeWeight(current.size); strokeCap(ROUND);
      line(px, py, x, y);
    },
    release() {},
  },

  eraser: {
    press(x, y) { this.drag(x, y, x, y); },
    drag(x, y, px, py) {
      stroke(255); strokeWeight(current.size * 2); strokeCap(ROUND);
      line(px, py, x, y);
    },
    release() {},
  },

  scribble: {
    press(x, y) { this.lx = x; this.ly = y; },
    drag(x, y) {
      if (dist(this.lx, this.ly, x, y) < 5) return;
      stroke(current.color); strokeWeight(1);
      const j = current.size * 1.5;
      line(this.lx, this.ly, x + random(-j, j), y + random(-j, j));
      this.lx = x; this.ly = y;
    },
    release() {},
  },

  spray: {
    press(x, y) { this.drag(x, y); },
    drag(x, y) {
      stroke(current.color); strokeWeight(2);
      for (let i = 0; i < 20; i++) {
        const a = random(TWO_PI), r = random(current.size * 2);
        point(x + cos(a) * r, y + sin(a) * r);
      }
    },
    release() {},
  },

  rainbow: {
    hue: 0,
    press(x, y) { this.drag(x, y, x, y); },
    drag(x, y, px, py) {
      colorMode(HSB, 360, 100, 100);
      stroke(this.hue, 90, 100); strokeWeight(current.size * 1.5); strokeCap(ROUND);
      line(px, py, x, y);
      this.hue = (this.hue + 4) % 360;
      colorMode(RGB, 255);
    },
    release() {},
  },

  dots: {
    press(x, y) { this.lx = x; this.ly = y; this.step = 0; this.drag(x, y); },
    drag(x, y) {
      if (dist(this.lx, this.ly, x, y) < 12) return;
      const size = 4 + current.size * 2 * abs(sin(this.step * 0.3)); // pulses
      noStroke(); fill(current.color);
      ellipse(x, y, size, size);
      this.lx = x; this.ly = y; this.step++;
    },
    release() {},
  },

  gif: {
    press(x, y) { this.lx = x; this.ly = y; this.i = 0; this.stamp(x, y); },
    drag(x, y) {
      const px = current.size * 3;
      if (dist(this.lx, this.ly, x, y) < px * 0.6) return;
      this.stamp(x, y);
    },
    stamp(x, y) {
      // ponytail: cycles through all loaded gifs; add a picker row when there are enough to choose from
      const img = stamps[this.i++ % stamps.length];
      const px = current.size * 3;
      imageMode(CENTER); image(img, x, y, px, px); imageMode(CORNER);
      this.lx = x; this.ly = y;
    },
    release() {},
  },
};

function preload() {
  stamps = GIFS.map(p => loadImage(p));
}

function setup() {
  createCanvas(W, H).parent('canvas');
  background(255);
  if (!stamps.length) stamps = [placeholderStamp()];
  wireButtons();
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) loadImage(saved, img => image(img, 0, 0, W, H)); // saved PNG is pixelDensity-scaled
}

// Empty draw keeps the loop alive so p5 advances GIF frames between stamps.
function draw() {}

function placeholderStamp() {
  const g = createGraphics(64, 64);
  g.noStroke(); g.fill('#ffcc00'); g.ellipse(32, 32, 60, 60);
  g.fill(0); g.ellipse(22, 24, 8, 8); g.ellipse(42, 24, 8, 8);
  g.noFill(); g.stroke(0); g.strokeWeight(4); g.arc(32, 36, 30, 20, 0, PI);
  return g.get();
}

function wireButtons() {
  const pick = (sel, key, parse = v => v) => {
    const btns = document.querySelectorAll(sel);
    btns.forEach(b => b.onclick = () => {
      current[key] = parse(b.dataset[key]);
      btns.forEach(o => o.classList.toggle('on', o === b));
    });
    [...btns].find(b => parse(b.dataset[key]) === current[key]).classList.add('on');
  };
  pick('[data-tool]', 'tool');
  pick('[data-size]', 'size', Number);
  document.querySelectorAll('[data-color]').forEach(b => b.onclick = () => current.color = b.dataset.color);
  document.getElementById('clear').onclick = () => { saveUndo(); background(255); };
  document.getElementById('undo').onclick = () => { if (undoImg) image(undoImg, 0, 0); };
  document.getElementById('save').onclick = () => {
    try { localStorage.setItem(SAVE_KEY, drawingContext.canvas.toDataURL()); }
    catch (e) { alert('Could not save: ' + e.message); }
  };
  document.getElementById('export').onclick = () => saveCanvas('kidpix', 'png');
}

function saveUndo() { undoImg = get(); }

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

// self-check
for (const [name, t] of Object.entries(tools)) {
  console.assert(['press', 'drag', 'release'].every(k => typeof t[k] === 'function'), `tool ${name} incomplete`);
}
document.querySelectorAll('[data-tool]').forEach(b => console.assert(tools[b.dataset.tool], `no tool for button ${b.dataset.tool}`));
console.assert(document.querySelectorAll('[data-color]').length >= 8, 'palette too small');
console.assert(document.querySelectorAll('[data-size]').length === 4, 'size picker incomplete');

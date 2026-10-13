// Minimal KidPix-style paint. Pattern from vikrum/kidpix: one tool object
// per pen with press/drag/release, a current color, snapshot for undo.

const W = 640, H = 480;
const current = { tool: 'pencil', color: '#000000' };
let undoImg = null;

const tools = {
  pencil: {
    press(x, y) { this.drag(x, y, x, y); },
    drag(x, y, px, py) {
      stroke(current.color); strokeWeight(7); strokeCap(ROUND);
      line(px, py, x, y);
    },
    release() {},
  },

  scribble: {
    press(x, y) { this.lx = x; this.ly = y; },
    drag(x, y) {
      if (dist(this.lx, this.ly, x, y) < 5) return;
      stroke(current.color); strokeWeight(1);
      const j = 10;
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
        const a = random(TWO_PI), r = random(15);
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
      stroke(this.hue, 90, 100); strokeWeight(12); strokeCap(ROUND);
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
      const size = 4 + 16 * abs(sin(this.step * 0.3)); // pulses 4..20
      noStroke(); fill(current.color);
      ellipse(x, y, size, size);
      this.lx = x; this.ly = y; this.step++;
    },
    release() {},
  },
};

function setup() {
  createCanvas(W, H).parent('canvas');
  background(255);
  wireButtons();
}

function wireButtons() {
  const toolBtns = document.querySelectorAll('[data-tool]');
  toolBtns.forEach(b => b.onclick = () => {
    current.tool = b.dataset.tool;
    toolBtns.forEach(o => o.classList.toggle('on', o === b));
  });
  toolBtns[0].classList.add('on');
  document.querySelectorAll('[data-color]').forEach(b => b.onclick = () => current.color = b.dataset.color);
  document.getElementById('clear').onclick = () => { saveUndo(); background(255); };
  document.getElementById('undo').onclick = () => { if (undoImg) image(undoImg, 0, 0); };
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
console.assert(document.querySelectorAll('[data-color]').length >= 8, 'palette too small');

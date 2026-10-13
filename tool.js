const tools = {
  pencil: {
    press(x, y) { this.drag(x, y, x, y); },
    drag(x, y, px, py) {
      pg.stroke(current.color); pg.strokeWeight(current.size); pg.strokeCap(ROUND);
      pg.line(px, py, x, y);
    },
    release() {},
  },

  eraser: {
    press(x, y) { this.drag(x, y, x, y); },
    drag(x, y, px, py) {
      pg.stroke(255); pg.strokeWeight(current.size * 2); pg.strokeCap(ROUND);
      pg.line(px, py, x, y);
    },
    release() {},
  },

  scribble: {
    press(x, y) { this.lx = x; this.ly = y; },
    drag(x, y) {
      if (dist(this.lx, this.ly, x, y) < 5) return;
      pg.stroke(current.color); pg.strokeWeight(1);
      const j = current.size * 1.5;
      pg.line(this.lx, this.ly, x + random(-j, j), y + random(-j, j));
      this.lx = x; this.ly = y;
    },
    release() {},
  },

  spray: {
    press(x, y) { this.drag(x, y); },
    drag(x, y) {
      pg.stroke(current.color); pg.strokeWeight(2);
      for (let i = 0; i < 20; i++) {
        const a = random(TWO_PI), r = random(current.size * 2);
        pg.point(x + cos(a) * r, y + sin(a) * r);
      }
    },
    release() {},
  },

  rainbow: {
    hue: 0,
    press(x, y) { this.drag(x, y, x, y); },
    drag(x, y, px, py) {
      pg.colorMode(HSB, 360, 100, 100);
      pg.stroke(this.hue, 90, 100); pg.strokeWeight(current.size * 1.5); pg.strokeCap(ROUND);
      pg.line(px, py, x, y);
      this.hue = (this.hue + 4) % 360;
      pg.colorMode(RGB, 255);
    },
    release() {},
  },

  dots: {
    press(x, y) { this.lx = x; this.ly = y; this.step = 0; this.drag(x, y); },
    drag(x, y) {
      if (dist(this.lx, this.ly, x, y) < 12) return;
      const size = 4 + current.size * 2 * abs(sin(this.step * 0.3)); // pulses
      pg.noStroke(); pg.fill(current.color);
      pg.ellipse(x, y, size, size);
      this.lx = x; this.ly = y; this.step++;
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
      live = [...live, { img, x, y, w, h }];
      this.lx = x; this.ly = y;
    },
    release() {},
  },
};

// Brushes ported from kmpix js/brushes/. Each make() returns { brush: <canvas>, offset } (drawn at
// pointer - offset) or { brush, abspos: {x, y} } (drawn at an absolute spot, ignoring the pointer).
// Signature: make(color, step, pstep, distPrev). step resets per stroke, pstep per brush pick.
// ponytail: kmpix "multiplier" (number keys) and modifier-key variants not ported; variants that are
// the only route to a brush (RCircles, Triangles, RotatingPentagon) get their own button instead.

const BRIGHT = ['rgb(255,0,0)', 'rgb(255,255,0)', 'rgb(0,255,0)', 'rgb(0,0,255)', 'rgb(0,255,255)', 'rgb(255,0,255)'];
const brushScale = () => current.size / 8; // kmpix scaling 1 == kidpix medium
const TAU = Math.PI * 2;
const pickRandom = a => a[Math.floor(Math.random() * a.length)];
const randomColor = () => pickRandom(BRIGHT);
const randomAllColor = () => pickRandom([...document.querySelectorAll('[data-color]')].map(b => b.dataset.color));
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(Math.ceil(min), Math.floor(max)));
const ziggurat = () => (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) / 3;

// Normal variate in [min, max], skew > 1 pushes toward min. https://stackoverflow.com/a/36481059
function randn_bm(min, max, skew) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(TAU * v) / 10.0 + 0.5;
  if (num > 1 || num < 0) return randn_bm(min, max, skew);
  return Math.pow(num, skew) * (max - min) + min;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  return [c, c.getContext('2d')];
}
const ring = (size, s) => [size + size * Math.cos(TAU * s), size + size * Math.sin(TAU * s)];

function bubbles(color) {
  const size = 20 * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  for (let i = -size / 2; i < size / 2; i += 4)
    for (let j = -size / 2; j < size / 2; j += 4) {
      if (Math.random() <= 0.5) continue;
      ctx.beginPath(); ctx.arc(size + i, size + j, 4, 0, TAU);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = Math.random() > 0.35 ? color : 'white'; ctx.fill();
    }
  return { brush: c, offset: size };
}

let circleFlip = 0;
function circles(color1, color2 = color1, alwaysFill = false) {
  const size = 20 * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  ctx.beginPath(); ctx.arc(size, size, size / 2, 0, TAU);
  if (alwaysFill || circleFlip++ % 2 === 0) { ctx.fillStyle = color1; ctx.fill(); }
  ctx.lineWidth = 2; ctx.strokeStyle = color2; ctx.stroke();
  return { brush: c, offset: size };
}
const rcircles = () => circles(randomColor(), randomColor(), true);

function concentric(color, step) {
  const size = ((step % 7) * 5 + 5) * brushScale();
  const [c, ctx] = makeCanvas(size * 2 + 10, size * 2 + 10);
  ctx.beginPath(); ctx.arc(size + 5, size + 5, size, 0, TAU);
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
  return { brush: c, offset: size + 5 };
}

function connectTheDots(color, step) {
  const [c, ctx] = makeCanvas(150, 24);
  ctx.font = '16px sans-serif'; ctx.textBaseline = 'top'; ctx.fillStyle = color;
  ctx.fillText('• ' + step, 0, 0);
  return { brush: c, offset: 0 };
}

// Random dots in a disc: spread widens, squish flattens y, dot() is the pixel size.
function scatter(color, radius, density, spread, squish, dot) {
  const [c, ctx] = makeCanvas(radius * 2, radius * 2);
  ctx.fillStyle = color;
  for (let i = 0; i < density; i++) {
    ctx.globalAlpha = Math.random() / 2;
    const rr = ziggurat() * radius * spread, ra = Math.random() * TAU, px = dot();
    ctx.fillRect(radius + Math.cos(ra) * rr, radius + Math.sin(ra) * rr * squish, px, px);
  }
  return { brush: c, offset: radius };
}
const spray = color => scatter(color, 10 * brushScale(), 128 * brushScale(), 1.1, 1, Math.random);
const dumbbell = color => scatter(color, 25 * brushScale(), 128 * brushScale(), 1, 1 / 11, () => 0.7);

function followingSine(color, step) {
  const interval = 50, size = 33 * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  ctx.fillStyle = color;
  for (let i = 0, s = (step % interval) / interval; i < 6; i++, s += 10 / interval) {
    const [x, y] = ring(size, s);
    ctx.fillRect(Math.round(x), Math.round(y), 3, 3);
  }
  return { brush: c, offset: size };
}

function rotatingPentagon(color, step) {
  const interval = 50, size = 33 * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  for (let i = 0, s = (step % interval) / interval; i < 6; i++, s += 10 / interval) ctx.lineTo(...ring(size, s));
  ctx.stroke();
  return { brush: c, offset: size };
}

function twirly(color, step) {
  const size = 25 * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  ctx.beginPath(); ctx.moveTo(size, size); ctx.lineTo(...ring(size, (step % 24) / 24));
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
  return { brush: c, offset: size };
}

function rose(color, step) {
  const interval = 257, k = 5, size = 50 * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  ctx.strokeStyle = color;
  for (let i = 0, s = (step % interval) / interval; i < 6; i++, s += 1 / 7) {
    const r = size * Math.cos(k * TAU * s);
    ctx.lineTo(size + r * Math.cos(TAU * s), size + r * Math.sin(TAU * s));
  }
  ctx.stroke();
  return { brush: c, offset: size };
}

// Vertical icicle hanging from the pointer.
function icy(color) {
  const radius = 32 * brushScale(), density = Math.min(2000, 600 * brushScale());
  const [c, ctx] = makeCanvas(10, radius * 2);
  ctx.fillStyle = color;
  for (let i = 0; i < density; i++) {
    ctx.globalAlpha = Math.random() / 2;
    ctx.fillRect(5 + randn_bm(-5, 5, 1), radius + randn_bm(-radius, radius, 5), 0.4, 0.4);
  }
  return { brush: c, offset: 0 };
}

// Blob grows while the pointer lingers (distPrev < 2), snaps back when it moves.
let leakSize = 3;
function leakyPen(color, distPrev) {
  const base = 3, max = Math.PI * base * Math.E;
  leakSize = distPrev < 2 ? Math.min(max, leakSize + 0.15) : base;
  const size = leakSize * brushScale();
  const [c, ctx] = makeCanvas(size * 3, size * 3);
  ctx.beginPath(); ctx.ellipse(size * 1.5, size * 1.5, size, size, Math.PI / 4, 0, TAU);
  ctx.fillStyle = color; ctx.fill();
  return { brush: c, offset: size * 1.5 };
}

function pies(color) {
  const size = 20 * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  ctx.beginPath(); ctx.arc(size, size, size, 0, TAU); ctx.fillStyle = color; ctx.fill();
  ctx.globalCompositeOperation = 'destination-out'; // cut a random wedge out
  const a = Math.random() * TAU;
  ctx.beginPath(); ctx.arc(size, size, size + 2, a, a + Math.random() * Math.PI); ctx.lineTo(size, size); ctx.fill();
  return { brush: c, offset: size };
}

function rainbowBall() {
  const size = 100 * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  ctx.scale(size / 100, size / 100);
  const g = ctx.createRadialGradient(45, 45, 10, 52, 50, 30);
  g.addColorStop(0, '#A7D30C'); g.addColorStop(0.9, '#019F62'); g.addColorStop(1, 'rgba(1,159,98,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 100, 100);
  return { brush: c, offset: size / 2 };
}

function rainbowBar() {
  const size = 35 * brushScale();
  const [c, ctx] = makeCanvas(size * 2.25, size * 2.25);
  const g = ctx.createLinearGradient(10, 0, size * 2, 0);
  ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'].forEach((col, i) => g.addColorStop(i / 6, col));
  ctx.fillStyle = g; ctx.rotate(20 * Math.PI / 180); ctx.fillRect(7, 0, size * 2, 16);
  return { brush: c, offset: size / 2 };
}

function rainbowDoughnut() {
  const size = 32 * brushScale(), r = size / 3, xc = size / 2, yc = size / 2;
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  const cols = ['#0F0', '#0FF', '#F00', '#FF0', '#F0F'], part = TAU / cols.length;
  cols.forEach((col, i) => {
    const a = i * part;
    const g = ctx.createLinearGradient(xc + Math.cos(a) * r, yc + Math.sin(a) * r, xc + Math.cos(a + part) * r, yc + Math.sin(a + part) * r);
    g.addColorStop(0, col); g.addColorStop(1, cols[(i + 1) % cols.length]);
    ctx.beginPath(); ctx.strokeStyle = g; ctx.lineWidth = size / 4; ctx.arc(xc, yc, r, a, a + part); ctx.stroke();
  });
  return { brush: c, offset: size / 2 };
}

// Drops land anywhere on the canvas, not under the pointer.
function raindrops(color) {
  const size = (5 + 100 * Math.random()) * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  ctx.beginPath(); ctx.arc(size, size, size / 2, 0, TAU); ctx.fillStyle = color; ctx.fill();
  return { brush: c, abspos: { x: rand(-5, W + 5), y: rand(-5, H + 5) } };
}

function splatters() {
  const size = 27 * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  for (let i = 0; i < 2 + randInt(1, 3); i++) {
    ctx.beginPath(); ctx.arc(size + rand(-size / 2, size / 2), size + rand(-size / 2, size / 2), rand(1, 7), 0, TAU);
    ctx.fillStyle = randomAllColor(); ctx.fill();
  }
  return { brush: c, offset: size };
}

function triangles() {
  const size = 35 * brushScale();
  const [c, ctx] = makeCanvas(size * 2, size * 2);
  for (let i = 0; i < 1 + randInt(1, 3); i++) {
    ctx.beginPath(); ctx.moveTo(rand(0, size), rand(0, size));
    ctx.lineTo(rand(0, size), rand(0, size)); ctx.lineTo(rand(0, size), rand(0, size)); ctx.closePath();
    ctx.fillStyle = randomAllColor(); ctx.fill();
  }
  return { brush: c, offset: size / 2 };
}

// Button order. img = kmpix icon in assets/brushes/, icon = emoji fallback where kmpix has none.
// spacing (kmpix px, scaled) = min pointer travel between stamps;
// anim (ms) = keep stamping on a timer while the pointer is held, like kmpix AnimBrush.
const BRUSHES = {
  leaky:     { name: 'Leaky Pen',         img: 'tool-menu-wacky-brush-70.png', anim: 30,    make: (c, s, p, d) => leakyPen(c, d) },
  dots:      { name: 'Dots',              img: 'tool-menu-wacky-brush-72.png', spacing: 22, make: c => circles(c) },
  rdots:     { name: 'Rainbow Dots',      icon: '🔴', spacing: 22, make: rcircles },
  bubbly:    { name: 'Bubbly',            img: 'tool-menu-wacky-brush-73.png', anim: 30,    make: bubbles },
  pies:      { name: 'Pies',              img: 'tool-menu-wacky-brush-74.png', spacing: 40, make: pies },
  echoes:    { name: 'Echoes',            img: 'tool-menu-wacky-brush-75.png', spacing: 1,  make: concentric },
  numbers:   { name: 'Connect The Dots',  img: 'tool-menu-wacky-brush-84.png', spacing: 25, make: (c, s, p) => connectTheDots(c, p) },
  swirl:     { name: 'Swirl',             img: 'tool-menu-wacky-brush-86.png', spacing: 1,  make: twirly },
  rotating:  { name: 'Rotating Dots',     img: 'br12.png', spacing: 1,  make: followingSine },
  pentagon:  { name: 'Rotating Pentagon', icon: '⬠',  spacing: 1,  make: rotatingPentagon },
  rose:      { name: 'Rose',              img: 'br10.png', spacing: 1,  make: rose },
  splatter:  { name: 'Splatter Paint',    img: 'tool-menu-wacky-brush-91.png', anim: 100,   make: splatters },
  triangles: { name: 'Triangles',         icon: '🔺', anim: 100,   make: triangles },
  raindrops: { name: 'Raindrops',         img: 'tool-submenu-wacky-mixer-165.png', anim: 50,    make: () => raindrops(randomAllColor()) },
  rainbow:   { name: 'Rainbow Bar',       icon: '🌈', spacing: 1,  make: rainbowBar },
  doughnut:  { name: 'Rainbow Doughnut',  icon: '🍩', spacing: 8,  make: rainbowDoughnut },
  ball:      { name: 'Rainbow Ball',      img: 'br21.png', spacing: 8,  make: rainbowBall },
  spray:     { name: 'Spray',             img: 'br7.png', spacing: 1,  make: spray },
  icy:       { name: 'Icy',               icon: '❄️', spacing: 1,  make: icy },
  dumbbell:  { name: 'Dumbbell',          icon: '🏋️', spacing: 1,  make: dumbbell },
};

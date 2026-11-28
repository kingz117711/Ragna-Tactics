// Render every skill flourish to a PNG contact sheet with no browser.
// Usage: node tools/fx-preview.mjs [out.png]
// The rasteriser is a tiny anti-aliased canvas shim (strokes, ellipses, arcs) —
// just enough to eyeball that each FX reads as its own shape.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { FX_IDS } from '../src/data.js';
import { Renderer } from '../src/renderer.js';

const W = 1040, H = 660, CELL = 200, COLS = 5, ROWS = 3;

// ---- minimal 2D context ----------------------------------------------------
const WIDTH = W * 2, HEIGHT = H * 2;                       // supersample ×2
const px = new Float32Array(WIDTH * HEIGHT * 3).fill(0.06);
const bg = [0.11, 0.16, 0.15];
for (let i = 0; i < WIDTH * HEIGHT; i++) px.set(bg, i * 3);

const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const state = { m: [1, 0, 0, 1, 0, 0], alpha: 1, stroke: '#ffffff', fill: '#ffffff', lineWidth: 1 };
const stack = [];
const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const apply = (x, y) => [state.m[0] * x + state.m[2] * y + state.m[4], state.m[1] * x + state.m[3] * y + state.m[5]];
function blend(x, y, rgb, a) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 3, k = a * state.alpha;
  for (let c = 0; c < 3; c++) px[i + c] += (rgb[c] - px[i + c]) * k;
}
function drawShape(path, kind, rgb) {
  // Sample every pixel in the bounding box; supersampling smooths the edges.
  const [minX, minY] = [Math.max(0, Math.floor(path.minX)), Math.max(0, Math.floor(path.minY))];
  const [maxX, maxY] = [Math.min(WIDTH - 1, Math.ceil(path.maxX)), Math.min(HEIGHT - 1, Math.ceil(path.maxY))];
  const half = (state.lineWidth * Math.hypot(state.m[0], state.m[1])) / 2;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    let covered = 0, inside = 0;
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const [, d] = path.distance(x + (sx + 0.5) / 2, y + (sy + 0.5) / 2);
      if (d <= 0) inside++;
      if (d <= half) covered++;
    }
    if (kind === 'fill' && inside) blend(x, y, rgb, inside / 4);
    if (kind === 'stroke' && covered) blend(x, y, rgb, covered / 4);
  }
}
// Flattened primitives keep signed distance exact and cheap.
function linePath(x0, y0, x1, y1) {
  const [ax, ay] = apply(x0, y0), [bx, by] = apply(x1, y1);
  return { minX: Math.min(ax, bx) - 4, maxX: Math.max(ax, bx) + 4, minY: Math.min(ay, by) - 4, maxY: Math.max(ay, by) + 4,
    distance(x, y) { const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy; const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0; return [0, Math.hypot(x - ax - dx * t, y - ay - dy * t)]; } };
}
function ellipsePath(cx, cy, rx, ry, from, to) {
  const steps = 96, pts = [];
  for (let i = 0; i <= steps; i++) { const a = from + (to - from) * i / steps; pts.push(apply(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)); }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { minX: Math.min(...xs) - 4, maxX: Math.max(...xs) + 4, minY: Math.min(...ys) - 4, maxY: Math.max(...ys) + 4,
    distance(x, y) { let best = Infinity; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy; const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0; best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } return [0, best]; } };
}
const ctx = {
  save() { stack.push({ ...state, m: [...state.m] }); },
  restore() { Object.assign(state, stack.pop()); },
  translate(x, y) { state.m = mul(state.m, [1, 0, 0, 1, x, y]); },
  scale(x, y) { state.m = mul(state.m, [x, 0, 0, y, 0, 0]); },
  set globalAlpha(v) { state.alpha = v; }, get globalAlpha() { return state.alpha; },
  set strokeStyle(v) { state.stroke = v; }, get strokeStyle() { return state.stroke; },
  set fillStyle(v) { state.fill = v; }, get fillStyle() { return state.fill; },
  set lineWidth(v) { state.lineWidth = v; }, get lineWidth() { return state.lineWidth; },
  set lineCap(v) {}, set lineJoin(v) {},
  beginPath() { state.path = []; }, closePath() {},
  moveTo(x, y) { state.last = [x, y]; }, lineTo(x, y) { state.path.push(linePath(...state.last, x, y)); state.last = [x, y]; },
  arc(cx, cy, r, from, to) { state.path.push(ellipsePath(cx, cy, r, r, from, to)); },
  ellipse(cx, cy, rx, ry, _rot, from, to) { state.path.push(ellipsePath(cx, cy, rx, ry, from, to)); },
  stroke() { const rgb = hexRgb(state.stroke); for (const p of state.path) drawShape(p, 'stroke', rgb); },
  fill() { const rgb = hexRgb(state.fill); for (const p of state.path) drawShape(p, 'fill', rgb); },
};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

// ---- sheet -----------------------------------------------------------------
const renderer = new Renderer({ width: W, height: H, getContext: () => ctx }, {});
FX_IDS.forEach((fx, i) => {
  const ox = (i % COLS) * CELL + CELL / 2, oy = Math.floor(i / COLS) * CELL + CELL / 2 + 10;
  ctx.save(); ctx.translate(ox, oy);
  // A faint ground marker shows where the unit stands.
  ctx.strokeStyle = '#39544b'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 13, 0, 0, Math.PI * 2); ctx.stroke();
  renderer.traceSkillFx(ctx, fx, 0.45, 0.45, 10 + 0.45 * 34, 1, 1, '#ffe9bd');
  ctx.restore();
});

// ---- PNG -------------------------------------------------------------------
// Box-filter the supersampled buffer down to the sheet's real size.
const OUT_W = W, OUT_H = H, SS = 2;
const out = Buffer.alloc(OUT_W * OUT_H * 4);
for (let y = 0; y < OUT_H; y++) for (let x = 0; x < OUT_W; x++) {
  let r = 0, g = 0, b = 0;
  for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
    const i = ((y * SS + sy) * WIDTH + x * SS + sx) * 3;
    r += px[i]; g += px[i + 1]; b += px[i + 2];
  }
  const o = (y * OUT_W + x) * 4, n = SS * SS;
  out[o] = Math.round(Math.min(1, r / n) * 255);
  out[o + 1] = Math.round(Math.min(1, g / n) * 255);
  out[o + 2] = Math.round(Math.min(1, b / n) * 255);
  out[o + 3] = 255;
}
const raw = Buffer.alloc((OUT_W * 4 + 1) * OUT_H);
for (let y = 0; y < OUT_H; y++) out.copy(raw, y * (OUT_W * 4 + 1) + 1, y * OUT_W * 4, (y + 1) * OUT_W * 4);
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
};
let table;
function crc32(buf) {
  if (!table) { table = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(OUT_W, 0); ihdr.writeUInt32BE(OUT_H, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
const target = process.argv[2] || 'artifacts/skill-fx.png';
writeFileSync(target, png);
console.log(`Wrote ${target} with ${FX_IDS.length} flourishes: ${FX_IDS.join(', ')}`);

import { MAPS, MONSTERS, STEP, mapBounds } from './data.js';
import { stats } from './sim.js';
export const project = (x, y) => ({ x: (x - y) * 22, y: (x + y) * 11 });
export const unproject = (x, y) => ({ x: (x / 22 + y / 11) / 2, y: (y / 11 - x / 22) / 2 });
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
// Scenery reaches one world unit past the playable bounds, as before.
const visual = mapId => { const b = mapBounds(mapId); return { x: b.x + 1, y: b.y + 1 }; };
const CHUNK = 8;          // world units per cached terrain chunk
const CHUNK_CACHE = 96;  // bounded LRU; >= the largest map's full-view chunk count (meadow ≈63)
const CELL = 4;           // world units per ground tile cell

// Shared with tests so click→world math always matches the live camera fit.
export function fitZoom(mapId, width, height) {
  const b = visual(mapId);
  const halfW = (b.x + b.y) * 22, halfH = (b.x + b.y) * 11;
  return clamp(Math.min(width / (halfW * 2 + 102), (height - 100) / (halfH * 2 + 96)), 0.2, 1.15);
}
function polygon(ctx, points, fill, stroke) {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, color, stroke) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (color) { ctx.fillStyle = color; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function chunkSeed(mapId, cx, cy) {
  let h = 2166136261;
  for (let i = 0; i < mapId.length; i++) { h ^= mapId.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= (cx + 977) * 73856093 ^ (cy + 977) * 19349663;
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13;
  return (h >>> 0) || 1;
}
const rngFrom = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const segmentDistance = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const t = len ? clamp(((px - ax) * dx + (py - ay) * dy) / len, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
};
function roadDistance(map, x, y) {
  if (!map.road) return Infinity;
  let best = Infinity;
  for (const line of map.road) for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i], [bx, by] = line[i + 1];
    best = Math.min(best, segmentDistance(x, y, ax, ay, bx, by));
  }
  return best;
}
// Minimap landmark glyph colours, grouped so the compact map stays readable.
function landmarkColor(id) {
  if (/^(house|tower)/.test(id)) return '#dec58e';
  if (/^tree/.test(id)) return '#8fc76a';
  if (/(stone|shrine|ruin|tomb)/.test(id)) return '#c7a6e0';
  if (/^torii/.test(id)) return '#e07a6a';
  if (/^bridge/.test(id)) return '#6fb6d8';
  if (/(pier|river_stone|post)/.test(id)) return '#7fd0c0';
  if (/^rock/.test(id)) return '#b6a98c';
  return '#b6a98c';
}
// The classic winding field road, kept for the older maps.
function legacyRoadPoints() {
  return [-17, -12, -5, 3, 10, 17].map((y, i) => project(Math.sin(i * 0.8) * 3, y));
}

export class Renderer {
  constructor(canvas, sprites) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.sprites = sprites;
    this.camera = { x: 0, y: 0, zoom: 0.8 }; this.mapId = 'meadow'; this.terrain = new Map(); this.pinned = new Set(); this.hits = []; this.animations = new Map();
    this.width = 1000; this.height = 650; this.followId = null; this.grid = false;
    this.orderMarks = []; this.renderPositions = new Map(); this.positionTime = null; this.positionMap = null;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas);
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = r.width; this.height = r.height; this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr;
    if (!this.initialized && r.width > 0) { this.fit(); this.initialized = true; }
  }
  fit() {
    this.camera = { x: 0, y: 0, zoom: fitZoom(this.mapId, this.width, this.height) };
    this.followId = null;
  }
  // Camera stays inside the visual diamond of the current map.
  clampCamera() {
    const b = visual(this.mapId);
    this.camera.x = clamp(this.camera.x, -(b.x + b.y) * 22, (b.x + b.y) * 22);
    this.camera.y = clamp(this.camera.y, -(b.x + b.y) * 11, (b.x + b.y) * 11);
  }
  centerOn(point) {
    const b = mapBounds(this.mapId);
    const p = project(clamp(point.x, -b.x, b.x), clamp(point.y, -b.y, b.y));
    this.camera.x = p.x; this.camera.y = p.y; this.followId = null;
    this.clampCamera();
  }
  screen(p) { const q = project(p.x, p.y); return { x: this.width / 2 + (q.x - this.camera.x) * this.camera.zoom, y: this.height / 2 + 20 + (q.y - this.camera.y) * this.camera.zoom }; }
  world(x, y) { return unproject((x - this.width / 2) / this.camera.zoom + this.camera.x, (y - this.height / 2 - 20) / this.camera.zoom + this.camera.y); }
  zoom(delta, x = this.width / 2, y = this.height / 2) {
    const before = this.world(x, y); this.camera.zoom = clamp(this.camera.zoom * delta, 0.2, 1.8);
    const after = this.world(x, y), a = project(before.x, before.y), b = project(after.x, after.y);
    this.camera.x += a.x - b.x; this.camera.y += a.y - b.y;
    this.clampCamera();
  }
  pan(dx, dy) {
    this.followId = null;
    this.camera.x -= dx / this.camera.zoom; this.camera.y -= dy / this.camera.zoom;
    this.clampCamera();
  }
  hit(x, y) { return [...this.hits].reverse().find(h => Math.hypot(x - h.x, (y - h.y) * 0.8) < h.radius); }
  // Brief world-space confirmation for an accepted Move / Hunt order. Distinct
  // from the DOM press pulse: this marks the actual destination on the field.
  pulseOrder(mapId, point, kind = 'move') {
    this.orderMarks = this.orderMarks.filter(m => !(m.mapId === mapId && m.x === point.x && m.y === point.y));
    this.orderMarks.push({ mapId, x: point.x, y: point.y, kind, started: performance.now() });
    if (this.orderMarks.length > 12) this.orderMarks.shift();
  }

  /* ---------- chunked terrain ---------- */
  chunkRect(mapId, cx, cy) {
    const v = visual(mapId);
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    return { x0, y0, x1: x0 + CHUNK, y1: y0 + CHUNK, vx: v.x, vy: v.y };
  }
  chunkCanvas(mapId, cx, cy) {
    const key = `${mapId}:${cx}:${cy}`;
    const cached = this.terrain.get(key);
    if (cached) { this.terrain.delete(key); this.terrain.set(key, cached); this.pinned.add(key); return cached; }
    const cv = this.renderChunk(mapId, cx, cy);
    this.terrain.set(key, cv);
    this.pinned.add(key);
    while (this.terrain.size > CHUNK_CACHE) this.evictChunk();
    return cv;
  }
  // Keep on-screen chunks resident; evict off-screen cache entries first so a
  // pan never thrashes the very chunks the camera is reading.
  evictChunk() {
    for (const key of this.terrain.keys()) if (!this.pinned.has(key)) { this.terrain.delete(key); return; }
    this.terrain.delete(this.terrain.keys().next().value);
  }
  // 0 = full detail, 1 = tiles only, 2 = low-detail overview (wide zoom).
  detailLevel() { const z = this.camera.zoom; return z < 0.5 ? 2 : z < 0.85 ? 1 : 0; }
  overviewColor(mapId) {
    return mapId === 'payon' ? '#504859' : ['morroc', 'lair'].includes(mapId) ? '#be9967'
      : mapId === 'arena' ? '#555b5a' : mapId === 'forest' ? '#436352' : '#6b8959';
  }
  // Pin the visible set plus its prefetch ring, and keep chunks already pinned
  // that still sit within a 2-chunk margin. Replacing the set each frame would
  // unpin the ring just rendered, letting the bounded cache evict it before the
  // camera reaches it (pan thrash). Sticky pinning keeps the ring resident.
  updatePins(keys) {
    const keep = new Set(keys);
    const v = visual(this.mapId);
    for (const key of this.pinned) {
      const [, cx, cy] = key.split(':');
      const x = Number(cx) * CHUNK, y = Number(cy) * CHUNK;
      if (Math.abs(x) <= v.x + 2 * CHUNK && Math.abs(y) <= v.y + 2 * CHUNK) keep.add(key);
    }
    this.pinned = keep;
  }
  // Render a one-chunk ring around the visible set so pans meet ready canvases.
  prefetch() {
    const margin = 1, v = visual(this.mapId), seen = new Set();
    for (const [cx, cy] of this.visibleChunks()) for (let dy = -margin; dy <= margin; dy++) for (let dx = -margin; dx <= margin; dx++) {
      const nx = cx + dx, ny = cy + dy;
      if (Math.abs(nx * CHUNK) > v.x + CHUNK || Math.abs(ny * CHUNK) > v.y + CHUNK) continue;
      const key = nx + ',' + ny;
      if (seen.has(key)) continue; seen.add(key);
      this.chunkCanvas(this.mapId, nx, ny);
    }
  }
  renderChunk(mapId, cx, cy) {
    const r = this.chunkRect(mapId, cx, cy);
    const corners = [project(r.x0, r.y0), project(r.x1, r.y0), project(r.x1, r.y1), project(r.x0, r.y1)];
    const minX = Math.floor(Math.min(...corners.map(p => p.x))), maxX = Math.ceil(Math.max(...corners.map(p => p.x)));
    const minY = Math.floor(Math.min(...corners.map(p => p.y))), maxY = Math.ceil(Math.max(...corners.map(p => p.y)));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, maxX - minX); cv.height = Math.max(1, maxY - minY);
    const ctx = cv.getContext('2d');
    ctx.translate(-minX, -minY);
    ctx.save();
    polygon(ctx, corners);
    ctx.clip();
    this.paintChunkGround(ctx, mapId, r);
    ctx.restore();
    cv._minX = minX; cv._minY = minY;
    return cv;
  }
  paintChunkGround(ctx, mapId, r) {
    const layout = this.sprites.layout?.(mapId);
    const cave = mapId === 'payon', arena = mapId === 'arena', forest = mapId === 'forest';
    const dunes = ['morroc', 'lair'].includes(mapId), meadow = mapId === 'meadow';
    const base = cave ? '#504859' : dunes ? '#be9967' : arena ? '#555b5a' : forest ? '#436352' : '#6b8959';
    ctx.fillStyle = base;
    ctx.fillRect(r.x0 - 2, r.y0 - 2, r.x1 - r.x0 + 4, r.y1 - r.y0 + 4);
    // Global ground features are drawn whole inside every chunk clip so they
    // continue seamlessly across chunk borders.
    this.paintGlobalGround(ctx, mapId, r);
    const lod = this.detailLevel();
    if (lod >= 2) return; // Wide zoom: low-detail overview, no per-cell work.
    if (meadow) this.paintTileCells(ctx, mapId, r, layout);
    if (lod >= 1) return; // Medium zoom: tiles, no scattered ground specks.
    this.paintGroundDetail(ctx, mapId, r, cave, arena, forest, dunes, meadow);
  }
  paintGlobalGround(ctx, mapId, r) {
    const cave = mapId === 'payon', arena = mapId === 'arena', forest = mapId === 'forest';
    const dunes = ['morroc', 'lair'].includes(mapId), meadow = mapId === 'meadow';
    if (meadow) {
      const layout = this.sprites.layout?.(mapId);
      if (layout) { this.paintLayoutGround(ctx, layout); return; }
      const map = MAPS.meadow;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const line of map.road) {
        const pts = line.map(([x, y]) => project(x, y));
        for (const [width, color] of [[54, '#263e2830'], [38, '#b7b18a'], [26, '#c9c29c']]) {
          ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
        }
      }
      for (const zone of map.zones || []) {
        const p = project(zone.x, zone.y);
        ellipse(ctx, p.x, p.y, zone.r * Math.SQRT2 * 22, zone.r * Math.SQRT2 * 11, zone.kind === 'poring' ? '#d8e9b80a' : '#c9d98f0a');
      }
      return;
    }
    const road = legacyRoadPoints();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [width, color] of [[102, '#263e2830'], [74, cave ? '#655d71' : arena ? '#707272' : forest ? '#8d9271' : '#b7b18a'], [55, cave ? '#797180' : arena ? '#7d7e77' : forest ? '#9da07d' : '#c4bd96']]) {
      ctx.beginPath(); road.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    if (cave) {
      const mouth = project(-3, -13);
      ellipse(ctx, mouth.x, mouth.y, 50, 26, '#61566b'); ellipse(ctx, mouth.x, mouth.y + 2, 32, 17, '#262531');
      for (const [x, y] of [[-4, -11], [5, -4], [-4, 4], [5, 12]]) {
        const p = project(x, y), glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 65);
        glow.addColorStop(0, '#ffc87380'); glow.addColorStop(1, '#ffc87300');
        ellipse(ctx, p.x, p.y, 65, 34, glow); ellipse(ctx, p.x, p.y - 4, 4, 6, '#f7c56c');
      }
    }
    if (mapId === 'lair') {
      for (let i = 6; i > 0; i--) {
        const radius = 34 + i * 32;
        ellipse(ctx, 0, 6, radius, radius / 2, i % 2 ? '#956e49' : '#a57d54', '#c49464');
      }
      ellipse(ctx, 0, 6, 54, 27, '#78573c');
    }
    if (arena) {
      ellipse(ctx, 0, 0, 210, 105, '#5e6268', '#a1a0a066'); ellipse(ctx, 0, 0, 184, 92, null, '#b4a57c77');
      for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2, x = Math.cos(angle) * 188, y = Math.sin(angle) * 94;
        ctx.fillStyle = '#b1aa8955'; ctx.fillRect(x - 4, y - 2, 8, 4);
      }
    }
  }
  // Authored South Prontera overlays: shoreline, branching road, hunting
  // districts. Drawn whole inside each chunk clip so they stay seamless.
  paintLayoutGround(ctx, layout) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (layout.shoreline?.length) {
      const pts = layout.shoreline.map(([x, y]) => project(x, y));
      polygon(ctx, pts, '#2c5f782e', '#4a86a877');
    }
    for (const road of layout.roads) {
      const pts = road.points.map(([x, y]) => project(x, y));
      for (const [width, color] of [[54, '#263e2830'], [38, '#b7b18a'], [26, '#c9c29c']]) {
        ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
      }
    }
    for (const zone of layout.zones) {
      const p = project(zone.x, zone.y);
      ellipse(ctx, p.x, p.y, zone.r * Math.SQRT2 * 22, zone.r * Math.SQRT2 * 11, /fabre/i.test(zone.name) ? '#c9d98f0a' : '#d8e9b80a');
    }
  }
  paintTileCells(ctx, mapId, r, layout) {
    const map = MAPS[mapId];
    const terrain = this.sprites.index?.terrain;
    const tiles = terrain?.tiles;
    if (!tiles) return;
    const cx0 = Math.floor(r.x0 / CELL), cx1 = Math.ceil(r.x1 / CELL);
    const cy0 = Math.floor(r.y0 / CELL), cy1 = Math.ceil(r.y1 / CELL);
    for (let gy = cy0; gy < cy1; gy++) for (let gx = cx0; gx < cx1; gx++) {
      const wx = gx * CELL + CELL / 2, wy = gy * CELL + CELL / 2;
      let name;
      if (layout) {
        // Authored Tiled layout wins; fall back to the procedural rule only for
        // cells the layout leaves empty (edges of the authored grid).
        const col = Math.round((gx * CELL - layout.origin.x) / layout.cell);
        const row = Math.round((gy * CELL - layout.origin.y) / layout.cell);
        name = layout.tiles[col + ',' + row] || null;
      }
      if (!name) {
        if (roadDistance(map, wx, wy) <= 2.1) name = 'dirt_path';
        else {
          const zone = (map.zones || []).find(z => Math.hypot(wx - z.x, wy - z.y) <= z.r * 0.9);
          if (zone) name = zone.kind === 'poring' ? 'grass_blossom' : 'grass_olive';
          else {
            const h = chunkSeed(mapId, gx, gy);
            name = (h % 100) < 68 ? 'grass_blossom' : 'grass_olive';
          }
        }
      }
      const img = this.sprites.tile(name);
      if (!img) continue;
      const O = project(gx * CELL, gy * CELL);
      const u = project(gx * CELL + CELL, gy * CELL), v = project(gx * CELL, gy * CELL + CELL);
      const ux = u.x - O.x, uy = u.y - O.y, vx = v.x - O.x, vy = v.y - O.y;
      ctx.save();
      ctx.transform(ux / img.width, uy / img.width, vx / img.height, vy / img.height, O.x, O.y);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
  }
  paintGroundDetail(ctx, mapId, r, cave, arena, forest, dunes, meadow) {
    const rng = rngFrom(chunkSeed(mapId, Math.round(r.x0 / CHUNK), Math.round(r.y0 / CHUNK)));
    const area = (r.x1 - r.x0) * (r.y1 - r.y0);
    const count = Math.round(area * (meadow ? 2.2 : 7.3));
    for (let i = 0; i < count; i++) {
      const x = r.x0 + rng() * (r.x1 - r.x0), y = r.y0 + rng() * (r.y1 - r.y0), p = project(x, y), roll = rng();
      if (!meadow && Math.abs(x) < 3.5) continue;
      if (meadow && roadDistance(MAPS.meadow, x, y) <= 2.4) continue;
      ctx.globalAlpha = 0.06 + rng() * 0.12;
      if (meadow) {
        // Blossom/pebble accents; denser flower specks inside the Poring Meadow.
        const zone = (MAPS.meadow.zones || []).find(z => Math.hypot(x - z.x, y - z.y) <= z.r);
        ellipse(ctx, p.x, p.y, 3 + rng() * 9, 1.5 + rng() * 4, roll > 0.55 ? '#c3d58e' : '#203e32');
        if (zone?.kind === 'poring' && rng() > 0.72) ellipse(ctx, p.x, p.y - 3, 2.5, 1.7, rng() > 0.5 ? '#ebdab0' : '#c8a7b3');
        else if (rng() > 0.93) ellipse(ctx, p.x, p.y - 2, 2, 1.4, '#d9e6ae');
        continue;
      }
      ellipse(ctx, p.x, p.y, 4 + rng() * 19, 2 + rng() * 9, cave ? (roll > 0.5 ? '#92809a' : '#25222e') : arena ? (roll > 0.5 ? '#bbc0ae' : '#1b2532') : (roll > 0.5 ? '#c3d58e' : '#203e32'));
      ctx.globalAlpha = 1;
      if (dunes || cave) {
        ctx.lineWidth = cave ? 1.5 : 2; ctx.strokeStyle = cave ? '#aca5bb44' : '#e2bb8455';
        ctx.beginPath(); ctx.moveTo(p.x - 6, p.y); ctx.quadraticCurveTo(p.x, p.y - 3, p.x + 9, p.y); ctx.stroke();
      } else if (arena) {
        ctx.fillStyle = '#a1a69a45'; ctx.fillRect(p.x, p.y, 3 + rng() * 7, 1 + rng() * 3);
      } else {
        ctx.strokeStyle = rng() > 0.4 ? '#b7ca8160' : '#254e3590'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x - 3, p.y); ctx.lineTo(p.x - 5, p.y - 5); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 1, p.y - 7); ctx.moveTo(p.x + 3, p.y); ctx.lineTo(p.x + 6, p.y - 3); ctx.stroke();
        if (forest && rng() > 0.9) ellipse(ctx, p.x, p.y - 3, 2.5, 1.7, rng() > 0.5 ? '#ebdab0' : '#c8a7b3');
      }
    }
    ctx.globalAlpha = 1;
  }
  visibleChunks() {
    const corners = [this.world(0, 0), this.world(this.width, 0), this.world(this.width, this.height), this.world(0, this.height)];
    const minX = Math.min(...corners.map(p => p.x)) - CHUNK, maxX = Math.max(...corners.map(p => p.x)) + CHUNK;
    const minY = Math.min(...corners.map(p => p.y)) - CHUNK, maxY = Math.max(...corners.map(p => p.y)) + CHUNK;
    const v = visual(this.mapId);
    const cx0 = Math.max(Math.floor(-v.x / CHUNK), Math.floor(minX / CHUNK));
    const cx1 = Math.min(Math.ceil(v.x / CHUNK), Math.ceil(maxX / CHUNK));
    const cy0 = Math.max(Math.floor(-v.y / CHUNK), Math.floor(minY / CHUNK));
    const cy1 = Math.min(Math.ceil(v.y / CHUNK), Math.ceil(maxY / CHUNK));
    const list = [];
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) list.push([cx, cy]);
    return list;
  }

  /* ---------- scenery props ---------- */
  sceneryList() {
    const map = MAPS[this.mapId], terrain = this.sprites.index?.terrain;
    if (!terrain) return [];
    const authored = (map.scenery?.props || []).map(p => ({ ...p, id: p.id }));
    // Deterministic border ring just outside the playable bounds.
    const b = mapBounds(this.mapId), border = map.scenery?.border || [];
    if (border.length) {
      const slots = [];
      const perSide = Math.ceil((b.x + b.y) / 3.2);
      for (let i = 0; i < perSide; i++) {
        const t = (i / perSide) * 4; // 0..4 around the rectangle
        const side = Math.floor(t), f = t - side;
        let x, y;
        if (side === 0) { x = -b.x + f * 2 * b.x; y = -b.y - 0.7; }
        else if (side === 1) { x = b.x + 0.7; y = -b.y + f * 2 * b.y; }
        else if (side === 2) { x = b.x - f * 2 * b.x; y = b.y + 0.7; }
        else { x = -b.x - 0.7; y = b.y - f * 2 * b.y; }
        const h = chunkSeed(this.mapId, i, side * 31);
        if (h % 100 < 34) continue;
        const id = border[(h >>> 8) % border.length];
        const jitter = ((h >>> 16) % 100) / 100 - 0.5;
        if (side % 2 === 0) x += jitter * 2.4; else y += jitter * 2.4;
        slots.push({ id, x, y, scale: 0.85 + ((h >>> 24) % 40) / 100 });
      }
      authored.push(...slots);
    }
    return authored.filter(p => terrain.props[p.id]);
  }
  drawScenery(ctx, s) {
    const terrain = this.sprites.index?.terrain;
    if (!terrain) return;
    const corners = [this.world(0, 0), this.world(this.width, 0), this.world(this.width, this.height), this.world(0, this.height)];
    const minX = Math.min(...corners.map(p => p.x)) - 6, maxX = Math.max(...corners.map(p => p.x)) + 6;
    const minY = Math.min(...corners.map(p => p.y)) - 6, maxY = Math.max(...corners.map(p => p.y)) + 6;
    const props = this.sceneryList().filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
    // Authored landmarks from the Tiled layout join the placed scenery.
    const layout = this.sprites.layout?.(this.mapId);
    if (layout) for (const lm of layout.landmarks) props.push({ id: lm.id, x: lm.x, y: lm.y, scale: lm.scale });
    props.sort((a, b) => a.x + a.y - b.x - b.y);
    for (const prop of props) {
      const rec = terrain.props[prop.id], img = this.sprites.prop(prop.id);
      if (!rec || !img) continue;
      const p = project(prop.x, prop.y), scale = 0.7 * (prop.scale || 1);
      ctx.save();
      ellipse(ctx, p.x, p.y + 2, rec.w * scale * 0.24, rec.w * scale * 0.1, '#0c201e40');
      ctx.drawImage(img, p.x - rec.anchorX * scale, p.y - rec.anchorY * scale, rec.w * scale, rec.h * scale);
      ctx.restore();
    }
  }

  syncRenderPositions(s) {
    const heroes = s.characters.filter(c => c.mapId === this.mapId && c.hp > 0);
    const entities = [...heroes.map(unit => ({ unit, hero: true })),
      ...s.maps[this.mapId].monsters.filter(unit => unit.hp > 0).map(unit => ({ unit, hero: false }))];
    if (this.positionTime !== s.time || this.positionMap !== this.mapId) {
      const next = new Map();
      for (const { unit } of entities) {
        const previous = this.renderPositions.get(unit.id);
        next.set(unit.id, {
          fromX: previous?.x ?? unit.x, fromY: previous?.y ?? unit.y,
          x: unit.x, y: unit.y,
        });
      }
      this.renderPositions = next; this.positionTime = s.time; this.positionMap = this.mapId;
    }
    return entities;
  }
  entityPosition(unit, alpha) {
    const p = this.renderPositions.get(unit.id);
    if (!p) return unit;
    return { x: p.fromX + (p.x - p.fromX) * alpha, y: p.fromY + (p.y - p.fromY) * alpha };
  }

  /* ---------- main draw ---------- */
  draw(s, selected, hovered, frameRemainder = 0, huntPreview = null) {
    const ctx = this.ctx, z = this.camera.zoom, map = s.maps[this.mapId], now = performance.now();
    const entities = this.syncRenderPositions(s);
    const alpha = clamp(frameRemainder / STEP, 0, 1);
    if (this.followId) { const c = s.characters.find(c => c.id === this.followId && c.mapId === this.mapId); if (c) { const p = project(c.x, c.y); this.camera.x += (p.x - this.camera.x) * 0.08; this.camera.y += (p.y - this.camera.y) * 0.08; } this.clampCamera(); }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createRadialGradient(this.width / 2, this.height / 2, 30, this.width / 2, this.height / 2, this.width * 0.75);
    bg.addColorStop(0, this.mapId === 'arena' ? '#253039' : '#233b32'); bg.addColorStop(1, '#101f22');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(this.width / 2 - this.camera.x * z, this.height / 2 + 20 - this.camera.y * z);
    ctx.scale(z, z);
    const vb = visual(this.mapId);
    const boundary = [project(-vb.x, -vb.y), project(vb.x, -vb.y), project(vb.x, vb.y), project(-vb.x, vb.y)];
    // Floating slab: dark underside, base plate, then clipped chunk ground.
    polygon(ctx, boundary.map(p => ({ x: p.x, y: p.y + 18 })), '#182e28');
    polygon(ctx, boundary, this.mapId === 'payon' ? '#504859' : ['morroc', 'lair'].includes(this.mapId) ? '#be9967' : this.mapId === 'arena' ? '#555b5a' : this.mapId === 'forest' ? '#436352' : '#6b8959', '#8aa47855');
    ctx.save();
    polygon(ctx, boundary);
    ctx.clip();
    const chunks = this.visibleChunks();
    this.updatePins(chunks.map(([cx, cy]) => this.mapId + ':' + cx + ':' + cy));
    // Draw one flat overview slab instead of rendering and compositing every
    // visible chunk canvas when the visible set would exceed the bounded cache
    // (wide zoom, or a large viewport). This keeps the overview cheap and stops
    // the cache from thrashing; detail returns as the camera zooms in enough that
    // the visible set fits within CHUNK_CACHE.
    if (this.detailLevel() >= 2 || chunks.length > CHUNK_CACHE) {
      ctx.fillStyle = this.overviewColor(this.mapId);
      polygon(ctx, boundary);
      ctx.fill();
    } else {
      this.prefetch();
      for (const [cx, cy] of chunks) {
        const cv = this.chunkCanvas(this.mapId, cx, cy);
        // 1px bleed hides antialiased seams between neighbouring chunk canvases.
        ctx.drawImage(cv, cv._minX, cv._minY, cv.width + 1, cv.height + 1);
      }
    }
    ctx.restore();
    if (this.grid) {
      const gb = mapBounds(this.mapId);
      ctx.strokeStyle = '#e7efd318'; ctx.lineWidth = 1 / z;
      for (let i = -gb.x; i <= gb.x; i += 2) for (const points of [[project(i, -gb.y), project(i, gb.y)], [project(-gb.x, i), project(gb.x, i)]]) {
        ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[1].x, points[1].y); ctx.stroke();
      }
    }
    for (const c of s.characters.filter(c => c.mapId === this.mapId && selected.has(c.id))) {
      const p = project(c.x, c.y);
      if (c.farmRadius && c.order === 'farm') {
        const h = project(c.home.x, c.home.y);
        ellipse(ctx, h.x, h.y, c.farmRadius * Math.SQRT2 * 22, c.farmRadius * Math.SQRT2 * 11, '#bfdfa212', '#d3e6b394');
      }
      if (c.destination) { const t = project(c.destination.x, c.destination.y); ctx.setLineDash([5, 7]); ctx.strokeStyle = '#e8ca88aa'; ctx.lineWidth = 1.5 / z; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(t.x, t.y); ctx.stroke(); ctx.setLineDash([]); ellipse(ctx, t.x, t.y, 13, 6, '#e8ca8830', '#e8ca88'); }
      if (c.order === 'hold') { const h = project(c.home.x, c.home.y); ellipse(ctx, h.x, h.y, 95, 47, '#e8ca8808', '#e8ca8860'); }
    }
    if (huntPreview && Math.abs(huntPreview.x) <= mapBounds(this.mapId).x && Math.abs(huntPreview.y) <= mapBounds(this.mapId).y) {
      const h = project(huntPreview.x, huntPreview.y), radius = huntPreview.radius * Math.SQRT2;
      ctx.save(); ctx.lineWidth = 1.5 / z; ctx.setLineDash([6 / z, 4 / z]);
      ellipse(ctx, h.x, h.y, radius * 22, radius * 11, '#efd38c18', '#ffdf92');
      ctx.restore();
    }
    this.drawScenery(ctx, s);
    this.drawZoneLabels(ctx, z);
    const telegraph = map.telegraph;
    if (telegraph) {
      const p = project(telegraph.x, telegraph.y), pulse = 0.24 + Math.sin(s.time * 10) * 0.08;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(22 * Math.SQRT2, 11 * Math.SQRT2);
      ctx.beginPath();
      ctx.arc(0, 0, telegraph.radius, 0, Math.PI * 2);
      if (telegraph.innerRadius) { ctx.moveTo(telegraph.innerRadius, 0); ctx.arc(0, 0, telegraph.innerRadius, 0, Math.PI * 2, true); }
      ctx.fillStyle = telegraph.markedId ? 'rgba(111,205,224,.35)' : `rgba(246,96,78,${pulse + 0.12})`;
      ctx.fill('evenodd');
      ctx.lineWidth = 0.1 / z;
      ctx.strokeStyle = telegraph.markedId ? '#c5f6ff' : '#ffd3ab';
      ctx.stroke();
      ctx.restore();
    }
    entities.sort((a, b) => a.unit.x + a.unit.y - b.unit.x - b.unit.y);
    this.hits = [];
    for (const { unit: c, hero } of entities) {
      const position = this.entityPosition(c, alpha);
      const p = project(position.x, position.y), screen = this.screen(position), isSelected = hero && selected.has(c.id);
      ctx.save(); ctx.translate(p.x, p.y);
      ellipse(ctx, 0, 1, hero ? 18 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 48 : 18, hero ? 8 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 20 : 8, '#0c201e45');
      if (isSelected || hovered === c.id) { ctx.lineWidth = 2 / z; ellipse(ctx, 0, 0, hero ? 23 : 28, hero ? 10 : 12, isSelected ? '#e4cc8720' : '#e9866f18', hero ? '#edd79b' : '#e9866f'); }
      const route = c.stance + c.direction, previous = this.animations.get(c.id);
      if (!previous || previous.route !== route) this.animations.set(c.id, { route, started: s.time });
      const ms = Math.max(0, s.time + frameRemainder - this.animations.get(c.id).started) * 1000;
      if (hero) this.sprites.hero(ctx, c, ms); else this.sprites.monster(ctx, c, ms);
      const barY = hero ? -80 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? -115 : c.kind === 'willow' ? -83 : -44;
      if (hero || hovered === c.id || c.hp < MONSTERS[c.kind].hp) {
        const width = hero ? 43 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 82 : 36;
        ctx.fillStyle = '#132525'; ctx.fillRect(-width / 2 - 1, barY - 1, width + 2, 6);
        ctx.fillStyle = hero ? '#afc790' : '#d48b77'; ctx.fillRect(-width / 2, barY, width * Math.max(0, c.hp / (hero ? stats(c).hp : MONSTERS[c.kind].hp)), 4);
      }
      if (hero || hovered === c.id) {
        ctx.font = `${11 / Math.max(z, 0.65)}px 'Segoe UI', sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = hero ? '#fff4d7' : '#ead3bd'; ctx.shadowColor = '#102421'; ctx.shadowBlur = 5; ctx.fillText(hero ? c.name : MONSTERS[c.kind].name, 0, barY - 7); ctx.shadowBlur = 0;
        if (hero && c.partyId) { ctx.fillStyle = '#e0c48b'; ctx.fillRect(-3, 10, 6, 3); }
      }
      ctx.restore();
      this.hits.push({ id: c.id, hero, x: screen.x, y: screen.y - (hero ? 25 : 15) * z, radius: Math.max(14, (hero ? 28 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 65 : 25) * z) });
    }
    this.drawOrderMarks(ctx, now, z);
    for (const e of s.effects) {
      if (e.mapId && e.mapId !== this.mapId) continue;
      const p = project(e.x, e.y); ctx.save(); ctx.globalAlpha = Math.min(1, e.life * 2); ctx.font = `600 ${e.kind === 'skill' ? 12 : 15}px 'Segoe UI', sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = e.kind === 'heal' ? '#c8e9a5' : e.kind === 'loot' ? '#f2d38d' : e.kind === 'danger' ? '#ff9b86' : e.kind === 'status' ? '#a9d8ff' : e.kind === 'cast' ? '#d5a9ff' : '#fff0c7';
      ctx.shadowColor = '#102421'; ctx.shadowBlur = 4; ctx.fillText(e.text, p.x, p.y - 50 - (1.1 - e.life) * 28); ctx.restore();
    }
    ctx.restore();
  }
  drawZoneLabels(ctx, z) {
    const map = MAPS[this.mapId];
    if (!map) return;
    const entries = [];
    if (map.camp) entries.push({ x: map.camp.x, y: map.camp.y - 2.4, text: 'Guild Camp' });
    for (const zone of map.zones || []) if (zone.label) entries.push({ x: zone.x, y: zone.y - zone.r * 0.62, text: zone.label });
    if (!entries.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    // Constant ~14px screen size regardless of zoom.
    ctx.font = `600 ${Math.round(14 / Math.max(z, 0.2))}px Georgia, serif`;
    for (const e of entries) {
      const p = project(e.x, e.y);
      ctx.fillStyle = '#f2e7c9d8'; ctx.strokeStyle = '#142729cc'; ctx.lineWidth = 3 / Math.max(z, 0.2);
      ctx.strokeText(e.text, p.x, p.y); ctx.fillText(e.text, p.x, p.y);
    }
    ctx.restore();
  }
  drawOrderMarks(ctx, now, z) {
    this.orderMarks = this.orderMarks.filter(m => m.mapId === this.mapId && now - m.started < 900);
    const reduced = this.reducedMotion.matches;
    for (const mark of this.orderMarks) {
      const age = (now - mark.started) / 900;
      const p = project(mark.x, mark.y);
      ctx.save();
      if (reduced) {
        ctx.globalAlpha = 1;
        ellipse(ctx, p.x, p.y, 26, 13, null, mark.kind === 'rally' ? '#ffdf92' : '#e8ca88');
      } else {
        const grow = 0.35 + age * 1.15;
        ctx.globalAlpha = Math.max(0, 1 - age);
        ctx.lineWidth = 2.5 / z;
        ellipse(ctx, p.x, p.y, 26 * grow, 13 * grow, null, mark.kind === 'rally' ? '#ffdf92' : '#e8ca88');
        ellipse(ctx, p.x, p.y, 9 * (1.6 - age * 0.5), 4.5 * (1.6 - age * 0.5), mark.kind === 'rally' ? '#ffdf9230' : '#e8ca8830');
      }
      ctx.restore();
    }
  }

  /* ---------- minimap ---------- */
  minimapTransform(canvas) {
    const b = mapBounds(this.mapId);
    const halfW = (b.x + b.y) * 22, halfH = (b.x + b.y) * 11;
    const scale = Math.min((canvas.width - 14) / (halfW * 2), (canvas.height - 14) / (halfH * 2));
    return { scale, offX: canvas.width / 2, offY: canvas.height / 2, b };
  }
  minimapToWorld(canvas, mx, my) {
    const { scale, offX, offY } = this.minimapTransform(canvas);
    return unproject((mx - offX) / scale, (my - offY) / scale);
  }
  // Hit-test a minimap click against roster markers so any adventurer on the
  // field can be jumped to directly. Returns the character or null.
  minimapCharacterAt(canvas, mx, my, s) {
    const { scale, offX, offY } = this.minimapTransform(canvas);
    const toMini = (x, y) => { const q = project(x, y); return { x: offX + q.x * scale, y: offY + q.y * scale }; };
    let nearest = null, best = 9;
    for (const c of s.characters) {
      if (c.mapId !== this.mapId) continue;
      const p = toMini(c.x, c.y);
      const d = Math.hypot(mx - p.x, my - p.y);
      if (d < best) { best = d; nearest = c; }
    }
    return nearest;
  }
  drawMinimap(canvas, s, selected) {
    const ctx = canvas.getContext('2d');
    const { scale, offX, offY, b } = this.minimapTransform(canvas);
    const toMini = (x, y) => { const q = project(x, y); return { x: offX + q.x * scale, y: offY + q.y * scale }; };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const corners = [toMini(-b.x, -b.y), toMini(b.x, -b.y), toMini(b.x, b.y), toMini(-b.x, b.y)];
    polygon(ctx, corners, '#0e1f1ddd', '#8aa47888');
    ctx.save();
    polygon(ctx, corners); ctx.clip();
    const map = MAPS[this.mapId];
    const layout = this.sprites.layout?.(this.mapId);
    if (layout?.shoreline?.length) {
      ctx.beginPath(); layout.shoreline.forEach(([x, y], i) => { const p = toMini(x, y); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      ctx.closePath(); ctx.fillStyle = '#2c5f7855'; ctx.fill();
    }
    const zones = layout?.zones || map.zones || [];
    for (const zone of zones) {
      const c = toMini(zone.x, zone.y);
      const kind = layout ? /fabre/i.test(zone.name) : zone.kind === 'fabre';
      ellipse(ctx, c.x, c.y, zone.r * Math.SQRT2 * 22 * scale, zone.r * Math.SQRT2 * 11 * scale, kind ? '#c9d98f26' : '#9ec97f2c');
    }
    const roads = layout?.roads || (map.road || []).map(line => ({ points: line }));
    if (roads.length) {
      ctx.strokeStyle = '#c9c29c99'; ctx.lineWidth = Math.max(1.5, 10 * scale); ctx.lineJoin = 'round';
      for (const road of roads) {
        ctx.beginPath();
        road.points.forEach(([x, y], i) => { const p = toMini(x, y); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
        ctx.stroke();
      }
    }
    if (layout?.landmarks?.length) {
      for (const lm of layout.landmarks) {
        const p = toMini(lm.x, lm.y);
        ctx.fillStyle = landmarkColor(lm.id);
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (map.camp) {
      const c = toMini(map.camp.x, map.camp.y);
      ctx.fillStyle = '#dec58e'; ctx.fillRect(c.x - 3, c.y - 3, 6, 6);
      ctx.strokeStyle = '#142729'; ctx.lineWidth = 1; ctx.strokeRect(c.x - 3, c.y - 3, 6, 6);
    }
    // Visible camera footprint.
    const view = [this.world(0, 0), this.world(this.width, 0), this.world(this.width, this.height), this.world(0, this.height)]
      .map(p => toMini(p.x, p.y));
    polygon(ctx, view, '#ffe9a314', '#f1d99d');
    ctx.restore();
    // Party markers.
    for (const c of s.characters) {
      if (c.mapId !== this.mapId) continue;
      const p = toMini(c.x, c.y), st = stats(c), wounded = c.hp / st.hp <= 0.3;
      ctx.beginPath(); ctx.arc(p.x, p.y, selected.has(c.id) ? 4.5 : 3.4, 0, Math.PI * 2);
      ctx.fillStyle = wounded ? '#e08b76' : selected.has(c.id) ? '#ffd97a' : '#b8e986';
      ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = '#142729'; ctx.stroke();
      if (selected.has(c.id)) { ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.strokeStyle = '#ffd97acc'; ctx.stroke(); }
    }
    if (canvas.width >= 600) {
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      for (const [index,c] of s.characters.entries()) {
        if (c.mapId !== this.mapId) continue;
        const p = toMini(c.x,c.y);
        ctx.fillStyle = '#102525'; ctx.fillRect(p.x - 10, p.y - 21, 20, 16);
        ctx.fillStyle = '#f3d591'; ctx.fillText(index + 1, p.x, p.y - 8);
      }
    }
    for (const m of s.maps[this.mapId].monsters.filter(m => m.hp > 0 && MAPS[this.mapId].boss)) {
      const p = toMini(m.x, m.y);
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#e08b76'; ctx.fill();
    }
  }
}

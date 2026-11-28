import { MAPS, MONSTERS, STEP, mapBounds } from './data.js';
import { FX_COLORS, flourishHex, traceFlourish } from './fx.js';
import { stats } from './sim.js';
export const project = (x, y) => ({ x: (x - y) * 22, y: (x + y) * 11 });
export const unproject = (x, y) => ({ x: (x / 22 + y / 11) / 2, y: (y / 11 - x / 22) / 2 });
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
// Scenery reaches one world unit past the playable bounds, as before.
const visual = mapId => { const b = mapBounds(mapId); return { x: b.x + 1, y: b.y + 1 }; };
const CHUNK = 8;          // world units per cached terrain chunk
const CHUNK_CACHE = 160;  // bounded LRU; covers a full South Prontera view plus margin, ≈40 MB worst case
const CELL = 4;           // world units per ground tile cell
const EFFECT_LIFETIME = 1.1;
const groundColor = mapId => mapId === 'payon' ? '#504859' : ['morroc', 'lair'].includes(mapId)
  ? '#be9967' : mapId === 'arena' ? '#555b5a' : mapId === 'forest' ? '#436352' : '#6b8959';
const EMPHASIZED_HITS = new Set(['critical', 'skill-hit', 'boss-hit']);
const EFFECT_STYLES = {
  hit: [15, '#fff1cd'], critical: [26, '#ffd16b'], 'skill-hit': [22, '#a5efff'],
  incoming: [14, '#ffaba0'], 'boss-hit': [23, '#ff9582'], heal: [17, '#c5f49b'],
  skill: [13, '#bcdeff'], cast: [13, '#e3b8ff'], loot: [12, '#f2d38d'],
  status: [12, '#c6daff'], danger: [14, '#ffc2a9'],
};

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
// The classic winding field road, kept for the older maps.
function legacyRoadPoints() {
  return [-17, -12, -5, 3, 10, 17].map((y, i) => project(Math.sin(i * 0.8) * 3, y));
}

export class Renderer {
  constructor(canvas, sprites) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.sprites = sprites;
    this.camera = { x: 0, y: 0, zoom: 0.8 }; this.mapId = 'meadow'; this.terrain = new Map(); this.hits = []; this.animations = new Map();
    this.width = 1000; this.height = 650; this.followId = null; this.grid = false;
    this.orderMarks = []; this.previousFrame = null;
    this.scenery = new Map(); this.overviews = new Map();
    this.combatText = 'all'; this.cameraShake = false; this.shake = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    // Optional so the drawing maths stays usable without a DOM (tests, workers).
    this.resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
    this.resizeObserver?.observe(canvas);
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = r.width; this.height = r.height; this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr;
    if (!this.initialized && r.width > 0) { this.fit(); this.initialized = true; }
  }
  fit() {
    this.previousFrame = null;
    this.animations.clear();
    this.shake = 0;
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
  screen(p) { const q = project(p.x, p.y); return { x: this.width / 2 + (q.x - this.camera.x) * this.camera.zoom + this.shake, y: this.height / 2 + 20 + (q.y - this.camera.y) * this.camera.zoom }; }
  world(x, y) { return unproject((x - this.width / 2 - this.shake) / this.camera.zoom + this.camera.x, (y - this.height / 2 - 20) / this.camera.zoom + this.camera.y); }
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
    if (cached) { this.terrain.delete(key); this.terrain.set(key, cached); return cached; }
    const cv = this.renderChunk(mapId, cx, cy);
    this.terrain.set(key, cv);
    while (this.terrain.size > CHUNK_CACHE) this.terrain.delete(this.terrain.keys().next().value);
    return cv;
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
    polygon(ctx, corners, groundColor(mapId));
    ctx.clip();
    this.paintChunkGround(ctx, mapId, r);
    ctx.restore();
    cv._minX = minX; cv._minY = minY;
    return cv;
  }
  paintChunkGround(ctx, mapId, r) {
    const cave = mapId === 'payon', arena = mapId === 'arena', forest = mapId === 'forest';
    const dunes = ['morroc', 'lair'].includes(mapId), meadow = mapId === 'meadow';
    // Global ground features are drawn whole inside every chunk clip so they
    // continue seamlessly across chunk borders.
    this.paintGlobalGround(ctx, mapId, r);
    if (meadow) this.paintTileCells(ctx, mapId, r);
    this.paintGroundDetail(ctx, mapId, r, cave, arena, forest, dunes, meadow);
  }
  paintGlobalGround(ctx, mapId, r) {
    const cave = mapId === 'payon', arena = mapId === 'arena', forest = mapId === 'forest';
    const dunes = ['morroc', 'lair'].includes(mapId), meadow = mapId === 'meadow';
    if (meadow) {
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
  paintTileCells(ctx, mapId, r) {
    const map = MAPS[mapId];
    const terrain = this.sprites.index?.terrain;
    const tiles = terrain?.tiles;
    if (!tiles) return;
    const cx0 = Math.floor(r.x0 / CELL), cx1 = Math.ceil(r.x1 / CELL);
    const cy0 = Math.floor(r.y0 / CELL), cy1 = Math.ceil(r.y1 / CELL);
    for (let gy = cy0; gy < cy1; gy++) for (let gx = cx0; gx < cx1; gx++) {
      const wx = gx * CELL + CELL / 2, wy = gy * CELL + CELL / 2;
      let name;
      if (roadDistance(map, wx, wy) <= 2.1) name = 'dirt_path';
      else {
        const zone = (map.zones || []).find(z => Math.hypot(wx - z.x, wy - z.y) <= z.r * 0.9);
        if (zone) name = zone.kind === 'poring' ? 'grass_blossom' : 'grass_olive';
        else {
          const h = chunkSeed(mapId, gx, gy);
          name = (h % 100) < 68 ? 'grass_blossom' : 'grass_olive';
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
  paintGroundDetail(ctx, mapId, r, cave, arena, forest, dunes, meadow, density = 1) {
    const rng = rngFrom(chunkSeed(mapId, Math.round(r.x0 / CHUNK), Math.round(r.y0 / CHUNK)));
    const area = (r.x1 - r.x0) * (r.y1 - r.y0);
    const count = Math.round(area * density * (meadow ? 2.2 : 7.3));
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
  overviewGround(boundary, bounds) {
    const id = this.mapId;
    if (this.overviews.has(id)) return this.overviews.get(id);
    const scale = 0.57;
    const left = boundary[3].x, top = boundary[0].y;
    const width = -2 * left, height = -2 * top;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(canvas.width / width, canvas.height / height);
    ctx.translate(-left, -top);
    polygon(ctx, boundary); ctx.clip();
    const area = { x0: -bounds.x, y0: -bounds.y, x1: bounds.x, y1: bounds.y };
    const cave = id === 'payon', arena = id === 'arena', forest = id === 'forest';
    const dunes = id === 'morroc' || id === 'lair', meadow = id === 'meadow';
    this.paintGlobalGround(ctx, id, area);
    if (meadow) this.paintTileCells(ctx, id, area);
    for (let y = Math.floor(area.y0 / CHUNK); y < area.y1 / CHUNK; y++) {
      for (let x = Math.floor(area.x0 / CHUNK); x < area.x1 / CHUNK; x++) {
        this.paintGroundDetail(ctx, id, this.chunkRect(id, x, y), cave, arena, forest, dunes, meadow, 0.28);
      }
    }
    const overview = { canvas, left, top, width, height };
    this.overviews.set(id, overview);
    if (this.overviews.size > 3) this.overviews.delete(this.overviews.keys().next().value);
    return overview;
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
    if (this.scenery.has(this.mapId)) return this.scenery.get(this.mapId);
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
    const props = authored.filter(p => terrain.props[p.id]).sort((a, b) => a.x + a.y - b.x - b.y);
    this.scenery.set(this.mapId, props);
    return props;
  }
  drawScenery(ctx) {
    const terrain = this.sprites.index?.terrain;
    if (!terrain) return;
    const corners = [this.world(0, 0), this.world(this.width, 0), this.world(this.width, this.height), this.world(0, this.height)];
    const minX = Math.min(...corners.map(p => p.x)) - 6, maxX = Math.max(...corners.map(p => p.x)) + 6;
    const minY = Math.min(...corners.map(p => p.y)) - 6, maxY = Math.max(...corners.map(p => p.y)) + 6;
    const props = this.sceneryList().filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
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

  fieldEntities(s) {
    const heroes = s.characters.filter(c => c.mapId === this.mapId && c.hp > 0);
    const monsters = s.maps[this.mapId].monsters.filter(m => m.hp > 0);
    return [...heroes.map(unit => ({ unit, hero: true })), ...monsters.map(unit => ({ unit, hero: false }))];
  }
  capturePositions(s) {
    const positions = new Map();
    for (const { unit } of this.fieldEntities(s)) positions.set(unit.id, { x: unit.x, y: unit.y });
    this.previousFrame = { state: s, map: this.mapId, time: s.time, positions };
  }
  entityPosition(unit, previous, alpha) {
    const point = previous?.get(unit.id);
    // Treat a redeployment or respawn as a jump rather than animating a sweep.
    if (!point || Math.hypot(unit.x - point.x, unit.y - point.y) > 2) return unit;
    return { x: point.x + (unit.x - point.x) * alpha, y: point.y + (unit.y - point.y) * alpha };
  }

  /* ---------- main draw ---------- */
  draw(s, selected, hovered, frameRemainder = 0, huntPreview = null, elapsed = 0) {
    const ctx = this.ctx, z = this.camera.zoom, map = s.maps[this.mapId], now = performance.now();
    const snapshot = this.previousFrame;
    const previous = snapshot?.state === s && snapshot.map === this.mapId && Math.abs(s.time - snapshot.time - STEP) < 1e-6
      ? snapshot.positions : null;
    const alpha = clamp(frameRemainder / STEP, 0, 1);
    const entities = this.fieldEntities(s).map(entry => ({ ...entry, position: this.entityPosition(entry.unit, previous, alpha) }));
    this.shake = 0;
    if (this.cameraShake && !this.reducedMotion.matches) {
      const impact = s.effects.findLast(e => e.mapId === this.mapId && EMPHASIZED_HITS.has(e.kind) && e.kind !== 'skill-hit');
      const age = impact ? EFFECT_LIFETIME - impact.life + frameRemainder : 1;
      const strength = impact?.kind === 'boss-hit' ? 5 : 2.5;
      if (age < 0.18) this.shake = Math.sin(age * 88) * strength * (1 - age / 0.18);
    }
    if (this.followId) {
      const followed = entities.find(entry => entry.hero && entry.unit.id === this.followId);
      if (followed) {
        const p = project(followed.position.x, followed.position.y);
        const blend = 1 - Math.exp(-5 * elapsed);
        this.camera.x += (p.x - this.camera.x) * blend; this.camera.y += (p.y - this.camera.y) * blend;
        this.clampCamera();
      }
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createRadialGradient(this.width / 2, this.height / 2, 30, this.width / 2, this.height / 2, this.width * 0.75);
    bg.addColorStop(0, this.mapId === 'arena' ? '#253039' : '#233b32'); bg.addColorStop(1, '#101f22');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(this.width / 2 - this.camera.x * z + this.shake, this.height / 2 + 20 - this.camera.y * z);
    ctx.scale(z, z);
    const vb = visual(this.mapId);
    const boundary = [project(-vb.x, -vb.y), project(vb.x, -vb.y), project(vb.x, vb.y), project(-vb.x, vb.y)];
    // Floating slab: dark underside, base plate, then clipped chunk ground.
    polygon(ctx, boundary.map(p => ({ x: p.x, y: p.y + 18 })), '#182e28');
    polygon(ctx, boundary, groundColor(this.mapId), '#8aa47855');
    ctx.save();
    polygon(ctx, boundary);
    ctx.clip();
    const ground = this.overviewGround(boundary, vb);
    ctx.drawImage(ground.canvas, ground.left, ground.top, ground.width, ground.height);
    if (z > 0.55) {
      const cameraCenter = unproject(this.camera.x, this.camera.y);
      const proximity = ([x, y]) => Math.hypot((x + 0.5) * CHUNK - cameraCenter.x, (y + 0.5) * CHUNK - cameraCenter.y);
      const chunks = this.visibleChunks().sort((a, b) => proximity(a) - proximity(b));
      let newChunks = 0;
      for (const [cx, cy] of chunks) {
        if (!this.terrain.has(`${this.mapId}:${cx}:${cy}`)) {
          if (newChunks >= 4) continue;
          newChunks++;
        }
        const cv = this.chunkCanvas(this.mapId, cx, cy);
        // Slight bleed covers antialiasing between neighbours.
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
      const position = this.entityPosition(c, previous, alpha), p = project(position.x, position.y);
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
    this.drawScenery(ctx);
    this.drawZoneLabels(ctx, z);
    const telegraph = map.telegraph;
    if (telegraph) {
      const p = project(telegraph.x, telegraph.y), pulse = 0.24 + Math.sin((s.time + frameRemainder) * 10) * 0.08;
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
    entities.sort((a, b) => a.position.x + a.position.y - b.position.x - b.position.y);
    this.hits = [];
    const present = new Set();
    for (const { unit: c, hero, position } of entities) {
      present.add(c.id);
      const p = project(position.x, position.y), screen = this.screen(position), isSelected = hero && selected.has(c.id);
      ctx.save(); ctx.translate(p.x, p.y);
      ellipse(ctx, 0, 1, hero ? 18 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 48 : 18, hero ? 8 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 20 : 8, '#0c201e45');
      if (isSelected || hovered === c.id) { ctx.lineWidth = 2 / z; ellipse(ctx, 0, 0, hero ? 23 : 28, hero ? 10 : 12, isSelected ? '#e4cc8720' : '#e9866f18', hero ? '#edd79b' : '#e9866f'); }
      const last = this.animations.get(c.id);
      // The simulation counts swings; a new count restarts the attack animation,
      // which keeps every class's swing complete even at high attack speed.
      const swungAgain = c.stance === 'attack' && ((c.attackSwing || 0) !== (last?.swing ?? (c.attackSwing || 0)) || c.attackFlash > (last?.flash ?? 0) + 1e-6);
      const started = last?.stance === c.stance && !swungAgain ? last.started : s.time;
      const swungAt = swungAgain ? s.time : (last?.swungAt ?? -Infinity);
      this.animations.set(c.id, { stance: c.stance, flash: c.attackFlash, swing: c.attackSwing, started, swungAt });
      // Once a unit swings, the whole attack action plays out — including the
      // recovery frames after the simulation's 0.4 s attack flash ends.
      const swingMs = hero ? this.sprites.attackMs(c) : 900;
      const stillSwinging = (s.time + frameRemainder - swungAt) * 1000 < swingMs;
      const stance = c.stance === 'attack' || stillSwinging ? 'attack' : c.stance;
      const animationStart = c.stance === 'attack' ? started : (stillSwinging ? swungAt : started);
      const ms = Math.max(0, s.time + frameRemainder - animationStart) * 1000;
      if (hero) this.sprites.hero(ctx, c, ms, stance); else this.sprites.monster(ctx, c, ms);
      const barY = hero ? -80 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? -115 : c.kind === 'willow' ? -83 : -44;
      if (hero || hovered === c.id || c.hp < MONSTERS[c.kind].hp) {
        const width = hero ? 43 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 82 : 36;
        ctx.fillStyle = '#132525'; ctx.fillRect(-width / 2 - 1, barY - 1, width + 2, 6);
        ctx.fillStyle = hero ? '#afc790' : '#d48b77'; ctx.fillRect(-width / 2, barY, width * Math.max(0, c.hp / (hero ? stats(c).hp : MONSTERS[c.kind].hp)), 4);
      }
      if (hero && c.cast) {
        const progress = clamp((c.cast.total - c.cast.remaining + frameRemainder) / c.cast.total, 0, 1);
        ctx.fillStyle = '#192936'; ctx.fillRect(-23, barY + 6, 46, 5);
        ctx.fillStyle = '#b8e4ff'; ctx.fillRect(-22, barY + 7, 44 * progress, 3);
        ctx.lineWidth = 1.5 / z;
        ellipse(ctx, 0, 0, 24, 10, '#b9d6ff22', '#b8e4ffa0');
      }
      if (hero || hovered === c.id) {
        ctx.font = `${11 / Math.max(z, 0.65)}px 'Segoe UI', sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = hero ? '#fff4d7' : '#ead3bd'; ctx.shadowColor = '#102421'; ctx.shadowBlur = 5; ctx.fillText(hero ? c.name : MONSTERS[c.kind].name, 0, barY - 7); ctx.shadowBlur = 0;
        if (hero && c.partyId) { ctx.fillStyle = '#e0c48b'; ctx.fillRect(-3, 10, 6, 3); }
      }
      ctx.restore();
      this.hits.push({ id: c.id, hero, x: screen.x, y: screen.y - (hero ? 25 : 15) * z, radius: Math.max(14, (hero ? 28 : (!hero && MAPS[this.mapId].boss && c.kind === MAPS[this.mapId].monster) ? 65 : 25) * z) });
    }
    for (const id of this.animations.keys()) if (!present.has(id)) this.animations.delete(id);
    this.drawOrderMarks(ctx, now, z);
    ctx.restore();
    this.drawCombatFeedback(s.effects, frameRemainder);
  }
  drawCombatFeedback(effects, frameRemainder) {
    const ctx = this.ctx, z = this.camera.zoom, reduced = this.reducedMotion.matches;
    ctx.save();
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (const e of effects) {
      if (e.mapId !== this.mapId) continue;
      const age = clamp(EFFECT_LIFETIME - e.life + frameRemainder, 0, EFFECT_LIFETIME);
      const emphasized = EMPHASIZED_HITS.has(e.kind);
      const point = this.screen(e);
      if (point.x < -70 || point.x > this.width + 70 || point.y < -25 || point.y > this.height + 190) continue;
      if (emphasized && age < 0.24 && !reduced) {
        const progress = age / 0.24, radius = (8 + progress * 20) * Math.max(z, 0.47);
        ctx.globalAlpha = (1 - progress) * 0.65; ctx.lineWidth = 1.6;
        ellipse(ctx, point.x, point.y - 11 * z, radius, radius * 0.5, null, EFFECT_STYLES[e.kind][1]);
      }
      if (e.kind !== 'loot' && (this.combatText === 'hidden' ||
        (this.combatText === 'highlights' && !emphasized && !['heal', 'skill', 'cast', 'danger'].includes(e.kind)))) continue;
      if (e.fx) this.drawSkillFx(point, e.fx, age, z);
      const [size, color] = EFFECT_STYLES[e.kind] || EFFECT_STYLES.hit;
      const bounce = emphasized && !reduced ? 1 + 0.23 * Math.max(0, 1 - age * 6) : 1;
      const x = point.x + (e.id % 5 - 2) * (emphasized ? 8 : 12);
      const y = point.y - 27 - 25 * z - (e.id % 3) * 7 - (reduced ? 0 : Math.sqrt(age) * 40);
      ctx.globalAlpha = clamp((EFFECT_LIFETIME - age) * 4, 0, 1);
      ctx.font = `${emphasized ? 800 : 650} ${Math.round(size * bounce)}px system-ui, sans-serif`;
      ctx.lineWidth = emphasized ? 4.5 : 3.5;
      ctx.strokeStyle = '#162021'; ctx.fillStyle = color;
      ctx.strokeText(e.text, x, y); ctx.fillText(e.text, x, y);
    }
    ctx.restore();
  }
  // Ground-plane flourish beneath a skill hit. Pure presentation: it reads the
  // effect record and never touches the simulation.
  drawSkillFx(point, fx, age, z) {
    const ctx = this.ctx, reduced = this.reducedMotion.matches;
    const t = clamp(age / (reduced ? 0.9 : 0.62), 0, 1);
    if (t >= 1) return;
    const color = flourishHex(fx, '#f2e6c8');
    const s = clamp(z, 0.5, 1.15), grow = reduced ? 0.8 : t;
    ctx.save();
    ctx.translate(point.x, point.y - 12 * z);
    // Squash to match the angled overhead camera's ground plane, then emit the
    // shape. Kept in one helper so tools/fx-preview.mjs can render the same paths.
    ctx.scale(s, s * 0.55);
    this.traceSkillFx(ctx, fx, t, grow, 16 + grow * 46, (1 - t) * 0.92, s, color);
    ctx.restore();
  }
  // Shapes one flourish on an already-transformed context. `alpha` is the fade.
  // Archetypes and colours live in fx.js so the preview tool draws the same art.
  traceSkillFx(ctx, fx, t, grow, r, alpha, s, color) {
    traceFlourish(ctx, fx, t, grow, r, alpha, s, color);
    ctx.globalAlpha = 1;
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
    let nearest = null, best = 9;
    for (const c of s.characters) {
      if (c.mapId !== this.mapId) continue;
      const q = project(c.x, c.y);
      const d = Math.hypot(mx - (offX + q.x * scale), my - (offY + q.y * scale));
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
    for (const zone of map.zones || []) {
      const c = toMini(zone.x, zone.y);
      ellipse(ctx, c.x, c.y, zone.r * Math.SQRT2 * 22 * scale, zone.r * Math.SQRT2 * 11 * scale, zone.kind === 'poring' ? '#9ec97f2c' : '#c9d98f26');
    }
    if (map.road) {
      ctx.strokeStyle = '#c9c29c99'; ctx.lineWidth = Math.max(1.5, 10 * scale); ctx.lineJoin = 'round';
      for (const line of map.road) {
        ctx.beginPath();
        line.forEach(([x, y], i) => { const p = toMini(x, y); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
        ctx.stroke();
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

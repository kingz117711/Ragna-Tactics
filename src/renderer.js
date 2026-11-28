import { MAPS, MONSTERS, STEP, mapBounds } from './data.js';
import { FX_COLORS, flourishHex, traceFlourish } from './fx.js';
import { beltExtent, biomeFor, groundExtent, paintGround, propScale, sceneryFor } from './terrain.js';
import { stats } from './sim.js';
export const project = (x, y) => ({ x: (x - y) * 22, y: (x + y) * 11 });
export const unproject = (x, y) => ({ x: (x / 22 + y / 11) / 2, y: (y / 11 - x / 22) / 2 });
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
// The painted field runs past the playable bounds so it never ends in a slab
// edge; the camera and chunk grid use the same padded extent.
const visual = mapId => groundExtent(mapId);
const CHUNK = 8;          // world units per cached terrain chunk
const CHUNK_CACHE = 160;  // bounded cache; covers a full South Prontera view plus margin, ≈40 MB worst case
const CHUNK_BUILD_BUDGET = 2;   // new chunks per frame at most; the overview underneath already looks like the map
const CHUNK_TIME_BUDGET_MS = 6; // ...and at most this many ms of terrain work per frame, so panning never stalls
const OVERVIEW_SLICE_MS = 6;    // ms per animation frame spent upgrading the overview, off the draw path
const EFFECT_LIFETIME = 1.1;
const groundColor = mapId => biomeFor(mapId).ground;
const EMPHASIZED_HITS = new Set(['critical', 'skill-hit', 'boss-hit']);
const EFFECT_STYLES = {
  hit: [15, '#fff1cd'], critical: [26, '#ffd16b'], 'skill-hit': [22, '#a5efff'],
  incoming: [14, '#ffaba0'], 'boss-hit': [23, '#ff9582'], heal: [17, '#c5f49b'],
  skill: [13, '#bcdeff'], cast: [13, '#e3b8ff'], loot: [12, '#f2d38d'],
  status: [12, '#c6daff'], danger: [14, '#ffc2a9'],
};

// Shared with tests so click→world math always matches the live camera fit.
// The fit frames the *playable* ground: the painted apron intentionally runs off
// screen so the field fills the viewport like a real map instead of a diorama.
// Fit and manual zoom share ONE range: on a phone (390×844) the fit sits near
// the bottom of it, so with a separate higher manual minimum, zooming out from
// Fit pushed the zoom back up — the reported camera drift. The 1.24 crop step
// keeps taps inside the playable bounds on narrow viewports, where the map's
// top tip would otherwise sit just outside the rectangle the sim accepts.
export const ZOOM_MIN = 0.08, ZOOM_MAX = 1.8;
export function fitZoom(mapId, width, height) {
  const m = mapBounds(mapId);
  const b = { x: m.x + 2.5, y: m.y + 2.5 };
  const halfW = (b.x + b.y) * 22, halfH = (b.x + b.y) * 11;
  const fit = Math.min((width - 24) / (halfW * 2 + 40), (height - 96) / (halfH * 2 + 52));
  return clamp(fit * 1.24, ZOOM_MIN, ZOOM_MAX);
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
    // Scheduling state: the zoom gate below which the overview is drawn without
    // building chunks, the chunks that must never be evicted (everything visible
    // this frame), and the incremental overview upgrade job.
    this.fitZoomNow = 0; this.protectedChunks = new Set();
    this.overviewJob = null; this._pumpScheduled = false;
    // Lightweight counters for tests and profiling: chunk builds/evictions and
    // overview tiles assembled by the background upgrade.
    this.probe = { chunksBuilt: 0, chunksEvicted: 0, overviewTiles: 0, overviewUpgrades: 0 };
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this._bgGradient = null; this._bgKey = '';
    // Optional so the drawing maths stays usable without a DOM (tests, workers).
    this.resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
    this.resizeObserver?.observe(canvas);
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = r.width; this.height = r.height; this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr;
    this._bgGradient = null;
    // Track the fit zoom for the current viewport so the chunk gate follows it,
    // but do NOT move the camera here. Re-fitting on resize (PR #11's auto-fit)
    // yanked a manually positioned camera back to the map centre whenever the
    // layout shifted — a panel opening or the mouse brushing a hover panel.
    if (r.width > 0) this.fitZoomNow = fitZoom(this.mapId, r.width, r.height);
    // Fit exactly once, on the first non-zero measurement. Every later resize
    // preserves whatever camera the player positioned themselves.
    if (!this.initialized && r.width > 0) { this.fit(); this.initialized = true; }
  }
  fit() {
    this.previousFrame = null;
    this.animations.clear();
    this.shake = 0;
    this.camera = { x: 0, y: 0, zoom: fitZoom(this.mapId, this.width, this.height) };
    this.fitZoomNow = this.camera.zoom;
    this.followId = null;
    // The overview is a property of the map, not the camera, so a fit never
    // rebuilds it; it is already cached and the upgrade continues in background.
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
  // Zoom around the given screen point (default: the viewport centre, so wheel
  // and button zooms keep the centre of the view fixed on the same ground).
  // The clamp uses the same ZOOM_MIN/ZOOM_MAX range as fitZoom, so a manual
  // zoom can never push the camera back in after a Fit near the minimum.
  zoom(delta, x = this.width / 2, y = this.height / 2) {
    // Zooming is an explicit camera move: stop following a unit, otherwise the
    // camera keeps blending toward it on the next frame and the map appears
    // to follow the last clicked point instead of staying where zoom put it.
    this.followId = null;
    const before = this.world(x, y); this.camera.zoom = clamp(this.camera.zoom * delta, ZOOM_MIN, ZOOM_MAX);
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
    if (cached) return cached;
    const start = performance.now();
    const cv = this.renderChunk(mapId, cx, cy);
    this.terrain.set(key, cv);
    this.probe.chunksBuilt++;
    const buildMs = performance.now() - start;
    if (buildMs > (this.probe.longestBuildMs || 0)) this.probe.longestBuildMs = buildMs;
    // Eviction is handled once per frame in draw(), where the visible set is
    // known and can be protected — evicting here (FIFO on insert order)
    // regularly dropped chunks that were about to be drawn again.
    return cv;
  }
  // `scale` lets the overview upgrade reuse this exact painter at reduced
  // resolution; `quality` trims the finest detail passes for those tiles.
  renderChunk(mapId, cx, cy, scale = 1, quality = 1) {
    const r = this.chunkRect(mapId, cx, cy);
    const corners = [project(r.x0, r.y0), project(r.x1, r.y0), project(r.x1, r.y1), project(r.x0, r.y1)];
    const minX = Math.floor(Math.min(...corners.map(p => p.x))), maxX = Math.ceil(Math.max(...corners.map(p => p.x)));
    const minY = Math.floor(Math.min(...corners.map(p => p.y))), maxY = Math.ceil(Math.max(...corners.map(p => p.y)));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil((maxX - minX) * scale)); cv.height = Math.max(1, Math.ceil((maxY - minY) * scale));
    const ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    ctx.translate(-minX, -minY);
    // Paint only this chunk's world rect (plus a small margin for features
    // that straddle the border). PR #11 painted the whole projected bounding
    // box — roughly 9x the chunk's world area — on every chunk, which is
    // the main source of the reported lag while panning / zooming. The
    // painter is a pure function of world position, so neighbouring chunks
    // still meet with no seam.
    const area = { x0: r.x0 - 0.5, y0: r.y0 - 0.5, x1: r.x1 + 0.5, y1: r.y1 + 0.5 };
    ctx.save();
    polygon(ctx, corners, groundColor(mapId));
    ctx.clip();
    paintGround(ctx, mapId, this.sprites, area, quality);
    ctx.restore();
    cv._minX = minX; cv._minY = minY; cv._scale = scale;
    return cv;
  }
  // The wide-zoom fallback: one painting of the whole field at a fraction of
  // the detail, drawn over by detailed chunks as they arrive. Tier 0 is small
  // enough to build inside the first frame; the sharper tier is assembled
  // afterwards, a few tiles per animation frame inside a time budget, so the
  // upgrade never runs inside the synchronous draw path (a whole-canvas
  // rebuild blocked rendering for hundreds of ms — PR #11's cold-load stall).
  // It is cached per map and never rebuilt on resize — rebuilding it on every
  // resize (PR #11's auto-fit) was a major source of lag.
  overviewGround() {
    const id = this.mapId;
    const cached = this.overviews.get(id);
    if (cached) return cached;
    const base = this.buildOverview(id, false);
    this.overviews.set(id, base);
    if (this.overviews.size > 3) this.overviews.delete(this.overviews.keys().next().value);
    this.startOverviewUpgrade();
    return base;
  }
  overviewGeometry(id, detailed) {
    const ext = groundExtent(id);
    const fog = biomeFor(id).fog;
    const pad = 6;
    const a = project(-ext.x - pad, -ext.y - pad), b = project(ext.x + pad, -ext.y - pad);
    const c = project(ext.x + pad, ext.y + pad), d = project(-ext.x - pad, ext.y + pad);
    const minX = Math.min(a.x, b.x, c.x, d.x), maxX = Math.max(a.x, b.x, c.x, d.x);
    const minY = Math.min(a.y, b.y, c.y, d.y), maxY = Math.max(a.y, b.y, c.y, d.y);
    const maxPx = detailed ? 900 : 480;
    const scale = Math.min(detailed ? 0.16 : 0.08, maxPx / Math.max(maxX - minX, maxY - minY));
    return { ext, fog, minX, minY, maxX, maxY, scale };
  }
  buildOverview(id, detailed) {
    const g = this.overviewGeometry(id, detailed);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil((g.maxX - g.minX) * g.scale));
    canvas.height = Math.max(1, Math.ceil((g.maxY - g.minY) * g.scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = g.fog;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(g.scale, g.scale);
    ctx.translate(-g.minX, -g.minY);
    polygon(ctx, [project(-g.ext.x, -g.ext.y), project(g.ext.x, -g.ext.y), project(g.ext.x, g.ext.y), project(-g.ext.x, g.ext.y)]);
    ctx.clip();
    paintGround(ctx, id, this.sprites, { x0: -g.ext.x, y0: -g.ext.y, x1: g.ext.x, y1: g.ext.y }, detailed ? 0.9 : 0.5);
    return { canvas, minX: g.minX, minY: g.minY, scale: g.scale, tier: detailed ? 1 : 0 };
  }
  // Upgrade to the sharper tier: the same chunk painter, sliced on the chunk
  // grid — but only over the playable belt. The wide painted apron is dense
  // with border decoration (rocks, cliffs, trees), which makes full-extent
  // tiles cost ~50 ms each; the apron is fog-transition terrain that the soft
  // tier already renders well, so it keeps that painting (upscaled once here)
  // and the upgrade spends its budget where the player actually looks. Tiles
  // are blitted through the map-diamond clip; adjacent tiles overlap (each
  // paints its chunk rect plus margin), and since the painter is a pure
  // function of world position the overlaps composite to exactly the
  // seamless field.
  startOverviewUpgrade() {
    const id = this.mapId;
    const cached = this.overviews.get(id);
    if (!cached || cached.tier >= 1 || this.overviewJob) return;
    const g = this.overviewGeometry(id, true);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil((g.maxX - g.minX) * g.scale));
    canvas.height = Math.max(1, Math.ceil((g.maxY - g.minY) * g.scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = g.fog;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cached.canvas, 0, 0, canvas.width, canvas.height);
    ctx.save();
    polygon(ctx, [project(-g.ext.x, -g.ext.y), project(g.ext.x, -g.ext.y), project(g.ext.x, g.ext.y), project(-g.ext.x, g.ext.y)]);
    ctx.clip();
    const belt = beltExtent(id);
    const tiles = [];
    for (let cy = Math.floor(-belt.y / CHUNK); cy < Math.ceil(belt.y / CHUNK); cy++)
      for (let cx = Math.floor(-belt.x / CHUNK); cx < Math.ceil(belt.x / CHUNK); cx++) tiles.push([cx, cy]);
    this.overviewJob = { mapId: id, canvas, ctx, minX: g.minX, minY: g.minY, scale: g.scale, tiles, index: 0 };
    this.scheduleOverviewPump();
  }
  scheduleOverviewPump() {
    if (this._pumpScheduled || !this.overviewJob) return;
    this._pumpScheduled = true;
    requestAnimationFrame(() => { this._pumpScheduled = false; this.pumpOverviewJob(); });
  }
  pumpOverviewJob() {
    const job = this.overviewJob;
    if (!job) return;
    // Switching maps abandons the old map's upgrade; its tier-0 overview
    // stays cached and a fresh upgrade is scheduled when it is viewed again.
    if (job.mapId !== this.mapId) { this.overviewJob = null; return; }
    const start = performance.now();
    while (job.index < job.tiles.length && performance.now() - start < OVERVIEW_SLICE_MS) {
      const [cx, cy] = job.tiles[job.index++];
      const tile = this.renderChunk(job.mapId, cx, cy, job.scale, 0.9);
      // 1:1 pixel blit at the tile's rounded overview position; neighbouring
      // tiles' bounding boxes overlap, so rounding can never open a gap.
      job.ctx.drawImage(tile, Math.round((tile._minX - job.minX) * job.scale), Math.round((tile._minY - job.minY) * job.scale));
      this.probe.overviewTiles++;
    }
    if (job.index >= job.tiles.length) {
      this.overviews.set(job.mapId, { canvas: job.canvas, minX: job.minX, minY: job.minY, scale: job.scale, tier: 1 });
      this.overviewJob = null;
      this.probe.overviewUpgrades++;
    } else {
      this.scheduleOverviewPump();
    }
  }
  visibleChunks() {
    const corners = [this.world(0, 0), this.world(this.width, 0), this.world(this.width, this.height), this.world(0, this.height)];
    const minX = Math.min(...corners.map(p => p.x)) - CHUNK, maxX = Math.max(...corners.map(p => p.x)) + CHUNK;
    const minY = Math.min(...corners.map(p => p.y)) - CHUNK, maxY = Math.max(...corners.map(p => p.y)) + CHUNK;
    const v = beltExtent(this.mapId);
    const cx0 = Math.max(Math.floor(-v.x / CHUNK), Math.floor(minX / CHUNK));
    const cx1 = Math.min(Math.ceil(v.x / CHUNK), Math.ceil(maxX / CHUNK));
    const cy0 = Math.max(Math.floor(-v.y / CHUNK), Math.floor(minY / CHUNK));
    const cy1 = Math.min(Math.ceil(v.y / CHUNK), Math.ceil(maxY / CHUNK));
    const list = [];
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) list.push([cx, cy]);
    return list;
  }

  /* ---------- scenery props ---------- */
  // Placement is authored in terrain.js, not stitched together per frame: a prop
  // is either part of the map's composition or it does not exist. That keeps the
  // field stable while panning and keeps decorative growth out of the roads.
  sceneryList() {
    if (this.scenery.has(this.mapId)) return this.scenery.get(this.mapId);
    const terrain = this.sprites.index?.terrain;
    if (!terrain) return [];
    const props = sceneryFor(this.mapId).filter(p => terrain.props[p.id]);
    this.scenery.set(this.mapId, props);
    return props;
  }
  drawScenery(ctx) {
    const terrain = this.sprites.index?.terrain;
    if (!terrain) return;
    const corners = [this.world(0, 0), this.world(this.width, 0), this.world(this.width, this.height), this.world(0, this.height)];
    const minX = Math.min(...corners.map(p => p.x)) - 8, maxX = Math.max(...corners.map(p => p.x)) + 8;
    const minY = Math.min(...corners.map(p => p.y)) - 8, maxY = Math.max(...corners.map(p => p.y)) + 8;
    const props = this.sceneryList().filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
    for (const prop of props) {
      const rec = terrain.props[prop.id], img = this.sprites.prop(prop.id);
      if (!rec || !img) continue;
      const p = project(prop.x, prop.y), scale = propScale(prop.id, prop.scale);
      ctx.save();
      if (prop.flip) {
        ctx.translate(p.x, p.y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -rec.anchorX * scale, -rec.anchorY * scale, rec.w * scale, rec.h * scale);
      } else {
        ctx.drawImage(img, p.x - rec.anchorX * scale, p.y - rec.anchorY * scale, rec.w * scale, rec.h * scale);
      }
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
    // The surround is exactly the mist the painted ground dissolves into, so
    // the field has no cut edge anywhere. A flat fill (not a per-frame radial
    // gradient) keeps the background off the per-frame allocation path.
    ctx.fillStyle = biomeFor(this.mapId).fog; ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(this.width / 2 - this.camera.x * z + this.shake, this.height / 2 + 20 - this.camera.y * z);
    ctx.scale(z, z);
    // The painted field, feathered at its far corners instead of cut square.
    // The cheap tier draws immediately; the sharper tier is assembled a few
    // tiles per frame in the background, so it never blocks input, panning
    // or the first paint.
    const ground = this.overviewGround();
    ctx.drawImage(ground.canvas, ground.minX, ground.minY, ground.canvas.width / ground.scale, ground.canvas.height / ground.scale);
    // Detailed chunks only once zoomed in enough for them to be visible: at
    // fit zoom the cached overview already looks like the map, and building
    // dozens of heavy chunks on every fit/pan was PR #11's main lag spike.
    // Above the gate, visible chunks are prioritised (nearest the camera
    // first) and built under two budgets — an elapsed-time budget per frame
    // and a small count cap — while the overview stays underneath pending
    // chunks. Already-built chunks keep drawing at any zoom, so zooming back
    // out never pops the terrain away.
    const gate = this.fitZoomNow || fitZoom(this.mapId, this.width, this.height);
    const canBuild = z > gate + 1e-6;
    const cameraCenter = unproject(this.camera.x, this.camera.y);
    const proximity = ([x, y]) => Math.hypot((x + 0.5) * CHUNK - cameraCenter.x, (y + 0.5) * CHUNK - cameraCenter.y);
    const chunks = this.visibleChunks().sort((a, b) => proximity(a) - proximity(b));
    this.protectedChunks = new Set(chunks.map(([cx, cy]) => `${this.mapId}:${cx}:${cy}`));
    const buildStart = performance.now();
    let built = 0;
    for (const [cx, cy] of chunks) {
      const key = `${this.mapId}:${cx}:${cy}`;
      let cv = this.terrain.get(key);
      if (!cv && (!canBuild || built >= CHUNK_BUILD_BUDGET || performance.now() - buildStart >= CHUNK_TIME_BUDGET_MS)) continue;
      if (!cv) { built++; cv = this.chunkCanvas(this.mapId, cx, cy); }
      ctx.drawImage(cv, cv._minX, cv._minY, cv.width / (cv._scale || 1), cv.height / (cv._scale || 1));
    }
    // Evict only chunks outside the visible set: everything on screen (or in
    // its margin) is protected, so panning cannot thrash the cache and the
    // cache stays bounded without ever dropping a chunk that is on display.
    while (this.terrain.size > CHUNK_CACHE) {
      const victim = [...this.terrain.keys()].find(key => !this.protectedChunks.has(key));
      if (!victim) break;
      this.terrain.delete(victim);
      this.probe.chunksEvicted++;
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
      // GM gallery effects carry their own lifetime and no text; they exist only
      // to play a flourish, so they must not respect the combat-text filter.
      const lifetime = e.life0 || EFFECT_LIFETIME;
      const age = clamp(lifetime - e.life + frameRemainder, 0, lifetime);
      if (e.kind === 'fx') { if (e.fx) this.drawSkillFx(this.screen(e), e.fx, age * (EFFECT_LIFETIME / lifetime), z); continue; }
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
  // Field labels are UI, not scenery: they are laid out in screen space so they
  // keep a constant size and never blow up when the camera zooms in.
  drawZoneLabels(ctx, z) {
    const map = MAPS[this.mapId];
    if (!map) return;
    const entries = [];
    if (map.camp) entries.push({ x: map.camp.x, y: map.camp.y - 2.6, text: 'Guild Camp' });
    for (const zone of map.zones || []) if (zone.label) entries.push({ x: zone.x, y: zone.y - zone.r * 0.62, text: zone.label });
    if (!entries.length) return;
    const screen = [];
    for (const e of entries) {
      const p = this.screen(e);
      if (p.x < -140 || p.x > this.width + 140 || p.y < -40 || p.y > this.height + 40) continue;
      screen.push({ ...p, text: e.text });
    }
    if (!screen.length) return;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const label of screen) {
      ctx.font = '600 13px Georgia, serif';
      const w = ctx.measureText(label.text).width;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#0d1a17';
      ctx.beginPath();
      const rx = w / 2 + 9, ry = 10;
      if (ctx.roundRect) ctx.roundRect(label.x - rx, label.y - ry, rx * 2, ry * 2, 9);
      else ctx.rect(label.x - rx, label.y - ry, rx * 2, ry * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(244,235,206,.94)';
      ctx.fillText(label.text, label.x, label.y + 0.5);
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

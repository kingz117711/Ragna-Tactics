// Deterministic build-time converter: Tiled authoring file -> runtime terrain layout.
//
// Reads assets-src/south-prontera.tmj (the authored source of truth) and bakes a
// flat, deterministic layout JSON for the renderer. The converter is intentionally
// small: it resolves authored geometry (roads, shoreline, hunting districts,
// landmarks, accent tiles) into a per-cell tile grid plus the vector overlays the
// renderer and minimap draw. No randomness beyond a fixed hash for the grassy
// fallback, so the same .tmj always yields byte-identical output.
//
// Visual terrain data lives here. Gameplay data (bounds, camp, deploy, hunt
// radii, monster spawns) stays in src/data.js and src/sim.js — this file never
// writes gameplay rules.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = resolve(ROOT, 'assets-src/south-prontera.tmj');
const OUT_DIR = resolve(ROOT, 'public/assets/terrain');
const OUT = resolve(OUT_DIR, 'south-prontera.json');
const INDEX = resolve(ROOT, 'public/assets/index.json');

const CELL = 4;                 // world units per ground tile cell
const ROAD_WIDTH = 2.3;         // world units — dirt road half-width
const BANK_WIDTH = 2.0;         // world units — shoreline bank band
const MAP_ID = 'meadow';

const hash01 = (x, y) => {
  let h = 2166136261 ^ ((x + 977) * 73856093) ^ ((y + 977) * 19349663);
  h = Math.imul(h, 16777619); h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
};
const pointInPolygon = (x, y, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
};
const segDistance = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
};
const distToPolyline = (x, y, pts) => {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, segDistance(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return best;
};

export function convertTerrain({ source = SRC, out = OUT, indexPath = INDEX } = {}) {
  const tmj = JSON.parse(readFileSync(source, 'utf8'));
  const tilesetByGid = new Map();
  for (const ts of tmj.tilesets) {
    for (let g = ts.firstgid; g < ts.firstgid + 1; g++) tilesetByGid.set(g, ts.name);
  }
  const prop = name => tmj.properties?.find(p => p.name === name)?.value;
  const originPoint = tmj.properties?.find(p => p.name === 'origin');
  const cell = Number(prop('cell')) > 0 ? Number(prop('cell')) : CELL;
  const ox = originPoint?.x ?? 0, oy = originPoint?.y ?? 0;
  const width = tmj.width, height = tmj.height;

  // Authored accent tiles (GID per cell).
  const accents = new Map();
  const tileLayer = tmj.layers.find(l => l.type === 'tilelayer');
  if (tileLayer) {
    for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
      const gid = tileLayer.data[row * width + col];
      if (gid) accents.set(col + ',' + row, tilesetByGid.get(gid));
    }
  }

  const objLayer = name => tmj.objectlayers.find(l => l.name === name);
  const roads = (objLayer('roads')?.objects || []).map(o => ({
    name: o.name, points: o.points.map(p => [p.x + o.x, p.y + o.y]),
  }));
  const shoreObj = objLayer('shoreline')?.objects?.[0];
  const shoreline = shoreObj ? shoreObj.points.map(p => [p.x + shoreObj.x, p.y + shoreObj.y]) : [];
  const zones = (objLayer('zones')?.objects || []).map(o => ({
    name: o.name, x: o.x + o.width / 2, y: o.y + o.height / 2, r: o.width / 2,
  }));
  const landmarks = (objLayer('landmarks')?.objects || []).map(o => ({
    id: o.name, x: o.x, y: o.y, scale: o.scale ?? 1,
  }));

  // Bake the full grid. Authored accents win; otherwise derive from geometry.
  const tiles = {};
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
    const key = col + ',' + row;
    if (accents.has(key)) { tiles[key] = accents.get(key); continue; }
    const wx = ox + col * cell + cell / 2, wy = oy + row * cell + cell / 2;
    let name;
    if (shoreline.length && pointInPolygon(wx, wy, shoreline)) {
      name = (col + row) % 2 ? 'water_dark_1' : 'water_dark_0';
    } else if (shoreline.length && distToPolyline(wx, wy, shoreline) <= BANK_WIDTH) {
      name = 'riverbank_wall';
    } else if (roads.length && Math.min(...roads.map(r => distToPolyline(wx, wy, r.points))) <= ROAD_WIDTH) {
      name = 'dirt_path';
    } else {
      const zone = zones.find(z => Math.hypot(wx - z.x, wy - z.y) <= z.r * 0.9);
      if (zone) name = /fabre/i.test(zone.name) ? 'grass_olive' : 'grass_blossom';
      else name = hash01(col, row) < 0.5 ? 'grass_blossom' : 'grass_olive';
    }
    tiles[key] = name;
  }

  const layout = {
    version: 1,
    mapId: MAP_ID,
    cell,
    origin: { x: ox, y: oy },
    width, height,
    tiles,
    roads,
    shoreline,
    zones,
    landmarks,
    transitions: {
      grass: ['grass_blossom', 'grass_olive', 'grass_geffen', 'grass_jade'],
      dirt: 'dirt_path',
      water: ['water_dark_0', 'water_dark_1'],
      waterFrame: ['water_frame_0', 'water_frame_1'],
      bank: 'riverbank_wall',
      cliff: 'cliff_rock',
    },
    source: 'assets-src/south-prontera.tmj',
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(layout, null, 1) + '\n');

  // Register the derived layout in the runtime asset index (visual metadata only).
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  index.terrain = index.terrain || {};
  index.terrain.layouts = index.terrain.layouts || {};
  index.terrain.layouts[MAP_ID] = { file: 'terrain/south-prontera.json', source: 'assets-src/south-prontera.tmj' };
  writeFileSync(indexPath, JSON.stringify(index) + '\n');
  return layout;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const layout = convertTerrain();
  console.log(`Terrain layout baked for ${layout.mapId}: ${Object.keys(layout.tiles).length} cells, ` +
    `${layout.roads.length} roads, ${layout.zones.length} zones, ${layout.landmarks.length} landmarks.`);
}

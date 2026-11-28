// Painted field art: ground layers, water, worn roads and scenery placement.
//
// Visual composition lives here, separate from gameplay content in data.js. A map
// id selects one *biome* (palette, tile families, decal mix) and an *art recipe*
// (authored landmarks, groves, streams and pools). Tiles and props are the pinned
// upstream v2 kit; this module only composites them, so every field is one
// continuous painted surface instead of a lattice of stamped cells.
//
// Everything is deterministic: the same map id and world rect always paint the
// same pixels, which is what lets the renderer cache chunks and cross their
// borders without a seam.
import { MAPS, mapBounds } from './data.js';

// The painted ground extends past the playable bounds so the field never ends in
// a hard slab edge. The belt holds the outer growth, the apron is what dissolves
// into the map's fog.
export const BELT = 10;
export const APRON = 74;
// World units covered by one ground-tile repeat. The kit's tiles are 128px.
const TILE_UNITS = 8.6;
const DECAL_CELL = 2.1;
const MOTTLE_CELL = 7.4;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------------ hashing */

// FNV-style integer hash; returns [0,1). Deterministic across engines.
export function hash2(x, y, seed = 0) {
  let h = 2166136261 ^ (seed | 0);
  h = Math.imul(h ^ (x | 0), 16777619);
  h = Math.imul(h ^ (y | 0), 16777619);
  h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const smooth = t => t * t * (3 - 2 * t);
// Smooth value noise on a unit lattice; scale is in world units.
export function noise(x, y, scale = 1, seed = 0) {
  const gx = x / scale, gy = y / scale;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = smooth(gx - x0), fy = smooth(gy - y0);
  const n = (ix, iy) => hash2(ix, iy, seed);
  return mix(mix(n(x0, y0), n(x0 + 1, y0), fx), mix(n(x0, y0 + 1), n(x0 + 1, y0 + 1), fx), fy);
}

/* ------------------------------------------------------------------- biomes */

// One painted technique, several moods: only the tile families, palette and
// decal mix change between fields (see docs/MAP-RESEARCH.md).
export const BIOMES = {
  prontera: {
    label: 'Prontera meadow',
    grade: '#6d9c46', gradeAlpha: 0.42,
    base: 'grass_olive', blend: 'grass_blossom', path: 'dirt_path',
    edge: 'cliff_rock', shore: 'sand_gold', water: 'water_frame_0', deep: '#2f6f76',
    ground: '#8fae66', fog: '#4b6844',
    mottle: ['#a8c47c', '#7fa159', '#bcd48c', '#6d9050'],
    rim: '#5c4529', verge: '#6f8f45', gravel: '#cbbd9c', edgeTint: '#5d8a44',
    decals: { tuft: 5, flower: 2.2, pebble: 1.2, clover: 2 },
    palette: { petal: ['#f2e6b8', '#e7c9d8', '#f7f0cf', '#dfe9b4'], blade: ['#8fae62', '#5f7d3f', '#a8bf74'] },
    pathWidth: 4.6,
    props: {
      ring: ['tree_ancient_variant', 'tree_tall_cluster', 'tree_sapling', 'tree_bush_bright', 'rock_cliff_crag'],
      grove: ['tree_ancient_large', 'tree_ancient_variant', 'tree_tall_cluster'],
      rocks: ['rock_boulder_mossy', 'rock_cliff_crag'],
    },
  },
  payon: {
    label: 'Payon forest',
    grade: '#558a46', gradeAlpha: 0.46,
    base: 'grass_forest', blend: 'grass_olive', path: 'dirt_payon',
    edge: 'cliff_rock', shore: 'riverbank_wall', water: 'water_frame_1', deep: '#265d63',
    ground: '#4d6f4b', fog: '#2f4535',
    mottle: ['#587d54', '#3e6044', '#688f60', '#345038'],
    rim: '#4a2f1d', verge: '#3d6038', gravel: '#95927a', edgeTint: '#3f6b41',
    decals: { tuft: 4, leaf: 4, pebble: 1.4, flower: 0.7 },
    palette: { petal: ['#e9dfae', '#cbb4c2'], blade: ['#6b8f52', '#3d5c39', '#84a45f'] },
    pathWidth: 4.2,
    props: {
      ring: ['tree_ancient_large', 'tree_tall_cluster', 'bamboo_grove', 'tree_bush_bright'],
      grove: ['tree_ancient_large', 'tree_ancient_variant', 'bamboo_grove', 'tree_tall_cluster'],
      rocks: ['rock_boulder_mossy', 'rock_cliff_crag'],
    },
  },
  cave: {
    label: 'Payon cave',
    grade: '#6a5f86', gradeAlpha: 0.22,
    base: 'rock_abyss', blend: 'riverbank_wall', path: 'cliff_rock',
    edge: 'rock_abyss', shore: 'cliff_rock', water: 'water_dark_0', deep: '#2c4a5e',
    ground: '#5b5466', fog: '#332d40',
    mottle: ['#6a6278', '#4a4356', '#7b7189', '#3b3548'],
    rim: '#453e52', verge: '#6a6378', gravel: '#7b7488', edgeTint: '#4d4760',
    decals: { pebble: 3, crack: 2.4, moss: 1.4, crystal: 0.5, bone: 0.6 },
    palette: { petal: ['#b9a6d8', '#8fd7e0'], blade: ['#4f6b56', '#33473c'] },
    sparkle: false, pathAlpha: 0.55,
    pathWidth: 5.2,
    props: {
      ring: ['stalagmite', 'rock_cliff_crag', 'crystal_cluster', 'standing_stone'],
      grove: ['stalagmite', 'crystal_cluster', 'rock_boulder_mossy'],
      rocks: ['rock_boulder_mossy', 'stalagmite'],
    },
  },
  sograt: {
    label: 'Sograt desert',
    grade: '#e9b96e', gradeAlpha: 0.42,
    base: 'sand', blend: 'sand_gold', path: 'dirt_path',
    edge: 'cliff_sand', shore: 'sand_dark', water: 'water_frame_0', deep: '#3a7f88',
    ground: '#dbbe8d', fog: '#8a6a48',
    mottle: ['#e8c98f', '#c9a673', '#f2d9a0', '#b8945f'],
    rim: '#9a7549', verge: '#c1a473', gravel: '#f4e4bb', edgeTint: '#b08d5c',
    decals: { ripple: 1.2, pebble: 1.1, shrub: 0.9, cracked: 0.8 },
    palette: { petal: ['#e6cf8f', '#d7b678'], blade: ['#9c9455', '#7d7a46'] },
    pathWidth: 4.2,
    props: {
      ring: ['rock_cliff_crag', 'palm_giant', 'palm_tall', 'cactus_small', 'ruin_pillar'],
      grove: ['palm_giant', 'palm_double', 'palm_tall', 'cactus_flower'],
      rocks: ['rock_boulder_mossy', 'ruin_stump', 'ruin_curb'],
    },
  },
  labyrinth: {
    label: 'Labyrinth ruins',
    grade: '#7d8f54', gradeAlpha: 0.36,
    base: 'grass_olive', blend: 'ruin_cobble', path: 'ruin_cobble',
    edge: 'cliff_rock', shore: 'cliff_rock', water: 'water_dark_0', deep: '#26404a',
    ground: '#84906c', fog: '#43543c',
    mottle: ['#9aa27a', '#6f7d60', '#adb48c', '#5c6a52'],
    rim: '#4d4835', verge: '#61764e', gravel: '#b0a992', edgeTint: '#5d7a4a',
    decals: { tuft: 2.4, crack: 3, moss: 2.4, pebble: 2.6, flower: 0.6, bone: 0.4 },
    palette: { petal: ['#e8dca6', '#c9b6c6'], blade: ['#7d975e', '#4e6a45'] },
    pathWidth: 5,
    props: {
      ring: ['standing_stone', 'ruin_pillar', 'rock_cliff_crag', 'tree_ancient_variant'],
      grove: ['standing_stone', 'ruin_pillar', 'ruin_column_fallen', 'tree_ancient_variant'],
      rocks: ['rock_boulder_mossy', 'ruin_stump'],
    },
  },
  dune: {
    label: 'Desert sinkhole',
    grade: '#cf8b4a', gradeAlpha: 0.42,
    base: 'sand_dark', blend: 'sand', path: 'sand',
    edge: 'cliff_sand', shore: 'sand_dark', water: 'water_dark_0', deep: '#2e4450',
    ground: '#c39a6a', fog: '#6d4c30',
    mottle: ['#d6ac78', '#a98256', '#e4bd8b', '#96734a'],
    rim: '#7a5634', verge: '#a07c50', gravel: '#eed7a8', edgeTint: '#9c7a4e',
    decals: { ripple: 2.2, pebble: 0.8, cracked: 0.9, bone: 0.4 },
    palette: { petal: ['#d8bd88'], blade: ['#8f8148'] },
    pathWidth: 4.8,
    props: {
      ring: ['rock_cliff_crag', 'desert_bone', 'ruin_stump', 'cactus_small'],
      grove: ['ruin_pillar', 'ruin_column_fallen', 'desert_bone'],
      rocks: ['rock_boulder_mossy', 'ruin_stump'],
    },
  },
};

export const MAP_BIOME = {
  meadow: 'prontera', forest: 'payon', payon: 'cave',
  morroc: 'sograt', arena: 'labyrinth', lair: 'dune',
};

export const biomeFor = mapId => BIOMES[MAP_BIOME[mapId] || 'prontera'];

// Upstream's own tuned billboard factors, relative to the imported hero height.
// The kit ships a character strip so every prop keeps its painted proportions;
// these are presentation values only, never gameplay collision sizes.
export const PROP_FACTOR = {
  // The kit's canopies are painted large; at gameplay zoom they dwarf the
  // monsters, so the big trees come down a notch and the pocket forest keeps its
  // depth from count rather than from individual scale.
  tree_ancient_large: 0.82, tree_ancient_variant: 0.8, tree_tall_cluster: 0.76, tree_sapling: 0.5,
  tree_bush_bright: 0.38, rock_cliff_crag: 0.62, river_stone_post: 0.55, rock_boulder_mossy: 0.45,
  palm_giant: 0.9, palm_tall: 0.85, palm_double: 0.9, cactus_flower: 0.45, cactus_small: 0.4,
  ruin_pillar: 0.6, ruin_column_fallen: 0.4, ruin_stump: 0.45, ruin_curb: 0.35, desert_bone: 0.45,
  bamboo_grove: 0.8, tree_dead: 0.62, tombstone: 0.45, house_ruin: 0.75, tree_cherry: 0.8,
  lantern_stone: 0.55, bridge_red_arch: 0.7, torii_gate: 0.75, shrine_stone: 0.65,
  stalagmite: 0.6, crystal_cluster: 0.45, standing_stone: 0.55, tree_dark_gnarled: 1,
  house_prontera: 0.7, tower_geffen: 1.05, pier_post: 0.45,
};
export const propScale = (id, scale = 1) => 0.7 * (PROP_FACTOR[id] ?? 1) * scale;

/* --------------------------------------------------------- map art recipes */

// Each recipe dresses one field: authored landmarks, tree groves, water and the
// per-field decal flavour. Coordinates are game-world units, matching data.js.
const ART = {
  meadow: {
    landmark: [
      ['house_prontera', -38, 26.5, 1, false],
      ['house_prontera', -32.5, 30.5, 0.82, true],
      ['lantern_stone', -33.5, 22.4],
      ['lantern_stone', -30.2, 20.6],
      ['standing_stone', 0.6, 12.6, 0.9],
      ['tree_ancient_large', 20.5, 14.5, 1.05],
      ['tree_ancient_variant', -6.5, -20.5, 1.1],
      ['river_stone_post', 30.5, 22.5],
    ],
    groves: [
      { x: 30, y: 12, r: 11, count: 4, props: ['tree_ancient_variant', 'tree_sapling'] },
      { x: -31, y: 14, r: 9, count: 3, props: ['tree_ancient_variant', 'tree_bush_bright'] },
      { x: 36, y: -22, r: 9, count: 4, props: ['tree_tall_cluster', 'rock_boulder_mossy'] },
      { x: -22, y: -26, r: 9, count: 4, props: ['tree_ancient_large', 'tree_bush_bright'] },
      { x: 10, y: -29, r: 8, count: 3, props: ['tree_ancient_variant', 'tree_sapling'] },
      { x: 40, y: 18, r: 6, count: 2, props: ['tree_sapling', 'tree_bush_bright'] },
      { x: -12, y: 24, r: 6, count: 2, props: ['tree_bush_bright', 'tree_sapling'] },
    ],
    // Soft undergrowth masses: shape only, props carry the height.
    undergrowth: [
      { x: 26, y: 9, r: 14 }, { x: -27, y: 12, r: 11 }, { x: 34, y: -19, r: 11 },
      { x: -19, y: -23, r: 11 }, { x: 8, y: -29, r: 9 }, { x: -34, y: -6, r: 8 },
    ],
    water: [
      { flow: [[18, -105], [24, -46], [26, -24], [23, -10], [28, 4], [26, 18], [36, 58], [42, 108]], width: 7 },
    ],
    // East spur: crosses the stream on a plank bridge, joining the meadow to the
    // thicket's far side.
    trails: [[[23, 8], [26.5, 7.6], [31.5, 6.4], [38, 4.5]]],
    pools: [],
  },
  forest: {
    landmark: [
      ['tree_ancient_large', -21, -9, 1.15],
      ['tree_ancient_large', 23, 15, 1.05],
      ['bamboo_grove', -12.5, 16.5, 1],
      ['bamboo_grove', 16.5, -9.5, 0.95],
      ['shrine_stone', -24, 20, 0.9],
      ['lantern_stone', -18.5, 12.5],
    ],
    groves: [
      { x: -17, y: -15, r: 12, count: 7, props: ['tree_ancient_large', 'tree_ancient_variant', 'bamboo_grove'] },
      { x: 18, y: -17, r: 11, count: 6, props: ['tree_ancient_variant', 'tree_tall_cluster'] },
      { x: 6, y: 20, r: 12, count: 6, props: ['bamboo_grove', 'tree_ancient_large'] },
      { x: -8, y: 2, r: 8, count: 3, props: ['rock_boulder_mossy', 'bamboo_grove'] },
      { x: 26, y: 5, r: 8, count: 4, props: ['tree_ancient_large', 'bamboo_grove'] },
      { x: -26, y: 6, r: 8, count: 4, props: ['bamboo_grove', 'tree_ancient_variant'] },
    ],
    undergrowth: [
      { x: -17, y: -15, r: 13 }, { x: 18, y: -17, r: 12 }, { x: 6, y: 20, r: 13 },
      { x: 27, y: 6, r: 9 }, { x: -27, y: 7, r: 9 },
    ],
    water: [
      { flow: [[-104, 58], [-52, 34], [-24, 16], [-14, 10], [-4, 6], [8, 3], [22, -2], [52, -20], [104, -52]], width: 6.2 },
    ],
    trails: [[[-30, 12], [-4, 6], [4, 0]]],
    pools: [],
  },
  payon: {
    landmark: [
      ['standing_stone', -14, -6, 1],
      ['standing_stone', 12, 8, 0.95],
      ['crystal_cluster', 6, -14, 1],
      ['stalagmite', -22, 6, 1.05],
      ['stalagmite', 20, -16, 0.9],
      ['lantern_stone', -8, 9],
      ['ruin_pillar', 14, -4, 0.9],
    ],
    undergrowth: [{ x: -20, y: -14, r: 9 }, { x: 18, y: 14, r: 9 }, { x: 0, y: 21, r: 8 }],
    // Paved shrine floors the cave was built on, now half-buried in rubble.
    floorAreas: [
      { x: -6, y: 2, r: 11, tile: 'ruin_cobble' },
      { x: 13, y: -9, r: 8, tile: 'ruin_cobble' },
      { x: -18, y: 14, r: 7, tile: 'limestone_pale' },
    ],
    groves: [
      { x: -20, y: -14, r: 9, count: 4, props: ['stalagmite', 'crystal_cluster'] },
      { x: 18, y: 14, r: 9, count: 4, props: ['stalagmite', 'rock_boulder_mossy'] },
      { x: 0, y: 20, r: 8, count: 3, props: ['standing_stone', 'crystal_cluster'] },
    ],
    water: [
      { flow: [[-88, 46], [-48, 30], [-18, 20], [-8, 17], [2, 19], [12, 23], [40, 34], [96, 58]], width: 5 },
    ],
    // A shaft trail from the upper gallery down to the shrine floor.
    trails: [[[-9, 11], [-4, 25.5], [2, 34]]],
    pools: [{ x: 24, y: -22, rx: 7, ry: 4.6 }],
  },
  morroc: {
    landmark: [
      ['palm_giant', -18, 17, 1],
      ['palm_double', 14, -16, 1.05],
      ['ruin_pillar', 8, 12, 1.05],
      ['ruin_pillar', 10.5, 13, 0.9],
      ['ruin_column_fallen', -6, 18, 1],
      ['ruin_curb', 2, 14.5],
      ['cactus_flower', -24, -10, 1],
      ['desert_bone', 24, 10, 0.9],
      ['desert_bone', 21, 12.5, 0.75],
    ],
    undergrowth: [{ x: -20, y: 15, r: 10 }, { x: 20, y: -14, r: 10 }, { x: 26, y: 14, r: 9 }],
    floorAreas: [{ x: 6, y: 0, r: 12, tile: 'sand_dark' }],
    groves: [
      { x: -20, y: 15, r: 10, count: 4, props: ['palm_tall', 'palm_double', 'cactus_small'] },
      { x: 20, y: -14, r: 10, count: 4, props: ['palm_giant', 'cactus_flower'] },
      { x: 26, y: 14, r: 9, count: 3, props: ['rock_cliff_crag', 'ruin_stump'] },
      { x: -16, y: -18, r: 9, count: 3, props: ['ruin_stump', 'cactus_small'] },
    ],
    water: [],
    pools: [{ x: -19, y: 14, rx: 6.4, ry: 4.2 }],
  },
  arena: {
    landmark: [
      ['standing_stone', -8.6, -8.6, 1],
      ['standing_stone', 8.6, -8.6, 1],
      ['standing_stone', -8.6, 8.6, 1],
      ['standing_stone', 8.6, 8.6, 1],
      ['ruin_pillar', -13, 0, 1],
      ['ruin_pillar', 13, 0, 1],
      ['ruin_column_fallen', 0, -14, 1],
      ['ruin_column_fallen', 0, 14.5, 0.9],
      ['ruin_curb', -4.5, 13.2],
      ['ruin_curb', 4.5, 13.2],
      ['tree_ancient_variant', -16, 12, 0.95],
      ['tree_ancient_variant', 16, -12, 0.95],
      ['ruin_pillar', -5, -15.5, 0.85],
      ['ruin_pillar', 6.5, 15, 0.8],
      ['ruin_column_fallen', 15, 6, 0.95],
      ['ruin_column_fallen', -15.5, -5, 0.9],
      ['ruin_curb', -11, 4.5], ['ruin_curb', 11, -4.5],
      ['standing_stone', 0, -17.5, 0.9],
      ['rock_cliff_crag', -19, 2, 0.85], ['rock_cliff_crag', 19.5, -1, 0.85],
    ],
    undergrowth: [{ x: -15, y: -13, r: 8 }, { x: 15, y: 13, r: 8 }],
    floorAreas: [{ x: 0, y: 0, r: 13, tile: 'ruin_cobble' }],
    groves: [
      { x: -15, y: -13, r: 7, count: 3, props: ['rock_cliff_crag', 'tree_ancient_variant'] },
      { x: 15, y: 13, r: 7, count: 3, props: ['rock_boulder_mossy', 'standing_stone'] },
    ],
    water: [],
    pools: [],
  },
  lair: {
    landmark: [
      ['desert_bone', -9, 9, 1.15],
      ['desert_bone', 10, -8, 1.05],
      ['desert_bone', 2, 13, 0.9],
      ['ruin_pillar', -16, -6, 1.1],
      ['ruin_pillar', 16, 5, 0.95],
      ['ruin_column_fallen', -6, -14, 1],
      ['ruin_stump', 13, 13, 1],
      ['rock_cliff_crag', -20, 12, 0.9],
    ],
    undergrowth: [{ x: -18, y: -15, r: 9 }, { x: 18, y: 15, r: 9 }],
    floorAreas: [
      { x: 0, y: 1, r: 14, tile: 'ruin_cobble' },
      { x: -8, y: -9, r: 5.5, tile: 'sand_dark' },
      { x: 9, y: 10, r: 5, tile: 'sand_dark' },
    ],
    groves: [
      { x: -18, y: -15, r: 8, count: 4, props: ['rock_cliff_crag', 'ruin_stump'] },
      { x: 18, y: 15, r: 8, count: 4, props: ['rock_cliff_crag', 'desert_bone'] },
      { x: -24, y: 4, r: 7, count: 3, props: ['ruin_pillar', 'rock_cliff_crag'] },
      { x: 24, y: -6, r: 7, count: 3, props: ['ruin_column_fallen', 'cactus_small'] },
    ],
    water: [],
    pools: [],
  },
};

export const artFor = mapId => ART[mapId] || ART.meadow;
// The painted extent is the playable bounds plus the apron.
export const groundExtent = mapId => {
  const b = mapBounds(mapId);
  return { x: b.x + APRON, y: b.y + APRON };
};
// The growth belt starts where the playable ground ends.
export const beltExtent = mapId => {
  const b = mapBounds(mapId);
  return { x: b.x + BELT, y: b.y + BELT };
};

/* -------------------------------------------------------------- tile paint */

// A CanvasPattern belongs to the context that created it: reusing one across two
// canvases silently paints nothing or paints stale pixels. Every chunk has its
// own context, so patterns are cached per context (weakly, so chunks can be
// collected) and per image.
const tileCache = new WeakMap();
// Fallback for engines without CanvasPattern.setTransform: fold the scale into the
// current transform while the pattern is assigned, then restore it.
function scaleForPattern(ctx, pat, k) {
  pat.__k = k;
}

function patternFor(ctx, image) {
  let byImage = tileCache.get(ctx);
  if (!byImage) { byImage = new Map(); tileCache.set(ctx, byImage); }
  let pat = byImage.get(image);
  if (!pat) {
    pat = ctx.createPattern(image, 'repeat');
    byImage.set(image, pat);
  }
  return pat;
}
// Fill a world-space rect with a repeating ground tile at a fixed world scale.
// The pattern is laid out in user space, so neighbouring chunks line up exactly.
function tileFill(ctx, sprites, name, rect, units, alpha, rotation) {
  const image = sprites.tile(name);
  if (!image) return false;
  const pat = patternFor(ctx, image);
  if (!pat) return false;
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  const k = units / (image.width || 128);
  if (rotation) {
    // Break the obvious repeat by laying the tile at an angle. The fill is
    // enlarged to the rotated bounding box, so the corners of the chunk are
    // still covered; the chunk clip trims the overflow.
    const cx = (rect.x0 + rect.x1) / 2, cy = (rect.y0 + rect.y1) / 2;
    const w = rect.x1 - rect.x0, h = rect.y1 - rect.y0;
    const span = (Math.abs(w * Math.cos(rotation)) + Math.abs(h * Math.sin(rotation))) * 0.5 + 1;
    const spanY = (Math.abs(h * Math.cos(rotation)) + Math.abs(w * Math.sin(rotation))) * 0.5 + 1;
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
    rect = { x0: cx - span, y0: cy - spanY, x1: cx + span, y1: cy + spanY };
  }
  // The pattern's own transform is set in *user* space, not canvas space, so the
  // same world coordinate always samples the same texel: chunk roots never shift
  // the tile phase, which is what keeps borders seamless.
  if (pat.setTransform && typeof DOMMatrix === 'function') {
    pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
  } else {
    scaleForPattern(ctx, pat, k);
  }
  ctx.fillStyle = pat;
  ctx.fillRect(rect.x0 - 1, rect.y0 - 1, rect.x1 - rect.x0 + 2, rect.y1 - rect.y0 + 2);
  ctx.restore();
  return true;
}

// Soft-edged patch of a tile family. Built from several overlapping offset blobs
// at low alpha, never one ellipse: a single ellipse leaves a visible ring where
// its edge crosses the grass.
function tilePatch(ctx, sprites, name, x, y, rx, ry, units, alpha, seed) {
  const lobes = 5;
  for (let i = 0; i < lobes; i++) {
    const a = hash2(seed + i, 13, 401) * Math.PI * 2;
    const off = hash2(seed + i, 17, 409) * 0.45;
    const cx = x + Math.cos(a) * rx * off;
    const cy = y + Math.sin(a) * ry * off;
    const sx = rx * (0.5 + hash2(seed + i, 19, 419) * 0.4);
    const sy = ry * (0.5 + hash2(seed + i, 23, 421) * 0.4);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, sx, sy, 0, 0, Math.PI * 2);
    ctx.clip();
    tileFill(ctx, sprites, name, { x0: cx - sx * 1.2, y0: cy - sy * 1.2, x1: cx + sx * 1.2, y1: cy + sy * 1.2 }, units, alpha / lobes * 2.4);
    ctx.restore();
  }
}


// A radial gradient stretched into an ellipse. Canvas radial gradients are always
// circular, so clipping one to an ellipse leaves a hard elliptical rim wherever
// the gradient is still opaque. Stretching the *canvas* instead keeps the falloff
// round and therefore perfectly soft. Any soft ground shape must use this.
export function softEllipse(ctx, x, y, rx, ry, stops) {
  const units = Math.max(rx, ry);
  if (!(units > 0)) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx / units, ry / units);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, units);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, units, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}


// A textured region with no visible border. The tile is laid down repeatedly,
// each pass clipped to a slightly smaller ellipse and carrying a little more
// alpha: the accumulated opacity ramps smoothly from nothing at the rim to full
// at the centre. Clipping a *single* pass leaves a hard rim wherever the pattern
// colour differs from the ground, which is why textured areas are built this way.
// A region of one tile laid on top of the ground with a genuinely soft edge.
// The tile is painted at full strength into its own buffer, and a many-lobed
// soft mask is punched into it with `destination-in`. That gives a textured
// floor patch whose border fades out over a couple of world units, with no
// visible ring where the layers stop.
export function softTileArea(ctx, sprites, tile, x, y, rx, ry, units, alpha, seed) {
  const pad = 1.4;
  const m = ctx.getTransform();
  // All four corners: under the isometric projection the rect is rotated 45°, so
  // two opposite corners do not describe its extent.
  const pts = [
    m.transformPoint(new DOMPoint(x - rx * pad, y - ry * pad)),
    m.transformPoint(new DOMPoint(x + rx * pad, y - ry * pad)),
    m.transformPoint(new DOMPoint(x + rx * pad, y + ry * pad)),
    m.transformPoint(new DOMPoint(x - rx * pad, y + ry * pad)),
  ];
  const left = Math.floor(Math.min(...pts.map(v => v.x))), top = Math.floor(Math.min(...pts.map(v => v.y)));
  const w = Math.ceil(Math.max(...pts.map(v => v.x)) - left) + 2;
  const h = Math.ceil(Math.max(...pts.map(v => v.y)) - top) + 2;
  if (w < 2 || h < 2 || w > 4096 || h > 4096) return;
  // The buffer's local space is the parent's device space shifted so its corner
  // is (0,0): device' = device - (left, top), and device = m * world.
  const shift = new DOMMatrix([1, 0, 0, 1, -left, -top]).multiply(m);
  const buf = document.createElement('canvas');
  buf.width = w; buf.height = h;
  const bx = buf.getContext('2d');
  bx.setTransform(shift);
  tileFill(bx, sprites, tile, { x0: x - rx * pad, y0: y - ry * pad, x1: x + rx * pad, y1: y + ry * pad }, units, 1);
  // The mask is built on its own canvas as the *union* of several soft lobes,
  // then applied in one `destination-in`. Applying lobes one at a time would
  // intersect them and shrink the patch to nothing.
  const mask = document.createElement('canvas');
  mask.width = w; mask.height = h;
  const mx = mask.getContext('2d');
  mx.setTransform(shift);
  // Lobe falloffs *add* so the patch's core saturates to full coverage and only
  // the outer rim stays translucent; plain source-over would let each lobe's rim
  // punch holes in its neighbours. Radii and reaches are drawn from a wide range
  // so the union is a ragged blob rather than an ellipse.
  mx.globalCompositeOperation = 'lighter';
  const lobes = 14;
  for (let l = 0; l < lobes; l++) {
    const ang = (l / lobes) * Math.PI * 2 + hash2(seed, l, 769) * 1.7;
    const reach = 0.12 + hash2(seed + l, 11, 773) * 0.52;
    const lx = x + Math.cos(ang) * rx * reach;
    const ly = y + Math.sin(ang) * ry * reach;
    const lrx = rx * (0.3 + Math.pow(hash2(seed + l, 13, 777), 1.6) * 0.6);
    const lry = ry * (0.3 + Math.pow(hash2(seed + l, 17, 779), 1.6) * 0.6);
    const grow = 0.55 + hash2(seed + l, 19, 787) * 0.4;
    softEllipse(mx, lx, ly, lrx, lry, [
      [0, `rgba(255,255,255,${grow.toFixed(3)})`],
      [0.5, `rgba(255,255,255,${(grow * 0.82).toFixed(3)})`],
      [0.82, `rgba(255,255,255,${(grow * 0.3).toFixed(3)})`],
      [1, 'rgba(255,255,255,0)'],
    ]);
  }
  bx.globalCompositeOperation = 'destination-in';
  bx.setTransform(1, 0, 0, 1, 0, 0);
  bx.drawImage(mask, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(buf, left, top);
  ctx.restore();
}

/* ------------------------------------------------------------------- water */

// Trace a polyline as a smooth spline: quadratic segments through the midpoints
// of each span. Authored control points then read as a road that wanders, not a
// chain of straight hips and corners.
export function pathTrace(ctx, points) {
  if (!points.length) return;
  ctx.moveTo(points[0][0], points[0][1]);
  if (points.length === 1) return;
  if (points.length === 2) { ctx.lineTo(points[1][0], points[1][1]); return; }
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
}

// Cumulative length, plus the point and heading at a fraction of the way along,
// measured on the traced spline's control polygon (close enough for scatter).
export function pathLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  }
  return total;
}

export function pointAlong(points, t) {
  const total = pathLength(points) * clamp(t, 0, 1);
  let run = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i], [bx, by] = points[i + 1];
    const seg = Math.hypot(bx - ax, by - ay);
    if (run + seg >= total || i === points.length - 2) {
      const k = seg ? (total - run) / seg : 0;
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, angle: Math.atan2(by - ay, bx - ax) };
    }
    run += seg;
  }
  const [x, y] = points[points.length - 1];
  return { x, y, angle: 0 };
}

export const pathAngle = (points, t) => pointAlong(points, t).angle;

function strokePolyline(ctx, points, width, color, alpha = 1) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath();
  pathTrace(ctx, points);
  ctx.stroke();
  ctx.restore();
}

// Water ribbons read as a stream that wanders. Order matters: damp ground first,
// then the water body, then only a whisper of surface detail. A stream must never
// look like a pale ribbon laid over the grass.
function paintStream(ctx, sprites, biome, stream, rect) {
  const pts = stream.flow;
  const w = stream.width;
  const mud = biome.shore === 'riverbank_wall' ? '#4a463c' : '#8a7752';
  // 1. Damp verge: wide, weak passes; the bank has no kerb line.
  strokePolyline(ctx, pts, w + 9, mud, 0.07);
  strokePolyline(ctx, pts, w + 6.4, mud, 0.1);
  strokePolyline(ctx, pts, w + 4.2, mud, 0.13);
  strokePolyline(ctx, pts, w + 2.4, shadeHex(mud, -14), 0.16);
  paintBankStones(ctx, pts, w, mud, rect);
  // 2. The water body: dark bed, then the kit's ripple tile at low strength.
  ctx.save();
  ctx.beginPath();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = w;
  pathTrace(ctx, pts);
  ctx.clip();
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const box = {
    x0: Math.min(...xs) - w * 1.2, y0: Math.min(...ys) - w * 1.2,
    x1: Math.max(...xs) + w * 1.2, y1: Math.max(...ys) + w * 1.2,
  };
  ctx.fillStyle = biome.deep || '#2a6270';
  ctx.fillRect(box.x0 - 2, box.y0 - 2, box.x1 - box.x0 + 4, box.y1 - box.y0 + 4);
  // Light gathering toward the middle of the channel.
  const mid = ctx.createLinearGradient(0, box.y0 - w, 0, box.y1 + w);
  mid.addColorStop(0, 'rgba(255,255,255,0)');
  mid.addColorStop(0.5, 'rgba(150,220,220,.14)');
  mid.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = mid;
  ctx.fillRect(box.x0 - 2, box.y0 - 2, box.x1 - box.x0 + 4, box.y1 - box.y0 + 4);
  tileFill(ctx, sprites, biome.water, box, TILE_UNITS * 2.6, 0.26, 0.2);
  ctx.restore();
  // 3. RO-style shoreline: a pale wet band just above the waterline, then the
  //    darker seam, then the bright inner rim. Without the pale band the water
  //    looks laid on top of the grass instead of cut into it.
  strokePolyline(ctx, pts, w + 0.75, shadeHex(mud, 26), 0.4);
  // 3b. Darker seam where the water meets the bank, then a thin light foam line
  //    only on the upper bank, where the current catches the light.
  strokePolyline(ctx, pts, w - 0.6, shadeHex(biome.deep || '#2a6270', -18), 0.45);
  strokePolyline(ctx, pts, w - 2.1, shadeHex(biome.deep || '#2a6270', 12), 0.5);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len, ny = (bx - ax) / len;
    const off = w * 0.44;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = 'rgba(226,248,246,.55)';
    ctx.lineWidth = 0.45; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax + nx * off, ay + ny * off);
    ctx.quadraticCurveTo((ax + bx) / 2 + nx * (off + 0.2), (ay + by) / 2 + ny * (off + 0.2), bx + nx * off, by + ny * off);
    ctx.stroke();
    ctx.restore();
  }
  if (biome.sparkle !== false) paintStreamSparkle(ctx, pts, w, biome, rect);
}

function paintStreamSparkle(ctx, pts, w, biome, rect) {
  const petal = biome.palette.petal[0] || '#dff3ff';
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.round(len / 1.6));
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps;
      const x = mix(ax, bx, t), y = mix(ay, by, t);
      if (rect && rectMisses(rect, x - 1, y - 1, x + 1, y + 1, 0)) continue;
      const h = hash2(Math.round(x * 3), Math.round(y * 3), 41);
      if (h < 0.68) continue;
      ctx.save();
      ctx.globalAlpha = 0.07 + h * 0.1;
      ctx.fillStyle = 'rgba(226,250,250,.9)';
      ctx.beginPath();
      ctx.ellipse(x + (h - 0.5) * w * 0.5, y + (hash2(s, i, 9) - 0.5) * w * 0.5,
        w * (0.07 + h * 0.1), w * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// Small stones and grit sitting on the bank, never inside the water body.
function paintBankStones(ctx, pts, w, mud, rect) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.round(len / 1.7));
    const dx = (bx - ax) / (len || 1), dy = (by - ay) / (len || 1);
    for (let s = 0; s < steps; s++) {
      for (const side of [-1, 1]) {
        const h = hash2(i * 71 + s, side, 601);
        if (h < 0.66) continue;
        const t = (s + h) / steps;
        const off = side * w * (0.56 + h * 0.22);
        const x = mix(ax, bx, t) - dy * off, y = mix(ay, by, t) + dx * off;
        if (rect && rectMisses(rect, x - 1, y - 1, x + 1, y + 1, 0)) continue;
        ctx.save();
        ctx.globalAlpha = 0.3 + h * 0.3;
        ctx.fillStyle = shadeHex(mud, h > 0.5 ? 16 : -10);
        ctx.beginPath(); ctx.ellipse(x, y, 0.1 + h * 0.22, 0.07 + h * 0.12, h * 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }
}

function shadeHex(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => clamp(Math.round(v + amount), 0, 255));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

function paintPool(ctx, sprites, biome, pool) {
  // Soft muddy rim: two stretched rings, feathered rather than cut.
  const mud = biome.shore === 'riverbank_wall' ? '#4b4a42' : '#a89267';
  softEllipse(ctx, pool.x, pool.y, pool.rx * 1.42, pool.ry * 1.42, [[0, mud + '00'], [0.55, mud + '55'], [1, mud + '00']]);
  softEllipse(ctx, pool.x, pool.y, pool.rx * 1.14, pool.ry * 1.14, [[0, mud + 'dd'], [0.75, mud + 'aa'], [1, mud + '00']]);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pool.x, pool.y, pool.rx * 1.06, pool.ry * 1.06, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = biome.deep || '#2a6270';
  ctx.fillRect(pool.x - pool.rx * 1.2, pool.y - pool.ry * 1.2, pool.rx * 2.4, pool.ry * 2.4);
  ctx.restore();
  tileFill(ctx, sprites, biome.water, {
    x0: pool.x - pool.rx * 1.2, y0: pool.y - pool.ry * 1.2,
    x1: pool.x + pool.rx * 1.2, y1: pool.y + pool.ry * 1.2,
  }, TILE_UNITS * 2.6, 0.3, 0.2);
  ctx.restore();
  // Rim highlight so the water sits inside the ground rather than on it.
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = 'rgba(238,250,246,.4)';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.ellipse(pool.x, pool.y, pool.rx * 0.98, pool.ry * 0.98, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  paintStreamSparkle(ctx, [[pool.x - pool.rx * 0.7, pool.y], [pool.x + pool.rx * 0.7, pool.y]], pool.ry * 1.2, biome);
}

/* ------------------------------------------------------------------- roads */

// A worn path: dark moist rim, gravel shoulder, then the packed tile itself in
// several alpha passes so the edge feathers into the grass.
// Every path on the field: the map's own roads plus the recipe's short trails.
// Roads are the authored paths that are *drawn*. Trails are invisible guides used
// only to work out where a road has to cross water, so a map can gain a crossing
// without gaining a naked stub of path in the middle of a field.
export function roadsFor(mapId) {
  const map = MAPS[mapId];
  return (map?.road || []).filter(line => line && line.length > 1);
}

export function trailLines(mapId) {
  const art = artFor(mapId);
  return (art.trails || []).filter(line => line && line.length > 1);
}

function paintRoads(ctx, sprites, mapId, biome, rect) {
  for (const line of [...roadsFor(mapId), ...trailLines(mapId)]) {
    const pts = line;
    const w = biome.pathWidth;
    // Soft shoulder first: the worn ground bleeds outward in several passes so a
    // path never has a cut edge where it meets grass.
    // A long, weak tail in the biome's own verge colour: the path has no border
    // line, just a gradual change of ground.
    strokePolyline(ctx, pts, w + 15, biome.verge, 0.05);
    strokePolyline(ctx, pts, w + 11, biome.verge, 0.07);
    strokePolyline(ctx, pts, w + 8, biome.verge, 0.1);
    strokePolyline(ctx, pts, w + 5.6, biome.rim, 0.07);
    strokePolyline(ctx, pts, w + 3.8, biome.rim, 0.07);
    strokePolyline(ctx, pts, w + 2.2, biome.gravel, 0.09);
    strokePolyline(ctx, pts, w + 1.1, biome.gravel, 0.1);
    // The path is built from the outside in: a pale halo of worn ground, then
    // ragged patches of dirt that break the silhouette, then a packed centre.
    // Nothing is drawn at full opacity, so grass always shows through and the
    // road reads as trodden earth rather than a cut ribbon.
    const image = sprites.tile(biome.path);
    if (image) {
      const pat = patternFor(ctx, image);
      if (pat) {
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const k = (TILE_UNITS * 0.75) / (image.width || 128);
        if (pat.setTransform && typeof DOMMatrix === 'function') pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
        const strokePath = (width, alpha) => {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = pat;
          ctx.lineWidth = width;
          ctx.beginPath();
          pathTrace(ctx, pts);
          ctx.stroke();
        };
        const band = biome.pathAlpha ?? 1;
        // Worn halo: barely-there wide wash.
        strokePath(w + 4.2, 0.13 * band);
        strokePath(w + 2.2, 0.2 * band);
        // Ragged edge: small clods of the same earth, clustered near the margin.
        const n = Math.max(10, Math.round(pathLength(pts) * 1.4));
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const p = pointAlong(pts, t);
          const ang = p.angle;
          for (const side of [-1, 1]) {
            if (hash2(i, side + 17, 919) < 0.32) continue;
            const off = w * (0.3 + hash2(i, side + 3, 907) * 0.3) * side;
            const jx = (hash2(i, side + 11, 911) - 0.5) * 1.1;
            const jy = (hash2(i, side + 13, 913) - 0.5) * 1.1;
            const px = p.x + Math.cos(ang + Math.PI / 2) * off + jx;
            const py = p.y + Math.sin(ang + Math.PI / 2) * off + jy;
            const rr = 0.34 + hash2(i, side + 23, 929) * 0.5;
            if (rectMisses(rect, px - rr - 1, py - rr - 1, px + rr + 1, py + rr + 1, 0)) continue;
            ctx.save();
            ctx.globalAlpha = (0.26 + hash2(i, side + 19, 923) * 0.3) * band;
            ctx.beginPath();
            // Elongated along the direction of travel, so the clods read as
            // scuffed dirt rather than pebbles.
            ctx.ellipse(px, py, rr * 1.5, rr, ang, 0, Math.PI * 2);
            ctx.clip();
            tileFill(ctx, sprites, biome.path, { x0: px - rr - 0.6, y0: py - rr - 0.6, x1: px + rr + 0.6, y1: py + rr + 0.6 }, TILE_UNITS * 0.75, 1);
            ctx.restore();
          }
        }
        // Packed core: the part feet actually wore down.
        strokePath(w * 0.94, 0.5 * band);
        strokePath(w * 0.74, 0.62 * band);
        strokePath(w * 0.46, 0.5 * band);
        ctx.restore();
      }
    }
    // Wheel line: a paler worn strip just inside the centre.
    strokePolyline(ctx, pts, w * 0.34, 'rgba(255,246,222,.09)', 1);
    // Pebbles and grit along the verge, sparse and deterministic.
    paintVergeGrit(ctx, pts, w, biome, mapId);
  }
}

function paintVergeGrit(ctx, pts, w, biome, seed) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.round(len / 2.2));
    const dx = (bx - ax) / (len || 1), dy = (by - ay) / (len || 1);
    for (let s = 0; s < steps; s++) {
      for (const side of [-1, 1]) {
        const h = hash2(i * 31 + s, side, 71);
        if (h < 0.58) continue;
        const t = (s + h) / steps;
        const off = side * (w * (0.5 + h * 0.24));
        const x = mix(ax, bx, t) - dy * off + (h - 0.5) * 0.5;
        const y = mix(ay, by, t) + dx * off + (h - 0.5) * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.25 + h * 0.25;
        ctx.fillStyle = biome.gravel;
        ctx.beginPath();
        ctx.ellipse(x, y, 0.12 + h * 0.22, 0.08 + h * 0.12, h * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

// Bridges are not hand-placed: a deck is built exactly where a road crosses a
// water ribbon or pool. That is how real fields read, and it cannot drift out of
// alignment when a road or stream is retuned.
function crossings(mapId, art) {
  const found = [];
  for (const line of [...roadsFor(mapId), ...trailLines(mapId)]) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i], [bx, by] = line[i + 1];
      const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.4));
      let start = null;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = mix(ax, bx, t), y = mix(ay, by, t);
        const wet = inWater(art, x, y);
        if (wet && start === null) start = { x, y };
        else if (!wet && start !== null) {
          found.push([start, { x, y }]);
          start = null;
        }
      }
      if (start !== null) found.push([start, { x: bx, y: by }]);
    }
  }
  return found.filter(([p, q]) => Math.hypot(q.x - p.x, q.y - p.y) > 0.6);
}

// A plank deck spanning the water, extended a little onto both banks, drawn with
// plank rails on either side so it reads as a bridge from any zoom.
function paintBridges(ctx, sprites, mapId, art, biome, rect) {
  for (const [p, q] of crossings(mapId, art)) {
    if (rect && rectMisses(rect, Math.min(p.x, q.x) - 4, Math.min(p.y, q.y) - 4, Math.max(p.x, q.x) + 4, Math.max(p.y, q.y) + 4, 0)) continue;
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    const cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2;
    const deckLen = len + 5.4, deckW = Math.max(4.4, biome.pathWidth * 0.96);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    // Deck shadow on the water
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(10,24,26,.9)';
    ctx.beginPath();
    ctx.ellipse(0.3, 0.45, deckLen / 2, deckW / 2 * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Plank surface: the kit's own plank tile, clipped to the deck.
    const image = sprites.tile(biome.deck || 'bridge_planks');
    ctx.beginPath();
    ctx.rect(-deckLen / 2, -deckW / 2, deckLen, deckW);
    ctx.save();
    ctx.clip();
    if (image) {
      const pat = patternFor(ctx, image);
      if (pat && pat.setTransform && typeof DOMMatrix === 'function') {
        const k = (TILE_UNITS * 0.55) / (image.width || 128);
        pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
      }
      ctx.fillStyle = pat || '#8a6a45';
    } else ctx.fillStyle = '#8a6a45';
    ctx.fillRect(-deckLen / 2, -deckW / 2, deckLen, deckW);
    // Wear: darker at the edges, a pale walked line down the middle.
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#2a1c12';
    ctx.fillRect(-deckLen / 2, -deckW / 2, deckLen, deckW * 0.16);
    ctx.fillRect(-deckLen / 2, deckW / 2 - deckW * 0.16, deckLen, deckW * 0.16);
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = '#fff2cf';
    ctx.fillRect(-deckLen / 2, -deckW * 0.12, deckLen, deckW * 0.24);
    ctx.restore();
    // Rails
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#3a2818';
    ctx.lineWidth = 0.34;
    for (const side of [-1, 1]) {
      const y = side * (deckW / 2 - 0.2);
      ctx.beginPath();
      ctx.moveTo(-deckLen / 2, y);
      ctx.lineTo(deckLen / 2, y);
      ctx.stroke();
    }
    // Post heads at both ends
    ctx.globalAlpha = 1;
    for (const ex of [-deckLen / 2 + 0.7, deckLen / 2 - 0.7]) for (const side of [-1, 1]) {
      ctx.fillStyle = '#4a3320';
      ctx.beginPath();
      ctx.ellipse(ex, side * (deckW / 2 - 0.2), 0.34, 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,232,190,.35)';
      ctx.beginPath();
      ctx.ellipse(ex - 0.08, side * (deckW / 2 - 0.28), 0.16, 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ decals */

function paintDecal(ctx, kind, x, y, h, biome, scale) {
  const pal = biome.palette;
  const blade = pal.blade[(h * 97 | 0) % pal.blade.length];
  const petal = pal.petal[(h * 53 | 0) % pal.petal.length];
  const s = scale;
  ctx.save();
  switch (kind) {
    case 'tuft': {
      ctx.globalAlpha = 0.5 + h * 0.3;
      ctx.strokeStyle = blade;
      ctx.lineWidth = 0.1 * s;
      ctx.lineCap = 'round';
      for (let b = 0; b < 3; b++) {
        const a = (b - 1) * 0.6 + (h - 0.5) * 0.6;
        const len = (0.55 + h * 0.5) * s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.sin(a) * len * 0.4, y - len * 0.6, x + Math.sin(a) * len, y - len * 0.2);
        ctx.stroke();
      }
      break;
    }
    case 'flower': {
      ctx.globalAlpha = 0.4 + h * 0.24;
      ctx.fillStyle = petal;
      for (let p = 0; p < 3; p++) {
        const a = (p / 3) * Math.PI * 2 + h * 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 0.13 * s, y + Math.sin(a) * 0.08 * s, 0.1 * s, 0.07 * s, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.6; ctx.fillStyle = 'rgba(250,238,180,.85)';
      ctx.beginPath(); ctx.ellipse(x, y, 0.055 * s, 0.04 * s, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'clover': {
      ctx.globalAlpha = 0.3 + h * 0.25;
      ctx.fillStyle = blade;
      for (let p = 0; p < 4; p++) {
        const a = (p / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 0.15 * s, y + Math.sin(a) * 0.09 * s, 0.15 * s, 0.1 * s, a, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'leaf': {
      ctx.globalAlpha = 0.3 + h * 0.3;
      ctx.fillStyle = h > 0.5 ? '#6b4a2a' : '#8a6238';
      ctx.beginPath();
      ctx.ellipse(x, y, 0.2 * s, 0.09 * s, h * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pebble': {
      ctx.globalAlpha = 0.38 + h * 0.3;
      ctx.fillStyle = biome.gravel;
      ctx.beginPath(); ctx.ellipse(x, y, 0.19 * s, 0.12 * s, h * 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.4; ctx.fillStyle = 'rgba(255,255,246,.5)';
      ctx.beginPath(); ctx.ellipse(x - 0.04 * s, y - 0.04 * s, 0.09 * s, 0.05 * s, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'ripple': {
      ctx.globalAlpha = 0.16 + h * 0.16;
      ctx.strokeStyle = h > 0.5 ? 'rgba(255,246,214,.8)' : 'rgba(120,94,58,.55)';
      ctx.lineWidth = 0.07 * s;
      for (let r = 0; r < 2; r++) {
        ctx.beginPath();
        ctx.moveTo(x - 0.5 * s, y + r * 0.24 * s);
        ctx.quadraticCurveTo(x, y - 0.16 * s + r * 0.24 * s, x + 0.55 * s, y + 0.05 * s + r * 0.24 * s);
        ctx.stroke();
      }
      break;
    }
    case 'crack': {
      ctx.globalAlpha = 0.16 + h * 0.16;
      ctx.strokeStyle = '#221d16';
      ctx.lineWidth = 0.07 * s;
      ctx.beginPath();
      ctx.moveTo(x - 0.4 * s, y);
      ctx.lineTo(x - 0.1 * s, y + 0.18 * s);
      ctx.lineTo(x + 0.18 * s, y - 0.1 * s);
      ctx.lineTo(x + 0.45 * s, y + 0.12 * s);
      ctx.stroke();
      break;
    }
    case 'moss': {
      ctx.globalAlpha = 0.2 + h * 0.22;
      ctx.fillStyle = '#5f7a44';
      ctx.beginPath(); ctx.ellipse(x, y, 0.34 * s, 0.2 * s, h * 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'shrub': {
      // A dry desert shrub: a few splayed twigs of the biome's blade colour over
      // a faint shadow, not a green pill lying on the sand.
      ctx.globalAlpha = 0.22 + h * 0.18;
      ctx.fillStyle = 'rgba(120,96,64,.55)';
      ctx.beginPath(); ctx.ellipse(x + 0.08 * s, y + 0.1 * s, 0.34 * s, 0.14 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5 + h * 0.3;
      ctx.strokeStyle = blade; ctx.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI * 0.9 + (k / 4) * Math.PI * 0.85 + (hash2(x * 31 + k, y * 17, 71) - 0.5) * 0.3;
        const len = (0.26 + hash2(x * 13 + k, y * 7, 73) * 0.22) * s;
        ctx.lineWidth = 0.05 * s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.6, x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
      break;
    }
    case 'crystal': {
      ctx.globalAlpha = 0.24 + h * 0.2;
      ctx.fillStyle = '#a8d7e8';
      ctx.beginPath();
      ctx.moveTo(x, y - 0.4 * s); ctx.lineTo(x + 0.16 * s, y); ctx.lineTo(x, y + 0.16 * s); ctx.lineTo(x - 0.16 * s, y);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'bone': {
      ctx.globalAlpha = 0.3 + h * 0.25;
      ctx.strokeStyle = '#e3d8bf'; ctx.lineWidth = 0.09 * s;
      ctx.beginPath(); ctx.moveTo(x - 0.35 * s, y); ctx.quadraticCurveTo(x, y - 0.18 * s, x + 0.35 * s, y + 0.06 * s); ctx.stroke();
      break;
    }
    case 'cracked': {
      ctx.globalAlpha = 0.18 + h * 0.16;
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 0.06 * s;
      ctx.beginPath();
      ctx.moveTo(x - 0.45 * s, y - 0.1 * s); ctx.lineTo(x - 0.15 * s, y + 0.15 * s);
      ctx.lineTo(x + 0.1 * s, y - 0.12 * s); ctx.lineTo(x + 0.4 * s, y + 0.1 * s);
      ctx.stroke();
      break;
    }
    default: break;
  }
  ctx.restore();
}

/* -------------------------------------------------------------- prop layout */

const sceneryCache = new Map();
// Deterministic scenery: authored landmarks first, then seeded groves and a
// double ring of growth just outside the playable bounds. No prop is ever placed
// by a per-chunk random draw, so nothing pops in or out while panning.
export function sceneryFor(mapId) {
  const cached = sceneryCache.get(mapId);
  if (cached) return cached;
  const art = artFor(mapId), biome = biomeFor(mapId), b = mapBounds(mapId);
  const list = [];
  const add = (id, x, y, scale = 1, flip = false) => list.push({ id, x, y, scale, flip });

  for (const item of art.landmark) add(item[0], item[1], item[2], item[3] ?? 1, item[4] ?? false);

  art.groves.forEach((grove, gi) => {
    for (let i = 0; i < grove.count; i++) {
      const h = hash2(gi * 17 + i, grove.count, 211 + mapId.length);
      const a = h * Math.PI * 2;
      const rr = Math.sqrt(hash2(i, gi, 97)) * grove.r;
      const x = grove.x + Math.cos(a) * rr;
      const y = grove.y + Math.sin(a) * rr * 0.8;
      if (Math.abs(x) > b.x + 4 || Math.abs(y) > b.y + 4) continue;
      const props = grove.props;
      add(props[(h * 911 | 0) % props.length], x, y, 0.7 + h * 0.32, h > 0.62);
    }
  });

  // Framing growth: two staggered rows hugging the playable edge, plus a looser
  // outer row that disappears into the fog. Placement is jittered per prop so the
  // frame never reads as a repeated fence.
  const belt = beltExtent(mapId);
  const rows = [
    { inset: 1.2, step: 2.9, skip: 0.28, outer: false },
    { inset: 3.0, step: 3.4, skip: 0.4, outer: false },
    { inset: 5.4, step: 4.4, skip: 0.56, outer: true },
  ];
  rows.forEach((row, ri) => {
    const ax = b.x + row.inset, ay = b.y + row.inset;
    const perSide = Math.max(4, Math.round((ax + ay) / row.step));
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < perSide; i++) {
        const h = hash2(side * 1013 + i, ri * 7919, 313 + mapId.length);
        if (h < row.skip) continue;
        const t = (i + (h - 0.5) * 0.7) / perSide;
        let x, y;
        if (side === 0) { x = -ax + t * 2 * ax; y = -ay; }
        else if (side === 1) { x = ax; y = -ay + t * 2 * ay; }
        else if (side === 2) { x = ax - t * 2 * ax; y = ay; }
        else { x = -ax; y = ay - t * 2 * ay; }
        const hh = hash2(i, side, 557);
        const props = hh > 0.55 ? biome.props.grove : biome.props.ring;
        const id = props[(hh * 1291 | 0) % props.length];
        const jx = (h - 0.5) * 1.8, jy = (hh - 0.5) * 1.8;
        add(id, x + jx, y + jy, (row.outer ? 0.9 : 0.78) + h * 0.5, h > 0.5);
      }
    }
  });
  // A few lone landmark trees just outside the playable edge, so the silhouette
  // is asymmetric and readable at the widest zoom.
  // A ring of boulders around the plateau edge: the mass that closes the field
  // off in three dimensions. Placed on the rim's rounded rectangle and seeded by
  // index, so they never move and never land inside the walkable area.
  const rimBand = biome.rimBand || 7.5;
  for (let i = 0; i < 42; i++) {
    const ang = (i / 42) * Math.PI * 2 + hash2(i, 3, 653) * 0.14;
    const cx = Math.cos(ang), cy = Math.sin(ang);
    const k = 1 / Math.max(Math.abs(cx) / (b.x + rimBand), Math.abs(cy) / (b.y + rimBand));
    const x = cx * k + (hash2(i, 5, 659) - 0.5) * 5;
    const y = cy * k + (hash2(i, 7, 661) - 0.5) * 5;
    const id = i % 3 === 0 ? 'rock_cliff_crag' : 'rock_boulder_mossy';
    add(id, x, y, 0.5 + hash2(i, 11, 673) * 0.75, hash2(i, 13, 677) > 0.5);
  }
  const edgeLandmarks = biome.props.grove;
  for (let i = 0; i < 5; i++) {
    const h = hash2(i, 17, 881 + mapId.length);
    const side = (h * 4) | 0;
    const t = hash2(i, 23, 883) * 2 - 1;
    const off = 1.2 + hash2(i, 29, 887) * 2.2;
    const x = side === 0 ? t * b.x : side === 1 ? b.x + off : side === 2 ? t * b.x : -b.x - off;
    const y = side === 0 ? -b.y - off : side === 1 ? t * b.y : side === 2 ? b.y + off : t * b.y;
    add(edgeLandmarks[(h * 613 | 0) % edgeLandmarks.length], x, y, 1.05 + h * 0.3, h > 0.5);
  }
  list.sort((p, q) => p.x + p.y - (q.x + q.y));
  sceneryCache.set(mapId, list);
  return list;
}

/* --------------------------------------------------------------- painters */

// True when a feature's world-space box cannot touch the painted rect, plus
// `pad` units of slack for strokes and scattered debris. Anything skipped by
// this test was going to be clipped away by the caller's canvas anyway, so
// skipping it changes nothing on screen — it only stops one chunk from paying
// for features that live elsewhere on the map.
function rectMisses(rect, x0, y0, x1, y1, pad = 2) {
  return x1 + pad < rect.x0 || x0 - pad > rect.x1 || y1 + pad < rect.y0 || y0 - pad > rect.y1;
}

// Paint one world-space rect of ground. The context is already offset so that
// projected coordinates are local; everything here works in world units.
export function paintGround(ctx, mapId, sprites, rect, quality = 1) {
  const biome = biomeFor(mapId), art = artFor(mapId);
  rect = { ...rect, quality };
  const b = mapBounds(mapId);
  ctx.save();
  // World → projected screen basis, identical to renderer.project().
  ctx.transform(22, 11, -22, 11, 0, 0);

  // 1. Continuous base ground. One pattern, rotated off the projection axes so
  //    no lattice can line up with the isometric grid: no tile edges to see.
  tileFill(ctx, sprites, biome.base, rect, TILE_UNITS);
  // 2. Companion tile at a different scale and angle: the two repeats never sync,
  //    which is what removes the visible "squared lawn".
  tileFill(ctx, sprites, biome.blend, rect, TILE_UNITS * 1.71, 0.3);
  // 3. A very large pass creates broad tonal drift across the field.
  tileFill(ctx, sprites, biome.blend, rect, TILE_UNITS * 2.9, 0.16);

  // 4. Large soft mottling: the airbrushed patchiness of a painted field.
  const m0 = Math.floor(rect.x0 / MOTTLE_CELL), m1 = Math.ceil(rect.x1 / MOTTLE_CELL);
  const n0 = Math.floor(rect.y0 / MOTTLE_CELL), n1 = Math.ceil(rect.y1 / MOTTLE_CELL);
  for (let my = n0; my <= n1; my++) for (let mx = m0; mx <= m1; mx++) {
    const h = hash2(mx, my, 11);
    if (h < 0.42) continue;
    const x = (mx + hash2(mx, my, 23)) * MOTTLE_CELL;
    const y = (my + hash2(mx, my, 37)) * MOTTLE_CELL;
    const rx = MOTTLE_CELL * (0.5 + hash2(mx, my, 43) * 0.7);
    const ry = rx * (0.55 + hash2(mx, my, 59) * 0.5);
    const tint = biome.mottle[(h * 977 | 0) % biome.mottle.length];
    if (quality < 0.6) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = tint;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      softEllipse(ctx, x, y, rx, ry, [[0, tint + '2e'], [0.62, tint + '17'], [1, tint + '00']]);
    }
  }
  // 5. Patchy second tile family (blossom, blossoms over olive grass, etc.).
  if (quality > 0.4) {
    const p0 = Math.floor(rect.x0 / (MOTTLE_CELL * 1.7)), p1 = Math.ceil(rect.x1 / (MOTTLE_CELL * 1.7));
    const q0 = Math.floor(rect.y0 / (MOTTLE_CELL * 1.7)), q1 = Math.ceil(rect.y1 / (MOTTLE_CELL * 1.7));
    for (let py = q0; py <= q1; py++) for (let px = p0; px <= p1; px++) {
      const h = hash2(px, py, 83);
      if (h < 0.58) continue;
      const cell = MOTTLE_CELL * 1.7;
      tilePatch(ctx, sprites, biome.blend,
        (px + hash2(px, py, 89)) * cell, (py + hash2(px, py, 91)) * cell,
        cell * (0.32 + h * 0.3), cell * (0.24 + h * 0.24), TILE_UNITS * 0.9, 0.26, px * 31 + py);
    }
  }

  // 5b. Floor areas: large soft regions of a second surface (cobbled paving in the
  //     cave, packed stone in the ruins, bare rock in the desert). Without these a
  //     cave or arena is one flat field of gravel; with them it has rooms. The
  //     region is drawn as concentric rings of the tile at rising alpha, which is
  //     the only way to lay a *texture* down with a genuinely soft border.
  for (const area of art.floorAreas || []) {
    if (area.x + area.r * 2.4 < rect.x0 || area.x - area.r * 2.4 > rect.x1) continue;
    if (area.y + area.r * 2.4 < rect.y0 || area.y - area.r * 2.4 > rect.y1) continue;
    softTileArea(ctx, sprites, area.tile, area.x, area.y, area.r, area.r * 0.8, TILE_UNITS * 0.5, 0.8, area.r);
    // A second, tighter pass at a finer scale: paving looks laid in courses that
    // get smaller toward the worn centre, and the doubling hides the tile repeat.
    softTileArea(ctx, sprites, area.tile, area.x, area.y, area.r * 0.7, area.r * 0.54, TILE_UNITS * 0.34, 0.3, area.r + 7);
  }

  // 6. Water, then bridges over it. Streams span the whole map, so each is
  //    box-culled and its scatter passes skip debris outside the rect: a
  //    chunk near the bank must not paint 200 metres of riverbank stones.
  for (const stream of art.water) {
    const xs = stream.flow.map(p => p[0]), ys = stream.flow.map(p => p[1]);
    const w = stream.width;
    if (rectMisses(rect, Math.min(...xs) - w - 10, Math.min(...ys) - w - 10, Math.max(...xs) + w + 10, Math.max(...ys) + w + 10, 0)) continue;
    paintStream(ctx, sprites, biome, stream, rect);
  }
  for (const pool of art.pools) {
    if (rectMisses(rect, pool.x - pool.rx * 2.4, pool.y - pool.ry * 2.4, pool.x + pool.rx * 2.4, pool.y + pool.ry * 2.4)) continue;
    paintPool(ctx, sprites, biome, pool);
  }
  paintBridges(ctx, sprites, mapId, art, biome, rect);

  // 7. Worn roads through the field.
  paintRoads(ctx, sprites, mapId, biome, rect);

  // 7b. Colour grade: the kit's swatches are deliberately neutral, so one
  //     saturated overlay per biome gives the field its mood and unifies ground,
  //     water and paths under a single light. Grading after the surfaces are laid
  //     down is what stops a warm path looking pasted onto a cold cave.
  if (biome.grade) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = biome.gradeAlpha || 0.3;
    ctx.fillStyle = biome.grade;
    ctx.fillRect(rect.x0 - 1, rect.y0 - 1, rect.x1 - rect.x0 + 2, rect.y1 - rect.y0 + 2);
    ctx.restore();
  }

  // 8. Edge massing: the walkable ground is a plateau with a shadowed lip, a
  //    rocky rim and a treeline beyond it, so the field reads as a clearing in
  //    real terrain rather than a slab that stops.
  paintRim(ctx, sprites, biome, b, rect);
  paintEdgeBand(ctx, sprites, biome, b, rect);

  // 9. Decals: seeded, jittered, never on a grid.
  if (quality > 0.05) {
    const kinds = [];
    for (const [kind, weight] of Object.entries(biome.decals)) {
      for (let i = 0; i < Math.round(weight * 2); i++) kinds.push(kind);
    }
    const cell = DECAL_CELL * (quality < 0.6 ? 2.4 : 1);
    const c0 = Math.floor(rect.x0 / cell), c1 = Math.ceil(rect.x1 / cell);
    const d0 = Math.floor(rect.y0 / cell), d1 = Math.ceil(rect.y1 / cell);
    for (let cy = d0; cy <= d1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const h = hash2(cx, cy, 131);
      if (h < 0.1 * (1 / Math.max(quality, 0.25))) continue;
      const x = (cx + hash2(cx, cy, 137)) * cell;
      const y = (cy + hash2(cx, cy, 139)) * cell;
      // Keep decals out of the water and off the road surface.
      if (inWater(art, x, y)) continue;
      if (nearRoad(mapId, x, y, biome.pathWidth * 0.5)) continue;
      // Three small marks per populated cell, jittered independently: the eye
      // reads scatter, never a repeating lattice.
      for (let k = 0; k < 3; k++) {
        const hk = hash2(cx * 3 + k, cy, 149 + k);
        const kind = kinds[(hk * kinds.length) | 0];
        const ox = (hash2(cx * 3 + k, cy, 157) - 0.5) * cell * 1.1;
        const oy = (hash2(cx * 3 + k, cy, 163) - 0.5) * cell * 1.1;
        const sc = 0.55 + hash2(cx * 3 + k, cy, 167) * 0.55;
        paintDecal(ctx, kind, x + ox, y + oy, hk, biome, sc);
      }
    }
  }

  // 9a. Undergrowth tint: soft darker masses under the tree groves so the canopy
  //     has weight on the ground, and the field is not a flat lawn.
  if (quality > 0.25) paintUndergrowth(ctx, biome, art, rect);
  // 9b. Baked contact shadows so props sit *in* the ground instead of on it.
  if (quality > 0.3) paintPropShadows(ctx, mapId, sprites, rect);

  // 10. Canopy light: warm pools of sun and cool dappled shade.
  paintLight(ctx, mapId, rect);

  ctx.restore();
}

function inWater(art, x, y) {
  for (const pool of art.pools) {
    if (Math.hypot((x - pool.x) / pool.rx, (y - pool.y) / pool.ry) < 1.18) return true;
  }
  for (const stream of art.water) {
    for (let i = 0; i < stream.flow.length - 1; i++) {
      const [ax, ay] = stream.flow[i], [bx, by] = stream.flow[i + 1];
      const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
      const t = len ? clamp(((x - ax) * dx + (y - ay) * dy) / len, 0, 1) : 0;
      if (Math.hypot(x - (ax + dx * t), y - (ay + dy * t)) < stream.width * 0.62) return true;
    }
  }
  return false;
}

function nearRoad(mapId, x, y, width) {
  // Only drawn roads keep a clear lane; invisible trails must not thin the
  // scenery along a line nobody can see.
  for (const line of roadsFor(mapId)) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i], [bx, by] = line[i + 1];
      const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
      const t = len ? clamp(((x - ax) * dx + (y - ay) * dy) / len, 0, 1) : 0;
      if (Math.hypot(x - (ax + dx * t), y - (ay + dy * t)) < width) return true;
    }
  }
  return false;
}

// Beyond the playable ground the field does not become a stone frame: it becomes
// thicker scrub, then the fog. Everything here is drawn as overlapping soft
// blobs whose density follows the distance from the playable edge, so there is
// no straight line anywhere along the border.

// ---------------------------------------------------------- clearing rim mass
// A field that simply stops at its edge reads as a flat slab. Instead the walkable
// ground is a plateau: just outside it a shadowed lip drops away, and beyond that
// a chunky rock rim rises. Both are authored as nested rounded rectangles, the
// same geometry the fog uses, so every chunk and the wide overview agree exactly.
// A point on the plateau's rounded-rect perimeter, parameterised by fraction.
function pointOnRim(bounds, t) {
  const x = bounds.x, y = bounds.y, r = Math.min(9 + 26, 30);
  const w = x * 2, h = y * 2;
  const straightX = w - 2 * r, straightY = h - 2 * r;
  const arc = (Math.PI * r) / 2;
  const per = straightX * 2 + straightY * 2 + arc * 4;
  let d = (t % 1) * per;
  const take = (len, from, to) => {
    if (d > len) { d -= len; return null; }
    const k = len ? d / len : 0;
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
  };
  const TR = { x, y }, TL = { x: -x, y }, BR = { x, y: -y }, BL = { x: -x, y: -y };
  return take(arc, { x: -x + r, y }, TL) ||            // top edge, right to left
    take(straightX, { x: -x + r, y }, { x: x - r, y }) ||
    take(arc, { x: x - r, y }, TR) ||
    take(straightY, TR, BR) ||
    take(arc, BR, { x: x, y: -y + r }) ||
    take(straightX, { x: x, y: -y + r }, BL) ||
    take(arc, BL, { x: -x, y: -y + r }) ||
    take(straightY, { x: -x, y: -y + r }, { x: -x, y: y - r }) ||
    take(arc, { x: -x, y: y - r }, { x: -x + r, y }) ||
    { x: -x + r, y };
}

// Appends one ring to the current path (the caller owns beginPath, so two rings
// can be filled together with the even-odd rule to make an annulus).
function rimPath(ctx, bounds, d) {
  const x = -bounds.x - d, y = -bounds.y - d, w = (bounds.x + d) * 2, h = (bounds.y + d) * 2;
  const r = Math.min(9 + d * 0.55, 30);
  roundRectPath(ctx, x, y, w, h, r);
}

function paintRim(ctx, sprites, biome, bounds, rect) {
  // Skip the rim entirely when the rect sits well inside the playable plateau:
  // every rim feature is clipped away on such a chunk, so drawing it is pure
  // waste (the old guard here was unsatisfiable, so every chunk paid for it).
  if (rect.x1 < bounds.x - 22 && rect.x0 > -bounds.x + 22 && rect.y1 < bounds.y - 22 && rect.y0 > -bounds.y + 22) return;
  const over = rect.x1 < -bounds.x - 22 && rect.x0 > bounds.x + 22 && rect.y1 < -bounds.y - 22 && rect.y0 > bounds.y + 22;
  if (over) return;
  ctx.save();
  // 1. The drop: outside the walkable plateau the ground is in shadow. Two rings
  //    give a soft lip rather than a line.
  const deep = shadeHex(biome.fog, -18);
  ctx.beginPath();
  rimPath(ctx, bounds, 0.6);
  rimPath(ctx, bounds, 13);
  ctx.fillStyle = deep + '66';
  ctx.fill('evenodd');
  // The inner lip is darkest, fading outward so the drop has a gradient.
  ctx.beginPath();
  rimPath(ctx, bounds, 0.6);
  rimPath(ctx, bounds, 4.5);
  ctx.fillStyle = deep + '55';
  ctx.fill('evenodd');
  ctx.restore();
  // 2. A warm catch of light along the lip. It is drawn in short seeded dashes
  //    rather than one ring, so the plateau edge looks like broken, eroded
  //    ground instead of an outlined border.
  const light = biome.rimLight || shadeHex(biome.gravel, 20);
  const segs = Math.round((bounds.x + bounds.y) * 2.4);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < segs; i++) {
    const h = hash2(i, 41, 691);
    if (h < 0.34) continue;
    const t0 = (i + 0.1) / segs, t1 = (i + 0.9) / segs;
    const p0 = pointOnRim(bounds, t0), p1 = pointOnRim(bounds, t1);
    const d = -0.25 + hash2(i, 43, 697) * 0.55;
    ctx.beginPath();
    ctx.moveTo(p0.x + Math.sign(p0.x) * d, p0.y + Math.sign(p0.y) * d);
    ctx.lineTo(p1.x + Math.sign(p1.x) * d, p1.y + Math.sign(p1.y) * d);
    ctx.strokeStyle = light + alphaHex(0.1 + hash2(i, 47, 701) * 0.3);
    ctx.lineWidth = 0.5 + hash2(i, 53, 709) * 1.1;
    ctx.stroke();
  }
  ctx.restore();
}

function paintEdgeBand(ctx, sprites, biome, bounds, rect) {
  const ext = { x: bounds.x + APRON, y: bounds.y + APRON };
  // Signed distance outside the playable rounded rectangle, in world units.
  const outside = (x, y) => {
    const dx = Math.abs(x) - bounds.x, dy = Math.abs(y) - bounds.y;
    if (dx <= 0 && dy <= 0) return Math.max(dx, dy);
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) * 0.35;
  };
  if (!(rect.x1 > bounds.x - 2 || rect.x0 < -bounds.x + 2 || rect.y1 > bounds.y - 2 || rect.y0 < -bounds.y + 2)) return;
  // The growth belt is drawn at a coarser grid when the pass is a wide-zoom
  // overview: at that scale the extra cells are invisible but cost real time.
  const cell = 2.2 * (rect.quality && rect.quality < 0.6 ? 2.6 : 1);
  const c0 = Math.floor(-ext.x / cell), c1 = Math.ceil(ext.x / cell);
  const d0 = Math.floor(-ext.y / cell), d1 = Math.ceil(ext.y / cell);
  // The wilds are painted as a mass, not as confetti. A band of darkened ground
  // rolls outward first, then a broken treeline of overlapping canopies sits on
  // top of it. Both are seeded per-cell but drawn with large, overlapping soft
  // shapes, so the eye reads a forest edge closing in rather than a scatter of
  // blobs. Nothing is drawn in the first couple of units, so the hunting ground
  // keeps a clean rim.
  const cheap = rect.quality < 0.6;
  const beltTint = biome.edgeTint || biome.mottle[1];
  const dark = shadeHex(biome.fog, -8);
  // Pass A: a deepening wash of shadowed ground, increasing with distance.
  // Per-cell rect culling: the loops sweep the whole apron grid, but a chunk
  // only displays cells within ~12 units of its rect (canopy radii reach at
  // most ~9), so cells beyond that were clipped away and cost nothing but time.
  for (let cy = d0; cy <= d1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const h = hash2(cx, cy, 233 + biome.base.length);
    const x = (cx + hash2(cx, cy, 239)) * cell;
    const y = (cy + hash2(cx, cy, 241)) * cell;
    if (rectMisses(rect, x - 12, y - 12, x + 12, y + 12, 0)) continue;
    const out = outside(x, y);
    if (out < 1.4 || out > APRON - 2) continue;
    const grow = clamp(out, 0, 26);
    const r = 2.6 + h * 2.2 + grow * 0.16;
    const alpha = clamp(0.05 + grow * 0.011, 0, 0.3);
    if (cheap) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = dark;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      continue;
    }
    softEllipse(ctx, x, y, r, r * 0.7, [
      [0, dark + alphaHex(alpha)], [0.6, dark + alphaHex(alpha * 0.5)], [1, dark + '00'],
    ]);
  }
  // Pass B: the treeline. Canopy lobes start at ~4 units out and thicken; each
  // cell contributes several overlapping circles so the silhouette is continuous.
  for (let cy = d0; cy <= d1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const h = hash2(cx, cy, 233 + biome.base.length);
    const x = (cx + hash2(cx, cy, 239)) * cell;
    const y = (cy + hash2(cx, cy, 241)) * cell;
    if (rectMisses(rect, x - 12, y - 12, x + 12, y + 12, 0)) continue;
    const out = outside(x, y);
    if (out < 3.4 || out > APRON - 4) continue;
    const grow = clamp(out, 3, 24);
    const density = out < 6 ? 0.4 : out < 12 ? 0.66 : 0.78;
    if (h > density) continue;
    const r = 1.5 + h * 1.3 + grow * 0.1;
    const tint = h > 0.55 ? beltTint : biome.mottle[(h * 761 | 0) % biome.mottle.length];
    if (cheap) {
      ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = tint;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      continue;
    }
    softEllipse(ctx, x, y, r, r * 0.72, [
      [0, tint + alphaHex(clamp(0.24 + grow * 0.008, 0, 0.42))],
      [0.55, tint + alphaHex(clamp(0.13 + grow * 0.004, 0, 0.24))],
      [1, tint + '00'],
    ]);
    // A few crisp leaves on top of the mass so the treeline has some bite, and
    // the occasional flower to keep the palette alive.
    if (h > 0.3) paintDecal(ctx, 'tuft', x, y, h, biome, 1.5 + h * 1.1);
    if (h > 0.78 && out > 7) paintDecal(ctx, 'tuft', x + 0.8, y + 0.3, hash2(cx, cy, 863), biome, 1.2 + h * 0.7);
    if (h > 0.88 && (biome.decals.flower || 0) > 0.5) paintDecal(ctx, 'flower', x + 0.4, y - 0.3, h, biome, 0.9);
  }
  paintFog(ctx, biome, bounds, ext);
}

// Ground haze, built as a stack of ever-larger rounded rings around the playable
// rectangle. Each pass adds a few percent of fog, so the field darkens gradually
// with distance from where gameplay ends. Accumulating many weak passes instead
// of drawing one gradient is what removes any visible fog line, and because the
// pass geometry is a pure function of distance, chunks keep matching the
// overview exactly.
const FOG_STEP = 1.3;
const FOG_ALPHA = 0.058;
function paintFog(ctx, biome, bounds, ext) {
  const fog = biome.fog;
  // The passes are nested rounded rectangles. The ramp is sized from the apron
  // itself so it is fully opaque *before* the painted rect ends: the ground never
  // has to fall off a canvas edge, in any direction.
  // The haze only begins once the painted ground has already run well past the
  // edge of any normal view: at gameplay zoom the screen is filled with terrain,
  // not fog, exactly like a real field.
  const apronDepth = Math.min(ext.x - bounds.x, ext.y - bounds.y);
  const startD = apronDepth - 26;
  const maxD = apronDepth - 1;
  // The ramp is distant and always at the edge of the view, so it is stepped
  // coarsely: each ring is already a weak wash, and one ring in three is
  // indistinguishable from one ring in one at any zoom.
  const step = FOG_STEP * 4;
  ctx.save();
  ctx.fillStyle = fog;
  for (let d = startD; d <= maxD; d += step) {
    const x = bounds.x + d, y = bounds.y + d;
    // Later passes carry more weight: nothing at the start, opaque at the finish.
    const t = (d - startD) / (maxD - startD);
    ctx.globalAlpha = (0.03 + Math.pow(t, 2.4) * 0.42) * 4;
    ctx.beginPath();
    // Outer rectangle is huge; the inner hole is the ring we want to tint.
    const outerX = ext.x + 40, outerY = ext.y + 40;
    ctx.rect(-outerX, -outerY, outerX * 2, outerY * 2);
    const r = Math.min(d * 0.6, 14);
    roundRectPath(ctx, -x, -y, x * 2, y * 2, r);
    ctx.fill('evenodd');
  }
  // Solid fog beyond the ramp, so the painted rect's own edge is never visible.
  ctx.globalAlpha = 1;
  const ox = ext.x + 40, oy = ext.y + 40;
  ctx.beginPath();
  ctx.rect(-ox, -oy, ox * 2, oy * 2);
  roundRectPath(ctx, -(bounds.x + maxD), -(bounds.y + maxD), (bounds.x + maxD) * 2, (bounds.y + maxD) * 2, Math.min(maxD * 0.6, 14));
  ctx.fill('evenodd');
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

// Two-digit hex alpha, clamped: gradients take colour+alpha stops.
function alphaHex(a) {
  return Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, '0');
}

// Soft, multi-lobed foliage shading under the groves. Each grove is painted as
// overlapping low-alpha gradients, which is what stops a painted field from
// reading as tiled lawn.
function paintUndergrowth(ctx, biome, art, rect) {
  for (const grove of art.undergrowth || []) {
    if (grove.x + grove.r * 1.6 < rect.x0 || grove.x - grove.r * 1.6 > rect.x1) continue;
    if (grove.y + grove.r * 1.6 < rect.y0 || grove.y - grove.r * 1.6 > rect.y1) continue;
    for (let i = 0; i < 7; i++) {
      const h = hash2(i, Math.round(grove.x * 3), 331 + Math.round(grove.y * 7));
      const a = h * Math.PI * 2;
      const rr = Math.sqrt(hash2(i, 5, 337)) * grove.r * 0.68;
      const x = grove.x + Math.cos(a) * rr;
      const y = grove.y + Math.sin(a) * rr * 0.8;
      const r = grove.r * (0.34 + hash2(i, 9, 341) * 0.3);
      const tint = biome.mottle[(h * 613 | 0) % biome.mottle.length];
      softEllipse(ctx, x, y, r, r * 0.66, [[0, tint + '2e'], [0.55, tint + '18'], [1, tint + '00']]);
    }
  }
}

function paintPropShadows(ctx, mapId, sprites, rect) {
  const list = sceneryFor(mapId);
  const index = sprites.index?.terrain?.props || {};
  const margin = 6;
  for (const prop of list) {
    if (prop.x + margin < rect.x0 || prop.x - margin > rect.x1) continue;
    if (prop.y + margin < rect.y0 || prop.y - margin > rect.y1) continue;
    const rec = index[prop.id];
    if (!rec) continue;
    const s = propScale(prop.id, prop.scale);
    const wUnits = (rec.w * s) / 22;
    const hUnits = (rec.h * s) / 22;
    // Only tall things cast a readable ground shadow; flat props keep a hint.
    const tall = hUnits > 1.6;
    const rx = Math.max(0.45, wUnits * (tall ? 0.3 : 0.34));
    const ry = rx * (tall ? 0.5 : 0.46);
    const sx = prop.x + (tall ? wUnits * 0.16 : 0);
    const sy = prop.y + ry * 0.3;
    // Ground contact, not a cast shadow: tight, dark right at the trunk and gone
    // within a metre. Big soft blobs read as smudges on a painted field.
    softEllipse(ctx, sx, sy, rx, ry, [
      [0, `rgba(20,30,22,${tall ? 0.26 : 0.2})`],
      [0.45, `rgba(20,30,22,${tall ? 0.1 : 0.07})`],
      [1, 'rgba(20,30,22,0)'],
    ]);
  }
}

function paintLight(ctx, mapId, rect) {
  const b = mapBounds(mapId);
  // Warm sun pools: a few large, very low-alpha gradients. Never a spotlight.
  for (let i = 0; i < 4; i++) {
    const h = hash2(i, 3, 181);
    const x = (hash2(i, 5, 191) - 0.5) * 2 * b.x * 0.75;
    const y = (hash2(i, 7, 193) - 0.5) * 2 * b.y * 0.75;
    const r = 16 + h * 20;
    softEllipse(ctx, x, y, r, r * 0.62, [
      [0, 'rgba(255,246,208,.05)'], [0.55, 'rgba(255,246,208,.022)'], [1, 'rgba(255,246,208,0)'],
    ]);
  }
  // Dappled canopy shade under the big trees, offset toward the light.
  const list = sceneryFor(mapId);
  const shade = list.filter(p => /tree_|bamboo|palm|house|shrine|torii/.test(p.id));
  for (const prop of shade) {
    if (prop.x + 7 < rect.x0 || prop.x - 7 > rect.x1 || prop.y + 7 < rect.y0 || prop.y - 7 > rect.y1) continue;
    const h = hash2(Math.round(prop.x * 3), Math.round(prop.y * 3), 199);
    const r = 1.9 + h * 1.9;
    const x = prop.x + 0.7, y = prop.y + 0.45;
    softEllipse(ctx, x, y, r, r * 0.62, [
      [0, 'rgba(16,30,20,.075)'], [0.65, 'rgba(16,30,20,.035)'], [1, 'rgba(16,30,20,0)'],
    ]);
  }
  // Warm lamplight where a lantern stands, and a soft glow in the cave's carved
  // halls: the single strongest cue that a dungeon is *lit* rather than merely dark.
  for (const prop of list) {
    if (!/lantern|shrine|tower/.test(prop.id)) continue;
    if (prop.x + 9 < rect.x0 || prop.x - 9 > rect.x1 || prop.y + 9 < rect.y0 || prop.y - 9 > rect.y1) continue;
    const r = 5.5 + hash2(Math.round(prop.x), Math.round(prop.y), 811) * 2.5;
    softEllipse(ctx, prop.x, prop.y + 0.3, r, r * 0.6, [
      [0, 'rgba(255,206,128,.16)'], [0.45, 'rgba(255,196,112,.07)'], [1, 'rgba(255,190,110,0)'],
    ]);
  }

  // Cool edge shading so the outside of the clearing stays darker than the middle.
  const rad = Math.max(b.x, b.y);
  const g = ctx.createRadialGradient(0, 0, rad * 0.55, 0, 0, rad * 1.2);
  g.addColorStop(0, 'rgba(10,22,16,0)');
  g.addColorStop(1, 'rgba(10,22,16,.12)');
  ctx.save(); ctx.fillStyle = g;
  ctx.fillRect(rect.x0 - 2, rect.y0 - 2, rect.x1 - rect.x0 + 4, rect.y1 - rect.y0 + 4);
  ctx.restore();
}

import { JOBS, MONSTERS, GEAR_ITEMS } from './data.js';
const image = src => new Promise((resolve, reject) => {
  const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error('Could not load sprite: ' + src)); im.src = src;
});
const json = async src => { const r = await fetch(src); if (!r.ok) throw new Error('Missing asset: ' + src); return r.json(); };
// Frame index for one attack action playing at `ms`. Attack actions resolve and
// then hold their final frame instead of looping, so the recovery poses are
// actually seen; idle/walk pass loop = true.
export function attackFrameIndex(count, delay, ms, loop = false) {
  const step = Math.floor(ms / Math.max(1, delay));
  return loop ? step % count : Math.min(count - 1, Math.max(0, step));
}


// Weapon overlays. The client only draws a held weapon during an attack motion, so the
// overlays are attack-only atlases keyed `weapon-<job>-<sex>-<family>`. A class that has no
// sprite for the equipped item's weapon type falls back along the same order the client
// does (a two-hander is carried as a sword, a katar as a dagger) and then to its own hands.
const WEAPON_FAMILIES = {
  'One-Handed Sword': 'sword', 'Two-Handed Sword': 'twohand', 'Dagger': 'dagger',
  'Spear': 'spear', 'One-Handed Spear': 'spear', 'Two-Handed Spear': 'spear',
  'One-Handed Axe': 'axe', 'Two-Handed Axe': 'axe', 'Mace': 'mace', 'Rod': 'rod',
  'Two-Handed Rod': 'staff', 'Book': 'book', 'Katar': 'katar', 'Knuckle': 'knuckle',
  'Bow': 'bow', 'Whip': 'whip', 'Instrument': 'instrument',
  'Revolver': 'gun', 'Rifle': 'gun', 'Gatling Gun': 'gun', 'Shotgun': 'gun',
  'Grenade Launcher': 'gun', 'Huuma Shuriken': 'shuriken',
};
const WEAPON_FALLBACK = {
  twohand: ['sword'], staff: ['rod'], katar: ['dagger'], book: ['rod'], spear: ['axe'],
  shuriken: ['dagger'], knuckle: ['mace'], whip: ['bow'], instrument: ['bow'],
  axe: ['mace'], mace: ['sword'], gun: [],
};
export function weaponFamily(kind) { return WEAPON_FAMILIES[kind] || null; }
// Which baked attack motion a body swings with. The class pack exports one route set per
// motion (`fist`, `thrust`, `swing`, `aimed`) so the equipped weapon's pose is used instead
// of a single pose decided at import time.
export function weaponMotion(kind) {
  const family = weaponFamily(kind);
  if (!family) return 'swing';
  return { spear:'aimed', bow:'aimed', gun:'aimed', book:'aimed', knuckle:'aimed',
    shuriken:'aimed', staff:'swing' }[family] || 'swing';
}
export function attackRoute(body, stance, direction, kind) {
  if (stance !== 'attack') return stance + direction;
  const motion = weaponMotion(kind);
  if (body?.metadata.actions?.[motion + direction]) return motion + direction;
  return 'attack' + direction;
}

export class Sprites {
  constructor() { this.assets = new Map(); this.portraits = new Map(); this.heroFrames = new Map();
    this.attackLengths = new Map(); this.index = null; }
  async init() {
    this.index = await json('/assets/index.json');
    await Promise.all(Object.entries(this.index.wardrobe).map(async ([key, rec]) => {
      const [metadata, atlas] = await Promise.all([json('/assets/wardrobe/' + rec.meta), image('/assets/wardrobe/' + rec.image)]);
      // V2 permits either inline poses or a shared layer table. Preserve both.
      if (metadata.layers) metadata.poses = metadata.poses.map(pose => pose.map(i => metadata.layers[i]));
      this.assets.set(key, { metadata, atlas });
    }));
    // Class pack: native bodies for every job the shipped wardrobe does not cover. Same
    // format and its own directory, so a missing pack simply falls back to the parent job.
    // Weapon overlays share the directory and are loaded on first use: a scene only ever
    // shows a handful of weapon types, and there are dozens of them.
    const weapons = [];
    await Promise.all(Object.entries(this.index.classWardrobe || {}).map(async ([key, rec]) => {
      if (key.startsWith('weapon-')) { weapons.push([key, rec]); return; }
      const [metadata, atlas] = await Promise.all([json('/assets/wardrobe/classes/' + rec.meta), image('/assets/wardrobe/classes/' + rec.image)]);
      if (metadata.layers) metadata.poses = metadata.poses.map(pose => pose.map(i => metadata.layers[i]));
      this.assets.set(key, { metadata, atlas });
    }));
    this.weaponRecords = new Map(weapons);
    this.weaponLoads = new Map();
    await Promise.all(Object.entries(this.index.monsters).map(async ([id, record]) => {
      this.assets.set('mob-' + id, { record, atlas: await image('/assets/mobs/' + id + '.webp') });
    }));
    // Decorative ground tiles and anchored scenery props. Optional by design:
    // a build without them still renders the procedural ground fallback.
    const terrain = this.index.terrain;
    if (terrain) {
      await Promise.all([
        ...Object.entries(terrain.tiles).map(async ([name, rec]) => {
          this.assets.set('tile-' + name, await image('/assets/' + rec.file));
        }),
        ...Object.entries(terrain.props).map(async ([name, rec]) => {
          this.assets.set('prop-' + name, await image('/assets/' + rec.file));
        }),
      ]);
    }
  }
  tile(name) { return this.assets.get('tile-' + name) || null; }
  prop(name) { return this.assets.get('prop-' + name) || null; }
  // Load (once) the overlay a body holds for one weapon family, honouring the client's own
  // fallback order when that body has no art for the exact type.
  async weapon(job, sex, family) {
    if (!family || !this.weaponRecords) return null;
    const order = [family, ...(WEAPON_FALLBACK[family] || [])];
    for (const candidate of order) {
      const key = `weapon-${job}-${sex}-${candidate}`;
      const record = this.weaponRecords.get(key);
      if (!record) continue;
      if (!this.weaponLoads.has(key)) {
        this.weaponLoads.set(key, Promise.all([json('/assets/wardrobe/classes/' + record.meta),
          image('/assets/wardrobe/classes/' + record.image)]).then(([metadata, atlas]) => {
          if (metadata.layers) metadata.poses = metadata.poses.map(pose => pose.map(i => metadata.layers[i]));
          const asset = { metadata, atlas };
          this.assets.set(key, asset);
          return asset;
        }));
      }
      return this.weaponLoads.get(key);
    }
    return null;
  }
  heroFrame(job, sex, route, body, hair, bodyIndex, hairIndex, weapon = null, weaponFamily = null) {
    const cacheKey = `${job}/${sex}/${route}/${weaponFamily || 'bare'}/${bodyIndex}/${hairIndex}`;
    const cached = this.heroFrames.get(cacheKey);
    if (cached) {
      this.heroFrames.delete(cacheKey); this.heroFrames.set(cacheKey, cached);
      return cached;
    }
    const anchor = this.index.anchor;
    const layers = [...body.metadata.poses[bodyIndex].map(layer => [layer, body.atlas]),
      ...(hairIndex === null ? [] : hair.metadata.poses[hairIndex].map(layer => [layer, hair.atlas])),
      ...(weapon ? weapon.metadata.poses[weapon.index].map(layer => [layer, weapon.atlas]) : [])]
      .sort((a, b) => a[0][6] - b[0][6]);
    const left = Math.floor(Math.min(...layers.map(([p]) => p[4] - anchor[0])));
    const top = Math.floor(Math.min(...layers.map(([p]) => p[5] - anchor[1])));
    const right = Math.ceil(Math.max(...layers.map(([p]) => p[4] - anchor[0] + p[2])));
    const bottom = Math.ceil(Math.max(...layers.map(([p]) => p[5] - anchor[1] + p[3])));
    const canvas = document.createElement('canvas'); canvas.width = right - left; canvas.height = bottom - top;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    for (const [p, atlas] of layers) ctx.drawImage(atlas, p[0], p[1], p[2], p[3], p[4] - anchor[0] - left, p[5] - anchor[1] - top, p[2], p[3]);
    const frame = { canvas, left, top };
    this.heroFrames.set(cacheKey, frame);
    if (this.heroFrames.size > 128) this.heroFrames.delete(this.heroFrames.keys().next().value);
    return frame;
  }
  // Attack playback. RO sprites fire one swing per weapon delay and hold the
  // recovery frames between swings; the renderer passes `swing` = elapsed ms since
  // the attack started, so the frame maths mirrors that instead of looping the
  // whole 9-frame action forever (which also restarted the wind-up mid-swing).
  attackFrames(action) { return action.frames.length; }
  // The weapon item this adventurer has equipped, or the training default.
  equipped(c) {
    const worn = c?.gear?.weapon;
    if (!worn) return null;
    return GEAR_ITEMS[typeof worn === 'string' ? worn : worn.itemId] || null;
  }
  // The family a body is drawn holding right now, or null for bare hands.
  heldFamily(c, job) {
    const family = weaponFamily(this.equipped(c)?.kind);
    if (!family) return null;
    for (const candidate of [family, ...(WEAPON_FALLBACK[family] || [])]) {
      if (this.assets.has(`weapon-${job}-${c.sex}-${candidate}`)) return candidate;
    }
    // Start the load if the body has art, then fall back to a fist for this frame.
    if (this.weaponRecords?.has(`weapon-${job}-${c.sex}-${family}`)) this.weapon(job, c.sex, family);
    return null;
  }
  // How long one attack action lasts for a class, in milliseconds. The renderer
  // holds the pose for this long even after the simulation's short attack flash
  // expires, so the recovery frames of the swing are never skipped.
  attackMs(c) {
    let visualClass = c.job;
    while (visualClass && !this.assets.has(`base-${JOBS[visualClass]?.native}-${c.sex}`)) visualClass = JOBS[visualClass]?.parent;
    const job = JOBS[visualClass || 'novice'].native;
    // Cached per outfit and direction: this runs for every unit on screen.
    const held = this.heldFamily(c, job);
    const key = `${job}:${c.sex}:${c.direction || 0}:${held || 'bare'}`;
    if (this.attackLengths.has(key)) return this.attackLengths.get(key);
    const body = this.assets.get(`base-${job}-${c.sex}`);
    const action = body?.metadata.actions[attackRoute(body, 'attack', c.direction || 0, this.equipped(c)?.kind)];
    const ms = action ? action.frames.length * action.delay : 900;
    this.attackLengths.set(key, ms);
    return ms;
  }
  hero(ctx, c, ms, stance = c.stance, direction = c.direction, scale = 0.7) {
    // Fall back to the nearest imported ancestor outfit; this is a placeholder, not a claim that the ancestor is the new job's authentic sprite.
    let visualClass = c.job;
    while (visualClass && !this.assets.has(`base-${JOBS[visualClass]?.native}-${c.sex}`)) visualClass = JOBS[visualClass]?.parent;
    const job = JOBS[visualClass || 'novice'].native;
    const body = this.assets.get(`base-${job}-${c.sex}`), hair = this.assets.get(`hair-${c.sex}-2-0`);
    if (!body) return;
    const route = attackRoute(body, stance, direction, this.equipped(c)?.kind);
    const action = body.metadata.actions[route];
    if (!action) return;
    // The class pack bakes the head into its own atlas, so those outfits need no hair route.
    const head = body.metadata.headBaked ? null : hair?.metadata.actions[job + ':' + route];
    if (!body.metadata.headBaked && !head) return;
    // The client draws a held weapon only on the attack motion, so the overlay is
    // attack-only; the body swings on that weapon's motion (see `weaponMotion`).
    const family = stance === 'attack' ? this.heldFamily(c, job) : null;
    const overlay = family ? this.assets.get(`weapon-${job}-${c.sex}-${family}`) : null;
    const swing = overlay?.metadata.actions[route];
    // Attack actions resolve once and then hold their last frame; idle and walk
    // loop. This is what makes a Novice (and every other class) swing read as a
    // complete, single animation rather than a stuttering restart.
    const loop = stance !== 'attack';
    const at = attackFrameIndex(action.frames.length, action.delay, ms, loop);
    const headAt = head ? attackFrameIndex(head.frames.length, head.delay, ms, loop) : 0;
    const weaponAt = swing ? attackFrameIndex(swing.frames.length, swing.delay, ms, loop) : 0;
    const frame = this.heroFrame(job, c.sex, route, body, hair, action.frames[at],
      head ? head.frames[headAt] : null,
      overlay ? { metadata: overlay.metadata, atlas: overlay.atlas, index: swing.frames[weaponAt] } : null,
      family);
    ctx.save(); ctx.scale(scale, scale); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame.canvas, frame.left, frame.top);
    ctx.restore();
  }
  monster(ctx, mob, ms) {
    const asset = this.assets.get('mob-' + MONSTERS[mob.kind].sprite);
    if (!asset) return;
    const { record, atlas } = asset;
    const offset = mob.stance === 'attack' ? 16 : mob.stance === 'walk' ? 8 : 0;
    const action = record.actions[offset + mob.direction] || record.actions[mob.direction] || record.actions[0];
    const index = action.frames[Math.floor(ms / action.delayMs) % action.frames.length];
    const frame = record.frames[index];
    if (!frame) return;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    // Same pixel-to-world ratio for all imported monsters; do not normalize their heights.
    const scale = 0.7;
    ctx.drawImage(atlas, frame.x, frame.y, frame.width, frame.height, frame.left * scale, frame.top * scale, frame.width * scale, frame.height * scale);
    ctx.restore();
  }
  portrait(c) {
    return this.cachedPortrait(c.job + c.sex, ctx => this.hero(ctx, c, 0, 'idle', 0, 1));
  }
  monsterPortrait(kind) {
    return this.cachedPortrait(kind, ctx => {
      const record = this.index.monsters[MONSTERS[kind].sprite];
      const scale = 84 / (record.idleHeight * 0.7);
      ctx.scale(scale, scale);
      this.monster(ctx, { kind, stance: 'idle', direction: 0 }, 0);
    });
  }
  cachedPortrait(key, draw) {
    if (this.portraits.has(key)) return this.portraits.get(key);
    const cv = document.createElement('canvas'); cv.width = 100; cv.height = 100;
    const ctx = cv.getContext('2d'); ctx.translate(50, 96); draw(ctx);
    const url = cv.toDataURL(); this.portraits.set(key, url); return url;
  }
}

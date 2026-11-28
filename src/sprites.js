import { JOBS, MONSTERS } from './data.js';
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
  heroFrame(job, sex, route, body, hair, bodyIndex, hairIndex) {
    const cacheKey = `${job}/${sex}/${route}/${bodyIndex}/${hairIndex}`;
    const cached = this.heroFrames.get(cacheKey);
    if (cached) {
      this.heroFrames.delete(cacheKey); this.heroFrames.set(cacheKey, cached);
      return cached;
    }
    const anchor = this.index.anchor;
    const layers = [...body.metadata.poses[bodyIndex].map(layer => [layer, body.atlas]),
      ...hair.metadata.poses[hairIndex].map(layer => [layer, hair.atlas])].sort((a, b) => a[0][6] - b[0][6]);
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
  // How long one attack action lasts for a class, in milliseconds. The renderer
  // holds the pose for this long even after the simulation's short attack flash
  // expires, so the recovery frames of the swing are never skipped.
  attackMs(c) {
    let visualClass = c.job;
    while (visualClass && !this.assets.has(`base-${JOBS[visualClass]?.native}-${c.sex}`)) visualClass = JOBS[visualClass]?.parent;
    const job = JOBS[visualClass || 'novice'].native;
    // Cached per outfit and direction: this runs for every unit on screen.
    const key = `${job}:${c.sex}:${c.direction || 0}`;
    if (this.attackLengths.has(key)) return this.attackLengths.get(key);
    const action = this.assets.get(`base-${job}-${c.sex}`)?.metadata.actions['attack' + (c.direction || 0)];
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
    if (!body || !hair) return;
    const route = stance + direction;
    const action = body.metadata.actions[route];
    const head = hair.metadata.actions[job + ':' + route];
    if (!action || !head) return;
    // Attack actions resolve once and then hold their last frame; idle and walk
    // loop. This is what makes a Novice (and every other class) swing read as a
    // complete, single animation rather than a stuttering restart.
    const loop = stance !== 'attack';
    const at = attackFrameIndex(action.frames.length, action.delay, ms, loop);
    const headAt = attackFrameIndex(head.frames.length, head.delay, ms, loop);
    const frame = this.heroFrame(job, c.sex, route, body, hair, action.frames[at], head.frames[headAt]);
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

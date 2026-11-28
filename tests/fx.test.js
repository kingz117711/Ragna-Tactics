import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, FX_IDS } from '../src/data.js';

// The renderer only touches canvas 2D and matchMedia, so a recording stub is
// enough to prove every authored flourish draws without throwing.
function recordingContext() {
  const calls = [];
  const record = name => (...args) => { calls.push([name, ...args]); };
  const ctx = {
    calls, canvas: { width: 800, height: 600 },
    save: record('save'), restore: record('restore'), translate: record('translate'),
    scale: record('scale'), rotate: record('rotate'), beginPath: record('beginPath'),
    closePath: record('closePath'), moveTo: record('moveTo'), lineTo: record('lineTo'),
    arc: record('arc'), ellipse: record('ellipse'), rect: record('rect'),
    fill: record('fill'), stroke: record('stroke'), clip: record('clip'),
    fillRect: record('fillRect'), clearRect: record('clearRect'), drawImage: record('drawImage'),
    fillText: record('fillText'), strokeText: record('strokeText'), setTransform: record('setTransform'),
    measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  for (const prop of ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'font', 'textAlign', 'lineCap', 'lineJoin', 'shadowColor', 'shadowBlur', 'imageSmoothingEnabled']) ctx[prop] = null;
  return ctx;
}

globalThis.matchMedia = globalThis.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
const { Renderer } = await import('../src/renderer.js');

test('every skill catalog entry names a flourish the renderer knows', () => {
  assert.ok(FX_IDS.length >= Object.keys(SKILLS).reduce((set, id) => set.add(SKILLS[id].fx), new Set()).size);
  for (const [id, def] of Object.entries(SKILLS)) {
    assert.ok(FX_IDS.includes(def.fx), `${id} uses a known flourish (${def.fx})`);
    assert.ok(def.name && def.text, `${id} has readable copy`);
    assert.ok(def.maxRank >= 1 && def.unlock.length === def.maxRank);
    assert.ok(def.sp > 0 && def.cooldown > 0);
    assert.ok(['strike', 'area', 'heal', 'buff'].includes(def.kind));
    if (def.kind === 'area') assert.ok(def.radius > 0, `${id} area skills need a radius`);
  }
});

test('each flourish draws on the first frame and then fades out', () => {
  const ctx = recordingContext();
  const renderer = new Renderer({ width: 800, height: 600, getContext: () => ctx }, {});
  for (const fx of FX_IDS) {
    ctx.calls.length = 0;
    renderer.drawSkillFx({ x: 100, y: 200 }, fx, 0.12, 0.8);
    assert.ok(ctx.calls.some(([name]) => name === 'stroke' || name === 'fill'), `${fx} draws something`);
    assert.ok(ctx.calls.some(([name]) => name === 'restore'), `${fx} restores canvas state`);
    // After the flourish has played out it must not draw at all.
    ctx.calls.length = 0;
    renderer.drawSkillFx({ x: 100, y: 200 }, fx, 5, 0.8);
    assert.equal(ctx.calls.length, 0, `${fx} stops drawing when finished`);
  }
});

const { learnedSkillRows, skillGate, skillRow, skillSummary, fxLabel } = await import('../src/skills-ui.js');
const { createGame } = await import('../src/sim.js');
const { skillCatalog, learnedRank, SKILLS: CATALOG } = await import('../src/data.js');

test('skill gates follow job level, camp state and the rank cap', () => {
  const c = createGame().characters[0];
  Object.assign(c, { job: 'swordsman', jobLevel: 1, mapId: null, status: 'camp', skills: { bash: 1, magnum_break: 0 }, activeSkill: 'bash' });
  const bash = skillGate(c, 'bash');
  assert.equal(bash.rank, 1); assert.equal(bash.next, 2); assert.equal(bash.need, 5);
  assert.equal(bash.locked, true); assert.equal(bash.canLearn, false);
  assert.equal(bash.active, true);
  c.jobLevel = 5;
  assert.equal(skillGate(c, 'bash').canLearn, true);
  c.skills.bash = 3;
  const maxed = skillGate(c, 'bash');
  assert.equal(maxed.maxed, true); assert.equal(maxed.canLearn, false);
  // Deployed adventurers train nothing until they return to camp.
  const deployed = { ...c, mapId: 'meadow', skills: { magnum_break: 0 } };
  assert.equal(skillGate(deployed, 'magnum_break').canLearn, false);
});

test('skill rows explain the flourish, the next rank and the gate state', () => {
  const c = createGame().characters[0];
  Object.assign(c, { job: 'knight', jobLevel: 10, mapId: null, status: 'camp', skills: { brandish_spear: 1 }, activeSkill: 'brandish_spear' });
  const row = skillRow(c, 'brandish_spear');
  assert.match(row, /Brandish Spear/);
  assert.match(row, /Thrust line/, 'the flourish is named in plain language');
  assert.match(row, /R1\/3/);
  assert.match(row, /casting/i);
  assert.match(row, /Learn R2/);
  assert.match(row, /power 1\.50× → 1\.68×/);
  // Locked ranks say when they arrive and stay disabled.
  const lockedRow = skillRow(c, 'spiral_pierce');
  assert.match(lockedRow, /Job Lv\. 26/);
  assert.match(lockedRow, /data-workspace-learn="spiral_pierce" disabled/);
});

test('every class line exposes at least one trainable skill and a flourish label', () => {
  for (const job of ['novice', 'swordsman', 'mage', 'archer', 'acolyte', 'merchant', 'thief', 'knight', 'wizard', 'hunter', 'priest', 'blacksmith', 'assassin', 'crusader', 'sage', 'bard', 'dancer', 'monk', 'alchemist', 'rogue', 'lordKnight', 'runeKnight', 'archBishop', 'guillotineCross']) {
    const catalog = skillCatalog(job);
    assert.ok(catalog.length > 0, `${job} has a skill catalog`);
    for (const [id] of catalog) assert.notEqual(fxLabel(id), '—', `${id} has a flourish label`);
  }
  const c = createGame().characters[0];
  c.job = 'priest'; c.skills = { sanctuary: 2, magnus_exorcismus: 1 }; c.activeSkill = 'sanctuary';
  assert.match(learnedSkillRows(c), /Sanctuary/);
  assert.match(learnedSkillRows(c), /Magnus Exorcismus/);
  assert.doesNotMatch(learnedSkillRows(c), /Kyrie/, 'unlearned skills stay out of the learned list');
  const summary = skillSummary(c);
  assert.equal(summary.name, 'Sanctuary');
  assert.equal(summary.rank, 2);
  assert.equal(summary.line, 'priest');
  assert.ok(summary.power > 0);
  assert.ok(CATALOG.sanctuary && learnedRank(c, 'sanctuary') === 2);
});

test('a minimap click resolves the nearest roster marker, then empty ground', () => {
  const ctx = recordingContext();
  const renderer = new Renderer({ width: 800, height: 600, getContext: () => ctx }, {});
  const state = createGame();
  const [a, b] = state.characters;
  Object.assign(a, { mapId: 'meadow', x: -20, y: 10 });
  Object.assign(b, { mapId: 'meadow', x: 18, y: -6 });
  state.characters.push({ ...b, id: 'c3', mapId: 'forest', x: -20, y: 10 });
  const canvas = { width: 320, height: 200 };
  const { scale, offX, offY } = renderer.minimapTransform(canvas);
  const p = (x, y) => { const q = { x: (x - y) * 22, y: (x + y) * 11 }; return { x: offX + q.x * scale, y: offY + q.y * scale }; };
  const pa = p(a.x, a.y), pb = p(b.x, b.y);
  assert.equal(renderer.minimapCharacterAt(canvas, pa.x, pa.y, state)?.id, 'c1');
  assert.equal(renderer.minimapCharacterAt(canvas, pb.x + 1, pb.y + 1, state)?.id, 'c2');
  // Adventurers on other maps are never picked, and empty ground returns null.
  assert.equal(renderer.minimapCharacterAt(canvas, 0, 0, state), null);
  const away = renderer.minimapCharacterAt(canvas, p(-20, 10).x + 40, p(-20, 10).y + 40, state);
  assert.equal(away, null);
});

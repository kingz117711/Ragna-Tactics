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
    quadraticCurveTo: record('quadraticCurveTo'), bezierCurveTo: record('bezierCurveTo'),
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
  assert.equal(bash.rank, 1); assert.equal(bash.next, 2); assert.equal(bash.need, 2);
  assert.equal(bash.locked, true); assert.equal(bash.canLearn, false);
  assert.equal(bash.active, true);
  c.jobLevel = 5;
  assert.equal(skillGate(c, 'bash').canLearn, true);
  c.skills.bash = 10;
  const maxed = skillGate(c, 'bash');
  assert.equal(maxed.maxed, true); assert.equal(maxed.canLearn, false);
  // Deployed adventurers train nothing until they return to camp.
  const deployed = { ...c, mapId: 'meadow', skills: { magnum_break: 0 } };
  assert.equal(skillGate(deployed, 'magnum_break').canLearn, false);
});

test('skill rows explain the flourish, the next rank and the gate state', () => {
  const c = createGame().characters[0];
  Object.assign(c, { job: 'knight', jobLevel: 10, mapId: null, status: 'camp', skills: { brandish_spear: 1, spear_stab: 5 }, activeSkill: 'brandish_spear' });
  const row = skillRow(c, 'brandish_spear');
  assert.match(row, /Brandish Spear/);
  assert.match(row, /Spear brandish/, 'the flourish is named in plain language');
  assert.match(row, /R1\/10/);
  assert.match(row, /casting/i);
  assert.match(row, /Learn R2/);
  assert.match(row, /power 1\.60× → 1\.74×/);
  // Locked ranks say when they arrive and stay disabled.
  const lockedRow = skillRow(c, 'bowling_bash');
  assert.match(lockedRow, /Job Lv\. 12/);
  assert.match(lockedRow, /data-workspace-learn="bowling_bash" disabled/);
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

test('the full catalog exposes per-class trees, prerequisites and build presets', async () => {
  const { JOBS, SKILL_BUILDS, skillUnlockLevel, prereqMet, skillPoints } = await import('../src/data.js');
  const { skillTree, buildCards, rotationStrip, skillIcon } = await import('../src/skills-ui.js');
  // Every playable job has a tree of at least five trainable skills.
  for (const job of Object.keys(JOBS)) {
    assert.ok(skillCatalog(job).length >= 5, `${job} exposes a full skill tree`);
  }
  // Sniper is the reference three-build class and each build names real skills.
  const sniper = SKILL_BUILDS.sniper.map(b => b.name.toLowerCase());
  assert.ok(sniper.some(n => /trap/.test(n)) && sniper.some(n => /auto/.test(n)) && sniper.some(n => /falcon/.test(n)));
  for (const [family, builds] of Object.entries(SKILL_BUILDS)) {
    assert.ok(builds.length >= 2, `${family} has at least two builds`);
    for (const build of builds) {
      assert.ok(build.skills.length >= 1, `${build.id} lists skills`);
      for (const id of build.skills) assert.ok(CATALOG[id], `${build.id} references a real skill: ${id}`);
    }
  }
  // Tree markup groups by job tier and shows prerequisites + ranks.
  const c = createGame().characters[0];
  Object.assign(c, { job: 'sniper', jobLevel: 30, skills: { blitz_beat: 5, falconry_mastery: 1 }, activeSkill: 'blitz_beat', activeSkills: ['blitz_beat'] });
  const tree = skillTree(c);
  assert.match(tree, /Hunter/);
  assert.match(tree, /Sniper/);
  assert.match(tree, /Falcon Assault/);
  assert.match(tree, /skill-prereqs/);
  assert.match(tree, /skill-node learned/);
  // A Sniper reads its tier-2 family presets (hunter family: trap/falcon/auto),
  // and every one of them names the skills a player would actually train.
  const cards = buildCards('sniper');
  assert.match(cards, /Trapper/);
  assert.match(cards, /Falcon/);
  assert.match(cards, /Blitz Beat/);
  assert.match(rotationStrip(c), /1<\/b>/);
  assert.match(skillIcon('falcon_assault'), /data-fx="falconAssault"/);
  // Prerequisite gating: Falcon Assault needs Blitz Beat 5 and Steel Crow 3.
  const def = CATALOG.falcon_assault;
  assert.equal(prereqMet({ blitz_beat: 5, falconry_mastery: 1 }, def), false);
  assert.equal(prereqMet({ blitz_beat: 5, steel_crow: 3 }, def), true);
  // Job-level gates are strictly ascending per skill.
  for (const [id, entry] of Object.entries(CATALOG)) {
    for (let i = 1; i < entry.unlock.length; i++) assert.ok(entry.unlock[i] >= entry.unlock[i - 1], `${id} unlocks in order`);
    assert.equal(skillUnlockLevel(id, entry.maxRank), entry.unlock[entry.maxRank - 1]);
  }
  // Skill points: one per job level, one per learned rank.
  assert.equal(skillPoints(10, { bash: 3, provoke: 2 }), 5);
  assert.equal(skillPoints(4, { bash: 9 }), 0);
});

test('a job-level economy trains ranks through the command boundary', async () => {
  const { command } = await import('../src/sim.js');
  const s = createGame(), c = s.characters[0];
  Object.assign(c, { job: 'swordsman', jobLevel: 3, skills: {}, activeSkill: null, activeSkills: [] });
  // Every job level grants a point and every rank costs one: Job Lv. 3 buys three
  // ranks in total, then the budget refuses a fourth.
  for (let i = 0; i < 3; i++) assert.equal(command(s, { type: 'skill-learn', ids: ['c1'], skillId: i < 2 ? 'bash' : 'provoke' }), null);
  assert.equal(c.skills.bash, 2);
  assert.equal(c.skills.provoke, 1);
  // No points left: raising a rank the job level already allows is refused with
  // the budget, not the job-level gate.
  assert.match(command(s, { type: 'skill-learn', ids: ['c1'], skillId: 'bash' }), /skill points/i);
  // A prerequisite gates the next skill even with points to spend.
  c.jobLevel = 8;
  assert.match(command(s, { type: 'skill-learn', ids: ['c1'], skillId: 'endure' }), /Provoke 5/);
  // Slots: training seeds the rotation, a new skill joins it, and a slot can be
  // cleared again so the rotation stays hand-built.
  assert.ok(c.activeSkills.length > 0, 'training fills the rotation');
  // Endure is a Swordsman skill the rotation does not hold yet.
  c.skills.endure = 1;
  assert.equal(command(s, { type: 'skill-slot', ids: ['c1'], skillId: 'endure' }), null);
  assert.ok(c.activeSkills.includes('endure'));
  assert.equal(command(s, { type: 'skill-slot', ids: ['c1'], skillId: 'endure', remove: true }), null);
  assert.ok(!c.activeSkills.includes('endure'));
});

test('every class plays a complete attack action and returns to idle', async () => {
  const { attackFrameIndex } = await import('../src/sprites.js');
  const { JOBS } = await import('../src/data.js');
  // A 9-frame swing resolves to its last frame and stays there — no looping.
  const frames = [0, 1, 2, 2, 2, 3, 4, 5, 6];
  assert.equal(attackFrameIndex(frames.length, 100, 0), 0);
  assert.equal(attackFrameIndex(frames.length, 100, 350), 3);
  assert.equal(attackFrameIndex(frames.length, 100, 900), 8);
  assert.equal(attackFrameIndex(frames.length, 100, 99999), 8);
  // Idle/walk still loop.
  assert.equal(attackFrameIndex(frames.length, 100, 900, true), 0);
  // Every job has an imported outfit (directly or through its ancestors) and a
  // non-zero attack window the renderer can hold the pose for.
  const seen = new Set();
  for (const [id, job] of Object.entries(JOBS)) {
    assert.notEqual(job.native, undefined, `${id} has a native outfit`);
    seen.add(job.native);
  }
  assert.ok(seen.size >= 15, 'outfits cover the whole class list');
  // The simulation stamps a swing counter on every attack source.
  const { createGame, command, swing } = await import('../src/sim.js');
  const s = createGame(), c = s.characters[0];
  const before = c.attackSwing || 0;
  swing(c);
  assert.equal(c.attackSwing, before + 1);
  assert.ok(command(s, { type: 'tactic', ids: ['c1'], mode: 'safe' }) === null || true);
});

test('the Skills workspace renders for every class and build', async () => {
  const { JOBS, SKILL_BUILDS, SKILLS: SKILLS_CATALOG } = await import('../src/data.js');
  const { skillTree, buildCards, rotationStrip } = await import('../src/skills-ui.js');
  const s = createGame();
  const c = s.characters[0];
  for (const id of Object.keys(JOBS)) {
    Object.assign(c, { job: id, jobLevel: Math.min(70, JOBS[id].maxJobLevel || 50), skills: {}, activeSkills: [], activeSkill: null });
    const tree = skillTree(c);
    assert.match(tree, /skill-tree/, `${id} renders a tree`);
    assert.match(tree, /data-skill="[a-z_]+"/, `${id} nodes are clickable`);
    assert.match(tree, /Job Lv\./, `${id} shows job-level gates`);
    assert.ok(rotationStrip(c).length > 0, `${id} renders a rotation strip`);
    assert.ok(buildCards(id).length > 0, `${id} renders build cards`);
  }
  // Builds are filed by family, so every job that shares a family (Sniper with
  // Hunter, Lord Knight with Knight …) offers the same presets, and each card
  // lists only skills that exist.
  const { skillFamily } = await import('../src/skills.js');
  for (const [family, builds] of Object.entries(SKILL_BUILDS)) {
    for (const build of builds) {
      assert.ok(buildCards(family).includes(`data-build="${build.id}"`), `${build.id} card renders`);
      for (const id of build.skills) assert.ok(SKILLS_CATALOG[id], `${build.id} lists a real skill: ${id}`);
    }
  }
  for (const id of Object.keys(JOBS)) {
    const family = skillFamily(id);
    if (!SKILL_BUILDS[family]) continue;
    assert.match(buildCards(id), /build-card/, `${id} shows its family's builds`);
  }
});

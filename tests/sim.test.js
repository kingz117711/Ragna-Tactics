import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, command, advance, tick, gainExp, stats, settleOffline, rosterLimit, effectiveTactics, roleOf, advanceExpeditionGoals } from '../src/sim.js';
import { OFFLINE_CAP, MONSTERS, mapBounds, SKILLS } from '../src/data.js';
const ids = ['c1', 'c2'];
test('a marked hunt survives manual repositioning, resume and offline settlement', () => {
  const s = createGame();
  deploy(s, 'meadow', ['c1']);
  deploy(s, 'forest', ['c2']);
  const point = { x: 13, y: 13 };
  assert.equal(command(s, { type: 'rally', ids, mapId: 'meadow', point }), null);
  const [farmer, solo] = s.characters;
  assert.equal(solo.farmRadius, undefined);
  for (const enemy of s.maps.meadow.monsters) Object.assign(enemy, { x: -12, y: -12 });
  advance(s, 15);
  // Farm idle settles inside the 1.2-unit home guard (party spacing keeps the
  // pair from hugging the exact centre).
  assert.ok(Math.hypot(farmer.x - point.x, farmer.y - point.y) < 1.25);
  assert.equal(farmer.kills, 0);
  command(s, { type: 'move', ids: ['c1'], point: { x: 5, y: 5 } });
  advance(s, 6);
  command(s, { type: 'resume', ids: ['c1'] });
  assert.deepEqual(farmer.home, point);
  settleOffline(s, 15);
  assert.ok(Math.hypot(farmer.x - point.x, farmer.y - point.y) < 1.25);
});
test('rally radius is validated before changing either party member and survives a save', async () => {
  const { encodeSave, decodeSave } = await import('../src/persistence.js');
  const s = createGame();
  command(s, { type: 'party', ids });
  deploy(s);
  const rally = { type: 'rally', ids: ['c1'], mapId: 'meadow', point: { x: 1, y: 2 } };
  for (const radius of [3, 10, undefined]) {
    assert.equal(command(s, { ...rally, radius }), null);
    const loaded = decodeSave(encodeSave(s)).state;
    assert.ok(loaded.characters.every(c => c.farmRadius === (radius ?? 6)));
  }
  const before = structuredClone(s);
  for (const radius of [0, null, '6', 11]) assert.ok(command(s, { ...rally, radius }));
  assert.deepEqual(s, before);
});
test('Novice job readiness is recorded once and shared kills count once in an away report', () => {
  const s = createGame();
  gainExp(s, s.characters[0], 0, 1000);
  gainExp(s, s.characters[0], 0, 1000);
  assert.equal(s.journal.filter(e => e.message.includes('first job')).length, 1);
  command(s, { type: 'party', ids });
  deploy(s);
  const report = settleOffline(s, 60);
  assert.ok(report.kills > 0);
  assert.equal(report.kills, Object.values(s.inventory.materials).reduce((a,b) => a+b, 0));
  assert.ok(report.loot.some(drop => drop.count > 0 && drop.name === 'Jellopy'));
});
test('Sanctuary Ring spares adventurers in the centre and hits the marked band', () => {
  const s = createGame();
  promote(s, 0, 'swordsman'); promote(s, 1, 'archer'); deploy(s, 'arena');
  const map = s.maps.arena, boss = map.monsters[0];
  boss.hp = 1000; map.bossTimer = 0; tick(s);
  const cast = map.telegraph;
  assert.equal(cast.innerRadius, 3);
  for (const [index, c] of s.characters.entries()) {
    c.x = cast.x + index * 5; c.y = cast.y;
    command(s, { type: 'hold', ids: [c.id] });
  }
  const health = s.characters.map(c => c.hp);
  for (const m of map.monsters) m.timer = 8;
  cast.remaining = 0.05; tick(s);
  assert.equal(s.characters[0].hp, health[0]);
  assert.equal(s.characters[1].hp, health[1] - 75);
});
const deploy = (s, mapId = 'meadow', units = ids) => assert.equal(command(s, { type: 'deploy', ids: units, mapId }), null);
const promote = (s, i, job) => { const c = s.characters[i]; gainExp(s, c, 300, 1000); assert.equal(command(s, { type: 'promote', ids: [c.id], job }), null); };

test('a new guild starts with exactly two independent Novices and two unlocked slots', () => {
  const s = createGame(); assert.equal(s.characters.length, 2); assert.equal(rosterLimit(s), 2);
  assert.ok(s.characters.every(c => c.job === 'novice' && c.mapId === null && c.partyId === null));
  assert.match(command(s, { type: 'recruit', name: 'Third' }), /milestones/);
});
test('independent teams make progress on different maps in the same simulation', () => {
  const s = createGame(); promote(s, 0, 'swordsman'); promote(s, 1, 'archer');
  deploy(s, 'meadow', ['c1']); deploy(s, 'forest', ['c2']); advance(s, 90);
  assert.ok(s.characters[0].kills > 0); assert.ok(s.characters[1].kills > 0); assert.ok(s.milestones.forestKills > 0);
});
test('same seed and commands yield identical outcomes, regardless of view', () => {
  const a = createGame(22), b = createGame(22); deploy(a); deploy(b);
  advance(a, 120); advance(b, 120); assert.deepEqual(a, b);
});
test('party deployment expands a leader selection and keeps members on the same map', () => {
  const s = createGame(); assert.equal(command(s, { type: 'party', ids }), null);
  deploy(s, 'meadow', ['c1']); assert.ok(s.characters.every(c => c.mapId === 'meadow'));
  assert.equal(s.parties[0].leaderId, 'c1');
});
test('party formation refuses to silently link characters on different maps', () => {
  const s = createGame(); deploy(s, 'meadow', ['c1']); deploy(s, 'forest', ['c2']);
  assert.match(command(s, { type: 'party', ids }), /same map/);
});
test('splitting a party removes singleton records and clears membership', () => {
  const s = createGame(); command(s, { type: 'party', ids }); command(s, { type: 'split', ids: ['c1'] });
  assert.equal(s.parties.length, 0); assert.ok(s.characters.every(c => c.partyId === null));
});
test('Novices must earn Job Lv. 10 and be at camp to choose a first job', () => {
  const s = createGame(); assert.match(command(s, { type: 'promote', ids: ['c1'], job: 'mage' }), /Lv. 10/);
  gainExp(s, s.characters[0], 50, 1000); deploy(s, 'meadow', ['c1']);
  assert.match(command(s, { type: 'promote', ids: ['c1'], job: 'mage' }), /camp/);
  s.characters[0].mapId = null; assert.equal(command(s, { type: 'promote', ids: ['c1'], job: 'mage' }), null);
  assert.equal(s.characters[0].job, 'mage'); assert.equal(s.characters[1].job, 'novice'); assert.equal(s.characters[0].jobLevel, 1);
});
test('all six first jobs can advance and farm using original stable job IDs', () => {
  for (const job of ['swordsman', 'mage', 'archer', 'acolyte', 'merchant', 'thief']) {
    const s = createGame(); promote(s, 0, job); deploy(s, 'meadow', ['c1']); advance(s, 40);
    assert.ok(s.characters[0].kills > 0, job);
  }
});
test('movement overrides farming and ends in hold until explicitly resumed', () => {
  const s = createGame(); deploy(s, 'meadow', ['c1']);
  command(s, { type: 'move', ids: ['c1'], point: { x: -25, y: 19 } }); advance(s, 8);
  assert.equal(s.characters[0].order, 'hold');
  command(s, { type: 'resume', ids: ['c1'] }); assert.equal(s.characters[0].order, 'farm');
});
test('out-of-bounds and non-finite movement orders cannot corrupt positions', () => {
  const s = createGame(); deploy(s);
  assert.ok(command(s, { type: 'move', ids, point: { x: Infinity, y: 1 } }));
  // South Prontera and each field enforce their own playable bounds.
  assert.match(command(s, { type: 'move', ids, point: { x: 50, y: 0 } }), /inside the battlefield/);
  assert.match(command(s, { type: 'move', ids, mapId: 'forest', point: { x: 33, y: 0 } }), /inside the battlefield/);
  assert.ok(s.characters.every(c => Number.isFinite(c.x)));
});
test('combat blocks instant redeployment; retreat reaches camp', () => {
  const s = createGame(); deploy(s); const c = s.characters[0], m = s.maps.meadow.monsters[0];
  m.x = c.x; m.y = c.y; m.targetId = c.id;
  assert.match(command(s, { type: 'deploy', ids: ['c1'], mapId: 'forest' }), /Retreat/);
  assert.equal(command(s, { type: 'retreat', ids: ['c1'] }), null); advance(s, 15);
  assert.equal(c.mapId, null); assert.equal(c.status, 'camp');
});
test('defeat stops a character; recovery is an explicit camp action', () => {
  const s = createGame(); deploy(s, 'meadow', ['c1']); const c = s.characters[0]; c.hp = 0;
  tick(s); assert.equal(c.status, 'down'); assert.equal(c.mapId, null);
  advance(s, 30); assert.equal(c.hp, 0);
  assert.match(command(s, { type: 'deploy', ids: ['c1'], mapId: 'meadow' }), /Recover/);
  command(s, { type: 'recover', ids: ['c1'] }); assert.equal(c.hp, stats(c).hp); assert.equal(c.status, 'camp');
});
test('equipment transfers preserve item counts and identity', () => {
  const s = createGame(); s.inventory.equipment.iron = 1;
  command(s, { type: 'equip', ids: ['c1'], item: 'iron' }); assert.equal(s.inventory.equipment.iron, 0);
  assert.ok(command(s, { type: 'equip', ids: ['c2'], item: 'iron' }));
  command(s, { type: 'equip', ids: ['c1'], item: 'training' }); assert.equal(s.inventory.equipment.iron, 1);
  command(s, { type: 'equip', ids: ['c2'], item: 'iron' }); assert.equal(s.inventory.equipment.iron, 0);
  assert.equal(s.characters[1].equipment, 'iron');
});
test('refilling potions charges the exact cost and does not mint currency', () => {
  const s = createGame(); s.characters[0].potions = 3;
  command(s, { type: 'resupply', ids: ['c1'] }); assert.equal(s.inventory.zeny, 136); assert.equal(s.characters[0].potions, 10);
  assert.ok(command(s, { type: 'resupply', ids: ['c1'] })); assert.equal(s.inventory.zeny, 136);
});
test('four-hour offline cap is shared elapsed time and applies to every deployed team', () => {
  const a = createGame(19), b = createGame(19);
  for (const s of [a, b]) { promote(s, 0, 'archer'); promote(s, 1, 'swordsman'); deploy(s, 'meadow', ['c1']); deploy(s, 'forest', ['c2']); }
  const ra = settleOffline(a, OFFLINE_CAP * 8), rb = settleOffline(b, OFFLINE_CAP);
  assert.equal(ra.seconds, OFFLINE_CAP); assert.equal(ra.capped, true); assert.equal(rb.capped, false);
  assert.equal(ra.kills, rb.kills); assert.deepEqual(a, b); assert.ok(ra.characters.every(c => c.levels > 0));
});
test('offline farming uses the same combat results as live farming, including custom tactics', () => {
  const a = createGame(17), b = createGame(17);
  for (const s of [a, b]) {
    promote(s, 0, 'archer');
    command(s, { type: 'tactic-config', ids: ['c1'], key: 'potionAt', value: 0.6 });
    command(s, { type: 'tactic-config', ids: ['c1'], key: 'targetPref', value: 'lowest' });
    deploy(s);
  }
  advance(a, 90, { effects: false }); settleOffline(b, 90);
  assert.deepEqual(a.characters, b.characters); assert.deepEqual(a.inventory, b.inventory); assert.deepEqual(a.maps, b.maps);
});
test('offline defeat remains defeated, and bosses never generate offline rewards', () => {
  const s = createGame(); promote(s, 0, 'mage'); promote(s, 1, 'swordsman'); deploy(s, 'arena');
  const before = s.inventory.zeny; settleOffline(s, 100);
  assert.equal(s.milestones.bossKills, 0); assert.equal(s.inventory.zeny, before); assert.ok(s.characters.every(c => !c.mapId));
  s.characters[0].status = 'down'; s.characters[0].hp = 0; settleOffline(s, 100); assert.equal(s.characters[0].hp, 0);
});
test('negative or invalid offline time cannot grant rewards', () => {
  for (const elapsed of [-100, NaN, Infinity]) { const s = createGame(); deploy(s); const r = settleOffline(s, elapsed); assert.equal(r.seconds, 0); assert.equal(r.kills, 0); }
});
test('boss encounter telegraphs an attack before it resolves', () => {
  const s = createGame(); promote(s, 0, 'swordsman'); promote(s, 1, 'acolyte'); deploy(s, 'arena');
  s.maps.arena.bossTimer = 0; tick(s); const t = s.maps.arena.telegraph;
  assert.ok(t); assert.equal(t.remaining, 2.5); assert.equal(t.radius, 4);
  advance(s, 2.6); assert.equal(s.maps.arena.telegraph, null);
});
test('boss defeat grants one relic, unlocks recruitment, and cannot reward twice', () => {
  const s = createGame(); promote(s, 0, 'swordsman'); promote(s, 1, 'acolyte'); deploy(s, 'arena');
  const boss = s.maps.arena.monsters.find(m => m.kind === 'baphomet'); boss.hp = 1;
  s.characters[0].x = boss.x; s.characters[0].y = boss.y; tick(s);
  assert.equal(s.milestones.bossKills, 1); assert.equal(s.inventory.equipment.sanctuary, 1); assert.equal(rosterLimit(s), 3);
  advance(s, 5); assert.equal(s.inventory.equipment.sanctuary, 1);
  assert.equal(command(s, { type: 'recruit', name: 'Nia', sex: 'f' }), null); assert.equal(s.characters[2].job, 'novice');
});
test('roster cannot exceed five even after all achievements', () => {
  const s = createGame(); s.milestones = { bossKills: 3, forestKills: 35 };
  for (let i = 0; i < 3; i++) assert.equal(command(s, { type: 'recruit', name: 'Novice ' + i }), null);
  assert.equal(s.characters.length, 5); assert.ok(command(s, { type: 'recruit', name: 'Extra' }));
});
test('party EXP is one reward pool with a 12% bonus, not a full reward per member', () => {
  const s = createGame(); command(s, { type: 'party', ids }); deploy(s);
  const m = s.maps.meadow.monsters[0]; m.x = s.characters[0].x; m.y = s.characters[0].y; m.hp = 1;
  const reward = MONSTERS[m.kind].exp; s.characters[1].order = 'hold'; s.characters[1].home = { x: s.characters[1].x, y: s.characters[1].y };
  tick(s);
  assert.equal(s.characters[0].kills, 1); assert.equal(s.characters[1].kills, 1);
  assert.ok(Math.abs(s.characters[0].exp + s.characters[1].exp - reward * 1.12) < 1e-8);
});
test('effects carry their map identity and cannot leak between viewed maps', () => {
  const s = createGame(); deploy(s);
  const observed = new Set();
  // Sample across the fight: effect lifetime is short, so a single frame can
  // legitimately fall between hits.
  for (let i = 0; i < 16; i++) {
    advance(s, 0.5);
    for (const e of s.effects) observed.add(e.mapId);
  }
  assert.ok(observed.has('meadow'));
  assert.ok([...observed].every(id => id === 'meadow'));
});
test('expedition goals progress in order, persist through completion, and unlock the first recruit', () => {
  const s = createGame(); assert.equal(s.milestones.expeditionStep, 0);
  command(s, { type: 'party', ids }); deploy(s);
  assert.equal(s.milestones.expeditionStep, 1);
  gainExp(s, s.characters[0], 0, 1000); gainExp(s, s.characters[1], 0, 1000); advance(s, 0.1);
  assert.equal(s.milestones.expeditionStep, 2);
  command(s, { type: 'retreat', ids }); advance(s, 20);
  assert.ok(s.characters.every(c => !c.mapId));
  assert.equal(command(s, { type: 'promote', ids: ['c1'], job: 'swordsman' }), null);
  assert.equal(s.milestones.expeditionStep, 2, 'one job choice does not complete the two-character job goal');
  assert.equal(command(s, { type: 'promote', ids: ['c2'], job: 'archer' }), null);
  assert.equal(s.milestones.expeditionStep, 4, 'both jobs and the prepared party advance the tutorial');
  s.milestones.bossKills = 1; advanceExpeditionGoals(s); assert.equal(s.milestones.expeditionStep, 5);
  assert.equal(command(s, { type: 'recruit', name: 'Nia' }), null);
  assert.equal(s.milestones.expeditionStep, 6);
});
test('tactics customization is bounded at the command boundary and controls survive Farm resume', () => {
  const s = createGame();
  assert.match(command(s, { type: 'tactic-config', ids: ['c1'], key: 'potionAt', value: 1.2 }), /between 0% and 95%/);
  assert.match(command(s, { type: 'tactic-config', ids: ['c1'], key: 'autoSkill', value: 1 }), /enabled or disabled/);
  assert.match(command(s, { type: 'tactic-config', ids: ['c1'], key: 'targetPref', value: 'invalid' }), /target preference/);
  assert.equal(command(s, { type: 'tactic-config', ids: ['c1'], key: 'autoSkill', value: false }), null);
  assert.equal(command(s, { type: 'tactic-config', ids: ['c1'], key: 'potionAt', value: 0.7 }), null);
  assert.equal(command(s, { type: 'tactic-config', ids: ['c1'], key: 'retreatAt', value: 0 }), null);
  assert.deepEqual(effectiveTactics(s.characters[0]), { autoSkill: false, healAt: 0.65, potionAt: 0.7, retreatAt: 0, targetPref: 'leader' });
  deploy(s, 'meadow', ['c1']); command(s, { type: 'move', ids: ['c1'], point: { x: 6, y: 6 } }); advance(s, 8);
  command(s, { type: 'resume', ids: ['c1'] }); assert.equal(s.characters[0].order, 'farm');
  assert.equal(s.characters[0].tactics.potionAt, 0.7);
});
test('party leader can be changed safely and followers promote an active member if the leader falls', () => {
  const s = createGame(); command(s, { type: 'party', ids });
  assert.equal(command(s, { type: 'leader', ids: ['c2'] }), null);
  assert.equal(s.parties[0].leaderId, 'c2');
  deploy(s, 'meadow'); s.characters[1].hp = 0; tick(s); tick(s);
  assert.equal(s.characters[1].status, 'down');
  assert.equal(s.parties[0].leaderId, 'c1');
});
test('job roles expose distinct frontline, ranged, and support positioning classes', () => {
  const s = createGame(); assert.equal(roleOf(s.characters[0]), 'frontline');
  promote(s, 0, 'archer'); assert.equal(roleOf(s.characters[0]), 'ranged');
  promote(s, 1, 'acolyte'); assert.equal(roleOf(s.characters[1]), 'support');
});
test('holding archers never damage leader targets outside attack range or hold leash', () => {
  const s = createGame(); promote(s, 0, 'swordsman'); promote(s, 1, 'archer');
  command(s, { type: 'party', ids }); deploy(s);
  const [leader, archer] = s.characters, enemy = s.maps.meadow.monsters[0];
  for (const m of s.maps.meadow.monsters) if (m !== enemy) { m.hp = 0; m.respawn = 100; }
  Object.assign(enemy, { x: 12.1, y: 0, hp: 1000, timer: 100, targetId: leader.id });
  command(s, { type: 'tactic-config', ids: ['c1'], key: 'autoSkill', value: false });
  Object.assign(leader, { x: 10.3, y: 0, home: { x: 10.3, y: 0 }, order: 'hold', status: 'holding', targetId: enemy.id, attackTimer: 100 });
  Object.assign(archer, { x: 0, y: 0, home: { x: 0, y: 0 }, order: 'hold', status: 'holding', targetId: null });
  const before = enemy.hp;
  tick(s);
  assert.equal(archer.targetId, null, 'hold must ignore a leader target outside its anchor leash');
  assert.equal(enemy.hp, before, 'leader assistance must not deal remote damage');
});
test('focused targets chase into attack range but never damage remotely or escape the leash', () => {
  const s = createGame(); promote(s, 0, 'swordsman'); promote(s, 1, 'archer');
  command(s, { type: 'party', ids }); deploy(s);
  const [leader, archer] = s.characters, enemy = s.maps.meadow.monsters[0];
  for (const m of s.maps.meadow.monsters) if (m !== enemy) { m.hp = 0; m.respawn = 100; }
  Object.assign(enemy, { x: 12, y: 0, hp: 1000, timer: 100, targetId: null });
  Object.assign(leader, { x: -8, y: 0, home: { x: -8, y: 0 }, order: 'hold', status: 'holding', attackTimer: 100 });
  Object.assign(archer, { x: 0, y: 0, home: { x: 0, y: 0 }, order: 'focus', targetId: enemy.id });
  const before = enemy.hp;
  tick(s);
  assert.equal(enemy.hp, before, 'focused target cannot be damaged before the Archer enters range');
  assert.equal(archer.status, 'moving');
  advance(s, 5);
  assert.ok(enemy.hp < before, 'the explicit focus becomes attackable after repositioning into range');

  Object.assign(archer, { x: 0, y: 0, home: { x: 0, y: 0 }, order: 'focus', targetId: enemy.id, attackTimer: 0 });
  Object.assign(enemy, { x: 22, y: 0, hp: 1000, targetId: null });
  const outOfLeash = enemy.hp;
  tick(s);
  assert.equal(enemy.hp, outOfLeash);
  assert.equal(archer.targetId, null);
  assert.deepEqual([archer.x, archer.y], [0, 0], 'an unreachable focus target does not pull a ranged follower away from Hold');
});
test('manual movement finishes before automatic retreat and all automatic repositioning stays in bounds', () => {
  const s = createGame(); promote(s, 0, 'archer'); deploy(s, 'meadow', ['c1']);
  const archer = s.characters[0];
  command(s, { type: 'tactic-config', ids: ['c1'], key: 'retreatAt', value: 0.7 });
  archer.hp = stats(archer).hp * 0.5;
  command(s, { type: 'move', ids: ['c1'], point: { x: -5, y: 20 } });
  tick(s);
  assert.equal(archer.order, 'move', 'safety automation must not cancel a deliberate Move mid-route');
  let observedRetreat = false;
  for (let i = 0; i < 200 && archer.mapId; i++) { tick(s); if (archer.order === 'retreat') observedRetreat = true; }
  assert.ok(observedRetreat, 'safety retreat resumes once the manual move completes');
  assert.equal(archer.status, 'camp');
  const bounds = mapBounds('meadow');
  assert.ok(Math.abs(archer.x) <= bounds.x && Math.abs(archer.y) <= bounds.y);
});
test('ranged kite repositioning is clamped to battlefield bounds', () => {
  const s = createGame(); promote(s, 0, 'archer'); deploy(s, 'meadow', ['c1']);
  const archer = s.characters[0], enemy = s.maps.meadow.monsters[0];
  command(s, { type: 'tactic-config', ids: ['c1'], key: 'autoSkill', value: false });
  for (const m of s.maps.meadow.monsters) if (m !== enemy) { m.hp = 0; m.respawn = 100; }
  Object.assign(archer, { x: 15, y: 15, home: { x: 15, y: 15 }, order: 'farm', attackTimer: 0 });
  Object.assign(enemy, { x: 14.9, y: 15, hp: 1000, timer: 100, targetId: null });
  advance(s, 2);
  const bounds = mapBounds('meadow');
  assert.ok(Math.abs(archer.x) <= bounds.x && Math.abs(archer.y) <= bounds.y);
});
test('ranged attackers stop inside their native range while supports stay with the engaging party', () => {
  const ranged = createGame(); promote(ranged, 0, 'archer'); deploy(ranged, 'meadow', ['c1']);
  const archer = ranged.characters[0], target = ranged.maps.meadow.monsters.find(m => m.kind === 'fabre');
  for (const m of ranged.maps.meadow.monsters) if (m !== target) { m.hp = 0; m.respawn = 100; }
  Object.assign(target, { x: 0, y: 0, hp: 1000 }); Object.assign(archer, { x: -5, y: 8, home: { x: -5, y: 8 } });
  advance(ranged, 4);
  assert.ok(Math.hypot(archer.x - target.x, archer.y - target.y) > 3.5);
  assert.ok(Math.hypot(archer.x - target.x, archer.y - target.y) <= stats(archer).range);

  const party = createGame(); promote(party, 0, 'swordsman'); promote(party, 1, 'acolyte');
  command(party, { type: 'party', ids }); deploy(party);
  const leader = party.characters[0], support = party.characters[1], enemy = party.maps.meadow.monsters[0];
  for (const m of party.maps.meadow.monsters) if (m !== enemy) { m.hp = 0; m.respawn = 100; }
  Object.assign(leader, { x: -2, y: 0, home: { x: -2, y: 0 } });
  Object.assign(support, { x: -3, y: 1, home: { x: -3, y: 1 } });
  Object.assign(enemy, { x: 0, y: 0, hp: 1000 }); advance(party, 8);
  assert.ok(Math.hypot(leader.x - support.x, leader.y - support.y) < 5.5);
  assert.ok(Math.hypot(support.x - enemy.x, support.y - enemy.y) <= 8);
  assert.equal(leader.targetId, support.targetId);
});

test('each second job follows its own first job and casts its signature skill', () => {
  for (const [base, job] of Object.entries({ swordsman: 'knight', mage: 'wizard', archer: 'hunter', acolyte: 'priest', merchant: 'blacksmith', thief: 'assassin' })) {
    const s = createGame(), [c, ally] = s.characters;
    const change = job => command(s, { type: 'promote', ids: [c.id], job });
    assert.ok(change(job)); promote(s, 0, base);
    assert.ok(change(job)); c.jobLevel = 40;
    assert.ok(change(job === 'knight' ? 'wizard' : 'knight'));
    assert.equal(change(job), null);
    assert.equal(c.jobLevel, 1);
    command(s, { type: 'party', ids }); deploy(s);
    const mobs = s.maps.meadow.monsters;
    for (const m of mobs) Object.assign(m, { x: c.x, y: c.y, hp: 300, timer: 0 });
    c.targetId = mobs[0].id;
    c.hp = 20; ally.hp = 20;
    assert.equal(command(s, { type: 'skill', ids: [c.id] }), null);
    if (job === 'priest') { assert.ok(ally.hp > 20 && c.hp > 20); continue; }
    const hits = mobs.filter(m => m.hp < 300);
    const expectedTargets = { hunter: 3, assassin: 1, swordsman: 1, merchant: 1, thief: 1 }[job] ?? mobs.length;
    assert.ok(hits.length > 0 && hits.length <= expectedTargets, `${job} should land at least one hit and respect its target cap`);
    if (job === 'wizard') assert.ok(hits.every(m => m.timer >= 2), 'Storm Gust freezes its cluster');
    // Every second job now casts a catalog skill with its own flourish.
    assert.ok(stats(c).skillFx, `${job} signature skill carries a flourish`);
  }
});

test('forging spends shared loot once and applies the resident Blacksmith discount', () => {
  const s = createGame(), inv = s.inventory;
  const forge = () => command(s, { type: 'forge', item: 'guard' });
  assert.ok(forge()); assert.equal(inv.zeny, 150);
  inv.materials = { Fluff: 12, Resin: 8 };
  s.characters[0].job = 'blacksmith';
  assert.equal(forge(), null); assert.equal(inv.zeny, 120);
  deploy(s, 'meadow', ['c1']);
  assert.equal(forge(), null); assert.equal(inv.zeny, 60);
  assert.ok(forge()); assert.equal(inv.equipment.guard, 2);
  assert.deepEqual(inv.materials, { Fluff: 0, Resin: 0 });
});

test('socketed duplicates can be stored, transferred and unsocketed independently', () => {
  const s = createGame(), [a,b] = s.characters, inv = s.inventory;
  inv.equipment.iron = 2; inv.cards.scorpion = 1;
  const act = (c, type, args) => command(s, { type, ids: [c.id], ...args });
  for (const c of [a,b]) assert.equal(act(c,'equip',{item:'iron'}), null);
  const atk = stats(a).atk;
  assert.equal(act(a,'socket',{card:'scorpion'}), null);
  assert.equal(stats(a).atk, atk + 6); assert.equal(stats(b).atk, atk);
  assert.equal(act(a,'equip',{item:'training'}), null);
  assert.equal(inv.socketed['iron/scorpion'], 1);
  assert.equal(act(b,'equip',{item:'iron',card:'scorpion'}), null);
  assert.equal(inv.equipment.iron, 1); assert.equal(inv.cards.scorpion, 0);
  assert.equal(act(b,'socket',{card:null}), null);
  assert.equal(inv.cards.scorpion, 1); assert.equal(stats(b).atk, atk);
});
test('Dunes card hunting settles the same earned cards live and offline', () => {
  const s = createGame(11);
  for (const c of s.characters) { c.job='knight'; c.level=45; c.hp=stats(c).hp; }
  deploy(s,'morroc'); const live = structuredClone(s);
  const report = settleOffline(s,600); advance(live,600);
  assert.deepEqual(s.inventory,live.inventory);
  assert.ok(report.loot.some(drop => drop.name.endsWith(' Card') && drop.count > 0));
});

test('Sand Pact follows the marked adventurer and shares damage only among nearby allies', () => {
  const s = createGame(); promote(s,0,'swordsman'); promote(s,1,'acolyte'); deploy(s,'lair');
  const [a,b] = s.characters, map = s.maps.lair;
  for (const c of [a,b]) Object.assign(c,{ order:'hold', hp:200, potions:0, tactics:{ ...c.tactics, autoSkill:false }, attackTimer:30 });
  Object.assign(map.monsters[0], { x:14,y:14,timer:20 });
  map.telegraph = { x:14,y:14,radius:4,remaining:0.05,duration:3.5,markedId:a.id };
  tick(s); assert.equal(a.hp,110); assert.equal(b.hp,110);
  map.telegraph = {x:b.x,y:b.y,radius:4,remaining:0.05,duration:3.5,markedId:a.id};
  b.x = 10; b.y = 10;
  tick(s); assert.equal(a.hp,0); assert.equal(b.hp,110);
});
test('Phreeoni pays one MVP card live, while leaving the fight offline gives no reward', () => {
  const s = createGame(); promote(s,0,'mage'); promote(s,1,'archer'); deploy(s,'lair');
  const offline = structuredClone(s);
  settleOffline(offline,60); assert.ok(offline.characters.every(c => !c.mapId));
  assert.equal(offline.inventory.cards.phreeoni,undefined);
  s.maps.lair.monsters[0].hp = 1; advance(s,20);
  assert.equal(s.inventory.cards.phreeoni,1); assert.ok(s.maps.lair.bossDefeated);
  advance(s,20); assert.equal(s.inventory.cards.phreeoni,1);
});

test('stat training spends earned points atomically and survives job advancement', () => {
  const s = createGame(), c = s.characters[0]; c.level = 10; c.jobLevel = 10;
  const train = points => command(s,{type:'allocate',ids:['c1'],points});
  const before = stats(c);
  assert.ok(train({vit:5,str:15})); assert.equal(c.attributes,undefined);
  assert.equal(train({str:2,agi:2,vit:3,int:3,dex:3,luk:5}),null);
  const after = stats(c); assert.equal(after.hp-before.hp,30); assert.equal(after.def-before.def,1);
  assert.equal(after.atk-before.atk,4); assert.ok(after.interval < before.interval);
  assert.equal(after.crit,0.05); assert.equal(after.sp-before.sp,12); assert.equal(after.skillBonus,6);
  assert.ok(train({str:1}));
  assert.equal(command(s,{type:'promote',ids:['c1'],job:'mage'}),null);
  assert.equal(stats(c).crit,0.05);
});

test('bounties count subsequent matching field kills offline and pay a single claim', () => {
  const s = createGame(), accept = id => command(s,{type:'bounty-accept',id});
  promote(s,0,'mage'); deploy(s,'forest',['c1']); assert.equal(accept('harvest'),null);
  assert.ok(accept('timber')); settleOffline(s,40); assert.equal(s.bounty.kills,0);
  deploy(s,'meadow',['c2']); settleOffline(s,600);
  assert.equal(s.bounty.kills,12);
  const {zeny,equipment} = s.inventory, oldIron = equipment.iron;
  assert.equal(command(s,{type:'bounty-claim',id:'harvest'}),null);
  assert.equal(s.inventory.zeny,zeny+70); assert.equal(equipment.iron,oldIron+1);
  assert.ok(command(s,{type:'bounty-claim',id:'harvest'}));
  assert.equal(accept('harvest'),null); assert.equal(s.bounty.kills,0);
});

test('prepared magic resolves each splash victim against its own affinity', () => {
  const s=createGame(); promote(s,0,'mage');
  assert.equal(command(s,{type:'attune',ids:['c1'],element:'wind'}),null);
  deploy(s,'meadow',['c1']); const c=s.characters[0], mobs=s.maps.meadow.monsters;
  const poring=mobs.find(m=>m.kind==='poring'), fabre=mobs.find(m=>m.kind==='fabre');
  for(const m of [poring,fabre]) Object.assign(m,{x:c.x,y:c.y,hp:400});
  c.targetId=fabre.id;
  assert.ok(command(s,{type:'attune',ids:['c1'],element:'fire'}));
  assert.equal(command(s,{type:'skill',ids:['c1']}),null);
  assert.equal(400-poring.hp,Math.round(stats(c).atk*1.4*1.5));
  assert.equal(400-fabre.hp,Math.round(stats(c).atk*2.4-MONSTERS.fabre.def));
  assert.equal(stats(c).skill,'Lightning Bolt');
});

test('Caravan brooch converts drops from both regions into wearable gear', () => {
  const s=createGame(); s.inventory.zeny=180;
  s.inventory.materials={'Scorpion Tail':8,'Peco Feather':5,Resin:4};
  assert.equal(command(s,{type:'forge',item:'dune'}),null);
  assert.equal(s.inventory.zeny,0); assert.equal(s.inventory.equipment.dune,1);
  assert.equal(command(s,{type:'equip',item:'dune',ids:['c1']}),null);
  assert.equal(stats(s.characters[0]).atk,16); assert.equal(s.inventory.equipment.dune,0);
});

test('Payon rewards a prepared Holy Priest and preserves the healing loadout', () => {
  const s=createGame(), [priest]=s.characters; priest.job='priest';
  const prepare = element => command(s,{type:'attune',ids:[priest.id],element});
  assert.ok(prepare('water')); assert.equal(prepare('holy'),null);
  deploy(s,'payon',[priest.id]); const mobs=s.maps.payon.monsters;
  for(const m of mobs) Object.assign(m,{x:priest.x,y:priest.y,hp:300});
  priest.targetId=mobs[0].id; assert.equal(command(s,{type:'skill',ids:[priest.id]}),null);
  assert.ok(mobs.filter(m=>m.hp<300).length >= Math.ceil(mobs.length * 0.65)); assert.equal(stats(priest).skill,'Magnus Exorcismus');
  assert.ok(prepare('support')); priest.mapId=null;
  assert.equal(prepare('support'),null); assert.equal(stats(priest).skill,'Sanctuary');
});

test('refinement follows a carded item independently of a second plain copy', async () => {
  const {decodeSave,encodeSave}=await import('../src/persistence.js');
  let s=createGame(); s.inventory.zeny=500; s.inventory.materials.Emveretarcon=13;
  s.inventory.equipment.iron=2; s.inventory.cards.peco=1;
  const act=(id,type,args)=>command(s,{ids:[id],type,...args});
  assert.equal(act('c1','equip',{item:'iron'}),null);
  assert.equal(act('c1','socket',{card:'peco'}),null);
  assert.equal(act('c2','equip',{item:'iron'}),null);
  for(const rank of [1,2,3]) {
    assert.equal(act('c1','refine',{rank}),null);
    assert.ok(act('c1','refine',{rank}));
  }
  assert.equal(s.inventory.zeny,0); assert.equal(s.inventory.materials.Emveretarcon,0);
  assert.equal(act('c1','equip',{item:'training'}),null);
  s=decodeSave(encodeSave(s)).state;
  assert.equal(act('c2','equip',{item:'iron',card:'peco',rank:3}),null);
  assert.equal(stats(s.characters[1]).atk,21); assert.equal(s.inventory.equipment.iron,1);
  assert.equal(act('c2','socket',{card:null}),null);
  assert.equal(act('c2','equip',{item:'training'}),null);
  assert.equal(s.inventory.socketed['iron//3'],1); assert.equal(s.inventory.cards.peco,1);
  assert.equal(decodeSave(encodeSave(s)).state.inventory.socketed['iron//3'],1);
});

test('Oridecon and Elunium refine matching gear from +3 to +4 and survive save validation', async () => {
  const { decodeSave, encodeSave } = await import('../src/persistence.js');
  const s = createGame(); s.inventory.zeny = 1000;
  Object.assign(s.characters[0], { equipment: 'iron', refine: 3 });
  Object.assign(s.characters[1], { equipment: 'guard', refine: 3 });
  assert.match(command(s, { type: 'refine', ids: ['c1'], rank: 4 }), /Oridecon/);
  s.inventory.materials.Oridecon = 1; s.inventory.materials.Elunium = 1;
  assert.equal(command(s, { type: 'refine', ids: ['c1'], rank: 4 }), null);
  assert.equal(command(s, { type: 'refine', ids: ['c2'], rank: 4 }), null);
  assert.equal(s.inventory.materials.Oridecon, 0); assert.equal(s.inventory.materials.Elunium, 0);
  assert.equal(s.characters[0].refine, 4); assert.equal(s.characters[1].refine, 4);
  const restored = decodeSave(encodeSave(s)).state;
  assert.equal(restored.inventory.materials.Oridecon, 0);
  assert.equal(restored.characters[0].refine, 4);
});

test('all six transcendent jobs keep their equipment and learned builds at second Job Lv. 50', async () => {
  const {decodeSave,encodeSave}=await import('../src/persistence.js');
  for(const [parent,job] of Object.entries({knight:'lordKnight',priest:'highPriest',wizard:'highWizard',blacksmith:'whitesmith',hunter:'sniper',assassin:'assassinCross'})){
    const s=createGame(), c=s.characters[0];
    Object.assign(c,{job:parent,jobLevel:49,level:35,equipment:'iron',card:'skeleton',refine:2,attributes:{vit:10}});
    if(parent==='wizard')c.element='earth'; if(parent==='priest')c.element='holy';
    const change=()=>command(s,{type:'promote',ids:['c1'],job});
    assert.ok(change()); c.jobLevel=50; assert.equal(change(),null);
    assert.equal(c.jobLevel,1); assert.equal(c.refine,2); assert.deepEqual(c.attributes,{vit:10});
    assert.equal(decodeSave(encodeSave(s)).state.characters[0].job,job);
    assert.ok(stats(c).skill); assert.ok(stats(c).hp>150);
    deploy(s,'payon',['c1']); advance(s,60); assert.ok(c.kills>0);
  }
});

test('field orders target one adventurer, support follows an ally, boss focus remains individual', () => {
  const s = createGame();
  const [a,b] = s.characters;
  a.job='swordsman'; b.job='archer';
  assert.equal(command(s,{type:'party',ids}),null);
  assert.equal(command(s,{type:'deploy',mapId:'meadow',ids}),null);
  assert.ok(command(s,{type:'field-order',ids:['c2'],mapId:'forest',order:'support',allyId:'c1'}));
  assert.equal(command(s,{type:'field-order',ids:['c2'],mapId:'meadow',order:'support',allyId:'c1'}),null);
  b.x = a.x + 12;
  const gap = b.x - a.x;
  tick(s); assert.equal(b.supportId,'c1'); assert.ok(b.x-a.x < gap);
  const boss = createGame();
  boss.characters.forEach((c,i)=>c.job=i?'archer':'swordsman');
  assert.equal(command(boss,{type:'party',ids}),null);
  assert.equal(command(boss,{type:'deploy',mapId:'arena',ids}),null);
  assert.equal(command(boss,{type:'field-order',ids:['c1'],mapId:'arena',order:'boss'}),null);
  assert.equal(boss.characters[0].order,'focus');
  assert.equal(boss.characters[1].order,'farm');
  assert.equal(command(boss,{type:'hold',ids:['c1'],individual:true}),null);
  assert.equal(boss.characters[0].order,'hold');
  assert.equal(boss.characters[1].order,'farm');
});

test('techniques train and persist per adventurer, and manual skills spend only that unit’s SP',async()=>{
  const {decodeSave,encodeSave}=await import('../src/persistence.js');
  const s=createGame(), [a,b]=s.characters; a.job='swordsman'; a.jobLevel=7; b.job='archer'; b.jobLevel=7;
  const run=(type,fields)=>command(s,{type,ids:['c1'],...fields});
  assert.ok(run('technique-train',{skillId:'arrowShower'}));
  assert.equal(run('technique-train',{skillId:'provoke'}),null);
  assert.equal(run('technique-train',{skillId:'magnum'}),null);
  assert.equal(run('technique-slot',{slot:0,skillId:'provoke',auto:false}),null);
  assert.equal(run('technique-slot',{slot:1,skillId:'magnum',auto:true}),null);
  assert.equal(run('deploy',{mapId:'meadow'}),null);
  const target=s.maps.meadow.monsters[0]; target.x=a.x+1; target.y=a.y; target.targetId='c2'; a.targetId=target.id;
  const sp=a.sp, allySp=b.sp;
  assert.ok(run('technique-cast',{slot:1,mapId:'forest'}));
  assert.equal(run('technique-cast',{slot:1,mapId:'meadow'}),null);
  assert.equal(target.targetId,'c1');
  assert.equal(a.sp,sp-5); assert.equal(b.sp,allySp);
  assert.ok(run('technique-cast',{slot:1,mapId:'meadow'}));
  assert.equal(run('technique-cast',{slot:2,mapId:'meadow'}),null);
  const loaded=decodeSave(encodeSave(s)).state;
  assert.deepEqual(loaded.characters[0].techniques,a.techniques);
  assert.equal(loaded.characters[1].techniques,undefined);
});

test('equipment cards survive transfers and keep their effects on the worn instance',async()=>{
  const {decodeSave,encodeSave}=await import('../src/persistence.js');
  const s=createGame(), [a,b]=s.characters;
  s.inventory.gear={knife:1}; s.inventory.gearItems=[{uid:'test_knife',itemId:'knife',refine:0,affixes:[]}];
  s.inventory.cards.scorpion=1;
  const equip=id=>command(s,{type:'gear-equip',ids:[id],slot:'weapon',uid:'test_knife',item:'knife'});
  const socket=(id,card)=>command(s,{type:'gear-card',ids:[id],uid:'test_knife',card,index:0});
  assert.equal(equip(a.id),null); const atk=stats(a).atk;
  assert.equal(socket(a.id,'scorpion'),null); assert.ok(stats(a).atk>atk);
  assert.equal(command(s,{type:'gear-unequip',ids:[a.id],slot:'weapon'}),null);
  assert.deepEqual(decodeSave(encodeSave(s)).state.inventory.gearItems[0].cards,['scorpion']);
  assert.equal(equip(b.id),null); assert.deepEqual(b.gear.weapon.cards,['scorpion']);
  assert.equal(socket(b.id,null),null); assert.equal(s.inventory.cards.scorpion,1);
});

test('skills are trained by job level, one rank at a time, and never outside camp', () => {
  const s = createGame(), c = s.characters[0];
  Object.assign(c, { job: 'swordsman', jobLevel: 1, skills: {}, activeSkill: null });
  const learn = id => command(s, { type: 'skill-learn', ids: ['c1'], skillId: id });
  // Rank 2 of Bash unlocks at Job Lv. 2; the first rank is immediate.
  assert.equal(learn('bash'), null);
  assert.equal(c.skills.bash, 1);
  assert.equal(c.activeSkill, 'bash', 'the first trained skill becomes the active cast');
  assert.match(learn('bash'), /Job Lv\. 2/);
  // Another line's skill is refused outright.
  assert.match(learn('fire_bolt'), /class line/);
  c.jobLevel = 6;
  assert.equal(learn('bash'), null);
  assert.equal(c.skills.bash, 2);
  // A learned skill can take over the cast without losing the earlier rank.
  assert.equal(learn('magnum_break'), null);
  assert.equal(c.activeSkill, 'bash');
  assert.equal(command(s, { type: 'skill-active', ids: ['c1'], skillId: 'magnum_break' }), null);
  assert.equal(c.activeSkill, 'magnum_break');
  assert.equal(stats(c).skill, 'Magnum Break');
  // Training is a camp activity.
  command(s, { type: 'deploy', ids: ['c1'], mapId: 'meadow' });
  assert.match(learn('bash'), /camp/);
  assert.match(command(s, { type: 'skill-active', ids: ['c1'], skillId: 'bash' }), /camp/);
});

test('trained ranks raise skill damage, add flourish data, and respect the area target cap', () => {
  const run = rank => {
    const s = createGame(4242), c = s.characters[0];
    Object.assign(c, { job: 'swordsman', level: 20, jobLevel: 20, skills: { bash: 1, magnum_break: rank }, activeSkill: 'magnum_break' });
    command(s, { type: 'deploy', ids: ['c1'], mapId: 'meadow' });
    c.sp = stats(c).sp; c.cooldown = 0;
    const mobs = s.maps.meadow.monsters;
    for (const m of mobs) Object.assign(m, { x: 0, y: 0, hp: 4000, timer: 0, statuses: {} });
    Object.assign(c, { x: 0, y: 0, home: { x: 0, y: 0 } });
    c.targetId = mobs[0].id;
    // Four casts share one seed, so both ranks see the same hit/miss rolls and
    // only the rank scaling differs.
    for (let i = 0; i < 4; i++) {
      c.cooldown = 0; c.sp = stats(c).sp;
      assert.equal(command(s, { type: 'skill', ids: ['c1'] }), null);
    }
    const hit = mobs.filter(m => m.hp < 4000);
    const damage = mobs.reduce((sum, m) => sum + (4000 - m.hp), 0);
    return { state: s, hit, damage, st: stats(c) };
  };
  const low = run(1), high = run(2);
  // Area skills are capped at three targets per cast and stagger them.
  assert.ok(low.hit.length > 0 && low.hit.length <= 3);
  assert.ok(low.hit.every(m => m.timer >= 2));
  // Rank 2 is strictly stronger than rank 1 for the same adventurer.
  assert.ok(high.damage > low.damage, `${high.damage} should exceed ${low.damage}`);
  assert.ok(high.st.skillPower > low.st.skillPower);
  // Burning is applied by Magnum Break and reported as an effect with its flourish.
  const fx = low.state.effects.filter(e => e.kind === 'skill' && e.fx === 'firePillar');
  assert.ok(fx.length > 0, 'the Magnum Break flourish travels with the effect record');
  assert.ok(low.hit.some(m => m.statuses.burning));
});

test('healing skills restore the most wounded ally once per cooldown', () => {
  const s = createGame(), [healer, ally] = s.characters;
  Object.assign(healer, { job: 'acolyte', jobLevel: 12, skills: { heal: 2 }, activeSkill: 'heal' });
  assert.equal(command(s, { type: 'party', ids: ['c1', 'c2'] }), null);
  assert.equal(command(s, { type: 'deploy', ids: ['c1', 'c2'], mapId: 'meadow' }), null);
  healer.x = ally.x = 0; healer.y = ally.y = 0;
  ally.hp = 30; healer.hp = stats(healer).hp;
  assert.equal(command(s, { type: 'skill', ids: ['c1'] }), null);
  assert.ok(ally.hp > 30 && ally.hp <= stats(ally).hp);
  assert.ok(s.effects.some(e => e.kind === 'heal' && e.fx === 'heal' && e.text.startsWith('+')));
  const healed = ally.hp;
  assert.ok(command(s, { type: 'skill', ids: ['c1'] }), 'the cooldown blocks an immediate second cast');
  assert.equal(ally.hp, healed);
});

test('a job change starts the new line\'s training from its signature skill', () => {
  const s = createGame(), c = s.characters[0];
  Object.assign(c, { job: 'swordsman', jobLevel: 50, skills: { bash: 3, magnum_break: 2 }, activeSkill: 'magnum_break' });
  assert.equal(command(s, { type: 'promote', ids: ['c1'], job: 'knight' }), null);
  // Knights still train Swordsman skills, so the ranks survive the promotion and
  // the new line's signature skill joins them.
  assert.deepEqual(c.skills, { bash: 3, magnum_break: 2, pierce: 1 });
  assert.equal(c.activeSkill, 'bash');
  assert.equal(stats(c).skill, 'Bash');
  assert.ok(c.activeSkills.includes('pierce'));
  assert.ok(Object.hasOwn(SKILLS, c.activeSkill));
  // The trained cast carries a flourish the renderer can draw.
  assert.ok(stats(c).skillFx);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, command, advance } from '../src/sim.js';
import { SAVE_KEY, BACKUP_KEY, encodeSave, decodeSave, saveGame, loadGame } from '../src/persistence.js';
const memory = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) }; };
test('save round-trip preserves farming assignments, parties, ownership, and progression', () => {
  const s = createGame(); command(s, { type: 'party', ids: ['c1', 'c2'] }); command(s, { type: 'deploy', ids: ['c1'], mapId: 'meadow' }); advance(s, 15);
  const loaded = decodeSave(encodeSave(s, 10000), 20000);
  assert.equal(loaded.elapsed, 10); assert.deepEqual(loaded.state, { ...s, effects: [] });
});
test('a checkpoint is replaced after settlement so elapsed time cannot be claimed twice', () => {
  const storage = memory(), s = createGame(); saveGame(storage, s, 10000);
  assert.equal(loadGame(storage, 20000).elapsed, 10); saveGame(storage, s, 20000); assert.equal(loadGame(storage, 20000).elapsed, 0);
});
test('clock rollback yields no negative elapsed time', () => assert.equal(decodeSave(encodeSave(createGame(), 30000), 20000).elapsed, 0));
test('corrupt current checkpoint recovers the previous valid checkpoint', () => {
  const storage = memory(), s = createGame(); saveGame(storage, s, 10000); saveGame(storage, s, 15000); storage.setItem(SAVE_KEY, 'broken');
  const loaded = loadGame(storage, 20000); assert.equal(loaded.elapsed, 10); assert.match(loaded.warning, /previous checkpoint/);
});
test('unrecoverable files are preserved rather than silently replaced', () => {
  const storage = memory(); storage.setItem(SAVE_KEY, 'broken'); storage.setItem(BACKUP_KEY, 'also broken');
  assert.throws(() => loadGame(storage), /Export/); assert.equal(storage.getItem(SAVE_KEY), 'broken');
});
test('malformed or future-version imported saves are rejected', () => {
  for (const mutate of [
    e => { e.version = 900; }, e => { e.state.characters[0].job = '__proto__'; },
    e => { e.state.characters[0].x = null; }, e => { e.state.characters[0].level = 1e10; },
    e => { e.state.characters[0].mapId = 'missing'; }, e => { e.state.characters[0].equipment = 'missing'; },
    e => { e.state.characters[0].order = 'missing'; }, e => { e.state.characters[0].destination = { x: 999, y: 0 }; },
    e => { e.state.characters[0].partyId = 'p900'; }, e => { e.state.maps.meadow.monsters[0].kind = 'missing'; },
    e => { e.state.inventory.materials = { fake: 4 }; }, e => { e.state.seed = -1; },
    e => { delete e.state.inventory.materials; }, e => { e.state.nextId = 1; },
  ]) { const e = JSON.parse(encodeSave(createGame())); mutate(e); assert.throws(() => decodeSave(JSON.stringify(e))); }
});
test('a new browser starts fresh without manufacturing offline time', () => {
  const loaded = loadGame(memory()); assert.equal(loaded.fresh, true); assert.equal(loaded.elapsed, 0);
});
test('legacy schema-v1 saves receive preset defaults and customized tactics round-trip', () => {
  const envelope = JSON.parse(encodeSave(createGame(), 1000));
  for (const c of envelope.state.characters) delete c.tactics;
  const old = decodeSave(JSON.stringify(envelope), 1000).state;
  assert.deepEqual(old.characters[0].tactics, { autoSkill: true, healAt: 0.65, potionAt: 0.45, retreatAt: 0.22, targetPref: 'leader' });
  command(old, { type: 'tactic-config', ids: ['c1'], key: 'potionAt', value: 0.7 });
  assert.equal(decodeSave(encodeSave(old, 2000), 2000).state.characters[0].tactics.potionAt, 0.7);
});
test('older v1 saves receive backward-compatible expedition-goal progress', () => {
  const envelope = JSON.parse(encodeSave(createGame(), 1000));
  delete envelope.state.milestones.expeditionStep;
  const loaded = decodeSave(JSON.stringify(envelope), 1000).state;
  assert.equal(loaded.milestones.expeditionStep, 0);
  loaded.milestones.expeditionStep = 4;
  assert.equal(decodeSave(encodeSave(loaded, 1000), 1000).state.milestones.expeditionStep, 4);
});
test('invalid saved tactics are rejected rather than trusted at the simulation boundary', () => {
  for (const edit of [c => c.tactics = { autoSkill: 'yes' }, c => c.tactics = { autoSkill: true, healAt: 2, potionAt: 0.4, retreatAt: 0.2, targetPref: 'nearest' }, c => c.tactics = { autoSkill: true, healAt: 0.5, potionAt: 0.4, retreatAt: 0.2, targetPref: 'cheat' }]) {
    const envelope = JSON.parse(encodeSave(createGame())); edit(envelope.state.characters[0]);
    assert.throws(() => decodeSave(JSON.stringify(envelope)));
  }
});

test('pre-Dunes guilds gain a populated field with unique ids and empty card storage', () => {
  const s = createGame();
  delete s.maps.morroc; delete s.inventory.cards; delete s.inventory.socketed;
  const restored = decodeSave(encodeSave(s)).state;
  assert.equal(restored.maps.morroc.monsters.length,8);
  assert.deepEqual(restored.inventory.cards,{});
  assert.deepEqual(decodeSave(encodeSave(restored)).state,restored);
});

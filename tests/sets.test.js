// Gear sets are real Ragnarok Online item combinations, so these tests hold the project to
// the upstream data rather than to a house rule: every set must be completable from this
// game's catalog and shop, every piece must sit in its own slot, and the bonus must
// actually reach `stats()` only while the whole set is worn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GEAR_SETS, GEAR_ITEMS, GEAR_SHOP, GEAR_SLOTS, gearSetsFor, gearSetOf } from '../src/data.js';
import { character, stats, activeGearSets, createGame, command } from '../src/sim.js';

const byRo = new Map(Object.entries(GEAR_ITEMS).map(([key, item]) => [item.roId, { key, item }]));
const pieceKey = roId => byRo.get(Number(roId))?.key;

test('every gear set is a real catalogue combination that the merchant can supply', () => {
  assert.ok(GEAR_SETS.length >= 4, 'the catalog carries real item combinations');
  for (const set of GEAR_SETS) {
    assert.ok(set.items.length >= 2, `${set.id} combines at least two items`);
    const slots = [];
    for (const roId of set.items) {
      const piece = byRo.get(Number(roId));
      assert.ok(piece, `${set.id} piece ${roId} is in the catalog`);
      assert.ok(GEAR_SHOP.includes(piece.key), `${set.id} piece ${roId} is buyable from the merchant`);
      slots.push(piece.item.slot);
    }
    // Two weapons (or two chest pieces) cannot be worn at once, so such a "set" could
    // never complete — the generator drops those, and this keeps it dropped.
    assert.equal(new Set(slots).size, slots.length, `${set.id} pieces occupy distinct slots`);
    assert.deepEqual(slots.sort(), [...set.slots].sort(), `${set.id} records the real slots`);
    assert.ok(Object.keys(set.bonus).length, `${set.id} carries a bonus this game can apply`);
    assert.ok(!Object.hasOwn(set, 'unmodelled'), `${set.id} is not a partially modelled bonus`);
  }
});

test('set lookup is by piece and by worn combination', () => {
  const set = GEAR_SETS[0];
  const key = pieceKey(set.items[0]);
  assert.ok(gearSetsFor(GEAR_ITEMS[key].roId).some(entry => entry.id === set.id), 'a piece reports its sets');
  assert.deepEqual(gearSetOf(set.items.map(Number)), [set], 'all pieces together complete the set');
  assert.deepEqual(gearSetOf(set.items.slice(1).map(Number)), [], 'a missing piece completes nothing');
  assert.deepEqual(gearSetsFor(-1), [], 'unknown items belong to no set');
});

test('a completed set applies its bonus and an incomplete one does not', () => {
  for (const set of GEAR_SETS) {
    if (set.requires?.length) continue; // gated bonuses are checked by the refinement test
    const c = character(1, 'Tester');
    c.job = 'knight';
    c.level = 60;
    const keys = set.items.map(pieceKey);
    for (const key of keys) {
      const item = GEAR_ITEMS[key];
      c.gear[item.slot] = { uid: `u_${key}`, itemId: key, refine: 0, affixes: [] };
    }
    assert.deepEqual(activeGearSets(c).map(entry => entry.id), [set.id], `${set.id} activates when worn`);
    const worn = stats(c);
    delete c.gear[GEAR_ITEMS[keys.at(-1)].slot];
    const alone = stats(c);
    assert.deepEqual(activeGearSets(c), [], `${set.id} deactivates when a piece comes off`);
    const changed = Object.keys(worn).filter(key => typeof worn[key] === 'number' && worn[key] !== alone[key]);
    assert.ok(changed.length, `${set.id} changes at least one stat`);
  }
});

test('a refinement gate on a set is honoured', () => {
  const gated = GEAR_SETS.find(set => set.requires?.some(rule => rule.on === 'Refine'));
  if (!gated) return; // no gated sets in this snapshot of the data
  const rule = gated.requires.find(entry => entry.on === 'Refine');
  const c = character(1, 'Refiner');
  c.job = 'knight';
  c.level = 99;
  for (const roId of gated.items) {
    const key = pieceKey(roId);
    const item = GEAR_ITEMS[key];
    c.gear[item.slot] = { uid: `u_${key}`, itemId: key, refine: 0, affixes: [] };
  }
  assert.deepEqual(activeGearSets(c), [], `${gated.id} needs ${rule.slot} at +${rule.value}`);
  c.gear[rule.slot].refine = rule.value;
  assert.deepEqual(activeGearSets(c).map(set => set.id), [gated.id], 'the gate opens at the required rank');
});

test('set slots are real equipment slots and bonuses only use modelled stats', () => {
  for (const set of GEAR_SETS) {
    for (const slot of set.slots) assert.ok(Object.hasOwn(GEAR_SLOTS, slot), `${set.id} uses a real slot`);
    for (const [stat, value] of Object.entries(set.bonus)) {
      assert.equal(typeof value, 'number', `${set.id} ${stat} is numeric`);
      assert.ok(Number.isFinite(value) && value !== 0, `${set.id} ${stat} is a real amount`);
    }
  }
});

test('a set can be bought at the merchant and equipped through the command boundary', () => {
  const set = GEAR_SETS.find(entry => !entry.requires?.length);
  const s = createGame(20261128);
  const c = s.characters[0];
  c.job = 'knight';
  c.level = 99;
  s.inventory.zeny = 1_000_000;
  for (const roId of set.items) {
    const key = pieceKey(roId);
    assert.ok(GEAR_SHOP.includes(key), `${key} is merchant stock`);
    assert.equal(command(s, { type: 'gear-buy', item: key, id: c.id }), null, `buy ${key}`);
  }
  for (const roId of set.items) {
    const key = pieceKey(roId);
    const instance = s.inventory.gearItems.find(entry => entry.itemId === key);
    const slot = GEAR_ITEMS[key].slot;
    assert.equal(command(s, { type: 'gear-equip', slot, item: key, uid: instance.uid, ids: [c.id] }), null,
      `equip ${key}`);
  }
  assert.deepEqual(activeGearSets(c).map(entry => entry.id), [set.id], 'the worn combination activates');
  // Compare a stat the set actually moves; the shipped bonuses touch different stats.
  const before = stats(c);
  assert.equal(command(s, { type: 'gear-unequip', slot: set.slots.at(-1), ids: [c.id] }), null);
  assert.deepEqual(activeGearSets(c), [], 'removing a piece deactivates the set');
  const after = stats(c);
  assert.ok(Object.keys(after).some(key => typeof after[key] === 'number' && after[key] !== before[key]),
    'the bonus leaves with the set');
});

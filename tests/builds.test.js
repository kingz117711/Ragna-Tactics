import test from 'node:test';
import assert from 'node:assert/strict';
import { command, stats, tick, createGame } from '../src/sim.js';
import { classBuilds } from '../src/data.js';
import { encodeSave, decodeSave } from '../src/persistence.js';

function preparedCharacter(state, job) {
  const c = state.characters[0];
  c.job = job;
  c.jobLevel = 50;
  c.buildId = classBuilds(job)[0]?.id || null;
  c.mapId = null;
  c.status = 'camp';
  return c;
}

test('build choices are validated, persisted, and restored for migrated saves', () => {
  const state = createGame(89);
  const c = preparedCharacter(state, 'sniper');
  const alternative = classBuilds('sniper').find(build => build.id !== c.buildId);
  assert.equal(command(state, { type:'build', ids:[c.id], buildId:alternative.id }), null);
  assert.equal(c.buildId, alternative.id);
  assert.match(command(state, { type:'build', ids:[c.id], buildId:'not-a-build' }), /available/);
  const restored = decodeSave(encodeSave(state), 1000).state;
  assert.equal(restored.characters[0].buildId, alternative.id);
  assert.equal(classBuilds('sura').length, 5);
});

test('selected builds change the skill presentation and enable a distinct trap rotation', () => {
  const state = createGame(123);
  const c = preparedCharacter(state, 'sniper');
  const auto = classBuilds('sniper').find(build => build.id === 'sniper-auto');
  const traps = classBuilds('sniper').find(build => build.id === 'sniper-traps');
  c.buildId = auto.id;
  const autoSkill = stats(c).skill;
  c.buildId = traps.id;
  assert.notEqual(stats(c).skill, autoSkill);
  c.mapId = 'meadow'; c.hp = stats(c).hp; c.sp = stats(c).sp;
  state.maps.meadow.monsters.forEach((monster, i) => { monster.x = i < 3 ? i * 0.4 : 20; monster.y = 0; monster.hp = 1000; monster.respawn = 0; });
  c.x = -7; c.y = 0; c.home = { x:-7, y:0 }; c.cooldown = 0; c.targetId = state.maps.meadow.monsters[0].id;
  const before = state.maps.meadow.monsters.slice(0, 3).map(monster => monster.hp);
  for (let i = 0; i < 25; i++) tick(state, 0.1);
  assert.ok(state.maps.meadow.monsters[1].hp < before[1], 'trap-zone skills should splash clustered enemies');
  assert.ok(state.maps.meadow.monsters[0].statuses.slow.remaining > 0, 'traps should apply a real speed-debuff status');
});

test('control rotations persist statuses and poison deals damage over time', () => {
  const state = createGame(701);
  const c = preparedCharacter(state, 'thief');
  c.buildId = classBuilds('thief').find(build => build.rotation === 'rapid-poison').id;
  c.mapId = 'meadow'; c.status = 'fighting'; c.x = 0; c.y = 0; c.home = { x:0, y:0 }; c.order = 'focus'; c.hp = stats(c).hp; c.sp = stats(c).sp;
  const target = state.maps.meadow.monsters[0];
  Object.assign(target, { x:1.4, y:0, hp:500, respawn:0, targetId:null, statuses:{} });
  c.targetId = target.id;
  assert.equal(command(state, { type:'skill', ids:[c.id] }), null);
  assert.ok(target.statuses.poison?.remaining > 0);
  const hp = target.hp;
  tick(state, 1);
  assert.ok(target.hp < hp, 'poison should deal periodic damage while active');
  const restored = decodeSave(encodeSave(state), 1000).state;
  assert.ok(restored.maps.meadow.monsters[0].statuses.poison);
});

test('support builds heal the party and give a timed attack buff when allies are healthy', () => {
  const state = createGame(456);
  const healer = preparedCharacter(state, 'archBishop');
  const ally = state.characters[1]; ally.job = 'ranger'; ally.level = 20; ally.buildId = classBuilds('ranger')[0].id;
  healer.partyId = ally.partyId = 'p1'; state.parties.push({ id:'p1', name:'Test party', leaderId:healer.id });
  healer.mapId = ally.mapId = 'meadow'; healer.x = 0; healer.y = 0; ally.x = 1; ally.y = 0;
  healer.hp = stats(healer).hp; ally.hp = stats(ally).hp * 0.5;
  healer.buildId = classBuilds('archBishop')[0].id;
  tick(state, 0.1);
  assert.ok(ally.hp > stats(ally).hp * 0.5, 'support build should heal an injured ally');
  ally.hp = stats(ally).hp;
  healer.cooldown = 0; healer.sp = stats(healer).sp; healer.attackTimer = 0;
  tick(state, 0.1);
  assert.ok(ally.buffTimer > 0, 'support build should buff healthy party members');
  assert.ok(stats(ally).atk > 0);
});

test('automatic spell casts have cast time and incoming hits interrupt them', () => {
  const state = createGame(777);
  const c = preparedCharacter(state, 'wizard');
  const target = state.maps.meadow.monsters[0];
  c.buildId = classBuilds('wizard').find(build => build.id === 'wizard-storm').id;
  c.mapId = 'meadow'; c.status = 'fighting'; c.order = 'focus'; c.x = -4.8; c.y = 0; c.home = { x:-4.8, y:0 };
  c.hp = stats(c).hp; c.sp = stats(c).sp; c.targetId = target.id;
  Object.assign(target, { kind:'skeleton', x:-0.2, y:0, hp:1000, timer:0, targetId:c.id, statuses:{} });
  assert.ok(stats(c).castTime > 1);
  tick(state, 0.1);
  assert.equal(c.cast, null, 'the skeleton hit should interrupt the cast');
  assert.ok(state.effects.some(effect => effect.text === 'Interrupted!'));
  assert.ok(c.cooldown > 0);
});

test('pending casts survive saves and saved cast targets must exist on the same field', () => {
  const state = createGame(778);
  const c = preparedCharacter(state, 'wizard');
  const target = state.maps.meadow.monsters[0];
  c.buildId = classBuilds('wizard').find(build => build.id === 'wizard-storm').id;
  c.mapId = 'meadow'; c.status = 'fighting'; c.order = 'focus'; c.x = -4.8; c.y = 0; c.home = { x:-4.8, y:0 };
  c.hp = stats(c).hp; c.sp = stats(c).sp; c.targetId = target.id;
  Object.assign(target, { kind:'skeleton', x:-0.2, y:0, hp:1000, timer:5, targetId:c.id, statuses:{} });
  tick(state, 0.1);
  assert.ok(c.cast?.remaining > 0, 'cast should still be pending before save');
  const restored = decodeSave(encodeSave(state), 1000).state;
  assert.deepEqual(restored.characters[0].cast, c.cast);
  const envelope = JSON.parse(encodeSave(state));
  envelope.state.characters[0].cast.targetId = 'm999';
  assert.throws(() => decodeSave(JSON.stringify(envelope)), /save is invalid or uses an unsupported format/);
});

test('high DEX improves hit and high AGI improves flee', () => {
  const c = preparedCharacter(createGame(91), 'sniper');
  const base = stats(c);
  c.attributes = { dex: 80, agi: 80 };
  const trained = stats(c);
  assert.ok(trained.hit > base.hit);
  assert.ok(trained.flee > base.flee);
});

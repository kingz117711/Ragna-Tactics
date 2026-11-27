// Pure, serializable simulation. No DOM, storage, wall clock, or camera dependencies.
import { VERSION, MAPS, JOBS, MONSTERS, EQUIPMENT, TACTICS, STEP, OFFLINE_CAP, baseNeed, jobNeed } from './data.js';

export function random(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
export function stats(c) {
  const job = JOBS[c.job], item = EQUIPMENT[c.equipment];
  return { ...job, hp: job.hp + (c.level - 1) * 14, atk: job.atk + (c.level - 1) * 2 + item.atk,
    def: job.def + Math.floor((c.level - 1) / 3) + item.def, sp: 45 + c.level * 4 };
}
export function character(id, name, sex = 'm') {
  return { id, ownerId: 'local-player', name, sex, job: 'novice', level: 1, exp: 0, jobLevel: 1, jobExp: 0,
    hp: 100, sp: 49, mapId: null, partyId: null, x: 0, y: 0, home: { x: 0, y: 0 },
    direction: 0, stance: 'idle', status: 'camp', order: 'farm', destination: null, targetId: null,
    cooldown: 0, attackTimer: 0, attackFlash: 0, potions: 10, tactic: 'safe', equipment: 'training',
    assignment: 'balanced', kills: 0, earned: 0 };
}
export function createGame(seed = 712711) {
  const s = { version: VERSION, ownerId: 'local-player', seed, time: 0, nextId: 1, characters: [character('c1', 'Aren'), character('c2', 'Lyra', 'f')],
    parties: [], maps: {}, inventory: { zeny: 150, materials: {}, equipment: { iron: 0, guard: 0, sanctuary: 0 } },
    milestones: { bossKills: 0, forestKills: 0 }, journal: [], effects: [] };
  for (const map of Object.values(MAPS)) {
    s.maps[map.id] = { id: map.id, monsters: [], telegraph: null, bossTimer: 8, bossDefeated: false, respawn: 0 };
    for (let i = 0; i < map.count; i++) spawn(s, map.id, map.id === 'meadow' && i % 3 === 0 ? 'fabre' : map.monster);
  }
  log(s, 'Your guild begins with two Novices. Deploy them together or explore separately.');
  return s;
}
export function log(s, message) {
  s.journal.unshift({ id: s.nextId++, time: s.time, message });
  s.journal.length = Math.min(s.journal.length, 35);
}
function spawn(s, mapId, kind, position) {
  const boss = kind === 'baphomet';
  s.maps[mapId].monsters.push({ id: 'm' + s.nextId++, kind, mapId,
    x: position?.x ?? (boss ? 0 : (random(s) - 0.5) * 24), y: position?.y ?? (boss ? 0 : (random(s) - 0.5) * 24),
    hp: MONSTERS[kind].hp, timer: 1, respawn: 0, targetId: null, stance: 'idle', direction: 0, attackFlash: 0 });
}
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const partyMembers = (s, c) => c.partyId ? s.characters.filter(v => v.partyId === c.partyId) : [c];
const active = c => c.mapId && c.hp > 0 && c.status !== 'down';
function expandSelection(s, ids) {
  return s.characters.filter(c => ids.includes(c.id) || (c.partyId && s.characters.some(v => ids.includes(v.id) && v.partyId === c.partyId)));
}
function point(p) { return p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 15 && Math.abs(p.y) <= 15; }
export function engaged(s, c) {
  return !!c.mapId && s.maps[c.mapId].monsters.some(m => m.hp > 0 && m.targetId === c.id);
}
export function rosterLimit(s) { return Math.min(5, 2 + Number(s.milestones.bossKills >= 1) + Number(s.milestones.forestKills >= 35) + Number(s.milestones.bossKills >= 3)); }
export function command(s, cmd) {
  const selected = s.characters.filter(c => cmd.ids?.includes(c.id));
  const units = expandSelection(s, cmd.ids || []);
  if (cmd.type === 'recruit') {
    if (s.characters.length >= rosterLimit(s)) return 'Complete guild milestones to unlock another slot.';
    const name = String(cmd.name || '').trim().slice(0, 20);
    if (!name) return 'Give your new Novice a name.';
    const id = 'c' + (s.characters.length + 1);
    s.characters.push(character(id, name, cmd.sex === 'f' ? 'f' : 'm'));
    log(s, name + ' joined as a Novice.'); return null;
  }
  if (!selected.length) return 'Select at least one adventurer.';
  if (cmd.type === 'party') {
    if (selected.length < 2) return 'Select at least two characters to form a party.';
    if (selected.some(c => c.mapId !== selected[0].mapId)) return 'Gather the selected characters on the same map first.';
    if (selected.some(c => engaged(s, c))) return 'Regroup after combat before changing parties.';
    for (const c of selected) c.partyId = null;
    const id = 'p' + s.nextId++;
    s.parties.push({ id, name: selected[0].name + "’s party", leaderId: selected[0].id });
    for (const c of selected) c.partyId = id;
    cleanParties(s); log(s, selected.map(c => c.name).join(' & ') + ' formed a party.'); return null;
  }
  if (cmd.type === 'split') {
    if (units.some(c => engaged(s, c))) return 'Retreat before splitting a party in combat.';
    for (const c of selected) c.partyId = null;
    cleanParties(s); return null;
  }
  if (cmd.type === 'deploy') {
    if (!Object.hasOwn(MAPS, cmd.mapId)) return 'Choose a valid destination.';
    if (units.some(c => c.hp <= 0)) return 'Recover defeated characters at camp first.';
    if (units.some(c => engaged(s, c))) return 'Use Retreat to leave an active fight.';
    if (cmd.mapId === 'arena' && units.filter(c => c.job !== 'novice').length < 2) return 'Bring at least two adventurers who have chosen their first job.';
    if (cmd.mapId === 'arena' && !s.characters.some(c => c.mapId === 'arena')) resetArena(s);
    units.forEach((c, i) => { c.mapId = cmd.mapId; c.x = -5 + i * 1.6; c.y = 8 + i % 2; c.home = { x: c.x, y: c.y };
      c.status = 'farming'; c.order = 'farm'; c.destination = null; c.targetId = null; });
    log(s, units.map(c => c.name).join(', ') + ' deployed to ' + MAPS[cmd.mapId].name + '.'); return null;
  }
  if (cmd.type === 'promote') {
    if (selected.length !== 1) return 'Choose one Novice to advance.';
    const c = selected[0];
    if (c.mapId) return 'Return to camp to choose a job.';
    if (c.job !== 'novice' || c.jobLevel < 10) return 'Reach Novice Job Lv. 10 first.';
    if (!Object.hasOwn(JOBS, cmd.job) || cmd.job === 'novice') return 'Choose a first job.';
    c.job = cmd.job; c.jobLevel = 1; c.jobExp = 0; c.hp = stats(c).hp; c.sp = stats(c).sp;
    log(s, c.name + ' became a ' + JOBS[c.job].name + '!'); return null;
  }
  if (cmd.type === 'rename') {
    const name = String(cmd.name || '').trim().slice(0, 20);
    if (selected.length !== 1 || !name) return 'Choose one character and enter a name.';
    selected[0].name = name; return null;
  }
  if (cmd.type === 'recover') {
    const camp = units.filter(c => !c.mapId);
    if (!camp.length) return 'Return to camp before recovering.';
    for (const c of camp) { c.hp = stats(c).hp; c.sp = stats(c).sp; c.status = 'camp'; c.order = 'farm'; }
    return null;
  }
  if (cmd.type === 'resupply') {
    if (units.some(c => c.mapId)) return 'Buy supplies at camp.';
    const count = units.reduce((n, c) => n + Math.max(0, 10 - c.potions), 0), cost = count * 2;
    if (!count) return 'Everyone already has ten potions.';
    if (s.inventory.zeny < cost) return `You need ${cost} Zeny to refill this selection.`;
    s.inventory.zeny -= cost; units.forEach(c => { c.potions = Math.max(c.potions, 10); }); return null;
  }
  if (cmd.type === 'equip') {
    if (selected.length !== 1 || !Object.hasOwn(EQUIPMENT, cmd.item)) return 'Choose one character and an item.';
    const c = selected[0];
    if (c.mapId) return 'Change equipment at camp.';
    if (c.equipment === cmd.item) return null;
    if (cmd.item !== 'training' && !(s.inventory.equipment[cmd.item] > 0)) return 'That item is not in storage.';
    if (c.equipment !== 'training') s.inventory.equipment[c.equipment]++;
    if (cmd.item !== 'training') s.inventory.equipment[cmd.item]--;
    c.equipment = cmd.item; c.hp = Math.min(c.hp, stats(c).hp); return null;
  }
  if (cmd.type === 'tactic') {
    if (!Object.hasOwn(TACTICS, cmd.tactic)) return 'Unknown tactic.';
    selected.forEach(c => { c.tactic = cmd.tactic; }); return null;
  }
  if (cmd.type === 'assignment') {
    if (!['balanced', 'experience', 'materials'].includes(cmd.assignment)) return 'Unknown assignment.';
    selected.forEach(c => { c.assignment = cmd.assignment; }); return null;
  }
  if (cmd.type === 'skill') {
    let cast = false;
    selected.forEach(c => { if (active(c) && useSkill(s, c, s.maps[c.mapId].monsters.find(m => m.id === c.targetId && m.hp > 0), true)) cast = true; });
    return cast ? null : 'Skill needs SP, a ready cooldown, and a valid target in range (or missing HP).';
  }
  if (!['move', 'hold', 'resume', 'focus', 'retreat'].includes(cmd.type)) return 'Unknown command.';
  if (['move', 'hold'].includes(cmd.type) && cmd.point && !point(cmd.point)) return 'Choose a point inside the battlefield.';
  const deployed = units.filter(active);
  if (!deployed.length) return 'Deploy your selection first.';
  if (cmd.type === 'focus' && !deployed.some(c => s.maps[c.mapId].monsters.some(m => m.id === cmd.targetId && m.hp > 0))) return 'Choose a living enemy on this map.';
  deployed.forEach((c, i) => {
    if (cmd.type === 'retreat') { c.order = 'retreat'; c.status = 'retreating'; c.destination = { x: -11, y: 13 }; }
    else if (cmd.type === 'move') { if (!cmd.point) return; c.order = 'move'; c.destination = { x: Math.min(15, cmd.point.x + i * 0.8), y: cmd.point.y }; c.targetId = null; }
    else if (cmd.type === 'hold') { c.order = 'hold'; c.home = cmd.point ? { ...cmd.point } : { x: c.x, y: c.y }; c.destination = null; c.targetId = null; }
    else if (cmd.type === 'resume') { c.order = 'farm'; c.destination = null; c.targetId = null; }
    else if (cmd.type === 'focus' && s.maps[c.mapId].monsters.some(m => m.id === cmd.targetId)) { c.order = 'focus'; c.targetId = cmd.targetId; }
  });
  return null;
}
function cleanParties(s) {
  s.parties = s.parties.filter(p => {
    const members = s.characters.filter(c => c.partyId === p.id);
    if (members.length < 2) { members.forEach(c => { c.partyId = null; }); return false; }
    if (!members.some(c => c.id === p.leaderId)) p.leaderId = members[0].id;
    return true;
  });
}
function resetArena(s) {
  const map = s.maps.arena; map.monsters = []; map.telegraph = null; map.bossTimer = 8; map.bossDefeated = false;
  spawn(s, 'arena', 'baphomet');
}
function face(c, target) {
  const dx = target.x - c.x, dy = target.y - c.y;
  if (Math.abs(dx) + Math.abs(dy) < 0.001) return;
  const sx = dx - dy, sy = (dx + dy) * 0.5;
  // Native RO actions run counterclockwise from south.
  c.direction = ((Math.round(Math.atan2(-sx, sy) / (Math.PI / 4)) % 8) + 8) % 8;
}
function move(c, target, speed, dt) {
  const d = distance(c, target);
  if (d < 0.1) { c.stance = 'idle'; return true; }
  const dx = target.x - c.x, dy = target.y - c.y, n = Math.min(d, speed * dt);
  face(c, target);
  c.x += dx / d * n; c.y += dy / d * n;
  c.stance = 'walk'; return n >= d;
}
function effect(s, mapId, x, y, text, kind = 'hit') {
  s.effects.push({ id: s.nextId++, mapId, x, y, text, kind, life: 1.1 });
  if (s.effects.length > 70) s.effects.shift();
}
export function gainExp(s, c, exp, jobExp) {
  c.exp += exp; c.jobExp += jobExp;
  while (c.level < 99 && c.exp >= baseNeed(c.level)) { c.exp -= baseNeed(c.level); c.level++; c.hp = stats(c).hp; c.sp = stats(c).sp; log(s, `${c.name} reached Base Lv. ${c.level}.`); }
  const cap = c.job === 'novice' ? 10 : 50;
  while (c.jobLevel < cap && c.jobExp >= jobNeed(c.jobLevel)) { c.jobExp -= jobNeed(c.jobLevel); c.jobLevel++; }
  if (c.jobLevel >= cap) c.jobExp = Math.min(c.jobExp, jobNeed(cap));
}
function kill(s, m, killer) {
  if (m.rewarded) return;
  m.hp = 0; m.rewarded = true; m.respawn = 6 + random(s) * 4;
  const def = MONSTERS[m.kind];
  const recipients = partyMembers(s, killer).filter(c => active(c) && c.mapId === m.mapId && distance(c, killer) < 18);
  const share = (recipients.length > 1 ? 1.12 : 1) / recipients.length;
  for (const c of recipients) { gainExp(s, c, def.exp * share * (c.assignment === 'experience' ? 1.15 : 1), def.jobExp * share); c.kills++; c.earned += def.zeny / recipients.length; }
  s.inventory.zeny += def.zeny;
  s.inventory.materials[def.material] = (s.inventory.materials[def.material] || 0) + (killer.assignment === 'materials' ? 2 : 1);
  if (random(s) < 0.035) { const item = random(s) < 0.6 ? 'iron' : 'guard'; s.inventory.equipment[item]++; log(s, `${def.name} dropped ${EQUIPMENT[item].name}.`); }
  if (m.mapId === 'forest') s.milestones.forestKills++;
  if (m.kind === 'baphomet') {
    s.milestones.bossKills++; s.inventory.equipment.sanctuary++; s.maps.arena.bossDefeated = true;
    s.maps.arena.telegraph = null;
    log(s, 'Baphomet defeated! A Sanctuary relic is in storage. Check your guild milestones.');
  }
  effect(s, m.mapId, m.x, m.y, '+' + def.zeny + 'z', 'loot');
}
function damage(s, c, m, value) {
  if (!m || m.hp <= 0) return;
  const dealt = Math.max(1, Math.round(value - MONSTERS[m.kind].def));
  m.hp -= dealt; m.targetId = c.id; effect(s, m.mapId, m.x, m.y, String(dealt));
  if (m.hp <= 0) kill(s, m, c);
}
function useSkill(s, c, target, manual = false) {
  const st = stats(c);
  if (c.cooldown > 0 || c.sp < st.cost) return false;
  if (c.job === 'novice' || c.job === 'acolyte') {
    const allies = c.job === 'novice' ? [c] : partyMembers(s, c).filter(v => active(v) && v.mapId === c.mapId && distance(v, c) <= 8);
    const injured = allies.filter(v => v.hp < stats(v).hp * (manual ? 1 : 0.65)).sort((a, b) => a.hp / stats(a).hp - b.hp / stats(b).hp)[0];
    if (!injured) return false;
    const amount = Math.min(stats(injured).hp - injured.hp, c.job === 'novice' ? 28 : 45 + c.level * 5);
    injured.hp += amount; effect(s, c.mapId, injured.x, injured.y, '+' + Math.round(amount), 'heal');
  } else {
    if (!target || distance(c, target) > st.range + 0.5) return false;
    damage(s, c, target, st.atk * (c.job === 'mage' ? 2.4 : 2));
    if (c.job === 'mage') for (const m of s.maps[c.mapId].monsters) if (m !== target && m.hp > 0 && distance(m, target) < 3) damage(s, c, m, st.atk * 1.4);
    if (c.job === 'swordsman') for (const m of s.maps[c.mapId].monsters) if (m.hp > 0 && distance(m, c) < 5) m.targetId = c.id;
  }
  c.sp -= st.cost; c.cooldown = st.cooldown; c.attackFlash = 0.5; c.stance = 'attack';
  effect(s, c.mapId, c.x, c.y, st.skill, 'skill'); return true;
}
function tickCharacter(s, c, dt) {
  c.attackFlash = Math.max(0, c.attackFlash - dt); c.cooldown = Math.max(0, c.cooldown - dt); c.attackTimer = Math.max(0, c.attackTimer - dt);
  const st = stats(c);
  if (!c.mapId) { c.stance = 'idle'; if (c.status !== 'down') { c.hp = Math.min(st.hp, c.hp + 12 * dt); c.sp = Math.min(st.sp, c.sp + 8 * dt); } return; }
  if (c.hp <= 0) { log(s, c.name + ' fell and returned to camp. Recover before redeploying.'); c.hp = 0; c.mapId = null; c.status = 'down'; c.targetId = null; c.destination = null; return; }
  c.sp = Math.min(st.sp, c.sp + 0.9 * dt);
  if (c.hp < st.hp * 0.45 && c.potions > 0) { c.hp = Math.min(st.hp, c.hp + 65); c.potions--; effect(s, c.mapId, c.x, c.y, '+Potion', 'heal'); }
  if (c.hp / st.hp < TACTICS[c.tactic].retreat && c.potions === 0 && c.order !== 'retreat') {
    c.order = 'retreat'; c.destination = { x: -11, y: 13 }; log(s, c.name + ' is retreating: HP low, no potions.');
  }
  if (c.order === 'retreat') {
    c.status = 'retreating';
    if (move(c, c.destination || { x: -11, y: 13 }, st.speed * 1.3, dt)) { c.mapId = null; c.status = 'camp'; c.order = 'farm'; c.targetId = null; c.destination = null; log(s, c.name + ' returned safely to camp.'); }
    return;
  }
  if (c.order === 'move') {
    c.status = 'moving';
    if (!c.destination || move(c, c.destination, st.speed, dt)) { c.order = 'hold'; c.home = { x: c.x, y: c.y }; c.destination = null; }
    return;
  }
  const map = s.maps[c.mapId];
  if (TACTICS[c.tactic].skill) useSkill(s, c, null);
  let target = map.monsters.find(m => m.id === c.targetId && m.hp > 0);
  if (target && c.order === 'hold' && distance(target, c.home) > st.range + 2) target = null;
  const leader = c.partyId && s.characters.find(v => v.id === s.parties.find(p => p.id === c.partyId)?.leaderId);
  if (!target && leader && leader !== c && active(leader) && leader.mapId === c.mapId && c.order === 'farm') target = map.monsters.find(m => m.id === leader.targetId && m.hp > 0);
  if (!target) {
    const candidates = map.monsters.filter(m => m.hp > 0 && distance(m, c.home) <= (c.order === 'hold' ? st.range + 2 : 20));
    target = candidates.sort((a, b) => distance(c, a) - distance(c, b))[0];
  }
  c.targetId = target?.id || null;
  if (!target) {
    c.status = c.order === 'hold' ? 'holding' : 'searching'; c.stance = 'idle';
    if (leader && leader !== c && leader.mapId === c.mapId && distance(c, leader) > 4 && c.order === 'farm') move(c, leader, st.speed, dt);
    return;
  }
  const d = distance(c, target);
  if (d > st.range) { c.status = 'moving'; move(c, target, st.speed, dt); return; }
  c.status = 'fighting'; c.stance = c.attackFlash > 0 ? 'attack' : 'idle';
  face(c, target);
  if (TACTICS[c.tactic].skill) useSkill(s, c, target);
  if (target.hp > 0 && c.attackTimer <= 0) {
    c.attackTimer = st.interval; c.attackFlash = 0.4; c.stance = 'attack';
    damage(s, c, target, st.atk * (0.9 + random(s) * 0.2));
  }
}
function tickMonster(s, map, m, dt) {
  m.attackFlash = Math.max(0, m.attackFlash - dt);
  if (m.hp <= 0) {
    if (map.id === 'arena') return;
    m.respawn -= dt;
    if (m.respawn <= 0) { const def = MONSTERS[m.kind]; m.x = (random(s) - 0.5) * 24; m.y = (random(s) - 0.5) * 24; m.hp = def.hp; m.rewarded = false; m.targetId = null; }
    return;
  }
  const def = MONSTERS[m.kind];
  let target = s.characters.find(c => c.id === m.targetId && active(c) && c.mapId === map.id && distance(c, m) < 20);
  if (!target) {
    const nearby = s.characters.filter(c => active(c) && c.mapId === map.id && distance(c, m) < (map.id === 'arena' ? 25 : 3.5));
    target = nearby.sort((a, b) => distance(a, m) - distance(b, m))[0];
  }
  m.targetId = target?.id || null; m.stance = 'idle';
  if (!target) return;
  m.timer -= dt;
  if (distance(m, target) > def.range) { move(m, target, def.speed, dt); return; }
  face(m, target);
  if (m.timer <= 0) { m.timer = def.interval; target.hp = Math.max(0, target.hp - Math.max(1, def.atk - stats(target).def)); m.stance = 'attack'; m.attackFlash = 0.4; }
}
function tickBoss(s, dt) {
  const map = s.maps.arena;
  if (map.bossDefeated) return;
  const fighters = s.characters.filter(c => active(c) && c.mapId === 'arena');
  if (!fighters.length) { map.telegraph = null; return; }
  if (map.telegraph) {
    map.telegraph.remaining -= dt;
    if (map.telegraph.remaining <= 0) {
      const t = map.telegraph;
      for (const c of fighters) if (distance(c, t) < t.radius) { c.hp = Math.max(0, c.hp - 50); effect(s, 'arena', c.x, c.y, '50', 'danger'); }
      effect(s, 'arena', t.x, t.y, 'Dark Cross', 'danger'); map.telegraph = null;
    }
  }
  map.bossTimer -= dt;
  if (map.bossTimer <= 0) {
    const target = fighters[Math.floor(random(s) * fighters.length)];
    map.telegraph = { x: target.x, y: target.y, radius: 4, remaining: 2.5, duration: 2.5 };
    map.bossTimer = 10;
    if (map.monsters.filter(m => m.kind === 'willow' && m.hp > 0).length < 2) spawn(s, 'arena', 'willow', { x: -4, y: -4 });
  }
}
export function tick(s, dt = STEP, { offline = false, effects = true } = {}) {
  s.time += dt;
  if (effects) { for (const e of s.effects) e.life -= dt; s.effects = s.effects.filter(e => e.life > 0); } else s.effects = [];
  for (const c of s.characters) tickCharacter(s, c, dt);
  for (const map of Object.values(s.maps)) {
    if (offline && map.id === 'arena') continue;
    // Defeated field monsters still respawn, including on maps without a viewer.
    for (const m of map.monsters) tickMonster(s, map, m, dt);
  }
  if (!offline) tickBoss(s, dt);
  if (!effects) s.effects = [];
}
export function advance(s, seconds, options) {
  let remaining = seconds;
  while (remaining > 1e-8) { const dt = Math.min(STEP, remaining); tick(s, dt, options); remaining -= dt; }
  return s;
}
export function settleOffline(s, elapsedSeconds) {
  const seconds = Math.min(OFFLINE_CAP, Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0));
  const before = { zeny: s.inventory.zeny, kills: s.characters.reduce((n, c) => n + c.kills, 0), levels: s.characters.map(c => ({ id: c.id, level: c.level, jobLevel: c.jobLevel, potions: c.potions })) };
  // Bosses require active play. Returning disconnects the expedition without rewards.
  for (const c of s.characters) if (c.mapId === 'arena') { c.mapId = null; c.status = c.hp > 0 ? 'camp' : 'down'; c.targetId = null; c.order = 'farm'; c.destination = null; }
  if (seconds > 0) advance(s, seconds, { offline: true, effects: false });
  const report = { seconds, capped: elapsedSeconds > OFFLINE_CAP, zeny: s.inventory.zeny - before.zeny,
    kills: s.characters.reduce((n, c) => n + c.kills, 0) - before.kills,
    characters: s.characters.map(c => ({ name: c.name, levels: c.level - before.levels.find(v => v.id === c.id).level,
      jobLevels: c.jobLevel - before.levels.find(v => v.id === c.id).jobLevel,
      potions: before.levels.find(v => v.id === c.id).potions - c.potions, status: c.status })) };
  if (seconds >= 30) log(s, `Away report: ${report.kills} kills, ${report.zeny} Zeny earned.`);
  return report;
}

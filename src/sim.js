// Pure, serializable simulation. No DOM, storage, wall clock, or camera dependencies.
import { combatJob, REFINEMENT, gearKey, ELEMENTS, affinityMultiplier, spellElement, BOUNTIES, ATTRIBUTES, ATTRIBUTE_CAP, CARDS, FORGE, jobChoices, promotionLevel, HUNT_RADII, DEFAULT_HUNT_RADIUS, VERSION, MAPS, JOBS, MONSTERS, EQUIPMENT, TACTICS, TACTIC_PRESETS, TARGET_PREFS, JOB_ROLES, STEP, OFFLINE_CAP, baseNeed, jobNeed } from './data.js';

export function random(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
export function availablePoints(c) {
  return 2 * (c.level - 1) - Object.values(c.attributes || {}).reduce((sum, points) => sum + points, 0);
}
export function stats(c) {
  const job = JOBS[c.job], item = EQUIPMENT[c.equipment];
  const { str = 0, vit = 0, agi = 0, int = 0, dex = 0, luk = 0 } = c.attributes || {};
  const element = spellElement(c);
  const spell = element ? ELEMENTS[element][combatJob(c.job)] : job.skill;
  return { ...job, element, skill: spell, interval: job.interval / (1 + agi / 100), skillBonus: dex * 2, crit: luk / 100, regen: 0.9 + int * 0.025,
    hp: job.hp + (c.level - 1) * 14 + vit * 10, atk: job.atk + (c.level - 1) * 2 + item.atk + 2 * (c.refine || 0) + str * 2 + (CARDS[c.card]?.atk || 0),
    def: job.def + Math.floor((c.level - 1) / 3) + item.def + (c.refine || 0) + Math.floor(vit / 3) + (CARDS[c.card]?.def || 0), sp: 45 + c.level * 4 + int * 4 };
}
export function character(id, name, sex = 'm') {
  return { id, ownerId: 'local-player', name, sex, job: 'novice', level: 1, exp: 0, jobLevel: 1, jobExp: 0,
    hp: 100, sp: 49, mapId: null, partyId: null, x: 0, y: 0, home: { x: 0, y: 0 },
    direction: 0, stance: 'idle', status: 'camp', order: 'farm', destination: null, targetId: null,
    cooldown: 0, attackTimer: 0, attackFlash: 0, potions: 10, tactic: 'safe', tactics: { ...TACTIC_PRESETS.safe }, equipment: 'training',
    assignment: 'balanced', kills: 0, earned: 0 };
}
export function effectiveTactics(c) {
  const preset = TACTIC_PRESETS[c.tactic] || TACTIC_PRESETS.safe;
  return { ...preset, ...(c.tactics || {}) };
}
export function roleOf(c) { return JOB_ROLES[c.job] || 'frontline'; }
export function partyOf(s, c) { return c.partyId ? s.parties.find(p => p.id === c.partyId) || null : null; }
export function leaderOf(s, c) { const p = partyOf(s, c); return p ? s.characters.find(v => v.id === p.leaderId) || null : null; }
export function isLeader(s, c) { const p = partyOf(s, c); return !!p && p.leaderId === c.id; }
function leaderAvailable(s, c) {
  const leader = leaderOf(s, c);
  return leader && leader !== c && active(leader) && leader.mapId === c.mapId && leader.order !== 'retreat' && leader.status !== 'retreating' ? leader : null;
}
function ensureLeaders(s) {
  for (const p of s.parties) {
    const members = s.characters.filter(c => c.partyId === p.id);
    if (members.length < 2) continue;
    const leader = members.find(c => c.id === p.leaderId);
    if (!leader || !active(leader)) {
      const next = members.find(c => active(c));
      if (next && next.id !== p.leaderId) { p.leaderId = next.id; log(s, next.name + ' takes the lead of ' + p.name + '.'); }
    }
  }
}
export function createGame(seed = 712711) {
  const s = { version: VERSION, ownerId: 'local-player', seed, time: 0, nextId: 1, characters: [character('c1', 'Aren'), character('c2', 'Lyra', 'f')],
    parties: [], maps: {}, inventory: { zeny: 150, materials: {}, cards: {}, socketed: {}, equipment: { reliquary: 0, dune: 0, iron: 0, guard: 0, sanctuary: 0 } },
    milestones: { bossKills: 0, forestKills: 0, expeditionStep: 0 }, journal: [], effects: [] };
  for (const map of Object.values(MAPS)) populateField(s, map);
  log(s, 'Your guild begins with two Novices. Deploy them together or explore separately.');
  return s;
}
export function populateField(s, map) {
  s.maps[map.id] = { id: map.id, monsters: [], telegraph: null, bossTimer: 8, bossDefeated: false, respawn: 0 };
  for (let i = 0; i < map.count; i++) {
    const alternate = { meadow: 'fabre', morroc: 'peco', payon:'skeleton' }[map.id];
    spawn(s, map.id, alternate && i % 3 === 0 ? alternate : map.monster);
  }
}
export function log(s, message) {
  s.journal.unshift({ id: s.nextId++, time: s.time, message });
  s.journal.length = Math.min(s.journal.length, 35);
}
function spawn(s, mapId, kind, position) {
  const boss = MAPS[mapId].boss && kind === MAPS[mapId].monster;
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
export function advanceExpeditionGoals(s) {
  const goals = s.milestones;
  const starters = s.characters.filter(c => c.id === 'c1' || c.id === 'c2');
  const ready = starters.length === 2 && starters.every(c => c.job !== 'novice' || c.jobLevel >= 10);
  const jobChosen = starters.length === 2 && starters.every(c => c.job !== 'novice');
  const prepared = s.parties.some(p => {
    const members = s.characters.filter(c => c.partyId === p.id);
    return members.length >= 2 && members.every(c => c.potions >= 5);
  });
  const completed = [
    starters.length === 2 && starters.every(c => !!c.mapId),
    ready,
    jobChosen,
    prepared,
    goals.bossKills >= 1,
    s.characters.length >= 3,
  ];
  let step = Math.min(6, Math.max(0, Number.isInteger(goals.expeditionStep) ? goals.expeditionStep : 0));
  const previous = step;
  while (step < completed.length && completed[step]) step++;
  if (step > previous) {
    goals.expeditionStep = step;
    const notices = [
      'Both starting Novices are deployed. Keep hunting until one reaches Job Lv. 10.',
      'Both Novices are ready to choose first jobs. Return to camp to advance.',
      'Both first jobs are chosen. Form a party and check supplies before the boss.',
      'Your party is prepared. Baphomet awaits in the Broken Sanctuary.',
      'Baphomet is defeated. The guild can recruit a third Novice.',
      'A third Novice joined the guild. The expedition goals are complete.',
    ];
    for (let i = previous; i < step; i++) log(s, notices[i]);
  }
  return step;
}
export function command(s, cmd) {
  const result = applyCommand(s, cmd);
  if (result === null) advanceExpeditionGoals(s);
  return result;
}
export function forgePrice(s, item) {
  return Math.ceil(FORGE[item].zeny * (s.characters.some(c => combatJob(c.job) === 'blacksmith' && !c.mapId && c.hp > 0) ? 0.5 : 1));
}
function applyCommand(s, cmd) {
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
  if (cmd.type === 'bounty-accept') {
    if (s.bounty || !Object.hasOwn(BOUNTIES,cmd.id)) return 'Choose one available guild contract.';
    s.bounty = { id:cmd.id, kills:0 }; log(s,'Accepted ' + BOUNTIES[cmd.id].name + '.'); return null;
  }
  if (cmd.type === 'bounty-claim' || cmd.type === 'bounty-abandon') {
    if (!s.bounty || s.bounty.id !== cmd.id) return 'This contract is no longer active.';
    const bounty = BOUNTIES[cmd.id];
    if (cmd.type === 'bounty-claim') {
      if (s.bounty.kills < bounty.count) return 'Complete the hunt to claim the bounty.';
      s.inventory.zeny += bounty.zeny;
      s.inventory.equipment[bounty.item]++;
      log(s,'Bounty paid: ' + bounty.zeny + ' Zeny and ' + EQUIPMENT[bounty.item].name + '.');
    }
    s.bounty = null; return null;
  }
  if (cmd.type === 'forge') {
    if (!Object.hasOwn(FORGE, cmd.item)) return 'Unknown recipe.';
    const ingredients = Object.entries(FORGE[cmd.item].materials), price = forgePrice(s, cmd.item);
    if (s.inventory.zeny < price || ingredients.some(([id, qty]) => (s.inventory.materials[id] || 0) < qty)) return 'Gather the required materials and Zeny.';
    s.inventory.zeny -= price;
    for (const [id, qty] of ingredients) s.inventory.materials[id] -= qty;
    s.inventory.equipment[cmd.item]++;
    log(s, 'Forged ' + EQUIPMENT[cmd.item].name + '.');
    return null;
  }
  if (!selected.length) return 'Select at least one adventurer.';
  if (cmd.type === 'party') {
    if (selected.length < 2) return 'Select at least two characters to form a party.';
    if (selected.some(c => c.mapId !== selected[0].mapId)) return 'Gather the selected characters on the same map first.';
    if (selected.some(c => engaged(s, c))) return 'Regroup after combat before changing parties.';
    const external = s.characters.filter(c => c.partyId && !selected.includes(c) && selected.some(v => v.partyId === c.partyId));
    if (external.length) return 'Select every member of an existing party before regrouping.';
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
    if (MAPS[cmd.mapId].boss && units.filter(c => c.job !== 'novice').length < 2) return 'Bring at least two adventurers who have chosen their first job.';
    if (MAPS[cmd.mapId].boss && !s.characters.some(c => c.mapId === cmd.mapId)) resetArena(s, cmd.mapId);
    units.forEach((c, i) => { c.mapId = cmd.mapId; c.x = -5 + i * 1.6; c.y = 8 + i % 2; c.home = { x: c.x, y: c.y };
      delete c.farmRadius;
      delete c.farmCenter;
      c.status = 'farming'; c.order = 'farm'; c.destination = null; c.targetId = null; });
    log(s, units.map(c => c.name).join(', ') + ' deployed to ' + MAPS[cmd.mapId].name + '.'); return null;
  }
  if (cmd.type === 'promote') {
    if (selected.length !== 1) return 'Choose one Novice to advance.';
    const c = selected[0];
    if (c.mapId) return 'Return to camp to choose a job.';
    if (c.status === 'down') return 'Recover at camp before advancing.';
    if (!jobChoices(c.job).some(([id]) => id === cmd.job)) return 'Choose an available job path.';
    if (c.jobLevel < promotionLevel(c.job)) return 'Reach Job Lv. ' + promotionLevel(c.job) + ' first.';
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
    const card = cmd.card ?? null;
    if (card !== null && (!Object.hasOwn(CARDS, card) || cmd.item === 'training')) return 'Unknown socketed item.';
    const rank = cmd.rank === undefined ? 0 : cmd.rank;
    if (!Number.isInteger(rank) || rank < 0 || rank >= REFINEMENT.length || (rank && cmd.item === 'training')) return 'Invalid refinement rank.';
    if (c.equipment === cmd.item && (c.card || null) === card && (c.refine || 0) === rank) return null;
    const stock = card || rank ? s.inventory.socketed : s.inventory.equipment;
    const key = gearKey(cmd.item,card,rank);
    if (cmd.item !== 'training' && !(stock[key] > 0)) return 'That item is not in storage.';
    if (c.equipment !== 'training') {
      const oldStock = c.card || c.refine ? s.inventory.socketed : s.inventory.equipment;
      const oldKey = gearKey(c.equipment,c.card,c.refine);
      oldStock[oldKey] = (oldStock[oldKey] || 0) + 1;
    }
    if (cmd.item !== 'training') stock[key]--;
    c.equipment = cmd.item; c.card = card; c.refine = rank; c.hp = Math.min(c.hp, stats(c).hp); return null;
  }
  if (cmd.type === 'refine') {
    const c = selected[0], rank = (c.refine || 0) + 1, cost = REFINEMENT[rank];
    if (selected.length !== 1 || c.mapId || c.equipment === 'training') return 'Equip field gear at camp to refine it.';
    if (!cost || cmd.rank !== rank) return 'Select the next refinement rank.';
    if ((s.inventory.materials.Emveretarcon || 0) < cost.ore || s.inventory.zeny < cost.zeny) return 'Gather the ore and Zeny required.';
    s.inventory.materials.Emveretarcon -= cost.ore; s.inventory.zeny -= cost.zeny;
    c.refine = rank; log(s,c.name + ' refined ' + EQUIPMENT[c.equipment].name + ' to +' + rank + '.'); return null;
  }
  if (cmd.type === 'attune') {
    const c = selected[0];
    if (selected.length !== 1 || c.mapId || !(Object.hasOwn(ELEMENTS,cmd.element) && Object.hasOwn(ELEMENTS[cmd.element],combatJob(c.job)) || cmd.element === 'support' && roleOf(c) === 'support')) return 'Choose one caster and prepare an element at camp.';
    if (cmd.element === 'support') delete c.element;
    else c.element = cmd.element;
    log(s,c.name + ' prepared ' + stats(c).skill + '.'); return null;
  }
  if (cmd.type === 'allocate') {
    const c = selected[0], additions = cmd.points;
    if (selected.length !== 1 || c.mapId || !additions || typeof additions !== 'object' || Array.isArray(additions)) return 'Train one adventurer at camp.';
    const draft = { ...c.attributes };
    let total = 0;
    for (const [id, amount] of Object.entries(additions)) {
      if (!Object.hasOwn(ATTRIBUTES,id) || !Number.isSafeInteger(amount) || amount <= 0) return 'Invalid stat allocation.';
      draft[id] = (draft[id] || 0) + amount;
      if (draft[id] > ATTRIBUTE_CAP) return 'An attribute has reached its cap.';
      total += amount;
    }
    if (!total || total > availablePoints(c)) return 'Choose an allocation within your available points.';
    c.attributes = draft;
    log(s, c.name + ' trained ' + total + ' stat points at camp.'); return null;
  }
  if (cmd.type === 'socket') {
    const c = selected[0], card = cmd.card;
    if (selected.length !== 1 || c.mapId || c.equipment === 'training') return 'Equip a field armament or insignia at camp.';
    if (card !== null && (!Object.hasOwn(CARDS, card) || !(s.inventory.cards[card] > 0))) return 'That card is unavailable.';
    if (card === (c.card || null)) return 'Socket already has that configuration.';
    if (c.card) s.inventory.cards[c.card] = (s.inventory.cards[c.card] || 0) + 1;
    if (card) s.inventory.cards[card]--;
    c.card = card; return null;
  }
  if (cmd.type === 'tactic') {
    if (!Object.hasOwn(TACTICS, cmd.tactic)) return 'Unknown tactic.';
    selected.forEach(c => { c.tactic = cmd.tactic; c.tactics = { ...TACTIC_PRESETS[cmd.tactic] }; }); return null;
  }
  if (cmd.type === 'tactic-config') {
    const key = cmd.key, value = cmd.value;
    if (!['autoSkill', 'healAt', 'potionAt', 'retreatAt', 'targetPref'].includes(key)) return 'Unknown tactics setting.';
    if (key === 'autoSkill' && typeof value !== 'boolean') return 'Automatic skill use must be enabled or disabled.';
    if (['healAt', 'potionAt', 'retreatAt'].includes(key) && (!Number.isFinite(value) || value < 0 || value > 0.95)) return 'HP thresholds must be between 0% and 95%.';
    if (key === 'targetPref' && !Object.hasOwn(TARGET_PREFS, value)) return 'Choose a valid target preference.';
    selected.forEach(c => { c.tactics = { ...effectiveTactics(c), [key]: value }; }); return null;
  }
  if (cmd.type === 'leader') {
    if (selected.length !== 1 || !selected[0].partyId) return 'Select one member of a party.';
    const party = partyOf(s, selected[0]);
    if (s.characters.filter(c => c.partyId === party.id).length < 2) return 'A party needs at least two members.';
    if (selected[0].mapId && engaged(s, selected[0])) return 'Wait until combat ends before changing the leader.';
    party.leaderId = selected[0].id;
    log(s, selected[0].name + ' is now leading ' + party.name + '.'); return null;
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
  if (cmd.type === 'rally') {
    const radius = cmd.radius === undefined ? DEFAULT_HUNT_RADIUS : cmd.radius;
    if (!HUNT_RADII.includes(radius)) return 'Choose a supported hunting radius.';
    const field = s.maps[cmd.mapId];
    if (!field || MAPS[field.id].boss || !point(cmd.point)) return 'Choose a point inside a farming field.';
    const farmers = units.filter(c => active(c) && c.mapId === field.id);
    if (!farmers.length) return 'Select adventurers deployed on this field.';
    for (const c of farmers) {
      c.home = { ...cmd.point };
      c.farmCenter = { ...cmd.point };
      c.farmRadius = radius;
      c.order = 'farm';
      c.targetId = null;
      c.destination = null;
    }
    return null;
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
    else if (cmd.type === 'resume') {
      c.order = 'farm'; c.destination = null; c.targetId = null;
      if (c.farmCenter) c.home = { ...c.farmCenter };
    }
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
function resetArena(s, id) {
  const map = s.maps[id]; map.monsters = []; map.telegraph = null; map.bossTimer = 8; map.bossDefeated = false; delete map.lastGather;
  spawn(s, id, MAPS[id].monster);
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
  c.x = Math.max(-15, Math.min(15, c.x + dx / d * n));
  c.y = Math.max(-15, Math.min(15, c.y + dy / d * n));
  c.stance = 'walk'; return n >= d;
}
function effect(s, mapId, x, y, text, kind = 'hit') {
  s.effects.push({ id: s.nextId++, mapId, x, y, text, kind, life: 1.1 });
  if (s.effects.length > 70) s.effects.shift();
}
export function gainExp(s, c, exp, jobExp) {
  const previousJobLevel = c.jobLevel;
  c.exp += exp; c.jobExp += jobExp;
  while (c.level < 99 && c.exp >= baseNeed(c.level)) { c.exp -= baseNeed(c.level); c.level++; c.hp = stats(c).hp; c.sp = stats(c).sp; log(s, `${c.name} reached Base Lv. ${c.level}.`); }
  const cap = c.job === 'novice' ? 10 : 50;
  while (c.jobLevel < cap && c.jobExp >= jobNeed(c.jobLevel)) { c.jobExp -= jobNeed(c.jobLevel); c.jobLevel++; }
  if (c.jobLevel >= cap) c.jobExp = Math.min(c.jobExp, jobNeed(cap));
  if (c.job === 'novice' && previousJobLevel < 10 && c.jobLevel === 10) {
    log(s, c.name + ' can now choose a first job at guild camp.');
  }
}
function kill(s, m, killer) {
  if (m.rewarded) return;
  s.milestones.enemiesDefeated = (s.milestones.enemiesDefeated ?? 0) + 1;
  m.hp = 0; m.rewarded = true; m.respawn = 6 + random(s) * 4;
  const bounty = BOUNTIES[s.bounty?.id];
  if (bounty?.target === m.kind && bounty.map === m.mapId && s.bounty.kills < bounty.count) {
    s.bounty.kills++;
    if (s.bounty.kills === bounty.count) log(s, bounty.name + ' complete. Claim your reward at the bounty board.');
  }
  const def = MONSTERS[m.kind];
  const recipients = partyMembers(s, killer).filter(c => active(c) && c.mapId === m.mapId && distance(c, killer) < 18);
  const share = (recipients.length > 1 ? 1.12 : 1) / recipients.length;
  for (const c of recipients) { gainExp(s, c, def.exp * share * (c.assignment === 'experience' ? 1.15 : 1), def.jobExp * share); c.kills++; c.earned += def.zeny / recipients.length; }
  s.inventory.zeny += def.zeny;
  s.inventory.materials[def.material] = (s.inventory.materials[def.material] || 0) + (killer.assignment === 'materials' ? 2 : 1);
  if (random(s) < 0.035) { const item = random(s) < 0.6 ? 'iron' : 'guard'; s.inventory.equipment[item]++; log(s, `${def.name} dropped ${EQUIPMENT[item].name}.`); }
  if (m.mapId === 'payon' && random(s) < (m.kind === 'skeleton' ? 0.35 : 0.15)) {
    s.inventory.materials.Emveretarcon = (s.inventory.materials.Emveretarcon || 0) + 1;
  }
  if (Object.hasOwn(CARDS, m.kind) && (m.kind === 'phreeoni' || random(s) < 0.06)) {
    s.inventory.cards[m.kind] = (s.inventory.cards[m.kind] || 0) + 1;
    log(s, CARDS[m.kind].name + ' discovered in ' + MAPS[m.mapId].name + '! Socket it into equipment at camp.');
    effect(s, m.mapId, m.x, m.y, CARDS[m.kind].name, 'loot');
  }
  if (m.mapId === 'forest') s.milestones.forestKills++;
  if (m.kind === 'phreeoni') {
    s.maps.lair.bossDefeated = true; s.maps.lair.telegraph = null;
    log(s, 'Phreeoni defeated! The Sandsea Hollow MVP card is in shared storage.');
  }
  if (m.kind === 'baphomet') {
    s.milestones.bossKills++; s.inventory.equipment.sanctuary++; s.maps.arena.bossDefeated = true;
    s.maps.arena.telegraph = null;
    log(s, 'Baphomet defeated! A Sanctuary relic is in storage. Check your guild milestones.');
  }
  effect(s, m.mapId, m.x, m.y, '+' + def.zeny + 'z', 'loot');
}
function damage(s, c, m, value, attackRange = stats(c).range) {
  // All damaging paths re-check reach at the point of resolution. Target locks are
  // intentions, not permission to deal damage across a map or through an overshoot.
  if (!m || m.hp <= 0 || !c.mapId || c.mapId !== m.mapId || distance(c, m) > attackRange + 1e-6) return false;
  const dealt = Math.max(1, Math.round(value - MONSTERS[m.kind].def));
  m.hp -= dealt; m.targetId = c.id; effect(s, m.mapId, m.x, m.y, String(dealt));
  if (m.hp <= 0) kill(s, m, c);
  return true;
}
function useSkill(s, c, target, manual = false) {
  const st = stats(c), job = combatJob(c.job);
  if (c.cooldown > 0 || c.sp < st.cost) return false;
  if (job === 'novice' || (roleOf(c) === 'support' && !st.element)) {
    const allies = job === 'novice' ? [c] : partyMembers(s, c).filter(v => active(v) && v.mapId === c.mapId && distance(v, c) <= 8);
    const healAt = effectiveTactics(c).healAt;
    const injured = allies.filter(v => v.hp < stats(v).hp * (manual ? 1 : healAt)).sort((a, b) => a.hp / stats(a).hp - b.hp / stats(b).hp)[0];
    if (!injured) return false;
    const recipients = job === 'priest' ? allies.filter(a => a.hp < stats(a).hp) : [injured];
    for (const ally of recipients) {
      const amount = Math.min(stats(ally).hp - ally.hp, (job === 'novice' ? 28 : 45 + c.level * 5) + st.skillBonus);
      if (c.job === 'highPriest') ally.sp = Math.min(stats(ally).sp,ally.sp + 5);
      ally.hp += amount; effect(s, c.mapId, ally.x, ally.y, '+' + Math.round(amount), 'heal');
    }
  } else {
    if (!target || target.mapId !== c.mapId || distance(c, target) > st.range) return false;
    const multiplier = job === 'assassin' ? (target.hp < MONSTERS[target.kind].hp / 2 ? (c.job === 'assassinCross' ? 5 : 4) : 2.8) : roleOf(c) === 'ranged' && c.job !== 'archer' ? 2.4 : 2;
    const splash = st.splash || (job === 'mage' || (job === 'priest' && st.element === 'holy') ? 3 : 0);
    const centre = job === 'knight' || job === 'blacksmith' ? c : target;
    const secondary = splash ? s.maps[c.mapId].monsters.filter(m => m !== target && m.hp > 0 && distance(m, centre) < splash) : [];
    if (!damage(s, c, target, (st.atk * multiplier + st.skillBonus) * affinityMultiplier(st.element,target.kind), st.range)) return false;
    if (affinityMultiplier(st.element,target.kind) > 1) effect(s,c.mapId,target.x,target.y,'Weakness!', 'skill');
    const staggerTime = c.job === 'whitesmith' ? 3 : 2;
    const stagger = job === 'blacksmith' || job === 'wizard';
    if (stagger && target.hp > 0) target.timer = Math.max(target.timer, staggerTime);
    for (const m of secondary.slice(0, job === 'hunter' ? (c.job === 'sniper' ? 4 : 2) : secondary.length)) {
      if (damage(s, c, m, (st.atk * 1.4 + st.skillBonus) * affinityMultiplier(st.element,m.kind), st.range + splash) && stagger && m.hp > 0) m.timer = Math.max(m.timer, staggerTime);
    }
    if (job === 'swordsman') for (const m of s.maps[c.mapId].monsters) if (m.hp > 0 && distance(m, c) < 5) m.targetId = c.id;
  }
  c.sp -= st.cost; c.cooldown = st.cooldown; c.attackFlash = 0.5; c.stance = 'attack';
  effect(s, c.mapId, c.x, c.y, st.skill, 'skill'); return true;
}
function tickCharacter(s, c, dt) {
  c.attackFlash = Math.max(0, c.attackFlash - dt); c.cooldown = Math.max(0, c.cooldown - dt); c.attackTimer = Math.max(0, c.attackTimer - dt);
  const st = stats(c), tactics = effectiveTactics(c);
  if (!c.mapId) { c.stance = 'idle'; if (c.status !== 'down') { c.hp = Math.min(st.hp, c.hp + 12 * dt); c.sp = Math.min(st.sp, c.sp + 8 * dt); } return; }
  if (c.hp <= 0) { log(s, c.name + ' fell and returned to camp. Recover before redeploying.'); c.hp = 0; c.mapId = null; c.status = 'down'; c.targetId = null; c.destination = null; return; }
  c.sp = Math.min(st.sp, c.sp + st.regen * dt);
  if (c.hp < st.hp * tactics.potionAt && c.potions > 0) { c.hp = Math.min(st.hp, c.hp + 65); c.potions--; effect(s, c.mapId, c.x, c.y, '+Potion', 'heal'); }
  // Priority: an explicit Retreat is honored; an explicit Move finishes before
  // safety automation interrupts it; otherwise low HP retreats before combat AI.
  if (c.hp / st.hp < tactics.retreatAt && !['retreat', 'move'].includes(c.order)) {
    c.order = 'retreat'; c.status = 'retreating'; c.destination = { x: -11, y: 13 }; c.targetId = null;
    log(s, c.name + ' is retreating: HP below their threshold.');
  }
  if (c.order === 'retreat') {
    c.status = 'retreating';
    if (move(c, c.destination || { x: -11, y: 13 }, st.speed * 1.3, dt)) { c.mapId = null; c.status = 'camp'; c.order = 'farm'; c.targetId = null; c.destination = null; log(s, c.name + ' returned safely to camp.'); }
    return;
  }
  // Manual Move is an explicit short-lived order and always wins over automation.
  if (c.order === 'move') {
    c.status = 'moving';
    if (!c.destination || move(c, c.destination, st.speed, dt)) { c.order = 'hold'; c.home = { x: c.x, y: c.y }; c.destination = null; }
    return;
  }
  const map = s.maps[c.mapId], role = roleOf(c), leader = leaderAvailable(s, c);
  if (tactics.autoSkill) useSkill(s, c, null);
  let target = map.monsters.find(m => m.id === c.targetId && m.hp > 0);
  const pref = tactics.targetPref;
  // Leader assist is a farming behavior only: it must never bypass a manual Hold
  // anchor, a rally leash, or an explicit focus order.
  const assisted = c.order === 'farm' && pref === 'leader' && leader
    ? map.monsters.find(m => m.id === leader.targetId && m.hp > 0) : null;
  const leash = c.order === 'hold' ? st.range + 2 : c.order === 'farm' && c.farmRadius ? c.farmRadius : 20;
  if (target && distance(target, c.home) > leash) target = null;
  // In Farm, a valid leader target wins over a follower's previous target lock.
  if (assisted && distance(assisted, c.home) <= leash) target = assisted;
  if (!target && c.order !== 'focus') {
    const candidates = map.monsters.filter(m => m.hp > 0 && distance(m, c.home) <= leash);
    if (pref === 'lowest') candidates.sort((a, b) => a.hp - b.hp || distance(c, a) - distance(c, b));
    else candidates.sort((a, b) => distance(c, a) - distance(c, b));
    target = candidates[0] || null;
  }
  // Supports keep formation when there's no useful enemy nearby; they don't orbit or chase a retreating leader.
  if (!target) {
    c.targetId = null; c.status = c.order === 'hold' ? 'holding' : 'searching'; c.stance = 'idle';
    if (c.order === 'farm' && c.farmRadius && distance(c, c.home) > 1.2) { c.status = 'moving'; move(c, c.home, st.speed, dt); }
    else if (c.order === 'farm' && role !== 'frontline' && leader && distance(c, leader) > 5.5) { c.status = 'moving'; move(c, leader, st.speed, dt); }
    return;
  }
  c.targetId = target.id;
  const d = distance(c, target);
  let desired = role === 'frontline' ? Math.max(1.25, st.range - 0.25) : Math.min(st.range * 0.78, role === 'support' ? 3.5 : st.range - 0.5);
  if (role === 'support' && leader && distance(c, leader) > 8 && d > desired) {
    // Move partway toward the engagement, then reassess next step rather than chase continuously.
    const toward = distance(c, leader) > 5.5 ? leader : target;
    c.status = 'moving'; move(c, toward, st.speed, dt); return;
  }
  if (d > desired + 0.45 && distance(target, c.home) <= leash) { c.status = 'moving'; move(c, target, st.speed, dt); return; }
  if (d < desired - 0.8 && role !== 'frontline') {
    const dx = c.x - target.x, dy = c.y - target.y, length = Math.hypot(dx, dy) || 1;
    const retreatPoint = { x: c.x + dx / length * Math.min(1.1, desired - d), y: c.y + dy / length * Math.min(1.1, desired - d) };
    c.status = 'moving'; move(c, retreatPoint, st.speed * 0.7, dt); return;
  }
  c.status = 'fighting'; c.stance = c.attackFlash > 0 ? 'attack' : 'idle'; face(c, target);
  if (tactics.autoSkill) useSkill(s, c, target);
  if (target.hp > 0 && c.attackTimer <= 0 && target.mapId === c.mapId && distance(c, target) <= st.range) {
    c.attackTimer = st.interval; c.attackFlash = 0.4; c.stance = 'attack';
    const critical = st.crit > 0 && random(s) < st.crit;
    damage(s, c, target, st.atk * (0.9 + random(s) * 0.2) * (critical ? 1.5 : 1), st.range);
    if (critical) effect(s, c.mapId, target.x, target.y, 'Critical!', 'skill');
  }
}
function tickMonster(s, map, m, dt) {
  m.attackFlash = Math.max(0, m.attackFlash - dt);
  if (m.hp <= 0) {
    if (MAPS[map.id].boss) return;
    m.respawn -= dt;
    if (m.respawn <= 0) { const def = MONSTERS[m.kind]; m.x = (random(s) - 0.5) * 24; m.y = (random(s) - 0.5) * 24; m.hp = def.hp; m.rewarded = false; m.targetId = null; }
    return;
  }
  const def = MONSTERS[m.kind];
  let target = s.characters.find(c => c.id === m.targetId && active(c) && c.mapId === map.id && distance(c, m) < 20);
  if (!target) {
    const nearby = s.characters.filter(c => active(c) && c.mapId === map.id && distance(c, m) < (MAPS[map.id].boss ? 25 : Math.max(3.5,def.range)));
    target = nearby.sort((a, b) => distance(a, m) - distance(b, m))[0];
  }
  m.targetId = target?.id || null; m.stance = m.attackFlash > 0 ? 'attack' : 'idle';
  if (!target) return;
  m.timer = Math.max(0, m.timer - dt);
  if (distance(m, target) > def.range) { move(m, target, def.speed, dt); return; }
  face(m, target);
  if (m.timer <= 0) { m.timer = def.interval; target.hp = Math.max(0, target.hp - Math.max(1, def.atk - stats(target).def)); m.stance = 'attack'; m.attackFlash = 0.4; }
}
function tickPhreeoni(s, dt) {
  const map = s.maps.lair;
  if (map.bossDefeated) return;
  const fighters = s.characters.filter(c => active(c) && c.mapId === map.id);
  if (!fighters.length) { map.telegraph = null; return; }
  const cast = map.telegraph;
  if (cast) {
    const marked = fighters.find(c => c.id === cast.markedId);
    if (cast.markedId && !marked) { map.telegraph = null; return; }
    if (marked) { cast.x = marked.x; cast.y = marked.y; }
    cast.remaining -= dt;
    if (cast.remaining <= 0) {
      const inside = fighters.filter(c => distance(c, cast) < cast.radius);
      const amount = marked ? Math.ceil(180 / Math.max(1, inside.length)) : 110;
      for (const c of inside) {
        c.hp = Math.max(0, c.hp - amount); effect(s, map.id, c.x, c.y, String(amount), 'danger');
      }
      map.telegraph = null;
    }
  }
  map.bossTimer -= dt;
  if (map.bossTimer > 0) return;
  const target = fighters[Math.floor(random(s) * fighters.length)];
  const gather = !map.lastGather;
  map.telegraph = { x: target.x, y: target.y, radius: gather ? 4 : 5, remaining: 3.5, duration: 3.5 };
  if (gather) map.telegraph.markedId = target.id;
  map.lastGather = gather; map.bossTimer = 10;
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
      const hitDamage = t.innerRadius ? 75 : 50;
      for (const c of fighters) {
        const d = distance(c, t);
        if (d < (t.innerRadius || 0) || d >= t.radius) continue;
        c.hp = Math.max(0, c.hp - hitDamage);
        effect(s, 'arena', c.x, c.y, String(hitDamage), 'danger');
      }
      effect(s, 'arena', t.x, t.y, t.innerRadius ? 'Sanctuary Ring' : 'Dark Cross', 'danger');
      map.telegraph = null;
    }
  }
  map.bossTimer -= dt;
  if (map.bossTimer <= 0) {
    const target = fighters[Math.floor(random(s) * fighters.length)];
    const boss = map.monsters.find(m => m.kind === 'baphomet');
    if (boss.hp <= MONSTERS.baphomet.hp / 2) {
      map.telegraph = { x: boss.x, y: boss.y, radius: 8, innerRadius: 3, remaining: 3, duration: 3 };
    } else {
      map.telegraph = { x: target.x, y: target.y, radius: 4, remaining: 2.5, duration: 2.5 };
    }
    map.bossTimer = 10;
    map.monsters = map.monsters.filter(m => m.kind === 'baphomet' || m.hp > 0);
    if (map.monsters.filter(m => m.kind === 'willow').length < 2) spawn(s, 'arena', 'willow', { x: -4, y: -4 });
  }
}
function spacePartyMembers(characters, dt) {
  for (let i = 0; i < characters.length; i++) {
    const a = characters[i];
    if (!active(a) || !a.partyId || a.order !== 'farm') continue;
    for (const b of characters.slice(i + 1)) {
      if (!active(b) || b.partyId !== a.partyId || b.mapId !== a.mapId || b.order !== 'farm') continue;
      const d = distance(a, b);
      if (d >= 1.35) continue;
      const push = Math.min((1.35 - d) / 2, dt);
      const dx = d ? (a.x - b.x) / d : 1;
      const dy = d ? (a.y - b.y) / d : 0;
      for (const [unit, direction] of [[a, 1], [b, -1]]) {
        unit.x = Math.max(-15, Math.min(15, unit.x + dx * push * direction));
        unit.y = Math.max(-15, Math.min(15, unit.y + dy * push * direction));
      }
    }
  }
}
export function tick(s, dt = STEP, { offline = false, effects = true } = {}) {
  s.time += dt;
  if (effects) { for (const e of s.effects) e.life -= dt; s.effects = s.effects.filter(e => e.life > 0); } else s.effects = [];
  ensureLeaders(s);
  for (const c of s.characters) tickCharacter(s, c, dt);
  spacePartyMembers(s.characters, dt);
  for (const map of Object.values(s.maps)) {
    if (offline && MAPS[map.id].boss) continue;
    // Defeated field monsters still respawn, including on maps without a viewer.
    for (const m of map.monsters) tickMonster(s, map, m, dt);
  }
  if (!offline) { tickBoss(s, dt); tickPhreeoni(s, dt); }
  if (!effects) s.effects = [];
  advanceExpeditionGoals(s);
}
export function advance(s, seconds, options) {
  let remaining = seconds;
  while (remaining > 1e-8) { const dt = Math.min(STEP, remaining); tick(s, dt, options); remaining -= dt; }
  return s;
}
export function settleOffline(s, elapsedSeconds) {
  const seconds = Math.min(OFFLINE_CAP, Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0));
  const before = { zeny: s.inventory.zeny, kills: s.milestones.enemiesDefeated ?? 0,
    cards: { ...s.inventory.cards }, materials: { ...s.inventory.materials }, equipment: { ...s.inventory.equipment },
    levels: s.characters.map(c => ({ id: c.id, level: c.level, jobLevel: c.jobLevel, potions: c.potions })) };
  // Bosses require active play. Returning disconnects the expedition without rewards.
  for (const c of s.characters) if (MAPS[c.mapId]?.boss) { c.mapId = null; c.status = c.hp > 0 ? 'camp' : 'down'; c.targetId = null; c.order = 'farm'; c.destination = null; }
  if (seconds > 0) advance(s, seconds, { offline: true, effects: false });
  const report = { seconds, capped: elapsedSeconds > OFFLINE_CAP, zeny: s.inventory.zeny - before.zeny,
    kills: (s.milestones.enemiesDefeated ?? 0) - before.kills,
    loot: [...Object.entries(s.inventory.cards).map(([id, count]) => ({ name: CARDS[id].name, count: count - (before.cards[id] || 0) })), ...Object.entries(s.inventory.materials).map(([name, count]) => ({ name, count: count - (before.materials[name] || 0) })),
      ...Object.entries(s.inventory.equipment).map(([id, count]) => ({ name: EQUIPMENT[id].name, count: count - before.equipment[id] }))]
      .filter(drop => drop.count > 0),
    characters: s.characters.map(c => ({ name: c.name, levels: c.level - before.levels.find(v => v.id === c.id).level,
      jobLevels: c.jobLevel - before.levels.find(v => v.id === c.id).jobLevel,
      potions: before.levels.find(v => v.id === c.id).potions - c.potions, status: c.status })) };
  if (seconds >= 30) log(s, `Away report: ${report.kills} kills, ${report.zeny} Zeny earned.`);
  return report;
}

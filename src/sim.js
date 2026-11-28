// Pure, serializable simulation. No DOM, storage, wall clock, or camera dependencies.
import { ELEMENTS, affinityMultiplier, spellElement, BOUNTIES, ATTRIBUTES, ATTRIBUTE_CAP, CARDS, FORGE, jobChoices, promotionLevel, jobCap, jobRequirement, HUNT_RADII, DEFAULT_HUNT_RADIUS, VERSION, MAPS, JOBS, MONSTERS, EQUIPMENT, GEAR_ITEMS, GEAR_AFFIXES, GEAR_SLOTS, gearFitsSlot, ITEMS, SKILL_TREES, SKILL_INDEX, JOB_BUILDS, refineSuccessPercent, refineCost, refineSafeLimit, TACTICS, TACTIC_PRESETS, TARGET_PREFS, JOB_ROLES, STEP, OFFLINE_CAP, baseNeed, jobNeed } from './data.js';

export function random(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
export function availablePoints(c) {
  return 2 * (c.level - 1) - Object.values(c.attributes || {}).reduce((sum, points) => sum + points, 0);
}
export function refineBonuses(instance) {
  const item = GEAR_ITEMS[instance?.itemId] || (typeof instance === 'string' ? GEAR_ITEMS[instance] : null);
  const level = Math.max(0, Math.min(20, Number(instance?.refine) || 0));
  if (!item?.refineable || !level) return { atk:0, matk:0, def:0 };
  if (item.slot !== 'weapon') {
    let def = 0;
    for (let current = 1; current <= level; current++) def += Math.floor((3 + current) / 4);
    return { atk:0, matk:0, def };
  }
  const perLevel = {1:2,2:3,3:5,4:7}[item.weaponLevel] || 0;
  const highAt16 = {1:16,2:32,3:32,4:48}[item.weaponLevel] || 0;
  const highPerLevel = {1:1,2:2,3:2,4:3}[item.weaponLevel] || 0;
  const high = level >= 16 ? highAt16 + (level - 16) * highPerLevel : 0;
  const value = perLevel * level + high;
  return { atk:value, matk:value, def:0 };
}
function itemOfInstance(instance) {
  return GEAR_ITEMS[typeof instance === 'string' ? instance : instance?.itemId];
}
export function stats(c) {
  const job = JOBS[c.job], item = EQUIPMENT[c.equipment] || EQUIPMENT.training;
  const baseAttributes = c.attributes || {};
  const gear = Object.values(c.gear || {}).map(instance => ({ instance, item:itemOfInstance(instance) })).filter(entry => entry.item);
  const gearAttribute = key => gear.reduce((sum,{item}) => sum + (item[key] || 0),0);
  const str = (baseAttributes.str || 0) + gearAttribute('str'), agi = (baseAttributes.agi || 0) + gearAttribute('agi');
  const vit = (baseAttributes.vit || 0) + gearAttribute('vit'), int = (baseAttributes.int || 0) + gearAttribute('int');
  const dex = (baseAttributes.dex || 0) + gearAttribute('dex'), luk = (baseAttributes.luk || 0) + gearAttribute('luk');
  const build = (JOB_BUILDS[c.job] || []).find(option => option.id === c.build) || JOB_BUILDS[c.job]?.[0];
  const buildMods = build?.mods || {};
  const passiveRanks = Object.entries(c.skills || {}).reduce((sum, [id, level]) => {
    const skill = SKILL_INDEX[id];
    if (skill?.kind === 'passive') sum[skill.passive] = (sum[skill.passive] || 0) + level;
    return sum;
  }, {});
  const element = spellElement(c);
  const prepared = (c.skills?.[c.activeSkill] > 0 && SKILL_INDEX[c.activeSkill]) || SKILL_TREES[c.job]?.[0];
  const spell = element ? ELEMENTS[element][c.job] : prepared?.name || job.skill;
  const affixes = gear.flatMap(({ instance }) => instance?.affixes || []);
  const affix = Object.fromEntries(['atk','matk','def','hp','sp','crit','speed','skill'].map(stat => [stat, affixes.filter(a => GEAR_AFFIXES[a.id]?.stat === stat).reduce((sum,a) => sum + a.value,0)]));
  const refined = gear.map(({ instance }) => refineBonuses(instance));
  const gearAtk = gear.reduce((sum, {item}, i) => sum + (item.atk || 0) + refined[i].atk, 0) + affix.atk;
  const gearMatk = gear.reduce((sum, {item}, i) => sum + (item.matk || 0) + refined[i].matk, 0) + affix.matk;
  const gearDef = gear.reduce((sum, {item}, i) => sum + (item.def || 0) + refined[i].def, 0) + affix.def;
  const passiveAtk = (passiveRanks.atk || 0) + Math.floor((passiveRanks.magic || 0) * 0.7);
  const passiveDef = Math.floor((passiveRanks.def || 0) * 0.7);
  const extraHp = gear.reduce((sum, {item}) => sum + (item.hp || 0), 0) + affix.hp;
  const extraSp = gear.reduce((sum, {item}) => sum + (item.sp || 0), 0) + affix.sp;
  const gearRange = gear.reduce((max, {item}) => Math.max(max, item.range || 1), 1) - 1;
  const speedBonus = passiveRanks.atkSpeed || 0;
  const rangeBonus = passiveRanks.range || 0;
  const critBonus = passiveRanks.crit || 0;
  const healBonus = passiveRanks.heal || 0;
  const buff = c.buffs || {};
  const skillRank = prepared ? c.skills?.[prepared.id] || 1 : 1;
  return { ...job, element, skill: spell, buildName:build?.name || 'Balanced', buildMods,
    cost: prepared?.spCost ? Math.max(1, Math.round(prepared.spCost * (1 - (skillRank - 1) * 0.035))) : job.cost,
    cooldown: prepared?.cooldown ? Math.max(2, prepared.cooldown * (1 - (skillRank - 1) * 0.035)) : job.cooldown, splash: prepared?.splash || job.splash,
    interval: job.interval / (1 + agi / 100 + speedBonus * 0.012 + affix.speed / 100 + (buff.tempo > 0 ? 0.15 : 0) + (buildMods.speed || 0)), skillBonus: dex * 2 + healBonus + affix.skill + Math.round((buildMods.heal || 0) * 10),
    crit: luk / 100 + critBonus * 0.006 + affix.crit / 100 + (buildMods.crit || 0), regen: 0.9 + int * 0.025 + (passiveRanks.sp || 0) * 0.06,
    hp: job.hp + (c.level - 1) * 14 + vit * 10 + extraHp,
    atk: Math.round((job.atk + (c.level - 1) * 2 + item.atk + gearAtk + str * 2 + passiveAtk + (CARDS[c.card]?.atk || 0)) * (1 + (buildMods.atk || 0)) * (buff.atk > 0 ? 1.15 : 1)),
    def: job.def + Math.floor((c.level - 1) / 3) + item.def + gearDef + passiveDef + Math.floor(vit / 3) + (CARDS[c.card]?.def || 0) + (buildMods.def || 0) + (buff.def > 0 ? 2 : 0),
    mdef: gear.reduce((sum,{item}) => sum + (item.mdef || 0),0), blindRes:gear.reduce((sum,{item}) => sum + (item.blindRes || 0),0),
    matk: job.atk + (c.level - 1) * 2 + int * 2 + gearMatk + (passiveRanks.magic || 0),
    sp: 45 + c.level * 4 + int * 4 + extraSp + Math.round((buildMods.sp || 0) * 10), range: job.range + gearRange + rangeBonus * 0.05 + (buildMods.range || 0) };
}
export function character(id, name, sex = 'm') {
  return { id, ownerId: 'local-player', name, sex, job: 'novice', level: 1, exp: 0, jobLevel: 1, jobExp: 0,
    hp: 100, sp: 49, mapId: null, partyId: null, x: 0, y: 0, home: { x: 0, y: 0 },
    direction: 0, stance: 'idle', status: 'camp', order: 'farm', destination: null, targetId: null,
    cooldown: 0, attackTimer: 0, attackFlash: 0, potions: 10, tactic: 'safe', tactics: { ...TACTIC_PRESETS.safe }, equipment: 'training',
    gear: {}, skills: { [SKILL_TREES.novice[0].id]: 1 }, activeSkill: SKILL_TREES.novice[0].id, skillPoints: 0, build:'balanced',
    assignment: 'balanced', kills: 0, earned: 0 };
}
export function effectiveTactics(c) {
  const preset = TACTIC_PRESETS[c.tactic] || TACTIC_PRESETS.safe;
  return { ...preset, ...(c.tactics || {}) };
}
export function roleOf(c) { return JOB_ROLES[c.job] || 'frontline'; }
export function canEquipGear(jobId, itemId, baseLevel = 99) {
  const item = GEAR_ITEMS[itemId];
  if (!item || baseLevel < (item.equipLevel || 0) || item.excluded?.includes(jobId)) return false;
  if (!item.classes) return true;
  let current = jobId;
  while (current) {
    if (current === 'novice' && jobId !== 'novice') break;
    if (item.classes.includes(current) || item.classes.includes(JOBS[current]?.family)) return true;
    current = JOBS[current]?.parent;
  }
  return false;
}
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
function makeGearInstance(s, itemId, affixes = []) {
  return { uid:`g${s.nextId++}`, itemId, refine:0, affixes:affixes.map(a => ({ ...a })) };
}
function refreshGearCounts(s) {
  s.inventory.gear = {};
  for (const instance of s.inventory.gearItems || []) s.inventory.gear[instance.itemId] = (s.inventory.gear[instance.itemId] || 0) + 1;
}
export function rollGearAffixes(s, itemId, key) {
  const item = GEAR_ITEMS[itemId];
  const candidates = Object.entries(GEAR_AFFIXES).filter(([,affix]) => affix.slots.includes(item.slot));
  const rarity = lootRoll(s,{id:key,kind:itemId},'affix-count');
  const count = rarity < 0.1 ? 3 : rarity < 0.42 ? 2 : 1;
  const rolled = [], remaining = [...candidates];
  for (let i=0; i<Math.min(count,remaining.length); i++) {
    const pick = Math.floor(lootRoll(s,{id:key,kind:itemId},`affix-${i}`) * remaining.length);
    const [id,affix] = remaining.splice(pick,1)[0];
    const valueRoll = lootRoll(s,{id:key,kind:itemId},`value-${i}`);
    rolled.push({ id, value:affix.min + Math.floor(valueRoll * (affix.max - affix.min + 1)) });
  }
  return rolled;
}
function addGearToBag(s, itemId, affixes = []) {
  if (!Object.hasOwn(GEAR_ITEMS,itemId)) return null;
  s.inventory.gearItems ||= [];
  const instance = makeGearInstance(s,itemId,affixes);
  s.inventory.gearItems.push(instance); refreshGearCounts(s); return instance;
}
export function createGame(seed = 712711) {
  const s = { version: VERSION, ownerId: 'local-player', seed, time: 0, nextId: 1, characters: [character('c1', 'Aren'), character('c2', 'Lyra', 'f')],
    parties: [], maps: {}, inventory: { zeny: 150, materials: {}, cards: {}, socketed: {}, items: { red_potion:0, blue_potion:0, phracon:0, emveretarcon:0, elunium:0, oridecon:0, bradium:0, carnium:0 },
      gear: {}, gearItems:[], equipment: { reliquary: 0, dune: 0, iron: 0, guard: 0, sanctuary: 0 } },
    milestones: { bossKills: 0, forestKills: 0, expeditionStep: 0 }, journal: [], effects: [] };
  for (const map of Object.values(MAPS)) populateField(s, map);
  for (const itemId of ['knife','sword','bow','rod','mace','cotton_shirt','cotton_shirt','guard','guard','cap','cap','hood','hood','sandal','sandal','clip','clip']) addGearToBag(s,itemId);
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
  return Math.ceil(FORGE[item].zeny * (s.characters.some(c => c.job === 'blacksmith' && !c.mapId && c.hp > 0) ? 0.5 : 1));
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
    const requirement = jobRequirement(c.job);
    if (c.jobLevel < requirement.jobLevel) return 'Reach Job Lv. ' + requirement.jobLevel + ' first.';
    if (c.level < requirement.baseLevel) return 'Reach Base Lv. ' + requirement.baseLevel + ' first.';
    c.job = cmd.job; c.jobLevel = 1; c.jobExp = 0;
    c.skills ||= {}; c.skills[SKILL_TREES[c.job][0].id] = Math.max(1, c.skills[SKILL_TREES[c.job][0].id] || 0); c.activeSkill = SKILL_TREES[c.job][0].id;
    c.build = JOB_BUILDS[c.job]?.[0]?.id || 'balanced';
    c.hp = stats(c).hp; c.sp = stats(c).sp;
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
    const count = units.reduce((n, c) => n + Math.max(0, 10 - c.potions), 0);
    const stored = s.inventory.items?.red_potion || 0, purchase = Math.max(0, count - stored), cost = purchase * 2;
    if (!count) return 'Everyone already has ten potions.';
    if (s.inventory.zeny < cost) return `You need ${cost} Zeny to refill this selection.`;
    s.inventory.zeny -= cost; s.inventory.items.red_potion = Math.max(0, stored - count);
    units.forEach(c => { c.potions = Math.max(c.potions, 10); }); return null;
  }
  if (cmd.type === 'use-item') {
    const item = ITEMS[cmd.item];
    if (selected.length !== 1 || !item || item.type !== 'consumable') return 'Choose one adventurer and a usable item.';
    const c = selected[0];
    if (!(s.inventory.items?.[cmd.item] > 0)) return 'That item is not in the bag.';
    if (item.effect === 'hp') c.hp = Math.min(stats(c).hp, c.hp + item.amount);
    else if (item.effect === 'sp') c.sp = Math.min(stats(c).sp, c.sp + item.amount);
    s.inventory.items[cmd.item]--;
    if (c.mapId) effect(s, c.mapId, c.x, c.y, item.name, 'heal');
    log(s, `${c.name} used ${item.name}.`); return null;
  }
  if (cmd.type === 'equip') {
    if (selected.length !== 1 || !Object.hasOwn(EQUIPMENT, cmd.item)) return 'Choose one character and an item.';
    const c = selected[0];
    if (c.mapId) return 'Change equipment at camp.';
    const card = cmd.card ?? null;
    if (card !== null && (!Object.hasOwn(CARDS, card) || cmd.item === 'training')) return 'Unknown socketed item.';
    if (c.equipment === cmd.item && (c.card || null) === card) return null;
    const stock = card ? s.inventory.socketed : s.inventory.equipment;
    const key = card ? cmd.item + '/' + card : cmd.item;
    if (cmd.item !== 'training' && !(stock[key] > 0)) return 'That item is not in storage.';
    if (c.equipment !== 'training') {
      const oldStock = c.card ? s.inventory.socketed : s.inventory.equipment;
      const oldKey = c.card ? c.equipment + '/' + c.card : c.equipment;
      oldStock[oldKey] = (oldStock[oldKey] || 0) + 1;
    }
    if (cmd.item !== 'training') stock[key]--;
    c.equipment = cmd.item; c.card = card; c.hp = Math.min(c.hp, stats(c).hp); return null;
  }
  if (cmd.type === 'gear-equip' || cmd.type === 'gear-unequip') {
    if (selected.length !== 1) return 'Choose one adventurer to manage equipment.';
    const c = selected[0];
    if (c.mapId) return 'Change equipment at camp.';
    const slot = cmd.slot;
    if (!Object.hasOwn(GEAR_SLOTS, slot)) return 'Choose a valid equipment slot.';
    c.gear ||= {}; s.inventory.gearItems ||= [];
    const old = c.gear[slot] || null;
    const oldInstance = typeof old === 'string' ? makeGearInstance(s,old) : old;
    const wantedId = cmd.type === 'gear-unequip' ? null : cmd.item;
    let bagIndex = -1;
    if (wantedId) bagIndex = cmd.uid ? s.inventory.gearItems.findIndex(instance => instance.uid === cmd.uid)
      : s.inventory.gearItems.findIndex(instance => instance.itemId === wantedId);
    const chosen = bagIndex >= 0 ? s.inventory.gearItems[bagIndex] : null;
    const itemId = chosen?.itemId || wantedId;
    const item = itemId ? GEAR_ITEMS[itemId] : null;
    if (itemId && (!item || !gearFitsSlot(item,slot))) return 'That item does not fit this equipment slot.';
    if (item && !canEquipGear(c.job,itemId,c.level)) return c.level < (item.equipLevel || 0) ? `This item requires Base Lv. ${item.equipLevel}.` : 'This job cannot equip that item.';
    if (chosen && oldInstance?.uid === chosen.uid) return null;
    if (wantedId && !chosen) return 'That item instance is not in your bag.';
    if (cmd.type === 'gear-unequip' && !old) return null;
    if (oldInstance) s.inventory.gearItems.push(oldInstance);
    if (chosen) { s.inventory.gearItems.splice(bagIndex,1); c.gear[slot] = chosen; }
    else delete c.gear[slot];
    refreshGearCounts(s);
    c.hp = Math.min(c.hp, stats(c).hp); c.sp = Math.min(c.sp, stats(c).sp);
    log(s, itemId ? `${c.name} equipped ${item.name}${chosen?.refine ? ` +${chosen.refine}` : ''}.` : `${c.name} removed ${GEAR_SLOTS[slot]}.`);
    return null;
  }
  if (cmd.type === 'refine-gear') {
    if (selected.length !== 1 || selected[0].mapId) return 'Refine equipment at camp with one adventurer selected.';
    const c = selected[0], uid = cmd.uid;
    const bagIndex = s.inventory.gearItems?.findIndex(instance => instance.uid === uid) ?? -1;
    let equippedSlot = Object.entries(c.gear || {}).find(([,instance]) => instance?.uid === uid)?.[0] || null;
    const instance = bagIndex >= 0 ? s.inventory.gearItems[bagIndex] : equippedSlot ? c.gear[equippedSlot] : null;
    if (!instance) return 'Select an item instance to refine.';
    const item = GEAR_ITEMS[instance.itemId];
    if (!item?.refineable || instance.refine >= 20) return 'This item cannot be refined further.';
    const cost = refineCost(item,instance.refine);
    if (s.inventory.zeny < cost.zeny || (s.inventory.items[cost.material] || 0) < cost.amount) return `Refining needs ${cost.amount} ${ITEMS[cost.material].name} and ${cost.zeny} Zeny.`;
    const chance = refineSuccessPercent(item,instance.refine);
    s.inventory.zeny -= cost.zeny; s.inventory.items[cost.material] -= cost.amount;
    if (random(s) * 100 < chance) {
      instance.refine++;
      log(s, `${c.name} refined ${item.name} to +${instance.refine} (${chance}% chance).`);
      if (c.mapId) effect(s,c.mapId,c.x,c.y,`+${instance.refine} ${item.name}`,'loot');
    } else {
      const breakChance = instance.refine >= 10 ? 0.2 : 1;
      if (random(s) < breakChance) {
        if (bagIndex >= 0) s.inventory.gearItems.splice(bagIndex,1);
        else delete c.gear[equippedSlot];
        refreshGearCounts(s);
        log(s, `Refining failed. ${item.name} broke; its refine, cards and affixes were lost.`);
      } else {
        const previous = instance.refine; instance.refine = Math.max(0, instance.refine - 3);
        log(s, `Refining failed. ${item.name} fell from +${previous} to +${instance.refine}.`);
      }
    }
    c.hp = Math.min(c.hp,stats(c).hp); c.sp = Math.min(c.sp,stats(c).sp);
    return null;
  }
  if (cmd.type === 'refine-convert') {
    if (selected.length !== 1 || selected[0].mapId) return 'Exchange refinement ores at camp.';
    const { from, to } = cmd;
    const validPair = (from === 'oridecon' && to === 'bradium') || (from === 'elunium' && to === 'carnium');
    if (!validPair || (s.inventory.items[from] || 0) < 3 || s.inventory.zeny < 50000) return 'Exchange needs three matching ores and 50,000 Zeny.';
    s.inventory.items[from] -= 3; s.inventory.items[to] = (s.inventory.items[to] || 0) + 1; s.inventory.zeny -= 50000;
    log(s, `Exchanged three ${ITEMS[from].name} for ${ITEMS[to].name}.`); return null;
  }
  if (cmd.type === 'attune') {
    const c = selected[0];
    if (selected.length !== 1 || c.mapId || !(Object.hasOwn(ELEMENTS,cmd.element) && Object.hasOwn(ELEMENTS[cmd.element],c.job) || cmd.element === 'support' && roleOf(c) === 'support')) return 'Choose one caster and prepare an element at camp.';
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
  if (cmd.type === 'set-build') {
    if (selected.length !== 1 || selected[0].mapId) return 'Choose a build at camp.';
    const c = selected[0], build = JOB_BUILDS[c.job]?.find(option => option.id === cmd.build);
    if (!build) return 'Choose a build for the current class.';
    c.build = build.id; log(s, `${c.name} adopted the ${build.name} build.`); return null;
  }
  if (cmd.type === 'learn-skill') {
    if (selected.length !== 1) return 'Choose one adventurer to train skills.';
    const c = selected[0], skill = SKILL_INDEX[cmd.skill];
    if (c.mapId) return 'Train skills at camp.';
    if (!skill || !SKILL_TREES[c.job]?.some(node => node.id === skill.id)) return 'That skill is not in this job’s tree.';
    const level = c.skills?.[skill.id] || 0;
    if (level >= skill.maxLevel) return 'This skill is already mastered.';
    if (c.jobLevel < skill.jobLevel) return 'Reach Job Lv. ' + skill.jobLevel + ' to learn this skill.';
    if (skill.requires.some(req => (c.skills?.[req.skill] || 0) < req.level)) return 'Meet the prerequisite skill rank first.';
    if ((c.skillPoints || 0) < 1) return 'Earn a Job level to gain a skill point.';
    c.skills ||= {}; c.skills[skill.id] = level + 1; c.skillPoints--;
    log(s, `${c.name} learned ${skill.name} Lv. ${level + 1}.`); return null;
  }
  if (cmd.type === 'prepare-skill') {
    if (selected.length !== 1 || selected[0].mapId) return 'Prepare a skill at camp.';
    const c = selected[0], skill = SKILL_INDEX[cmd.skill];
    if (!skill || skill.kind !== 'active' || !(c.skills?.[skill.id] > 0)) return 'Learn that active skill before preparing it.';
    c.activeSkill = skill.id; c.cooldown = 0; return null;
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
function effect(s, mapId, x, y, text, kind = 'hit', data = {}) {
  s.effects.push({ id: s.nextId++, mapId, x, y, text, kind, life: 1.1, ...data });
  if (s.effects.length > 70) s.effects.shift();
}
export function gainExp(s, c, exp, jobExp) {
  const previousJobLevel = c.jobLevel;
  c.exp += exp; c.jobExp += jobExp;
  while (c.level < 99 && c.exp >= baseNeed(c.level)) { c.exp -= baseNeed(c.level); c.level++; c.hp = stats(c).hp; c.sp = stats(c).sp; log(s, `${c.name} reached Base Lv. ${c.level}.`); }
  const cap = c.job === 'novice' ? 10 : jobCap(c.job);
  while (c.jobLevel < cap && c.jobExp >= jobNeed(c.jobLevel)) { c.jobExp -= jobNeed(c.jobLevel); c.jobLevel++; c.skillPoints = (c.skillPoints || 0) + 1; }
  if (c.jobLevel >= cap) c.jobExp = Math.min(c.jobExp, jobNeed(cap));
  if (c.job === 'novice' && previousJobLevel < 10 && c.jobLevel === 10) {
    log(s, c.name + ' can now choose a first job at guild camp.');
  }
}
function lootRoll(s, monster, salt) {
  let hash = (s.seed ^ 0x9e3779b9) >>> 0;
  const text = `${monster.id}:${monster.kind}:${salt}`;
  for (let i = 0; i < text.length; i++) hash = (Math.imul(hash ^ text.charCodeAt(i), 16777619)) >>> 0;
  hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
  return hash / 4294967296;
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
  if (lootRoll(s,m,'gear') < 0.035) {
    const pool = m.kind === 'zombie' || m.kind === 'skeleton' ? ['silk_robe','buckler','boots','rosary'] :
      m.kind === 'willow' || m.kind === 'fabre' ? ['cotton_shirt','cap','hood','sandal','clip'] : ['adventurer_suit','muffler','glove','circlet'];
    const gearId = pool[Math.floor(lootRoll(s,m,'gear-choice') * pool.length)];
    const affixes = rollGearAffixes(s,gearId,`${m.id}:kill:${s.milestones.enemiesDefeated}`);
    addGearToBag(s,gearId,affixes);
    const label = `${affixes.map(a => GEAR_AFFIXES[a.id].name).join(' ')}${affixes.length ? ' ' : ''}${GEAR_ITEMS[gearId].name}`;
    log(s, `${def.name} dropped ${label}.`);
    effect(s, m.mapId, m.x, m.y, label, 'loot');
  }
  if (lootRoll(s,m,'potion') < 0.06) {
    const itemId = lootRoll(s,m,'potion-kind') < 0.78 ? 'red_potion' : 'blue_potion';
    s.inventory.items[itemId] = (s.inventory.items[itemId] || 0) + 1;
    effect(s, m.mapId, m.x, m.y, itemId === 'red_potion' ? 'Red Potion' : 'Blue Potion', 'loot');
  }
  if (lootRoll(s,m,'refine-metal') < 0.09) {
    const metal = lootRoll(s,m,'refine-metal-kind') < 0.72 ? 'phracon' : 'emveretarcon';
    s.inventory.items[metal] = (s.inventory.items[metal] || 0) + 1;
    effect(s,m.mapId,m.x,m.y,ITEMS[metal].name,'loot');
  }
  if ((m.kind === 'zombie' || m.kind === 'skeleton') && lootRoll(s,m,'ore') < 0.035) {
    const ore = lootRoll(s,m,'ore-kind') < 0.65 ? 'elunium' : 'oridecon';
    s.inventory.items[ore] = (s.inventory.items[ore] || 0) + 1;
    effect(s, m.mapId, m.x, m.y, ore === 'elunium' ? 'Elunium' : 'Oridecon', 'loot');
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
function refineOverupgrade(s,c) {
  const weapon = Object.values(c.gear || {}).find(instance => itemOfInstance(instance)?.slot === 'weapon');
  const item = itemOfInstance(weapon);
  if (!weapon || !item?.refineable) return 0;
  const over = Math.max(0,(weapon.refine || 0)-refineSafeLimit(item));
  const perLevel = {1:2,2:5,3:8,4:14}[item.weaponLevel] || 0;
  return over ? Math.floor(random(s) * (perLevel * over + 1)) : 0;
}
function damage(s, c, m, value, attackRange = stats(c).range) {
  // All damaging paths re-check reach at the point of resolution. Target locks are
  // intentions, not permission to deal damage across a map or through an overshoot.
  if (!m || m.hp <= 0 || !c.mapId || c.mapId !== m.mapId || distance(c, m) > attackRange + 1e-6) return false;
  const dealt = Math.max(1, Math.round(value + refineOverupgrade(s,c) - MONSTERS[m.kind].def));
  m.hp -= dealt; m.targetId = c.id; effect(s, m.mapId, m.x, m.y, String(dealt));
  if (m.hp <= 0) kill(s, m, c);
  return true;
}
function useSkill(s, c, target, manual = false) {
  const st = stats(c);
  const node = (c.skills?.[c.activeSkill] > 0 && SKILL_INDEX[c.activeSkill]) || SKILL_TREES[c.job]?.[0];
  const rank = Math.max(1, c.skills?.[node?.id] || 1);
  const cost = node?.spCost ? Math.max(1, Math.round(node.spCost * (1 - (rank - 1) * 0.035))) : st.cost;
  const cooldown = node?.cooldown ? Math.max(2, node.cooldown * (1 - (rank - 1) * 0.035)) : st.cooldown;
  if (!node || c.cooldown > 0 || c.sp < cost) return false;
  const effectType = node.effect;
  const isHeal = ['heal','partyHeal','guard'].includes(effectType);
  const support = roleOf(c) === 'support' || c.job === 'novice';
  if (isHeal || (support && !target && !st.element)) {
    const allies = c.job === 'novice' ? [c] : partyMembers(s, c).filter(v => active(v) && v.mapId === c.mapId && distance(v, c) <= (node.splash || 8));
    const healAt = effectiveTactics(c).healAt;
    const injured = allies.filter(v => v.hp < stats(v).hp * (manual ? 1 : healAt)).sort((a, b) => a.hp / stats(a).hp - b.hp / stats(b).hp)[0];
    if (!injured && !(effectType === 'partyHeal' && st.element === 'holy' && target)) return false;
    const recipients = ['partyHeal','guard'].includes(effectType) ? allies.filter(a => a.hp < stats(a).hp) : injured ? [injured] : [];
    for (const ally of recipients) {
      const amount = Math.min(stats(ally).hp - ally.hp, ((c.job === 'novice' ? 24 : 35 + c.level * 4 + rank * 4) + st.skillBonus) * (1 + (st.buildMods?.heal || 0)));
      ally.hp += amount; effect(s, c.mapId, ally.x, ally.y, '+' + Math.round(amount), 'heal');
      if (effectType === 'guard') { ally.buffs ||= {}; ally.buffs.def = Math.max(ally.buffs.def || 0, 8); }
    }
    if (effectType === 'partyHeal' && st.element === 'holy' && target && target.mapId === c.mapId) {
      const undead = s.maps[c.mapId].monsters.filter(enemy => enemy.hp > 0 && distance(enemy, target) <= Math.max(node.splash || 0, 1));
      for (const enemy of undead) if (['zombie','skeleton'].includes(enemy.kind)) damage(s,c,enemy,st.matk * node.rankPower * (1 + (rank - 1) * 0.14) * (1 + (st.buildMods?.skillPower || 0)) * affinityMultiplier('holy',enemy.kind),Math.max(st.range,node.range || 0));
    }
  } else if (effectType === 'buffAtk' || effectType === 'buffDef' || effectType === 'buffTempo') {
    const allies = partyMembers(s,c).filter(v => active(v) && v.mapId === c.mapId && distance(v,c) <= (node.splash || 8));
    for (const ally of allies) {
      ally.buffs ||= {};
      const key = effectType === 'buffAtk' ? 'atk' : effectType === 'buffDef' ? 'def' : 'tempo';
      ally.buffs[key] = Math.max(ally.buffs[key] || 0, 10 + rank * 2);
    }
  } else {
    if (!target || target.mapId !== c.mapId || distance(c, target) > Math.max(st.range, node.range || 0)) return false;
    const skillStat = st.element || ['magic','sage'].includes(JOBS[c.job]?.family) ? st.matk : st.atk;
    const multiplier = (c.job === 'mage' ? 2.4 : node.rankPower) * (1 + (rank - 1) * 0.14) * (1 + (st.buildMods?.skillPower || 0));
    const splash = node.splash || (c.job === 'mage' ? 3 : 0);
    const centre = ['area','areaControl','areaHoly','falcon','summon'].includes(effectType) ? target : target;
    const secondary = splash ? s.maps[c.mapId].monsters.filter(m => m !== target && m.hp > 0 && distance(m, centre) <= splash) : [];
    const deal = (enemy, extra = 1) => {
      const element = effectType === 'areaHoly' ? 'holy' : st.element;
      const affinity = affinityMultiplier(element, enemy.kind);
      const value = (skillStat * multiplier * extra + st.skillBonus) * affinity * (enemy.statuses?.vulnerable ? 1.4 : 1);
      const success = damage(s, c, enemy, value, Math.max(st.range, node.range || 0) + splash);
      if (success && effectType === 'poison') { enemy.statuses ||= {}; enemy.statuses.poison = { time: 5, damage: Math.max(2, Math.round(st.atk * 0.18)), source: c.id }; }
      if (success && effectType === 'vulnerability') { enemy.statuses ||= {}; enemy.statuses.vulnerable = 8; }
      if (success && (node.control || effectType.includes('Control'))) enemy.timer = Math.max(enemy.timer, Math.max(2, (node.control || 1.5) * (1 + (st.buildMods?.control || 0))));
      if (success && effectType === 'falcon') effect(s,c.mapId,enemy.x,enemy.y,'Falcon Strike!','skill');
      return success;
    };
    if (!deal(target)) return false;
    const splashFactor = c.job === 'mage' ? 1.4 / 2.4 : 0.72;
    const secondaryTargets = c.job === 'hunter' ? secondary.slice(0, 2) : secondary;
    for (const enemy of secondaryTargets) deal(enemy, splashFactor);
    if (effectType === 'buffAtk' || effectType === 'venom') { c.buffs ||= {}; c.buffs.atk = Math.max(c.buffs.atk || 0, 8 + rank * 2); }
    if (effectType === 'finisher') c.sp = Math.max(0, c.sp - Math.floor(st.sp * 0.08));
    if (effectType === 'summon') c.buffs ||= {}, c.buffs.tempo = Math.max(c.buffs.tempo || 0, 6);
  }
  c.sp -= cost; c.cooldown = cooldown; c.attackFlash = 0.5; c.stance = 'attack';
  effect(s, c.mapId, c.x, c.y, node.name + (rank > 1 ? ` Lv.${rank}` : ''), 'skill', { fx:effectType, jobId:c.job, element:st.element }); return true;
}
function tickCharacter(s, c, dt) {
  c.attackFlash = Math.max(0, c.attackFlash - dt); c.cooldown = Math.max(0, c.cooldown - dt); c.attackTimer = Math.max(0, c.attackTimer - dt);
  for (const [key, time] of Object.entries(c.buffs || {})) { c.buffs[key] = Math.max(0, time - dt); if (c.buffs[key] === 0) delete c.buffs[key]; }
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
  if (m.statuses?.vulnerable > 0) { m.statuses.vulnerable = Math.max(0, m.statuses.vulnerable - dt); if (!m.statuses.vulnerable) delete m.statuses.vulnerable; }
  if (m.statuses?.poison && m.hp > 0) {
    const poison = m.statuses.poison; poison.time -= dt; poison.pulse = (poison.pulse || 0) + dt;
    while (poison.pulse >= 1 && m.hp > 0) {
      poison.pulse -= 1; m.hp -= poison.damage;
      effect(s, map.id, m.x, m.y, String(poison.damage), 'skill');
      if (m.hp <= 0) { const killer = s.characters.find(c => c.id === poison.source) || s.characters.find(c => c.mapId === map.id); if (killer) kill(s, m, killer); }
    }
    if (poison.time <= 0) delete m.statuses.poison;
  }
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

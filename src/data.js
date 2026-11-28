import { SKILLS } from './skills-catalog.js';
import { canLearnSkill as canLearnSkillFor } from './skills.js';
import { RENEWAL_JOBS, BUILD_FAMILIES, STATUS_EFFECTS } from './renewal.js';
// Generated from rAthena's renewal item database by scripts/build_gear_catalog.py.
import GEAR_CATALOG from './gear-catalog.json' with { type: 'json' };
import GEAR_SHOP_KEYS from './gear-shop.json' with { type: 'json' };

export const HUNT_RADII = [3, 6, 10];
export const DEFAULT_HUNT_RADIUS = 6;
export const VERSION = 1;
export const STEP = 0.1;
export const OFFLINE_CAP = 4 * 60 * 60;
// RO fields span broad, connected hunting grounds rather than small combat pads.
// Coordinates are game-world units; source-map names in MAP-RESEARCH.md are visual references.
export const MAPS = {
  meadow: {
    id: 'meadow', name: 'South Prontera', subtitle: 'A quiet beginning', tier: 'FIELD · LV 1–4', color: '#91b27d', monster: 'poring', count: 12, radius: 16,
    bounds: { x: 42, y: 32 }, terrain: { base: 'grass_olive', accent: 'grass_blossom', path: 'dirt_path', edge: 'cliff_rock' },
    camp: { x: -35, y: 26 }, deploy: { x: -27, y: 19 },
    zones: [
      { kind: 'poring', x: -25, y: 17, r: 12, label: 'Poring Meadow' },
      { kind: 'fabre', x: 23, y: 8, r: 12, label: 'Fabre Thicket' },
    ],
    road: [
      [[-35, 26], [-31, 21], [-25, 17], [-12, 13], [1, 11], [14, 9], [23, 8]],
      [[1, 11], [4, 3], [3, -7], [6, -18], [10, -29]],
      [[-12, 13], [-20, 6], [-25, -4], [-28, -15]],
    ],
    scenery: {
      border: ['tree_tall_cluster', 'tree_sapling', 'tree_bush_bright'],
      props: [
        { id: 'house_prontera', x: -39, y: 28 },
        { id: 'lantern_stone', x: -33, y: 23 },
        { id: 'lantern_stone', x: -37, y: 29 },
        { id: 'standing_stone', x: 1, y: 13 },
        { id: 'tree_bush_bright', x: -18, y: 5 },
        { id: 'tree_bush_bright', x: -5, y: 1 },
        { id: 'tree_bush_bright', x: 18, y: 18 },
        { id: 'tree_sapling', x: -20, y: -2 },
        { id: 'tree_sapling', x: -11, y: 20 },
        { id: 'rock_boulder_mossy', x: 30, y: 2 },
        { id: 'rock_boulder_mossy', x: 15, y: 22 },
        { id: 'rock_cliff_crag', x: 34, y: 12 },
        { id: 'tree_tall_cluster', x: 36, y: 4, scale: 0.95 },
        { id: 'tree_tall_cluster', x: 8, y: 25, scale: 0.9 },
        { id: 'tree_tall_cluster', x: -25, y: -20, scale: 1.05 },
      ],
    },
  },
  forest: {
    id: 'forest', name: 'Payon Forest', subtitle: 'Beyond the familiar paths', tier: 'FIELD · LV 4–8', color: '#698a7b', monster: 'willow', count: 7, radius: 16,
    bounds: { x: 32, y: 27 }, terrain: { base: 'grass_forest', accent: 'grass_olive', path: 'dirt_payon', edge: 'cliff_rock' },
    road: [[[-29, 22], [-16, 10], [-4, 2], [8, -6], [29, -23]]],
    scenery: {
      border: ['tree_tall_cluster', 'tree_bush_bright'],
      props: [
        { id: 'tree_tall_cluster', x: -20, y: -12, scale: 1.05 }, { id: 'tree_tall_cluster', x: 18, y: -17 },
        { id: 'tree_tall_cluster', x: 24, y: 12, scale: 0.95 }, { id: 'tree_tall_cluster', x: -17, y: 20, scale: 1.1 },
        { id: 'tree_bush_bright', x: 15, y: -3 }, { id: 'tree_bush_bright', x: -22, y: 7 },
      ],
    },
  },
  payon: { id: 'payon', name: 'Payon Cave', subtitle: 'Lanterns beneath the eastern ridge', tier: 'DUNGEON · LV 12–18', color: '#a49bb9', monster: 'zombie', count: 8, radius: 16, bounds: { x: 29, y: 27 }, terrain: { base: 'ruin_cobble', accent: 'cliff_rock', path: 'dirt_payon', edge: 'cliff_rock' }, road: [[[-26, 20], [-12, 12], [-3, 1], [10, -8], [26, -19]]], scenery: { border: ['rock_cliff_crag', 'rock_boulder_mossy'] } },
  morroc: { id: 'morroc', name: 'Sograt Desert', subtitle: 'The southern caravan road', tier: 'FIELD · LV 8–14', color: '#cba976', monster: 'scorpion', count: 8, radius: 16, bounds: { x: 33, y: 27 }, terrain: { base: 'sand', accent: 'sand_dark', path: 'dirt_path', edge: 'cliff_sand' }, road: [[[-30, 22], [-17, 13], [-4, 4], [10, -5], [29, -21]]], scenery: { border: ['rock_boulder_mossy', 'rock_cliff_crag'] } },
  arena: { id: 'arena', boss: true, name: 'Labyrinth Forest', subtitle: 'Baphomet awakens among the ruins', tier: 'BOSS · PARTY RECOMMENDED', color: '#807e95', monster: 'baphomet', count: 1, radius: 16, bounds: { x: 22, y: 20 }, terrain: { base: 'ruin_cobble', accent: 'cliff_rock', path: 'ruin_cobble', edge: 'cliff_rock' }, scenery: { border: ['standing_stone', 'rock_cliff_crag'] } },
};
MAPS.lair = { id: 'lair', boss: true, name: 'Sograt Desert · Phreeoni', subtitle: 'Phreeoni beneath the caravan road', tier: 'MVP · LV 18+', color: '#c38667', monster: 'phreeoni', count: 1, radius: 16, bounds: { x: 25, y: 23 }, terrain: { base: 'sand_dark', accent: 'sand', path: 'sand', edge: 'cliff_sand' }, scenery: { border: ['rock_cliff_crag', 'rock_boulder_mossy'] } };
export const mapBounds = mapId => MAPS[mapId]?.bounds || { x: 15, y: 15 };
export const JOBS = {
  novice: { name: 'Novice', native: 0, role: 'A new beginning', hp: 100, atk: 10, def: 1, range: 1.8, speed: 3.1, interval: 1.05, skill: 'First Aid', cost: 8, cooldown: 10, description: 'Recover your own HP. Learn the basics before choosing a path.' },
  swordsman: { name: 'Swordsman', native: 1, role: 'Frontline · protection', hp: 180, atk: 17, def: 5, range: 1.9, speed: 3.1, interval: 1.05, skill: 'Bash', cost: 7, cooldown: 5, description: 'A heavy strike that draws enemy attention.' },
  mage: { name: 'Mage', native: 2, role: 'Area damage · magic', hp: 100, atk: 21, def: 1, range: 6, speed: 3, interval: 1.5, skill: 'Fire Bolt', cost: 10, cooldown: 6, description: 'Strike a target and nearby enemies with fire.' },
  archer: { name: 'Archer', native: 3, role: 'Ranged · focus damage', hp: 120, atk: 16, def: 2, range: 7, speed: 3.4, interval: 0.9, skill: 'Double Strafe', cost: 8, cooldown: 5, description: 'Two quick arrows against a priority target.' },
  acolyte: { name: 'Acolyte', native: 4, role: 'Healing · support', hp: 135, atk: 12, def: 2, range: 4, speed: 3.1, interval: 1.1, skill: 'Heal', cost: 9, cooldown: 5, description: 'Restore the most injured party member; supports solo play too.' },
  merchant: { name: 'Merchant', native: 5, role: 'Sustain · supplies', hp: 155, atk: 15, def: 3, range: 1.8, speed: 3, interval: 1.1, skill: 'Mammonite', cost: 8, cooldown: 6, description: 'A forceful single-target strike. No currency cost in this prototype.' },
  thief: { name: 'Thief', native: 6, role: 'Melee · burst damage', hp: 125, atk: 16, def: 2, range: 1.8, speed: 4, interval: 0.75, skill: 'Envenom', cost: 7, cooldown: 5, description: 'A quick piercing strike against a single enemy.' },
};
const secondJobs = {
  knight: { parent: 'swordsman', native: 7, name: 'Knight', hp: 250, atk: 25, def: 8, skill: 'Brandish Spear', description: 'Sweep nearby enemies and draw them onto the Knight.', splash: 3.5, cost: 11 },
  priest: { parent: 'acolyte', native: 8, name: 'Priest', hp: 175, atk: 16, def: 4, skill: 'Sanctuary', description: 'Restore HP to injured party members within eight tiles.', cost: 15 },
  wizard: { parent: 'mage', native: 9, name: 'Wizard', hp: 135, atk: 29, def: 2, skill: 'Storm Gust', description: 'Blast a cluster around the target and delay their next attacks.', splash: 4, cost: 16 },
  blacksmith: { parent: 'merchant', native: 10, name: 'Blacksmith', hp: 210, atk: 23, def: 6, skill: 'Hammer Fall', description: 'Strike clustered foes and delay their next attacks. Forge gear for half the Zeny at camp.', splash: 2.5, cost: 11 },
  hunter: { parent: 'archer', native: 11, name: 'Hunter', hp: 155, atk: 22, def: 3, range: 8, skill: 'Blitz Beat', description: 'Your falcon strikes the target and up to two nearby enemies.', splash: 4, cost: 12 },
  assassin: { parent: 'thief', native: 12, name: 'Assassin', hp: 165, atk: 23, def: 4, skill: 'Sonic Blow', description: 'Burst down a single foe. Deals extra damage below half health.', cost: 12 },
};
for (const [id, job] of Object.entries(secondJobs)) JOBS[id] = { ...JOBS[job.parent], ...job };
const transcendent = {
  lordKnight: { parent:'knight', native:4008, name:'Lord Knight', hp:325, atk:34, def:12, splash:5, skill:'Spiral Pierce', description:'A sweeping spear strike draws enemies within five tiles.' },
  highPriest: { parent:'priest', native:4009, name:'High Priest', hp:220, atk:22, def:6, skill:'High Sanctuary', description:'Group healing also restores 5 SP to each injured ally.' },
  highWizard: { parent:'wizard', native:4010, name:'High Wizard', hp:172, atk:39, def:3, splash:5.5, description:'Amplified elemental spells hit a wider area and stagger foes.' },
  whitesmith: { parent:'blacksmith', native:4011, name:'Whitesmith', hp:265, atk:32, def:9, skill:'Cart Termination', description:'An empowered hammer strike staggers enemies for three seconds. Retains the camp forge discount.' },
  sniper: { parent:'hunter', native:4012, name:'Sniper', hp:195, atk:31, def:5, range:9, skill:'Falcon Assault', description:'Your falcon strikes the target and up to four nearby enemies.' },
  assassinCross: { parent:'assassin', native:4013, name:'Assassin Cross', hp:225, atk:31, def:6, skill:'Soul Breaker', description:'A finishing strike deals five times attack to enemies below half HP.' },
};
for (const [id, job] of Object.entries(transcendent)) JOBS[id] = { ...JOBS[job.parent], ...job, mastery: job.parent, tier: 'transcendent', jobLevelCap: 50 };
for (const [id, job] of Object.entries(RENEWAL_JOBS)) {
  const base = JOBS[job.parent];
  JOBS[id] = { ...base, ...job, parent: job.parent, jobLevelCap: job.tier.includes('Third') || job.tier === 'third' ? 70 : 50,
    mastery: job.tier === 'transcendent' ? job.parent : undefined };
}
const CLASS_FAMILY_FOR_JOB = {
  knight:'knight', lordKnight:'knight', runeKnight:'knight', crusader:'crusader', paladin:'crusader', royalGuard:'crusader',
  wizard:'wizard', highWizard:'wizard', warlock:'wizard', sage:'sage', professor:'sage', sorcerer:'sage',
  hunter:'hunter', sniper:'hunter', ranger:'hunter', bard:'bard', clown:'bard', minstrel:'bard', dancer:'dancer', gypsy:'dancer', wanderer:'dancer',
  priest:'priest', highPriest:'priest', archBishop:'priest', monk:'monk', champion:'monk', sura:'monk',
  blacksmith:'blacksmith', whitesmith:'blacksmith', mechanic:'blacksmith', alchemist:'alchemist', creator:'alchemist', genetic:'alchemist',
  assassin:'assassin', assassinCross:'assassin', guillotineCross:'assassin', rogue:'rogue', stalker:'rogue', shadowChaser:'rogue',
};
for (const [id, job] of Object.entries(JOBS)) {
  if (!job.tier) job.tier = id === 'novice' ? 'novice' : job.parent ? 'second' : 'first';
  if (!job.jobLevelCap) job.jobLevelCap = id === 'novice' ? 10 : 50;
  if (!job.family) job.family = CLASS_FAMILY_FOR_JOB[id] || (job.parent ? JOBS[job.parent]?.family || job.parent : id);
}
export const CLASS_BUILDS = BUILD_FAMILIES;
export const STATUS = STATUS_EFFECTS;
export const BASE_CLASS_PROFILE = {
  novice: { hp:100, atk:10, def:1, range:2, speed:3, interval:1.2, skill:'First Aid', cost:8, cooldown:10, description:'A flexible start; choose a role through job advancement.' },
  knight: { hp:250, atk:25, def:8, range:2, speed:3.1, interval:1.05, skill:'Pierce', cost:11, cooldown:5, description:'A durable melee striker who can draw monster focus.' },
  crusader: { hp:245, atk:22, def:12, range:2, speed:2.9, interval:1.15, skill:'Shield Charge', cost:12, cooldown:6, description:'A shield-bearing frontline protector.' },
  wizard: { hp:135, atk:29, def:2, range:6, speed:3, interval:1.5, skill:'Storm Gust', cost:16, cooldown:6, splash:4, description:'Elemental area spells with cast windows and crowd control.' },
  sage: { hp:155, atk:21, def:4, range:6, speed:3, interval:1.4, skill:'Dispell', cost:12, cooldown:6, description:'Elemental control and team enchantments.' },
  hunter: { hp:155, atk:22, def:3, range:8, speed:3.4, interval:.9, skill:'Focused Arrow Strike', cost:12, cooldown:5, splash:3, description:'Bow, traps, and falcon options.' },
  bard: { hp:145, atk:20, def:4, range:7, speed:3.2, interval:1, skill:'Arrow Vulcan', cost:12, cooldown:6, description:'Ranged damage and party songs.' },
  dancer: { hp:145, atk:20, def:4, range:7, speed:3.2, interval:1, skill:'Slinging Arrow', cost:12, cooldown:6, description:'Ranged control and party dances.' },
  priest: { hp:175, atk:16, def:4, range:4, speed:3.1, interval:1.1, skill:'Heal', cost:15, cooldown:5, description:'Healing, cleansing, buffs, and Holy damage.' },
  monk: { hp:195, atk:25, def:6, range:2, speed:3.4, interval:.9, skill:'Raging Trifecta Blow', cost:12, cooldown:5, description:'Spirit-sphere combos and powerful finishers.' },
  blacksmith: { hp:210, atk:23, def:6, range:2, speed:3, interval:1.1, skill:'Cart Termination', cost:11, cooldown:6, splash:2.5, description:'Heavy melee strikes, weapon buffs, and crafting.' },
  alchemist: { hp:200, atk:20, def:7, range:3, speed:2.9, interval:1.2, skill:'Acid Demonstration', cost:14, cooldown:7, description:'Companion support, potions, and reagent attacks.' },
  assassin: { hp:165, atk:23, def:4, range:2, speed:4, interval:.75, skill:'Sonic Blow', cost:12, cooldown:5, description:'Fast melee burst and poison pressure.' },
  rogue: { hp:165, atk:20, def:4, range:6, speed:3.5, interval:.9, skill:'Triangle Shot', cost:10, cooldown:5, description:'Bow kiting, copied skills, and disruptive debuffs.' },
};
for (const [id, definition] of Object.entries(RENEWAL_JOBS)) {
  Object.assign(JOBS[id], BASE_CLASS_PROFILE[definition.family] || {}, definition);
  JOBS[id].parent = definition.parent;
  JOBS[id].jobLevelCap = definition.tier.includes('Third') || definition.tier === 'third' ? 70 : 50;
  if (definition.tier === 'transcendent') JOBS[id].mastery = definition.parent;
  else delete JOBS[id].mastery;
}
const FAMILY_COMBAT_JOB = { knight:'knight', crusader:'crusader', wizard:'wizard', sage:'sage', hunter:'hunter', bard:'bard', dancer:'dancer', priest:'priest', monk:'monk', blacksmith:'blacksmith', alchemist:'alchemist', assassin:'assassin', rogue:'rogue' };
export function combatJob(job) { return JOBS[job]?.combat || JOBS[job]?.mastery || FAMILY_COMBAT_JOB[JOBS[job]?.family] || job; }
export function classBuilds(job) { return CLASS_BUILDS[JOBS[job]?.family] || CLASS_BUILDS[job] || []; }
export function defaultBuild(job) { return classBuilds(job)[0]?.id || null; }
export function selectedBuild(job, buildId) { return classBuilds(job).find(build => build.id === buildId) || classBuilds(job)[0] || null; }
export function promotionRequirement(job) {
  const tier = JOBS[job]?.tier;
  if (tier === 'novice') return { jobLevel:10, baseLevel:1 };
  if (tier === 'first' || tier === 'expanded') return { jobLevel:40, baseLevel:1 };
  if (tier === 'transcendent') return { jobLevel:50, baseLevel:99 };
  if (tier === 'second' || tier === 'expandedSecond') return { jobLevel:50, baseLevel:1 };
  if (tier === 'third' || tier === 'expandedThird') return { jobLevel:50, baseLevel:99 };
  return { jobLevel:Infinity, baseLevel:Infinity };
}
export function promotionLevel(job) { return promotionRequirement(job).jobLevel; }
export function jobLineage(job) {
  const path = [];
  while (job && job !== 'novice') {
    path.unshift(JOBS[job].name);
    job = JOBS[job].parent;
  }
  return ['Novice', ...path];
}
export function jobChoices(job) {
  return Object.entries(JOBS).filter(([id, data]) => id !== 'novice' && (data.parent || 'novice') === job);
}
export const FORGE = {
  reliquary: { zeny:240, materials:{ 'Decayed Nail':8, 'Skel-Bone':5, 'Peco Feather':4 } },
  dune: { zeny: 180, materials: { 'Scorpion Tail': 8, 'Peco Feather': 5, Resin: 4 } },
  iron: { zeny: 75, materials: { Jellopy: 12, Resin: 3 } },
  guard: { zeny: 60, materials: { Fluff: 6, Resin: 4 } },
};
export const MONSTERS = {
  zombie: { name: 'Zombie', sprite: '1015', hp: 320, atk: 31, def: 4, exp: 69, jobExp: 35, zeny: 25, material: 'Decayed Nail', speed: 1.2, range: 1.5, interval: 2 },
  skeleton: { name: 'Archer Skeleton', sprite: '1016', hp: 185, atk: 25, def: 2, exp: 65, jobExp: 38, zeny: 24, material: 'Skel-Bone', speed: 2, range: 7, interval: 1.7 },
  phreeoni: { name: 'Phreeoni', sprite: '1159', hp: 5100, atk: 33, def: 8, exp: 550, jobExp: 300, zeny: 700, material: 'Tongue of the Desert', speed: 1.8, range: 3.2, interval: 1.6 },
  scorpion: { name: 'Scorpion', sprite: '1001', hp: 175, atk: 24, def: 6, exp: 44, jobExp: 26, zeny: 20, material: 'Scorpion Tail', speed: 1.45, range: 2, interval: 2.4 },
  peco: { name: 'Peco Peco', sprite: '1019', hp: 210, atk: 16, def: 2, exp: 46, jobExp: 28, zeny: 22, material: 'Peco Feather', speed: 3.8, range: 1.7, interval: 1.2 },
  poring: { name: 'Poring', sprite: '1002', hp: 35, atk: 5, def: 0, exp: 10, jobExp: 7, zeny: 5, material: 'Jellopy', speed: 1.3, range: 1.5, interval: 1.8 },
  fabre: { name: 'Fabre', sprite: '1007', hp: 43, atk: 6, def: 1, exp: 12, jobExp: 8, zeny: 6, material: 'Fluff', speed: 1.2, range: 1.5, interval: 1.7 },
  willow: { name: 'Willow', sprite: '1010', hp: 120, atk: 13, def: 3, exp: 26, jobExp: 16, zeny: 13, material: 'Resin', speed: 1.6, range: 1.7, interval: 1.9 },
  baphomet: { name: 'Baphomet', sprite: '1039', hp: 2400, atk: 19, def: 5, exp: 220, jobExp: 100, zeny: 300, material: 'Sanctuary Sigil', speed: 1.6, range: 2.6, interval: 1.8 },
};
export const ELEMENTS = {
  holy: { name:'Holy', beats:'undead', acolyte:'Holy Light', priest:'Magnus Exorcismus' },
  fire: { name:'Fire', beats:'earth', mage:'Fire Bolt', wizard:'Meteor Storm' },
  water: { name:'Water', beats:'fire', mage:'Cold Bolt', wizard:'Storm Gust' },
  wind: { name:'Wind', beats:'water', mage:'Lightning Bolt', wizard:'Lord of Vermilion' },
  earth: { name:'Earth', beats:'wind', mage:'Stone Spike', wizard:'Heaven’s Drive' },
};
export const AFFINITIES = { zombie:'undead', skeleton:'undead', poring:'water', fabre:'earth', willow:'earth', peco:'fire', scorpion:'fire', phreeoni:'wind', baphomet:'neutral' };
export function spellElement(c) {
  const job = combatJob(c.job);
  if (job === 'acolyte' || job === 'priest') return c.element === 'holy' ? 'holy' : null;
  if (job !== 'mage' && job !== 'wizard') return null;
  return c.element || (job === 'mage' ? 'fire' : 'water');
}
// Extra attack elements exist only as damage types (poison/ghost), so they get
// their own beat table instead of a spellbook entry.
const EXTRA_BEATS = { poison: 'earth', ghost: 'ghost' };
export function affinityMultiplier(element, kind) {
  if (!element) return 1;
  const beats = ELEMENTS[element]?.beats ?? EXTRA_BEATS[element];
  if (!beats) return 1;
  if (beats === AFFINITIES[kind]) return 1.5;
  return element === AFFINITIES[kind] ? 0.75 : 1;
}
export const BOUNTIES = {
  crypt: { name: 'Silence the sentries', map:'payon', target:'skeleton', count:12, zeny:360, item:'guard' },
  harvest: { name: 'Jellopy harvest', map: 'meadow', target: 'poring', count: 12, zeny: 70, item: 'iron' },
  timber: { name: 'Willow patrol', map: 'forest', target: 'willow', count: 16, zeny: 160, item: 'guard' },
  caravan: { name: 'Caravan escort', map: 'morroc', target: 'scorpion', count: 20, zeny: 420, item: 'iron' },
};
export const ATTRIBUTES = {
  str: { name: 'Strength', effect: '+2 attack per point' },
  agi: { name: 'Agility', effect: '+1% basic attack rate per point' },
  vit: { name: 'Vitality', effect: '+10 max HP per point, +1 defense per 3 points' },
  int: { name: 'Intelligence', effect: '+4 max SP and faster SP recovery per point' },
  dex: { name: 'Dexterity', effect: '+2 skill damage or healing per point' },
  luk: { name: 'Luck', effect: '+1% chance per point for a 150% basic attack' },
};
export const ATTRIBUTE_CAP = 60;
export const CARDS = {
  skeleton: { name:'Archer Skeleton Card', description:'+8 ATK', atk:8, def:0 },
  phreeoni: { name: 'Phreeoni Card', description: '+4 ATK · +3 DEF', atk: 4, def: 3 },
  scorpion: { name: 'Scorpion Card', description: '+6 ATK', atk: 6, def: 0 },
  peco: { name: 'Peco Peco Card', description: '+4 DEF', atk: 0, def: 4 },
};
export const ORE_INFO = {
  Emveretarcon: { description: 'Payon refinement ore used for the first three ranks.' },
  Elunium: { description: 'A defensive refinement ore found in Payon Cave.' },
  Oridecon: { description: 'A weapon refinement ore found in Payon Cave.' },
};
export const REFINEMENT = [null,
  { material: 'Emveretarcon', ore: 2, zeny: 60 },
  { material: 'Emveretarcon', ore: 4, zeny: 140 },
  { material: 'Emveretarcon', ore: 7, zeny: 300 },
  { material: null, ore: 1, zeny: 500 },
  { material: null, ore: 2, zeny: 900 },
];
export function gearKey(item, card, rank) {
  if (rank) return item + '/' + (card || '') + '/' + rank;
  return card ? item + '/' + card : item;
}
export function gearVariant(key) {
  const [item, card, rank] = key.split('/');
  return { item, card:card || null, rank:rank === undefined ? 0 : Number(rank) };
}
export const EQUIPMENT = {
  reliquary: { name:'Payon reliquary', atk:3, def:6, refineMaterial:'Elunium', description:'+3 attack · +6 defense · a feather-bound ward from Payon Cave.' },
  dune: { name: 'Caravan brooch', atk: 6, def: 2, refineMaterial:'Oridecon', description: '+6 attack · +2 defense · forged from Sograt Desert and Payon Forest materials.' },
  training: { name: 'Training weapon', atk: 0, def: 0, description: 'A dependable first companion.' },
  iron: { name: 'Iron armament', atk: 5, def: 0, refineMaterial:'Oridecon', description: '+5 attack · suitable for every first job.' },
  guard: { name: 'Guard insignia', atk: 1, def: 3, refineMaterial:'Elunium', description: '+1 attack · +3 defense.' },
  sanctuary: { name: 'Sanctuary relic', atk: 9, def: 2, refineMaterial:'Oridecon', description: '+9 attack · +2 defense · earned from Baphomet.' },
};
// Curated Renewal equipment records; item base values are sourced from the pinned rAthena data snapshot.
export const GEAR_SLOTS = { weapon:'Weapon', armor:'Armor', shield:'Shield', head:'Headgear', garment:'Garment', footwear:'Footwear', accessory1:'Accessory I', accessory2:'Accessory II' };
export function gearFitsSlot(item, slot) { return item?.slot === slot || (item?.slot?.startsWith('accessory') && slot?.startsWith('accessory')); }
export const GEAR_ITEMS = {
  knife:{name:'Knife',roId:1201,slot:'weapon',kind:'Dagger',atk:17,weaponLevel:1,range:1,slots:3,weight:40,buy:50,equipLevel:1,refineable:true,classes:['novice','swordsman','mage','archer','merchant','thief','alchemist','assassin','blacksmith','crusader','knight','rogue','hunter','bard','dancer','ninja','kagerou','oboro','soul_linker']},
  sword:{name:'Sword',roId:1101,slot:'weapon',kind:'One-Handed Sword',atk:25,weaponLevel:1,range:1,slots:3,weight:50,buy:100,equipLevel:2,refineable:true,classes:['novice','swordsman','knight','crusader','merchant','thief']},
  bow:{name:'Bow',roId:1702,slot:'weapon',kind:'Bow',atk:15,weaponLevel:1,range:5,slots:4,weight:50,buy:1000,equipLevel:4,refineable:true,classes:['archer','hunter','bard','dancer','thief','rogue']},
  rod:{name:'Rod',roId:1602,slot:'weapon',kind:'Rod',atk:15,matk:30,weaponLevel:1,range:1,slots:4,weight:40,buy:50,equipLevel:1,refineable:true,classes:['novice','mage','acolyte','monk','priest','sage','soul_linker']},
  mace:{name:'Club',roId:1501,slot:'weapon',kind:'Mace',atk:23,weaponLevel:1,range:1,slots:3,weight:70,buy:120,equipLevel:2,refineable:true,classes:['novice','swordsman','acolyte','merchant','knight','crusader','monk','priest','blacksmith','alchemist']},
  cotton_shirt:{name:'Cotton Shirt',roId:2301,slot:'armor',def:10,armorLevel:1,slots:0,weight:10,buy:10,refineable:true},
  silk_robe:{name:'Silk Robe',roId:2321,slot:'armor',def:20,mdef:10,armorLevel:1,slots:0,weight:40,buy:8000,refineable:true,classes:['novice','swordsman','mage','acolyte','merchant','knight','crusader','wizard','sage','priest','monk','blacksmith','alchemist','soul_linker']},
  adventurer_suit:{name:'Jacket',roId:2303,slot:'armor',def:15,armorLevel:1,slots:0,weight:20,buy:200,refineable:true},
  full_plate:{name:'Chain Mail',roId:2314,slot:'armor',def:55,armorLevel:1,slots:0,weight:330,buy:65000,refineable:true,classes:['swordsman','knight','crusader','merchant']},
  guard:{name:'Guard',roId:2101,slot:'shield',def:20,armorLevel:1,slots:0,weight:30,buy:500,refineable:true},
  buckler:{name:'Guard',roId:2102,slot:'shield',def:20,armorLevel:1,slots:1,weight:30,buy:500,refineable:true},
  cap:{name:'Sunglasses',roId:2201,slot:'head',blindRes:5,armorLevel:1,slots:0,weight:10,buy:5000,refineable:false},
  circlet:{name:'Gemmed Sallet',roId:2230,slot:'head',def:8,mdef:3,armorLevel:1,slots:0,weight:50,buy:50000,refineable:true,classes:['swordsman','merchant','thief','knight','crusader','assassin','rogue','blacksmith','alchemist']},
  hood:{name:'Hood',roId:2501,slot:'garment',def:4,armorLevel:1,slots:0,weight:20,buy:1000,refineable:true},
  muffler:{name:'Muffler',roId:2503,slot:'garment',def:8,armorLevel:1,slots:0,weight:40,buy:5000,refineable:true},
  sandal:{name:'Sandals',roId:2401,slot:'footwear',def:5,armorLevel:1,slots:0,weight:20,buy:400,refineable:true},
  boots:{name:'Shoes',roId:2403,slot:'footwear',def:10,armorLevel:1,slots:0,weight:40,buy:3500,refineable:true},
  clip:{name:'Clip',roId:2607,slot:'accessory1',sp:10,armorLevel:1,slots:1,weight:10,buy:30000,refineable:false},
  rosary:{name:'Rosary',roId:2608,slot:'accessory2',mdef:5,luk:2,armorLevel:1,slots:0,weight:10,buy:15000,equipLevel:20,refineable:false,excluded:['novice']},
  glove:{name:'Glove',roId:2604,slot:'accessory1',dex:2,armorLevel:1,slots:0,weight:10,buy:30000,equipLevel:20,refineable:false,excluded:['novice']},
  ring:{name:'Ring',roId:2601,slot:'accessory2',str:2,armorLevel:1,slots:0,weight:10,buy:30000,equipLevel:20,refineable:false,excluded:['novice']},
};
// The wider shop inventory: real Ragnarok Online items whose stats are read
// straight from rAthena's renewal item database and whose shop icons are the
// client's own item art (scripts/build_gear_catalog.py + import_equipment_icons.py).
// Keys stay stable because saves store item ids.
const CATALOG = typeof GEAR_CATALOG === 'object' ? GEAR_CATALOG : {};
export const GEAR_ITEMS_CORE = { ...GEAR_ITEMS };
export const GEAR_SHOP = Array.isArray(GEAR_SHOP_KEYS) ? GEAR_SHOP_KEYS : Object.keys(CATALOG);
for (const [roId, item] of Object.entries(CATALOG)) {
  const key = item.key || ('ro_' + roId);
  if (GEAR_ITEMS[key]) continue;
  const entry = { ...item, roId: Number(roId) };
  delete entry.key;
  GEAR_ITEMS[key] = entry;
}
export function gearIconPath(item) {
  if (!item?.roId) return null;
  return '/assets/equipment-icons/' + item.roId + '.png';
}
export const GEAR_AFFIXES = {
  mighty:{name:'Mighty',stat:'atk',min:2,max:8,slots:['weapon']},arcane:{name:'Arcane',stat:'matk',min:3,max:10,slots:['weapon','accessory1','accessory2']},
  sturdy:{name:'Sturdy',stat:'def',min:1,max:5,slots:['armor','shield','head','garment','footwear']},vital:{name:'Vital',stat:'hp',min:12,max:55,slots:['armor','shield','head','garment','footwear','accessory1','accessory2']},
  focused:{name:'Focused',stat:'crit',min:1,max:4,slots:['weapon','head','accessory1','accessory2']},swift:{name:'Swift',stat:'speed',min:1,max:4,slots:['weapon','garment','footwear','accessory1','accessory2']},
  wise:{name:'Wise',stat:'sp',min:8,max:30,slots:['head','armor','accessory1','accessory2']},keen:{name:'Keen',stat:'skill',min:2,max:8,slots:['weapon','head','accessory1','accessory2']},
};
export const REFINE_SAFE_LIMIT = {1:7,2:6,3:5,4:4,armor:4};
const NORMAL_REFINE_RATES = {1:[0,100,100,100,100,100,100,100,60,40,19],2:[0,100,100,100,100,100,100,60,40,20,19],3:[0,100,100,100,100,100,60,50,20,20,19],4:[0,100,100,100,60,40,40,20,20,9],armor:[0,100,100,100,100,60,40,40,20,20,9]};
export function refineSafeLimit(item){return item?.slot==='weapon'?REFINE_SAFE_LIMIT[item.weaponLevel]??4:REFINE_SAFE_LIMIT.armor;}
export function refineSuccessPercent(item,currentRefine){const target=currentRefine+1;if(!item?.refineable||target>20||target<1)return 0;if(target<=10)return NORMAL_REFINE_RATES[item.slot==='weapon'?item.weaponLevel:'armor']?.[target]??0;const level=item.slot==='weapon'?item.weaponLevel:'armor';if(target<=14)return level===4||level==='armor'?8:18;if(target<=18)return level===4||level==='armor'?7:17;return level===4||level==='armor'?5:15;}
export function refineCost(item,currentRefine){if(currentRefine>=10)return{zeny:100000,material:item.slot==='weapon'?'bradium':'carnium',amount:1};if(item.slot!=='weapon')return{zeny:2000,material:'elunium',amount:1};const costs={1:[50,'phracon'],2:[200,'emveretarcon'],3:[5000,'oridecon'],4:[20000,'oridecon']};const[zeny,material]=costs[item.weaponLevel]||costs[4];return{zeny,material,amount:1};}
export const ITEMS = { red_potion:{name:'Red Potion',type:'consumable',description:'Recover HP when used.',effect:'hp',amount:65,roId:501},blue_potion:{name:'Blue Potion',type:'consumable',description:'Recover SP when used.',effect:'sp',amount:45,roId:505},phracon:{name:'Phracon',type:'refining ore',roId:1010},emveretarcon:{name:'Emveretarcon',type:'refining ore',roId:1011},oridecon:{name:'Oridecon',type:'refining ore',roId:984},elunium:{name:'Elunium',type:'refining ore',roId:985},bradium:{name:'Bradium',type:'refining ore',roId:6224},carnium:{name:'Carnium',type:'refining ore',roId:6223}};
// Field techniques are additional active skills. The existing class build
// supplies slot one. Each eligible class keeps its techniques after promotion.
export const FIRST_JOB_KIT = {
  swordsman:'sword', archer:'bow', mage:'rod', acolyte:'mace', merchant:'mace', thief:'knife',
};
// Hotbar "field skills" are the classic first-job techniques, drawn from the
// learnable catalog so there is one source of truth for costs and effects.
// `levels` are the job levels at which each rank unlocks.
// The hotbar predates the catalog and keeps its own (cheaper) costs so existing
// saves and muscle memory still work; everything else comes from the catalog.
const FIELD_COSTS = { provoke:[5,8], magnum_break:[10,9], endure:[8,12], arrow_shower:[9,7], double_strafe:[7,4], improve_concentration:[8,14], frost_diver:[9,9], fire_ball:[12,8], cold_bolt:[9,5], blessing:[9,12], heal:[11,10], holy_light:[10,5], cart_revolution:[9,8], mammonite:[8,5], pushcart:[8,12], envenom:[6,8], sand_attack:[5,8], hiding:[6,14] };
function fieldBoard(ids) {
  const board = {};
  for (const id of ids) {
    const [sp, time] = FIELD_COSTS[id] || [SKILLS[id].sp, SKILLS[id].cooldown];
    board[id] = { ...SKILLS[id], sp, levels: SKILLS[id].unlock, time, text: SKILLS[id].desc };
  }
  return board;
}
export const FIELD_SKILLS = {
  ...fieldBoard(['provoke', 'magnum_break', 'endure']),
  ...fieldBoard(['arrow_shower', 'double_strafe', 'improve_concentration']),
  ...fieldBoard(['frost_diver', 'fire_ball', 'cold_bolt']),
  ...fieldBoard(['blessing', 'heal', 'holy_light']),
  ...fieldBoard(['cart_revolution', 'mammonite', 'pushcart']),
  ...fieldBoard(['envenom', 'sand_attack', 'hiding']),
};
// Legacy alias map: the hotbar board kept its own ids for these techniques.
export const FIELD_SKILL_ALIASES = { magnum: 'magnum_break', bless: 'blessing', mend: 'heal', cart: 'cart_revolution', rallyCry: 'volunteer', venom: 'envenom', snare: 'ankle_snare' };
export function fieldSkillAvailable(job, id) {
  const canonical = FIELD_SKILL_ALIASES[id] || id;
  return Object.hasOwn(FIELD_SKILLS, canonical) && canLearnSkillFor(job, canonical);
}
// Skill catalog, flourishes and helpers live in their own modules; re-exported
// here so the rest of the game keeps importing a single data surface.
export { SKILLS, SKILL_BUILDS } from './skills-catalog.js';
export {
  FX_IDS, skillDef, skillMaxRank, skillUnlockLevel, skillFamily, skillCatalog,
  activeSlots, activeSkillList, ACTIVE_SLOTS, learnedPassive,
  jobSkills, canLearnSkill, learnedRank, skillMultiplier, learnedSkillPower,
  activeSkillId, activeSkill, signatureSkillId, defaultSkills, skillSp,
  skillCooldown, skillPower, rankValue, skillPoints, passiveBonus, prereqMet,
  missingPrereqs, buildRotation, jobChain, jobTier,
} from './skills.js';

export const TACTICS = {
  safe: { name: 'Safe farming', retreat: 0.22, skill: true },
  aggressive: { name: 'Aggressive', retreat: 0.1, skill: true },
  conserve: { name: 'Conserve SP', retreat: 0.25, skill: false },
};
// Per-character tactics. A preset is a starting point; the detailed fields below
// are what the simulation actually reads. Thresholds are HP fractions (0–0.95).
export const TACTIC_PRESETS = {
  safe: { autoSkill: true, healAt: 0.65, potionAt: 0.45, retreatAt: 0.22, targetPref: 'leader' },
  aggressive: { autoSkill: true, healAt: 0.5, potionAt: 0.3, retreatAt: 0.1, targetPref: 'nearest' },
  conserve: { autoSkill: false, healAt: 0.65, potionAt: 0.45, retreatAt: 0.25, targetPref: 'leader' },
};
export const TARGET_PREFS = {
  nearest: 'Nearest enemy',
  leader: 'Assist party leader',
  lowest: 'Lowest HP (focus fire)',
};
export const JOB_ROLES = {
  novice: 'frontline', swordsman: 'frontline', merchant: 'frontline', thief: 'frontline',
  mage: 'ranged', archer: 'ranged', acolyte: 'support',
};
for (const [id, job] of Object.entries(secondJobs)) JOB_ROLES[id] = JOB_ROLES[job.parent];
for (const [id, job] of Object.entries(transcendent)) JOB_ROLES[id] = JOB_ROLES[job.parent];
for (const [id, job] of Object.entries(RENEWAL_JOBS)) JOB_ROLES[id] = job.role === 'support' ? 'support' : job.role === 'ranged' ? 'ranged' : 'frontline';
export const ROLE_LABELS = {
  frontline: 'Frontline — approaches and engages',
  ranged: 'Ranged — keeps attack distance',
  support: 'Support — stays near the party',
};
export const baseNeed = level => 24 + level * 18;
export const jobNeed = level => 8 + level * 3;

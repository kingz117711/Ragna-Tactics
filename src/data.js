export const HUNT_RADII = [3, 6, 10];
export const DEFAULT_HUNT_RADIUS = 6;
export const VERSION = 1;
export const STEP = 0.1;
export const OFFLINE_CAP = 4 * 60 * 60;
export const MAPS = {
  meadow: { id: 'meadow', name: 'South Prontera', subtitle: 'A quiet beginning', tier: 'FIELD · LV 1–4', color: '#91b27d', monster: 'poring', count: 8, radius: 16 },
  forest: { id: 'forest', name: 'Willow Wood', subtitle: 'Beyond the familiar paths', tier: 'FIELD · LV 4–8', color: '#698a7b', monster: 'willow', count: 7, radius: 16 },
  payon: { id: 'payon', name: 'Payon Cave', subtitle: 'Lanterns beneath the eastern ridge', tier: 'DUNGEON · LV 12–18', color: '#a49bb9', monster: 'zombie', count: 8, radius: 16 },
  morroc: { id: 'morroc', name: 'Morroc Dunes', subtitle: 'The southern caravan road', tier: 'FIELD · LV 8–14', color: '#cba976', monster: 'scorpion', count: 8, radius: 16 },
  arena: { id: 'arena', boss: true, name: 'The Broken Sanctuary', subtitle: 'Something stirs beneath the ruins', tier: 'BOSS · PARTY RECOMMENDED', color: '#807e95', monster: 'baphomet', count: 1, radius: 16 },
};
MAPS.lair = { id: 'lair', boss: true, name: 'Sandsea Hollow', subtitle: 'Beneath the caravan road', tier: 'MVP · LV 18+', color: '#c38667', monster: 'phreeoni', count: 1, radius: 16 };
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
export function promotionLevel(job) { return job === 'novice' ? 10 : JOBS[job].parent ? Infinity : 40; }
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
  if (c.job === 'acolyte' || c.job === 'priest') return c.element === 'holy' ? 'holy' : null;
  if (c.job !== 'mage' && c.job !== 'wizard') return null;
  return c.element || (c.job === 'mage' ? 'fire' : 'water');
}
export function affinityMultiplier(element, kind) {
  if (!element) return 1;
  if (ELEMENTS[element].beats === AFFINITIES[kind]) return 1.5;
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
export const EQUIPMENT = {
  reliquary: { name:'Payon reliquary', atk:3, def:6, description:'+3 attack · +6 defense · a feather-bound ward from Payon Cave.' },
  dune: { name: 'Caravan brooch', atk: 6, def: 2, description: '+6 attack · +2 defense · forged from Morroc and Willow Wood materials.' },
  training: { name: 'Training weapon', atk: 0, def: 0, description: 'A dependable first companion.' },
  iron: { name: 'Iron armament', atk: 5, def: 0, description: '+5 attack · suitable for every first job.' },
  guard: { name: 'Guard insignia', atk: 1, def: 3, description: '+1 attack · +3 defense.' },
  sanctuary: { name: 'Sanctuary relic', atk: 9, def: 2, description: '+9 attack · +2 defense · earned from Baphomet.' },
};
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
export const ROLE_LABELS = {
  frontline: 'Frontline — approaches and engages',
  ranged: 'Ranged — keeps attack distance',
  support: 'Support — stays near the party',
};
export const baseNeed = level => 24 + level * 18;
export const jobNeed = level => 8 + level * 3;

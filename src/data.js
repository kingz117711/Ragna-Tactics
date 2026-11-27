export const VERSION = 1;
export const STEP = 0.1;
export const OFFLINE_CAP = 4 * 60 * 60;
export const MAPS = {
  meadow: { id: 'meadow', name: 'South Prontera', subtitle: 'A quiet beginning', tier: 'FIELD · LV 1–4', color: '#91b27d', monster: 'poring', count: 8, radius: 16 },
  forest: { id: 'forest', name: 'Willow Wood', subtitle: 'Beyond the familiar paths', tier: 'FIELD · LV 4–8', color: '#698a7b', monster: 'willow', count: 7, radius: 16 },
  arena: { id: 'arena', name: 'The Broken Sanctuary', subtitle: 'Something stirs beneath the ruins', tier: 'BOSS · PARTY RECOMMENDED', color: '#807e95', monster: 'baphomet', count: 1, radius: 16 },
};
export const JOBS = {
  novice: { name: 'Novice', native: 0, role: 'A new beginning', hp: 100, atk: 10, def: 1, range: 1.8, speed: 3.1, interval: 1.05, skill: 'First Aid', cost: 8, cooldown: 10, description: 'Recover your own HP. Learn the basics before choosing a path.' },
  swordsman: { name: 'Swordsman', native: 1, role: 'Frontline · protection', hp: 180, atk: 17, def: 5, range: 1.9, speed: 3.1, interval: 1.05, skill: 'Bash', cost: 7, cooldown: 5, description: 'A heavy strike that draws enemy attention.' },
  mage: { name: 'Mage', native: 2, role: 'Area damage · magic', hp: 100, atk: 21, def: 1, range: 6, speed: 3, interval: 1.5, skill: 'Fire Bolt', cost: 10, cooldown: 6, description: 'Strike a target and nearby enemies with fire.' },
  archer: { name: 'Archer', native: 3, role: 'Ranged · focus damage', hp: 120, atk: 16, def: 2, range: 7, speed: 3.4, interval: 0.9, skill: 'Double Strafe', cost: 8, cooldown: 5, description: 'Two quick arrows against a priority target.' },
  acolyte: { name: 'Acolyte', native: 4, role: 'Healing · support', hp: 135, atk: 12, def: 2, range: 4, speed: 3.1, interval: 1.1, skill: 'Heal', cost: 9, cooldown: 5, description: 'Restore the most injured party member; supports solo play too.' },
  merchant: { name: 'Merchant', native: 5, role: 'Sustain · supplies', hp: 155, atk: 15, def: 3, range: 1.8, speed: 3, interval: 1.1, skill: 'Mammonite', cost: 8, cooldown: 6, description: 'A forceful single-target strike. No currency cost in this prototype.' },
  thief: { name: 'Thief', native: 6, role: 'Melee · burst damage', hp: 125, atk: 16, def: 2, range: 1.8, speed: 4, interval: 0.75, skill: 'Envenom', cost: 7, cooldown: 5, description: 'A quick piercing strike against a single enemy.' },
};
export const MONSTERS = {
  poring: { name: 'Poring', sprite: '1002', hp: 35, atk: 5, def: 0, exp: 10, jobExp: 7, zeny: 5, material: 'Jellopy', speed: 1.3, range: 1.5, interval: 1.8 },
  fabre: { name: 'Fabre', sprite: '1007', hp: 43, atk: 6, def: 1, exp: 12, jobExp: 8, zeny: 6, material: 'Fluff', speed: 1.2, range: 1.5, interval: 1.7 },
  willow: { name: 'Willow', sprite: '1010', hp: 120, atk: 13, def: 3, exp: 26, jobExp: 16, zeny: 13, material: 'Resin', speed: 1.6, range: 1.7, interval: 1.9 },
  baphomet: { name: 'Baphomet', sprite: '1039', hp: 2400, atk: 19, def: 5, exp: 220, jobExp: 100, zeny: 300, material: 'Sanctuary Sigil', speed: 1.6, range: 2.6, interval: 1.8 },
};
export const EQUIPMENT = {
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
export const baseNeed = level => 24 + level * 18;
export const jobNeed = level => 8 + level * 3;

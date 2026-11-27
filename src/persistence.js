import { ELEMENTS, BOUNTIES, ATTRIBUTES, ATTRIBUTE_CAP, CARDS, MONSTERS, HUNT_RADII, VERSION, MAPS, JOBS, EQUIPMENT, TACTICS, TACTIC_PRESETS, TARGET_PREFS } from './data.js';
import { availablePoints, populateField, createGame, advanceExpeditionGoals } from './sim.js';
export const SAVE_KEY = 'ragna-tactics:save:v1';
export const BACKUP_KEY = 'ragna-tactics:backup:v1';
const finite = (v, low = 0, high = 1e12) => typeof v === 'number' && Number.isFinite(v) && v >= low && v <= high;
const text = (v, max = 100) => typeof v === 'string' && v.length <= max;
const coordinate = v => v && finite(v.x, -30, 30) && finite(v.y, -30, 30);
const own = (o, key) => typeof key === 'string' && Object.hasOwn(o, key);
const valid = condition => { if (!condition) throw new Error('This save is invalid or uses an unsupported format.'); };

export function validateState(s) {
  valid(s && s.version === VERSION && s.ownerId === 'local-player');
  valid(Number.isInteger(s.seed) && finite(s.seed, 0, 4294967295) && finite(s.time) && Number.isSafeInteger(s.nextId) && s.nextId > 0);
  valid(Array.isArray(s.characters) && s.characters.length >= 2 && s.characters.length <= 5);
  if (s.bounty != null) valid(own(BOUNTIES,s.bounty.id) && Number.isInteger(s.bounty.kills) && finite(s.bounty.kills,0,BOUNTIES[s.bounty.id].count));
  const ids = new Set();
  for (const c of s.characters) {
    valid(c && /^c[1-5]$/.test(c.id) && !ids.has(c.id)); ids.add(c.id);
    valid(c.ownerId === s.ownerId && text(c.name, 20) && c.name.trim().length && ['m', 'f'].includes(c.sex));
    valid(own(JOBS, c.job) && own(EQUIPMENT, c.equipment) && own(TACTICS, c.tactic));
    valid(c.element === undefined || (own(ELEMENTS,c.element) && own(ELEMENTS[c.element],c.job)));
    valid(c.card == null || (c.equipment !== 'training' && own(CARDS, c.card)));
    // Schema-v1 saves predate per-character tactics; derive their settings from the saved preset.
    c.tactics = { ...TACTIC_PRESETS[c.tactic], ...(c.tactics || {}) };
    valid(typeof c.tactics.autoSkill === 'boolean');
    for (const key of ['healAt', 'potionAt', 'retreatAt']) valid(finite(c.tactics[key], 0, 0.95));
    valid(own(TARGET_PREFS, c.tactics.targetPref));
    valid(c.mapId === null || own(MAPS, c.mapId));
    valid(c.partyId === null || /^p\d+$/.test(c.partyId));
    valid(Number.isInteger(c.level) && finite(c.level, 1, 99) && Number.isInteger(c.jobLevel) && finite(c.jobLevel, 1, c.job === 'novice' ? 10 : 50));
    valid(coordinate(c) && coordinate(c.home) && (c.destination === null || coordinate(c.destination)));
    valid(c.farmRadius === undefined || HUNT_RADII.includes(c.farmRadius));
    valid(c.farmCenter === undefined || coordinate(c.farmCenter));
    valid(['farm', 'move', 'hold', 'focus', 'retreat'].includes(c.order));
    valid(['camp', 'down', 'farming', 'fighting', 'moving', 'holding', 'searching', 'retreating'].includes(c.status));
    valid(['balanced', 'experience', 'materials'].includes(c.assignment));
    valid(c.targetId === null || /^m\d+$/.test(c.targetId));
    valid(['idle', 'walk', 'attack'].includes(c.stance) && Number.isInteger(c.direction) && finite(c.direction, 0, 7));
    for (const key of ['exp', 'jobExp', 'hp', 'sp', 'cooldown', 'attackTimer', 'attackFlash', 'potions', 'kills', 'earned']) valid(finite(c[key]));
    if (c.attributes !== undefined) {
      valid(c.attributes && typeof c.attributes === 'object' && !Array.isArray(c.attributes));
      for (const [id, count] of Object.entries(c.attributes)) valid(own(ATTRIBUTES,id) && Number.isInteger(count) && finite(count,0,ATTRIBUTE_CAP));
      valid(availablePoints(c) >= 0);
    }
    valid(c.hp <= 2600 && c.sp <= 1000 && c.potions <= 1000);
  }
  valid(Array.isArray(s.parties) && s.parties.length <= 2);
  const parties = new Set();
  for (const p of s.parties) {
    valid(/^p\d+$/.test(p.id) && !parties.has(p.id) && text(p.name) && ids.has(p.leaderId)); parties.add(p.id);
    valid(s.characters.filter(c => c.partyId === p.id).length >= 2 && s.characters.find(c => c.id === p.leaderId).partyId === p.id);
  }
  for (const c of s.characters) valid(!c.partyId || parties.has(c.partyId));
  const monsterIds = new Set();
  for (const key of Object.keys(MAPS)) {
    if (['morroc','lair','payon'].includes(key) && s.maps && !Object.hasOwn(s.maps, key)) continue;
    const m = s.maps?.[key]; valid(m && m.id === key && Array.isArray(m.monsters) && m.monsters.length <= 30);
    valid(finite(m.bossTimer, -1, 100) && typeof m.bossDefeated === 'boolean');
    valid(m.telegraph === null || (coordinate(m.telegraph) && finite(m.telegraph.radius, 0, 10) && finite(m.telegraph.remaining, -1, 10) && finite(m.telegraph.duration, 0.1, 10)));
    if (m.lastGather !== undefined) valid(key === 'lair' && typeof m.lastGather === 'boolean');
    if (m.telegraph?.markedId !== undefined) valid(key === 'lair' && ids.has(m.telegraph.markedId));
    if (m.telegraph?.innerRadius !== undefined) valid(finite(m.telegraph.innerRadius, 0, m.telegraph.radius));
    for (const enemy of m.monsters) {
      valid(/^m\d+$/.test(enemy.id) && !monsterIds.has(enemy.id)); monsterIds.add(enemy.id);
      valid(own(MONSTERS, enemy.kind) && enemy.mapId === key && coordinate(enemy));
      valid(finite(enemy.hp, -10000, 10000) && finite(enemy.timer, -10, 100) && finite(enemy.respawn, -1, 100));
      valid(enemy.targetId === null || ids.has(enemy.targetId));
      valid(['idle', 'walk', 'attack'].includes(enemy.stance) && Number.isInteger(enemy.direction) && finite(enemy.direction, 0, 7));
      valid(finite(enemy.attackFlash, 0, 2));
    }
  }
  valid(s.inventory && finite(s.inventory.zeny) && s.inventory.materials && typeof s.inventory.materials === 'object' && !Array.isArray(s.inventory.materials));
  for (const [key, value] of Object.entries(s.inventory.materials || {})) valid(Object.values(MONSTERS).some(monster => monster.material === key) && Number.isInteger(value) && finite(value));
  if (s.inventory.equipment && s.inventory.equipment.dune === undefined) s.inventory.equipment.dune = 0;
  if (s.inventory.equipment && s.inventory.equipment.reliquary === undefined) s.inventory.equipment.reliquary = 0;
  for (const key of ['reliquary', 'dune', 'iron', 'guard', 'sanctuary']) valid(Number.isInteger(s.inventory.equipment?.[key]) && finite(s.inventory.equipment[key]));
  for (const key of ['bossKills', 'forestKills']) valid(Number.isInteger(s.milestones?.[key]) && finite(s.milestones[key]));
  // New tutorial progress is optional in old v1 envelopes; infer forward from current state.
  if (s.milestones.expeditionStep === undefined) {
    const starters = s.characters.filter(c => ['c1', 'c2'].includes(c.id));
    const deployedBefore = starters.length === 2 && (starters.every(c => !!c.mapId) || starters.every(c => c.kills > 0 || s.journal.some(e => /deployed to/.test(e.message) && e.message.includes(c.name))));
    const readyBefore = starters.length === 2 && starters.every(c => c.job !== 'novice' || c.jobLevel >= 10) || s.journal.filter(e => /can now choose a first job/.test(e.message)).length >= 2;
    const jobBefore = starters.length === 2 && starters.every(c => c.job !== 'novice');
    const partyBefore = s.parties.some(p => {
      const members = s.characters.filter(c => c.partyId === p.id);
      return members.length >= 2 && members.every(c => c.potions >= 5);
    });
    let step = Number(deployedBefore);
    if (step >= 1 && readyBefore) step = 2;
    if (step >= 2 && jobBefore) step = 3;
    if (step >= 3 && partyBefore) step = 4;
    if (step >= 4 && s.milestones.bossKills > 0) step = 5;
    if (step >= 5 && s.characters.length >= 3) step = 6;
    s.milestones.expeditionStep = step;
  }
  valid(Number.isInteger(s.milestones.expeditionStep) && finite(s.milestones.expeditionStep, 0, 6));
  valid(s.milestones.enemiesDefeated === undefined || (Number.isSafeInteger(s.milestones.enemiesDefeated) && finite(s.milestones.enemiesDefeated)));
  valid(Array.isArray(s.journal) && s.journal.length <= 35 && s.journal.every(e => Number.isSafeInteger(e.id) && finite(e.time) && text(e.message, 500)));
  valid(s.nextId > Math.max(0, ...[...monsterIds, ...parties].map(id => Number(id.slice(1))), ...s.journal.map(e => e.id)));
  for (const key of ['morroc','lair','payon']) if (!s.maps[key]) populateField(s, MAPS[key]);
  for (const field of ['cards', 'socketed']) {
    if (s.inventory[field] === undefined) s.inventory[field] = {};
    const stock = s.inventory[field];
    valid(stock && typeof stock === 'object' && !Array.isArray(stock));
    for (const [key, count] of Object.entries(stock)) {
      const [item, card] = key.split('/');
      valid(field === 'cards' ? own(CARDS, key) : item !== 'training' && own(EQUIPMENT, item) && own(CARDS, card) && key === item + '/' + card);
      valid(Number.isSafeInteger(count) && finite(count));
    }
  }
  s.effects = []; // Transient effects never survive loading.
  advanceExpeditionGoals(s);
  return s;
}
export function encodeSave(state, now = Date.now()) {
  return JSON.stringify({ format: 'ragna-tactics', version: VERSION, savedAt: now, state: { ...state, effects: [] } });
}
export function decodeSave(raw, now = Date.now()) {
  valid(typeof raw === 'string' && raw.length <= 2_000_000);
  const envelope = JSON.parse(raw);
  valid(envelope.format === 'ragna-tactics' && envelope.version === VERSION && finite(envelope.savedAt, 0, 1e15));
  return { state: validateState(envelope.state), elapsed: Math.max(0, (now - envelope.savedAt) / 1000), savedAt: envelope.savedAt };
}
export function loadGame(storage, now = Date.now()) {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return { state: createGame(), elapsed: 0, fresh: true };
  try { return decodeSave(raw, now); }
  catch (error) {
    const backup = storage.getItem(BACKUP_KEY);
    if (backup) {
      try { return { ...decodeSave(backup, now), warning: 'The latest save could not be read. Your previous checkpoint was restored.' }; } catch { /* Preserve both files; let the player choose recovery. */ }
    }
    throw new Error('Your save could not be read. Export it from the recovery screen before starting a new guild.', { cause: error });
  }
}
export function saveGame(storage, state, now = Date.now()) {
  const previous = storage.getItem(SAVE_KEY);
  if (previous) { try { decodeSave(previous, now); storage.setItem(BACKUP_KEY, previous); } catch { /* Do not overwrite a good backup with corrupt data. */ } }
  storage.setItem(SAVE_KEY, encodeSave(state, now));
}

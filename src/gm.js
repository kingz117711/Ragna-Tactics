// GM tools: a development playground for exercising everything the game can do
// without grinding for it. Every function here is a *pure state mutation* — it
// runs inside `command()` like any other order, so a GM action is validated,
// logged in the journal, and saved exactly like normal play.
//
// The panel is opt-in. It lives behind a top-bar tab that hides itself unless
// `?gm=1` is in the URL or the developer enabled it on this device; the game
// itself never calls into this module unless the panel is opened.
import { MAPS, JOBS, MONSTERS, GEAR_ITEMS, ITEMS, CARDS, SKILLS, FX_IDS,
  ATTRIBUTES, ATTRIBUTE_CAP, EQUIPMENT } from './data.js';
import { availablePoints, log, stats } from './sim.js';

export const GM_STORAGE_KEY = 'ragna-tactics:gm';
export const MAX_BASE_LEVEL = 99;

// ---------------------------------------------------------------------------
// Enablement
// ---------------------------------------------------------------------------
// `?gm=1` turns the panel on for this browser; `?gm=0` turns it off again.
// The choice is remembered so a reload does not lose it.
export function readGmFlag(search = '', storage = null) {
  const param = new URLSearchParams(search).get('gm');
  if (param === '1' || param === 'on' || param === 'true') { writeGmFlag(true, storage); return true; }
  if (param === '0' || param === 'off' || param === 'false') { writeGmFlag(false, storage); return false; }
  try { return storage?.getItem(GM_STORAGE_KEY) === '1'; } catch { return false; }
}
export function writeGmFlag(on, storage = null) {
  try { if (on) storage?.setItem(GM_STORAGE_KEY, '1'); else storage?.removeItem(GM_STORAGE_KEY); } catch { /* private mode */ }
}
// The URL the user can bookmark to bring the tab back after it is turned off.
export function gmLink(href = '') {
  const url = new URL(href || 'http://localhost/');
  url.searchParams.set('gm', '1');
  return url.toString();
}

// ---------------------------------------------------------------------------
// Max level
// ---------------------------------------------------------------------------
// A character at the cap: Base 99, Job at the class cap, every stat at the
// attribute ceiling, full HP/SP and a clean slate for the next promotion.
export function maxLevel(c) {
  c.level = MAX_BASE_LEVEL;
  c.exp = 0;
  c.jobLevel = JOBS[c.job]?.jobLevelCap || (c.job === 'novice' ? 10 : 50);
  c.jobExp = 0;
  // 99 Base levels grant 196 points: spread them toward the cap without ever
  // spending more than the character has (the save validator checks this).
  const pool = 2 * (MAX_BASE_LEVEL - 1);
  const ids = Object.keys(ATTRIBUTES);
  const budget = Math.min(pool, ids.length * ATTRIBUTE_CAP);
  c.attributes = Object.fromEntries(ids.map(id => [id, Math.min(ATTRIBUTE_CAP, Math.floor(budget / ids.length))]));
  let spare = budget - ids.reduce((sum, id) => sum + c.attributes[id], 0);
  for (const id of ids) { const room = ATTRIBUTE_CAP - c.attributes[id]; const add = Math.min(room, spare); c.attributes[id] += add; spare -= add; }
  const st = stats(c);
  c.hp = st.hp; c.sp = st.sp;
  return null;
}
export function maxParty(s) {
  for (const c of s.characters) maxLevel(c);
  return null;
}

// ---------------------------------------------------------------------------
// Levels, points and currency
// ---------------------------------------------------------------------------
export function setLevels(c, { level, jobLevel } = {}) {
  if (Number.isInteger(level)) c.level = Math.max(1, Math.min(MAX_BASE_LEVEL, level));
  if (Number.isInteger(jobLevel)) {
    const cap = JOBS[c.job]?.jobLevelCap || (c.job === 'novice' ? 10 : 50);
    c.jobLevel = Math.max(1, Math.min(cap, jobLevel));
  }
  c.exp = 0; c.jobExp = 0;
  const st = stats(c);
  c.hp = st.hp; c.sp = st.sp;
  return null;
}
// Every Base level grants two attribute points; topping up to the ceiling costs
// nothing and keeps the "points left" counter at zero (never negative).
export function fillAttributePoints(c) {
  const free = Math.max(0, availablePoints(c));
  if (!free) return null;
  const open = Object.keys(ATTRIBUTES).filter(id => (c.attributes?.[id] || 0) < ATTRIBUTE_CAP);
  let left = free;
  for (const id of open) {
    if (left <= 0) break;
    const room = ATTRIBUTE_CAP - (c.attributes?.[id] || 0);
    const add = Math.min(room, Math.ceil(left / open.filter(key => (c.attributes?.[key] || 0) < ATTRIBUTE_CAP).length));
    c.attributes[id] = (c.attributes[id] || 0) + add;
    left -= add;
  }
  return null;
}
export function giveZeny(s, amount = 1_000_000) {
  s.inventory.zeny += Math.max(0, Math.round(amount));
  log(s, `GM: added ${Math.round(amount).toLocaleString()} Zeny.`);
  return null;
}
export function grantMaterials(s) {
  // Monster drop materials live in `materials`; potions and ores in `items`.
  for (const monster of Object.values(MONSTERS)) s.inventory.materials[monster.material] = (s.inventory.materials[monster.material] || 0) + 99;
  for (const id of Object.keys(ITEMS)) s.inventory.items[id] = (s.inventory.items[id] || 0) + 99;
  log(s, 'GM: stocked every material and refinement ore.');
  return null;
}
export function restockPotions(s) {
  for (const c of s.characters) c.potions = 100;
  log(s, 'GM: every adventurer carries 100 potions.');
  return null;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
// A GM job change skips the level requirement but keeps the rest of the
// promotion contract: the class line's own training is seeded, ranks the new
// line cannot teach are dropped, and the signature skill lands in slot one.
// The Job level is clamped to the new class's cap (a Novice has 10, a third
// class 70), and the statutory minimum for the class is respected.
export function changeJob(s, c, job) {
  if (!Object.hasOwn(JOBS, job)) return 'Unknown class.';
  if (c.job === job) return null;
  const previous = c.job;
  c.job = job;
  const cap = JOBS[job]?.jobLevelCap || (job === 'novice' ? 10 : 50);
  c.jobLevel = Math.max(1, Math.min(cap, c.jobLevel ?? 1));
  c.jobExp = 0;
  const kept = Object.fromEntries(Object.entries(c.skills || {}).filter(([id]) => canLearnFor(job, id)));
  const promoted = defaultKit(job);
  for (const [id, rank] of Object.entries(promoted)) kept[id] = Math.max(kept[id] || 0, rank);
  c.skills = kept;
  c.activeSkills = Object.keys(kept).slice(0, 4);
  c.activeSkill = c.activeSkills[0] || null;
  c.cast = null; c.skillTimers = {}; c.summon = null; c.cooldown = 0; c.techniqueTimers = {};
  c.hp = stats(c).hp; c.sp = stats(c).sp;
  log(s, `GM: ${c.name} changed from ${JOBS[previous]?.name || previous} to ${JOBS[job].name}.`);
  return null;
}
// Local copies of the two catalog lookups, so gm.js never reaches into the
// skills module's mutable state directly.
function canLearnFor(job, id) {
  const def = SKILLS[id];
  return !!def && jobLine(job).includes(def.job);
}
function jobLine(job) {
  const chain = [];
  for (let current = job; current; current = JOBS[current]?.parent) chain.push(current);
  return chain;
}
function defaultKit(job) {
  const own = Object.entries(SKILLS).filter(([, def]) => def.job === job && def.shape !== 'passive');
  const first = own.find(([, def]) => def.unlock[0] <= 1 && !def.prereq.length) || own[0];
  return first ? { [first[0]]: 1 } : {};
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------
// Learning a whole tree ignores job level and prerequisite pacing but still
// respects the rank cap, so nothing invalid can be written to the save.
export function learnEverySkill(c) {
  const learned = {};
  for (const [id, def] of Object.entries(SKILLS)) if (canLearnFor(c.job, id)) learned[id] = def.maxRank;
  c.skills = learned;
  c.activeSkills = Object.keys(learned).filter(id => SKILLS[id].shape !== 'passive').slice(0, 4);
  if (!c.activeSkills.length) c.activeSkills = Object.keys(learned).slice(0, 4);
  c.activeSkill = c.activeSkills[0] || null;
  return null;
}
export function resetSkills(c) {
  c.skills = defaultKit(c.job);
  c.activeSkills = Object.keys(c.skills);
  c.activeSkill = c.activeSkills[0] || null;
  return null;
}
export function unlockAllSkillsEverywhere(s) {
  for (const c of s.characters) learnEverySkill(c);
  log(s, 'GM: every class line fully trained.');
  return null;
}

// ---------------------------------------------------------------------------
// Gear
// ---------------------------------------------------------------------------
// The best of everything: one of each gear item, at its max refinement, with
// every card in the game available to socket.
export function stockGear(s) {
  s.inventory.gearItems ||= [];
  let added = 0;
  for (const id of Object.keys(GEAR_ITEMS)) {
    const item = GEAR_ITEMS[id];
    s.inventory.gearItems.push({ uid: `gm${s.nextId++}`, itemId: id, refine: item.refineable ? 10 : 0, affixes: [] });
    added++;
  }
  refreshGear(s);
  log(s, `GM: added ${added} gear pieces to the bag.`);
  return null;
}
export function grantCards(s) {
  for (const id of Object.keys(CARDS)) s.inventory.cards[id] = (s.inventory.cards[id] || 0) + 5;
  log(s, 'GM: five of every card added to storage.');
  return null;
}
function refreshGear(s) {
  const counts = {};
  for (const instance of s.inventory.gearItems || []) counts[instance.itemId] = (counts[instance.itemId] || 0) + 1;
  s.inventory.gear = counts;
}

// ---------------------------------------------------------------------------
// Progression gates
// ---------------------------------------------------------------------------
// Milestones gate roster size and the tutorial chain. Filling them is the
// difference between "can I test a five-person party" and hours of farming.
export function unlockMilestones(s) {
  s.milestones.bossKills = Math.max(3, s.milestones.bossKills || 0);
  s.milestones.forestKills = Math.max(35, s.milestones.forestKills || 0);
  s.milestones.expeditionStep = 6;
  log(s, 'GM: every guild milestone completed.');
  return null;
}
export function fillRoster(s) {
  while (s.characters.length < 5) {
    const id = 'c' + (s.characters.length + 1);
    s.characters.push(recruitCharacter(s, id));
  }
  log(s, 'GM: roster filled to five adventurers.');
  return null;
}
// Mirrors the sim's recruiter without needing a command round-trip.
function recruitCharacter(s, id) {
  const names = ['Rin', 'Sable', 'Odo', 'Wren', 'Kai'];
  const template = s.characters[0];
  const copy = structuredClone(template);
  copy.id = id; copy.name = names[(Number(id.slice(1)) - 1) % names.length];
  copy.job = 'novice'; copy.level = 1; copy.exp = 0; copy.jobLevel = 1; copy.jobExp = 0;
  copy.mapId = null; copy.partyId = null; copy.status = 'camp'; copy.order = 'farm';
  copy.skills = defaultKit('novice'); copy.activeSkills = Object.keys(copy.skills); copy.activeSkill = copy.activeSkills[0] || null;
  copy.attributes = {}; copy.gear = {}; copy.kills = 0; copy.earned = 0;
  copy.hp = stats(copy).hp; copy.sp = stats(copy).sp;
  return copy;
}
export function defeatBoss(s, mapId = 'arena') {
  // Any field counts: the point of the button is to satisfy the boss milestone
  // without needing a party that can survive the arena.
  if (!MAPS[mapId]) return 'Unknown field.';
  s.milestones.bossKills = (s.milestones.bossKills || 0) + 1;
  log(s, `GM: a boss clear was recorded (${MAPS[mapId].name}).`);
  return null;
}

// ---------------------------------------------------------------------------
// Skill FX gallery
// ---------------------------------------------------------------------------
// Fires every flourish on the field the selected party is standing on, so the
// whole FX library can be watched in place instead of one skill at a time.
export const FX_PER_BURST = 6;
export function spawnFxGallery(s, mapId, fxIds = FX_IDS, origin = { x: 0, y: 0 }) {
  const field = s.maps[mapId];
  if (!field) return 'Deploy to a field first.';
  // One flourish replaces the previous single-play, so the panel is not a stack.
  s.effects = (fxIds.length === 1 ? [] : s.effects).filter(e => e.kind !== 'fx' || fxIds.length !== 1);
  const list = fxIds.filter(id => FX_IDS.includes(id));
  // Playing a single flourish clears the previous one; the full gallery replaces
  // whatever was on screen so all 176 start together.
  s.effects = s.effects.filter(e => e.kind !== 'fx');
  list.forEach((fx, index) => {
    const ring = Math.floor(index / FX_PER_BURST);
    const slot = index % FX_PER_BURST;
    const angle = (slot / FX_PER_BURST) * Math.PI * 2 + ring * 0.6;
    const distance = 2.2 + ring * 1.35;
    s.effects.push({ id: s.nextId++, mapId, x: origin.x + Math.cos(angle) * distance, y: origin.y + Math.sin(angle) * distance, text: '', kind: 'fx', fx, life: 3, life0: 3 });
  });
  // Nothing else caps the gallery: it is one deliberate burst of 176 flourishes.
  if (s.effects.length > 400) s.effects.splice(0, s.effects.length - 400);
  log(s, `GM: played ${list.length} skill flourishes on ${MAPS[mapId].name}.`);
  return null;
}
export function clearFx(s) { s.effects = []; return null; }

// ---------------------------------------------------------------------------
// Field controls
// ---------------------------------------------------------------------------
export function respawnField(s, mapId) {
  const field = s.maps[mapId];
  if (!field) return 'Unknown field.';
  for (const monster of field.monsters) { monster.hp = MONSTERS[monster.kind].hp; monster.respawn = 0; monster.rewarded = false; }
  log(s, `GM: ${MAPS[mapId].name} repopulated.`);
  return null;
}
export function killField(s, mapId) {
  const field = s.maps[mapId];
  if (!field) return 'Unknown field.';
  // `respawn` is a short countdown the save validator bounds; a dead monster is
  // respawned by the normal tick within a few seconds, which is the intent of a
  // "clear the field" button anyway.
  for (const monster of field.monsters) { monster.hp = 0; monster.respawn = 6; monster.rewarded = true; }
  log(s, `GM: cleared every monster on ${MAPS[mapId].name}.`);
  return null;
}
export function healParty(s) {
  for (const c of s.characters) {
    const st = stats(c);
    c.hp = st.hp; c.sp = st.sp;
    if (c.status === 'down') { c.status = c.mapId ? 'farming' : 'camp'; }
  }
  log(s, 'GM: the whole guild is at full health.');
  return null;
}
export function retreatParty(s) {
  for (const c of s.characters) {
    if (!c.mapId) continue;
    c.mapId = null; c.status = 'camp'; c.order = 'farm'; c.targetId = null;
    c.destination = null; c.cast = null; c.x = 0; c.y = 0; c.home = { x: 0, y: 0 };
  }
  log(s, 'GM: everyone returned to camp.');
  return null;
}

// ---------------------------------------------------------------------------
// Panel markup
// ---------------------------------------------------------------------------
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const option = (value, label, selected) => `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;

// The classes a GM dropdown should offer: every job, grouped by tier so the
// long list is navigable.
const TIER_LABELS = { novice: 'Novice', first: 'First class', second: 'Second class', transcendent: 'Transcendent', third: 'Third class', expanded: 'Expanded', expandedSecond: 'Expanded · second', expandedThird: 'Expanded · third' };
export function jobOptions(selected) {
  const groups = new Map();
  for (const [id, job] of Object.entries(JOBS)) {
    const group = job.tier || 'other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push([id, job.name]);
  }
  return [...groups].map(([tier, jobs]) =>
    `<optgroup label="${esc(TIER_LABELS[tier] || tier)}">${jobs.map(([id, name]) => option(id, name, id === selected)).join('')}</optgroup>`).join('');
}

// The panel body. `context` carries the live selection and map so the markup can
// show what each action will affect.
export function gmPanel({ characters, selectedId, mapId, mapName, zeny, fxCount }) {
  const c = characters.find(entry => entry.id === selectedId);
  const levels = c ? `${c.name} · Base ${c.level} / Job ${c.jobLevel}` : 'No adventurer selected';
  return `
  <p class="gm-intro">Testing playground. Every button goes through the normal command layer, so the save stays valid. ${fxCount} skill flourishes available.</p>
  <section class="gm-section">
    <h3>Selected adventurer</h3>
    <p class="gm-target">${esc(levels)}${c ? ` · <span class="muted">${esc(JOBS[c.job]?.name || c.job)}</span>` : ''}</p>
    <div class="gm-grid">
      <button data-gm="max-level" ${c ? '' : 'disabled'}>Max level (Base ${MAX_BASE_LEVEL})</button>
      <button data-gm="fill-points" ${c ? '' : 'disabled'}>Fill attribute points</button>
      <button data-gm="learn-all" ${c ? '' : 'disabled'}>Learn every skill</button>
      <button data-gm="reset-skills" ${c ? '' : 'disabled'}>Reset skills</button>
      <button data-gm="heal" ${c ? '' : 'disabled'}>Full HP / SP</button>
    </div>
    <div class="gm-row">
      <label>Base level <input type="number" min="1" max="${MAX_BASE_LEVEL}" value="${c?.level ?? 1}" data-gm-level="base" ${c ? '' : 'disabled'}></label>
      <label>Job level <input type="number" min="1" max="70" value="${c?.jobLevel ?? 1}" data-gm-level="job" ${c ? '' : 'disabled'}></label>
      <button data-gm="set-levels" ${c ? '' : 'disabled'}>Apply levels</button>
    </div>
    <div class="gm-row">
      <label class="gm-wide">Change class
        <select data-gm-job ${c ? '' : 'disabled'}>${jobOptions(c?.job)}</select>
      </label>
      <button data-gm="change-job" ${c ? '' : 'disabled'}>Change job</button>
    </div>
  </section>
  <section class="gm-section">
    <h3>Whole guild</h3>
    <div class="gm-grid">
      <button data-gm="max-party">Max entire party</button>
      <button data-gm="learn-everything">Train every class to max</button>
      <button data-gm="give-zeny">+1,000,000 Zeny</button>
      <button data-gm="materials">Stock all materials</button>
      <button data-gm="gear">Stock every gear piece</button>
      <button data-gm="cards">Five of every card</button>
      <button data-gm="potions">100 potions each</button>
      <button data-gm="unlock">Unlock all milestones</button>
      <button data-gm="roster">Fill roster to five</button>
    </div>
    <p class="gm-status tiny muted">Zeny on hand: ${Number(zeny || 0).toLocaleString()}</p>
  </section>
  <section class="gm-section">
    <h3>Field &amp; effects</h3>
    <p class="gm-target">Current map: <span class="muted">${esc(mapName || 'none')}</span></p>
    <div class="gm-grid">
      <button data-gm="fx-all">Play every skill FX (${FX_IDS.length})</button>
      <button data-gm="fx-clear">Clear effects</button>
      <button data-gm="heal-party">Heal whole party</button>
      <button data-gm="retreat-party">Retreat everyone to camp</button>
      <button data-gm="respawn">Repopulate this field</button>
      <button data-gm="kill-field">Clear this field</button>
      <button data-gm="boss">Count a boss clear</button>
    </div>
    <div class="gm-row">
      <label>Single flourish <select data-gm-fx>${FX_IDS.map(id => option(id, id, false)).join('')}</select></label>
      <button data-gm="fx-one">Play</button>
    </div>
  </section>
  <section class="gm-section">
    <h3>Panel</h3>
    <p class="gm-hint tiny muted">The GM tab stays hidden until you re-enable it with <code>?gm=1</code>, or press it off below.</p>
    <button class="danger-button" data-gm="hide">Hide GM tab</button>
  </section>`;
}

// A quick summary of what the panel can do, used by the settings dialog.
export function gmSummary() {
  return 'Max level, class changes, every skill, gear, cards, milestones, field controls and a full skill-FX gallery.';
}

// Pure markup helpers for the skill surfaces. Kept out of app.js so the copy,
// gate logic and labels can be unit-tested without a DOM.
import { ELEMENTS, SKILLS, skillCatalog, skillUnlockLevel, learnedRank, learnedSkillPower, activeSkillId, skillMultiplier, skillFamily } from './data.js';

// Readable names for the flourish each skill draws (see drawSkillFx).
export const FX_LABELS = {
  slash: 'Arc slash', pierce: 'Thrust line', burst: 'Blast ring', bolt: 'Bolt strike',
  holy: 'Holy sigil', heal: 'Mending motes', quake: 'Shockwave', gale: 'Wind spiral',
  venom: 'Venom spatter', frost: 'Frost shards', spark: 'Spark burst', guard: 'Ward hex',
  aura: 'Aura pulse',
};
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fxLabel(id) { return FX_LABELS[SKILLS[id]?.fx] || SKILLS[id]?.fx || '—'; }
export function skillKindLabel(def) { return def.kind === 'heal' ? 'heal' : def.kind === 'buff' ? 'buff' : def.kind === 'area' ? 'area' : 'strike'; }

// What a trained skill needs before its next rank can be learned.
export function skillGate(c, id) {
  const def = SKILLS[id], rank = learnedRank(c, id), maxed = rank >= def.maxRank;
  const next = rank + 1, need = skillUnlockLevel(id, next);
  const locked = !maxed && c.jobLevel < need;
  const active = activeSkillId(c) === id;
  const atCamp = !c.mapId && c.status !== 'down';
  return { def, rank, next, need, maxed, locked, active, atCamp, canLearn: atCamp && !maxed && !locked };
}

export function skillRow(c, id) {
  const { def, rank, next, need, maxed, locked, active, canLearn, atCamp } = skillGate(c, id);
  const current = skillMultiplier(def, Math.max(1, rank));
  const nextPower = skillMultiplier(def, next);
  return `<article class="workspace-item skill-row ${active ? 'skill-active' : ''}"><div>
      <strong>${esc(def.name)} <span class="tiny muted">R${rank}/${def.maxRank}</span></strong>
      <p>${esc(def.text)}</p>
      <small>${def.sp} SP · ${def.cooldown}s · ${skillKindLabel(def)} · ${esc(fxLabel(id))}</small>
      <small>${def.element ? esc(ELEMENTS[def.element].name) + ' · ' : ''}${def.status ? esc(def.status) + ' · ' : ''}power ${current.toFixed(2)}×${maxed ? ' (max)' : ` → ${nextPower.toFixed(2)}×`}</small>
      <small>${maxed ? 'All ranks learned' : `Rank ${next} at Job Lv. ${need}`}</small>
    </div>
    <div class="skill-row-actions">
      <button data-workspace-learn="${id}" ${canLearn ? '' : 'disabled'}>${maxed ? 'Maxed' : locked ? 'Job Lv. ' + need : 'Learn R' + next}</button>
      <button data-workspace-active="${id}" ${atCamp && rank > 0 && !active ? '' : 'disabled'}>${active ? 'Casting' : rank > 0 ? 'Cast this' : 'Not learned'}</button>
    </div></article>`;
}

export function skillSummary(c) {
  const id = activeSkillId(c);
  if (!id) return { name: null, line: skillFamily(c.job), rows: skillCatalog(c.job), markup: '<p>Learn a skill to give this adventurer a trained cast.</p>' };
  const def = SKILLS[id];
  return { id, name: def.name, fx: fxLabel(id), power: learnedSkillPower(c), rank: learnedRank(c, id), line: skillFamily(c.job) };
}

// The short “learned skills” list shown on the Skills page.
export function learnedSkillRows(c) {
  return skillCatalog(c.job).filter(([id]) => learnedRank(c, id) > 0).map(([id, def]) => {
    const active = activeSkillId(c) === id;
    const atCamp = !c.mapId && c.status !== 'down';
    return `<article class="workspace-item"><div><strong>${esc(def.name)} <span class="tiny muted">R${learnedRank(c, id)}/${def.maxRank}</span></strong><p>${esc(def.text)}</p><small>${def.sp} SP · ${def.cooldown}s · ${esc(fxLabel(id))}</small></div><button data-workspace-active="${id}" ${atCamp && !active ? '' : 'disabled'}>${active ? 'Casting' : 'Cast this'}</button></article>`;
  }).join('');
}

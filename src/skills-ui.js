// Pure markup helpers for the skill surfaces. Kept out of app.js so the copy,
// gate logic, tree layout and labels can be unit-tested without a DOM.
import {
  ELEMENTS, SKILLS, JOBS, skillCatalog, jobSkills, skillUnlockLevel, learnedRank,
  learnedSkillPower, activeSkillId, activeSlots, ACTIVE_SLOTS, skillMultiplier,
  skillFamily, skillPoints, prereqMet, missingPrereqs, skillSp, skillCooldown,
  jobTier, SKILL_BUILDS, STATUS,
} from './data.js';

// Plain-language names for every flourish the renderer can draw.
export const FX_LABELS = {
  slash: 'Arc slash', pierce: 'Thrust line', burst: 'Blast ring', bolt: 'Bolt strike',
  holy: 'Holy sigil', heal: 'Mending motes', quake: 'Shockwave', gale: 'Wind spiral',
  venom: 'Venom spatter', frost: 'Frost shards', spark: 'Spark burst', guard: 'Ward hex',
  aura: 'Aura pulse',
  fireBolt: 'Fire bolt', iceBolt: 'Ice bolt', lightningBolt: 'Lightning bolt',
  fireBall: 'Fire ball', firePillar: 'Fire pillar', fireWall: 'Fire wall',
  frostDiver: 'Frost diver', frostNova: 'Frost nova', stormGust: 'Ice storm',
  meteor: 'Meteor fall', comet: 'Comet', jupitel: 'Thunder strike', vermilion: 'Violet storm',
  chainLightning: 'Chain lightning', holyLight: 'Holy lance', grandCross: 'Grand cross',
  magnus: 'Holy pillar', sanctuary: 'Sanctuary circle', judex: 'Judgement beam',
  blessing: 'Blessing rays', kyrie: 'Prayer shield', haste: 'Haste ring',
  gloria: 'Gloria chorus', aspersio: 'Holy water', devotion: 'Devotion link',
  gospel: 'Gospel field', assumptio: 'Assumptio wings', basilica: 'Basilica dome',
  coluceo: 'Chained heal', lexDivina: 'Judgement mark', arrowVolley: 'Arrow volley',
  arrowRain: 'Arrow rain', arrowStorm: 'Arrow storm', arrowRepel: 'Knockback arrow',
  focusedArrow: 'Focused shot', blitzBeat: 'Falcon dive', falconAssault: 'Falcon strike',
  wargStrike: 'Warg lunge', ankleSnare: 'Ankle snare', skidTrap: 'Skid trap',
  landMine: 'Land mine', claymoreTrap: 'Claymore blast', spearThrust: 'Spear thrust',
  spearSweep: 'Spear sweep', spearBrandish: 'Spear brandish', spiralPierce: 'Spiral thrust',
  bowlingBash: 'Bowling bash', headCrush: 'Head crush', jointBeat: 'Joint strike',
  berserkAura: 'Berserk aura', dragonBreath: 'Dragon breath', runeStrike: 'Rune burst',
  hundredSpear: 'Spear rain', ignitionBreak: 'Ignition break', shieldCharge: 'Shield charge',
  smite: 'Holy smite', sacrifice: 'Sacrifice burst', shieldBoomerang: 'Shield throw',
  earthDrive: 'Earth drive', hammerSmash: 'Hammer smash', hammerFall: 'Hammer fall',
  powerThrust: 'Power thrust', cartSweep: 'Cart sweep', cartTermination: 'Cart crash',
  coinStrike: 'Coin strike', meltDown: 'Melt down', maximize: 'Max power', adrenaline: 'Adrenaline',
  madoGear: 'Mado cannon', sonicBlow: 'Sonic blur', grimtooth: 'Grimtooth arc',
  meteorAssault: 'Meteor kick', meteorCross: 'Spinning assault', crossImpact: 'Cross impact',
  rollingCutter: 'Rolling cutter', deadlyPoison: 'Deadly poison', soulBreaker: 'Soul breaker',
  soulDrain: 'Soul drain', shadowCloak: 'Shadow cloak', sandThrow: 'Sand throw',
  backstab: 'Backstab', raid: 'Smoke raid', stripArmor: 'Strip armour', fullStrip: 'Full strip',
  triangleShot: 'Triangle shot', manhole: 'Manhole', feintBomb: 'Feint bomb',
  trifecta: 'Trifecta blows', chainCombo: 'Chain combo', investigate: 'Investigate',
  asura: 'Asura strike', furyAura: 'Spirit fury', tigerKnuckle: 'Tiger knuckle',
  gateOfHell: 'Gate of hell', palm: 'Palm strike', soundWave: 'Sound wave',
  braverySong: 'Bravery song', idunApple: 'Idun apple', tarot: 'Tarot card',
  uglyDance: 'Ugly dance', vigourDance: 'Vigour dance', rainstorm: 'Rainstorm',
  gypsyKiss: 'Gypsy kiss', sorrowDance: 'Sorrow dance', acidSpray: 'Acid spray',
  potionToss: 'Potion toss', acidDemonstration: 'Acid demo', acidBomb: 'Acid bomb',
  chemicalProtection: 'Chemical guard', cartCannon: 'Cart cannon', summonFlora: 'Summon flora',
  spellBreak: 'Spell break', endow: 'Endow blade', magneticEarth: 'Magnetic earth',
  dispell: 'Dispell', arcaneCircle: 'Arcane circle', psychicWave: 'Psychic wave',
  diamondDust: 'Diamond dust', ghostBlast: 'Ghost blast', soulBlast: 'Soul blast',
  napalmVulcan: 'Ghost burst', trueSight: 'True sight', windWalk: 'Wind walk',
  provoke: 'Provoke shout', concentration: 'Concentration', focus: 'Focus ring',
  hitMark: 'Hit mark', spinKick: 'Spin kick', tornadoKick: 'Tornado kick',
  roundhouse: 'Roundhouse', starMark: 'Star mark', solarWrath: 'Solar wrath',
  shuriken: 'Shuriken', kunai: 'Kunai', fireBlossom: 'Fire blossom', iceWeave: 'Ice weave',
  pistolShot: 'Pistol shot', rapidShot: 'Rapid fire', desperado: 'Desperado',
  beastBite: 'Beast bite', purringHeal: 'Purring heal', soulLink: 'Soul link',
  deathMark: 'Death mark', holyNova: 'Holy nova', bladeDance: 'Blade dance',
  impactRing: 'Impact ring', rune: 'Rune',
  holyAura: 'Holy aura', cartAura: 'Cart aura', venomStrike: 'Venom strike',
  highSanctuary: 'Grand sanctuary', ghostBurst: 'Ghost burst', enchantPoison: 'Poison enchant',
  arrowVulcan: 'Arrow Vulcan', slingingArrow: 'Slinging arrow', deadlyFocus: 'Deadly focus',
  accelStrike: 'Accel strike', bloodSpray: 'Blood spray', mirrorShield: 'Mirror shield',
  totemCall: 'Totem call', spiritOrb: 'Spirit orb', trapBurst: 'Trap burst',
};
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fxLabel(id) { return FX_LABELS[SKILLS[id]?.fx] || SKILLS[id]?.fx || '—'; }
export function skillKindLabel(def) {
  if (def.shape === 'passive') return 'passive';
  return def.shape === 'heal' ? 'heal' : def.shape === 'buff' ? 'buff' : def.shape === 'area' ? 'area'
    : def.shape === 'ground' ? 'trap' : def.shape === 'taunt' ? 'taunt' : def.shape === 'summon' ? 'summon' : 'strike';
}

// What a trained skill needs before its next rank can be learned.
export function skillGate(c, id) {
  const def = SKILLS[id];
  if (!def) return { def: null, rank: 0, maxed: true, locked: true, canLearn: false, active: false };
  const rank = learnedRank(c, id), maxed = rank >= def.maxRank;
  const next = rank + 1, need = skillUnlockLevel(id, next);
  const missing = missingPrereqs(c.skills, def);
  const points = skillPoints(c.jobLevel ?? 1, c.skills);
  const locked = !maxed && c.jobLevel < need;
  const active = activeSlots(c).includes(id);
  const atCamp = !c.mapId && c.status !== 'down';
  return {
    def, rank, next, need, maxed, locked, active, atCamp, missing, points,
    prereqOk: missing.length === 0,
    canLearn: atCamp && !maxed && !locked && missing.length === 0 && points > 0,
  };
}

// Skill icons are the original Ragnarok Online client icons, imported as PNGs
// by scripts/import_skill_icons.py and routed through index.json. A skill whose
// icon the client does not ship keeps the procedural rune tile, so no surface
// ever renders an empty box.
export const SKILL_ICON_ROUTES = {};
export function setSkillIconRoutes(routes) {
  for (const key of Object.keys(SKILL_ICON_ROUTES)) delete SKILL_ICON_ROUTES[key];
  for (const [id, file] of Object.entries(routes || {})) {
    if (SKILLS[id]) SKILL_ICON_ROUTES[id] = '/assets/skill-icons/' + file + '.png';
  }
}
export function skillIcon(id, { size = 'sm', className = '' } = {}) {
  const def = SKILLS[id];
  if (!def) return '';
  const fx = def.fx || 'slash';
  const art = SKILL_ICON_ROUTES[id];
  const tile = `<span class="skill-icon skill-icon-${esc(size)} ${className}" data-fx="${esc(fx)}" data-icon="${esc(def.icon)}" aria-hidden="true"></span>`;
  if (!art) return tile;
  return `<span class="skill-icon skill-icon-${esc(size)} skill-icon-art ${className}" data-fx="${esc(fx)}" data-icon="${esc(def.icon)}" aria-hidden="true"><img src="${esc(art)}" alt="" width="24" height="24" loading="lazy" decoding="async"></span>`;
}

const pips = (rank, max) => `<span class="skill-pips" aria-label="${rank} of ${max}">${Array.from({ length: Math.min(max, 10) }, (_, i) => `<i class="${i < rank ? 'on' : ''}"></i>`).join('')}${max > 10 ? `<b>${rank}/${max}</b>` : ''}</span>`;

export function skillRow(c, id) {
  const { def, rank, next, need, maxed, locked, active, canLearn, atCamp, missing, points } = skillGate(c, id);
  if (!def) return '';
  const current = skillMultiplier(def, Math.max(1, rank));
  const nextPower = skillMultiplier(def, next);
  const slotted = activeSlots(c).includes(id);
  const effects = [
    def.element ? esc(ELEMENTS[def.element]?.name || def.element) : '',
    def.status ? esc(STATUS[def.status]?.label || def.status) : '',
  ].filter(Boolean).join(' · ');
  const reason = missing.length ? `Needs ${esc(missing.join(', '))}`
    : locked ? `Rank ${next} at Job Lv. ${need}` : maxed ? 'All ranks learned'
    : points <= 0 ? 'No skill points' : atCamp ? '' : 'Train at camp';
  return `<article class="workspace-item skill-row ${active ? 'skill-active' : ''} ${slotted ? 'is-slotted' : ''}" data-skill="${esc(id)}">
    ${skillIcon(id)}
    <div class="skill-row-body">
      <strong>${esc(def.name)} <span class="tiny muted">R${rank}/${def.maxRank}</span></strong>
      <p>${esc(def.desc)}</p>
      <small>${skillSp(id, Math.max(1, rank))} SP · ${skillCooldown(id, Math.max(1, rank))}s · ${esc(def.kind)} · ${esc(fxLabel(id))}</small>
      <small>${effects ? effects + ' · ' : ''}${def.shape === 'passive' ? 'permanent' : `power ${current.toFixed(2)}×${maxed ? ' (max)' : ` → ${nextPower.toFixed(2)}×`}`}</small>
      ${pips(rank, def.maxRank)}
      <small class="skill-reason">${reason}</small>
    </div>
    <div class="skill-row-actions">
      <button data-workspace-learn="${esc(id)}" ${canLearn ? '' : 'disabled'}>${maxed ? 'Maxed' : locked ? 'Job Lv. ' + need : missing.length ? 'Needs ' + esc(def.prereq.map(([p, r]) => SKILLS[p]?.name || p).join(', ')) : 'Learn R' + next}</button>
      <button data-workspace-active="${esc(id)}" ${atCamp && rank > 0 ? '' : 'disabled'}>${activeSkillId(c) === id ? 'Casting' : rank > 0 ? 'Cast first' : 'Not learned'}</button>
      <button data-workspace-cast="${esc(id)}" ${atCamp && rank > 0 ? '' : 'disabled'} class="${slotted ? 'is-on' : ''}">${slotted ? 'Unslot' : 'Slot'}</button>
    </div></article>`;
}

// The skill tree, grouped by job tier. Every node lists its prerequisites so a
// player can read the dependency chain the way the in-game RO tree shows it.
export function skillTree(c) {
  const catalog = skillCatalog(c.job);
  if (!catalog.length) return '<p>No skills are available on this line yet.</p>';
  const groups = new Map();
  for (const [id, def] of catalog) {
    const job = JOBS[def.job]?.name || def.job;
    const tier = jobTier(JOBS[def.job]);
    const key = `${tier}|${def.job}`;
    if (!groups.has(key)) groups.set(key, { tier, job, lines: [] });
    groups.get(key).lines.push([id, def]);
  }
  const ordered = [...groups.values()].sort((a, b) => a.tier - b.tier);
  return `<div class="skill-tree">${ordered.map(group => `
    <section class="skill-tier">
      <header><h3>${esc(group.job)}</h3><span class="tiny muted">${group.lines.reduce((n, [, d]) => n + d.maxRank, 0)} ranks</span></header>
      <div class="skill-nodes">${group.lines.map(([id, def]) => {
        const rank = learnedRank(c, id);
        const prereq = def.prereq.length
          ? `<div class="skill-prereqs">${def.prereq.map(([pid, pr]) => `<span class="${(c.skills?.[pid] || 0) >= pr ? 'met' : 'unmet'}">${esc(SKILLS[pid]?.name || pid)} ${pr}</span>`).join('')}</div>`
          : '<div class="skill-prereqs"><span class="met">no prerequisite</span></div>';
        return `<article class="skill-node ${rank ? 'learned' : ''}" data-skill="${esc(id)}" title="${esc(def.desc)}">
          ${skillIcon(id, { size: 'md' })}
          <div class="skill-node-body">
            <strong>${esc(def.name)}</strong>
            <small>${esc(skillKindLabel(def))}${def.element ? ' · ' + esc(ELEMENTS[def.element]?.name || def.element) : ''} · Job Lv. ${skillUnlockLevel(id, 1)}</small>
            ${prereq}
            ${pips(rank, def.maxRank)}
          </div>
        </article>`;
      }).join('')}</div>
    </section>`).join('')}</div>`;
}

// Build cards: the three Sniper builds (trap / auto-attack / falcon) and the
// equivalent presets for every other class family.
export function buildsFor(job) {
  // A job's own presets come first, then its family's: a Lord Knight keeps the
  // Knight builds and adds the Lancer/Berserker presets of its own tier.
  const family = skillFamily(job);
  const own = SKILL_BUILDS[job] || [];
  const inherited = family === job ? [] : (SKILL_BUILDS[family] || []);
  const seen = new Set();
  return [...own, ...inherited].filter(build => (seen.has(build.id) ? false : seen.add(build.id)));
}
export function buildCards(job) {
  const builds = buildsFor(job);
  if (!builds.length) return '';
  return `<div class="build-cards">${builds.map(build => {
    const known = (build.skills || []).filter(id => SKILLS[id]);
    return `<article class="build-card" data-build="${esc(build.id)}">
      <header><strong>${esc(build.name)}</strong><span class="tiny muted">${esc(build.style)}</span></header>
      <p>${esc(build.blurb || '')}</p>
      <div class="build-skills">${known.map(id => `${skillIcon(id)}<span>${esc(SKILLS[id].name)}</span>`).join('')}</div>
      ${build.lean ? `<small class="tiny muted">Lean · ${esc(build.lean)}</small>` : ''}
    </article>`;
  }).join('')}</div>`;
}

export function skillSummary(c) {
  const id = activeSkillId(c);
  if (!id) return { name: null, line: skillFamily(c.job), rows: skillCatalog(c.job), markup: '<p>Learn a skill to give this adventurer a trained cast.</p>' };
  const def = SKILLS[id];
  return { id, name: def.name, fx: fxLabel(id), power: learnedSkillPower(c), rank: learnedRank(c, id), line: skillFamily(c.job), slots: activeSlots(c) };
}

// The rotation strip: the trained casts, in firing order.
export function rotationStrip(c) {
  const slots = activeSlots(c);
  const free = Math.max(0, ACTIVE_SLOTS - slots.length);
  return `<div class="rotation-strip">${slots.map((id, index) => `<span class="rotation-slot"><b>${index + 1}</b>${skillIcon(id)}<span>${esc(SKILLS[id].name)}</span></span>`).join('')}${Array.from({ length: free }, (_, i) => `<span class="rotation-slot empty"><b>${slots.length + i + 1}</b><span>empty</span></span>`).join('')}</div>`;
}

// The short “learned skills” list shown on the Skills page.
export function learnedSkillRows(c) {
  return skillCatalog(c.job).filter(([id]) => learnedRank(c, id) > 0).map(([id, def]) => {
    const active = activeSkillId(c) === id;
    const atCamp = !c.mapId && c.status !== 'down';
    return `<article class="workspace-item">${skillIcon(id)}<div><strong>${esc(def.name)} <span class="tiny muted">R${learnedRank(c, id)}/${def.maxRank}</span></strong><p>${esc(def.desc)}</p><small>${skillSp(id, learnedRank(c, id))} SP · ${skillCooldown(id, learnedRank(c, id))}s · ${esc(fxLabel(id))}</small></div><button data-workspace-active="${esc(id)}" ${atCamp && !active ? '' : 'disabled'}>${active ? 'Casting' : 'Cast this'}</button></article>`;
  }).join('');
}

// Runtime skill surface: joins the authored catalog (skills-catalog.js) to the
// job tree (data.js) and exposes everything the sim, UI and persistence need.
//
// Design notes
// - Availability walks the job ancestry, so a Lord Knight trains Swordsman and
//   Knight skills as well as its own.
// - Ranks unlock at job levels; prerequisites are per skill; one skill point is
//   earned per job level and each rank costs one point.
// - Up to ACTIVE_SLOTS learned skills can be slotted as casts. The simulation
//   fires them in order, so a player can run a real rotation (a Sniper can hold
//   Ankle Snare, Land Mine and Falcon Assault at once) instead of one button.
import { JOBS } from './data.js';
import { SKILLS, SKILL_BUILDS } from './skills-catalog.js';
import { makeSkillHelpers, skillSp as skillSpDef, skillCooldown as skillCooldownDef } from './skillcore.js';

export const ACTIVE_SLOTS = 4;
// Effect families the renderer can draw. Each skill's `fx` is one of these.
export const FX_IDS = [
  'slash', 'pierce', 'burst', 'bolt', 'holy', 'heal', 'quake', 'gale', 'venom',
  'frost', 'spark', 'guard', 'aura',
  // Elemental and weapon-specific flourishes added with the full catalog.
  'fireBolt', 'iceBolt', 'lightningBolt', 'fireBall', 'firePillar', 'fireWall',
  'frostDiver', 'frostNova', 'stormGust', 'meteor', 'comet', 'jupitel', 'vermilion',
  'chainLightning', 'holyLight', 'grandCross', 'magnus', 'sanctuary', 'judex',
  'blessing', 'kyrie', 'haste', 'gloria', 'aspersio', 'devotion', 'gospel',
  'assumptio', 'basilica', 'coluceo', 'lexDivina', 'arrowVolley', 'arrowRain',
  'arrowStorm', 'arrowRepel', 'focusedArrow', 'blitzBeat', 'falconAssault',
  'wargStrike', 'ankleSnare', 'skidTrap', 'landMine', 'claymoreTrap',
  'spearThrust', 'spearSweep', 'spearBrandish', 'spiralPierce', 'bowlingBash',
  'headCrush', 'jointBeat', 'berserkAura', 'dragonBreath', 'runeStrike',
  'hundredSpear', 'ignitionBreak', 'shieldCharge', 'smite', 'sacrifice',
  'shieldBoomerang', 'earthDrive', 'hammerSmash', 'hammerFall', 'powerThrust',
  'cartSweep', 'cartTermination', 'coinStrike', 'meltDown', 'maximize',
  'adrenaline', 'madoGear', 'sonicBlow', 'grimtooth', 'meteorAssault',
  'meteorCross', 'crossImpact', 'rollingCutter', 'deadlyPoison', 'soulBreaker',
  'soulDrain', 'shadowCloak', 'sandThrow', 'backstab', 'raid', 'stripArmor',
  'fullStrip', 'triangleShot', 'manhole', 'feintBomb', 'trifecta', 'chainCombo',
  'investigate', 'asura', 'furyAura', 'tigerKnuckle', 'gateOfHell', 'palm',
  'soundWave', 'braverySong', 'idunApple', 'tarot', 'uglyDance', 'vigourDance',
  'rainstorm', 'gypsyKiss', 'sorrowDance', 'acidSpray', 'potionToss',
  'acidDemonstration', 'acidBomb', 'chemicalProtection', 'cartCannon',
  'summonFlora', 'spellBreak', 'endow', 'magneticEarth', 'dispell',
  'arcaneCircle', 'psychicWave', 'diamondDust', 'ghostBlast', 'soulBlast',
  'napalmVulcan', 'trueSight', 'windWalk', 'provoke', 'concentration', 'focus',
  'hitMark', 'spinKick', 'tornadoKick', 'roundhouse', 'starMark', 'solarWrath',
  'shuriken', 'kunai', 'fireBlossom', 'iceWeave', 'pistolShot', 'rapidShot',
  'desperado', 'beastBite', 'purringHeal', 'soulLink', 'deathMark', 'holyNova',
  'bladeDance', 'impactRing', 'rune', 'link',
  'holyAura', 'cartAura', 'venomStrike', 'highSanctuary', 'ghostBurst',
  'enchantPoison', 'arrowVulcan', 'slingingArrow', 'deadlyFocus', 'accelStrike',
  'bloodSpray', 'mirrorShield', 'totemCall', 'spiritOrb', 'trapBurst',
];

const helpers = makeSkillHelpers(SKILLS, () => JOBS);

export const { tier, chainOf, jobChain, skillCatalog, jobSkills, canLearnSkill, skillUnlockLevel,
  prereqMet, missingPrereqs, learnedRank, skillPoints, passiveBonus,
  signatureSkillId, buildRotation, familyOf, jobTier } = helpers;

export { SKILLS, SKILL_BUILDS };
export function skillDef(id) { return Object.hasOwn(SKILLS, id) ? SKILLS[id] : null; }
export function skillMaxRank(id) { return SKILLS[id]?.maxRank || 1; }
export {
  skillSp as skillSpDef, skillCooldown as skillCooldownDef, skillPower, rankValue,
} from './skillcore.js';
// Convenience wrappers: the UI and the sim ask by skill id, not by definition.
export function skillSp(id, rank = 1) { return skillDef(id) ? skillSpDef(skillDef(id), rank) : 0; }
export function skillCooldown(id, rank = 1) { return skillDef(id) ? skillCooldownDef(skillDef(id), rank) : 0; }
// Back-compat: the catalog's legacy hand-written copy read `power` as a
// multiplier, and some older callers ask for it by that name.
export function skillMultiplierValue(def, rank = 1) { return def.power + (Math.max(1, rank) - 1) * (def.powerPer ?? 0.18); }

// The class-family catalog: what the Skills page shows as this line's tree.
export function skillFamily(job) { return familyOf(job); }

// Stat bonus from learned passives, keyed the way stats() consumes it.
export function learnedPassive(skills) {
  const raw = passiveBonus(skills);
  return {
    atk: raw.atk || 0, matk: raw.matk || 0, def: raw.def || 0, hp: raw.hp || 0,
    sp: raw.sp || 0, hit: raw.hit || 0, crit: raw.crit || 0, flee: raw.flee || 0,
    speed: raw.speed || 0, range: raw.range || 0, regen: raw.regen || 0, skill: raw.skill || 0,
  };
}

// ---------------------------------------------------------------------------
// Active casts
// ---------------------------------------------------------------------------
export function activeSlots(c) {
  const slots = Array.isArray(c?.activeSkills) ? c.activeSkills.filter(id => typeof id === 'string') : [];
  const single = c?.activeSkill ? [c.activeSkill] : [];
  return [...new Set([...slots, ...single])].filter(id => canLearnSkill(c?.job, id) && learnedRank(c, id) > 0).slice(0, ACTIVE_SLOTS);
}
export function activeSkillId(c) {
  const [first] = activeSlots(c);
  return first || null;
}
export function activeSkillList(c) { return activeSlots(c).map(id => SKILLS[id]).filter(Boolean); }
export function activeSkill(c) { return SKILLS[activeSkillId(c)] || null; }

export function learnedSkillPower(c) {
  let total = 0;
  for (const id of Object.keys(c?.skills || {})) total += learnedRank(c, id) * 2;
  return total;
}

// Rotations the AI understands. A build's `rotation` names the scoring profile;
// `skills` are the catalog ids a player would actually spend points on.
export function buildSkills(buildId, job) {
  const build = (SKILL_BUILDS[JOBS[job]?.family] || []).find(entry => entry.id === buildId);
  return build?.skills || [];
}

// Default loadout for a freshly promoted adventurer: rank-1 signature cast.
export function defaultSkills(job) {
  const id = signatureSkillId(job);
  return { skills: id ? { [id]: 1 } : {}, activeSkill: id, activeSkills: id ? [id] : [] };
}
// Kept for callers that only need the multiplier.
export { skillPower as skillMultiplier } from './skillcore.js';

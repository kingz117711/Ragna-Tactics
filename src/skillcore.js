// Skill authoring core: the shape every skill in the catalog is built from, plus
// the pure helpers the simulation and UI share. No DOM, no side effects.
//
// A skill is authored once for the job that learns it (`job`). Availability walks
// the job's ancestry, exactly like Ragnarok Online: a Knight may train Swordsman
// skills, a Lord Knight may train Swordsman and Knight skills, and so on. Ranks
// unlock at job levels, and most skills also require a prerequisite rank.

// Schema-2 job trees (first → second → transcendent → third, expanded lines).
const TIER_BY_JOB_TIER = {
  novice: 0, first: 1, second: 2, transcendent: 2, third: 3,
  expanded: 1, expandedSecond: 2, expandedThird: 3,
};

// Normalise one authored row into the object the rest of the game reads.
// `row` is compact on purpose: the catalog is big and hand-written.
export function defineSkill(id, row) {
  const maxRank = row.maxRank ?? 1;
  const unlock = row.unlock ?? Array.from({ length: maxRank }, (_, i) => (i === 0 ? 1 : (i + 1) * 4));
  const shape = row.shape ?? 'strike';
  const skill = {
    id,
    name: row.name,
    job: row.job,
    maxRank,
    unlock,
    prereq: row.prereq ?? [],
    shape,
    // Legacy alias: older UI copy spoke of "kind".
    kind: shape === 'area' ? 'area' : shape === 'heal' ? 'heal' : shape === 'buff' ? 'buff' : 'strike',
    passive: row.passive ?? null,
    sp: row.sp ?? 8,
    spPer: row.spPer ?? 0,
    cooldown: row.cd ?? 5,
    cdPer: row.cdPer ?? 0,
    cast: row.cast ?? 0,
    range: row.range ?? 0,
    radius: row.radius ?? 0,
    element: row.element ?? null,
    status: row.status ?? null,
    statusTime: row.statusTime ?? 0,
    statusPower: row.statusPower ?? 0,
    fx: row.fx ?? 'slash',
    impact: row.impact ?? 'skill-hit',
    power: row.power ?? 2,
    powerPer: row.powerPer ?? 0.15,
    hits: row.hits ?? 1,
    icon: row.icon ?? 'sword',
    desc: row.desc ?? '',
    // Legacy alias kept so older surfaces (rows, tooltips) keep reading `text`.
    text: row.desc ?? '',
    build: row.build ?? null,
    // Passive skills contribute flat stats; active skills contribute nothing.
    bonus: row.bonus ?? null,
    // Procedural companions (falcon, warg, homunculus, mado suit).
    summon: row.summon ?? null,
  };
  return skill;
}

// Values at a rank (1-based). Rank 1 is the authored base.
export const rankValue = (base, per, rank = 1) => base + per * (Math.max(1, Math.min(rank || 1, 99)) - 1);
export function skillSp(skill, rank = 1) { return Math.round(rankValue(skill.sp, skill.spPer, rank)); }
export function skillCooldown(skill, rank = 1) { return Math.round(rankValue(skill.cooldown, skill.cdPer, rank) * 10) / 10; }
export function skillPower(skill, rank = 1) { return Math.round(rankValue(skill.power, skill.powerPer, rank) * 100) / 100; }

// Legacy export used by tests and the catalog page: the damage multiplier.
export { skillPower as skillMultiplier };

export function jobTier(job) {
  return TIER_BY_JOB_TIER[job?.tier] ?? 0;
}

// The ancestry chain, newest first: [lordKnight, knight, swordsman]. Skills of
// every job on this chain are trainable, which mirrors RO's shared first-job tree.
export function jobChain(job, JOBS) {
  const chain = [];
  for (let current = job; current && !chain.includes(current); current = JOBS[current]?.parent) chain.push(current);
  return chain;
}

// Predicate builder: the catalog injects JOBS so it can resolve ancestry lazily.
export function makeSkillHelpers(catalog, jobs) {
  // `jobs` is a getter: data.js and skills.js form an import cycle, so the job
  // table is only readable after both modules finish evaluating.
  const tier = job => jobTier(jobs()[job]);
  const chainOf = job => jobChain(job, jobs());

  // Every skill a job can eventually train, in tree order: first-job line first.
  function skillCatalog(job) {
    const chain = chainOf(job);
    return Object.entries(catalog)
      .filter(([, def]) => chain.includes(def.job))
      .sort((a, b) => tier(a[1].job) - tier(b[1].job) || a[1].unlock[0] - b[1].unlock[0] || (a[1].maxRank - b[1].maxRank) || a[1].name.localeCompare(b[1].name));
  }
  // The skills authored for this exact job — the ones a fresh promotion opens.
  function jobSkills(job) {
    return Object.entries(catalog).filter(([, def]) => def.job === job)
      .sort((a, b) => a[1].unlock[0] - b[1].unlock[0] || a[1].name.localeCompare(b[1].name));
  }
  function canLearnSkill(job, id) {
    const def = catalog[id];
    return !!def && chainOf(job).includes(def.job);
  }
  function skillUnlockLevel(id, rank) {
    const def = catalog[id];
    if (!def) return 1;
    return def.unlock[rank - 1] ?? def.unlock.at(-1) ?? 1;
  }
  // Prerequisites are per skill, not per rank (RO behaviour).
  function prereqMet(skills, def) {
    return def.prereq.every(([id, rank]) => (skills?.[id] || 0) >= rank);
  }
  function missingPrereqs(skills, def) {
    return def.prereq.filter(([id, rank]) => (skills?.[id] || 0) < rank)
      .map(([id, rank]) => `${catalog[id]?.name || id} ${rank}`);
  }
  function learnedRank(c, id) {
    const def = catalog[id];
    if (!def) return 0;
    const rank = Math.round(Number(c?.skills?.[id]) || 0);
    return Math.max(0, Math.min(def.maxRank, rank));
  }
  // Free skill points: every job level grants one point, every rank costs one.
  // This is the renewable currency training spends, so a tree cannot be maxed at
  // low job levels the way RO caps out at 49/69 points.
  function skillPoints(jobLevel, skills) {
    const spent = Object.values(skills || {}).reduce((sum, rank) => sum + (Number(rank) || 0), 0);
    return Math.max(0, jobLevel - spent);
  }
  // Passive bonuses are summed across learned ranks and read by stats().
  function passiveBonus(skills) {
    const total = {};
    for (const [id, rank] of Object.entries(skills || {})) {
      const def = catalog[id];
      if (!def?.passive || !rank) continue;
      for (const [key, base] of Object.entries(def.passive)) {
        total[key] = (total[key] || 0) + base * rank;
      }
    }
    return total;
  }
  function signatureSkillId(job) {
    const own = jobSkills(job).find(([id, def]) => def.shape !== 'passive' && skillUnlockLevel(id, 1) <= 1 && !def.prereq.length);
    return own?.[0] || jobSkills(job).find(([, def]) => def.shape !== 'passive')?.[0] || null;
  }
  function defaultSkills(job) {
    const id = signatureSkillId(job);
    return { skills: id ? { [id]: 1 } : {}, activeSkill: id };
  }
  function activeSkillId(c) {
    const id = c?.activeSkill;
    if (!id || !canLearnSkill(c.job, id)) return null;
    return learnedRank(c, id) > 0 ? id : null;
  }
  function activeSkill(c) { return catalog[activeSkillId(c)] || null; }
  function learnedSkillPower(c) {
    let total = 0;
    for (const id of Object.keys(c?.skills || {})) total += learnedRank(c, id) * 2;
    return total;
  }
  // A build is a rotation preset: which learned skills the AI favours, in order.
  const buildRotation = (build, learnedIds) =>
    (build?.skills || []).filter(id => learnedIds.includes(id));
  // The build chosen for a job+fam
  const familyOf = job => jobs()[job]?.family || job;
  return {
    tier, chainOf, skillCatalog, jobSkills, canLearnSkill, skillUnlockLevel,
    prereqMet, missingPrereqs, learnedRank, skillPoints, passiveBonus,
    signatureSkillId, defaultSkills, activeSkillId, activeSkill, learnedSkillPower,
    buildRotation, familyOf, jobTier: tier,
  };
}

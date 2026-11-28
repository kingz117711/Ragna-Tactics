import test from 'node:test';
import assert from 'node:assert/strict';
import { JOBS, JOB_ROLES, ROLE_LABELS, classBuilds, jobChoices, jobLineage, promotionRequirement } from '../src/data.js';

test('Renewal and expanded job branches form valid parent-linked promotion paths', () => {
  for (const [id, job] of Object.entries(JOBS)) {
    assert.ok(job.family, `${id} has a class family`);
    assert.ok(job.jobLevelCap >= 10, `${id} has a job-level cap`);
    if (job.parent) assert.ok(JOBS[job.parent], `${id} has a valid parent ${job.parent}`);
    if (id !== 'novice') assert.ok(JOB_ROLES[id] && ROLE_LABELS[JOB_ROLES[id]], `${id} has a combat role`);
  }
  assert.deepEqual(jobChoices('swordsman').map(([id]) => id).sort(), ['crusader', 'knight']);
  assert.equal(jobLineage('shadowChaser').at(-1), 'Shadow Chaser');
  assert.deepEqual(jobLineage('sura'), ['Novice', 'Acolyte', 'Monk', 'Champion', 'Sura']);
  assert.equal(promotionRequirement('runeKnight').jobLevel, 50);
  assert.equal(promotionRequirement('runeKnight').baseLevel, 99);
});

test('class families expose distinct idle build identities across the requested roster', () => {
  for (const job of ['sniper', 'ranger', 'sura', 'shadowChaser', 'archBishop']) {
    assert.ok(classBuilds(job).length >= 2, `${job} exposes multiple family builds`);
  }
  const sniperBuilds = classBuilds('sniper').map(build => build.name);
  assert.ok(sniperBuilds.some(name => /auto/i.test(name)));
  assert.ok(sniperBuilds.some(name => /falcon/i.test(name)));
  assert.ok(sniperBuilds.some(name => /trap/i.test(name)));
  assert.ok(classBuilds('sura').some(build => build.style === 'tank'));
  assert.ok(classBuilds('shadowChaser').some(build => build.rotation === 'debuff-control'));
});

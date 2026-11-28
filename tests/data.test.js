import test from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_REGIONS, ATLAS_SIZE, filterAtlas } from '../src/atlas.js';
import { MAPS, JOBS, JOB_ROLES, ROLE_LABELS, classBuilds, jobChoices, jobLineage, promotionRequirement } from '../src/data.js';

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

test('the atlas covers each level through 150 and lists each live map once', () => {
  const entries = ATLAS_REGIONS.flatMap(region => region.destinations);
  assert.equal(entries.length, ATLAS_SIZE);
  assert.equal(new Set(entries.map(map => map.id)).size, ATLAS_SIZE);
  assert.ok(entries.every(map => map.name && map.note && map.min >= 1 && map.max <= 150 && map.min <= map.max));
  assert.deepEqual(filterAtlas(null, true).flatMap(region => region.destinations.map(map => map.id)).sort(), Object.keys(MAPS).sort());
  for (let level = 1; level <= 150; level++) assert.ok(filterAtlas([level, level], false).length, `Lv. ${level} has a destination`);
  assert.deepEqual(filterAtlas([126, 150], true), []);
});

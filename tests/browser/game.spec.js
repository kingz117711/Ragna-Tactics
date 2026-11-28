import { test, expect } from '@playwright/test';
import { createGame, gainExp } from '../../src/sim.js';
import { jobChoices } from '../../src/data.js';
import { encodeSave } from '../../src/persistence.js';
import { fitZoom, project } from '../../src/renderer.js';
const boot = async page => { await page.goto('/'); await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 }); };
test('hunt orders work by touch and respect reduced motion', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ hasTouch: true, reducedMotion: 'reduce', viewport: { width: 390, height: 844 }, baseURL });
  try {
    const page = await context.newPage();
    await boot(page);
    await page.locator('#first-deploy').tap();
    await page.locator('#deployment-form button.primary').tap();
    await page.locator('[data-action="rally"]').tap();
    await expect(page.locator('[data-action="rally"]')).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('Radius').selectOption('3');
    // Open ground above the order hint (which carries the interactive hunt tools).
    await page.locator('#battlefield').tap({ position: { x: 195, y: 120 } });
    await expect(page.locator('#order-hint')).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.characters.every(c => c.farmRadius === 3))).toBe(true);
    await page.locator('[data-action="rally"]').tap();
    await page.getByLabel('Radius').selectOption('10');
    await page.getByRole('button', { name: 'Centre on unit' }).press('Enter');
    await expect(page.locator('#order-hint')).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.characters.every(c => c.farmRadius === 10))).toBe(true);
    await expect(page.locator('.input-pulse')).toHaveCount(0);
  } finally { await context.close(); }
});
test('button activation animates and the player can advance from the job notice', async ({ page }) => {
  const s = createGame(); gainExp(s, s.characters[0], 0, 1000);
  await page.addInitScript(raw => localStorage.setItem('ragna-tactics:save:v1', raw), encodeSave(s));
  await boot(page);
  await expect(page.locator('#job-names')).toHaveText('Aren');
  await page.locator('#job-notice').click();
  expect(await page.locator('.input-pulse').count()).toBeGreaterThan(0);
  await page.locator('[data-service="advance"]').click();
  await expect(page.locator('.job-preview')).toHaveCount(jobChoices('novice').length);
  await page.screenshot({ path: 'artifacts/job-choice.png' });
  await page.locator('input[value="mage"]').check();
  await page.locator('#job-form button.primary').click();
  await expect(page.locator('#job-notice')).toBeHidden();
});
test('new guild deploys, forms a party, switches maps, orders movement, and saves', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page); await expect(page.locator('.character-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Link as party' }).click();
  await page.getByRole('button', { name: 'Plan your first expedition' }).click();
  await page.getByRole('button', { name: 'Begin expedition' }).click();
  await expect(page.locator('#map-population')).toContainText('2 adventurers');
  await page.locator('[data-map="forest"]').click(); await expect(page.locator('#map-name')).toHaveText('Willow Wood');
  await expect(page.locator('#map-population')).toContainText('0 adventurers');
  await page.locator('[data-map="meadow"]').click();
  await page.locator('[data-action="move"]').click();
  const box = await page.locator('#battlefield').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.65);
  await expect(page.locator('#order-hint')).toBeHidden();
  await page.locator('#save-button').click();
  await page.reload(); await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#map-population')).toContainText('2 adventurers');
  await page.screenshot({ path: 'artifacts/foundation-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('job advancement, boss deployment, and storage work from a progressed save', async ({ page }) => {
  const s = createGame(); for (const c of s.characters) gainExp(s, c, 300, 1000); s.inventory.equipment.iron = 1;
  await page.addInitScript(raw => localStorage.setItem('ragna-tactics:save:v1', raw), encodeSave(s));
  await boot(page);
  await page.locator('[data-character="c1"]').click(); await page.getByRole('button', { name: 'Job path', exact: true }).click();
  await page.locator('input[value="swordsman"]').check(); await page.locator('#job-form button[type="submit"]').click();
  await expect(page.locator('[data-character="c1"]')).toContainText('Swordsman');
  await page.locator('[data-character="c2"]').click(); await page.getByRole('button', { name: 'Job path', exact: true }).click();
  await page.locator('input[value="acolyte"]').check(); await page.locator('#job-form button[type="submit"]').click();
  await page.locator('[data-character="c1"]').click(); await page.locator('[data-action="equipment"]').click();
  await page.locator('[data-equip="iron"]').click();
  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state;
    return [state.characters[0].equipment, state.inventory.equipment.iron];
  })).toEqual(['iron', 0]);
  await page.locator('#modal-close').click();
  await page.locator('#select-all').click(); await page.getByRole('button', { name: 'Link as party' }).click();
  await page.locator('[data-action="deploy"]').click(); await page.locator('input[value="arena"]').check();
  await page.getByRole('button', { name: 'Begin expedition' }).click();
  await expect(page.locator('#boss-status')).toBeVisible(); await expect(page.locator('#map-name')).toHaveText('The Broken Sanctuary');
  await page.screenshot({ path: 'artifacts/foundation-boss.png', fullPage: true });
  await page.locator('#storage-button').click(); await expect(page.locator('#modal')).toContainText('Sanctuary relic');
});
test('small screen has no horizontal overflow and supports tap-to-move controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Plan your first expedition' }).click(); await page.getByRole('button', { name: 'Begin expedition' }).click();
  await page.locator('[data-action="move"]').click(); await expect(page.locator('#order-hint')).toBeVisible();
  const box = await page.locator('#battlefield').boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('#order-hint')).toBeHidden();
  await page.screenshot({ path: 'artifacts/foundation-mobile.png', fullPage: true });
});
test('party leadership, per-character tactics, and world overview work through the UI', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await page.getByRole('button', { name: 'Link as party' }).click();
  await expect(page.locator('#party-overview')).toContainText('Aren’s party');
  const partyMember = page.locator('#party-overview .party-member[data-character="c2"]');
  await partyMember.focus(); await page.keyboard.press('Enter'); await expect(partyMember).toBeFocused();
  await page.locator('#roster [data-character="c2"]').click();
  await page.getByRole('button', { name: 'Lead party' }).click();
  await expect(page.locator('#party-overview')).toContainText('Leader: Lyra');
  await page.locator('#select-all').click(); await page.getByRole('button', { name: 'Separate' }).click();
  await expect(page.locator('#party-overview')).toContainText('No linked parties');
  await page.locator('#select-all').click(); await page.getByRole('button', { name: 'Link as party' }).click();
  await expect(page.locator('#party-overview')).toContainText('Aren’s party');
  await page.locator('#roster [data-character="c2"]').click();
  await page.locator('summary', { hasText: 'Fine-tune tactics' }).click();
  await page.locator('[data-tactics-key="autoSkill"]').uncheck();
  await page.locator('[data-tactics-key="potionAt"]').evaluate(el => { el.value = '65'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.locator('#target-pref-select').selectOption('nearest');
  await expect.poll(() => page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.characters.find(c => c.id === 'c2');
    return [c.tactics.autoSkill, c.tactics.potionAt, c.tactics.targetPref];
  })).toEqual([false, 0.65, 'nearest']);
  await page.locator('[data-action="deploy"]').click(); await page.locator('#deployment-form button.primary').click();
  await page.locator('#world-button').click();
  await expect(page.locator('#modal')).toContainText('South Prontera');
  await expect(page.locator('#modal')).toContainText('potions');
  await page.screenshot({ path: 'artifacts/world-overview.png' });
  await page.locator('[data-world-character="c2"]').click();
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('#map-name')).toHaveText('South Prontera');
  expect(errors).toEqual([]);
});
test('all character tactics settings survive presets, live refresh, save, and reload', async ({ page }) => {
  await boot(page);
  await page.locator('[data-character="c1"]').click();
  await page.locator('summary', { hasText: 'Fine-tune tactics' }).click();
  await expect(page.locator('.tactics-details')).toHaveAttribute('open', '');
  await page.waitForTimeout(800);
  await expect(page.locator('.tactics-details')).toHaveAttribute('open', '');
  const auto = page.locator('[data-tactics-key="autoSkill"]'); await auto.uncheck();
  const setThreshold = async (key, percent) => page.locator(`[data-tactics-key="${key}"]`).evaluate((el, value) => {
    el.value = String(value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, percent);
  await setThreshold('healAt', 80); await setThreshold('potionAt', 60); await setThreshold('retreatAt', 35);
  await page.locator('#target-pref-select').selectOption('lowest');
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.characters.find(c => c.id === 'c1').tactics);
  await expect.poll(read).toEqual({ autoSkill: false, healAt: 0.8, potionAt: 0.6, retreatAt: 0.35, targetPref: 'lowest' });
  await expect(page.locator('.tactics-details')).toHaveAttribute('open', '');

  // A range slider remains the focused DOM node while half-second live UI renders run.
  const healing = page.locator('[data-tactics-key="healAt"]'); await healing.focus();
  await page.waitForTimeout(900); await expect(healing).toBeFocused();
  await healing.blur();

  for (const [preset, expected] of [
    ['aggressive', ['true', '50', '30', '10', 'nearest']],
    ['conserve', ['false', '65', '45', '25', 'leader']],
    ['safe', ['true', '65', '45', '22', 'leader']],
  ]) {
    await page.locator('#tactic-select').focus(); await page.locator('#tactic-select').selectOption(preset);
    await expect(page.locator('.tactics-details')).toHaveAttribute('open', '');
    await expect.poll(async () => [
      await page.locator('[data-tactics-key="autoSkill"]').isChecked(),
      await page.locator('[data-tactics-key="healAt"]').inputValue(),
      await page.locator('[data-tactics-key="potionAt"]').inputValue(),
      await page.locator('[data-tactics-key="retreatAt"]').inputValue(),
      await page.locator('#target-pref-select').inputValue(),
    ].map(String)).toEqual(expected);
    await expect.poll(read).toEqual({ autoSkill: expected[0] === 'true', healAt: Number(expected[1]) / 100, potionAt: Number(expected[2]) / 100, retreatAt: Number(expected[3]) / 100, targetPref: expected[4] });
  }
  await page.locator('#save-button').click(); await page.reload(); await expect(page.locator('#loading')).toBeHidden();
  await page.locator('[data-character="c1"]').click(); await page.locator('summary', { hasText: 'Fine-tune tactics' }).click();
  await expect.poll(read).toEqual({ autoSkill: true, healAt: 0.65, potionAt: 0.45, retreatAt: 0.22, targetPref: 'leader' });
});
test('move, hold, focus, retreat, resume, multi-map overview and character navigation work in the UI', {timeout:45000}, async ({ page }) => {
  const s = createGame(); gainExp(s, s.characters[0], 300, 1000); gainExp(s, s.characters[1], 300, 1000);
  const { command } = await import('../../src/sim.js');
  command(s, { type: 'promote', ids: ['c1'], job: 'archer' }); command(s, { type: 'promote', ids: ['c2'], job: 'swordsman' });
  command(s, { type: 'deploy', ids: ['c1'], mapId: 'meadow' }); command(s, { type: 'deploy', ids: ['c2'], mapId: 'forest' });
  const c1 = s.characters[0], enemy = s.maps.meadow.monsters[0];
  s.maps.meadow.monsters = [enemy]; Object.assign(enemy, { x: 11, y: 0, hp: 1000, timer: 100, targetId: null });
  Object.assign(c1, { x: 0, y: 0, home: { x: 0, y: 0 }, order: 'hold', status: 'holding', targetId: null, attackTimer: 100, tactics: { ...c1.tactics, autoSkill: false } });
  await page.addInitScript(raw => localStorage.setItem('ragna-tactics:save:v1', raw), encodeSave(s));
  await boot(page);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state);
  await page.locator('[data-character="c1"]').click();
  const box = await page.locator('#battlefield').boundingBox();
  // Click→world must mirror the renderer's own fit for South Prontera's bounds.
  const scale = fitZoom('meadow', box.width, box.height);
  const clickWorld = async (x, y, hitOffset = -15) => page.locator('#battlefield').click({ position: {
    x: box.width / 2 + (x - y) * 22 * scale,
    y: box.height / 2 + 20 + (x + y) * 11 * scale + hitOffset * scale,
  } });
  await clickWorld(enemy.x, enemy.y);
  await expect.poll(async () => (await saved()).characters[0].order).toBe('focus');
  await expect.poll(async () => (await saved()).characters[0].targetId).toBe(enemy.id);
  await page.locator('[data-action="move"]').click(); await clickWorld(4, 4, 0);
  await expect.poll(async () => (await saved()).characters[0].order).toBe('move');
  await page.locator('[data-action="hold"]').click(); await expect.poll(async () => (await saved()).characters[0].order).toBe('hold');
  await expect(page.locator('[data-action="hold"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="resume"]').click(); await expect.poll(async () => (await saved()).characters[0].order).toBe('farm');
  await expect(page.locator('[data-action="resume"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="retreat"]').click();
  await expect.poll(async () => (await saved()).characters[0].mapId, { timeout: 24000 }).toBeNull();
  await page.locator('#world-button').click();
  await expect(page.locator('#modal')).toContainText('Willow Wood');
  await page.locator('[data-world-character="c2"]').click();
  await expect(page.locator('#map-name')).toHaveText('Willow Wood');
  await expect.poll(async () => (await saved()).characters[1].mapId).toBe('forest');
});
test('expedition goal action deploys the starting pair and v1 saves without new fields still load', async ({ page }) => {
  const s = createGame();
  const raw = JSON.parse(encodeSave(s));
  delete raw.state.milestones.expeditionStep; for (const c of raw.state.characters) delete c.tactics;
  await page.addInitScript(value => localStorage.setItem('ragna-tactics:save:v1', JSON.stringify(value)), raw);
  await boot(page);
  await expect(page.locator('#expedition-goals')).toContainText('0/6');
  await page.locator('[data-goal-next]').click(); await page.locator('#deployment-form button.primary').click();
  await expect(page.locator('#expedition-goals')).toContainText('1/6');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.characters.every(c => c.tactics && c.tactics.autoSkill))).toBe(true);
  await page.locator('#multi-select').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#multi-select')).toHaveAttribute('aria-pressed', 'true');
});
test('a second tab cannot write the same guild', async ({ context, page }) => {
  await boot(page); const second = await context.newPage(); await second.goto('/');
  await expect(second.locator('#loading-text')).toContainText('already open in another tab'); await second.close();
});
test('unlocked roster slots recruit a new Novice through the management screen', async ({ page }) => {
  const s = createGame(); s.milestones.bossKills = 1;
  await page.addInitScript(raw => localStorage.setItem('ragna-tactics:save:v1', raw), encodeSave(s));
  await boot(page); await page.locator('#recruit-button').click();
  await page.locator('#recruit-name').fill('Nia'); await page.locator('#recruit-sex').selectOption('f');
  await page.locator('#recruit-form button.primary').click();
  await expect(page.locator('.character-card')).toHaveCount(3); await expect(page.locator('[data-character="c3"]')).toContainText('Nia');
  await expect(page.locator('[data-character="c3"]')).toContainText('Novice');
});
test('offline worker settles a six-hour absence with a four-hour cap and one report', async ({ page }) => {
  const s = createGame();
  const { command } = await import('../../src/sim.js'); command(s, { type: 'deploy', ids: ['c1', 'c2'], mapId: 'meadow' });
  await page.addInitScript(raw => localStorage.setItem('ragna-tactics:save:v1', raw), encodeSave(s, Date.now() - 6 * 3600_000));
  await boot(page); await expect(page.locator('#modal')).toContainText('four-hour limit');
  await expect(page.locator('.report-stat').first()).toContainText('4.0h');
  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')));
  expect(Date.now() - checkpoint.savedAt).toBeLessThan(10000);
  await page.locator('#continue-adventure').click(); await expect(page.locator('#modal')).toBeHidden();
});
test('closing a hidden tab preserves the checkpoint time for offline rewards', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hiddenCheckpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).savedAt);
  await page.clock.setFixedTime(new Date(hiddenCheckpoint + 600_000));
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const closingCheckpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).savedAt);
  expect(closingCheckpoint).toBe(hiddenCheckpoint);
});
test('switching tabs catches up live simulation silently, including active boss fights', async ({ page }) => {
  const s = createGame();
  const { command } = await import('../../src/sim.js');
  for (const [index,c] of s.characters.entries()) {
    c.jobLevel = 10;
    expect(command(s,{type:'promote',ids:[c.id],job:index ? 'acolyte' : 'swordsman'})).toBeNull();
  }
  expect(command(s, { type: 'deploy', ids: ['c1', 'c2'], mapId: 'arena' })).toBeNull();
  await page.addInitScript(raw => localStorage.setItem('ragna-tactics:save:v1', raw), encodeSave(s));
  await boot(page);
  const before = await readSave(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hiddenCheckpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).savedAt);
  await page.clock.setFixedTime(new Date(hiddenCheckpoint + 12_000));
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await readSave(page)).time, { timeout: 30000 }).toBeGreaterThan(before.time + 10);
  await expect(page.locator('#modal')).toBeHidden();
  const after = await readSave(page);
  expect(after.maps.arena.bossTimer).not.toBe(before.maps.arena.bossTimer);
  expect(after.journal.some(entry => /Away report/.test(entry.message))).toBe(false);
});
test('the guild bag exposes equipment, personal Red Potions, refinement ores, and camp restock', async ({ page }) => {
  const s = createGame(); s.inventory.zeny = 150;
  s.inventory.materials = { Emveretarcon: 2, Oridecon: 1, Elunium: 1 };
  s.inventory.equipment.iron = 1; s.characters[0].potions = 5;
  await page.addInitScript(raw => localStorage.setItem('ragna-tactics:save:v1', raw), encodeSave(s));
  await boot(page); await page.locator('#bag-button').click();
  await expect(page.locator('#modal-title')).toHaveText('Guild bag');
  await expect(page.locator('#modal')).toContainText('Oridecon');
  await expect(page.locator('#modal')).toContainText('Elunium');
  await expect(page.locator('#modal')).toContainText('Red Potion · Aren');
  await page.locator('[data-bag-restock="c1"]').click();
  await expect.poll(async () => { const s = await readSave(page); return [s.characters[0].potions, s.inventory.zeny]; }).toEqual([10, 140]);
  await page.locator('[data-bag-equipment]').click();
  await expect(page.locator('#modal-title')).toContainText('equipment');
  await page.locator('[data-equip="iron"]').click();
  await page.locator('[data-refine="1"]').click();
  await expect(page.locator('#modal')).toContainText('+1 Iron armament');
});

test('mobile camp access and additive selection stay available without a keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page);
  await page.getByRole('button', { name: 'Manage guild camp' }).click(); await expect(page.locator('#modal-title')).toContainText('guild camp');
  await page.locator('#modal-close').click(); await page.locator('[data-character="c1"]').click();
  await page.locator('#multi-select').click(); await page.locator('[data-character="c2"]').click();
  await expect(page.locator('.character-card.selected')).toHaveCount(2);
});

test('a Merchant advances to Blacksmith and forges equipment from field loot', async ({ page }) => {
  const s = createGame();
  Object.assign(s.characters[0], { job: 'merchant', jobLevel: 40 });
  s.inventory.materials = { Resin: 4, Fluff: 6 };
  await page.addInitScript(raw => {
    if (!localStorage.length) localStorage.setItem('ragna-tactics:save:v1', raw);
  }, encodeSave(s));
  await boot(page);
  await page.locator('#job-notice').click();
  await page.locator('[data-camp-unit="c1"]').click();
  await page.locator('input[value="blacksmith"]').check();
  await page.locator('#modal').screenshot({ path: 'artifacts/second-job.png' });
  await page.locator('#job-form button.primary').click();
  await page.locator('#storage-button').click();
  await page.locator('[data-forge="guard"]').click();
  await expect(page.locator('[data-forge="guard"]')).toBeDisabled();
  await page.reload();
  await expect(page.locator('[data-character="c1"]').first()).toContainText('Blacksmith');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.inventory.equipment.guard)).toBe(1);
});

test('view Morroc and socket a Peco Peco Card at camp', async ({page}) => {
  const s = createGame(); s.inventory.cards.peco = 1; s.characters[0].equipment = 'guard';
  await page.addInitScript(raw => { if (!localStorage.length) localStorage.setItem('ragna-tactics:save:v1',raw); },encodeSave(s));
  await boot(page); await page.locator('[data-map="morroc"]').click();
  await expect(page.locator('#map-name')).toHaveText('Morroc Dunes');
  await page.locator('[data-character="c1"]').first().click(); await page.locator('[data-action="equipment"]').click();
  await page.locator('[data-socket="peco"]').click();
  await expect(page.getByRole('heading',{name:'Guard insignia · Peco Peco Card'})).toBeVisible();
  await page.locator('#modal').screenshot({path:'artifacts/monster-cards.png'});
  await page.reload(); await expect(page.locator('#loading')).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.characters[0].card)).toBe('peco');
});

test('deploy a second-job duo to Sandsea Hollow and read the MVP party order', async ({page}) => {
  const s = createGame();
  Object.assign(s.characters[0], {job:'knight',level:24,hp:550});
  Object.assign(s.characters[1], {job:'priest',level:24,hp:460});
  await page.addInitScript(raw => localStorage.setItem('ragna-tactics:save:v1',raw),encodeSave(s));
  await boot(page); await page.locator('[data-action="deploy"]').click();
  await page.locator('input[value="lair"]').check();
  await page.locator('#deployment-form button.primary').click();
  await expect(page.locator('#boss-status')).toContainText('Phreeoni');
  await expect(page.locator('#boss-status')).toContainText('Sand Pact',{ timeout:14000 });
  await page.locator('#battlefield').screenshot({path:'artifacts/phreeoni.png'});
});

test('preview and commit a personal stat build at camp', async ({page}) => {
  const s = createGame(); s.characters[0].level = 4;
  await page.addInitScript(raw => { if (!localStorage.length) localStorage.setItem('ragna-tactics:save:v1',raw); },encodeSave(s));
  await boot(page); await page.locator('[data-character="c1"]').first().click();
  await page.locator('[data-action="attributes"]').click();
  await page.getByRole('button',{name:'Increase Vitality'}).click();
  await page.getByRole('button',{name:'Increase Strength'}).click();
  await expect(page.locator('#stat-remaining')).toHaveText('4 points available');
  await page.locator('#modal').screenshot({path:'artifacts/stat-training.png'});
  await page.locator('#train-stats').click();
  await page.reload(); await expect(page.locator('#loading')).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.characters[0].attributes)).toEqual({vit:1,str:1});
});

test('accept a guild contract and claim the completed hunt after reloading', async ({page}) => {
  await boot(page); await page.locator('#bounty-button').click();
  await page.locator('[data-bounty="accept"][data-id="harvest"]').click();
  await expect(page.locator('#claim-bounty')).toBeDisabled();
  await page.reload(); await page.locator('#bounty-button').click();
  await expect(page.locator('#active-bounty-progress')).toHaveText('0 / 12');
  await page.locator('#modal').screenshot({path:'artifacts/bounty-board.png'});
  await page.evaluate(() => {
    const key='ragna-tactics:save:v1', save=JSON.parse(localStorage.getItem(key));
    save.state.bounty.kills=12;
    sessionStorage.setItem('completed-hunt',JSON.stringify(save));
  });
  await page.addInitScript(() => {
    const raw=sessionStorage.getItem('completed-hunt');
    if(raw){localStorage.setItem('ragna-tactics:save:v1',raw);sessionStorage.removeItem('completed-hunt');}
  });
  await page.reload(); await page.locator('#bounty-button').click(); await page.locator('#claim-bounty').click();
  await expect(page.locator('[data-bounty="accept"][data-id="harvest"]')).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.inventory.equipment.iron)).toBe(1);
});

test('prepare elemental magic and use the field guide to find a weak target', async ({page}) => {
  const s=createGame(); s.characters[0].job='wizard';
  await page.addInitScript(raw=>{if(!localStorage.length)localStorage.setItem('ragna-tactics:save:v1',raw);},encodeSave(s));
  await boot(page); await page.locator('[data-character="c1"]').first().click();
  await page.locator('[data-action="spellbook"]').click(); await page.locator('[data-attune="earth"]').click();
  await expect(page.locator('[data-attune="earth"]')).toHaveText('Prepared');
  await page.locator('#modal').screenshot({path:'artifacts/elemental-magic.png'});
  await page.locator('#modal-close').click(); await page.locator('#guide-button').click();
  const entry=page.locator('.bounty-entry').filter({has:page.getByRole('heading',{name:'Phreeoni',exact:true})});
  await expect(entry).toContainText('Weak to Earth');
  await entry.getByRole('button').click(); await expect(page.locator('#map-name')).toHaveText('Sandsea Hollow');
});

test('settle a split guild, craft the Payon ward, prepare Holy magic and deploy', async ({page}) => {
  const s=createGame(3), {command,stats}=await import('../../src/sim.js');
  for (const [i,c] of s.characters.entries()) {
    c.job=i?'hunter':'priest'; c.assignment='materials'; c.level=45; c.hp=stats(c).hp; c.sp=stats(c).sp;
    command(s,{type:'deploy',ids:[c.id],mapId:i?'morroc':'payon'});
  }
  await page.addInitScript(raw=>{if(!localStorage.length)localStorage.setItem('ragna-tactics:save:v1',raw);},encodeSave(s,Date.now()-600000));
  await boot(page); await expect(page.locator('#modal')).toContainText('Skel-Bone');
  await page.locator('#continue-adventure').click();
  await page.locator('#storage-button').click(); await page.locator('[data-forge="reliquary"]').click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.inventory.equipment.reliquary)).toBe(1);
  await page.locator('#modal-close').click();
  await page.locator('[data-character="c1"]').first().click();
  await page.locator('[data-action="retreat"]').click();
  await page.locator('[data-action="spellbook"]').click();
  await page.locator('#modal-close').click();
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.characters[0].mapId),{timeout:20000}).toBeNull();
  await page.locator('[data-action="spellbook"]').click(); await page.locator('[data-attune="holy"]').click();
  await page.locator('#modal-close').click(); await page.locator('[data-action="deploy"]').click();
  await page.locator('input[value="payon"]').check(); await page.locator('#deployment-form button.primary').click();
  await expect(page.locator('#map-name')).toHaveText('Payon Cave');
  await page.locator('#battlefield').screenshot({path:'artifacts/payon-cave.png'});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#battlefield').screenshot({path:'artifacts/payon-mobile.png'});
});

test('refine equipped gear at camp and inspect the next material cost',async({page})=>{
  const s=createGame(); s.characters[0].equipment='guard'; s.inventory.materials.Emveretarcon=2;
  await page.addInitScript(raw=>{if(!localStorage.length)localStorage.setItem('ragna-tactics:save:v1',raw);},encodeSave(s));
  await boot(page); await page.locator('[data-character="c1"]').first().click();
  await page.locator('[data-action="equipment"]').click(); await page.locator('[data-refine="1"]').click();
  await expect(page.getByRole('heading',{name:/^\+1 Guard insignia/})).toBeVisible();
  await expect(page.locator('[data-refine="2"]')).toBeDisabled();
  await page.locator('#modal').screenshot({path:'artifacts/refinement.png'});
});

test('advance to High Wizard and retain the equipped elemental spell',async({page})=>{
  const s=createGame();Object.assign(s.characters[0],{job:'wizard',jobLevel:50,element:'earth'});
  await page.addInitScript(raw=>{if(!localStorage.length)localStorage.setItem('ragna-tactics:save:v1',raw);},encodeSave(s));
  await boot(page);await page.locator('#job-notice').click();await page.locator('[data-camp-unit="c1"]').click();
  await page.locator('[value="highWizard"]').check();
  await page.locator('#modal').screenshot({path:'artifacts/transcendent.png'});
  await page.locator('#job-form button.primary').click();await page.locator('[data-action="spellbook"]').click();
  await expect(page.locator('[data-attune="earth"]')).toHaveText('Prepared');
  await page.reload();await expect(page.locator('.character-card').first()).toContainText('High Wizard');
});

// ---------------------------------------------------------------- milestone: larger maps + single-screen interface

const readSave = page => page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state);
const clickWorld = async (page, x, y) => {
  const box = await page.locator('#battlefield').boundingBox();
  const zoom = fitZoom('meadow', box.width, box.height);
  const p = project(x, y);
  await page.locator('#battlefield').click({ position: { x: box.width / 2 + p.x * zoom, y: box.height / 2 + 20 + p.y * zoom } });
};

test('South Prontera holds two separate hunting areas and both teams keep farming across a map switch', { timeout: 120000 }, async ({ page }) => {
  test.setTimeout(120000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await page.getByRole('button', { name: 'Plan your first expedition' }).click();
  await page.locator('#deployment-form button.primary').click();
  await expect(page.locator('#map-population')).toContainText('2 adventurers');
  // Aren hunts the Poring Meadow (radius 3), Lyra the Fabre Thicket (radius 10).
  await page.locator('[data-character="c1"]').click();
  await page.locator('[data-action="rally"]').click();
  await page.getByLabel('Radius').selectOption('3');
  await clickWorld(page, -25, 17);
  await expect.poll(async () => (await readSave(page)).characters[0].farmRadius).toBe(3);
  await page.locator('[data-character="c2"]').click();
  await page.locator('[data-action="rally"]').click();
  await page.getByLabel('Radius').selectOption('10');
  await clickWorld(page, 23, 8);
  await expect.poll(async () => (await readSave(page)).characters[1].farmRadius).toBe(10);
  const areas = await readSave(page);
  // Click→world has sub-pixel rounding; the areas must be the intended spots.
  expect(Math.hypot(areas.characters[0].farmCenter.x + 25, areas.characters[0].farmCenter.y - 17)).toBeLessThan(1);
  expect(Math.hypot(areas.characters[1].farmCenter.x - 23, areas.characters[1].farmCenter.y - 8)).toBeLessThan(1);
  expect(areas.characters[0].farmCenter).not.toEqual(areas.characters[1].farmCenter);
  // Send Lyra to Willow Wood; Aren must keep farming the meadow unattended.
  // (Redeploying out of an active fight is refused — retreat to camp first.)
  await page.locator('[data-character="c2"]').click();
  await page.locator('[data-action="retreat"]').click();
  await expect.poll(async () => (await readSave(page)).characters[1].mapId, { timeout: 20000 }).toBeNull();
  await page.locator('[data-character="c2"]').click();
  await page.locator('[data-action="deploy"]').click();
  await page.locator('input[value="forest"]').check();
  await expect(page.locator('input[value="forest"]')).toBeChecked();
  await page.locator('#deployment-form button.primary').click();
  await expect.poll(async () => (await readSave(page)).characters[1].mapId).toBe('forest');
  await expect.poll(async () => (await readSave(page)).characters[0].kills, { timeout: 25000 }).toBeGreaterThan(0);
  await expect.poll(async () => (await readSave(page)).characters[1].kills, { timeout: 30000 }).toBeGreaterThan(0);
  const after = await readSave(page);
  expect(Math.hypot(after.characters[0].farmCenter.x + 25, after.characters[0].farmCenter.y - 17)).toBeLessThan(1);
  expect(after.characters[0].farmRadius).toBe(3);
  expect(after.characters[1].mapId).toBe('forest');
  // Reload the guild: hunting areas, radii, map assignments and kills must persist.
  await page.reload(); await expect(page.locator('#loading')).toBeHidden();
  const reloaded = await readSave(page);
  expect(reloaded.characters[0].farmRadius).toBe(3);
  expect(Math.hypot(reloaded.characters[0].farmCenter.x + 25, reloaded.characters[0].farmCenter.y - 17)).toBeLessThan(1);
  // Redeploying starts a fresh expedition, so Lyra's Thicket area was cleared on deploy (by design).
  expect(reloaded.characters[1].farmRadius).toBeUndefined();
  expect(reloaded.characters[1].mapId).toBe('forest');
  expect(reloaded.characters[0].kills).toBeGreaterThanOrEqual(after.characters[0].kills);
  expect(errors).toEqual([]);
});

test('minimap click navigates the camera and Find cycles to an adventurer', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Plan your first expedition' }).click();
  await page.locator('#deployment-form button.primary').click();
  await expect(page.locator('#map-population')).toContainText('2 adventurers');
  const label0 = await page.locator('#minimap').getAttribute('aria-label');
  expect(label0).toContain('Minimap of South Prontera');
  expect(label0).toContain('Camera centred at');
  expect(label0).toContain('Aren');
  expect(label0).toContain('Lyra');
  const box = await page.locator('#minimap').boundingBox();
  await page.locator('#minimap').click({ position: { x: box.width * 0.78, y: box.height * 0.25 } });
  await expect.poll(() => page.locator('#minimap').getAttribute('aria-label')).not.toBe(label0);
  const label1 = await page.locator('#minimap').getAttribute('aria-label');
  expect(label1).toContain('Camera centred at');
  await page.locator('#find-unit').click();
  await expect(page.locator('.character-card.selected')).toHaveCount(1);
  const label2 = await page.locator('#minimap').getAttribute('aria-label');
  expect(label2).not.toBe(label1);
  expect(label2).toContain('Camera centred at');
});

test('phone details sheet and panels open and close without losing selection or camera', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await page.locator('[data-character="c1"]').click();
  // Unit positions tick in the label; only the camera fragment must be stable.
  const cameraPart = async () => (await page.locator('#minimap').getAttribute('aria-label')).match(/Camera centred at -?\d+, -?\d+/)[0];
  const camera0 = await cameraPart();
  await page.locator('#detail-toggle').click();
  await expect(page.locator('#detail-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#detail-stack')).toBeVisible();
  await page.locator('[data-action="equipment"]').click();
  await expect(page.locator('#modal')).toBeVisible();
  await page.locator('#modal-close').click();
  await expect(page.locator('.character-card.selected')).toHaveCount(1);
  await page.locator('#stack-close').click();
  await expect(page.locator('#detail-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(cameraPart).toBe(camera0);
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('single-screen layout at every acceptance viewport never scrolls the page', async ({ page }) => {
  for (const [w, h] of [[1366, 768], [1440, 900], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await boot(page);
    if (w === 1366) {
      await page.locator('#first-deploy').click();
      await page.locator('#deployment-form button.primary').click();
    }
    await expect(page.locator('#map-population')).toContainText('2 adventurers');
    const metrics = await page.evaluate(() => ({
      vertical: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      field: (() => { const r = document.querySelector('.battlefield').getBoundingClientRect(); return r.width * r.height; })(),
      roster: (() => { const r = document.querySelector('.roster-panel').getBoundingClientRect(); return r.width * r.height; })(),
      sidebar: (() => { const r = document.querySelector('.sidebar').getBoundingClientRect(); return r.width * r.height; })(),
      fieldVisible: document.querySelector('.battlefield').getBoundingClientRect().height,
    }));
    expect(metrics.vertical, `page scrolls vertically at ${w}x${h}`).toBeLessThanOrEqual(0);
    expect(metrics.horizontal, `page scrolls horizontally at ${w}x${h}`).toBeLessThanOrEqual(0);
    expect(metrics.fieldVisible, `battlefield too small at ${w}x${h}`).toBeGreaterThanOrEqual(300);
    expect(metrics.field, `battlefield not largest at ${w}x${h}`).toBeGreaterThan(metrics.roster);
    expect(metrics.field, `battlefield not largest at ${w}x${h}`).toBeGreaterThan(metrics.sidebar);
    await page.screenshot({ path: `artifacts/viewport-${w}x${h}.png` });
  }
});

test('manage one adventurer from the roster and jump to them from the expanded minimap', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await boot(page);
  await page.locator('#roster [data-character="c1"]').click();
  await expect(page.locator('#character-sheet')).toContainText('Manage Aren');
  await page.locator('#character-sheet').click();
  await expect(page.locator('#character-vitals')).toContainText('Guild camp');
  for (const tab of ['gear','skills','stats','job']) {
    await page.locator(`[data-character-page="${tab}"]`).click();
    await expect(page.locator(`[data-character-page="${tab}"]`)).toHaveAttribute('aria-current','page');
    if (tab === 'skills') {
      await page.locator('#sheet-auto-skill').uncheck();
      const saved = await readSave(page);
      expect(saved.characters.map(c=>c.tactics.autoSkill)).toEqual([false,true]);
    }
  }
  await page.screenshot({path:'artifacts/character-sheet-mobile.png'});
  await page.locator('#modal-close').click();
  await page.locator('#expand-minimap').click();
  await expect(page.locator('#expanded-minimap')).toBeVisible();
  await page.locator('#modal [data-world-character="c2"]').click();
  await expect(page.locator('#roster [data-character="c2"]')).toHaveAttribute('aria-pressed','true');
});

test('monitor views show field locations, per-character vitals and actionable alerts', async ({page}) => {
  const s=createGame();
  s.characters[0].jobLevel=10;
  await page.addInitScript(raw=>{if(!localStorage.length)localStorage.setItem('ragna-tactics:save:v1',raw);},encodeSave(s));
  await boot(page);
  await page.locator('#world-button').click();
  await expect(page.locator('[data-monitor-field="camp"] [data-monitor-unit]')).toHaveCount(2);
  await page.locator('[data-monitor-view="roster"]').click();
  await expect(page.locator('[data-monitor-unit="c1"] [data-monitor-sp]')).toContainText('SP');
  await page.screenshot({path:'artifacts/live-monitor.png'});
  await page.locator('[data-monitor-view="alerts"]').click();
  await expect(page.locator('[data-monitor-unit]:visible')).toHaveCount(1);
  await page.locator('[data-monitor-unit="c1"]').getByRole('button',{name:'Manage'}).click();
  await expect(page.locator('#modal-title')).toHaveText('Aren');
});

test('main-bar workspace promotes one adventurer and compares and sockets individual gear', async ({page})=>{
  const s=createGame();
  s.characters[0].jobLevel=10;
  s.characters[0].level=5;
  s.inventory.gear={knife:1};
  s.inventory.gearItems=[{uid:'test_knife',itemId:'knife',refine:0,affixes:[]}];
  s.inventory.cards.scorpion=1;
  await page.addInitScript(raw=>{ if(!localStorage.length) localStorage.setItem('ragna-tactics:save:v1',raw); },encodeSave(s));
  await boot(page);
  await page.locator('#roster [data-character="c1"]').click();
  await page.locator('#adventurer-workspace').click();
  await expect(page.locator('#adventurer-panel')).toBeVisible();
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('.gear-delta')).toContainText('ATK +17');
  await page.screenshot({path:'artifacts/workspace-desktop.png',animations:'disabled'});
  await page.locator('[data-workspace-equip="test_knife"]').click();
  await page.locator('[data-workspace-socket="scorpion"]').click();
  await page.locator('[data-workspace-page="stats"]').click();
  await page.getByRole('button',{name:'Add STR',exact:true}).click();
  await page.locator('[data-workspace-apply-stats]').click();
  expect((await readSave(page)).characters[0].attributes.str).toBe(1);
  await page.locator('[data-workspace-page="jobs"]').click();
  await page.locator('[data-workspace-job="swordsman"]').click();
  await page.locator('[data-workspace-promote]').click();
  const saved=await readSave(page);
  expect(saved.characters[0].gear.weapon.cards).toEqual(['scorpion']);
  expect(saved.characters.map(c=>c.job)).toEqual(['swordsman','novice']);
  expect(saved.inventory.gear.sword).toBe(1);
});

test('field hotbar casts one adventurer’s trained skill while another team stays deployed',async({page})=>{
  const s=createGame(), {command}=await import('../../src/sim.js');
  const [a,b]=s.characters;
  a.job='swordsman'; a.jobLevel=4; a.tactics.autoSkill=false;
  b.job='archer';
  command(s,{type:'deploy',ids:[b.id],mapId:'forest'});
  const place=command(s,{type:'deploy',ids:[a.id],mapId:'meadow'});
  expect(place).toBeNull();
  a.techniques={ranks:{magnum:1},slots:[{id:'magnum',auto:false},null],timers:{}};
  a.order='hold'; a.attackTimer=100;
  const target=s.maps.meadow.monsters[0];
  Object.assign(target,{x:a.x+1,y:a.y,hp:200,timer:100});
  a.targetId=target.id;
  s.maps.meadow.monsters=[target]; s.maps.forest.monsters=[]; s.seed=0;
  await page.addInitScript(raw=>{if(!localStorage.length)localStorage.setItem('ragna-tactics:save:v1',raw);},encodeSave(s));
  await boot(page);
  await page.locator('#roster [data-character="c1"]').click();
  await expect(page.locator('#field-console')).toBeVisible();
  await expect(page.locator('[data-hotbar="1"]')).toBeEnabled();
  await page.keyboard.press('2');
  const saved=await readSave(page);
  expect(saved.characters[0].techniques.timers.magnum).toBe(9);
  expect(saved.characters[1].mapId).toBe('forest');
  expect(saved.maps.meadow.monsters[0].hp).toBeLessThan(200);
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('#field-hotbar')).toBeInViewport();
  await page.screenshot({path:'artifacts/field-console-phone.png',animations:'disabled'});
});

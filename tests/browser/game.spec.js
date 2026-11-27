import { test, expect } from '@playwright/test';
import { createGame, gainExp } from '../../src/sim.js';
import { encodeSave } from '../../src/persistence.js';
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
    await page.locator('#battlefield').tap({ position: { x: 195, y: 240 } });
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
  await expect(page.locator('.job-preview')).toHaveCount(6);
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
test('move, hold, focus, retreat, resume, multi-map overview and character navigation work in the UI', async ({ page }) => {
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
  const scale = Math.max(0.35, Math.min(1.15, box.width / 1510, (box.height - 100) / 800));
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
  await expect.poll(async () => (await saved()).characters[0].mapId, { timeout: 12000 }).toBeNull();
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
  await expect(page.locator('#modal h3')).toContainText('Peco Peco Card');
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

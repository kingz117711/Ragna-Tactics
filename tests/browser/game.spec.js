import { test, expect } from '@playwright/test';
import { createGame, gainExp } from '../../src/sim.js';
import { encodeSave } from '../../src/persistence.js';
const boot = async page => { await page.goto('/'); await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 }); };
test('hunt orders work by touch and respect reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, reducedMotion: 'reduce', viewport: { width: 390, height: 844 }, baseURL: 'http://127.0.0.1:5173' });
  try {
    const page = await context.newPage();
    await boot(page);
    await page.locator('#first-deploy').tap();
    await page.locator('#deployment-form button.primary').tap();
    await page.locator('[data-action="rally"]').tap();
    await expect(page.locator('[data-action="rally"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#battlefield').tap({ position: { x: 195, y: 240 } });
    await expect(page.locator('#order-hint')).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ragna-tactics:save:v1')).state.characters.every(c => c.farmRadius === 6))).toBe(true);
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
  const s = createGame(); for (const c of s.characters) gainExp(s, c, 300, 1000);
  await page.addInitScript(raw => localStorage.setItem('ragna-tactics:save:v1', raw), encodeSave(s));
  await boot(page);
  await page.locator('[data-character="c1"]').click(); await page.getByRole('button', { name: 'Job path', exact: true }).click();
  await page.locator('input[value="swordsman"]').check(); await page.locator('#job-form button[type="submit"]').click();
  await expect(page.locator('[data-character="c1"]')).toContainText('Swordsman');
  await page.locator('[data-character="c2"]').click(); await page.getByRole('button', { name: 'Job path', exact: true }).click();
  await page.locator('input[value="acolyte"]').check(); await page.locator('#job-form button[type="submit"]').click();
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
  await page.locator('#roster [data-character="c2"]').click();
  await page.getByRole('button', { name: 'Lead party' }).click();
  await expect(page.locator('#party-overview')).toContainText('Leader: Lyra');
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

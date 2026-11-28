// Capture desktop/phone screenshots and cold-load/pan metrics for the terrain
// pilot. Uses an external Chromium binary (PLAYWRIGHT_CHROMIUM_PATH) because the
// sandbox cannot reach the Playwright browser CDN. Run with:
//   LD_LIBRARY_PATH=/tmp/al2023/lib PLAYWRIGHT_CHROMIUM_PATH=/tmp/chromium \
//     node scripts/capture-shots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createGame, command } from '../src/sim.js';
import { encodeSave } from '../src/persistence.js';

const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/tmp/chromium';
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
mkdirSync('artifacts', { recursive: true });

// A save with a Swordsman at camp who has learned skills, for the Skills page.
const s = createGame();
const c = s.characters[0];
Object.assign(c, { job: 'swordsman', jobLevel: 15, level: 8, mapId: null, status: 'camp' });
c.skills = { bash: 2, power_strike: 1 };
c.loadout = ['bash', 'power_strike'];
const saveJson = encodeSave(s);

const browser = await chromium.launch({
  executablePath: exe,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
const metrics = { coldLoadMs: 0, panFrames: [], errors: [] };
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => metrics.errors.push(String(e.message)));
  page.on('console', m => { if (m.type() === 'error') metrics.errors.push(m.text()); });
  await page.addInitScript(json => { localStorage.setItem('ragna-tactics:save:v1', json); }, saveJson);
  const t0 = Date.now();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('loading')?.hidden, { timeout: 20000 });
  metrics.coldLoadMs = Date.now() - t0;

  await page.screenshot({ path: 'artifacts/terrain-desktop.png' });
  // Zoom out for the low-detail overview, then back in.
  await page.locator('#zoom-out').click({ clickCount: 3 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/terrain-overview.png' });
  await page.locator('#zoom-in').click({ clickCount: 4 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'artifacts/terrain-closeup.png' });

  // Pan metric: drag the battlefield and sample real frame intervals (deltas).
  const canvas = page.locator('#battlefield');
  const box = await canvas.boundingBox();
  await page.evaluate(() => { window.__frames = []; let last = performance.now(); const loop = () => { const now = performance.now(); window.__frames.push(now - last); last = now; if (window.__frames.length < 30) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  for (let i = 0; i < 10; i++) { await page.mouse.move(box.x + 400, box.y + 300); await page.mouse.down(); await page.mouse.move(box.x + 400 + i * 30, box.y + 300 + i * 10, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(60); }
  await page.waitForTimeout(600);
  metrics.panFrames = await page.evaluate(() => window.__frames || []);

  // Skills page: select the Swordsman and open Skills.
  await page.locator('.character-card').first().click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="skills"]').click();
  await page.waitForTimeout(300);
  await page.locator('#modal').screenshot({ path: 'artifacts/skills-page.png' });
  await page.screenshot({ path: 'artifacts/skills-desktop.png' });

  // Phone width.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const ppage = await phone.newPage();
  await ppage.addInitScript(json => { localStorage.setItem('ragna-tactics:save:v1', json); }, saveJson);
  await ppage.goto(base, { waitUntil: 'domcontentloaded' });
  await ppage.waitForFunction(() => document.getElementById('loading')?.hidden, { timeout: 20000 });
  await ppage.screenshot({ path: 'artifacts/terrain-phone.png' });
  await phone.close();

  writeFileSync('artifacts/metrics.json', JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify(metrics, null, 2));
  console.log('Screenshots written to artifacts/.');
} finally {
  await browser.close();
}

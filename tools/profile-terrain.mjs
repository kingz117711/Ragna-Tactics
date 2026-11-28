// Terrain/camera profiler for the PR #11 stutter investigation.
//
// Drives the real game in headless Chromium through identical scenarios on two
// trees ("before" = PR #11 head, "after" = this branch) and reports, per map
// and per camera state:
//   - p95/median frame interval (rAF deltas sampled by an in-page loop),
//   - longest blocking task (PerformanceObserver longtask — terrain builds
//     dominate those windows),
//   - new canvas elements created (each detailed terrain chunk / overview is
//     one canvas, so this counts terrain builds directly),
//   - renderer probe counters on the "after" tree (exact chunk builds,
//     evictions, overview tiles, longest single chunk build).
//
// Usage:
//   node tools/profile-terrain.mjs --root . --label after --out artifacts/profile-after.json
//   node tools/profile-terrain.mjs --root /tmp/pr11test --label before --out artifacts/profile-before.json
// The tree must contain scripts/serve.mjs (a server is spawned on a free port).
// Chromium comes from PLAYWRIGHT_CHROMIUM_PATH or the default Playwright install.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = name => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const root = path.resolve(opt('root') || '.');
const label = opt('label') || path.basename(root);
const out = opt('out');
const maps = (opt('maps') || 'meadow,forest').split(',').filter(Boolean);

const freePort = () => new Promise(resolve => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});

const serve = async () => {
  const port = await freePort();
  const child = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return { url, stop: () => child.kill('SIGTERM') };
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250));
  }
  child.kill('SIGTERM');
  throw new Error(`server for ${root} did not start`);
};

const boot = (page, url) => {
  return page.goto(url).then(() => page.waitForSelector('#loading', { state: 'hidden', timeout: 30000 }));
};

// Identical instrumentation on both trees: an rAF sampler, a longtask observer
// and a canvas-creation counter (terrain chunks and overviews are canvases).
const instrument = `(() => {
  window.__m = { frames: [], longtasks: [], canvases: 0 };
  let last = performance.now();
  const tick = t => { window.__m.frames.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__m.longtasks.push(e.duration); })
      .observe({ entryTypes: ['longtask'] });
  } catch {}
  const original = document.createElement.bind(document);
  document.createElement = tag => { if (String(tag).toLowerCase() === 'canvas') window.__m.canvases++; return original(tag); };
})();`;

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))].toFixed(1) : null;
};

const snapshot = () => page => page.evaluate(() => {
  const m = window.__m;
  window.__m = { frames: [], longtasks: [], canvases: 0 };
  const frames = [...m.frames].sort((a, b) => a - b);
  const at = p => (frames.length ? frames[Math.min(frames.length - 1, Math.floor(frames.length * p))] : null);
  const rd = window.__ragnaDebug ? window.__ragnaDebug.renderer : null;
  return {
    framesSampled: frames.length,
    frameP50: at(0.5) === null ? null : +at(0.5).toFixed(1),
    frameP95: at(0.95) === null ? null : +at(0.95).toFixed(1),
    frameMax: frames.length ? +frames[frames.length - 1].toFixed(1) : null,
    longtasks: m.longtasks.length,
    longestTask: m.longtasks.length ? +Math.max(...m.longtasks).toFixed(1) : null,
    canvases: m.canvases,
    probe: rd ? {
      chunksBuilt: rd.probe.chunksBuilt, chunksEvicted: rd.probe.chunksEvicted,
      overviewTiles: rd.probe.overviewTiles, overviewUpgrades: rd.probe.overviewUpgrades,
      longestBuildMs: +(rd.probe.longestBuildMs || 0).toFixed(1),
    } : null,
    camera: rd ? { x: +rd.camera.x.toFixed(1), y: +rd.camera.y.toFixed(1), zoom: +rd.camera.zoom.toFixed(4) } : null,
  };
});

const run = async () => {
  const server = await serve();
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({ executablePath, headless: true });
  const results = { label, root, url: server.url, maps: {} };
  try {
    for (const mapId of maps) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      await page.addInitScript(instrument);
      await boot(page, server.url);
      // Bring the guild onto the field the same way a player does.
      await page.getByRole('button', { name: 'Plan your first expedition' }).click();
      await page.locator('#deployment-form button.primary').click();
      if (mapId !== 'meadow') await page.locator(`[data-map="${mapId}"]`).click();
      await page.waitForTimeout(600);

      const snap = snapshot();
      const phases = {};
      // Works on both trees: the debug handle when present, otherwise the same
      // numbers the UI publishes (minimap aria-label + zoom label).
      const camera = () => page.evaluate(() => {
        const rd = window.__ragnaDebug?.renderer;
        if (rd) return { x: +rd.camera.x.toFixed(1), y: +rd.camera.y.toFixed(1), zoom: +rd.camera.zoom.toFixed(4) };
        const m = (document.getElementById('minimap')?.getAttribute('aria-label') || '').match(/Camera centred at (-?\d+), (-?\d+)/);
        if (!m) return null;
        return { x: +m[1], y: +m[2], zoom: (parseFloat(document.getElementById('zoom-label').textContent) / 100), source: 'aria' };
      });

      // 1. Cold load, camera at fit zoom, hands off.
      await page.waitForTimeout(4000);
      phases.fitIdle = await snap(page);

      // 2. Panning across the whole field at fit zoom.
      const box = await page.locator('#battlefield').boundingBox();
      for (const [x0, x1, y] of [[0.15, 0.85, 0.35], [0.85, 0.15, 0.65], [0.2, 0.8, 0.5]]) {
        await page.mouse.move(box.x + box.width * x0, box.y + box.height * y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * x1, box.y + box.height * y, { steps: 16 });
        await page.mouse.up();
        await page.waitForTimeout(120);
      }
      phases.fitPan = await snap(page);

      // 3. Gameplay zoom (three steps in), pan again.
      for (let i = 0; i < 3; i++) await page.locator('#zoom-in').click();
      await page.waitForTimeout(1500);
      for (const [x0, x1, y] of [[0.15, 0.85, 0.35], [0.85, 0.15, 0.65], [0.2, 0.8, 0.5]]) {
        await page.mouse.move(box.x + box.width * x0, box.y + box.height * y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * x1, box.y + box.height * y, { steps: 16 });
        await page.mouse.up();
        await page.waitForTimeout(120);
      }
      phases.gameplayPan = await snap(page);

      // 4. Camera perfectly still: nothing should rebuild behind a still camera.
      await page.waitForTimeout(3000);
      phases.still = await snap(page);

      // 5. Layout change (the PR #11 auto-fit trigger): resize the viewport;
      //    a manually positioned camera must survive it untouched.
      const beforePanel = await camera();
      await page.setViewportSize({ width: 1260, height: 880 });
      await page.waitForTimeout(600);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.waitForTimeout(600);
      phases.afterPanel = { cameraBefore: beforePanel, cameraAfter: await camera(), ...(await snap(page)) };

      results.maps[mapId] = phases;
      await context.close();
    }
  } finally {
    await browser.close();
    server.stop();
  }
  const report = JSON.stringify(results, null, 1);
  if (out) { await mkdir(path.dirname(path.resolve(out)), { recursive: true }); await writeFile(path.resolve(out), report); }
  console.log(report);
};

run().catch(err => { console.error(err); process.exit(1); });

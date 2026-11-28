// Exercise the exported site rather than the development server's asset routing.
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const root = resolve('dist');
const files = await readdir(root);
assert.deepEqual(files.sort(), ['ASSET-CREDITS.md','assets','docs','index.html','licenses','src'].sort());
assert.ok((await readdir(resolve(root,'licenses'))).includes('rathena-GPL-3.0.txt'));
assert.ok((await readFile(resolve(root,'docs/RENEWAL-SYSTEM.md'),'utf8')).includes('iRO Renewal'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + sep)) throw new Error('Outside build');
    const bytes = await readFile(path); res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'text/plain' }); res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = []; page.on('pageerror', e => failures.push(e.message)); page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => document.getElementById('loading').hidden);
  assert.equal(await page.locator('.character-card').count(), 2);
  assert.deepEqual(failures, []);
  await page.screenshot({ path: 'artifacts/foundation-built.png', fullPage: true });
  console.log('Static build boots with two Novices, local assets, and no failed requests or runtime errors.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }

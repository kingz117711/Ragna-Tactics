// jsdom smoke: boots the real app against the local server, opens the skill surface and
// the merchant, and checks that icons and class sprites actually resolve to files on disk.
// Run `npm run dev` first (or pass BASE=http://127.0.0.1:<port>), then `npm run smoke`.
import { JSDOM } from 'jsdom';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:5173';
const root = resolve(import.meta.dirname, '..');
const html = await (await fetch(BASE + '/index.html')).text();
const results = [];
const check = (name, ok, extra = '') => { results.push([name, ok, extra]); if (!ok) console.log('FAIL', name, extra); };

const dom = new JSDOM(html, { url: BASE + '/?gm=0', runScripts: 'outside-only', pretendToBeVisual: true });
// jsdom has no Web Locks; app.js requires them before it will boot.
const { window } = dom;
const realFetch = globalThis.fetch;
const BASE_URL = BASE + '/';
const resolveUrl = url => new URL(String(url), BASE_URL).href;
window.fetch = (url, init) => realFetch(resolveUrl(url), init);
globalThis.fetch = window.fetch;
if (!window.Option) window.Option = window.HTMLOptionElement;
if (!window.HTMLDialogElement.prototype.showModal) {
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
}
for (const proto of [window.HTMLElement.prototype, window.Element.prototype]) {
  if (!proto.animate) proto.animate = () => ({ finished: Promise.resolve(), cancel() {}, onfinish: null, addEventListener() {} });
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {};
}
const store = {};
Object.defineProperty(window, 'localStorage', {
  value: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, clear: () => { for (const k of Object.keys(store)) delete store[k]; } },
});
Object.defineProperty(window, 'navigator', { value: { userAgent: 'Mozilla/5.0 (smoke-test) Chrome/120', locks: { request: async (_n, _o, fn) => fn({}) } }, configurable: true });
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true });
Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
window.HTMLCanvasElement.prototype.getContext = function () {
  const canvas = this;
  return new Proxy({ imageSmoothingEnabled: false, canvas }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'toDataURL') return () => 'data:image/png;base64,';
      if (key === 'createLinearGradient' || key === 'createRadialGradient' || key === 'createPattern') return () => ({ addColorStop() {} });
      if (key === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
};
window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
globalThis.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
// jsdom cannot decode PNGs; a stand-in image resolves immediately so Sprite.init
// completes and the DOM work under test can run.
class FakeImage {
  constructor() { this.onload = null; this.onerror = null; this.width = 512; this.height = 512; this.complete = true; }
  set src(value) { this._src = value; setTimeout(() => this.onload && this.onload(), 0); }
  get src() { return this._src; }
}
window.Image = FakeImage;
globalThis.Image = FakeImage;
globalThis.HTMLDialogElement = window.HTMLDialogElement || window.HTMLElement;
globalThis.Option = window.Option || window.HTMLOptionElement;
globalThis.location = window.location;
globalThis.localStorage = window.localStorage;
globalThis.requestAnimationFrame = window.requestAnimationFrame || (cb => setTimeout(cb, 16));
globalThis.cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;
globalThis.window = window;
globalThis.document = window.document;


await import(resolve(root, 'src/app.js'));
await new Promise(r => setTimeout(r, 2500));

const $ = id => window.document.getElementById(id);
check('booted without failure banner', !$('loading') || $('loading').hidden, $('loading')?.textContent?.slice(0, 120));

// Skill icons: open a skill surface and count real <img> icons.
const card = window.document.querySelector('[data-character]');
check('character cards render', !!card);
card?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 300));
// Open the character sheet, then its Skills page.
window.document.querySelector('[data-character]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 200));
$('adventurer-workspace').click();
await new Promise(r => setTimeout(r, 250));
const skillTab = [...$('workspace-tabs').querySelectorAll('button')].find(b => /skill/i.test(b.textContent));
skillTab?.click();
await new Promise(r => setTimeout(r, 350));
const artIcons = [...window.document.querySelectorAll('img')].filter(img => (img.getAttribute('src') || '').includes('/assets/skill-icons/'));
check('skill icons render as real RO art', artIcons.length > 3, String(artIcons.length));
const iconFile = artIcons[0]?.getAttribute('src')?.replace('/assets/', '');
if (iconFile) check('first skill icon exists on disk', existsSync(resolve(root, 'public/assets', iconFile)), iconFile);

// Merchant.
const shopButton = [...window.document.querySelectorAll('[data-action="camp"]')][0];
shopButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 250));
const merchant = [...window.document.querySelectorAll('[data-modal-action="shop"]')][0];
check('merchant button in camp', !!merchant);
merchant?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 250));
const rows = window.document.querySelectorAll('.shop-item');
check('merchant lists stock', rows.length > 10, String(rows.length));
const shopIcons = [...window.document.querySelectorAll('.shop-grid img')];
check('merchant rows show item icons', shopIcons.length === rows.length, `${shopIcons.length}/${rows.length}`);
const badIcon = shopIcons.map(img => img.getAttribute('src')).find(src => !existsSync(resolve(root, 'public', src.replace(/^\//, ''))));
check('every shop icon file exists', !badIcon, badIcon || '');
check('merchant groups stock by level band', window.document.querySelectorAll('.shop-band').length > 1, String(window.document.querySelectorAll('.shop-band').length));
const tabs = window.document.querySelectorAll('[data-shop-slot]');
check('merchant has slot tabs', tabs.length >= 6, String(tabs.length));

// Class sprites: every job must resolve to its own native body, not a parent's fallback.
const { JOBS } = await import('../src/data.js');
const index = JSON.parse(readFileSync(resolve(root, 'public/assets/index.json'), 'utf8'));
const outfit = (job, sex) => index.wardrobe[`base-${job}-${sex}`] || index.classWardrobe?.[`base-${job}-${sex}`];
const uncovered = [];
for (const [key, job] of Object.entries(JOBS)) for (const sex of ['m', 'f']) {
  const entry = outfit(job.native, sex);
  if (!entry) { uncovered.push(`${key}:${sex}`); continue; }
  const folder = index.classWardrobe?.[`base-${job.native}-${sex}`] ? 'classes/' : '';
  if (!existsSync(resolve(root, 'public/assets/wardrobe', folder + entry.image))) uncovered.push(`${key}:${sex}`);
}
check('every job has its own native body sprite', uncovered.length === 0, uncovered.slice(0, 6).join(', '));

const passed = results.filter(r => r[1]).length;
console.log(`jsdom smoke: ${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);

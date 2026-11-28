// The roster must be drawn from genuine client art: every job needs its own male and
// female body outfit, and the merchant may only stock gear that has a real item icon.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JOBS, GEAR_ITEMS, GEAR_SHOP, gearIconPath } from '../src/data.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assets = join(root, 'public', 'assets');
const index = JSON.parse(readFileSync(join(assets, 'index.json'), 'utf8'));

test('every job resolves to its own native body sprite', () => {
  const missing = [];
  for (const [id, job] of Object.entries(JOBS)) {
    for (const sex of ['m', 'f']) {
      const key = `base-${job.native}-${sex}`;
      const shipped = index.wardrobe[key];
      const extra = index.classWardrobe?.[key];
      const entry = shipped || extra;
      if (!entry) { missing.push(key); continue; }
      // The pack directory differs: shipped outfits live in wardrobe/, additions in classes/.
      for (const field of ['meta', 'image']) {
        const folder = extra && !shipped ? join(assets, 'wardrobe', 'classes') : join(assets, 'wardrobe');
        if (!existsSync(join(folder, entry[field]))) missing.push(`${key}/${entry[field]}`);
      }
    }
  }
  assert.deepEqual(missing, [], 'every class has both genders of native sprite art on disk');
  const shipped = new Set(Object.keys(index.wardrobe).filter(key => key.startsWith('base-')));
  const expected = Object.values(JOBS).flatMap(job => ['m', 'f'].map(sex => `base-${job.native}-${sex}`))
    .filter(key => !shipped.has(key));
  assert.deepEqual(Object.keys(index.classWardrobe || {}).sort(), expected.sort(), 'the class pack covers exactly the jobs the shipped wardrobe does not');
});

test('the class pack is indexed and every listed file exists', () => {
  const pack = index.classWardrobe || {};
  assert.ok(Object.keys(pack).length >= 80, 'the class pack carries every missing outfit');
  for (const [key, entry] of Object.entries(pack)) {
    assert.match(entry.meta, /^poses-[a-f0-9]{20}\.json$/, key);
    assert.match(entry.image, /^atlas-[a-f0-9]{20}\.png$/, key);
    assert.ok(existsSync(join(assets, 'wardrobe', 'classes', entry.meta)), key);
    assert.ok(existsSync(join(assets, 'wardrobe', 'classes', entry.image)), key);
  }
});

test('the merchant only stocks gear with a genuine item icon', () => {
  assert.ok(GEAR_SHOP.length >= 100, 'the merchant has a real catalog, not a token selection');
  for (const key of GEAR_SHOP) {
    const item = GEAR_ITEMS[key];
    assert.ok(item, `${key} is a known item`);
    const icon = gearIconPath(item);
    assert.match(icon, /^\/assets\/equipment-icons\/\d+\.png$/, key);
    assert.ok(existsSync(join(assets, 'equipment-icons', icon.split('/').pop())), `${key} has its icon on disk`);
    assert.ok((item.buy || 0) > 0, `${key} has a shop value`);
  }
  const slots = new Set(GEAR_SHOP.map(key => GEAR_ITEMS[key].slot));
  assert.ok(slots.size >= 6, 'the stock spans the equipment slots');
});

"""Import the Ragnarok Online item icons used by this game's equipment catalog.

Source: the id-keyed icon mirror at `nadesh52/ragnarok-asset` (18,458 PNGs
extracted from the client's `data/texture/<userinterface>/item/` folder and keyed
by item id). Only the icons the curated catalog needs are copied, so the repo
carries a few hundred files instead of the whole 150 MB mirror.

    python scripts/import_equipment_icons.py            # fetch the catalog's icons
    python scripts/import_equipment_icons.py --verify   # offline check
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'assets' / 'equipment-icons'
MANIFEST = DEST / 'provenance.json'
CATALOG = ROOT / 'src' / 'gear-catalog.json'
REPO = 'nadesh52/ragnarok-asset'
COMMIT = 'master'


def fetch(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Ragna-Tactics-asset-import', 'Accept': 'application/vnd.github.raw'})
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read()


def verify():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for rec in manifest['icons']:
        data = (DEST / rec['file']).read_bytes()
        assert len(data) == rec['pngBytes'], rec['file']
        assert hashlib.sha256(data).hexdigest() == rec['pngSha256'], rec['file']
    index = json.loads((ROOT / 'public/assets/index.json').read_text(encoding='utf-8'))
    catalogued = set(json.loads(CATALOG.read_text(encoding='utf-8')))
    assert set(index['equipmentIcons']) == catalogued, 'index.json equipment icons out of sync'
    print(f"Verified {len(manifest['icons'])} equipment icons.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    if args.verify:
        return verify()
    entries = json.loads(CATALOG.read_text(encoding='utf-8'))
    DEST.mkdir(parents=True, exist_ok=True)

    def job(entry):
        item_id, item = entry
        png = fetch(f'https://api.github.com/repos/{REPO}/contents/icon/{item_id}.png')
        if png[:4] != b'\x89PNG':
            raise ValueError(f'Not a PNG for item {item_id}')
        name = item_id + '.png'
        (DEST / name).write_bytes(png)
        return {'roId': int(item_id), 'file': name, 'name': item['name'],
                'source': f'icon/{item_id}.png',
                'pngSha256': hashlib.sha256(png).hexdigest(), 'pngBytes': len(png)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        icons = sorted(pool.map(job, entries.items()), key=lambda r: r['roId'])

    manifest = {
        'repository': REPO, 'ref': COMMIT,
        'note': 'Ragnarok Online client item icons, keyed by item id. Copied unmodified as PNG. '
                'The mirror does not grant ownership of the underlying artwork.',
        'icons': icons,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    index_path = ROOT / 'public/assets/index.json'
    index = json.loads(index_path.read_text(encoding='utf-8'))
    index['equipmentIcons'] = {str(rec['roId']): rec['file'] for rec in icons}
    index['equipmentNames'] = {str(rec['roId']): rec['name'] for rec in icons}
    index_path.write_text(json.dumps(index, separators=(',', ':')), encoding='utf-8')
    verify()
    print(f'Imported {len(icons)} equipment icons from {REPO}@{COMMIT}.')


if __name__ == '__main__':
    main()

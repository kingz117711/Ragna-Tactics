"""Import a deliberately small, byte-identical subset of the owner's existing art.

Initial import resolves main once, then pins every request to that commit. Subsequent
imports use the manifest's commit. --verify is offline and verifies every file.
No image processing, palette changes, or animation regeneration happens here.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'assets'
MANIFEST = DEST / 'provenance.json'
REPO = 'KzeR7/Prontera-Grind'


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Ragna-Tactics-asset-import'})
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for rec in manifest['files']:
        path = DEST / rec['local']
        assert path.is_relative_to(DEST)
        data = path.read_bytes()
        assert len(data) == rec['bytes'] and digest(data) == rec['sha256'], path
    index = json.loads((DEST / 'index.json').read_text(encoding='utf-8'))
    wardrobe = json.loads((DEST / 'wardrobe/source-catalog.json').read_text(encoding='utf-8'))
    mobs = json.loads((DEST / 'mobs/source-catalog.json').read_text(encoding='utf-8'))
    assert index['anchor'] == wardrobe['anchor'] and index['classes'] == wardrobe['classes']
    assert len(index['wardrobe']) == 28 and len(index['monsters']) == 4
    for key, rec in index['wardrobe'].items():
        assert rec == wardrobe['assets'][key], key
    for key, rec in index['monsters'].items():
        assert rec == mobs['monsters'][key], key
    print(f"Verified {len(manifest['files'])} original asset files.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    if args.verify:
        return verify()
    DEST.mkdir(parents=True, exist_ok=True)
    if MANIFEST.exists():
        commit = json.loads(MANIFEST.read_text(encoding='utf-8'))['commit']
    else:
        commit = json.loads(fetch(f'https://api.github.com/repos/{REPO}/commits/main'))['sha']
    base = f'https://raw.githubusercontent.com/{REPO}/{commit}/'
    wardrobe_path = 'assets/wardrobe/v5/'
    catalog = json.loads(fetch(base + wardrobe_path + 'catalog.json'))
    ids = [f'base-{job}-{sex}' for job in range(13) for sex in ['m', 'f']]
    ids += ['hair-m-2-0', 'hair-f-2-0']
    selected = {key: catalog['assets'][key] for key in ids}
    sources = {}
    for rec in selected.values():
        for kind in ['meta', 'image']:
            sources[wardrobe_path + rec[kind]] = ('wardrobe/' + rec[kind], rec[kind + 'Sha256'])
    mob_catalog = json.loads(fetch(base + 'assets/native-fields/v1/mobs.json'))
    monsters = {key: mob_catalog['monsters'][key] for key in ['1002', '1007', '1010', '1039']}
    for key, rec in monsters.items():
        sources[rec['texture']] = ('mobs/' + key + '.webp', None)

    def download(item):
        source, (local, expected) = item
        data = fetch(base + source)
        checksum = digest(data)
        if expected and checksum != expected:
            raise ValueError('Source checksum mismatch: ' + source)
        target = DEST / local
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return {'local': local, 'source': source, 'sha256': checksum, 'bytes': len(data)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        records = list(pool.map(download, sources.items()))
    # Keep original catalogs as provenance; runtime uses a small derived route index.
    for local, source in [('wardrobe/source-catalog.json', wardrobe_path + 'catalog.json'),
                          ('mobs/source-catalog.json', 'assets/native-fields/v1/mobs.json')]:
        records.append(download((source, (local, None))))
    index = {'anchor': catalog['anchor'], 'classes': catalog['classes'], 'wardrobe': selected,
             'monsters': monsters}
    (DEST / 'index.json').write_text(json.dumps(index, separators=(',', ':')), encoding='utf-8')
    manifest = {'repository': REPO, 'commit': commit,
                'note': 'Original files copied byte-for-byte. Runtime index is a derived subset. '
                        'Reuse does not grant ownership of underlying Ragnarok artwork.',
                'files': sorted(records, key=lambda r: r['local'])}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    verify()
    print(f"Pinned {commit}; {sum(r['bytes'] for r in records):,} bytes imported.")


if __name__ == '__main__':
    main()

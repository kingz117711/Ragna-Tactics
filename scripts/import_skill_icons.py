"""Convert the Ragnarok Online client's skill icons to transparent PNGs.

Source: the unmodified client texture tree mirrored at `Althaeas/Data.grf`
(`data/texture/<userinterface>/item/<aegis>.bmp`). Icons are 24x24 8bpp BMPs
whose palette index 0 is the magenta colorkey; this script writes them as RGBA
PNGs so the browser needs no colorkey logic, and records a SHA-256 for every
converted file in `public/assets/skill-icons/provenance.json`.

Run with `--verify` for an offline check of the committed output.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import struct
import urllib.request
import zlib

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'assets' / 'skill-icons'
MANIFEST = DEST / 'provenance.json'
REPO = 'Althaeas/Data.grf'
COMMIT = 'master'
ICON_DIR = 'data/texture/%C3%80%C2%AF%C3%80%C2%BA%C3%80%C3%8E%C3%85%C3%8D%C3%86%C3%A4%C3%80%C3%8C%C2%BD%C2%BA/item'
MAP = json.loads(Path(__file__).with_name('skillicon_map.json').read_text(encoding='utf-8'))


def fetch(url, headers=None):
    req = urllib.request.Request(url, headers={'User-Agent': 'Ragna-Tactics-asset-import', **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read()


def blob(sha):
    return fetch(f'https://api.github.com/repos/{REPO}/git/blobs/{sha}',
                 {'Accept': 'application/vnd.github.raw'})


# ---- BMP (8bpp, colorkey) -> RGBA PNG -------------------------------------

def read_bmp(data):
    if data[:2] != b'BM':
        raise ValueError('not a BMP')
    offset = struct.unpack_from('<I', data, 10)[0]
    header = struct.unpack_from('<I', data, 14)[0]
    width, height = struct.unpack_from('<ii', data, 18)
    bpp = struct.unpack_from('<H', data, 28)[0]
    compression = struct.unpack_from('<I', data, 30)[0]
    if header < 40 or bpp not in (8, 24, 32) or compression != 0:
        raise ValueError(f'unsupported BMP (bpp={bpp} compression={compression})')
    top_down = height < 0
    height = abs(height)
    if bpp != 8:
        # True-colour icons use the same magenta key instead of a palette index.
        step = bpp // 8
        stride = (width * step + 3) & ~3
        rows = []
        for y in range(height):
            src = y if top_down else height - 1 - y
            base = offset + src * stride
            out = bytearray(width * 4)
            for x in range(width):
                p = base + x * step
                b, g, r = data[p], data[p + 1], data[p + 2]
                if bpp == 32:
                    out[x * 4:x * 4 + 4] = bytes((r, g, b, data[p + 3]))
                elif not (r == 255 and g == 0 and b == 255):
                    out[x * 4:x * 4 + 4] = bytes((r, g, b, 255))
            rows.append(bytes(out))
        return width, height, rows
    count = struct.unpack_from('<I', data, 46)[0] or 256
    palette = []
    for i in range(count):
        b, g, r, _ = data[14 + header + i * 4:14 + header + i * 4 + 4]
        palette.append((r, g, b))
    stride = (width + 3) & ~3
    rows = []
    for y in range(height):
        src = y if top_down else height - 1 - y
        line = data[offset + src * stride:offset + src * stride + width]
        out = bytearray(width * 4)
        for x, idx in enumerate(line):
            r, g, b = palette[idx]
            o = x * 4
            if idx == 0 or (r == 255 and g == 0 and b == 255):
                continue  # transparent colorkey
            out[o:o + 4] = bytes((r, g, b, 255))
        rows.append(bytes(out))
    return width, height, rows


def write_png(width, height, rows):
    raw = b''.join(b'\x00' + row for row in rows)

    def chunk(kind, payload):
        body = kind + payload
        return struct.pack('>I', len(payload)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


def convert(data):
    width, height, rows = read_bmp(data)
    return write_png(width, height, rows)


# ---- import / verify ------------------------------------------------------

def verify():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for rec in manifest['icons']:
        path = DEST / rec['file']
        data = path.read_bytes()
        assert len(data) == rec['pngBytes'], path
        assert hashlib.sha256(data).hexdigest() == rec['pngSha256'], path
    index = json.loads((ROOT / 'public/assets/index.json').read_text(encoding='utf-8'))
    assert index['skillIcons'] == manifest['byGameId'], 'index.json skill icons out of sync'
    print(f"Verified {len(manifest['icons'])} converted skill icons.")


def source_blobs():
    """{file stem: git blob id} for every .bmp in the client's skill icon directory.

    The upstream mirror is a branch, so the blob ids are resolved from its current tree
    instead of being pinned to one commit: a retired icon would otherwise break the
    import. Converted PNG hashes in provenance.json are what `--verify` checks offline.
    """
    listing = fetch(f'https://api.github.com/repos/{REPO}/git/trees/{COMMIT}?recursive=1')
    tree = json.loads(listing)['tree']
    return [(item['path'].rsplit('/', 1)[-1][:-4], item['sha'])
            for item in tree if item['type'] == 'blob' and item['path'].lower().endswith('.bmp')
            and '/item/' in item['path']]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    if args.verify:
        return verify()
    DEST.mkdir(parents=True, exist_ok=True)
    aegis = sorted({v for v in MAP.values()})
    sha = {name.lower(): sha for name, sha in source_blobs()}
    absent = [name for name in aegis if name not in sha]
    if absent:
        raise SystemExit('Missing source icons: ' + ', '.join(absent))

    def job(name):
        source = blob(sha[name])
        png = convert(source)
        (DEST / (name + '.png')).write_bytes(png)
        return {'aegis': name, 'file': name + '.png',
                'source': f'{ICON_DIR}/{name}.bmp',
                'sourceSha256': hashlib.sha256(source).hexdigest(),
                'sourceBytes': len(source),
                'pngSha256': hashlib.sha256(png).hexdigest(),
                'pngBytes': len(png)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        icons = sorted(pool.map(job, aegis), key=lambda r: r['aegis'])

    by_game_id = {game_id: name for game_id, name in sorted(MAP.items()) if not game_id.startswith('_')}
    manifest = {
        'repository': REPO,
        'ref': COMMIT,
        'sourceDirectory': ICON_DIR,
        'note': 'Ragnarok Online client skill icons, converted from the original 8bpp BMPs to RGBA PNG. '
                'Bytes are pixel-identical apart from the magenta colorkey becoming real alpha. '
                'Conversion does not grant ownership of the underlying artwork.',
        'icons': icons,
        'byGameId': by_game_id,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    index_path = ROOT / 'public/assets/index.json'
    index = json.loads(index_path.read_text(encoding='utf-8'))
    index['skillIcons'] = by_game_id
    index_path.write_text(json.dumps(index, separators=(',', ':')), encoding='utf-8')
    verify()
    print(f'Imported {len(icons)} skill icons from {REPO}@{COMMIT}.')


if __name__ == '__main__':
    main()

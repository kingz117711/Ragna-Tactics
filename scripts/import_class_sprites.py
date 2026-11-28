"""Build native Ragnarok Online body sprites for every job the game ships.

The shipped wardrobe (`public/assets/wardrobe/`, imported by `scripts/import_assets.py`)
covers Novice, the six first jobs and their second and transcendent jobs only. This tool
adds every remaining job as an additive pack, in the same v2 wardrobe format, so the
runtime needs no new drawing code beyond one extra index lookup.

Sources (pinned in `public/assets/class-provenance.json`, all public GitHub):
  body    devilm/costume-ro  data/sprite/<race>/몸통/<sex>/<korean class>_{남,여}.{spr,act}
  head    devilm/costume-ro  data/sprite/<race>/머리통/<sex>/<style>_{남,여}.{spr,act}
  weapon  rAthena-Thailand/ClientROThailand, the pre-renewal job weapon sprite the class
          holds while attacking (Prontera-Grind's `tools/native-expanded/source-manifest.json`
          already pins those files by git blob id, and this tool reuses those pins).

Each class is composed exactly like the client: the body ACT frame at the ACT origin, the
head at `body attach point - head attach point`, and the held weapon at `body attach -
weapon attach`. The head is baked into the class atlas (style 2, the hairstyle the game
already renders) so the runtime never has to re-derive it; nothing is redrawn, recoloured
or resampled except nearest-neighbour scaling for the very few scaled layers.

Only the stances the game actually plays are exported: idle, walk and attack, eight
directions each, at the ACT file's own frame delays.

usage:
    python3 scripts/import_class_sprites.py             # fetch (cached), rebuild, rewrite index
    python3 scripts/import_class_sprites.py --verify    # offline hash + catalog check
    python3 scripts/import_class_sprites.py --sheet out.png [job ...]   # contact sheet
    python3 scripts/import_class_sprites.py --only 14 15                # rebuild some classes
"""
import argparse
import concurrent.futures as futures
import hashlib
import io
import json
import os
import sys
import urllib.request
from pathlib import Path
from urllib.parse import quote

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ro_sprite  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public' / 'assets'
WARDROBE = ASSETS / 'wardrobe'
OUT = WARDROBE / 'classes'
MANIFEST = ASSETS / 'class-provenance.json'
INDEX = ASSETS / 'index.json'
CACHE = Path(os.environ.get('RT_SPRITE_CACHE', '/tmp/ragna-class-sources'))
GITHUB = 'https://api.github.com'

CANVAS = (320, 280)
ORIGIN = (160, 200)
HEAD_STYLE = '2'                 # the hairstyle the shipped pack ships, per gender
REF_JOB = 7                      # Knight: shipped pack reference for the shared shadow

HUMAN, DORAM = '인간족', '도람족'
SEX_DIR = {'m': '남', 'f': '여'}

# job id -> (race, male body stem, female body stem). A missing gender reuses the other
# file: the client ships one Bard / Dancer body per gender, not per job.
CLASSES = {
    14: (HUMAN, '크루세이더', '크루세이더'), 4015: (HUMAN, '팔라딘', '팔라딘'),
    4060: (HUMAN, '가드', '가드'),
    16: (HUMAN, '세이지', '세이지'), 4017: (HUMAN, '프로페서', '프로페서'),
    4061: (HUMAN, '소서러', '소서러'),
    18: (HUMAN, '연금술사', '연금술사'), 4019: (HUMAN, '크리에이터', '크리에이터'),
    4064: (HUMAN, '제네릭', '제네릭'),
    15: (HUMAN, '몽크', '몽크'), 4016: (HUMAN, '챔피온', '챔피온'),
    4066: (HUMAN, '슈라', '슈라'),
    17: (HUMAN, '로그', '로그'), 4018: (HUMAN, '스토커', '스토커'),
    4065: (HUMAN, '쉐도우체이서', '쉐도우체이서'),
    19: (HUMAN, '바드', '무희'), 20: (HUMAN, '바드', '무희'),
    4020: (HUMAN, '클라운', '집시'), 4021: (HUMAN, '클라운', '집시'),
    4062: (HUMAN, '민스트럴', '원더러'), 4063: (HUMAN, '민스트럴', '원더러'),
    23: (HUMAN, '슈퍼노비스', '슈퍼노비스'), 24: (HUMAN, '건너', '건너'),
    25: (HUMAN, '닌자', '닌자'), 4211: (HUMAN, 'kagerou', 'kagerou'),
    4212: (HUMAN, 'oboro', 'oboro'), 4215: (HUMAN, '리벨리온', '리벨리온'),
    4046: (HUMAN, '태권소년', '태권소년'), 4047: (HUMAN, '권성', '권성'),
    4049: (HUMAN, '소울링커', '소울링커'), 4239: (HUMAN, '성제', '성제'),
    4240: (HUMAN, '소울리퍼', '소울리퍼'),
    4054: (HUMAN, '룬나이트', '룬나이트'), 4055: (HUMAN, '워록', '워록'),
    4056: (HUMAN, '레인져', '레인져'), 4057: (HUMAN, '아크비숍', '아크비숍'),
    4058: (HUMAN, '미케닉', '미케닉'), 4059: (HUMAN, '길로틴크로스', '길로틴크로스'),
    4218: (DORAM, 'summoner', 'summoner'), 4308: (DORAM, 'spirit_handler', 'spirit_handler'),
}

# The weapon sprite each class holds while attacking. The client keeps one set per second
# job and reuses it down the line, so later jobs borrow theirs.
WEAPONS = {
    '크루세이더': 'crusader', '팔라딘': 'crusader', '가드': 'royal_guard',
    '세이지': 'sage', '프로페서': 'sage', '소서러': 'sorcerer',
    '연금술사': 'alchemist', '크리에이터': 'alchemist', '제네릭': 'geneticist',
    '몽크': 'monk', '챔피온': 'monk', '슈라': 'monk',
    '로그': 'rogue', '스토커': 'rogue', '쉐도우체이서': 'rogue_bow',
    '바드': 'bard_inst', '클라운': 'bard_inst', '민스트럴': 'bard_inst',
    '무희': 'dancer_whip', '집시': 'dancer_whip', '원더러': 'dancer_whip',
    '닌자': 'ninja', 'kagerou': 'kagerou', 'oboro': 'oboro',
    '건너': 'gunslinger', '리벨리온': 'rebellion',
}
# ACT attack motions: 40 = attack1 (overhead swing), 80 = attack2 (one-handed swing and the
# two-revolver stance), 88 = attack3 (bows, thrown weapons, the knuckle punch).
FORCED_ATTACK = {'몽크': 88, '챔피온': 88, '슈라': 88, 'kagerou': 88, 'oboro': 88,
                 '쉐도우체이서': 88, '건너': 80, '리벨리온': 80}
AIMED = {'바드', '무희', '클라운', '집시', '민스트럴', '원더러', '건너', '리벨리온'}

# z-order per layer; a character facing away draws its weapon behind the body.
Z_ORDER = {'front': {'shadow': -1000, 'body': 10000, 'head': 15000, 'weapon': 23000},
           'back': {'shadow': -1000, 'weapon': 15000, 'body': 20000, 'head': 25000}}


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def dump(value):
    return json.dumps(value, separators=(',', ':')).encode('utf-8')


def digest(data):
    return hashlib.sha256(data).hexdigest()


# ------------------------------------------------------------------ GitHub access
def api(url, raw=False):
    headers = {'User-Agent': 'Ragna-Tactics-class-import'}
    if raw:
        headers['Accept'] = 'application/vnd.github.raw'
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=180) as response:
        data = response.read()
    return data if raw else json.loads(data)


def raw_file(repo, ref, path):
    return api(f'{GITHUB}/repos/{repo}/contents/{quote(path)}?ref={quote(ref)}', raw=True)


def blob_file(repo, sha):
    payload = api(f'{GITHUB}/repos/{repo}/git/blobs/{sha}')
    import base64
    return base64.b64decode(payload['content'])


def head_commit(repo):
    return api(f'{GITHUB}/repos/{repo}/commits/main')['sha']


# ------------------------------------------------------------------ source index
def prontera_pins():
    """The owner repository's own pin of the same client files, keyed by repository path.

    Reusing these pins keeps both projects reading byte-identical sources and avoids a
    second, hand-maintained map for the weapon sprites.
    """
    commit = head_commit('KzeR7/Prontera-Grind')
    manifest = json.loads(raw_file('KzeR7/Prontera-Grind', commit,
                                   'tools/native-wardrobe/source-manifest.json'))
    pins = {}
    for record in manifest['files']:
        pins.setdefault(record['path'], record)
    expanded = json.loads(raw_file('KzeR7/Prontera-Grind', commit,
                                   'tools/native-expanded/source-manifest.json'))
    for record in expanded['files']:
        pins.setdefault(record['path'], record)
    return pins


def pin_for(pins, commit, repo, path, name):
    """One download record: by pinned blob id when the owner repository already pins it."""
    record = pins.get(path)
    if record and record.get('repo') == repo:
        return {'name': name, 'repo': repo, 'path': path, 'blob': record['blob'],
                'ref': None, 'sha256': record['sha256'], 'bytes': record['bytes']}
    return {'name': name, 'repo': repo, 'path': path, 'blob': None,
            'ref': commit, 'sha256': None, 'bytes': None}


def weapon_pins(pins):
    """{material_sex: {'spr': record, 'act': record}} from the owner repository's manifest."""
    out = {}
    for name, record in pins.items():
        base = name.rsplit('.', 1)
        if len(base) != 2 or base[1] not in ('spr', 'act') or not name.startswith('weapon/'):
            continue
        out.setdefault(base[0], {})[base[1]] = record
    return out


def ensure(records, workers=8):
    """Download every record into the cache, verifying anything pinned."""
    missing = [r for r in records if not (CACHE / r['name']).exists()]

    def pull(record):
        if record['blob']:
            data = blob_file(record['repo'], record['blob'])
            if record['sha256'] and digest(data) != record['sha256']:
                raise SystemExit('pinned source mismatch: ' + record['path'])
        else:
            data = raw_file(record['repo'], record['ref'], record['path'])
        target = CACHE / record['name']
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return record['name'], len(data)

    if missing:
        print(f'downloading {len(missing)} source files…')
        with futures.ThreadPoolExecutor(max_workers=workers) as pool:
            for name, size in pool.map(pull, missing):
                print(f'  {name} ({size:,} bytes)')


# ------------------------------------------------------------------ rendering
class Atlas:
    """Shelf packer with exact de-duplication: identical frames share one cell."""

    def __init__(self, width=512):
        self.width, self.images, self.index = width, [], {}

    def add(self, image):
        key = (image.size, image.tobytes())
        if key not in self.index:
            self.index[key] = len(self.images)
            self.images.append(image)
        return self.index[key]

    def finish(self):
        order = sorted(range(len(self.images)),
                       key=lambda i: (-self.images[i].height, -self.images[i].width, i))
        place, x, y, row = {}, 0, 0, 0
        for i in order:
            w, h = self.images[i].size
            if x + w > self.width:
                x, y, row = 0, y + row + 1, 0
            place[i] = (x, y)
            x, row = x + w + 1, max(row, h)
        sheet = Image.new('RGBA', (self.width, max(1, y + row)))
        for i, (px, py) in place.items():
            sheet.paste(self.images[i], (px, py))
        return sheet, place


def png(image):
    """Lossless; an indexed PNG when the sheet holds 256 colours or fewer."""
    best = None
    colours = image.getcolors(256)
    if colours:
        palette = [colour for _, colour in colours]
        lookup = {bytes(colour): i for i, colour in enumerate(palette)}
        data = image.tobytes()
        indexed = Image.frombytes('P', image.size,
                                  bytes(lookup[data[i:i + 4]] for i in range(0, len(data), 4)))
        indexed.putpalette([value for colour in palette for value in colour[:3]])
        buffer = io.BytesIO()
        indexed.save(buffer, 'PNG', optimize=True, transparency=bytes(c[3] for c in palette))
        if Image.open(io.BytesIO(buffer.getvalue())).convert('RGBA').tobytes() == image.tobytes():
            best = buffer.getvalue()
    buffer = io.BytesIO()
    image.save(buffer, 'PNG', optimize=True)
    return best if best and len(best) < len(buffer.getvalue()) else buffer.getvalue()


def paint(frame, indexed, rgba, shift=(0, 0)):
    """One ACT frame on a padded canvas, trimmed to its pixels: (image, x, y) or None."""
    pad = 160
    canvas = ro_sprite.paint(frame, indexed, rgba,
                             (CANVAS[0] + 2 * pad, CANVAS[1] + 2 * pad),
                             (pad + ORIGIN[0] + shift[0], pad + ORIGIN[1] + shift[1]))
    box = canvas.getbbox()
    if not box:
        return None
    return canvas.crop(box), box[0] - pad, box[1] - pad


def fit(layer):
    layer[4] = max(0, min(CANVAS[0] - layer[2], layer[4]))
    layer[5] = max(0, min(CANVAS[1] - layer[3], layer[5]))
    return layer


def pose_table(actions):
    layers, poses, layer_index, pose_index, out = [], [], {}, {}, {}
    for name, action in actions.items():
        frames = []
        for frame in action['frames']:
            refs = []
            for layer in frame:
                key = tuple(layer)
                if key not in layer_index:
                    layer_index[key] = len(layers)
                    layers.append(list(layer))
                refs.append(layer_index[key])
            key = tuple(refs)
            if key not in pose_index:
                pose_index[key] = len(poses)
                poses.append(refs)
            frames.append(pose_index[key])
        out[name] = {'delay': action['delay'], 'frames': frames}
    return layers, poses, out


def add_record(files, meta, image):
    data = dump(meta)
    name = 'poses-%s.json' % digest(data)[:20]
    files[name] = data
    image_name = 'atlas-%s.png' % digest(image)[:20]
    files[image_name] = image
    return {'meta': name, 'metaSha256': digest(data), 'metaBytes': len(data),
            'image': image_name, 'imageSha256': digest(image), 'imageBytes': len(image),
            'width': Image.open(io.BytesIO(image)).width,
            'height': Image.open(io.BytesIO(image)).height}


def attack_action(stem, held):
    if stem in FORCED_ATTACK:
        return FORCED_ATTACK[stem]
    if held:
        drawn = {a: sum(1 for f in held['actions'][a] if any(l['spr'] >= 0 for l in f['layers']))
                 for a in (80, 88, 40)}
        best = max(drawn, key=lambda a: drawn[a])
        if drawn[best]:
            return best
    return 88 if stem in AIMED else 80


def shadow_for(sex):
    """The shipped pack's ground shadow, so new bodies sit on the same ellipse."""
    index = read_json(INDEX)
    entry = index['wardrobe'][f'base-{REF_JOB}-{sex}']
    meta = read_json(WARDROBE / entry['meta'])
    if 'layers' in meta:
        meta['poses'] = [[meta['layers'][i] for i in pose] for pose in meta['poses']]
    pose = meta['poses'][meta['actions']['idle0']['frames'][0]]
    layer = next(l for l in pose if l[7] == 'shadow')
    atlas = Image.open(WARDROBE / entry['image']).convert('RGBA')
    return atlas.crop((layer[0], layer[1], layer[0] + layer[2], layer[1] + layer[3])), layer


def build_job(job, stem, race, sex, shadow):
    body_act = ro_sprite.read_act((CACHE / f'body/{job}_{sex}.act').read_bytes())
    body_indexed, body_rgba = ro_sprite.read_spr((CACHE / f'body/{job}_{sex}.spr').read_bytes())
    head_act = ro_sprite.read_act((CACHE / f'head/{race}-{HEAD_STYLE if race == HUMAN else 1}_{sex}.act').read_bytes())
    head_indexed, head_rgba = ro_sprite.read_spr((CACHE / f'head/{race}-{HEAD_STYLE if race == HUMAN else 1}_{sex}.spr').read_bytes())
    held = None
    material = WEAPONS.get(stem)
    if material and (CACHE / f'weapon/{material}_{sex}.act').exists():
        held = (ro_sprite.read_act((CACHE / f'weapon/{material}_{sex}.act').read_bytes()),
                *ro_sprite.read_spr((CACHE / f'weapon/{material}_{sex}.spr').read_bytes()))
    attack = attack_action(stem, held and held[0])
    phases = [('idle', 0, 'loop'), ('walk', 8, 'all'), ('attack', attack, 'all')]
    atlas, actions = Atlas(), {}
    shadow_image, shadow_layer = shadow
    shadow_id = atlas.add(shadow_image)
    for stance, start, mode in phases:
        for direction in range(8):
            frames = body_act['actions'][start + direction]
            if mode == 'loop':
                frames = [frames[0]] * 3
            delay = int(round(body_act['delays'][start + direction] * 25)) or 100
            route = stance + str(direction)
            z = Z_ORDER['back' if direction in (2, 3, 4, 5) else 'front']
            built = []
            for index, frame in enumerate(frames):
                base = ro_sprite.anchor_of(frame)
                layers = [(shadow_id, shadow_layer[4], shadow_layer[5], z['shadow'], 'shadow')]
                body_box = paint(frame, body_indexed, body_rgba)
                if body_box:
                    layers.append((atlas.add(body_box[0]), body_box[1], body_box[2], z['body'], 'body'))
                head_frame = head_act['actions'][start + direction][min(index, len(head_act['actions'][start + direction]) - 1)]
                head_box = paint(head_frame, head_indexed, head_rgba,
                                 (base[0] - ro_sprite.anchor_of(head_frame)[0],
                                  base[1] - ro_sprite.anchor_of(head_frame)[1]))
                if head_box:
                    layers.append((atlas.add(head_box[0]), head_box[1], head_box[2], z['head'], 'head'))
                if held and stance == 'attack':
                    weapon_frames = held[0]['actions'][start + direction]
                    weapon_frame = weapon_frames[min(index, len(weapon_frames) - 1)]
                    weapon_box = paint(weapon_frame, held[1], held[2],
                                       (base[0] - ro_sprite.anchor_of(weapon_frame)[0],
                                        base[1] - ro_sprite.anchor_of(weapon_frame)[1]))
                    if weapon_box:
                        layers.append((atlas.add(weapon_box[0]), weapon_box[1], weapon_box[2], z['weapon'], 'weapon'))
                built.append(layers)
            actions[route] = {'delay': delay, 'frames': built}
    sheet, place = atlas.finish()
    table = {}
    for route, action in actions.items():
        table[route] = {'delay': action['delay'], 'frames': [
            [fit([place[i][0], place[i][1], atlas.images[i].width, atlas.images[i].height, x, y, z, slot])
             for i, x, y, z, slot in layers] for layers in action['frames']]}
    layers, poses, action_table = pose_table(table)
    # headBaked tells the runtime the head already sits inside this atlas, so it must not
    # add the shared hair layer on top (the shipped pack keeps hair as its own atlas).
    meta = {'version': 2, 'width': sheet.width, 'height': sheet.height, 'headBaked': True,
            'layers': layers, 'poses': poses, 'actions': action_table}
    idle = [layer for layer in poses[action_table['idle0']['frames'][0]] if layers[layer][7] in ('body', 'head')]
    figure_height = max(layers[i][5] + layers[i][3] for i in idle) - min(layers[i][5] for i in idle)
    return meta, sheet, figure_height


def build(class_ids=None):
    commit = head_commit('devilm/costume-ro')
    pins = prontera_pins()
    records = []
    for job, (race, male, female) in CLASSES.items():
        if class_ids and job not in class_ids:
            continue
        for sex, stem in (('m', male), ('f', female)):
            folder = f'data/sprite/{race}/몸통/{SEX_DIR[sex]}/{stem}_{SEX_DIR[sex]}'
            for ext in ('spr', 'act'):
                records.append(pin_for(pins, commit, 'devilm/costume-ro', f'{folder}.{ext}', f'body/{job}_{sex}.{ext}'))
    for race, style in ((HUMAN, HEAD_STYLE), (DORAM, '1')):
        for sex in ('m', 'f'):
            folder = f'data/sprite/{race}/머리통/{SEX_DIR[sex]}/{style}_{SEX_DIR[sex]}'
            for ext in ('spr', 'act'):
                records.append(pin_for(pins, commit, 'devilm/costume-ro', f'{folder}.{ext}',
                                       f'head/{race}-{style}_{sex}.{ext}'))
    for name, entry in sorted(weapon_pins(pins).items()):
        if not name.startswith('weapon/'):
            continue
        material = name[len('weapon/'):]
        if not any(WEAPONS.get(stem) == material.split('_')[0] for _, (_, m, f) in CLASSES.items() for stem in (m, f)):
            continue
        for ext, record in sorted(entry.items()):
            records.append({'name': f'{name}.{ext}', 'repo': record['repo'], 'path': record['path'],
                            'blob': record['blob'], 'ref': None,
                            'sha256': record['sha256'], 'bytes': record['bytes']})
    records = [r for r in records if any(r['name'].startswith(p) for p in
               ('body/', 'head/', 'weapon/'))]
    ensure(records)
    shadow = {sex: shadow_for(sex) for sex in ('m', 'f')}
    files, assets = {}, {}
    for job, (race, male, female) in CLASSES.items():
        if class_ids and job not in class_ids:
            continue
        for sex, stem in (('m', male), ('f', female)):
            meta, sheet, figure_height = build_job(job, stem, race, sex, shadow[sex])
            assets[f'base-{job}-{sex}'] = add_record(files, meta, png(sheet))
            assets[f'base-{job}-{sex}']['figureHeight'] = figure_height
            print(f'  base-{job}-{sex}  {assets[f"base-{job}-{sex}"]["width"]}x'
                  f'{assets[f"base-{job}-{sex}"]["height"]}  '
                  f'{assets[f"base-{job}-{sex}"]["imageBytes"] // 1024} KiB')
    return files, assets, records, commit


def merge_index(assets):
    """Fold the pack into the runtime index, keeping it a pure derived subset."""
    index = read_json(INDEX)
    previous = index.get('classWardrobe') or {}
    class_assets = dict(previous)
    class_assets.update(assets)
    kept = {}
    for key, entry in sorted(class_assets.items()):
        job = int(key.split('-')[1])
        if job in CLASSES and (OUT / entry['meta']).exists() and (OUT / entry['image']).exists():
            kept[key] = entry
    index['classWardrobe'] = kept
    INDEX.write_text(json.dumps(index, separators=(',', ':')), encoding='utf-8')
    return kept


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('--sheet')
    parser.add_argument('--only', nargs='*', type=int)
    args = parser.parse_args()
    if args.verify:
        return verify()
    if args.sheet:
        return contact_sheet(args.sheet, args.only or [])
    files, assets, records, commit = build(set(args.only) if args.only else None)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        (OUT / name).write_bytes(data)
    for stale in OUT.iterdir():
        if stale.name not in files:
            stale.unlink()
    kept = merge_index(assets)
    manifest = read_json(MANIFEST) if MANIFEST.exists() else {'files': [], 'outputs': {}}
    manifest.update({
        'note': 'Native Ragnarok Online client files, decoded and composited as the client does. '
                'Reuse does not grant ownership of the underlying artwork.',
        'repository': 'devilm/costume-ro', 'commit': commit,
        'headStyle': HEAD_STYLE,
        'files': {r['name']: {'repo': r['repo'], 'path': r['path'], 'blob': r['blob'],
                              'sha256': digest((CACHE / r['name']).read_bytes()),
                              'bytes': (CACHE / r['name']).stat().st_size} for r in records},
        'outputs': {name: digest(data) for name, data in sorted(files.items())},
        'index': {key: {'meta': entry['meta'], 'image': entry['image']} for key, entry in sorted(kept.items())},
    })
    MANIFEST.write_text(json.dumps(manifest, indent=1) + '\n', encoding='utf-8')
    total = sum(len(data) for data in files.values())
    print(f'wrote {len(files)} files ({total / 1048576:.2f} MiB) for {len(kept)} class outfits')
    return 0


def frame_bounds(entry, folder):
    """Lowest and highest pixel row across every exported route, relative to the ground point."""
    meta = read_json(folder / entry['meta'])
    if 'layers' in meta:
        meta['poses'] = [[meta['layers'][i] for i in pose] for pose in meta['poses']]
    top = bottom = None
    for poses in meta['poses']:
        for layer in poses:
            low, high = layer[5] - ORIGIN[1], layer[5] + layer[3] - ORIGIN[1]
            top = low if top is None else min(top, low)
            bottom = high if bottom is None else max(bottom, high)
    return top, bottom


def verify():
    manifest = read_json(MANIFEST)
    for name, expected in manifest['outputs'].items():
        path = OUT / name
        assert path.exists(), path
        assert digest(path.read_bytes()) == expected, path
    # A sprite that floats or sinks is the usual failure of a body swap: every class must
    # stand on the ground point the shipped outfits use (feet at the ground, head above).
    for key, entry in read_json(INDEX)['classWardrobe'].items():
        top, bottom = frame_bounds(entry, OUT)
        assert -120 <= top <= -50, (key, 'too tall or too short', top)
        assert 0 <= bottom <= 30, (key, 'feet off the ground point', bottom)
    index = read_json(INDEX)
    assert sorted(index['classWardrobe']) == sorted(manifest['index'])
    for key, entry in index['classWardrobe'].items():
        assert entry['meta'] in manifest['outputs'] and entry['image'] in manifest['outputs'], key
        assert (OUT / entry['meta']).exists() and (OUT / entry['image']).exists(), key
    for job, (race, male, female) in CLASSES.items():
        for sex in ('m', 'f'):
            assert f'base-{job}-{sex}' in index['classWardrobe'], (job, sex)
    print(f'Verified {len(manifest["outputs"])} class sprite files and {len(index["classWardrobe"])} outfits.')


def contact_sheet(path, jobs):
    index = read_json(INDEX)
    classes = [job for job in CLASSES if f'base-{job}-m' in index['classWardrobe']]
    classes = jobs or classes
    cw, ch = 120, 150
    columns = 6
    rows = (len(classes) + columns - 1) // columns
    sheet = Image.new('RGBA', (cw * columns, ch * rows), (52, 60, 72, 255))
    for position, job in enumerate(classes):
        entry = index['classWardrobe'][f'base-{job}-m']
        meta = read_json(OUT / entry['meta'])
        if 'layers' in meta:
            meta['poses'] = [[meta['layers'][i] for i in pose] for pose in meta['poses']]
        atlas = Image.open(OUT / entry['image']).convert('RGBA')
        canvas = Image.new('RGBA', CANVAS)
        for layer in sorted(meta['poses'][meta['actions']['idle0']['frames'][0]], key=lambda l: l[6]):
            canvas.alpha_composite(atlas.crop((layer[0], layer[1], layer[0] + layer[2], layer[1] + layer[3])),
                                   (layer[4], layer[5]))
        crop = canvas.crop((ORIGIN[0] - cw // 2, ORIGIN[1] - ch + 12, ORIGIN[0] + cw // 2, ORIGIN[1] + 12))
        sheet.alpha_composite(crop, ((position % columns) * cw, (position // columns) * ch))
    sheet.save(path)
    print('wrote', path)
    return 0


if __name__ == '__main__':
    sys.exit(main())

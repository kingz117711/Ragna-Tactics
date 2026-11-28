"""Build gear sets from rAthena's own item-combination database.

Ragnarok Online has always had "set" gear: specific items worn together grant an extra
bonus. Those combinations are data, not house rules — they live in rAthena's
`db/re/item_combos.yml`, where each `Combos:` entry lists the item Aegis names and the
`bonus` script that fires when all of them are equipped. This script reads that file at
the same pinned commit as the catalog, keeps only the combinations whose *every* item is
already in this game's catalog (so a set is always completable from the merchant), and
translates the script into the flat stat model `src/sim.js` uses.

Nothing here is invented: a set exists only if the upstream combo exists, its membership
is the upstream membership, and its bonus is the upstream bonus. A bonus this game's model
cannot express is dropped rather than approximated, and the set records which clauses were
kept and which were skipped so the UI can be honest about it.

    python3 scripts/build_gear_sets.py            # write src/gear-sets.json
    python3 scripts/build_gear_sets.py --check    # fail if the file is stale
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Same pinned snapshot as scripts/build_gear_catalog.py.
SOURCE_REPO = 'rathena/rathena'
SOURCE_COMMIT = '6b917c1808cc93c65f27f47079b2c58a11df7c6c'
COMBO_PATH = 'db/re/item_combos.yml'
COMBO_SHA256 = 'e244b481bf3c4185e9c088d80d8b391de1d62a53ce7a8af36fb01ccf743c09d4'
COMBO_CACHE = ROOT / 'db' / 'item_combos.yml'
CATALOG = ROOT / 'src' / 'gear_catalog_ro.json'
ITEMS = ROOT / 'src' / 'gear-catalog.json'
OUT = ROOT / 'src' / 'gear-sets.json'
SNAPSHOT = ROOT / 'db' / 'item_db_equip.yml'

# `bonus <stat>, <value>` -> the key `stats()` reads. Percentages (`Rate`) and
# resistances are percentages on a 0–100 scale in this game, so they are scaled by 1.
STAT_MAP = {
    'bAtk': 'atk', 'bBaseAtk': 'atk', 'bWeaponAtk': 'atk',
    'bMatk': 'matk', 'bMagicAtk': 'matk',
    'bDef': 'def', 'bDef2': 'def', 'bVitDef': 'def',
    'bMdef': 'mdef',
    'bMaxHP': 'hp', 'bMaxSP': 'sp', 'bMaxHPrate': 'hpPct', 'bMaxSPrate': 'spPct',
    'bStr': 'str', 'bVit': 'vit', 'bAgi': 'agi', 'bInt': 'int', 'bDex': 'dex', 'bLuk': 'luk',
    'bHit': 'hit', 'bFlee': 'flee', 'bCritical': 'crit', 'bAspd': 'speed',
    'bHPrecovRate': 'hpRegen', 'bSPrecovRate': 'spRegen',
}
# `bFlee2` is rAthena's *perfect dodge* chance, a different stat from the `bFlee` flat
# flee it sits beside; mapping it onto a "flee rate" would invent a bonus. Perfect dodge
# has no model here, so it belongs in UNSUPPORTED with the other unmodellable effects.
RATE_MAP = {
    'bAtkRate': 'atkPct',
    'bMatkRate': 'matkPct', 'bDefRate': 'defPct', 'bMdefRate': 'mdefPct',
    'bSpeedRate': 'speedPct', 'bCriticalRate': 'critPct',
    'bAspdRate': 'aspdPct', 'bHitRate': 'hitPct',
}
# Effects this game has no analogue for. Recognising them lets the set say so instead of
# silently claiming a bonus it does not grant.
UNSUPPORTED = (
    'bSubRace', 'bSubSize', 'bSubEle', 'bResEff', 'bAddRace', 'bAddSize', 'bAddEle',
    'bAddMonsterDropItem', 'bAutoSpell', 'bAutoSpellWhenHit', 'bSkillAtk', 'bSkillHeal',
    'bCastrate', 'bFixedCastrate', 'bVariableCastrate', 'bDelayrate', 'bUseSPrate',
    'bNoWeaponDmg', 'bNoMagicDamage', 'bHPDrainValue', 'bSPDrainValue', 'bMagicHPGainValue',
    'bMagicSPGainValue', 'bSPGainValue', 'bHPDrainRate', 'bLongAtkRate', 'bShortAtkRate',
    'bAtkRange', 'bSplashRange', 'bIgnoreDefRace', 'bCritDef', 'bNearAtkDef',
    'bFlee2', 'bPerfectHide', 'bIgnoreDefClass', 'bIgnoreDefEle',
)
# Only gates that are *required* for the bonus to exist are conditions here.
# `BaseLevel > N ? A : B` is not one: it is a value that changes with level, and keeping
# only branch A would overstate the bonus below N and understate it above.
CONDITIONS = (
    ('Refine', re.compile(r'getequiprefinerycnt\(EQI_(\w+)\)\s*(>=|<=|==|>|<)\s*(\d+)')),
)


def fetch_combo_db():
    """Download the pinned combo database on first use, verifying its hash."""
    if COMBO_CACHE.exists():
        data = COMBO_CACHE.read_bytes()
        if hashlib.sha256(data).hexdigest() == COMBO_SHA256:
            return data
    url = f'https://api.github.com/repos/{SOURCE_REPO}/contents/{COMBO_PATH}?ref={SOURCE_COMMIT}'
    request = urllib.request.Request(url, headers={'User-Agent': 'Ragna-Tactics-gear-sets',
                                                   'Accept': 'application/vnd.github.raw'})
    with urllib.request.urlopen(request, timeout=180) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != COMBO_SHA256:
        raise SystemExit('rAthena combo database does not match the pinned hash')
    COMBO_CACHE.parent.mkdir(parents=True, exist_ok=True)
    COMBO_CACHE.write_bytes(data)
    return data


def aegis_names():
    """Aegis name -> item id, from the same pinned snapshot the catalog was built from."""
    names = {}
    for block in re.split(r'\n  - Id: ', SNAPSHOT.read_text(encoding='utf-8', errors='replace'))[1:]:
        item_id = re.match(r'(\d+)', block)
        aegis = re.search(r'\n    AegisName: (\S+)', block)
        if item_id and aegis:
            names[aegis.group(1)] = int(item_id.group(1))
    return names


def combo_blocks(text):
    """[(item names, script)] for every `Combos:` entry that lists a single combination
    set. An entry with several `Combo:` children is one bonus shared by those variants."""
    body = text.split('\nBody:', 1)[1] if '\nBody:' in text else text
    for entry in re.split(r'\n  - Combos:', body)[1:]:
        variants = []
        for part in re.split(r'\n      - Combo:', entry)[1:]:
            names = re.findall(r'\n          - ([A-Za-z0-9_]+)', part)
            if names:
                variants.append(tuple(names))
        if not variants:
            continue
        # The entry text ends at the *next* `- Combos:`, so the final script line often has
        # no trailing newline. Read indented lines until the block runs out instead of
        # matching `.*\n`, which would silently drop that last clause of the bonus.
        marker = entry.find('\n    Script: |\n')
        lines = []
        if marker != -1:
            for line in entry[marker + len('\n    Script: |\n'):].split('\n'):
                if not line.startswith('      '):
                    break
                lines.append(line)
        yield variants, '\n'.join(lines)


def translate(script):
    """Flat stats this game models, plus the clauses it had to skip."""
    flat, skipped, conditions = {}, [], []
    for clause in script.split(';'):
        clause = ' '.join(clause.split())
        if not clause:
            continue
        label, matched = classify(clause)
        if label is not None:
            condition = {'on': label[0], 'op': label[1], 'value': label[2]}
            # EQI_ARMOR / EQI_GARMENT / EQI_SHOES -> the catalog slot of the same name.
            condition['slot'] = label[3].lower()
            conditions.append(condition)
        if matched:
            for key, key_value in matched:
                add(flat, key, key_value)
        else:
            skipped.append(clause)
    return flat, conditions, skipped


def classify(clause):
    """Recognise a required refinement gate; return (label, stats it grants)."""
    for name, pattern in CONDITIONS:
        hit = pattern.search(clause)
        if hit:
            return (name, hit.group(2), int(hit.group(3)), hit.group(1)), None
    return None, parse_bonus(clause)


def parse_bonus(clause):
    """`bonus bX,n;` / `bonus bX,n+.@r;` and friends -> [(stat, value)]."""
    out = []
    for hit in re.finditer(r'bonus2?\s+(\w+)\s*,\s*(-?[\d.]+)', clause):
        stat, value = hit.group(1), float(hit.group(2))
        key = SCRIPT_MAP.get(stat)
        if key is None:
            continue
        out.append((key, int(value) if value == int(value) else round(value, 2)))
    # Reject clauses that mention an effect we cannot model, even if they also carry a
    # bonus this game would read: half a set bonus is worse than an honest "not modelled".
    if any(word in clause for word in UNSUPPORTED):
        return []
    return out


def add(flat, key, value):
    if key is None:
        return
    flat[key] = flat.get(key, 0) + value


# Script bonus -> the key `stats()` reads. `*Pct` keys are percentages of the base stat;
# `hpRegen`/`spRegen` are recovery-rate points, which this game folds into regen.
SCRIPT_MAP = dict(STAT_MAP, **RATE_MAP, hpRegen='hpRegen', spRegen='spRegen')


def build():
    catalog = json.loads(ITEMS.read_text(encoding='utf-8'))
    by_ro = {entry['roId']: (key, entry) for key, entry in catalog.items()}
    names = aegis_names()
    text = fetch_combo_db().decode('utf-8', errors='replace')
    sets, index = [], {}
    for variants, script in combo_blocks(text):
        for names_tuple in variants:
            ids = [names.get(name) for name in names_tuple]
            if not ids or any(item_id is None for item_id in ids):
                continue
            # A set must be completable from this game's catalog, and every piece must
            # occupy a different slot (two weapons or two chests cannot be worn at once).
            if not all(item_id in by_ro for item_id in ids):
                continue
            slots = [by_ro[item_id][1]['slot'] for item_id in ids]
            if len(set(slots)) != len(slots):
                continue
            flat, conditions, skipped = translate(script)
            # A conditional, unmodelled effect (resistance gated on refinement, say) is
            # not a set bonus this game can honour; shipping it as an empty "+ nothing"
            # row would be worse than leaving it out.
            if not flat:
                continue
            key = '+'.join(sorted(str(item_id) for item_id in ids))
            if key in index:
                continue
            entry = {
                'id': key,
                'name': ' + '.join(by_ro[item_id][1]['name'] for item_id in ids),
                'items': [str(item_id) for item_id in ids],
                'slots': slots,
                'bonus': dict(sorted(flat.items())),
            }
            if conditions:
                entry['requires'] = conditions
            if skipped:
                entry['unmodelled'] = skipped
            index[key] = entry
            sets.append(entry)
    sets.sort(key=lambda entry: (len(entry['items']), entry['name']))
    return {'source': {'repo': SOURCE_REPO, 'commit': SOURCE_COMMIT, 'path': COMBO_PATH,
                       'sha256': COMBO_SHA256},
            'sets': sets}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = build()
    text = json.dumps(data, ensure_ascii=False, indent=1, sort_keys=False) + '\n'
    if args.check:
        if not OUT.exists() or OUT.read_text(encoding='utf-8') != text:
            raise SystemExit('gear sets are stale: run python3 scripts/build_gear_sets.py')
        print(f'gear sets up to date ({len(data["sets"])} sets)')
        return
    OUT.write_text(text, encoding='utf-8')
    print(f'wrote {len(data["sets"])} gear sets to {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()

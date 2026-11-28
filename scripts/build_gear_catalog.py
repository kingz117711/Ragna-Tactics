"""Build the game's equipment catalog from rAthena's renewal item database.

Reads rAthena's `db/re/item_db_equip.yml` at the commit pinned below (GPL-3.0, see
licenses/), fetching it into `db/` on first use so a fresh checkout needs no manual
download, and keeps the
weapon, armor, shield, headgear, garment, footwear and accessory entries whose
item icon the client actually ships, so every entry in the shop shows genuine
Ragnarok Online art. The icons themselves are imported by
`scripts/import_equipment_icons.py`.

    python scripts/build_gear_catalog.py            # write src/gear-catalog.json
    python scripts/build_gear_catalog.py --check    # fail if the file is stale
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'db' / 'item_db_equip.yml'
# rAthena pins the upstream database the same way the asset imports pin their art: by
# commit, with a hash check, so the catalog can be rebuilt from a clean checkout.
SOURCE_REPO = 'rathena/rathena'
SOURCE_PATH = 'db/re/item_db_equip.yml'
SOURCE_COMMIT = '6b917c1808cc93c65f27f47079b2c58a11df7c6c'
SOURCE_SHA256 = 'a2b53925ad2b6138d5c563ec94f1b3f449e8d33435b00687b2f661ecb5322e01'
ICONS = ROOT / 'public' / 'assets' / 'equipment-icons'
OUT = ROOT / 'src' / 'gear-catalog.json'
SHOP = ROOT / 'src' / 'gear-shop.json'
# Set pieces the merchant must always be able to supply, so a real combo can be completed
# from the shop. scripts/build_gear_sets.py writes the same membership it derives from
# rAthena's item_combos.yml; keeping the list here means curation cannot strand a set.
SET_PIECES = ROOT / 'src' / 'gear-sets.json'

# rAthena job names -> this game's job ids. Jobs not listed here mean the item
# is limited to classes this game does not model, so it is skipped.
JOB_NAMES = {
    'Novice': 'novice', 'Swordman': 'swordsman', 'Mage': 'mage', 'Archer': 'archer',
    'Acolyte': 'acolyte', 'Merchant': 'merchant', 'Thief': 'thief',
    'Knight': 'knight', 'Priest': 'priest', 'Wizard': 'wizard',
    'Blacksmith': 'blacksmith', 'Hunter': 'hunter', 'Assassin': 'assassin',
    'Crusader': 'crusader', 'Sage': 'sage', 'Bard': 'bard', 'Dancer': 'dancer',
    'Monk': 'monk', 'Alchemist': 'alchemist', 'Rogue': 'rogue',
    'Taekwon': 'taekwon', 'StarGladiator': 'starGladiator', 'SoulLinker': 'soulLinker',
    'Gunslinger': 'gunslinger', 'Ninja': 'ninja', 'SuperNovice': 'superNovice',
    'Summoner': 'doram',
    'LordKnight': 'lordKnight', 'HighPriest': 'highPriest', 'HighWizard': 'highWizard',
    'Whitesmith': 'whitesmith', 'Sniper': 'sniper', 'AssassinCross': 'assassinCross',
    'Paladin': 'paladin', 'Professor': 'professor', 'Clown': 'clown', 'Gypsy': 'gypsy',
    'Champion': 'champion', 'Creator': 'creator', 'Stalker': 'stalker',
    'RuneKnight': 'runeKnight', 'RoyalGuard': 'royalGuard', 'Warlock': 'warlock',
    'Sorcerer': 'sorcerer', 'Ranger': 'ranger', 'Minstrel': 'minstrel', 'Wanderer': 'wanderer',
    'Mechanic': 'mechanic', 'Genetic': 'genetic', 'GuillotineCross': 'guillotineCross',
    'ShadowChaser': 'shadowChaser', 'ArchBishop': 'archBishop', 'Sura': 'sura',
    'Kagerou': 'kagerou', 'Oboro': 'oboro', 'Rebellion': 'rebellion',
    'StarEmperor': 'starEmperor', 'SoulReaper': 'soulReaper', 'SpiritHandler': 'spiritHandler',
    'Baby': None, 'All': None,
}
# A job token that this game models as a family also unlocks its class siblings,
# mirroring how the original classes inherit the parent's equip list.
FAMILY_SIBLINGS = {
    'novice': ['superNovice'],
    'swordsman': ['crusader', 'knight', 'paladin', 'lordKnight', 'royalGuard', 'runeKnight'],
    'mage': ['sage', 'wizard', 'professor', 'highWizard', 'sorcerer', 'warlock'],
    'archer': ['bard', 'dancer', 'hunter', 'clown', 'gypsy', 'sniper', 'minstrel', 'wanderer', 'ranger'],
    'acolyte': ['monk', 'priest', 'champion', 'highPriest', 'sura', 'archBishop'],
    'merchant': ['alchemist', 'blacksmith', 'creator', 'whitesmith', 'genetic', 'mechanic'],
    'thief': ['rogue', 'assassin', 'stalker', 'assassinCross', 'shadowChaser', 'guillotineCross'],
    'taekwon': ['starGladiator', 'soulLinker', 'starEmperor', 'soulReaper'],
    'doram': ['spiritHandler'],
    'gunslinger': ['rebellion'], 'ninja': ['kagerou', 'oboro'],
}

SUBTYPE_NAMES = {
    '1hSword': 'One-Handed Sword', '2hSword': 'Two-Handed Sword', '1hSpear': 'Spear',
    '2hSpear': 'Two-Handed Spear', '1hAxe': 'One-Handed Axe', '2hAxe': 'Two-Handed Axe',
    'Mace': 'Mace', '2hMace': 'Two-Handed Mace', 'Staff': 'Rod', 'Dagger': 'Dagger',
    'Bow': 'Bow', 'Knuckle': 'Knuckle', 'Musical': 'Instrument', 'Whip': 'Whip',
    'Book': 'Book', 'Katar': 'Katar', 'Revolver': 'Revolver', 'Rifle': 'Rifle',
    'Gatling': 'Gatling Gun', 'Shotgun': 'Shotgun', 'Grenade': 'Grenade Launcher',
    'Huuma': 'Huuma Shuriken', '2hStaff': 'Two-Handed Rod',
}
LOCATION_SLOT = {
    'Right_Hand': 'weapon', 'Both_Hand': 'weapon', 'Left_Hand': 'shield', 'Armor': 'armor',
    'Garment': 'garment', 'Shoes': 'footwear', 'Head_Top': 'head',
    'Head_Mid': 'head', 'Head_Low': 'head',
    'Both_Accessory': 'accessory1', 'Right_Accessory': 'accessory1', 'Left_Accessory': 'accessory2',
}
LOCATION_PRIORITY = ['Right_Hand', 'Both_Hand', 'Left_Hand', 'Armor', 'Garment', 'Shoes',
                     'Head_Top', 'Head_Mid', 'Head_Low',
                     'Both_Accessory', 'Right_Accessory', 'Left_Accessory']
SHOP_ORDER = ['weapon', 'armor', 'shield', 'head', 'garment', 'footwear', 'accessory1', 'accessory2']


def scalar(value):
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1]
    if re.fullmatch(r'-?\d+', value):
        return int(value)
    return value


def parse(text):
    """Minimal reader for the flat item-block format rAthena uses."""
    entries = []
    current = None
    nested = None
    for raw in text.split('\n'):
        if raw.startswith('  - Id: '):
            if current:
                entries.append(current)
            current = {'Id': int(raw.split(':', 1)[1])}
            nested = None
            continue
        if current is None or not raw.strip() or raw.lstrip().startswith('#'):
            continue
        if raw.startswith('    ') and not raw.startswith('      '):
            key, _, value = raw.strip().partition(':')
            nested = None
            if value.strip():
                current[key] = scalar(value)
            else:
                nested = key
                current[key] = {}
        elif raw.startswith('      ') and nested:
            key, _, value = raw.strip().partition(':')
            current[nested][key] = value.strip()
    if current:
        entries.append(current)
    return entries


def classes_for(record):
    """Return the job ids allowed to equip the item, or None for everyone."""
    jobs = record.get('Jobs') or {}
    if not jobs or jobs.get('All') == 'true':
        return None
    chosen = {name for name, enabled in jobs.items() if enabled == 'true'}
    if not chosen:
        return None
    allowed = set()
    for name in chosen:
        job = JOB_NAMES.get(name)
        if job:
            allowed.add(job)
    if not allowed:
        return []
    expanded = set(allowed)
    for job in list(allowed):
        expanded.update(FAMILY_SIBLINGS.get(job, []))
    return sorted(expanded)


def shop_key(item_id, entry, seen):
    """Readable, stable key built from the item name and the RO id."""
    base = re.sub(r'[^a-z0-9]+', '_', entry['name'].lower()).strip('_') or 'item'
    base = f'{base}_{item_id}'
    while base in seen:
        base += '_'
    seen.add(base)
    return base


# The starter kit the game's opening hours depend on: always kept, so the first
# shop page and the drop pools never regress to late-game gear only.
CORE = [1201, 1101, 1702, 1602, 1501, 1104, 1301, 1601, 1701, 1504,
        2301, 2303, 2314, 2321, 2374,
        2101, 2102, 2105, 2115, 2123,
        2201, 2230, 2228, 2357, 2410,
        2501, 2503, 2524, 2535,
        2401, 2403, 2405, 2357, 2365,
        2601, 2603, 2604, 2607, 2608, 2410, 2402,
]
QUOTAS = {'weapon': 170, 'armor': 80, 'shield': 45, 'head': 80, 'garment': 60,
          'footwear': 60, 'accessory1': 70, 'accessory2': 30}
TIERS = [(1, 10, 0.34), (11, 30, 0.26), (31, 60, 0.22), (61, 100, 0.18)]


def fetch_source():
    """Download the pinned item database on first use and verify it when pinned."""
    if SOURCE.exists():
        return
    url = f'https://api.github.com/repos/{SOURCE_REPO}/contents/{SOURCE_PATH}?ref={SOURCE_COMMIT}'
    request = urllib.request.Request(url, headers={'User-Agent': 'Ragna-Tactics-gear-import',
                                                   'Accept': 'application/vnd.github.raw'})
    with urllib.request.urlopen(request, timeout=180) as response:
        data = response.read()
    if SOURCE_SHA256 and hashlib.sha256(data).hexdigest() != SOURCE_SHA256:
        raise SystemExit('rAthena item database does not match the pinned hash')
    SOURCE.parent.mkdir(parents=True, exist_ok=True)
    SOURCE.write_bytes(data)


def build():
    """Every icon-backed equip entry, keyed by RO item id."""
    fetch_source()
    records = parse(SOURCE.read_text(encoding='utf-8'))
    # Bootstraps: the icon budget per slot, so a fresh import can create the
    # catalog it will then be verified against.
    budgets = {'weapon': 170, 'armor': 80, 'shield': 45, 'head': 80, 'garment': 60,
               'footwear': 60, 'accessory1': 70, 'accessory2': 30}
    icons = set(int(path.stem) for path in ICONS.glob('*.png')) if ICONS.exists() else set()
    icons.update(CORE)
    catalog, seen = {}, set()
    for record in records:
        item_id = record['Id']
        if icons and item_id not in icons:
            continue
        locations = record.get('Locations') or {}
        if any(key.startswith('Costume_') for key in locations):
            continue  # costumes are looks, not gear
        slot = next((LOCATION_SLOT[name] for name in LOCATION_PRIORITY
                     if name in locations and name in LOCATION_SLOT), None)
        if not slot:
            continue
        kind = record.get('Type')
        name = str(record.get('Name', '')).strip()
        if not name:
            continue
        if kind == 'Weapon':
            if slot == 'shield':
                continue
            entry = {
                'name': name, 'kind': SUBTYPE_NAMES.get(record.get('SubType'), 'Weapon'),
                'slot': slot, 'atk': record.get('Attack', 0),
                'matk': record.get('MagicAttack', 0),
                'weaponLevel': record.get('WeaponLevel', 1),
                'range': record.get('Range', 1), 'slots': record.get('Slots', 0),
                'weight': record.get('Weight', 0), 'buy': record.get('Buy', 0),
                'equipLevel': record.get('EquipLevelMin', 1),
                'refineable': record.get('Refineable') == 'true',
            }
        elif kind == 'Armor':
            subtype = str(record.get('SubType') or '')
            entry = {
                'name': name,
                'kind': 'Accessory' if subtype.endswith('Accessory') else
                        ('Headgear' if slot == 'head' else 'Armor'),
                'slot': slot, 'def': record.get('Defense', 0),
                'mdef': record.get('MagicDefense', 0), 'armorLevel': 1,
                'slots': record.get('Slots', 0), 'weight': record.get('Weight', 0),
                'buy': record.get('Buy', 0), 'equipLevel': record.get('EquipLevelMin', 1),
                'refineable': record.get('Refineable') == 'true',
            }
        else:
            continue
        classes = classes_for(record)
        if classes == []:
            continue  # limited to classes this game does not model
        if classes:
            entry['classes'] = classes
        for key in ('atk', 'matk', 'def', 'mdef', 'slots', 'weight', 'buy', 'range', 'mdef'):
            if key in entry and not entry[key]:
                entry.pop(key)
        if entry.get('equipLevel', 1) <= 1:
            entry.pop('equipLevel', None)
        if not entry.get('refineable'):
            entry.pop('refineable', None)
            entry.pop('weaponLevel', None)
        entry['roId'] = item_id
        catalog[str(item_id)] = entry
    return catalog


def power(entry):
    return (entry.get('atk', 0) + entry.get('def', 0) + entry.get('matk', 0)
            + entry.get('mdef', 0))


def curate(catalog):
    """A shop-sized subset: spread across slots, level bands and price points."""
    keep = {}
    for slot, quota in QUOTAS.items():
        pool = [entry for entry in catalog.values() if entry['slot'] == slot]
        chosen = []
        for low, high, share in TIERS:
            band = [entry for entry in pool if low <= entry.get('equipLevel', 1) <= high]
            band.sort(key=lambda e: (power(e), -e['roId']), reverse=True)
            count = max(1, int(quota * share))
            basics = sorted(band, key=lambda e: (e.get('buy', 0), e['roId']))[:max(1, count // 3)]
            seen = {entry['roId'] for entry in chosen}
            for entry in band[:max(1, count - len(basics))] + basics:
                if entry['roId'] in seen:
                    continue
                seen.add(entry['roId'])
                chosen.append(entry)
        for entry in chosen[:quota]:
            keep[str(entry['roId'])] = entry
    # The starter kit always survives curation, even when the client lists it without a
    # price (the merchant screen filters those out separately).
    for item_id in CORE:
        entry = catalog.get(str(item_id))
        if entry:
            keep[str(item_id)] = entry
    seen = set()
    for item_id, entry in sorted(keep.items(), key=lambda kv: int(kv[0])):
        entry['key'] = shop_key(int(item_id), entry, seen)
    return dict(sorted(keep.items(), key=lambda kv: int(kv[0])))


def sellable(entry):
    """Shop stock: nothing flagged not-for-sale, nothing with admin-only stats."""
    if entry["name"].lower().startswith(("not for sale", "[not for sale]", "not_for_sale")):
        return False
    # A real shop value is required: gear the client lists at 0 has no merchant price,
    # and a zero-priced entry would otherwise be sold for the floor price by accident.
    if entry.get('buy', 0) <= 0:
        return False
    # Skip admin/kRO-test stat outliers: the merchant should not sell them.
    if entry.get('atk', 0) > 400 or entry.get('def', 0) > 90 or entry.get('matk', 0) > 400:
        return False
    if entry.get('buy', 0) <= 20 and (entry.get('atk', 0) + entry.get('def', 0)) > 150:
        return False
    # Event and god items are not merchant stock even when the DB lists a price.
    if entry.get('buy', 0) <= 1 and power(entry) >= 40:
        return False
    if entry['roId'] in CORE:
        return True
    if entry.get('equipLevel', 1) > 100:
        return False
    return True


def set_pieces(catalog):
    """Catalog ids that belong to a real item combination, so a set can be completed."""
    if not SET_PIECES.exists():
        return []
    data = json.loads(SET_PIECES.read_text(encoding='utf-8'))
    return [item_id for entry in data.get('sets') or []
            for item_id in entry.get('items') or [] if str(item_id) in catalog]


def shop_piece(entry):
    """A set piece the merchant may stock even when the DB lists only a token price.

    The upstream combination is the reason to sell it, so the ordinary `sellable()` filters
    (which assume a real shop value) are relaxed — but only for ordinary gear: an item with
    no price at all, or with admin-scale stats, still never reaches the merchant.
    """
    if sellable(entry):
        return True
    if entry.get('buy', 0) <= 0 or entry.get('equipLevel', 1) > 100:
        return False
    if entry.get('atk', 0) > 400 or entry.get('def', 0) > 120 or entry.get('matk', 0) > 400:
        return False
    return True


def shop_order(catalog):
    """Merchant stock: the starter kit plus a strong pick per slot and level band."""
    tiers = [(1, 15), (16, 40), (41, 70), (71, 100)]
    # Deduplicated: CORE lists a few ids twice (Valkyrian Armor, Sleipnir), and a repeated
    # shop key would render the same row twice and buy the wrong instance.
    picks = []
    for item_id in CORE:
        entry = catalog.get(str(item_id))
        # CORE keeps the starter kit in the catalog; the merchant may still have no price
        # for one of those ids, and a priceless row would sell for the floor price.
        if entry and sellable(entry) and entry['key'] not in picks:
            picks.append(entry['key'])
    # Order the gear-set pieces first: they are the cheap end of the stock and are the
    # rows a player looks for when chasing a combination.
    pieces = set_pieces(catalog)
    for item_id in pieces:
        entry = catalog.get(str(item_id))
        if entry and shop_piece(entry) and entry['key'] not in picks:
            picks.append(entry['key'])
    # Each family earns its own slots: the strongest pick per slot per level band, then the
    # band's cheapest sensible piece, so the merchant has an affordable entry point too.
    for slot in SHOP_ORDER:
        pool = [entry for entry in catalog.values() if entry['slot'] == slot and sellable(entry)]
        for low, high in tiers:
            band = [entry for entry in pool if low <= entry.get('equipLevel', 1) <= high]
            if not band:
                continue
            for entry in sorted(band, key=lambda e: (power(e), -e['roId']), reverse=True)[:3]:
                if entry['key'] not in picks:
                    picks.append(entry['key'])
            cheap = min(band, key=lambda e: (e.get('buy', 0), -power(e)))
            if cheap['key'] not in picks:
                picks.append(cheap['key'])
    return picks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    catalog = build()
    curated = curate(catalog)
    text = json.dumps(curated, indent=0, sort_keys=True, separators=(',', ':')) + '\n'
    shop = json.dumps(shop_order(curated), indent=0) + '\n'
    if args.check:
        if not OUT.exists() or OUT.read_text(encoding='utf-8') != text:
            raise SystemExit('src/gear-catalog.json is stale: rerun scripts/build_gear_catalog.py')
        if not SHOP.exists() or SHOP.read_text(encoding='utf-8') != shop:
            raise SystemExit('src/gear-shop.json is stale: rerun scripts/build_gear_catalog.py')
        print(f'gear catalog up to date ({len(curated)} items).')
        return
    OUT.write_text(text, encoding='utf-8')
    SHOP.write_text(shop, encoding='utf-8')
    print(f'Wrote {len(curated)} of {len(catalog)} icon-backed items to src/gear-catalog.json.')


if __name__ == '__main__':
    main()

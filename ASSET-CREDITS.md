# Existing artwork and provenance

The character and monster artwork in this foundation is reused from the owner's
[Prontera-Grind repository](https://github.com/KzeR7/Prontera-Grind), not generated
or repainted for this game. The underlying Ragnarok Online artwork belongs to its
respective rights holders, including Gravity. Copying these files does not establish
a new artwork license or transfer ownership.

## Imported subset

- Male/female native bodies for Novice and the six first jobs and their six second and six transcendent jobs.
- One original default hairstyle per gender, with class-specific layer placement.
- Original native monster atlases: Poring (1002), Fabre (1007), Willow (1010),
  Baphomet (1039), Scorpion (1001), Peco Peco (1019), Phreeoni (1159), Zombie (1015), and Archer Skeleton (1016).
- Original wardrobe and monster catalogs, retained as provenance.

Exact source repository, commit, paths, SHA-256 hashes, and byte lengths are in
[`public/assets/provenance.json`](public/assets/provenance.json). Source files were
copied byte-for-byte. `public/assets/index.json` is the derived runtime routing
subset; it does not modify any atlas or pose data.

The runtime composites native sprite layers at their supplied coordinates and
uses their own eight-direction idle/walk/attack metadata and frame delays. Body,
hair, and monster pixels are not recolored. Rendering uses uniform scaling and
nearest-neighbor sampling. Monster heights are not normalized to match characters.

The source's pipeline guides are `tools/native-wardrobe/README.md`,
`tools/native-fields/`, and `assets/reference-mobs.js` at the pinned commit. Read
those before expanding the import. Do not copy the source game's entire asset tree.

```sh
python scripts/import_assets.py --verify  # offline verification
python scripts/import_assets.py           # network import at the manifest's pinned commit
```

The import script initially resolves a source commit once, then pins every fetch.
It validates the source wardrobe hashes during import. The offline audit verifies
every original file and confirms the runtime subset against the source catalogs.

Ground, paths, foliage, and sanctuary outlines are provisional procedural Canvas
scenery authored for this foundation. They are visually decorative and non-blocking.
No source game maps or collision data were imported. Typography uses system fonts.

## Imported terrain (South Prontera)

From the same pinned commit, `Updates/map-sprites-v2/work/` supplies three ground
tiles (`grass_blossom`, `grass_olive`, `dirt_path`) and eight props (`tree_tall_cluster`,
`tree_sapling`, `tree_bush_bright`, `rock_boulder_mossy`, `rock_cliff_crag`,
`standing_stone`, `lantern_stone`, `house_prontera`). Anchors come from the upstream
`_anchors.json`. Files are copied byte-for-byte and listed in `provenance.json`.
The runtime uses native sizes, uniform scaling and nearest-neighbour sampling. The
ground tiles sit under the procedural paths and outlines. Terrain is not used for collision.

Gaps for the owner:

- No gat/collision data was imported. The field has no navigation model.
- The upstream has no authored South Prontera layout. The camp, branching road,
  Poring Meadow and Fabre Thicket are procedural.
- Unimported tile families: grass_jade, sand*, cliff_*, water_*, bridge_*.
- Rejected: `prontera/terrain.png`, a composed three-region strip that cannot be
  split cleanly.
- Not imported: the `ro-tiles-hd.png` atlas and the `native-fields` catalog.
- The Eddga import was not present in this workspace, so no Eddga assets are listed.

## Renewal equipment data

The curated standard equipment fields in `src/data.js` were derived from
rAthena's `db/re/item_db_equip.yml` at commit
[`6b917c1808cc93c65f27f47079b2c58a11df7c6c`](https://github.com/rathena/rathena/blob/6b917c1808cc93c65f27f47079b2c58a11df7c6c/db/re/item_db_equip.yml).
The upstream project declares GPL-3.0; its license text and source notice are
included under `licenses/`. This notice does not apply to Ragnarok Online artwork.

`scripts/build_gear_catalog.py` fetches that file into `db/` on first use and
re-derives `src/gear-catalog.json` and the merchant's stock from it; `db/` is not
committed. Its SHA-256 is pinned in the script.

## Class sprites for the full job roster

`public/assets/wardrobe/classes/` holds native body sprites for the 40 classes the shipped
wardrobe does not cover (Crusader through Summoner / Spirit Handler, jobs 14–4308, both
genders). They are decoded from the Ragnarok Online client's own `.spr` / `.act` files and
composited exactly the way the client does it: the body ACT frame at the ACT origin, the
head at `body attach point - head attach point`, and the weapon the class holds during its
attack animation shifted the same way. Nothing is redrawn, recoloured or traced.

| What | Repository | Path |
| --- | --- | --- |
| Class bodies, heads | [`devilm/costume-ro`](https://github.com/devilm/costume-ro) | `data/sprite/인간족/몸통/{남,여}`, `data/sprite/인간족/머리통/{남,여}`, `data/sprite/도람족/…` |
| Held weapon sprites (melee, spear, axe, mace, dagger, rod, staff, book, bow, whip) | [`rAthena-Thailand/ClientROThailand`](https://github.com/rAthena-Thailand/ClientROThailand) | `Client-2025-06-04/Pre-Renewal/data/sprite/인간족/<job>/<job>_{남,여}_<item id>.{spr,act}` |
| Held weapon sprites (revolver, rifle, shuriken, Rogue bow, instrument) | [`linhan85/rAthenaCN_LeeClient`](https://github.com/linhan85/rAthenaCN_LeeClient) | `data/sprite/인간족/<job>/<job>_{남,여}_<item id>.{spr,act}` (folder names stored as GBK-mangled CP949; the importer decodes both) |

Files are fetched through the GitHub contents API (the sandbox cannot reach
`raw.githubusercontent.com`) and pinned by git blob id and SHA-256; the same pins
Prontera-Grind already publishes for these client files are reused where the path matches,
and [`public/assets/class-provenance.json`](public/assets/class-provenance.json) records
every source and every generated file. `public/assets/index.json` gains one derived key,
`classWardrobe`, listing the new outfits only.

### Weapon overlays

The client only draws a held weapon during an attack motion — there is no idle or walk
weapon art in any of these files — so weapons ship as their own attack-only atlases next to
the bodies in `index.json` under `weapon-<job>-<sex>-<family>`. Each class holds the weapon
sprite the client actually ships for its own body, keyed by the real item id in the file
name (a `kind` from rAthena's item database decides the family: `One-Handed Sword → sword`,
`Two-Handed Rod → staff`, `Grenade Launcher → gun`, …). Where the client has no art for a
body, the class borrows its second job's kit exactly as the client does (Paladin → Crusader,
Ministry → Bard, third jobs → their second job) and the runtime falls back along the same
order per weapon type (a two-hander is carried as a sword, a katar as a dagger).
`scripts/class-weapon-pins.json` is the tracked manifest: 182 weapon sets, each pinned by
git blob id and SHA-256, with its source repository and raw path.

```sh
python3 scripts/import_class_sprites.py            # fetch (cached), rebuild the pack
python3 scripts/import_class_sprites.py --verify   # offline hash + ground-line check
```

The pack ships idle, walk and attack, eight directions each, with the client's own frame
delays. The head hairstyle is style 2, the one the shipped wardrobe already renders. The
Summoner (Doram) line uses the client's Doram race art (small bodies, their own heads).

## Skill icons

`public/assets/skill-icons/` holds 161 genuine Ragnarok Online skill icons, and
`public/assets/equipment-icons/` 524 genuine item icons (24×24). The skill icons come from
the client's `texture/유저인터페이스/item/` set via
[`Althaeas/Data.grf`](https://github.com/Althaeas/Data.grf); the item icons from
[`nadesh52/ragnarok-asset`](https://github.com/nadesh52/ragnarok-asset)
(`icon/<itemId>.png`). Per-file source, hash and the item/skill mapping are in
`public/assets/skill-icons/provenance.json`, `public/assets/equipment-icons/provenance.json`,
`scripts/skillicon_map.json` and `scripts/build_gear_catalog.py`.

Item statistics in `src/gear-catalog.json` come from rAthena's
`db/re/item_db_equip.yml` (GPL-3.0, see `licenses/`). Only icon-backed, sellable gear is
curated into the catalog and the merchant's 116-key stock.

### Gear sets

The item combinations in `src/gear-sets.json` are the game's real set bonuses, not
invented ones. `scripts/build_gear_sets.py` reads rAthena's
`db/re/item_combos.yml` at the same commit
([`6b917c1808cc93c65f27f47079b2c58a11df7c6c`](https://github.com/rathena/rathena/blob/6b917c1808cc93c65f27f47079b2c58a11df7c6c/db/re/item_combos.yml),
SHA-256 `e244b481bf3c4185e9c088d80d8b391de1d62a53ce7a8af36fb01ccf743c09d4`,
1,879,053 bytes), verifies the hash, and keeps only combinations whose every piece is in
this game's catalog, occupy distinct slots, and carry a bonus the stat model can express.
Combinations whose only effects are resistances, status immunities or other mechanics this
game does not simulate are omitted rather than reduced. Same GPL-3.0 data license as the
item database above; Ragnarok Online artwork is not covered by it.

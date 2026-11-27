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

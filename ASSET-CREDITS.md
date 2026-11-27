# Existing artwork and provenance

The character and monster artwork in this foundation is reused from the owner's
[Prontera-Grind repository](https://github.com/KzeR7/Prontera-Grind), not generated
or repainted for this game. The underlying Ragnarok Online artwork belongs to its
respective rights holders, including Gravity. Copying these files does not establish
a new artwork license or transfer ownership.

## Imported subset

- Male/female native bodies for Novice and the six first jobs and their six second jobs.
- One original default hairstyle per gender, with class-specific layer placement.
- Original native monster atlases: Poring (1002), Fabre (1007), Willow (1010),
  and Baphomet (1039).
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

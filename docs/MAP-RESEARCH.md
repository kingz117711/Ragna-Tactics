# Map research — terrain sprite sourcing and South Prontera

Reference for the South Prontera terrain pilot: where terrain/prop art comes from,
how the layout is authored and built, and how it renders. The runtime source of
truth is `assets-src/*.tmj` plus the deterministic converter
`scripts/convert-terrain.mjs`.

## Starting point and visual reference

The game renders angled, sprite-based fields with Canvas 2D. It already has
map-specific bounds, an 8-world-unit terrain chunk size, a bounded terrain cache,
map markers and concurrent off-camera simulation. South Prontera bounds are
±42 by ±32 world units, and it is the best pilot because it already has authored
landmarks, roads and two independently useful hunting areas. The previous HD
texture import was reverted; use the current asset manifest as the input inventory.

Ragnarok Origin is the visual reference for continuous roads, layered scenery,
terrain variety and landmark readability. Build an original composition with
assets the project has permission to use.

- [Ragnarok Origin game introduction](https://roo-global.gitbook.io/guide/game-introduction)
- [Gravity's Ragnarok series overview](https://img.gravity.co.kr/GravityUpload/0000/2026/02/13/Gravity%20IR%20Presentation_2025_4Q_EN.pdf)
- [Prontera-Grind terrain source](https://github.com/KzeR7/Prontera-Grind/tree/f47bf27e3092c385ba050da1cdb2fde4176f5183/Updates/map-sprites-v2/work)

## Sprite sourcing

The terrain and prop tiles are **imported original art**, pinned to a single
upstream commit and recorded in `public/assets/provenance.json`. The import path is
`scripts/import_assets.py`; `npm run assets:verify` re-checks the manifest against
the files on disk.

- **Source:** `KzeR7/Prontera-Grind`, PR #8 "Map Kit v2" —
  `Updates/map-sprites-v2/` (a 2048×2048 atlas plus per-asset PNGs: 25 tiles and
  34 billboards).
- **Pinned commit:** `f47bf27e3092c385ba050da1cdb2fde4176f5183`. Nothing is fetched at
  runtime; the files are copied once at import time and committed.
- **Tiles imported (11):** `grass_blossom`, `grass_olive`, `grass_geffen`, `grass_jade`
  (grass family), `dirt_path`, `cliff_rock`, `water_dark_0`, `water_dark_1`,
  `water_frame_0`, `water_frame_1`, `riverbank_wall`.
- **Props imported (16):** the 34-billboard set trimmed to the props placed in
  South Prontera plus standbys: `tree_cherry`, `tree_ancient_large`,
  `shrine_stone`, `torii_gate`, `pier_post`, `river_stone_post`, `bridge_red_arch`,
  `house_ruin`, and the remaining billboards. Native `anchorX/anchorY/w/h` for every
  prop come from the upstream `_anchors.json` at the pinned commit and are stored in
  `public/assets/terrain/props/source-anchors.json`; props draw at native scale and
  anchors — no tinting, no flattening, no guessed frame counts.

Alternatives evaluated and not used: `kxdrsrt/RustyGRF`, `oldinroplayer/ragassets`,
`TheLiberalArtsPressAd/ROweb`, `Serg-Norseman/NorseWorld-Ragnarok`. The pinned
Prontera-Grind kit already satisfies the requirement and keeps provenance to one
reviewable source.

## Authoring model

Visual layout and gameplay data are kept separate:

- **Visual layout** lives in `assets-src/south-prontera.tmj` — a Tiled 1.15 isometric
  authoring file (21×16 grid, `cell = 4`, origin `(-42, -32)`). It holds one accent
  tile layer plus four object layers: `roads`, `shoreline`, `zones`, `landmarks`, and
  11 tilesets mapped to the imported tile PNGs. A human can open it in Tiled and edit.
- **Gameplay data** stays in `src/data.js` (`MAPS`, `HUNT_RADII`, `MONSTERS`, …).
  Terrain is **decorative scenery with no collision**; it never feeds movement,
  targeting, or spawn rules.
- `scripts/convert-terrain.mjs` is a small deterministic build-time converter. It reads
  the `.tmj`, reads `origin`/`cell` from its properties, and bakes a flat
  `public/assets/terrain/south-prontera.json` layout (cells, roads, shoreline, zones,
  landmarks, transitions). It registers the layout in `public/assets/index.json` under
  `terrain.layouts[mapId]`. `scripts/build.mjs` runs it before copying assets into
  `dist/`, so the same converter runs on every build and the output is reproducible.

## South Prontera layout

`mapId: 'meadow'` — the first seamless terrain pilot, at the existing angled camera
(`project(x,y) = {(x-y)*22, (x+y)*11}`) and sprite scale.

- **Camp exit** at the south, branching road network: `road-camp` runs north from camp
  through the Poring Meadow; `road-east` branches toward the Fabre Thicket and the
  eastern shore; `road-west` branches toward the western river.
- **Shoreline:** a 7-segment riverbank with `water_dark` water, `water_frame` edges and
  a `riverbank_wall` bank, so the water reads as a real edge rather than a flat tile.
- **Two hunting districts** (zone ellipses, drawn on the minimap and ground):
  - **Poring Meadow** at `(-25, 17)`, radius 12 — grassland with blossom/olive accents.
  - **Fabre Thicket** at `(23, 8)`, radius 12 — denser jade/geffen grass with trees.
- **Landmarks (8)** placed at native anchors for readability and minimap navigation:
  `torii_gate`, `shrine_stone`, `tree_cherry`, `tree_ancient_large`,
  `bridge_red_arch`, `pier_post`, `river_stone_post`, `house_ruin`.
- **Transitions:** a grass family (`grass_blossom`, `grass_olive`, `grass_geffen`,
  `grass_jade`), `dirt_path` for roads, the water family, `riverbank_wall` bank, and
  `cliff_rock` for rises.

## Rendering detail

`src/renderer.js` draws detail as the camera approaches, using bounded chunk work:

- **Chunk cache** is a bounded LRU keyed `mapId:cx:cy` (`CHUNK = 8`, `CELL = 4`),
  bounded at **96** entries — at least the largest map's full-view chunk count
  (meadow ≈63).
- **`detailLevel(camera)`** returns 0 (full detail), 1 (tiles only, no props), or 2
  (low-detail overview) based on zoom. When the visible set would exceed the cache
  bound (wide zoom or a large viewport), the renderer draws one flat overview slab
  instead of compositing per-chunk canvases, so the cache never thrashes; detail
  returns as the camera zooms in enough that the visible set fits within 96.
  `paintChunkGround` honors the level; level 2 draws a flat overview color.
- **Visible-set pinning:** chunks under the viewport are pinned (`this.pinned`) so
  panning does not thrash them; `evictChunk` respects the bound. Pinning is sticky so
  the prefetch ring stays resident across frames.
- **Prefetch:** `prefetch()` loads chunks just outside the current view so zoom/pan
  feels instant.
- The minimap extends the compact/expanded view with shoreline, zones, roads,
  landmarks, and a direct jump to every roster member (`minimapCharacterAt`).

## Verification

- Camp, spawn, retreat and assignment paths survive migration: `tests/sim.test.js`
  asserts the South Prontera terrain migration invariants by reading the baked
  `public/assets/terrain/south-prontera.json`.
- `npm run assets:verify` — 119 original asset files.
- `npm run check`, `npm test`, `npm run build`, `npm run test:build` — all pass.
- Screenshots: `artifacts/terrain-desktop.png`, `artifacts/terrain-overview.png`,
  `artifacts/terrain-closeup.png`, `artifacts/terrain-phone.png`,
  `artifacts/skills-page.png`. Cold-load and pan metrics are in `artifacts/metrics.json`.

## Open gaps

- No collision/pathfinding model; terrain remains non-blocking until a tested
  navigation model exists (see `AGENTS.md`).
- Other terrain families (desert, cave, indoor) are unimported.
- Terrain layouts beyond South Prontera are not authored yet.

## Reference links

- [Tiled Terrain Sets](https://doc.mapeditor.org/en/latest/manual/terrain/)
- [Tiled map orientations](https://doc.mapeditor.org/en/latest/manual/maps/)
- [Tiled infinite maps](https://doc.mapeditor.org/en/latest/manual/using-infinite-maps/) · [Tiled JSON format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)
- [MDN Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) · [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)

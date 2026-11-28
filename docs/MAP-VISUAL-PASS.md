# Map visual pass — modern Ragnarok field rendering

This document records how the six live fields are painted, why each pass exists,
and the specific rendering rules that keep the result looking like a modern
Ragnarok field instead of procedural noise. It is the reference for anyone
changing `src/terrain.js`.

The target was the look of **Ragnarok Origin** and **Ragnarok 3**: soft
airbrushed ground, seams that never show, a field that reads as a *place* with
volume, and scenery that layers cleanly over terrain. Three complaints drove the
work: textures overlapping, no solid "box" feel, and visible transitions.

## Where the art lives

All composition is in `src/terrain.js`. `src/data.js` stays gameplay-only.
Six maps map to six biome palettes through `MAP_BIOME`:

| Map | Biome key | Reads as |
| --- | --- | --- |
| `meadow` (South Prontera) | `prontera` | olive grass, warm dirt roads, round trees |
| `forest` (Payon Forest) | `payon` | deep green, red-brown trails, bamboo |
| `payon` (Payon Cave) | `cave` | violet slate, cobbled walkway, crystals |
| `morroc` (Sograt Desert) | `sograt` | cream sand, palms, ochre ruin |
| `arena` (Labyrinth Forest) | `labyrinth` | mossy paving, standing stones |
| `lair` (Phreeoni) | `dune` | dark sand, ruins, bones |

Each biome carries `base`/`blend`/`path`/`edge` tiles, a `grade` tint, a mottle
palette, verge/rim/gravel colours, a decal mix, and a `props` vocabulary. Each
map has a recipe in `ART` (landmarks, groves, undergrowth, water, trails,
floorAreas). Nothing about the look is hard-coded per map anywhere else.

## The seam rules

These are the invariants. Breaking any one of them reintroduces visible borders.

1. **The ground painter is a pure function of world position.** Two chunks that
   cover the same world point must produce identical pixels. Chunk canvases are
   never clipped to the chunk diamond: `renderChunk` computes the diamond's
   projected bounding box, unprojects its four corners, and paints that whole
   world rect. Neighbouring chunks overlap with identical pixels.
2. **Patterns are cached per canvas context, not per image.** A `CanvasPattern`
   belongs to the context that created it. Every chunk has its own context, so a
   shared cache silently gave neighbouring chunks different tile phases.
3. **Pattern transforms are set in user space**, via `pattern.setTransform`, so
   the tile phase is anchored to world coordinates rather than to the canvas
   origin.
4. **Ground fills are axis-aligned.** Rotating a ground pattern makes its grid
   visible inside diagonal features. Repetition is broken with organic mottle
   instead.
5. **Never clip a circular radial gradient to an ellipse.** The gradient reaches
   past the clip, which leaves a hard elliptical rim. Use `softEllipse`, which
   scales the canvas and then draws a circular gradient.
6. **Never clip a single tile fill to a shape.** Use `softTileArea`, which paints
   the tile into a buffer and multiplies it by a multi-lobe soft mask.
7. **Fog geometry is a pure function of distance outside the bounds**, so chunks
   and the wide overview agree exactly. `APRON = 74` units keeps the field
   full-screen at gameplay zoom; the ramp only starts 26 units inside the apron.

## Pass order

`paintGround` runs these in order. The order matters: colour grade has to come
*after* roads and water so they share the biome light, and rim massing has to
come *before* the wilds so the treeline layers over the lip.

1. Base ground pattern.
2. Companion tile at a different scale — the two repeats never sync.
3. A very large companion pass for broad tonal drift.
4. Large soft mottling: the airbrushed patchiness of a painted field.
5. Patchy second tile family.
5b. **Floor areas** — soft regions of a second surface (cobbled paving, dark sand).
6. Water, then bridges over it.
7. Worn roads through the field.
7b. Colour grade.
8. **Edge massing** — plateau lip, rim light, boulder ring, treeline, fog.
9. Decals, undergrowth tint, prop contact shadows.
10. Canopy light and lantern glow.

## Scene-by-scene techniques

### Roads

A road is not a stroke. In order:

1. A pale **halo** of worn ground, two wide passes at 0.13 and 0.20 alpha.
2. **Ragged clods** of the path tile stamped along both shoulders, at a wandering
   offset and a randomised radius, clipped to an ellipse each. This is what breaks
   the silhouette so the road looks trodden rather than printed.
3. A **packed core** — three passes at rising width, 0.50 / 0.62 / 0.50 alpha.

Nothing is drawn at full opacity. Grass shows through everywhere, so there is no
hard edge where the path meets the field. Paths are traced with `pathTrace`, which
walks a quadratic spline through the authored control points, so a road bends
instead of turning on hips and corners.

### Floor areas (`softTileArea`)

Ruined paving and sand patches are painted by:

1. Computing the **four transformed corners** of the region. Under the isometric
   projection the rect is rotated 45°, so two opposite corners do not describe
   its extent — using only two produces a buffer far too small and a hard rectangle.
2. Painting the tile into a buffer at full strength, with a transform of
   `translate(-left, -top) ∘ worldToDevice`.
3. Building the mask on a **separate canvas** as the union of 14 overlapping
   falloff lobes drawn with `globalCompositeOperation = 'lighter'`. Lobe radii and
   reaches are drawn from wide ranges, so the union is a ragged blob, not an
   ellipse.
4. Compositing with `destination-in`, then drawing the buffer onto the target
   **in device space** (`setTransform(1,0,0,1,0,0)`).

Applying the lobes one at a time with `destination-in` *intersects* them and the
patch disappears. That mistake is easy to reintroduce; see the comment in the
function.

### Water

Mud verge → bank stones → flat deep-colour bed → channel light gradient → ripple
tile at 2.6× scale (which hides its repeat) → pale wet band above the waterline →
dark seam → foam. Meadow and forest streams run 105 units past the field edge so
a stream never stops in mid-sky.

### Bridges

Bridges are **derived, not authored**. `crossings(mapId, art)` walks every
polyline in `trails` in 0.4-unit steps, tests `inWater`, and emits entry/exit
pairs. `paintBridges` then draws a deck 5.4 units longer than the span, dark deck
shadow on the water, edge wear, a pale walked centre, rails and post heads.

`trails` are **invisible guide lines** used only to find water crossings. They are
never drawn; `roadsFor` returns only authored `road` polylines. (Painting trails
as roads produced blunt path stubs in the middle of fields.)

### Plateau massing

The field is a plateau, not a slab:

- An **annulus of shadow** just outside the walkable bounds, as two even-odd
  rounded-rect fills (darkest at the lip).
- **Dashed rim light** along the lip: short seeded line segments, so the edge
  looks eroded rather than outlined.
- A **boulder ring**: 42 seeded crag/boulder props on the rim, added to the
  scenery list so they sort in depth and cast contact shadows.
- A **treeline**: a deepening shadow wash plus overlapping canopy lobes that
  thicken with distance, with a few crisp leaves on top for bite. Density is
  suppressed for the first ~3 units outside the bounds so the hunting ground keeps
  a clean rim.

### Props

`propScale(id, scale) = 0.7 * PROP_FACTOR[id] * scale`; a hero is about 1.1–1.2
world units. Contact shadows are tight — `wUnits * 0.34` wide, 0.26 alpha, gone
within about a metre. Large soft ellipses under props read as smudges on a painted
field, so they are deliberately small.

### Performance

Chunks paint roughly twice their diamond area, which is the price of seamlessness.
Measured single-chunk paint is about 2–4 ms. The wide-zoom overview is a **two
tier** painting: a cheap tier (coarser cells, flat blobs instead of gradients,
no decals) is available on the first frame, and the detailed tier replaces it on
the next frame without ever blocking input.

## Validation

- Painter purity: paint the same world rect into two canvases whose origins sit at
  different world points, then compare shared world pixels. Maximum channel
  difference should be single digits (anti-aliasing only). A large difference means
  a seam.
- `softTileArea` in isolation: call it under a plain `setTransform(20,0,0,20,...)`
  and under the isometric projection, and check the patch is a ragged blob with a
  feathered rim in both.
- `npm test`, `npm run check`, `python3 scripts/import_assets.py --verify`,
  `npm run build`.
- Visual sweep: all six maps at fit zoom and at gameplay zoom, plus close crops of
  the road edge, the waterline, the bridge and the rim.

## Known gaps

- Tree and hero scale still need a pass; some props read large next to monsters.
- The minimap overlay styling is unthemed compared with the field.
- Only meadow, forest and payon have derived water crossings, because only they
  have streams.

# Larger fields with seamless terrain

## Starting point

The current game renders angled, sprite-based fields with Canvas 2D. It already has map-specific bounds, an 8-world-unit terrain chunk size, a 160-entry terrain cache, map markers and concurrent off-camera simulation. Current South Prontera bounds are ±42 by ±32 world units. South Prontera is the best pilot because it has authored landmarks, roads and two independently useful hunting areas. The previous HD texture import was reverted in commit d3e687e. Use the current asset manifest as the input inventory.

Ragnarok Origin is the visual reference for continuous roads, layered scenery, terrain variety and landmark readability. Build an original composition with assets the project has permission to use. Inspect the existing Prontera-Grind terrain palette and anchors first. Record the source, version, source path, rights or permission and hash for each approved addition. Paint or commission missing transition sets.

- [Ragnarok Origin game introduction](https://roo-global.gitbook.io/guide/game-introduction)
- [Gravity’s Ragnarok series overview](https://img.gravity.co.kr/GravityUpload/0000/2026/02/13/Gravity%20IR%20Presentation_2025_4Q_EN.pdf)
- [Prontera-Grind terrain source](https://github.com/KzeR7/Prontera-Grind/tree/f47bf27e3092c385ba050da1cdb2fde4176f5183/Updates/map-sprites-v2/work)

## Use the atlas as the content plan

[Atlas data](../src/atlas.js) records the six regions and their destination IDs,
recommended levels, encounter types and map-building hooks. The browser decides
playability from [the runtime map registry](../src/data.js). Keep planned entries
out of runtime saves, deployment and encounter simulation until their terrain,
spawn groups and starting positions are ready.

Location names follow Ragnarok Online. The level bands and encounter notes
are Ragna Tactics design targets. The atlas groups nearby locations for browsing.
The early fields and boss locations draw on Gravity's world and monster guides.
Later destinations include locations listed in the official Eden Group guides.

- [Gravity’s regional map index](https://ro.gnjoy.com/guide/runemidgarts/maparea.asp?mapSeq=291&parentMapSeq=157)
- [iRO classic location names](https://renewal.playragnarok.com/news/newslist.aspx/1000?page=172)
- [Gravity’s Baphomet entry](https://ro.gnjoy.com/guide/runemidgarts/popup/monsterview.asp?monsterID=BAPHOMET) and [Phreeoni entry](https://ro.gnjoy.com/guide/runemidgarts/popup/monsterview.asp?monsterID=PHREEONI)
- [iRO Eden Group quests](https://playragnarok.com/news/updatedetail.aspx?id=246) and [late-game hunting areas](https://renewal.playragnarok.com/news/eventdetail.aspx?id=104&p=37)

After the South Prontera pilot, build **Prontera Culvert** first. Use its
water channels to exercise bank transitions and short hunting loops. Follow
with **Sunken Ship** for prop layering and **Ant Hell** for separate party
routes with clear regrouping points.
For each release, use the atlas ID in the map registry, add the corresponding
save migration and validate deployment, minimap markers, combat rewards and
offline progression. Progression above Lv. 99 also needs an EXP curve, stat and
save validation, item availability and encounter tuning before those ranges
are playable.

## Build the art and map pipeline

1. Create a South Prontera test strip with three transitions: grass to dirt, grass to shoreline and cliff to grass. Keep the current projection and existing character scale. Author edge and corner combinations in one mixed Terrain Set. Check straight edges, inner and outer corners, three-way joins, river bends and road forks. Give base tiles several compatible variants and put low-frequency color variation and sparse decals on a separate layer. Avoid baking shadows into every ground tile. [Tiled Terrain Sets](https://doc.mapeditor.org/en/latest/manual/terrain/)
2. Author a low-frequency map layout around the camp, meadow and thicket. Add landmarks you can spot at the widest camera zoom, such as a river bend and a trail crossing. Use an isometric Tiled map and name layers Ground, Transitions, Decals, Props and Gameplay. Store prop feet/anchors and sortable object positions. In Gameplay, place named spawn areas, deployment points, exit and rally anchors. Keep world coordinates and stable existing IDs. [Tiled map orientations](https://doc.mapeditor.org/en/latest/manual/maps/)
3. Export versioned JSON through a build-time converter. Validate tile IDs, map bounds, atlas dimensions, prop anchors and unique IDs. The converter should emit a map manifest, small chunk records and a lightweight map overview. Use an infinite editor canvas if useful and export explicit playable limits. Preserve negative chunk coordinates. Decode any Tiled GID transform flags if the converter accepts flipped or rotated tiles. [Tiled infinite maps](https://doc.mapeditor.org/en/latest/manual/using-infinite-maps/) · [Tiled JSON format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)
4. Test around a 128×96 logical-tile pilot as an authoring target. Scale only after confirming travel time and hunting density. Keep rivers, cliffs and large props decorative until a walkability layer and pathfinding exist. For blocking terrain, derive the navigation grid from the same authored map, validate reachable exits and spawn points, and migrate existing deployed positions to a safe tile when necessary.

## Stream the visuals

- The current renderer builds up to four missing detailed chunks per frame, closest first, over a cached map overview. For authored terrain, choose 16×16 tile chunks as the first benchmark. Convert the four viewport corners into world coordinates using the existing inverse projection. Add overscan for tall props and include one neighboring ring. Queue missing chunks in distance order, draw a low-detail ground fallback until each is ready, and build only a bounded amount per animation frame. Profile worker rasterization with OffscreenCanvas if main-thread work still produces frame spikes. Keep a main-thread fallback.
- Composite ground and transitions into cached chunk images at a consistent pixel density. Use shared world-space boundaries and bleed/gutters at sampled texture borders. Publish the same tile seed across adjacent chunks so edge choices and variants match. Sort visible tall props and units together by projected foot position.
- Budget by actual decoded bytes and pin the current visible set. At full zoom-out use a baked overview terrain layer so a large map cannot thrash the detailed cache. Cancel obsolete prefetch on map switch. Keep simulation, RNG, saving and monster respawns independent of chunk state.
- Test at several device pixel ratios and fractional zoom levels. Pan slowly across seams and quickly across unloaded edges on desktop and a phone. Record cold time to first usable frame, p95 frame interval during panning, worst chunk-build time and cache bytes. Initial target: p95 below 33 ms on the chosen phone and no blank foreground during travel.

[MDN Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) · [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)

## Keep the party easy to find

The compact minimap and expandable overview share the field projection. Extend both using a baked terrain thumbnail, roads, bridges, zone outlines, camp exits, persistent roster numbers, selected-unit rings and current camera footprint. Keep marker colors readable over water and grass. Add a keyboard-accessible roster jump to each adventurer, including those on another field. Clicking terrain should move the camera, with gameplay movement still issued from the command bar. Test the overview on a 390×844 viewport, after save/load and while a second team continues farming off camera.

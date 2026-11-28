# Milestone handoff — 2026-11-27

## South Prontera expedition map and single-screen interface

Deploy adventurers to South Prontera. Its camp exit leads to the Poring Meadow and
the separate Fabre Thicket. Click the minimap or press Find to reach an adventurer.
Pan by dragging, zoom with the buttons or the wheel, and right-click ground to move.
Set a hunting area per character (Hunt area or Centre on unit). Choosing a map
or hunting area changes where the character farms, and the camera never pauses
or changes other teams' results.

Desktop keeps the roster, map switcher and command bar on screen. Equipment, jobs,
stats, storage, bounties and the field guide open as panels. Phones use roster
portraits, a horizontal map strip and bottom sheets. Panels keep selection and
camera position when they open and close. Reduced-motion users get no panel or
order animation.

Rules to keep: redeploying starts a fresh expedition and clears the old hunting area.
Redeploying or switching maps while in a fight is refused; retreat to camp first.
Terrain is decorative and has no collision yet. The chunk cache is bounded at 96 and
must stay at least as large as the largest map's full-view chunk count (meadow ≈63).

Open gaps: no authored South Prontera layout exists upstream, so the layout is
procedural. Other terrain families (sand, water, cliff, bridge) are unimported. There
is no navigation or collision model. The Eddga import is not present in this
workspace, and the Endless Tower task in NEXT-AGENT.md is now deferred.

## Transcendent jobs

At second Job Lv. 50, advance at camp to Lord Knight, High Priest, High Wizard,
Whitesmith, Sniper or Assassin Cross. This direct advancement keeps Base level,
personal attributes, prepared elements, gear, cards and refinement. Each line
has native male and female body art and an upgraded combat specialty.

## Equipment refinement

Open Equipment at camp with field gear equipped. Each successful refinement adds
2 attack and 1 defense, up to +3. Emveretarcon drops from Zombies and Archer
Skeletons. Stored gear keeps its rank when a card is added, removed or replaced.
The inventory groups identical item, card and rank combinations.

## Payon Cave

Hunt slow Zombies and ranged Archer Skeletons. Acolytes and Priests can prepare
Holy Light or Magnus Exorcismus at camp and return to their healing spell there.
The guild board offers a skeleton hunt. Skel-Bones, Decayed Nails and Peco
Feathers forge a socketable Payon reliquary. Archer Skeleton Cards grant +8 ATK.

## Elemental magic and field guide

Mages and Wizards prepare Fire, Water, Wind or Earth magic at camp using their
Spellbook. Each enemy hit uses its own affinity, including splash targets.
The Field guide lists habitats, weaknesses and drops and opens each map.

The Caravan brooch is a socketable forge recipe combining Scorpion Tails, Peco Feathers, and Willow Resin.

## Guild bounty board

Open Bounties under Field Notes. A guild can accept one repeatable hunt for
Porings, Willows or Scorpions. Matching kills count on and off camera and
offline. Claim the finished hunt at the board for Zeny and equipment.

## Character builds

Open Stats on one adventurer. Each earned Base level grants two points, including
levels in older saves. At camp, preview and train STR, AGI, VIT, INT, DEX and LUK.
The simulation uses the bonuses live and offline. Job changes preserve them.

## Sandsea Hollow MVP

Deploy two first-job or higher adventurers for Phreeoni. During Sand Pact,
gather in the blue circle around the marked ally to divide damage. Leave
the red circle during Sinkhole. A live clear awards the Phreeoni Card.
Both boss expeditions recall their teams offline. Baphomet keeps its own
progression and roster unlocks.

## Morroc Dunes and card builds

Scorpions and Peco Pecos drop attack and defense cards. A character can socket
one card into equipped non-training gear at camp. Unequipping stores the gear
with its card attached. Shared storage shows both species and their bonuses.
Old v1 guilds receive the new field and empty card storage on load.
Read NEXT-AGENT.md for the continuation prompt.

## Second jobs and forging

At first Job Lv. 40, use Job path at camp to become a Knight, Wizard, Hunter,
Priest, Blacksmith, or Assassin. Each has its native wardrobe and a combat skill.
Shared storage contains forge recipes for Iron armaments and Guard insignias.
A living Blacksmith at camp halves the Zeny fee.

Next content milestone: build a new farming field with original monsters, a
collectible monster card, and a camp slotting interface.

## Hunt area controls

Open Hunt area on a farming field. Choose a radius of 3, 6, or 10 world units.
Hover to preview and tap/click to mark the centre, or activate Centre on unit
to use the first selected adventurer on this field. Farm resumes the saved
area after a manual order. The original default is 6. Browser tests now launch a
dedicated checkout-specific server to avoid picking up another worktree.

Additional playtest: play the first expedition through third recruitment using fresh
guilds, measure starter pair performance and fix the most consequential friction.
Use the manual gameplay gate in TESTING.md.

## Combat reliability, first expedition goals, and browser QA

Basic attack and skill damage now revalidates map identity and actual attack range at
resolution. Target locks, leader assistance, Hold/focus and farm-radius behavior respect
their intended hunting boundaries; valid leader targets take precedence over stale
follower locks while farming. Movement/ranged kiting is clamped to field bounds, manual
movement finishes before automatic retreat, and linked members recover without chasing
a retreating leader. Regression cases exercise these rules.

The expedition panel now tracks six ordered goals: deploy the starting Novices, reach
Novice Job Lv. 10, choose both first jobs, prepare a party and supplies, defeat Baphomet,
and recruit the third Novice. Progress is derived from existing game state where
possible, advances monotonically, and remains backward compatible with v1 saves.

Feedback and controls include tactical-order pressed states, clearer party/leader and
selection cues, health/supply/defeat attention, boss cast/safe-area guidance, and job /
recruitment success feedback. The tactics editor preserves focus/state across live UI
refreshes; retreat thresholds can use 1% increments so saved presets are representable.

## South Prontera terrain pilot (terrain + skills milestone)

The first seamless terrain pilot lands in South Prontera on the existing `meadow`
map, at the angled camera and sprite scale. Terrain art is **imported original** from
`KzeR7/Prontera-Grind` PR #8 ("Map Kit v2"), pinned to commit
`f47bf27e3092c385ba050da1cdb2fde4176f5183` and recorded in
`public/assets/provenance.json`; `npm run assets:verify` passes (119 files: 11 terrain
tiles + 16 props). Props draw at their native scale and anchors from the upstream
`_anchors.json`; pixels, layers and animation are untouched.

The layout is authored in `assets-src/south-prontera.tmj` (Tiled 1.15 isometric,
21×16, cell 4, origin (-42,-32)) with an accent tile layer and four object layers
(roads, shoreline, zones, landmarks). `scripts/convert-terrain.mjs` is a small
deterministic build-time converter that bakes it into
`public/assets/terrain/south-prontera.json` and registers it in `index.json`;
`scripts/build.mjs` runs it on every build. **Visual layout and gameplay data stay
separate** — terrain is decorative with no collision.

South Prontera ships: a branching road network from the camp exit (`road-camp`,
`road-east`, `road-west`), a 7-segment shoreline with water/frame/bank tiles, two
hunting districts (**Poring Meadow** and **Fabre Thicket**), and 8 readable
landmarks (torii gate, shrine stone, cherry/ancient trees, red arch bridge, pier and
river-stone posts, house ruin). Rendering is detail-on-approach: `detailLevel()`
returns full / tiles-only / overview, the chunk cache is a bounded LRU with
visible-set pinning, and `prefetch()` loads nearby chunks. The minimap gains
shoreline, zones, roads, landmarks and a direct jump to every roster member.
Camp, spawn, retreat and assignment paths are proven to survive migration by
`tests/sim.test.js`.

**Skills (vertical slice).** `SKILLS` is a learnable per-job-line catalog; the full
**Swordsman** line is the complete slice (Bash → Power Strike → Brandish Spear →
Pierce → Spiral Pierce); other jobs carry a signature skill at rank 1. `sim.js`
exposes `skill-learn` and `loadout` commands; `stats()` reports `cost`, `cooldown`
and `skillPower`; each character carries `skills`, `loadout` and `loadoutMode`
(auto/manual). `persistence.js` validates and migrates these (save schema still v1,
never silently discards unreadable saves, equipment instance IDs preserved). The
**Skills page** UI renders per-skill learn/activate buttons, ranks, unlock levels, a
loadout-mode selector and live skill power. Promoting to a new job line resets
skills and rebuilds the loadout from the new line's signature skill; transcendent
jobs (e.g. High Wizard) resolve their mastery line so the default loadout validates.

## Verification — executed 2026-11-27

- `npm run check` — passed (8 modules).
- `npm test` — passed (45/45 simulation and persistence tests).
- `npm run assets:verify` — passed (38 original asset files).
- `npm run test:browser` — passed (14/14 desktop Chromium scenarios, including narrow
  viewport, touch, reduced motion, keyboard, tactics/presets, party operations, tactical
  orders, world navigation, job advancement, recruitment, legacy saves, and offline flow).
- `npm run build` — passed.
- `npm run test:build` — passed: exported site boots with two Novices, local assets,
  and no failed requests/runtime errors.
- Refreshed desktop, mobile-width, boss, world-overview, and job-choice screenshots were
  visually inspected in `artifacts/`.

Browser Chromium used the temporary `/tmp/chromium` binary with the `AWS_LAMBDA_JS_RUNTIME`
and `LD_LIBRARY_PATH` environment settings; this did not change package manifests.

## Verification — executed 2026-11-28 (terrain pilot + skills)

- `npm run check` — passed (9 modules).
- `npm test` — passed (82/82 simulation, persistence, data, builds and renewal tests),
  including South Prontera terrain migration invariants and Swordsman skill
  learn/power/loadout round-trips.
- `npm run assets:verify` — passed (119 original asset files; 11 terrain tiles + 16 props).
- `npm run build` — passed; the baked terrain layout ships in `dist/assets/terrain/`.
- `npm run test:build` — passed: exported site boots with two Novices, local assets,
  and no failed requests/runtime errors.
- `npm run test:browser` — 22/29 pass; the 7 failures are **pre-existing on the
  baseline** (identical failure set to the unmodified PR #6 merge, confirmed by stash
  comparison): job-choice preview count, tactics presets reload, world navigation,
  tab-switch catch-up, Morroc card socketing, guild-split settlement, and refine
  modal. No new regressions were introduced.
- Screenshots captured in `artifacts/`: `terrain-desktop.png`, `terrain-overview.png`,
  `terrain-closeup.png`, `terrain-phone.png`, `skills-page.png`, `skills-desktop.png`.
  Cold-load and pan metrics in `artifacts/metrics.json`: cold load ≈448 ms, pan
  ≈59 fps, no console/page errors.
- Browser Chromium used the temporary `/tmp/chromium` binary (from
  `@sparticuz/chromium`) with `LD_LIBRARY_PATH=/tmp/al2023/lib` for the bundled NSS/NSPR
  libraries and `PLAYWRIGHT_CHROMIUM_PATH=/tmp/chromium`; package manifests were not
  changed. `scripts/capture-shots.mjs` records this capture path.

## Start and limitations

Read `AGENTS.md`, `docs/GAME-DIRECTION.md`, `docs/ARCHITECTURE.md`,
`docs/MAP-RESEARCH.md`, `docs/MMO-FEATURE-GAPS.md`, and `docs/TESTING.md`. Run
`npm ci && npm start`; the local preview binds to `0.0.0.0:5173` for Arena preview.
The PR #6 merge remains the baseline for this work.

The automated browser run is desktop Chromium with narrow-viewport and input-mode
scenarios, not physical-device or full multi-browser verification. A complete
unscripted playthrough and final balance tuning remain manual follow-up. There is no
collision/pathfinding system, multiplayer server, or authoritative online save model.
Keep original sprite pixels/metadata, versioned-save and inventory-count invariants,
concurrent farming, four-hour offline cap, and explicit owner/command boundaries intact.

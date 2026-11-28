# Milestone handoff — 2026-11-28

## Art and the equipment economy

Every one of the 59 jobs now draws its own native client body in both genders:
the shipped wardrobe covers Novice → transcendent, and `public/assets/wardrobe/classes/`
(`scripts/import_class_sprites.py`, indexed as `classWardrobe`) covers the other 40,
including the 4th jobs and the Doram line. Skill icons (161) and item icons (524) are
genuine client art as well, so nothing on screen is a drawn stand-in any more.

Equipment is no longer a handful of prototypes: `src/gear-catalog.json` holds 524
icon-backed weapons and armour with real renewal stats, and the guild camp's merchant
sells a 122-key cross-section of it, grouped by level band. Buying runs through
`{type:'gear-buy', item:<key>}`; the price is `sim.shopPrice(key)`, derived from the
item's own shop value. `src/gear-catalog.json` and `src/gear-shop.json` are generated
by `scripts/build_gear_catalog.py` from rAthena's pinned item database (fetched on
demand, never committed) — edit the script's curation rules, never the JSON.

Each class also draws the weapon it actually holds. The client keeps a weapon sprite per
class per weapon type and only animates it during an attack motion, so
`public/assets/wardrobe/classes/` carries attack-only overlay atlases
(`weapon-<job>-<sex>-<family>`, 182 client sets pinned in
`scripts/class-weapon-pins.json`). `src/sprites.js` picks the overlay and the body's swing
motion from the equipped item's real `kind`, so a Crusader swings a sword, a Sage a book,
a Gunslinger a revolver, and a Monk punches. Classes without art for the exact type fall
back the way the client does (two-hander → sword, katar → dagger, …).

Gear sets work the same way: the five sets in `src/gear-sets.json` are real RO item
combinations lifted from rAthena's `item_combos.yml` by `scripts/build_gear_sets.py`
(pinned commit + SHA-256, fetched into `db/` on demand). A set activates only while every
piece is worn and any refinement gate in the upstream script is met; `sim.activeGearSets()`
decides, `stats()` applies the bonus, the merchant marks the pieces and the equipment sheet
lists active and partial sets. The merchant now stocks every set piece, so each set is
completable. Only bonuses the stat model can honour are kept — the generator drops the rest
rather than approximating them, which is why the Fallen Angel and Rider combinations (their
only effects are resistances and recovery this game does not model) are absent.

Next: refine UX around the new catalog, and the merchant's restock/inflation curve.

## Character skills and skill FX

Skills are trained in the Character panel → **Skills** page. Each class family has
its own catalog (`SKILLS` in `src/data.js`); every skill has ranks that unlock at
job levels. Training is camp-only, one rank per command (`skill-learn`), and the
player picks which learned skill casts (`skill-active`). A promotion wipes ranks
and starts the new line with its rank-1 signature skill, so nobody is ever left
without a cast.

Rules to keep: strikes hit one target, area skills sweep at most three foes and
stagger them, heals take the most wounded allies, buffs refresh rather than spam.
Learned ranks add damage to the trained skill only (`stats(c).skillPower`) so the
existing build rotation maths stay stable. Skill presentation is `SKILLS[id].fx`
→ `Renderer.drawSkillFx`, and the simulation copies that id onto `effect.fx`;
`tests/fx.test.js` fails if a catalog entry names a flourish the renderer cannot
draw. Modal/page markup for skills lives in `src/skills-ui.js` so it can be
tested without a DOM.

Next: expand the catalogs for the expanded lines (taekwon, ninja, gunslinger,
doram) and add a monster-side skill FX set for boss casts.

## World atlas and combat presentation

Open **World atlas** above the playable quick links or from the deployment picker.
The atlas groups 27 destinations across six regions. Recommended level filtering
includes any destination whose range overlaps the chosen band. A playable map
opens the field view or preselects a deployment destination. Planned cards show
the biome, encounter type and design hook. The expedition still needs confirmation
to deploy. The implemented base-level cap is 99.

Use the stable destination IDs and [map pipeline](MAP-RESEARCH.md) for future
maps. Start with the existing South Prontera terrain pilot, then use Prontera
Culvert to exercise a new dungeon and verify the transition from planning to play.

Combat settings remember all hits, highlights, or hidden text in this browser.
Camera shake is optional, defaults off and observes reduced motion. Automatic
casts hold position until resolution or interruption. The renderer interpolates
positions between simulation ticks, caches a ground overview for wide zoom and
prepares nearby detailed terrain chunks as the camera moves in.

## Independent adventurer controls

See ADVENTURER-WORKFLOW.md for the main-bar workspace, individual field orders,
per-character hotbar and cards on Renewal equipment instances.

## Character management and monitoring

Select one adventurer and use Character in the main bar. The sheet groups live
vitals, equipment, skill/build controls, attributes and job advancement.
The Skills page can toggle automatic skill use for this adventurer independently.
World Overview now has live field, adventurer and alert views, with actions
to locate or manage a unit. Expand the minimap for an overview and roster jumps.

The next map milestone is described in MAP-RESEARCH.md and NEXT-AGENT.md.
MMO-FEATURE-GAPS.md records the current comparison with Renewal and Origin.

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
Terrain is decorative and has no collision yet. Detailed chunks use a 160-entry
cache. The wide view uses a separate three-map overview cache.

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

## Sograt Desert · Phreeoni MVP

Deploy two first-job or higher adventurers for Phreeoni. During Sand Pact,
gather in the blue circle around the marked ally to divide damage. Leave
the red circle during Sinkhole. A live clear awards the Phreeoni Card.
Both boss expeditions recall their teams offline. Baphomet keeps its own
progression and roster unlocks.

## Sograt Desert and card builds

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

## Start and limitations

Read `AGENTS.md`, `docs/GAME-DIRECTION.md`, `docs/ARCHITECTURE.md`, and
`docs/TESTING.md`. Run `npm ci && npm start`; the local preview binds to
`0.0.0.0:5173` for Arena preview. The PR #2 head remains the baseline for this work.

The automated browser run is desktop Chromium with narrow-viewport and input-mode
scenarios, not physical-device or full multi-browser verification. A complete
unscripted playthrough and final balance tuning remain manual follow-up. There is no
collision/pathfinding system, multiplayer server, or authoritative online save model.
Keep original sprite pixels/metadata, versioned-save and inventory-count invariants,
concurrent farming, four-hour offline cap, and explicit owner/command boundaries intact.

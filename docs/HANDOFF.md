# Milestone handoff — 2026-11-27

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

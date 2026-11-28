# Ragna Tactics — start here

This is a new game, not a rewrite of Prontera-Grind. Keep its identity: a player
manages a small guild of persistent adventurers, farming several maps at once,
then brings them together for tactical boss encounters.

## First five minutes

1. Read [Game direction](docs/GAME-DIRECTION.md). It separates confirmed owner
   decisions from provisional foundation rules.
2. Read [Handoff](docs/HANDOFF.md) for what actually works and the next task.
3. Read [Architecture](docs/ARCHITECTURE.md) before changing simulation or saves.
4. Check `git status --short`. Preserve unrelated edits. Work on a scoped
   `codex/` branch or the branch requested by the owner.
5. Use [Testing](docs/TESTING.md) for the affected checks and browser preview.

## Non-negotiable product direction

- Start with **two Novices**. Unlock additional characters up to **five**.
- Every character starts as a Novice, including later recruits. The player chooses
  each character's job progression; do not replace this with starting-job selection.
- Automatic farming plus direct movement, target, and skill commands.
- Characters may party together or farm independently on different maps.
- **Every deployed map progresses independently of the camera.**
- Instant deployment through management controls. Boss combat is real-time.
- Angled overhead presentation with a wide, adjustable zoom.
- Offline farming caps at **four elapsed hours**, applied concurrently to all
  deployed farming teams. The cap is not four hours per login, per reward claim,
  or a pool divided among characters.
- Multiplayer is a required future phase. It is **not implemented yet**. Retain
  explicit ownership and a clean command boundary; do not claim client saves or
  deterministic simulation provide multiplayer security.

## Boundaries to preserve

- `src/sim.js` is DOM-free. No canvas, localStorage, network, `Date.now()`, or
  unseeded randomness inside it. Rules live here, never duplicated in the renderer.
- UI submits `command(state, command)`; only the app owns the live simulation.
  New gameplay commands must validate their inputs and get meaningful tests. Per-
  character tactics are saved in v1 and old saves receive preset-derived defaults.
  Keep role positioning, party leader behavior, and offline/live automation in sim.
- `src/data.js` contains content and tuning. Keep stable character/job/item/map IDs.
- Keep offline and live combat on the same simulation rules. Bosses are active-only
  in this foundation; no offline boss payouts. Keep settlement in a worker.
- Save schema version 1 is already in use. Add explicit migrations for incompatible
  changes. Never silently discard an unreadable save. Preserve item quantities and
  ownership during equipment changes, imports, and class changes.
- One tab owns the guild through a Web Lock. Hidden-tab closure must retain the
  last simulated checkpoint time. Do not reintroduce duplicate offline claims or
  multi-tab writers.
- Use the existing local character/monster sprites. Preserve their pixels, native
  layers, directions, anchors, relative proportions, and animation delays. Do not
  generate substitute art, tint bodies, guess frame counts, or flatten animations.
  Read [Asset credits](ASSET-CREDITS.md); verify with `npm run assets:verify`.
- The imported `source-catalog.json` files are provenance, not content rosters to
  expose automatically. `public/assets/index.json` is the supported runtime subset.
- Every job must keep its own native body in both genders: the shipped wardrobe covers
  19 jobs, `public/assets/wardrobe/classes/` (built by `scripts/import_class_sprites.py`,
  indexed under `classWardrobe`) covers the other 40. Never point a class at a parent's
  outfit to fill a gap; `tests/assets.test.js` fails if one is missing.
- Skill and item icons are genuine client art. Do not reintroduce drawn placeholders,
  and do not add shop stock without a real `equipment-icons/<roId>.png`.
- Weapon art is the client's own per-class weapon sprite, shipped as attack-only overlays
  (`weapon-<job>-<sex>-<family>`) because that is the only motion the client animates a
  held weapon on. `scripts/class-weapon-pins.json` is the pinned manifest; never draw a
  weapon by hand or bake one class's weapon into another class's body.
- `db/item_db_equip.yml` and `db/item_combos.yml` are fetched on demand and are not
  committed; `src/gear-catalog.json`, `src/gear-shop.json` and `src/gear-sets.json` are
  generated, never hand-edited, and `npm run assets:verify` fails if they drift from the
  pinned source. Gear sets must come from rAthena's own combinations: never invent a set
  or a house-rule bonus, and drop a bonus the stat model cannot honour rather than
  approximating it (`tests/sets.test.js`).
- Terrain is decorative scenery with no collision. Imported tiles and props
  (`public/assets/terrain/`, listed in `index.json` terrain) are drawn at native
  scale and anchors. Do not add invisible obstacles. Add a tested navigation model
  before introducing blocking terrain.
- No production backend, paid services, accounts, or deployment are configured.
  Avoid importing the old game's account/shop/social infrastructure into this game.

## Work and handoff

Keep changes focused. Do not add a framework or replace the working app shell as
part of unrelated gameplay work. The runtime currently needs no dependencies.
Playwright is a development dependency only.

Run affected tests while developing. Before a handoff, run `npm run check`,
`npm test`, `npm run assets:verify`, and `npm run build`; run `npm run smoke`
(needs `npm run dev` running) and `npm run test:browser`
for interface, startup, save lifecycle, rendering, or worker changes. A skipped
browser run is not a pass. Inspect screenshots after visual changes.

Update the relevant guide and append an entry to [Changelog](docs/CHANGELOG.md).
Update Handoff when the next starting point changes. Report only verified actions,
test results, and delivery status. Follow the current user's publication instructions.

The prioritized continuation is in [Roadmap](docs/ROADMAP.md). It is a guide for
choosing a scoped next task, not an instruction to implement all future features.

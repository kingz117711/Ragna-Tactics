# Changelog

## 2026-11-27 — Playable foundation 0.1

- Established the owner-confirmed direction and a root AGENTS.md for continuation.
- Added the independent ES-module simulation, local persistence, offline worker,
  original native sprites, responsive tactical interface, and first playable loop.
- Added two fields, six first jobs, party/solo commands, equipment/storage, and
  a real-time boss that unlocks further Novice recruitment.
- Added pinned asset provenance, offline verification, static build, tests, and a
  CI workflow template. GitHub rejected publishing an active workflow because the
  connected OAuth app lacks the workflow scope; enable the template later using
  a connection with workflow access. Game source delivery does not require it.
- Validation: syntax/import checks, 30 simulation/persistence tests, eight Chromium
  scenarios, and all 38 imported original files verified. Desktop/boss/mobile-width
  screenshots inspected. Static build checked. No multiplayer or production
  hosting is configured.

## 2026-11-27 — Expedition controls

- Added animated button presses, ground-order feedback, and dialog transitions.
  Map and job cards use native monster and class portraits.
- Added hunting areas, automatic party spacing, a persistent job-ready notice,
  and a second real-time boss cast with a safe centre and countdown.
- Offline reports now list equipment and material drops and count each shared kill
  once. Older version-one saves load with unrestricted field assignments.
- Seeded starter parties cleared Baphomet after five simulated minutes of training
  as Swordsman/Acolyte, Archer/Mage, and Thief/Merchant. The new tests exercise
  hunt orders, touch and reduced motion, job selection, ring damage, and reporting.

## 2026-11-27 — Combat reliability, expedition goals, and browser QA

- Prevented remote basic-attack/skill damage by validating map identity and actual
  reach at resolution; tightened Hold/focus/farm leashes and made leader assist
  override stale follower target locks only within the follower's boundary.
- Clamped combat repositioning to the battlefield and clarified manual move versus
  safety-retreat priority and party behavior after retreat/leader defeat.
- Added a six-step first-expedition goals panel with progress and next actions, plus
  backward-compatible save behavior, attention cues, tactical-order feedback, and
  clearer boss/job/recruitment feedback. Retreat threshold controls now represent
  preset values at 1% increments.
- Added simulation, persistence, and browser regressions. Verified 45 unit tests,
  14/14 Chromium scenarios, all 38 original assets, static build, and built-output
  smoke test. Refreshed desktop/mobile-width/boss/world/job screenshots were inspected.
- Remaining coverage limit: no physical-device or full multi-browser verification;
  manual unscripted balance playthrough remains follow-up.

## 2026-11-27 — Party tactics and world management

- Added role-aware positioning, bounded per-character skill/healing/potion/retreat
  thresholds, target preferences, leader assist/failover, and save defaults for
  existing version-one saves. Manual movement remains an explicit override; Farm
  resumes each character's assigned hunting area.
- Added a party roster summary and leader handoff, plus a world overview of map,
  activity, assignment, HP/supplies, direct navigation, and attention events.
- Added sim/persistence/browser regression coverage and updated game/architecture/
  testing/handoff/roadmap guidance. Preview server now binds to all interfaces.
- Verified `npm run check`, `npm test` (39 pass), `npm run assets:verify` (38 files),
  and `npm run build`. Browser tests and screenshots could not run: Playwright's
  Chromium binary is missing and download from `cdn.playwright.dev` was blocked;
  `npm run test:build` is likewise pending a browser-enabled environment.

## 2026-11-27 - Adjustable hunting areas

- Added three hunting radii, a placement preview and a keyboard-accessible centre-on-unit action. Existing marked areas retain their radius after loading.
- Browser tests launch this checkout on a dedicated port. Added party, save, invalid-order and touch/keyboard coverage for the editor.

## Second jobs and Prontera forging

Six second jobs with native sprites and signature skills now unlock at first Job Lv. 40. Added material recipes and a camp Blacksmith discount.

## Morroc Dunes and monster cards

Added a concurrent desert field, native Scorpion and Peco Peco sprites, two collectible cards, camp socketing and card-aware equipment storage. Offline reports include card drops.

## Sandsea Hollow

Added Phreeoni, a new live MVP arena, alternating gather/scatter mechanics, and a guaranteed socketable MVP card.

## Character builds

Added six trainable attributes with previews and permanent stat allocation. Old characters receive their full earned point budget.

## Bounty board

Added three repeatable hunting contracts, shared live and offline guild progress, and explicit reward claims.

## Spells and the monster field guide

Added eight elemental spell loadouts across Mage and Wizard, affinity-based skill damage, native monster portraits, weaknesses and map shortcuts.

Added the Caravan brooch recipe, a cross-region reward for desert and forest materials.

## Payon Cave

Added two native undead monsters, Holy offensive loadouts for support jobs, a repeatable bounty, Archer Skeleton Cards and the Payon reliquary.

## Payon equipment refinement

Added ore drops, three guaranteed refinement ranks, and independent storage of refined and carded gear.

## Transcendent progression

Added six camp promotions with native wardrobes, upgraded combat specialties and preserved caster loadouts.

## 2026-11-27 — Larger South Prontera and single-screen interface

- South Prontera is now a larger field with a camp exit, branching roads, the Poring
  Meadow, and a separate Fabre Thicket. Each map has its own bounds, and hunting
  radius now decides where a character farms.
- Added pan, zoom, Find (cycles through and follows adventurers), a compact minimap
  with party markers, the visible camera area, and click-to-navigate.
- Rebuilt the layout as one screen: the battlefield is largest, the roster, map
  switcher and command bar stay visible on desktop, and equipment, jobs, stats,
  storage, bounties and the field guide open in on-demand panels. Phones use roster
  portraits and bottom sheets. No page scrolling during ordinary play.
- Imported 11 original terrain images (3 tiles, 8 props) and their upstream anchor
  file from the pinned Prontera-Grind commit (103 original files total), with native
  anchors and provenance. See ASSET-CREDITS.md
  for the gaps.
- Rendering: terrain is drawn in cached chunks with a small margin. The cache is a
  bounded LRU of 96 chunks, which covers the whole largest map. Measured on the
  sandbox's headless Chromium: static frame draw 0.4 ms median (141.6 ms before the
  cache fix), and a real mouse pan at 1366×768 held 16.7 ms median, 16.8 ms p99, with
  no frames over 33 ms. Camera movement does not touch the simulation.
- Fixed: the minimap canvas inherited `left/top:0` and sat in the top-left corner.
- Redeploying starts a fresh expedition and clears the previous hunting area.
- Saves from earlier versions still load. Validation is bounds-aware per map.
- Validation: syntax/import checks (8 modules), 61/61 simulation and persistence
  tests, 27 browser scenarios (including a two-area South Prontera playthrough that
  reloads the guild and checks areas, radii, maps and kills), 103 asset files verified,
  static build, and built-site browser check. Screenshots at 1366×768, 1440×900 and
  390×844 were inspected.

## Character management and live monitoring

Added a character sheet, field/roster/alert monitoring, expandable minimap with roster jumps, and the larger-map implementation brief.

## Independent adventurer play

Added a non-modal Character workspace, paper doll with gear deltas and card socketing, stat previews and job advancement. Added individual field orders and a three-slot hotbar with two rankable techniques for each core job family.

## 2026-11-28 — World atlas and combat motion

- Added 27 destinations across six regional groups, with recommended level
  filters through Lv. 150 and a playable-only filter. Destination names reference
  Ragnarok Online locations. Six live destinations
  link to the field viewer and the deployment picker.
- Interpolated unit positions and camera tracking across simulation steps.
  Walking animation keeps its phase through directional changes. The map overview
  renders from first view and detailed terrain chunks load in bounded batches.
- Added attack, skill, critical, incoming and boss damage treatments, a cast
  progress bar and impact accents. Automatic casts hold the unit in place and
  resolve before the next attack. Combat text and optional impact shake are
  display preferences, with reduced motion respected.

## 2026-11-28 — Learnable skills and skill FX

- Added `SKILLS`: a learnable catalog for every class family (Novice through
  Rune Knight, Arch Bishop and the expanded lines). Each skill has multiple
  ranks, a job-level unlock per rank, its own SP cost, cooldown, range, element,
  status and an `fx` flourish id.
- New commands: `skill-learn` (one rank at a time, camp only, job-level gated)
  and `skill-active` (choose which learned skill is cast). Promotion resets
  training and hands over the new line's rank-1 signature skill.
- Learned skills now drive the cast: strikes hit one target, area skills sweep
  at most three and stagger them, heals pick the most wounded allies, buffs
  refresh instead of re-firing. Learned ranks add power to the trained skill
  only, so existing build maths is unchanged.
- Skill FX layer in the renderer: 13 flourishes (arc slash, thrust, blast ring,
  bolt, holy sigil, mending motes, shockwave, wind spiral, venom, frost, spark,
  ward and aura) drawn on the angled ground plane from `effect.fx`, with reduced
  motion respected.
- Skills are now a first-class Character panel page: rank grid with next-rank
  gates, power preview, flourish label and a "cast this" control, shared by the
  Skills modal. `tests/fx.test.js` covers the catalog, the flourish record and
  the markup helpers with a headless canvas recorder.
- Minimap roster jump (carried over from the terrain PR, map art excluded):
  clicking a party marker on the minimap or the expanded overview now selects and
  follows that adventurer; clicking empty ground still moves the camera.
- Save validation: `skills`/`activeSkill` migrate for pre-skill v1 saves, rank
  caps and unknown ids are rejected, and stale ranks from a previous job line are
  dropped rather than failing the whole save.
- Validation: `npm run check` ✅, `npm test` ✅ 95/95, `npm run assets:verify` ✅
  103 files, `npm run build` ✅. Browser verification was added for the Skills
  page flow but could not run here: Playwright's Chromium download is blocked in
  this sandbox.

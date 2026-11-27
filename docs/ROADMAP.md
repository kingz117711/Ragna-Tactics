# Prioritized continuation

The core foundation is playable. Work in small milestones; do not turn this list
into one giant implementation task. Owner-confirmed direction is in GAME-DIRECTION.

## Current milestone: combat reliability, first expedition goals, and browser QA (implemented)

Basic attacks and skills validate map/range at damage resolution; target selection,
leader assist, Hold/focus, and farm radii respect their anchors/leashes. Movement and
ranged repositioning are clamped to the field, manual movement has a predictable
priority over safety automation, and party support/failover behavior is covered by
simulation tests. The UI now includes an ordered six-step first expedition panel with
progress and contextual actions, alongside party/tactics/world-management affordances.

The simulation, persistence, assets, static build, all 14 Chromium browser scenarios,
and built-output browser smoke check passed on 2026-11-27. Desktop and narrow screenshots
were inspected. Physical-device testing and a complete unscripted playthrough remain
manual follow-up; do not claim those were covered.

## Next: polish and tune the first expedition

1. Play a fresh guild through job choice and first boss using the UI, not debug
   grants. Measure farming time, potion usage, class usefulness, and how clearly
   orders/statuses communicate what happened.
2. Tune the introductory boss so positioning adds value without requiring a
   particular starting job pair. Test Swordsman/Acolyte, ranged-heavy, and no-healer
   teams. Acolyte is useful; it must not become a mandatory roster tax.
3. Improve target-facing/attack synchronization and party spacing while retaining
   original animation metadata. Do not edit atlas pixels to solve placement issues.
4. Add a small guided first-job milestone and clearer notifications when a Novice
   reaches Job Lv. 10. Add accessible HP and order explanations where needed.

Acceptance: a new player can deploy/split/reunite their two units, understand job
advancement, choose different jobs, and unlock the third character without consulting
the source. Existing multi-map, reward, and save invariants still pass.

## Then: tactical depth and navigation

- Configurable skill-priority/condition rules with useful presets.
- An explicit farming area/rally point editor and clearly visible leash radius.
- Tested collision/navigation, reachable rally/retreat points, and party spacing.
- Tank threat/taunt behavior, support range discipline, and ranged repositioning.
- Additional boss mechanics that reward orders rather than pure stat increases.

Acceptance: automation is predictable, manual orders override it, and characters
cannot become trapped behind scenery or abandon a party without visible feedback.

## Then: progression and content

- More maps with distinct tactical/resource purposes.
- Second-job trees, thoughtfully scoped skills, and character build experimentation.
- Proper equipment slots, stable item instances, cards, and crafting sinks.
- Better character naming/appearance onboarding using available native art.
- Per-map expedition reports, offline material/equipment summaries, and balance tools.

Acceptance: new content uses data-driven IDs, preserves saves and inventory counts,
and creates real party/solo tradeoffs instead of only bigger numbers.

## Later: multiplayer (required future phase)

First settle mode: cooperative expeditions, shared fields, or both. Then design
accounts, authoritative command validation, rewards, inventory transactions,
reconnect behavior, party ownership, versioning, hosting cost, and online/offline
progression boundaries. Build the smallest working cooperative scenario first.

Do not deploy a full persistent MMO backend merely to demonstrate a networked unit.
Do not synchronize every animation frame. Never accept client-generated loot or
local save timestamps as authoritative online progress.

## Uncommitted ideas

Guild facilities, contracts, pets, markets/trading, social hubs, PvP, seasons,
expansive crafting, and live world events are possible directions, not approved
requirements. Keep them out of unrelated milestones until selected by the owner.

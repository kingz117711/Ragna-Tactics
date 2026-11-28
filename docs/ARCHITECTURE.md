# Architecture and code map

## Runtime

Native browser ES modules, Canvas 2D, and localStorage. No bundler/framework or
runtime network dependency. Development requires Node.js 22+. Playwright is the
only development package. All original art is served locally.

| File | Responsibility |
| --- | --- |
| `src/data.js` | Stable IDs, jobs, playable maps, monster stats, equipment, tuning, save version |
| `src/atlas.js` | Planned destinations, regional groupings and level filters |
| `src/sim.js` | Serializable world, seeded RNG, commands, combat, progression, parties, rewards, offline settlement |
| `src/persistence.js` | Save envelope, schema validation, previous-checkpoint recovery, import/export codec |
| `src/offline-worker.js` | Run capped offline simulation off the UI thread |
| `src/sprites.js` | Load original native atlases/metadata, composite bodies/hair, render monsters |
| `src/renderer.js` | Angled projection, terrain cache, camera, hit testing, health bars, effects |
| `src/app.js` | Own state, writer lock, fixed-step loop, lifecycle, commands, management screens |
| `src/style.css` / `index.html` | Responsive app shell and semantic controls |
| `scripts/serve.mjs` | Local HTTP preview restricted to public runtime paths |
| `scripts/build.mjs` | Portable static output in `dist/` |
| `scripts/import_assets.py` | Pinned source import and offline hash/subset audit |

## Simulation model

`createGame(seed)` produces the entire serializable state. Characters have explicit
`ownerId`, stable `id`, map/party membership, positions, home area, orders, progression,
supplies, and equipment. Parties have independent IDs and leaders. Each map owns
its own monsters and encounter state. Shared inventory and milestone counters are
separate from units. The camera and selection are deliberately absent from saves.

`command(state, payload)` returns `null` on success or a user-readable error. Party
orders expand selected units to linked members; individual build decisions apply
to the explicitly selected character. Movement/focus from the field is scoped to
characters on the visible map. New command handlers belong in this boundary.

`tick(state, dt)` progresses **all maps**, not the map the player is viewing. The
app accumulates real time into 0.1-second steps. Seeded randomness lives in state.
Rendering cannot award rewards or advance timers. Effects carry their map ID.

Commands currently mutate the passed state synchronously. There is no network
transport, authoritative server, command sequence protocol, or anti-cheat layer.
Determinism helps test rules and reuse them later; it does not itself provide trust.
The first-expedition checklist is derived from starter deployments, job levels/choices,
party supplies, boss kills, and roster size. Its saved step is monotonic so completion
survives reloads and older v1 saves can advance without a schema bump.

## Combat/commands

Manual move overrides farming, then becomes hold at the destination. Resume
explicitly restores auto farming and a marked hunting area. Hold acquires nearby
enemies around the held point. Focus prioritizes an enemy. Retreat moves toward the
camp exit. Frontliners close to engage; ranged roles hold a role-specific attack
distance; supports stay with their party and heal within range. Farm target selection
can assist the leader or prioritize nearest/lowest-HP enemies. Followers do not chase
retreating leaders, and an active member takes over if a leader falls. There is no
pathfinding yet; world-space leashes prevent indefinite target chasing.

Automatic skills obey each character's saved auto-skill toggle, cooldown/SP, ranges,
and healing threshold. Potion and retreat thresholds are also per-character HP
fractions. Defaults are derived from the legacy safe/aggressive/conserve preset on
load; valid schema-v1 saves continue using the same envelope/version. Commands validate
tactic keys, types, and bounds in the simulation. Damage and healing are independent
of sprite rendering. Acolytes heal linked allies; solo Acolytes can heal themselves
and attack. Monsters pick nearby targets.
Payon Cave uses the same map simulation and save migration path as Morroc Dunes. The support job spellbook defaults to healing. Preparing Holy magic routes manual and automatic casts through the existing range and elemental damage rules.

Baphomet marks an area 2.5 seconds before Dark Cross resolves and summons adds.
Below half health, Sanctuary Ring marks a band with inner radius 3 and outer
radius 8 for three seconds. Hit checks and projected ring geometry use world units.
The optional farmCenter and farmRadius fields preserve a player's marked hunting
ground through orders and saves. Before each tick the app captures positions of living units on the viewed field.
The renderer interpolates between that snapshot and the current position for draw
order, click targets and camera follow. Movement remains on the fixed-step clock.
The renderer caches a wide-zoom terrain overview and generates up to four missing
detailed chunks per frame at closer zoom. Combat feedback uses screen-space text
and display settings stored separately from the guild save. Gold input pulses
live entirely in the UI layer.

Party kills create one shared EXP pool, not a full reward per unit. Inventory gets
one loot event. Boss rewards have a once-per-encounter guard. Redeploying a new
expedition after the previous party leaves resets the arena encounter.

## Saves and absences

Envelope: `{ format: 'ragna-tactics', version: 1, savedAt, state }`.
Keys: `ragna-tactics:save:v1` and `ragna-tactics:backup:v1`.

The app saves every five seconds, after successful commands, and on lifecycle
events. A valid previous checkpoint is retained. Corrupt primary saves fall back
to it; unrecoverable saves show a recovery/export screen instead of being erased.
Imports are validated and require a deliberate replacement action.

A Web Lock admits one writer per origin. Another tab shows a blocked screen.
The lock covers initial load and offline settlement as well as live saves.

Hiding the tab checkpoints the world and records the last simulated time. Coming
back runs the elapsed interval through the worker, capped at 14,400 seconds.
Closing a hidden tab preserves that checkpoint timestamp. Successful settlement
saves a new timestamp **before** returning control, preventing a second payout
from the same saved interval. Boss teams return to camp before offline ticks.
Negative/future-clock elapsed intervals give no rewards.

Offline combat is exact fixed-step simulation, not a guessed income multiplier.
It can be optimized later only with equivalence tests. It runs in a worker to keep
the loading/report interface responsive.

## Rendering and assets

Ground projection: `screenX = (x-y)*22`, `screenY = (x+y)*11`, then camera pan/zoom.
Sprites remain upright billboards. Native wardrobe layers use catalog anchor
`[160,200]`, original pose coordinates, order, and action delays. Monsters use
their original frame offsets and a common uniform pixel scale. No height matching.
All eight directions are retained. The renderer caches static terrain and portraits.

Terrain is decorative, with no collision grid or pathfinding. Entities can overlap.
Blocking scenery requires a separate navigation/collision milestone. Mobile uses
the same simulation, a stacked interface, explicit additive selection, and tap-to-move.

## Multiplayer seam

Keep these boundaries while working: explicit owner IDs; stable entity IDs;
JSON-safe world state; commands independent of UI; render-only camera; bounded
deterministic ticks. A later server must validate ownership/commands and control
progression, RNG, rewards, save timestamps, reconnects, and persistent transactions.
Client exports cannot be trusted for an online economy. Choose a backend in that
phase after deciding the actual multiplayer mode and expected concurrency.

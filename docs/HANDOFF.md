# Foundation handoff — 2026-11-27

## Expedition controls update

Select deployed characters, choose **Hunt area**, then click or tap a field. Each
selected team hunts within six world units of the marker. **Farm** resumes that
assignment after a manual move. Redeployment opens up the whole field again.
Farming party members give each other space. The roster names every Novice ready
for a job change and links directly to camp. Class choices show their native sprites.

Below half health Baphomet casts Sanctuary Ring around his position at cast start.
Stand inside the clear centre or move beyond the ring before the countdown ends.
Button presses, accepted field orders, and dialogs have motion feedback that follows
the device's reduced-motion preference. Offline reports show inventory gains and
count each enemy once across the guild.

## Start here

Read `AGENTS.md`, then `GAME-DIRECTION.md`. Run `npm start` and play the fresh
two-Novice expedition. Follow `ROADMAP.md` for a scoped next task.

This repo started empty. It now contains an independent playable browser game,
not a fork of the old game's large inline page. Original character/monster assets
were copied from a pinned Prontera-Grind commit. The old game was not modified.

## Working foundation

- Two Novices; six first jobs at Novice Job Lv. 10; independent character builds.
- Two simultaneous farming maps and a separate real-time Baphomet encounter.
- Parties/solo assignments, shared targeting and EXP, basic following, healing,
  automatic skills, potions, safety retreat, and explicit manual overrides.
- Instant safe deployment, physical retreat from combat, camp recovery/resupply.
- Achievement-based recruitment up to five; new characters are always Novices.
- Materials, Zeny, equipment drops, shared storage, count-preserving item transfers.
- Angled overhead canvas, wide zoom, pan/follow, enemy hit testing, marked boss AoE.
- Local save validation, previous checkpoint, export/import, one writer per origin.
- Four-hour offline worker using actual simulation; no offline boss reward.
- Static build, meaningful unit/browser coverage, asset audit, and a CI template.

## Provisional and incomplete

No networking/accounts/server economy, second jobs, real pathfinding, blocking
terrain, full formations, configurable tactics editor, cards, crafting, gear slots,
item-instance affixes, or final tuning. Terrain is procedural prototype scenery.
The skill effects are simple text/indicators; expanded original skill FX are not
imported. All original eight-direction native character/mob animations are available.

The introductory boss is currently forgiving for a Swordsman/Acolyte duo; active
dodging is helpful but not required for that measured build. Improving encounter
balance/readability is the first continuation task, not grounds for rewriting the shell.

Offline reports include kills, currency, levels, supplies, materials, equipment,
and the resulting status of each adventurer.

Local saves are editable and client-clock-based. This is suitable for the current
single-player prototype, not an authoritative online economy. Browser sleep without
a visibility event and broader browser/device coverage need follow-up verification.

## Verification at handoff

The foundation has syntax/import checks, simulation/persistence coverage, eight browser
scenarios, original-asset verification, and a portable static build. Exact final
counts/results are recorded in CHANGELOG. Desktop, boss, and narrow-screen screenshots
are produced by browser tests and were visually inspected during implementation.

## Suggested next-agent task

> Read AGENTS.md, GAME-DIRECTION.md, ARCHITECTURE.md, and TESTING.md. Keep the agreed
> two-to-five Novice roster, concurrent-map simulation, real-time bosses, original
> sprites, and four-hour offline cap. Play and improve the fresh-guild → first-job
> → introductory-boss loop. Focus on support positioning and compare how well new
> players understand moving into the safe centre of Sanctuary Ring. Choose a small
> measurable slice, preserve saves, run the relevant checks, inspect browser output,
> and update Handoff/Changelog. Do not begin multiplayer or a framework rewrite as
> part of this task.

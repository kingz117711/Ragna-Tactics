# Foundation handoff — 2026-11-27

## Party tactics and world management milestone

Character automation now has frontline, ranged, and support positioning, bounded
per-adventurer skill/healing/potion/retreat/target settings, leader assist, and safe
leader failover. Manual Move remains higher priority than ordinary automation; Farm
returns to the character's hunting assignment. Old version-one saves receive defaults
from their existing tactic preset without changing the save envelope or owner IDs.

The roster now includes a party summary with members/leaders and a leader-change
action. The World overview groups deployed characters by map, shows assignment,
HP/supplies and activity state, links directly to a map/character, and surfaces
recovery, empty-supply, and job-advancement attention items.

## Start here

Read `AGENTS.md`, `docs/GAME-DIRECTION.md`, `docs/ARCHITECTURE.md`, and
`docs/TESTING.md`. Run `npm ci && npm start`, then play the UI. The local preview
server binds to `0.0.0.0:5173` for Arena browser preview.

## Working foundation

- Two Novices, six first jobs, recruitment to five, and live progression.
- Concurrent farming maps, real-time Baphomet arena, hunting areas, direct orders,
  parties/solo assignments, party EXP, equipment/storage, and offline settlement.
- Positioning roles: frontline closes, ranged classes hold distance, and support
  follows/assists the active party without pursuing a retreating leader indefinitely.
- Tactics settings: automatic skills, heal/potion/retreat HP fractions, and target
  preference (nearest, lowest HP, or leader assist). Presets establish defaults.
- Party member/leader overview and world deployment/attention overview in UI.
- Local save validation and prior checkpoint, export/import, single writer, and
  four-hour shared offline cap. Offline uses the same rules as live farming.
- Original sprite pixels, metadata, anchors, layers, and directions remain intact.

## Verification status for this milestone

Verified: `npm run check`, `npm test` (39 passing sim/persistence tests),
`npm run assets:verify` (38 original files), and `npm run build`.
The new Playwright scenario is added, but `npm run test:browser` could not launch:
Chromium is absent in the environment, and `npx playwright install chromium` was
blocked while connecting to `cdn.playwright.dev`. Therefore browser screenshots,
interactive UI behavior, and `npm run test:build` remain unverified here. Once a
Chromium executable is available, run the complete browser suite, inspect desktop
and narrow screenshots, and fix any UI regressions before treating this milestone
as fully verified.

## Provisional choices and limitations

- Retreat at 0% disables automatic retreat; other thresholds are 0–95% and are
  interpreted as fractions of each character's current maximum HP.
- Support tries to remain near the party leader and attack/heal at its current
  world-space distances. There is no collision/pathfinding system yet.
- Party restructuring still requires deployed members to be on the same map and
  out of combat. Explicit deployments remain instant from the management dialog.
- The base preset remains a small rule set, not a general priority scripting editor.
- Local saves and timestamps are client-side; there is no multiplayer/auth server.

## Suggested next-agent task

> Get Chromium-enabled browser checks running; manually inspect the new party/tactics/
> world overview controls at desktop and phone widths, including touch selection and
> save/reload. Fix any failures, then measure each role's potion/retreat behavior in
> multi-map live and offline play. Next, build tested navigation/formation improvements
> only if needed; preserve the original sprites and the four-hour offline cap.

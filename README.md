# Ragna Tactics

**Your guild. Your party. Your adventure.**

A playable browser foundation for a Ragnarok-inspired adventurer management RPG.
Start with two Novices, choose their job paths, farm several maps simultaneously,
and assemble a party for real-time boss encounters. Unlock up to five adventurers.

## Play locally

Requires Node.js 22 or newer. Runtime has no external dependencies or services.

```sh
npm start
```

Open **http://localhost:5173**. Keep the terminal running. Use a current browser
with Web Locks support; localhost and HTTPS are supported. Open just one game tab.

### First expedition

1. Your two Novices are selected. Optionally choose **Link as party**.
2. Choose **Plan your first expedition** or **Deploy**, then South Prontera.
3. Watch automatic farming. Click a character or portrait to select it. Shift-click,
   or toggle **Multi**, to select several. Right-click ground to move; on touch,
   choose **Move**, then tap a destination. Use **Farm** to resume an assignment.
4. Select a different map to view it. This never moves your characters or stops
   another team's simulation. Deploy individuals separately to farm different maps.
5. At **Novice Job Lv. 10**, retreat, open **Guild camp** (⌂), and choose a first job.
6. Promote at least two adventurers, deploy them to The Broken Sanctuary, and
   defeat Baphomet. Move out of the red attack indicators. Recruit your third Novice.

Camera: scroll or +/− to zoom, drag to pan, F to fit. Double-click a portrait to
follow a deployed adventurer. Q uses a skill, H holds, R resumes farming, T retreats.
Boss fights continue while management dialogs are open.

Choose **Hunt area** and click or tap the field to assign a team to a small hunting
ground. Use **Farm** to resume after moving manually. When a Novice reaches Job
Lv. 10, the roster offers a shortcut to camp. During Sanctuary Ring, the shaded
band takes damage when the countdown ends. The centre and outer ground are safe.

## Included

- Two named Novices; progression into Swordsman, Mage, Archer, Acolyte, Merchant,
  or Thief. All recruits start as Novices. Achievement-based growth to five units.
- Six second jobs at first Job Lv. 40, with original sprites and signature skills.
- Forge Iron armaments and Guard insignias from field loot in shared storage.
- Three concurrent farming maps and two real-time boss expeditions.
- Party linkage, shared targets/EXP, basic following, healing, skill priorities,
  HP-based potions/retreat, movement overrides, hold, and focus fire.
- Shared materials, Zeny, equipment drops, item assignment, and camp services.
- Original locally served character/monster sprites from the owner's existing
  project, with pinned source hashes and original animation metadata.
- Angled overhead map view with zoom/pan/follow and desktop/touch controls.
- Versioned local saves, previous-checkpoint recovery, export/import, one-writer
  tab coordination, and four-hour offline farming in a background worker.
- Pure simulation tests, browser scenarios, static build, and a CI workflow template.

This is a foundation, not a complete MMORPG. Multiplayer, transcendent jobs, detailed
navigation/formations, expanded card sets, expanded crafting, and final balance are future milestones.
Terrain is provisional procedural scenery; imported character and mob art is original.

## Development and checks

```sh
npm ci
npm run check
npm test
npm run assets:verify
npx playwright install chromium
npm run test:browser
npm run build
npm run test:build
```

Python 3.9+ is needed only for the asset audit/import script. `dist/` is a portable
static build: serve its contents at a site root over HTTP/HTTPS. The development
server binds to 127.0.0.1; this is not a configured production deployment.

## Continue development

Agents start at **[AGENTS.md](AGENTS.md)**, then **[the handoff](docs/HANDOFF.md)**.
The [game direction](docs/GAME-DIRECTION.md), [architecture](docs/ARCHITECTURE.md),
[testing guide](docs/TESTING.md), and [roadmap](docs/ROADMAP.md) describe the agreed
direction and the next milestones.

See [asset credits and provenance](ASSET-CREDITS.md) before changing imported art.

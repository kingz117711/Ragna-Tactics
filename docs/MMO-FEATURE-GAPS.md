# MMO feature gaps — current coverage vs. a full Ragnarok-style MMO

This document records what the current single-player-with-parties build covers and
what remains before it resembles a full MMO. It is a planning aid, not a spec; the
authoritative direction is `docs/GAME-DIRECTION.md` and `docs/ROADMAP.md`.

## Already implemented (vertical slice + foundation)

**World & maps**
- Multiple hand-authored maps with the angled isometric projection: meadow, forest,
  payon, morroc, arena, lair — plus the South Prontera terrain pilot (`mapId: meadow`)
  with authored roads, shoreline, two hunting districts and landmarks.
- Seamless camera pan/zoom over a map; terrain detail is LOD'd (full / tiles-only /
  overview) with bounded chunk caching, visible-set pinning and prefetch.
- Minimap with roads, zones, shoreline, landmarks and a direct jump to every roster
  member.

**Characters & progression**
- Roster of adventurers with independent jobs, levels, attributes, builds, tactics and
  equipment instances.
- First-job and transcendent (second-job) advancement, keeping base level, attributes,
  prepared elements, gear, cards and refinement.
- Equipment with instance IDs, refinement (+1…+3), card socketing, and inventory
  grouping by item/card/rank.

**Skills (new in this milestone)**
- A `SKILLS` catalog with learnable ranks per job line; the full Swordsman line is the
  complete vertical slice (Bash → Power Strike → Brandish Spear → Pierce → Spiral
  Pierce); other jobs carry a signature skill at rank 1.
- Skill commands (`skill-learn`, `loadout`) with save validation and migration; loadout
  mode (automatic / manual) per character.
- The Skills page UI: per-skill learn/activate buttons, rank display, unlock levels,
  loadout-mode selector, and live skill power.

**Combat, parties & economy**
- Real-time-ish simulation with combat, statuses, elements/affinities, skills, and
  bounties.
- Parties with rally radius, tactics presets, movement orders (move/hold/focus/retreat),
  and simultaneous multi-map farming.
- Forge/refine economy, bounties, and offline settlement (4-hour cap).

**Interface & persistence**
- Single-screen desktop view and compact phone layout; panels, modals, keyboard
  navigation, reduced-motion support, touch input.
- Versioned saves (schema v1) with explicit migrations, never silently discarding
  unreadable saves; item quantities, ownership and equipment instance IDs preserved.

## Gaps vs. a full MMO

**Networking / multiplayer**
- No server, no authoritative state, no real-time sync. This is a local single-player
  sim with AI/party companions. True MMO requires a backend, room/zone servers, and
  delta serialization — explicitly out of scope for this build.
- No authentication, accounts, guilds-as-persistent-entities across clients, or
  per-user save storage beyond the local browser.

**Collision & navigation**
- No collision or pathfinding model. Terrain is decorative and non-blocking. A tested
  navigation model is required before terrain can block movement (see `AGENTS.md`).
- No physics, no z-height/elevation, no jumping.

**Skills & jobs**
- Only the Swordsman line is a complete vertical slice; other job lines have a
  signature skill but not their full skill trees.
- No skill prerequisites/chains beyond unlock-by-level, no skill buffs/debuffs
  library, no auto-cast AI wiring beyond the loadout mode.
- No job-change penalties, resetting, or skill-point economy beyond rank-per-level.

**Combat depth**
- No real targeting/agro/threat model, no aggro ranges or hate tables, no crowd
  control durations beyond simple statuses, no damage types/resistances matrix beyond
  element/affinity.
- No movement/positioning mechanics (no collision means no kiting around terrain).

**Economy & content**
- Economy is a simple forge/refine loop; no auction house, trading between
  characters, or player-driven market.
- Limited monster roster; no bosses beyond the milestone boss, no dungeons with
  mechanics, no events.
- Endless Tower and other endgame content deferred (see `docs/NEXT-AGENT.md`).

**Social / persistence**
- No chat, no friends/ignore lists, no guild management UI beyond party tools.
- Offline settlement is a local simulation, not server-calculated downtime.

**Content authoring**
- Only one terrain layout authored (South Prontera). Other terrain families and maps
  await Tiled authoring + converter runs.
- No scripted quests or dialogue; the expedition panel tracks goals but there is no
  quest system.

## Priority order for closing gaps

1. A tested navigation/collision model, then make terrain block movement.
2. Complete the remaining job skill lines (follow the Swordsman slice pattern).
3. Expand terrain authoring to more maps/families.
4. Add threat/agro and CC depth to combat.
5. Multiplayer/server work only if the product direction moves to an online MMO —
   otherwise keep the local sim and treat "MMO-like" as single-player-with-parties.

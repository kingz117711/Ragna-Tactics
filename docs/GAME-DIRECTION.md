# Game direction

## Confirmed by the owner

Ragna Tactics is a new game using the existing Ragnarok character/monster sprites.
The player oversees a small roster from an angled overhead view, manages farming
and battles, and chooses when characters cooperate or work independently.

1. **Hybrid control:** automatic routine farming, direct tactical involvement in
   harder encounters, especially bosses.
2. **Two to five characters:** begin with two; unlock up to five persistent units.
3. **Novice origins:** every character begins as a Ragnarok Novice. The player
   chooses that individual's class progression through play.
4. **Concurrent maps:** several characters/parties may fight on the same map or
   different maps at the same time. Watching a different map must not stop them.
5. **Party management:** group units for complementary combat roles or separate
   them to pursue different farming goals.
6. **Instant deployment:** use a management screen rather than travel timers or
   physical travel between maps.
7. **Camera:** Ragnarok-style angled overhead presentation, zoomed farther out
   for battlefield management, with adjustable zoom.
8. **Real-time bosses:** no tactical pause during a boss encounter.
9. **Four-hour offline cap:** farming continues while closed for up to four hours.
10. **Single-player first; multiplayer later:** multiplayer is required eventually,
    but it is a separate development phase.

## Intended player experience

Recruit/develop → choose builds → assign farming → earn EXP, materials, and gear
→ improve the roster → assemble for bosses → unlock the next opportunity.

The interesting choice is where to spend a limited roster. A healer helping a
dangerous expedition is not available to support another team. Bringing everyone
to a boss interrupts their separate production. Equipment and character roles
should make those choices matter.

Characters are persistent adventurers the player recognizes, not disposable units.
Automation should be readable and predictable. Direct orders should have clear
priority and an explicit way to return to the previous assignment.

## Provisional foundation rules (not additional owner commitments)

- Novice job change at **Job Lv. 10**, at camp. Six first jobs are implemented;
  first-job choices currently cannot be reset. At first Job Lv. 40 a character can advance at camp to their corresponding second job.
- Starting names Aren/Lyra; rename at any time. Default original male/female looks.
- Third/fourth/fifth roster slots are earned from three independent achievements:
  one boss clear, 35 Payon Forest kills, three boss clears. Each adds a slot.
  These requirements are tuning, not fixed narrative milestones.
- No permanent death. Defeat returns a unit to camp; it remains down until explicit
  recovery. Camp recovery is free during the prototype.
- Deployment is instantaneous while not engaged. During combat, retreat physically
  to the marked camp exit before redeploying; this avoids free teleport escapes.
- Party-linked units share deployment/movement orders, prioritize the leader's
  target, and receive a single EXP pool with a 12% bonus. Members must be alive,
  on the same map, and within reward range. Support heals its own party or itself.
- Shared storage for materials and currency. One equippable prototype item per
  character. Inventory transfers preserve item counts; no item IDs are regenerated.
- Balanced, training (+15% Base EXP), and gathering (double materials) assignments.
- Three tactics presets (safe, aggressive, conserve SP) establish per-character
  defaults for skill use, healing/potion/retreat HP thresholds, and target preference.
  Each character can customize these bounded settings. The UI presents these as
  practical controls, not a general-purpose behavior-rule editor.
- Offline uses the same fixed-step simulation, existing supplies, builds, and
  tactics for all farming teams concurrently. Defeat ends that character's farming.
  Boss teams return to camp without boss rewards when an absence is settled.
- Four farming fields and the Baphomet and Phreeoni encounters form the current content set. Numbers, drop rates,
  maps, item names, boss difficulty, and scenery are provisional.

## Keep out of the initial scope

Do not start a full MMO server, add monetization, copy Prontera-Grind accounts,
implement every Ragnarok job, add procedural recruitment/gacha, or replace the
original sprites with generated placeholders. Build and tune the core loop first.

Future multiplayer may begin with cooperative boss expeditions, but the owner
has not committed to that mode, server provider, economy, or account model yet.

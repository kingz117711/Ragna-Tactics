# Renewal job, skills, equipment, and art notes

## Research basis and ruleset

This build targets **Ragnarok Online Renewal** rather than Origin. The class paths and skill identities are grounded in the official Renewal class guide and cross-checked against the public rAthena Renewal skill/tree schema. rAthena documents skill-tree prerequisites separately from skill effect/cast data; this project uses that as a structural reference, not as copied source data. Official class pages informed the signature choices here: Ranger’s Arrow Storm/traps and Warg, Sura’s combo/area control/finisher, Guillotine Cross’s Cross Impact and Rolling Cutter, and Archbishop’s party healing and buffs.

Sources:

- [Official Ragnarok Online Renewal class and skill guide](https://renewal.playragnarok.com/gameguide/classes_index.aspx)
- [Official Ranger skills](https://renewal.playragnarok.com/gameguide/classes_skill.aspx?c=41)
- [Official Guillotine Cross skills](https://renewal.playragnarok.com/gameguide/classes_skill.aspx?c=43)
- [Official Archbishop skills](https://renewal.playragnarok.com/gameguide/classes_skill.aspx?c=44)
- [Official Sura skills](https://renewal.playragnarok.com/gameguide/classes_skill.aspx?c=51)
- [rAthena skill database schema](https://github.com/rathena/rathena/blob/master/db/skill_db.yml)
- [rAthena skill-tree schema](https://github.com/rathena/rathena/blob/master/db/skill_tree.yml)

The simulation is deliberately **not** a server-accurate Renewal formula port. Skill multipliers, job gates, XP pace, and equipment stats are tuned for the game’s small-party idle loop. The class data includes the six core first-job families, their major second-job branches, transcendent and third-job continuations, and the expanded paths already represented in `src/renewal.js`. Current playable trees are compact, combat-backed kits with prerequisites, ranks, a prepared active skill, passive bonuses, effects, and class-identity hooks; they are not a transcription of every official skill in Gravity’s client/database.

## Combat implementation

- Job advancement is a parent-linked graph. Job Lv. 10 opens first jobs; Job Lv. 40 opens second jobs; Job Lv. 50 opens transcendent paths; Renewal third-job promotion also requires Base Lv. 99. Third-tier jobs can grow to Job Lv. 70.
- Each job has a skill tree. Job levels award skill points; learned actives can be prepared for automatic combat, and passive ranks affect combat stats. Skills use distinct action categories (direct, area, control, poison, healing, group buff, summon/falcon, and finisher) with map-bounded targets and save-safe ranks.
- Example kits emphasize RO class identity: Sniper/Ranger bow, trap and companion tools; Sura combo, area control and a high-cost finisher; Shadow Chaser control/debuff; GX burst/poison; Priest/Archbishop healing and buffs; Mechanic/Genetic ranged area and summon tools.
- Cast names and combat FX are currently **RO-inspired Canvas effects**, not imported official skill-effect sprites. Formula tuning needs further encounter playtests across party compositions.

## Equipment and bag

The loadout has weapon, armor, shield, headgear, garment, footwear, and two accessory positions. Items have RO database IDs and class restrictions; gear contributes attack, magic attack, defense, HP, SP, and range. Items move between shared bag and character slots with validation. Red/Blue Potions can be used from the bag, and Red Potion/Blue Potion plus Elunium/Oridecon/Emveretarcon are modeled as stackable drops/supplies. Existing relic gear, cards, socketing, and saves remain compatible.

The represented standard item base records (ATK, MATK, DEF, weapon/armor level, slot count, range, weight, buy price, minimum Base Level, and refineability) are now taken from the Renewal item database at rAthena commit [`6b917c1808cc93c65f27f47079b2c58a11df7c6c`](https://github.com/rathena/rathena/blob/6b917c1808cc93c65f27f47079b2c58a11df7c6c/db/re/item_db_equip.yml). The upstream database is GPL-3.0; the selected values are attributed in the project and the license text is included under `licenses/`.

Refining now uses the iRO Renewal +0 to +20 model: weapon-level base/over-upgrade bonuses, armor hard-DEF steps, safe limits, published normal success chances, material gates, and zeny costs. Because official Renewal servers differ, the project pins the iRO table linked below rather than claiming one universal RO refine table. Normal-ore failure is modeled as break below +10; from +10 onward failure either breaks or downgrades three levels, with the split kept as a clearly disclosed game rule where the reference source does not publish an exact distribution. Equipment is now stored as durable instances so refine level and affixes stay attached through equip, transfer, drops, and saves.

Random item affixes are a deliberate game-only layer, not an official RO property. Gear drops receive one to three deterministic seeded affixes from bounded stat ranges; they affect the same derived combat stats displayed in the loadout. Drop rates and affix pools are project balance values. Legacy relic equipment remains custom content. Full card socketing/effects across every new equipment instance and a broad trading economy remain follow-up work.

Sources:
- [rAthena Renewal equipment database](https://github.com/rathena/rathena/blob/6b917c1808cc93c65f27f47079b2c58a11df7c6c/db/re/item_db_equip.yml)
- [iRO Wiki Renewal Refinement System](https://irowiki.org/wiki/Refinement_System)

## Sprite and licensing boundary

The repository already tracks provenance for authentic Ragnarok Online body/hair and monster sprites in [`ASSET-CREDITS.md`](../ASSET-CREDITS.md), including source commit and hashes. The imported runtime wardrobe currently covers Novice, the six first jobs, and a limited set of second/transcendent outfits. Newer jobs render using their nearest imported ancestor outfit so no character disappears, but that is an explicit visual fallback—not an authentic unique third-job costume. Gear item icons and official skill-effect atlases are not present in the tracked asset subset.

Ragnarok Online artwork is owned by its respective rights holders, including Gravity. This implementation does not scrape or add unlicensed client assets. To finish unique costume/equipment sprites and authentic skill FX, the project needs a lawful asset source (for example, an owner-provided client/GRF and a documented local import workflow), and each imported asset must be added to the provenance manifest with hashes and source details.

## Review checklist

- Keep skill trees data-driven and validate every prerequisite, rank and command at the simulation boundary.
- Keep offline simulation deterministic: gameplay randomness must continue to use the saved game seed; renderer-only FX must never affect state.
- Do not present ancestor costumes or vector FX as authentic job-specific art.
- Add new classes, item instances, statuses, and effects with save migration and regression tests.
- Before calling the system production-ready, run the browser suite in an environment with Chromium and playtest early/mid/late parties with and without Acolyte-line support.

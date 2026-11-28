# Next agent prompt

Continue Ragna Tactics from the learnable Skills milestone on
kingz117711/Ragna-Tactics. The skill catalog (`SKILLS` in `src/data.js`) covers
every class family from Novice to Rune Knight/Arch Bishop, with ranks, job-level
gates, elements, statuses and 13 drawable flourishes. Extend it next:

1. Add catalogs for the expanded lines (taekwon, starGladiator, ninja, gunslinger,
   doram) and more ranks on the third-job lines.
2. Give monster and boss casts their own FX ids so boss telegraphs read like
   attacks rather than ground markers.
3. Consider a per-skill mastery cost (job points) once a second slice exists; keep
   training camp-only and keep `skill-learn` one rank per command.

Then pick up the terrain pilot scope below, unchanged.
 Read AGENTS.md, docs/HANDOFF.md, docs/MAP-RESEARCH.md and docs/MMO-FEATURE-GAPS.md. Keep the single-screen desktop view and compact phone layout.

Build the first seamless terrain pilot in South Prontera with licensed or owner-provided assets. Author original grass, dirt and shoreline transitions, a branching road, readable landmarks, and two hunting districts at the existing angled camera and sprite scale. Import assets through the provenance manifest. Use a Tiled authoring file and a small deterministic build-time converter. Keep visual and gameplay data separate. Prove the existing camp, spawn, retreat and assignment paths survive migration.

Render detail as the camera approaches using bounded chunk work, visible-set pinning and prefetch. Use a low-detail overview for wide zoom. Extend the compact and expanded minimap with readable roads, zones, recognizable landmarks and a direct jump to every roster member. Verify simultaneous farming through map switches and reload. Capture desktop and phone-width screenshots and report cold-load and pan metrics.

Continue character UI by adding genuine learnable skill choices and manual/automatic loadout controls on the Skills page. Implement commands and save validation for new skill ranks and presets. Keep existing build choices and equipment instance IDs. Prioritize a complete vertical slice for one class line before expanding. Verify clicking, tapping, keyboard navigation, reduced motion, live updates and two characters with independent configurations. Run all repository checks, update this handoff, and publish a scoped PR.

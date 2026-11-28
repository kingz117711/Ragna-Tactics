# Next agent prompt

Continue from the current gameplay PR. Read AGENTS.md, docs/HANDOFF.md,
docs/MAP-RESEARCH.md, and docs/MMO-FEATURE-GAPS.md.

The South Prontera terrain pilot and the Skills system are complete and verified
(terrain layout + LOD rendering + minimap; learnable skills with loadouts). The
next content milestone is the Endless Tower: build a three-floor Endless Tower
expedition with distinct fixed waves, a visible floor objective, combat-only
progression, a final reward and an explicit return to camp. Preserve old saves,
concurrent maps and active-only boss rules. Use existing native art. Verify floor
transitions, defeat, retreat, reconnect, rewards and normal UI entry before
publishing.

When extending terrain, author new layouts in `assets-src/*.tmj` and run the
converter; keep visual layout separate from gameplay data and keep terrain
non-blocking until a tested navigation model exists.

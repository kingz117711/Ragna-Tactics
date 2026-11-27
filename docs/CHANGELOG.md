# Changelog

## 2026-11-27 — Playable foundation 0.1

- Established the owner-confirmed direction and a root AGENTS.md for continuation.
- Added the independent ES-module simulation, local persistence, offline worker,
  original native sprites, responsive tactical interface, and first playable loop.
- Added two fields, six first jobs, party/solo commands, equipment/storage, and
  a real-time boss that unlocks further Novice recruitment.
- Added pinned asset provenance, offline verification, static build, tests, and a
  CI workflow template. GitHub rejected publishing an active workflow because the
  connected OAuth app lacks the workflow scope; enable the template later using
  a connection with workflow access. Game source delivery does not require it.
- Validation: syntax/import checks, 30 simulation/persistence tests, eight Chromium
  scenarios, and all 38 imported original files verified. Desktop/boss/mobile-width
  screenshots inspected. Static build checked. No multiplayer or production
  hosting is configured.

## 2026-11-27 — Expedition controls

- Added animated button presses, ground-order feedback, and dialog transitions.
  Map and job cards use native monster and class portraits.
- Added hunting areas, automatic party spacing, a persistent job-ready notice,
  and a second real-time boss cast with a safe centre and countdown.
- Offline reports now list equipment and material drops and count each shared kill
  once. Older version-one saves load with unrestricted field assignments.
- Seeded starter parties cleared Baphomet after five simulated minutes of training
  as Swordsman/Acolyte, Archer/Mage, and Thief/Merchant. The new tests exercise
  hunt orders, touch and reduced motion, job selection, ring damage, and reporting.

## 2026-11-27 — Combat reliability, expedition goals, and browser QA

- Prevented remote basic-attack/skill damage by validating map identity and actual
  reach at resolution; tightened Hold/focus/farm leashes and made leader assist
  override stale follower target locks only within the follower's boundary.
- Clamped combat repositioning to the battlefield and clarified manual move versus
  safety-retreat priority and party behavior after retreat/leader defeat.
- Added a six-step first-expedition goals panel with progress and next actions, plus
  backward-compatible save behavior, attention cues, tactical-order feedback, and
  clearer boss/job/recruitment feedback. Retreat threshold controls now represent
  preset values at 1% increments.
- Added simulation, persistence, and browser regressions. Verified 45 unit tests,
  14/14 Chromium scenarios, all 38 original assets, static build, and built-output
  smoke test. Refreshed desktop/mobile-width/boss/world/job screenshots were inspected.
- Remaining coverage limit: no physical-device or full multi-browser verification;
  manual unscripted balance playthrough remains follow-up.

## 2026-11-27 — Party tactics and world management

- Added role-aware positioning, bounded per-character skill/healing/potion/retreat
  thresholds, target preferences, leader assist/failover, and save defaults for
  existing version-one saves. Manual movement remains an explicit override; Farm
  resumes each character's assigned hunting area.
- Added a party roster summary and leader handoff, plus a world overview of map,
  activity, assignment, HP/supplies, direct navigation, and attention events.
- Added sim/persistence/browser regression coverage and updated game/architecture/
  testing/handoff/roadmap guidance. Preview server now binds to all interfaces.
- Verified `npm run check`, `npm test` (39 pass), `npm run assets:verify` (38 files),
  and `npm run build`. Browser tests and screenshots could not run: Playwright's
  Chromium binary is missing and download from `cdn.playwright.dev` was blocked;
  `npm run test:build` is likewise pending a browser-enabled environment.

## 2026-11-27 - Adjustable hunting areas

- Added three hunting radii, a placement preview and a keyboard-accessible centre-on-unit action. Existing marked areas retain their radius after loading.
- Browser tests launch this checkout on a dedicated port. Added party, save, invalid-order and touch/keyboard coverage for the editor.

## Second jobs and Prontera forging

Six second jobs with native sprites and signature skills now unlock at first Job Lv. 40. Added material recipes and a camp Blacksmith discount.

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

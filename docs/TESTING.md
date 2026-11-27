# Development and testing

## Setup and preview

Node.js 22+, Python 3.9+ for asset verification, and a current browser.

```sh
npm ci
npm start
```

Preview: `http://localhost:5173`. `PORT` can override the default. One browser tab
owns the guild; close it before opening the same guild in another tab. Runtime
does not require installing packages; `npm ci` installs browser-test tooling.

## Required checks

```sh
npm run check
npm test
npm run assets:verify
npm run build
```

Check validates syntax/module imports. Unit tests execute the actual simulation
and persistence modules, including two-to-five roster gates, Novice advancement,
all six jobs, role-specific tactics, bounded settings validation, party leadership
and failover, concurrent maps, party EXP, equipment transfers, retreat/defeat,
boss rewards, deterministic results, exact offline/live parity, four-hour cap,
legacy tactics defaults, corrupt-save recovery, and invalid import rejection.

Asset verification is offline. It checks all 91 original files against pinned
hashes/lengths and checks the derived runtime index against original catalogs.
Build emits only runtime files/assets and credits in `dist/`, excluding repo
metadata, test tools, secrets, and development documentation.

## Browser checks

```sh
npx playwright install chromium
npm run test:browser
npm run test:build
```

Linux CI may need `npx playwright install --with-deps chromium` instead. The runner
starts this checkout on its own port (5183 by default, configurable with TEST_PORT). Use `PLAYWRIGHT_CHROMIUM_PATH`
only if you intentionally need a specific installed executable.

Scenarios cover fresh deployment/parties/camera switching/orders/reload, job changes
and boss deployment, per-character tactics and party leadership, the world overview,
a 390px viewport, cross-tab writer protection, third-character recruitment, a
six-hour absence capped at four hours, hidden-tab checkpoint retention, and mobile
camp/additive-selection controls. Tests construct their own save fixtures in isolated
browser contexts. There are no production cheat buttons or global state hooks.

Screenshots: `artifacts/foundation-desktop.png`, `foundation-boss.png`,
`foundation-mobile.png`, and `world-overview.png`. Inspect them after visual changes;
these were refreshed and inspected on 2026-11-27. They are ignored by git. The
[CI template](ci/README.md) uploads them when enabled. A skipped run is not a pass.

`test:build` serves the actual exported `dist/` folder on an ephemeral loopback
port and checks a fresh browser boot, asset requests, two Novices, and runtime
errors. It also verifies the output contains only the intended public files.

The checked browser is desktop Chromium with a narrow viewport scenario, not
physical-device or full multi-browser verification. The source has responsive and
touch controls, but do not claim device coverage without testing those devices.

## Manual gameplay gate

1. Start fresh (export your existing save first). Deploy two Novices together.
2. Form/split a party. Send one to a different map. Confirm both earn progress
   while you view either map. Use Move/Hold/Farm and focus an enemy.
3. Return to camp. Refill potions. Advance each Novice at Job Lv. 10 into different
   jobs. Check stats, original sprites, healing, skills, and saved class identity.
4. Fight Baphomet, dodge a telegraph, and inspect the reward. Recruit the third
   character. Verify it starts at Novice Lv. 1.
5. Export, reload, import deliberately, and confirm assignments/equipment persist.
6. Hide the tab, return after an absence, and inspect the report. Bosses must not
   award offline victory. Close a hidden tab and reopen: away time must survive.
7. Use phone-width layout: open camp from the top ⌂ button, toggle Multi to select
   a subset, and use Move followed by a tap. Confirm no horizontal overflow.

## Balance measurements

Seeded foundation measurement: a default linked duo farming South Prontera for
300 simulated seconds reached Base Lv. 7 / Novice Job Lv. 10. After returning,
recovering, choosing Swordsman/Acolyte, and resupplying, they defeated the introductory
boss within a 180-second simulated encounter without manual dodging. This demonstrates
loop viability; it is not final difficulty tuning or an end-to-end UI measurement.

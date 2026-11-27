# Optional GitHub Actions checks

`foundation-checks.yml` is a ready-to-enable workflow template, **not an active
workflow**. Local validation already runs through the npm commands in TESTING.md.

The initial push was rejected by GitHub because the connected OAuth app can push
source but does not have the `workflow` scope. The template is stored here so the
game and handoff can be published without requiring a permission change.

To enable CI later, use a GitHub login/token permitted to edit workflows and copy
this file to `.github/workflows/checks.yml`. It runs syntax checks, simulation/save
tests, original-asset verification, a static build, Chromium scenarios, a static
build browser check, and screenshot artifact upload. It has read-only repository
permissions and does not deploy or publish the game.

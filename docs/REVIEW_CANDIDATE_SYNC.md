# Synchronize reviewed engine candidates

Run scripts/sync-review-candidate.ps1 from the integration checkout on either PC. Supply an existing Dungeon-Core repository and a sibling destination path. Candidate web pins the verified Sentinel revision 0a60d731eb7b0d7400fe14808ebeb5e55d1d1c3e. Candidate godot pins the BrightForge importer revision 94b79bb9f11aee394bdaedd472ed255c20bbc261.

Example in PowerShell from an existing clone:

    ./scripts/sync-review-candidate.ps1 -Repository . -Destination ../DungeonCore-web-review -Candidate web

Use -CheckOnly for local preflight without fetching or changing a checkout. Uncommitted destination changes and divergent history stop the sync. Existing imported assets ignored by Git remain local. Install the pinned checkout dependencies and import the private BrightForge export using docs/BRIGHTFORGE_BROWSER_QA.md before testing.

Both create and repeat synchronization passed on MSI. This helper executes on the computer where it is run. Tailscale supplies private game transport and Taildrop supplies private artifacts. Remote command execution still requires a connected device agent.

For Godot, run pc-godot/tests/review_brightforge.gd with the extracted asset export folder, optionally --check. Rootfall focused checks and local independent host/guest regression passed on MSI.

The Unreal recovery project compiled and its editor acceptance fixture passed locally. Its source is currently untracked in the recovery checkout and has not been published by this synchronization helper. Preserve that source and confirm its repository ownership before publishing it.

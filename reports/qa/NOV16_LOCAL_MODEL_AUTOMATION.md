# Local QA automation milestone, 2026-11-16

## Revision and scope

- Candidate before this milestone: `74ea88d0800e5c0fb0c96de1c5698e865bc94f17` on `codex/nov16-headed-multiplayer-qa`.
- Bounded change: add a standard-library Python runner and local-model handoff contract; extend the existing two-real-browser harness to select Mage explicitly and save one WebM canvas recording per headed client.
- No gameplay rules, authority boundaries, character assets, public deployment, or phone settings changed.

## Fresh checks

| Check | Result | Evidence |
| --- | --- | --- |
| Python quick mode | Pass, syntax plus 21/21 targeted tests | `reports/qa/automation-local/20261116T091635Z-quick/manifest.json` |
| Python regression mode | Pass, syntax plus 181/181 tests | `reports/qa/automation-local/20261116T091248Z-regression/manifest.json` |
| Python headed mode | Pass, 7 shared-state observations, 0 browser errors, 4 browser warnings | `reports/qa/automation-local/20261116T091420Z-headed/manifest.json` |
| Browser participants | Two independent headed Chrome processes with server roles `VANGUARD` and `MAGE` | The headed report and separate client WebM files |
| Browser observation scope | Independent keyboard movement, shared natural damage, each player's UI attack on the Sentinel, shared portal space | Seven named observations in headed report |

The headed run used normal Chrome GPU selection. The actual renderer string was not captured. Screenshots were recorded at 1440x900, 390x844, and 844x390. The phone sizes are desktop emulation, not physical-device evidence. The video files record canvas gameplay only, so the whole HUD is visible in screenshots but not in the WebM stream. A screenshot of the Sentinel-clear frame was visually inspected by Codex. Full video playback review remains pending.

The first sandboxed targeted run failed to open local WebSockets. The permitted loopback retry passed 21/21. The first Python regression run failed to launch `npm` from `subprocess` on Windows; resolving `npm.cmd` fixed that wrapper issue and the rerun passed 181/181. The unmodified game tests did not require a game-code repair.

## Open acceptance gates

The video demonstrates only the first encounter and portal. It does not prove four mock classes clearing all floors, natural wipe and revive, optional cycle restart, the full boulder sequence, behind-wall cache, exact tick and forged-action edges, companion pathing around the launcher, touch interaction, reduced-motion timing, physical iPhone behavior, or public deployment. The planned boulder cache is not implemented in this revision. The campaign and trap capture drivers were attempted in this working tree but did not complete and remain uncommitted for a separate repair pass. A subjective visual score is not a correctness claim.

## Local model boundary

The local model runs the quick and full regression modes, fixes one scoped issue on a dedicated branch, and returns a diff plus manifests. Codex captures headed video, reviews source and visuals, and decides whether a gate is closed. Failures are handed back as one bounded fix brief with a two-attempt cap. Public reports are triaged by a human and do not trigger autonomous repair.

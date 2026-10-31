# Post-Release Polish Reconciliation

Date: 2026-10-31

Branch: `post-release/polish-reconciliation`

Release base: `e641fb033876af134d7145a331ddd469bd73d275`

Documentation base: `2b3fe9bb29bbbf3266594c51f3555de9650cdb20`

## Purpose

This report recovers work from interrupted polish sessions without reopening stale branches or modifying the submitted release. The work is isolated from the deployed build until it receives visual review and physical-device acceptance.

## Reconciliation Result

The interrupted character, combat readability, portrait HUD, and revive milestones were not lost. Git patch comparison found equivalent changes already integrated into the release history:

| Interrupted milestone | Equivalent release integration | Result |
| --- | --- | --- |
| Character runtime commits `dd3d759`, `400f3b7`, `819e81e` | `c841fb6`, `8438940`, `b811e67` | Already integrated |
| Downed and revive commits `39df693`, `4bb4ade` | `2e64442`, `dcfc6be` | Already integrated |
| Portrait HUD commits `6c9a095`, `d21702b` | `4bc646a`, `8f0505f` | Already integrated |
| Close-melee readability `cbc3892` | `d0c4651` | Already integrated |

The approved title cover was also already present. Its SHA-256 is `B7332DB53BB3D3D91E1D8540BDF3E2433A3DBD2C7738F2E2E7D1E2CA993A820B`. The missing reusable art contract has now been restored at `docs/design/TITLE_COVER_ART_CONTRACT.md`.

## Recovered Omission

Environment milestone `d70ed6fdc662decb3e291380428b46bd16388603` was the only verified source milestone absent from the release branch. It has been applied as isolated commit `318c3b56022e5b27a5f402379cd4974cde33842a`.

That milestone restores:

- procedural non-colliding root clusters;
- clearer trap wires, stakes, and warning tips;
- layout capture automation and parity coverage;
- recorded environment proof without changing authoritative collision solids.

Fresh capture review showed the recovered roots still read as flat ground pads. The current working change adds a raised root crown, tapered primary roots, and secondary forks while keeping them outside combat and portal lanes. A regression test prevents returning to hairline root cylinders.

## Current Evidence

- `npm run check`: 53 JavaScript files passed syntax validation.
- `npm test`: 126 passed, 0 failed, 0 skipped.
- Focused layout, trap, and character tests: 14 passed, 0 failed.
- Fresh headless capture: 8 screenshots, WebGL ready, 0 browser errors.
- Desktop angled capture shows raised branched roots and the existing character silhouettes.
- Phone angled capture shows a readable compact gameplay lane, but the side root clusters are outside its narrow framing.

Evidence folders:

- `docs/evidence/layout-stage-two/capture-2026-10-31T08-18-42-532Z`: recovered environment before the root readability correction.
- `docs/evidence/layout-stage-two/capture-2026-10-31T08-23-10-281Z`: current root readability correction.

## Open Acceptance Gates

- Marcus must visually approve the revised root silhouette and overall environment direction.
- Physical phone plus computer multiplayer must still be tested together.
- A complete human campaign must verify the five-floor ending, optional harder cycle, intro skip vote, downed and revive flow, audio cues, and reconnect behavior.
- Public deployment must be checked against the intended revision after any later deployment. Local tests and headless captures do not prove the public host serves this branch.
- The requested external asset website cannot be evaluated until its URL or name is supplied. No asset should enter runtime without source, license, format, optimization, and visual-fit review.

## Safety and Release Status

No push, deployment, branch reset, file deletion, or release replacement was performed. The submitted release remains unchanged. This branch is a reviewable post-release improvement candidate, not a replacement release claim.

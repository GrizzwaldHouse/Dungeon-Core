# Barkwing final scheduled run 5 of 5

## Sprint disposition and ownership

The five-run schedule ends with this run. The automation was set to PAUSED through the Codex automation tool and the saved configuration was re-read: its original hourly COUNT=5 rule, project target, and working directories are preserved. The project asset task remains In Progress, not complete. This is the second productive art pass in five scheduled occurrences: runs 2, 3, and 4 failed at the usage limit before executing work. No catch-up runs are authorized or scheduled.

History was verified with Codex chat reads, not inferred from commit age or hourly elapsed time:

| Occurrence | Chat ID | Observed outcome |
| --- | --- | --- |
| 1 | `01a19880-53af-78d1-b351-54f0accbd3d4` | Existing run-01 report and committed recovery evidence |
| 2 | `01a198be-9d77-7b92-8fef-e93467e90208` | Failed at usage limit before work |
| 3 | `01a198f8-95b5-7b82-af26-13928407dbe4` | Failed at usage limit before work |
| 4 | `01a19936-5ec8-7d61-8804-69c21ded3e07` | Failed at usage limit before work |
| 5 | `01a19a02-1ff8-7f21-b17f-741eeaa447ff` | Current final bounded camber pass and handoff |

Preflight: `post-release/preview-polish-2026-11-01`, HEAD `6e894eca96178f51bac21a3830cb8e56359da215`. Required instructions, workflow, tasks, board, and visual-recovery report were read first. The index and tracked worktree were initially unchanged; existing untracked assets, captures, and documentation were preserved. The automation memory file did not exist and is recreated with this final run's disposition and recovery SHA.

Owned paths: new `tools/blender/refine_barkwing_camber.py`, this report, the asset-ledger addendum, the task summary, and the existing runtime-character board row only. There are no runtime, server, mechanic, dependency, or new concept changes. Wayfarer, Sentinel, Rootling, environment, and procedural fallback work is preserved. Local Blender evidence remains ignored and unstaged.

## Same-candidate refinement

The exact run-01 prepared blend is the source. The new script checks its hash and the existing hierarchy, then transforms the 42 existing wing meshes together. It pitches their planes by 55 degrees and applies a small shared bow to ribs, spars, veins, and membranes. Their attachments remain aligned. It recalculates normals and checks finite vertices, unchanged topology/UV/material signatures, unchanged non-wing vertices, and retained preview-action names.

Two initial 52-degree trials refused export because projected wing area missed the script's threefold increase requirement. A 55-degree refinement passed that same requirement. No failed trial wrote an output directory. This is a geometry diagnostic, not a visual score or measured screen coverage: the sum counts overlapping triangles and both faces of thickened leaves.

The approved title PNG was inspected directly and remains SHA-256 `b7332db53bb3d3d91e1d8540bdf3e2433a3dbd2c7738f2e2e7d1e2ca993a820b`. The current Spline scene could not be read because its editor bridge was disconnected. Prior Spline findings and the existing reconstruction provenance remain the available secondary reference; no fresh Spline validation is claimed.

| Measurement | Verified result |
| --- | --- |
| Blender | 5.1.2 headless |
| Prepared source SHA-256 | `f55810fea23cb15e4928b969142c916f6b90d6291c7f76831985114e73c8985b` |
| Refinement script SHA-256 | `99ccb2c8e712770bd1bb99283ae531c1239bb9f06c9cfe9421101c66411e290c` |
| Refined blend SHA-256 | `4a33f3af6338939f618510a03c942c4d65fbdfdee487a608708dfa959e6862d7` |
| GLB SHA-256 | `48d7ea7d9e52add17b8b2892e2cd2b64a5309ad4e304d8e2dc531168ee09e583` |
| GLB bytes | 164680 |
| Triangles / materials | 1716 / 6, unchanged and over minion caps of 1200 / 1 |
| UV-bearing primitives | 78 / 78 |
| Clean-import split vertices | 2810 |
| Textures / skins / cameras | 0 / 0 / 0 |
| Preview actions | `02 Left leaf wingAction`, `02 Right leaf wingAction` |
| Top-plane wing triangle area | 4.556772 before; 14.062393 after, approximately 3.09 times |
| Repeated export | Identical GLB bytes in a second fresh output directory |
| External dependencies / required extensions | None |

No atlas, surface baking, skeletal rig, production animation, LOD, loader, or device performance gate was closed. Material nodes remain present in the source, while exported procedural bump is still absent.

## Captures and strict visual disposition

Actual delivery file: `art/blender/exports/barkwing-sprint-run-05/barkwing-camber.glb`.

Review folder: `art/blender/renders/barkwing-sprint-run-05-export/`. Its receipt binds the captures to the exact GLB SHA above. Front, side, angled, and top views are 900x700; phone-angled is 390x844. All five were opened and visually inspected. These are neutral-studio isolated-model renders, not gameplay or physical-phone evidence.

| Capture | SHA-256 |
| --- | --- |
| `front.png` | `bab91a2b1a8259496932e4ce3e1e75e63fce4418957b014646968bfb666d4504` |
| `side.png` | `493031ad25730b266ec1cb35807a15d7427bc6f1aedfc7a418317faf94edd2f5` |
| `angled.png` | `df30b7fd4c7ae8aee01cacc145efe815b07c84aea38eac62e78088849b3dea51` |
| `top.png` | `7a27b598c7a91ba4aed02ec42c518be5ced2e780d5662903fdb5b386bb04773b` |
| `phone-angled.png` | `066a2665e7458e6406f41c183abe563e6c080393a5f2575167aa5c6d19bc7d76` |

The top view now exposes both wing membranes rather than a thin horizontal line. Front and angled views retain two separate wings and the original crown and talons. Side depth remains inadequate, panel repetition remains obvious, and the straight torso and fine claws still underperform the cover at phone size. The broad wing area improvement is retained as a reviewable refinement, not declared final art.

The existing asset draft rubric scores five categories from 1 to 5 and normalizes to 100. The same 95/100 promotion threshold applies. This is a provisional single-reviewer assessment, not an independent panel result:

| Category | Score | Observed limit |
| --- | ---: | --- |
| Silhouette | 3/5 | Top-plane wing separation improved; side remains thin |
| Art direction | 3/5 | Muted palette retained; branch mass and organic flow remain weak |
| Craft | 2/5 | UV/topology preservation verified; repeated panels and lost bump relief |
| Technical | 2/5 | Repeatable clean import; caps fail and rig/LOD/device proof absent |
| Feedback | 1/5 | Only two rigid wing previews; attack, hit, and defeat absent |
| Total | **44/100, HOLD** | Independent jury and owner approval still pending |

The separate release rubric in `reports/qa-2026-10-31/VISUAL_JURY_95.md` requires at least 19/20 with no zero in every required floor/view. Those views were not recaptured or scored here. This model review does not revise the runtime's historical 76/100 assessment or satisfy the release matrix. Physical-phone claims remain open until Marcus tests the eventual approved preview.

## Verification and recovery

- Focused Barkwing, character, material, and environment tests passed first: 14/14.
- The initial full suite failed in WebSocket handshakes under restricted networking. The unchanged suite passed with loopback permitted: 147/147. No tests were weakened or skipped.
- `npm run check` passed after the full-suite retry: 66 JavaScript files.
- Clean Blender import passed, followed by independent binary-header/JSON checks of the actual GLB, counts, UVs, clips, finite accessor bounds, and embedded dependencies.
- A second build produced the same GLB hash. The existing-output negative check refused overwrite, and source/export/title hashes remained unchanged.
- The five actual-GLB renders were captured after regression and syntax checks, then reviewed directly.
- Optional Blender thumbnail/extension-cache writes outside the workspace were denied; asset save, clean import, and rendering completed successfully.
- `git diff --check` and board-row integrity passed: all 51 rows remain, with only the existing runtime-character row updated. Explicit staged-path review precedes the local recovery commit. Generated binaries, images, and raw receipts are excluded.

Earlier recovery commits remain intact:

| Commit | Meaning |
| --- | --- |
| `69b7244321963fe51000a1a456b23b08617cb265` | Combined existing UI and run-01 Barkwing recovery milestone |
| `4c5c66bc3cf20eca45daa17b9280c97c29c43450` | Accurate combined-milestone handoff |
| `6e894eca96178f51bac21a3830cb8e56359da215` | Run-01 provenance correction |

The final camber recovery commit is the commit containing this report and `refine_barkwing_camber.py`; its full SHA is recorded in automation memory and the final chat response after committing. The worktree's pre-existing untracked evidence and this run's untracked Python import cache remain uncommitted. There was no push, merge, deploy, publication, reset, clean, deletion, paid generation, or marketplace installation.

## Reproduction and next owner step

```powershell
$blenderExe = 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe'
& $blenderExe --background --python-exit-code 1 --python tools/blender/refine_barkwing_camber.py -- art/blender/exports/barkwing-sprint-run-01/barkwing-review.blend art/blender/exports/barkwing-sprint-run-05
& $blenderExe --background --python-exit-code 1 --python tools/blender/validate_glb_asset.py -- art/blender/exports/barkwing-sprint-run-05/barkwing-camber.glb
& $blenderExe --background --python-exit-code 1 --python tools/blender/render_asset_review.py -- art/blender/exports/barkwing-sprint-run-05/barkwing-camber.glb art/blender/renders/barkwing-sprint-run-05-export
```

Use new output suffixes to reproduce; the preserved directories are intentionally refused. If the ignored run-01 blend is absent on another machine, reproduce it with the tracked `prepare_barkwing_review.py` first and verify the expected input hash. A local commit does not back up these ignored binaries off-machine.

Marcus and the Runtime Character Art Lead should compare run-01 and run-05 top, side, and phone-sized actual-export images before choosing further refinement. Reconnect the existing Spline document for the outstanding live-reference check. Continue the same Barkwing only after that review, addressing branch depth, panel craft, caps, and surface portability before rigging and full clips. Keep the procedural actor until provenance, independent 95-point jury, animation, loader/fallback, measured desktop performance, and physical-phone gates pass. The local board row is updated in place; live Notion synchronization remains pending because no Notion connector is exposed. The schedule is stopped at five occurrences rather than extended to compensate for failed runs.

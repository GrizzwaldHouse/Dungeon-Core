# Barkwing polish, scheduled run 1 of 5

## Scope and ownership

Continued the existing `Barkwing Reference Reconstruction` from `docs/design/prototypes/barkwing-reference-v2/barkwing-reference.blend`. No concept, enemy, mechanic, runtime model, loader, feature flag, or server change was introduced. The weaker `runtime-character-pass` pack was not used. No paid generation or marketplace installation occurred.

Preflight branch: `post-release/preview-polish-2026-11-01`; initial HEAD: `1e26136`. During this run another lane committed execution-plan documentation through `664f4c21bee5479085948a67d1640dade091fbf7` and edited client UI files. Those changes belong to that lane and are excluded from this asset milestone. Existing untracked binary assets and captures remain preserved.

References inspected: the actual approved `client/title-cover-deepwood.png`, the live Spline `Barkwing Flying Minion Prototype`, and the existing reconstruction's angled render. The title PNG still hashes to `b7332db53bb3d3d91e1d8540bdf3e2433a3dbd2c7738f2e2e7d1e2ca993a820b`.

## Verified preparation slice

`tools/blender/prepare_barkwing_review.py` opens the existing source, checks candidate identity, applies the twelve existing leaf-thickness modifiers, recalculates normals, checks duplicate vertices, smooths narrow branch side faces, and generates only the twelve missing membrane UV layers. The torso and broad leaf faces retain their existing planes. Source coordinates and measured silhouette bounds are unchanged.

The tool checks finite vertex and UV coordinates and the six existing Principled PBR node materials. It writes a new blend, GLB, and provenance receipt under ignored `art/blender/exports/barkwing-sprint-run-01/`. It refuses an existing output directory. Source SHA-256 is checked again after export. It does not claim procedural noise/bump is portable to glTF.

| Measurement | Result |
| --- | --- |
| Blender | 5.1.2, headless |
| Source blend SHA-256 | `5898ef29f6d6176c509e1270d87c18b14f612284f24d71758446066002c6ef08` |
| Preparation script SHA-256 | `cb0508f667bc861773021eb01637326f89a74fb8af2a0585a3e8a8d575582af0` |
| Meshes with UVs | 66/78 before; 78/78 after |
| Duplicate vertices removed | 0 |
| Export triangles | 1,716; original reference export had 1,536 |
| Reason for triangle increase | Twelve existing thin-leaf modifiers are now explicitly applied before export |
| Export primitives/materials | 78 / 6 |
| Textures/normal maps/skins | 0 / 0 / 0 |
| GLB bytes | 159,868 |
| GLB SHA-256 | `44c0b0a774873723c283a0c4a069624746307f2c8b93413d6048564fa55104a6` |
| Repeated build | Identical GLB hash in `barkwing-sprint-run-01-repeat/` |
| Export animations | `02 Left leaf wingAction`, `02 Right leaf wingAction` |
| Clean import | 78 meshes, 2,810 split vertices, 1,716 triangular polygons, two wing actions |
| GLB dependencies | Embedded buffer; no external images/buffers, cameras, or extensions |
| Existing minion caps | 1,200 triangles and one material; both exceeded |

The 10,000-triangle generation brief is not an accepted replacement for the stricter minion budget. Rig, full clips, LODs, atlas, browser loader, performance, and device gates remain open.

## Captures and review

`tools/blender/render_asset_review.py` now accepts the actual `.glb` delivery file as well as `.blend`. GLB review uses a clean scene with the reconstruction's neutral studio lighting. New receipts bind Blender version, source kind, and SHA-256; existing capture folders are refused rather than overwritten.

Five source views: `art/blender/renders/barkwing-sprint-run-01/`.
Five actual-export views: `art/blender/renders/barkwing-sprint-run-01-export/`.
Each set contains front, side, angled, and top views at 900x700, plus `phone-angled.png` at 390x844. These are isolated model views, not gameplay captures or physical-phone evidence. The original source-view receipt predates the receipt enhancement; its source hash is recorded above.

| Actual GLB capture | SHA-256 |
| --- | --- |
| `front.png` | `eff95aca440aa06373df5b7b53866045c7fd9dfc38b5b85215c95bb66cd9250c` |
| `angled.png` | `9ca03cea8f4153e57145f6e2c8388b08cbc3d2884ccafdc33dd87144f34224c8` |
| `side.png` | `65d9a53688c41da53f224fd88e9d02b1b7f51b5932242a2223ba3ca75c5fa309` |
| `top.png` | `f87fc916a6cea0605e6d4e021a74082704d325f09a762a8f5760f4b01cae7b11` |
| `phone-angled.png` | `5a6cb1a8447da098ed82d0353de4b53ae4217b6be4fec9ca94f0c87ca679fd83` |

Direct comparison exposes the expected material gap: procedural bump is visible in the source render and absent in the delivery render. Top-down wings collapse almost edge-on, side depth is minimal, the torso remains too straight, and fine talons lose prominence at phone size. These are failed visual gates, not reasons to replace the candidate with another concept.

The live Spline scene retained the same object hierarchy and three shared material assets. The digest reports 47 objects; the prior report's optimization count was 46. No Spline edit was made in this run. A fresh live capture passed framing/hero checks but again failed exposure with luma deviation 4.1. A closer private front capture clarified the current silhouette but does not close the live exposure failure. Tool screenshots are in this run's chat; they were not exported as local PNGs.

## 95-point rubric disposition

The existing five-category draft jury uses 1-5 per category and normalizes the total to 100. This run's single-reviewer assessment of the exact exported candidate is recorded below. It is not an independent jury result and does not supersede the runtime's separate 76/100 review or the earlier prototype panel's 44/100.

| Category | Provisional score | Evidence |
| --- | ---: | --- |
| Silhouette | 2/5 | Front wings separate; top and side collapse; straight torso |
| Art direction | 3/5 | Muted bark/leaf palette; insufficient branch mass and depth |
| Craft | 2/5 | UV repair is complete; regular hanging panels and missing export relief |
| Technical | 2/5 | Repeatable clean import; budget exceeded; no rig, atlas, or device proof |
| Feedback | 1/5 | Only two rigid wing actions; no attack, hit, or defeat clips |
| Total | 40/100, HOLD | Below 95; independent panel and owner approval remain pending |

Do not load this GLB into the game. Preserve the procedural fallback. No physical-phone claim is made, and Marcus must test the eventual reviewed preview.

## Validation and reproduction

- Focused Barkwing, character, and environment checks: 12/12 passed first; material-polish checks: 2/2 also passed.
- Initial `npm test`: 145/145 passed; `npm run check`: 65 JavaScript files passed.
- A later shared-worktree repeat failed during WebSocket handshakes. Retrying with loopback networking explicitly permitted passed 147/147 and 66 syntax files. The extra two tests and one JavaScript file belong to the concurrent UI lane; they are not included in this asset commit. This is local combined-worktree evidence, not a public or device claim.
- Clean Blender import passed. Independent GLB JSON inspection confirmed 78 UV-bearing primitives, exact triangle count, embedded dependencies, zero normal maps/skins, and the two clip names.
- A second preparation invocation into a new directory produced an identical GLB hash.
- Existing-output negative checks passed for both preparation and rendering, with original source and existing export hashes unchanged.
- Staged-path review caught concurrent UI updates inside the shared task and board files. Only the asset paragraph and runtime-character row were selected for this commit; the other lane's working content was left intact.
- Blender reported denied optional thumbnail/extension-cache writes outside the workspace; asset save, import, and all ten renders succeeded.
- Generated binary files, diagnostic receipts, and PNGs remain ignored local evidence, excluded from the recovery commit.

```powershell
$blenderExe = 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe'
& $blenderExe --background --python-exit-code 1 --python tools/blender/prepare_barkwing_review.py -- docs/design/prototypes/barkwing-reference-v2/barkwing-reference.blend art/blender/exports/barkwing-sprint-run-01
& $blenderExe --background --python-exit-code 1 --python tools/blender/validate_glb_asset.py -- art/blender/exports/barkwing-sprint-run-01/barkwing-review.glb
& $blenderExe --background --python-exit-code 1 --python tools/blender/render_asset_review.py -- art/blender/exports/barkwing-sprint-run-01/barkwing-review.glb art/blender/renders/barkwing-sprint-run-01-export
```

Use a fresh output suffix when reproducing; the existing directories intentionally cause refusal. The installed `game-dev` CLI was unavailable, so this run used the user-authorized headless Blender path directly.

## Next run and owner step

Run 2 should continue this Barkwing, concentrating on wing camber and branch depth so angled, top, and side reads survive together. Compare against the same cover and current Spline silhouette. Keep the original source and this review export intact. Recheck budget before any rigging or texture spend; do not start another asset while these hard holds remain.

Marcus's next review is the actual-export five-view set, especially `top.png`, beside the Spline study. The strict independent jury remains a separate read-only gate. The existing local runtime-character board card stays In Progress; no new task or duplicate asset card is added, and live Notion synchronization remains pending. This is run 1 of the existing five-occurrence hourly schedule, not completion of the sprint. Record each subsequent run in automation memory and stop after run 5 with the final commit/evidence/blocker handoff.

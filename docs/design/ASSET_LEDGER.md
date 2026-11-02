# Dungeon Core Crawler asset provenance ledger

Reviewed October 28, 2026 against `19f333b2d8dfebe5ef8741541de7f87636fcedf2`. This initial ledger covers the selected cover and the unpromoted concept set; it is not a complete third-party dependency or production-art clearance.

## Selected title cover

| Field | Evidence / status |
| --- | --- |
| Exact file | `client/title-cover-deepwood.png` — tracked, already integrated |
| SHA-256, freshly verified | `B7332DB53BB3D3D91E1D8540BDF3E2433A3DBD2C7738F2E2E7D1E2CA993A820B` |
| Dimensions / file size, freshly read | 1774 x 887 PNG; 3,410,785 bytes |
| Recorded origin | Built-in image tool, October 26, 2026; Marcus selected October 27, per preserved design contract |
| Original generator copy, recorded only | `C:\Users\daley\.codex\generated_images\01a1487b-37e5-7640-97fc-ec1adcb76ed0\exec-355f1ee7-968d-4734-84e9-5b14dadf8bab.png`; original copy not re-opened this run |
| Provenance source | `design/dusk-qa:docs/design/TITLE_COVER_ART_CONTRACT.md`, introduced at `62d2c593d3df3d8df55cb27c05749765297dadd4`; current integration commit `43e72dc` added the cover |
| Intended runtime use | Title/entry background and submission cover; visual reference for future art. Not a model, texture atlas, encounter screenshot or evidence of runtime fidelity |
| Current loading/crop | Same-origin `/title-cover-deepwood.png` static route, high fetch priority, `object-fit: cover`, `object-position: 62% center`, pointer events disabled; hidden by `.in-room #title-cover` |
| Optimization | Original PNG preserved unchanged. 3.25 MiB transfer asset; no optimized derivative or measured mobile transfer/decode budget established. Create a separate reviewed derivative only with visual/crop/hash checks; do not silently replace the canonical file |
| Usage decision | Marcus's selection and existing integration are recorded in repository instructions/design history. No new image promotion occurs here |
| License / rights status | AI-generated project asset with recorded source. Provider/account terms, input/reference rights and redistribution clearance are not independently evidenced here; no blanket public-license or commercial-clearance claim. Retain as an open submission review item |
| Visual acceptance still needed | Exact deployed desktop/390x844 crop, slow load, usable form, join hides/leave restores cover, no asset errors |

The cover's gray-violet dusk, weathered stone/bark and distinct Wayfarer silhouettes are the primary reference. Preserve the chosen artwork and avoid repeating diamond motifs across characters or props. Consult the original contract on the design branch before creating derivative production imagery.

## Optional illustrated quest draft — October 29

One new sheet, `client/quest-storyboard-draft.png`, is admitted only for the owner-requested optional `/story-preview.html` draft. The [individual milestone record](QUEST_SLIDES_2026-10-29.md) records exact SHA/dimensions/bytes, built-in generator trace, canonical cover input, prompt/story reference, click-only single-sheet loading, visual review and open license/usage limits. It is not a gameplay screenshot or final approved cinematic. No older concept is bulk-promoted.

## Eleven generated concepts — unpromoted (unchanged)

All are currently untracked under `docs/design/concepts/` and excluded from staging. They have no new runtime role or verified license/optimization acceptance in this milestone:

- `dungeon-five-floor-layout-dusk.png`
- `dungeon-five-floor-layout.png`
- `dungeon-origin-story-board-dusk.png`
- `dungeon-origin-story-board.png`
- `expedition-combined-wardens-party-dusk.png`
- `expedition-combined-wardens-party.png`
- `expedition-variant-a-ancient-wilds.png`
- `expedition-variant-b-crowned-wardens.png`
- `expedition-variant-c-deepwood-permafrost.png`
- `opening-cinematic-storyboard-dusk.png`
- `opening-cinematic-storyboard.png`

Before any promotion, add an individual record with exact file/hash/dimensions, generator/source/prompt or traceable reference, selection/review evidence, intended runtime slot, rights/usage status, optimized output and visual/load acceptance. Stage only that reviewed milestone's explicit paths. Production-asset authorization does not supply missing provenance or justify bulk staging.

## Remaining asset inventory

Runtime procedural geometry/materials, inline title SVG, synthesized/browser audio, fonts and third-party scripts/dependencies still need their own source/license inventory before claiming a complete ledger. Preserve actual notices and distinguish code dependencies from creative assets. No finished Blender models, rigs, animation sets, licensed music or runtime parity with concept boards are asserted.

## Barkwing existing-reference preparation, November 1 run 1

This is an unapproved local review derivative of the existing `barkwing-reference-v2/barkwing-reference.blend`, not a replacement concept or a runtime asset. The source was authored by the preserved project script `tools/blender/build_barkwing_reference.py` using Marcus's supplied screenshot as recorded in `barkwing-pipeline/REFERENCE_RECONSTRUCTION_HANDOFF.md`. The approved title cover and current Spline Barkwing were inspected as direction references; no private input was uploaded and no new provider job was submitted.

- Source blend SHA-256: `5898ef29f6d6176c509e1270d87c18b14f612284f24d71758446066002c6ef08`.
- Preparation: `tools/blender/prepare_barkwing_review.py`, Blender 5.1.2 headless; missing membrane UVs, normals, branch shading, and explicit existing leaf thickness only.
- Output: ignored `art/blender/exports/barkwing-sprint-run-01/barkwing-review.glb`, 159868 bytes, SHA-256 `44c0b0a774873723c283a0c4a069624746307f2c8b93413d6048564fa55104a6`.
- Measured delivery: 1716 triangles, six materials, 78 UV-bearing primitives, no textures or skeleton, two rigid wing-preview actions. Source procedural bump does not survive this export.
- Intended slot: future Barkwing minion only after all promotion gates. No served model path or loader was changed.
- Credits: zero new generation/conversion spend in this run. Earlier Meshy job/account state remains unverified; this run does not reconcile its historical ledger.
- Rights: no new third-party code or animation was used. Screenshot/reference rights and provider terms are not independently cleared here. Publication clearance remains open.
- Acceptance: HOLD for top-down silhouette, export surface fidelity, minion budgets, rig/clips, independent 95-point jury, loader/performance, and Marcus's physical-phone approval. See `reports/BARKWING_POLISH_RUN_01_2026-11-01.md` for hashes, captures, reproduction, and limits.

## Barkwing wing camber, November 1 final scheduled run 5

Continues the exact run-01 prepared blend rather than rebuilding the character. `tools/blender/refine_barkwing_camber.py` deforms only the 42 existing wing meshes together, keeping topology, UVs, six PBR materials, non-wing vertices, and two rigid preview actions. A 55-degree pitch plus restrained camber exposes membrane area to the top camera. Original and run-01 source files remain unchanged.

- Input: ignored `art/blender/exports/barkwing-sprint-run-01/barkwing-review.blend`, SHA-256 `f55810fea23cb15e4928b969142c916f6b90d6291c7f76831985114e73c8985b`.
- Output: ignored `art/blender/exports/barkwing-sprint-run-05/barkwing-camber.glb`, 164680 bytes, SHA-256 `48d7ea7d9e52add17b8b2892e2cd2b64a5309ad4e304d8e2dc531168ee09e583`. A second fresh build matches exactly.
- Delivery: 1716 triangles, 78 UV-bearing primitives, six materials, no textures or skeleton, two existing wing-preview actions. Triangle and material caps still fail. Procedural bump still needs baking; no surface-fidelity claim.
- Reference: approved title PNG inspected and hash verified unchanged. The live Spline bridge was disconnected; only prior recorded Spline findings were available. No Spline mutation or paid generation occurred.
- Intended slot, rights, and historical provider limitations remain as recorded for run 1. No model or third-party code was installed, loaded, published, or promoted.
- Evidence: five actual-export views at `art/blender/renders/barkwing-sprint-run-05-export/`; provenance and static inspection receipts beside the GLB. Local evidence remains ignored and outside the recovery commit.
- Acceptance: provisional single-reviewer 44/100 HOLD; independent jury and owner review remain pending. Side depth, bark/leaf craft, minion budgets, LODs, complete rig/clips, loader/fallback, performance, and physical-phone approval remain open. Final handoff: `reports/BARKWING_POLISH_RUN_05_HANDOFF_2026-11-01.md`.

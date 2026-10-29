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

# Matchjaw visual judging and refinement

## Review loop

Compare the current model against `meshy-aqueduct-spiders/references/matchjaw-candidate.png` and the multiview reference. Capture front, side, three-quarter, attack-open, and gameplay views. Capture the visible Blender window as separate editor evidence. Record defects, correct the highest-impact defect, and recapture the same view before promotion. Runtime and physical-device results require their own evidence.

## Weighted visual rubric

| Criterion | Weight | Evidence required |
| --- | --- | --- |
| Reference silhouette and proportions | 25 | Matched front, side, and three-quarter views |
| Face, jaw, cannon, and tusk anatomy | 20 | Mouth close-up and attack-open view |
| Organic bark and irregular armor | 20 | Grazing-light detail and gameplay view |
| Material identity and muted palette | 15 | Textured neutral-light view |
| Animation and clipping | 10 | Walk, attack, hit, and defeat sequences |
| Gameplay readability and runtime performance | 10 | Real scene capture and measured frame times |

The target is 95/100 with no unresolved major clipping or missing required clips. Missing evidence prevents final acceptance regardless of arithmetic score. Scores are qualitative reviewer judgments, not automated measures of art quality. Do not infer a score from triangle count or successful export.

## November 7 refinement evidence

V4 loads the existing V3 source and retains earlier files. It replaces rectangular skull and side plates with irregular chipped geometry, adds brows, cheeks and teeth, restores jagged leg armor, and adds contour-following carapace shingles and raised bark ridges. Existing UV material textures are retained.

Two render iterations were inspected. The first exposed insufficient forward armor coverage and missing leg layering. The second adds a forward bark mantle and restores layered leg armor.

Visible Blender review was performed in Blender 5.1.2, including an F12 render. Screenshot: `matchjaw-sculpt-v4/headed-blender-review.png`. Render views and editable source are beside that screenshot. This is actual editor evidence, not only a background render.

## Current verdict

HOLD. The model has improved facial structure and irregular surfaces, but still falls short of the approved reference. The body is overly bulbous, the legs remain too cylindrical, the chimney lacks its perforated cage, and rear fins remain simplistic. Full animation review and runtime performance evidence are absent. A 95 score is not supported.

Next corrections: refine body proportions and leg anatomy; build the perforated furnace cage; add torn, ribbed rear fins; improve face and bark transitions; consolidate materials and geometry; verify animations and gameplay readability. Continue this loop without requiring another art approval for each intermediate revision.

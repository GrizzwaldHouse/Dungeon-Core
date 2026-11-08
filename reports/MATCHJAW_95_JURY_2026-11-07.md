# Matchjaw visual jury, November 7, 2026

## Decision and evidence boundary

**Gate: HOLD.** This is a strict review of the existing Matchjaw candidate against `docs/design/meshy-aqueduct-spiders/references/matchjaw-candidate.png`. The approved reference depicts a grounded eight-legged spider built from layered bark and metal, with an expressive skull-like face, a recessed central mouth cannon, twin wooden tusks, a soot-black furnace, ribbed abdomen, sparse moss, and ragged rear fins. The reference is a visual target, not proof that the game mesh contains any feature.

Reviewed current evidence: `docs/design/matchjaw-armored-v7/matchjaw-v7-walk.png`, `docs/design/matchjaw-armored-v6/headed-packed-review.png`, `docs/design/matchjaw-armored-v7/rig-measurements.json`, and `reports/MATCHJAW_RIG_REVIEW_2026-11-07.md`. The v7 frame is a Blender still. The headed browser capture contains v6 in a staged animation arena, not v7 in a dungeon encounter. No physical-phone capture or live Floor Two v7 chase is available.

## 100-point gate

| Category | Maximum | Passing evidence | v7 provisional score |
| --- | ---: | --- | ---: |
| Anatomy and silhouette | 30 | Eight grounded legs with layered plates, readable skull and recessed mouth, coherent tusks, chimney and ribbed abdomen, distinct ragged fins in front, side, top and game-camera views | 13 |
| Material response and surface finish | 25 | Bark, slate, iron, copper, soot, moss and worn wood separate clearly under the game's lighting; textured detail survives the game camera; glow appears only at functional ember points | 8 |
| Gameplay-camera readability | 20 | Mouth origin, legs, attack warning and target remain clear at angled and top-down views, desktop and 390 px phone width, with no actor overlap or misleading collision shape | 4 |
| Animation and deformation | 15 | Captured idle, pursuit, attack, hit and defeat; planted feet do not visibly slide; plates follow bones without skin penetration; emitter remains inside the mouth through attack | 5 |
| Technical delivery | 10 | Reproducible source, all weighted vertices, named clips, valid GLB, measured LODs and phone frame times under actual multi-actor load | 5 |
| **Total** | **100** | **At least 95, with no P0 or P1 defect** | **35 provisional** |

The provisional score is a visual jury judgment from incomplete evidence, not a measured percentage of AAA quality. Missing game-camera and phone proof caps those categories. A high render-only score cannot pass the gate.

## Blocking defects visible now

1. **P1 anatomy:** The main body reads as one broad smooth vessel. Reference features such as deep layered shell courses, overlapping copper braces and a more sculpted skull are muted or absent in the v7 frame.
2. **P1 legs:** Current limbs and bark plates show large planar facets and isolated block shapes. The reference has continuous joint anatomy with chipped armor wrapping the leg rather than floating on it. Full animated plate intersections have not been inspected.
3. **P1 face and attack source:** The central mouth ring glows brightly, but the mandibles, teeth and recessed cannon cavity are not strongly legible. The twin tusks still resemble tapered rods with bright caps. Verify the attack emitter from a true mouth close-up and a live projectile frame.
4. **P1 furnace and fins:** The chimney is readable, yet vents are mostly dark in the v7 lighting. Rear fins are thin angular panels with little torn membrane or material variation compared with the reference.
5. **P1 gameplay evidence:** The v6 staged preview is the only headed image. There is no v7 pursuit or attack in Floor Two, no top-down/angled comparison, no two-player encounter capture and no phone performance evidence.
6. **P1 runtime cost:** The v7 packed candidate is 11,010 triangles and 2,395,696 bytes. Its gameplay LOD switch has not been demonstrated, and a single 20-draw-call preview does not establish multi-spider frame time.

## Required next comparison

- Render each iteration from the same four orthographic views and one game camera, matching reference scale and neutral light. Keep a close mouth and leg-joint crop. Record the image file names, revision, and exact geometry source.
- Show a six-second pursuit and attack cycle from the real Floor Two scene, including a still at launch. The mouth emission must originate inside the jaw below the eyes. Record foot contact and neighboring-plate overlap at 24 or more evenly spaced frames.
- Compare v7 and the next candidate side by side at the same camera and exposure. Only increase the category scores for visible changes. If anatomy or surface finish gets worse, retain v7 rather than promoting the revision.
- Run LOD0/1/2 under the same camera with real encounter count. Record triangles, draw calls, texture memory, p95 frame time, load time and visual transition distance on desktop and target iPhone. Keep network authority unchanged.
- Request Marcus's visual judgment on the final candidate after the independent jury reaches at least 95 and every blocking defect is resolved. A passing local jury does not replace owner approval.

No runtime asset was promoted in this review. This file is an assessment and acceptance contract, not a claim that the game has reached the target.

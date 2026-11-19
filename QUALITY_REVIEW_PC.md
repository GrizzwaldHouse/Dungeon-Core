# Thornwake PC commercial quality review

Use one Windows export, its source SHA and its export settings for the whole review. Record the machine, display resolution, quality preset, camera, clip timestamps, raw measurements and open defects. Archive the evidence outside the game assets. November 18 baseline: the editor route regression passed; the packaged build, benchmark and independent visual review still need evidence.

## Scoring

Score each numbered item from 0 to 5, for 100 available points. Zero means broken, 1 means a blockout, 2 means recognizable with major defects, 3 means functional with visible defects, 4 means the stated check passes with one documented cosmetic defect, and 5 means the check passes in both the recorded route and a repeat run without a visible defect. Mark absent evidence UNTESTED and withhold the total. Two reviewers score the same clips independently. Use the lower score for each item until the reviewers resolve a disagreement against a timestamp. A fix gets a new clip on the new build.

| Area | Five-point checks, scored separately |
|---|---|
| Art direction /20 | 1. Identify each Wayfarer by silhouette at gameplay distance. 2. Identify airborne and ground enemies against both bright ice and dark roots. 3. Compare the gate crown, negative space and broken stone courses to the approved Deepwood cover. 4. Distinguish wet basalt, wood grain, ice and cloth in motion under the same dusk light. |
| Animation and feedback /20 | 5. Planted feet hold within 5 cm during a planted interval. 6. Armor follows joints through turn, chase and recoil without intersections visible at play distance. 7. Projectile originates within the mouth opening throughout the attack. 8. Ring, windup, impact sound and health change agree with the damage window during a hit and a dodge. |
| World and story /20 | 9. A first-time tester can explain the Guild assignment after the briefing. 10. Two testers reach the Hollow Cairn and Frost Obelisk in opposite orders unaided. 11. The gate opening, pillars and roots agree with walkable collision on both approaches. 12. A tester enters the dungeon and finds the return path with quest progress intact. |
| Play and accessibility /20 | 13. Input, camera and HUD remain readable at minimum and preferred supported resolutions. 14. Telegraphs remain distinct with sound muted, color cues removed and reduced motion enabled. 15. An unfamiliar tester recognizes a failed dodge, explains the damage and succeeds on retry. 16. Every advertised play mode completes its stated loop, including defeat and retry. |
| PC delivery /20 | 17. Clean Windows install launches, plays and exits twice. 18. Proposed initial target: at 1080p medium, three ten-minute encounter routes on the named minimum PC have p95 frame time <=16.7 ms and p99 <=33.3 ms during play. Record load screens separately. 19. Settings and any promised save/progression survive restart. 20. Store screenshots and feature list match the installed build, including supported input and languages. |

Internal targets: gameplay review >=95/100, environment promotion >=19.6/20 across items 3, 4, 11 and 12 (all four must earn 5 with integer scores). Any item below 4 requires rework. These are project targets. Steam assesses its own review criteria.

Automatic HOLD on a crash, progression blocker, save loss, misleading store claim, missing distribution rights or missing test on the named minimum PC. Gate multiplayer on two independent clients if advertised. Keep submission on hold until the shipped files have a license ledger, engine notices, accurate content survey and completed Steam reviews. See [Steam build and store review](https://partner.steamgames.com/doc/store/review_process), [content survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey), and [Godot license notices](https://docs.godotengine.org/en/stable/about/complying_with_licenses.html).

## Asset candidates for the first commercial-quality room

Publisher-listed CC0 assets permit commercial adaptation without required attribution. Keep voluntary credits and record the downloaded archive version or SHA-256, artist, original URL, license copy, modifications, exported GLB and game scene before promotion. Status for every entry below: shortlisted, import and review pending. [Poly Haven license](https://polyhaven.com/license) and [ambientCG license](https://docs.ambientcg.com/license/).

| Candidate | Proposed adaptation |
|---|---|
| [Modular Fort 01, Rico Cilliers](https://polyhaven.com/a/modular_fort_01) | Extract a single arched opening and wall bay in Blender. Replace pale plaster with chipped basalt. Break one crown stone, run roots down the outer jamb and check the opening against the existing gate collider. |
| [Tree Stump 01, Rob Tuytel](https://polyhaven.com/a/tree_stump_01) | Adapt the exposed roots for Hollow Cairn. Bake the source detail onto lower-detail silhouettes; instance background variants. For moving boss plates, bind authored meshes along the grain. |
| [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry) | A surface for stone joints and chipped edges. Use a restrained damp roughness mask at floor height. Keep highlights clear of warning rings. |
| [Ground 037](https://ambientcg.com/view?id=Ground037) | Blend mossy woodland soil around foundations. Start at the source scale of roughly 2.1 m per tile. Keep the walkable trail visually continuous. |
| [Universal Animation Library, Quaternius](https://quaternius.com/packs/universalanimationlibrary.html) | Retarget licensed humanoid clips to a Wayfarer in Blender, bake in place and check contact frames alongside movement speed. Author nonhuman guardian and spider motion separately. |
| [Ultimate Monsters, Quaternius](https://quaternius.com/packs/ultimatemonsters.html) | Compare candidate proportions and rig articulation against accepted models. Keep Matchjaw's mouth socket, torn fins and bone-bound leg armor from the approved design. |

First art trial: dress the playable northern gate and its approach. Use one wall bay, one clustered root silhouette and one worn path. Export in meters, apply transforms, import GLB plus textures into Godot, and compare the same camera before and after. Record walking, an enemy windup, a dodge and a return through the arch. Review readability and frame time before duplicating the kit across the frontier.

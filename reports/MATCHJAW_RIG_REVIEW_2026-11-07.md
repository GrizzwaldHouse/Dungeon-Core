# Matchjaw v6 rig and export review

Date: 2026-11-07. Checkout: `DungeonCoreCrawler-post-release-polish`, branch `post-release/preview-polish-2026-11-01`, starting HEAD `9d805a7620f3f1ed91ac20e6d058d445c7ee91b4`.

## Evidence checked

- `tools/blender/finish_matchjaw_rig.py` adds 48 irregular bark plates, three on each of 16 leg bones. Each plate receives a weight of 1.0 on its parent bone. The script also adjusts rear-fin edges and thickness and adds a dark soot material to upper furnace pieces.
- `tools/blender/pack_matchjaw_gameplay.py` combines compatible geometry before export. A fresh Blender 5.1.2 read of the packed `.blend` found one skinned mesh with 768/768 vertices weighted, one armature modifier, and 16 rig bones. This confirms the joined armor remains bone bound in the saved Blender source.
- A fresh GLB JSON inspection of `matchjaw-packed-gameplay.glb` found 10,614 triangles, 16 render primitives across four meshes, one skin with 16 joints, four animation clips, ten materials, 18 embedded images, and 2,346,600 bytes. These are export structure counts, not gameplay frame-rate measurements.
- The existing evaluated-bone report samples 96 gait frames. Maximum planted bone-tail movement between sampled frames is `0.000000677` Blender units; lowest sampled foot bone-tail height is `0.0450`; minimum knee sphere proxy gap is `0.11665`. Its `slipPass` and `kneeProxyPass` values are true for those specific proxy checks.
- The local headed capture `docs/design/matchjaw-armored-v6/headed-packed-review.png` shows the packed model loading in the animation review. Its overlay reports two skinned segments, frame p95 `18.4 ms`, and 20 scene draw calls. This is a single local headed browser review, not a phone measurement or full combat run.

## Visual judgment

The result improves bark armor movement and lowers draw calls from the earlier uncombined preview. It remains a candidate. In the headed image, the body and legs are still visibly faceted, the long front tusks read as rigid shafts, the furnace vent and soot have limited visible depth, and the torn rear fins do not yet match the layered organic detail in the approved illustration. The source script alternates rear-fin materials and perturbs vertex heights, but that does not establish reference-level surface quality. Do not describe this as final character art.

## Open gates

1. Inspect full animated mesh intersections, armor plate clearance against neighboring plates and legs, and tusk/body overlap at gameplay camera distance. Bone-tail and knee proxies cannot prove these.
2. Review an actual attack and pursuit in the authoritative dungeon scene. The standalone arena is a staged animation review, and the optional runtime adapter needs its own browser evidence.
3. Measure asset loading, frame-time distribution, memory, and visual readability on Marcus's target iPhone, including multiple simultaneous Matchjaws. One desktop capture is insufficient.
4. Rework and visually review furnace vent geometry and soot transitions, finer fin tears and materials, sculpted facial forms, and reduced primitive faceting against the approved Matchjaw reference before production promotion.

No generated asset was committed by this review. The scripts and generated v6 candidate remain in the existing worktree for integrator review.

## Bounded v7 refinement

The same v5 rig source was opened again and saved to a separate v7 directory. The v6 files were preserved. Both Blender 5.1.2 build and packing commands completed with exit code 0. Blender attempted a nonessential thumbnail write outside the workspace; model export, blend save, and render succeeded.

The front tusks now use six tapered, slightly curved cross sections instead of long two-ring cylinders. The bony plates use an uneven ten-point perimeter. Six small layered tears sit along the rear fin edges, and 16 soot-dark vent faces break up the furnace cage. The saved Blender frame is at docs/design/matchjaw-armored-v7/matchjaw-v7-walk.png. An actual browser gameplay view of v7 remains unverified.

| Packed export metric | v6 | v7 |
| --- | ---: | ---: |
| Triangles | 10,614 | 11,010 |
| Render primitives | 16 | 16 |
| Skin joints | 16 | 16 |
| Animation clips | 4 | 4 |
| Materials / embedded images | 10 / 18 | 10 / 18 |
| GLB bytes | 2,346,600 | 2,395,696 |

The 96-frame bone proxy measurements remain within their recorded limits: 48 armor plates, maximum sampled stance bone-tail movement 0.000000677, lowest sampled foot height 0.0450, and minimum knee proxy gap 0.11665. The six fin tears and 16 vent faces are static set dressing, while all 48 leg armor plates still use the rig. The preserved skin and clip counts confirm export structure, but do not replace an import animation check.

A fresh Blender 5.1.2 read of the packed v7 blend found one skinned mesh with 864/864 vertices weighted to the 16-bone armature.

The revised tusks are shorter and better attached in the render, but still look like simple horns, with overly bright tips. The rear fins and furnace retain a relatively plain low-poly surface compared with the approved illustration. The broad body and legs remain visibly faceted. This is an improved candidate, not a final-quality or phone-approved asset. Use v6 as the safe comparison until the integrator reviews v7 in the actual Three.js camera.

To regenerate from the existing local v5 `.blend` on this Windows checkout, run the following from the repository root with Blender 5.1.2. The v5 source and generated GLBs are untracked assets; the scripts alone are not a complete off-machine backup.

~~~powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python-exit-code 1 --python tools/blender/finish_matchjaw_rig.py
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python-exit-code 1 --python tools/blender/pack_matchjaw_gameplay.py
~~~

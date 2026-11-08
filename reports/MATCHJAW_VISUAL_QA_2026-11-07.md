# Matchjaw v6 visual QA, November 7, 2026

## Evidence identity

- Checkout: `DungeonCoreCrawler-post-release-polish`, branch `post-release/preview-polish-2026-11-01`, starting HEAD `9d805a7620f3f1ed91ac20e6d058d445c7ee91b4`.
- The working tree contains uncommitted gameplay and asset changes. This is a candidate review, not a sealed release revision.
- Reviewed saved local headed-browser captures: `docs/design/matchjaw-armored-v6/headed-armor-review.png` (9:00 AM) and `headed-packed-review.png` (9:02 AM), plus Blender render `matchjaw-v6-walk.png`. All are local November 7 artifacts.
- Direct headed-browser recheck in this agent turn was blocked because local browser use is disabled in Work settings. The current visual judgment uses the existing headed captures, not a fresh browser run.

## Observations

| Area | Result | Basis |
| --- | --- | --- |
| Form | Improved organic carapace and segmented bark armor, but still visibly faceted and toy-like relative to the approved story art. The front two appendages read as long tubes with bright caps. | Blender render and headed capture |
| Leg armor | Layered plates are visible on both near and far legs; the side plates remain small at the gameplay camera distance. | Headed capture |
| Furnace | Cage is recognizable but dark. Vents and soot cannot yet be distinguished clearly in the gameplay view. | Blender render and headed capture |
| Rear fins | Fins have angular tears, but limited material contrast and thin silhouette. | Blender render |
| Pose and clearance | A still capture cannot prove walking foot contact, armor deformation, pursuit timing, or attack emission from the mouth. | Evidence limit |
| Render cost | Existing preview displays 64 skinned segments and 284 draw calls before packing, then 2 skinned segments and 20 draw calls after packing. The 180-frame display reads p95 18.4 ms before and 18.3 ms after. The near-identical p95 values do not establish a frame-rate gain. | Text visible in saved captures |

The candidate's separate measurement artifact reports 48 armor plates, 16 bones, bone-tail stance slip `6.77e-7` per sampled frame, minimum evaluated foot height `0.045`, and minimum knee-proxy clearance `0.117`. Those are rig/proxy measurements, not full surface collision or skin-penetration checks. The packed GLB is 2,346,600 bytes. The separate source LOD manifest describes 33,670, 10,630, and 2,410 triangle exports; those LODs have not been proven as a working runtime switch.

## Decision and next visual gate

**HOLD for default gameplay promotion.** The existing opt-in route can be used for controlled review. Before promotion, record the same candidate in a real Floor Two chase with at least two players, capture angled and top-down movement and attack, and inspect the jaw origin, leg plate deformation, fin silhouette, furnace readability, and mesh intersections at the smallest supported phone view. Measure the game's frame interval and draw calls with the model active and inactive under matching load. A browser preview does not prove a physical phone, public deployment, or authoritative chase integration.

No generated asset or gameplay code was changed for this QA report.

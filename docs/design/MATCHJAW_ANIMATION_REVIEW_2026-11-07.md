# Matchjaw gait and attack review

V5 refines the existing V4 source. It lowers the body surface, replaces smooth legs with irregular tapered geometry, adds a 12-rib open furnace cage, and replaces flat rear fins with ragged membranes and branching veins.

An actual armature provides 16 bones for eight two-segment legs. Each leg segment is skinned to its bone. A two-bone solve controls each foot through stance and swing; alternating groups share a 24-frame gait cycle. Root translation is matched to stance travel. Frames 1-96 show forward travel; frames 97-144 hold position and spread the tusks for the mouth attack. The root and jaw retain separate animation data.

The Three.js review at `/matchjaw-animation.html` provides pause, replay, side view, and a scrubbable timeline. The cloaked moving target and projectile are staged presentation elements, not an authoritative AI or combat integration. This review does not prove navigation, hit validation, or multiplayer pursuit.

## Fresh evidence

- Blender export completed with the corrected armature-parent hierarchy.
- In-app headed browser loaded the exported model: 16 skinned leg segments, four animation clips.
- Browser console: no warnings or errors observed.
- Screenshots captured at 1.2 seconds, 1.7 seconds from the side, and 4.95 seconds at attack release.
- Screenshot paths: `matchjaw-animation-v5/headed-walk.png`, `headed-side.png`, `headed-attack.png`.
- Editable source and exported GLB: `docs/design/matchjaw-animation-v5/`.
- The analytic planned foot paths have no below-ground targets. This is not a full evaluated-mesh clipping or foot-slip certification.

## Remaining art and motion gates

The silhouette and functional skeletal motion are improved. Leg armor detail was simplified while replacing the old rigid components; it needs bone-bound bark plates. Rear fins need finer tears and material variation. The furnace still needs authored vent and soot detail. Full measured foot-slip, joint clearance, gameplay LOD, phone performance, and authoritative chase integration remain open. The model is available for motion review and has not replaced the live actor.

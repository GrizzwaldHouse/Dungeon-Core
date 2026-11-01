# Deepwood Environment Runtime Pass

## Scope

This pass improves only the procedural Three.js environment. It does not change the authoritative room layout, collision volumes, combat, character loading, or progression.

## Approved direction

- Cool gray-violet dusk instead of bright fantasy saturation.
- Wet slate floors, charcoal bark, muted moss, dirty frost, and weathered stone.
- Sparse cyan, ember, violet, and moss light cues for navigation.
- Root silhouettes must read as heavy branching wood, not hairline wires.
- Pillars must read as rough masonry with restrained highlights.
- Portals must remain legible from angled and top-down camera views.
- Diamond motifs remain rare and are not used as a universal decoration.

## Runtime changes

- Added immutable floor and chamber palettes selected from server snapshot presentation fields.
- Lowered tone-mapping exposure and lantern intensity while retaining clear navigation cues.
- Added per-floor fog density, floor emissive tint, stone, pillar, bark, and moss variation.
- Deepened flagstone and pillar textures to preserve form under the darker dusk palette.
- Added small bark knots to the existing branched root clumps without adding collision solids.
- Added a translucent portal veil while keeping the ground sill and beacon for top-down readability.
- Disabled lantern pulsing when reduced-motion is requested.

## Performance and authority guardrails

- Device pixel ratio remains capped at 2.
- Existing texture resolution and shared materials are reused.
- Each root clump adds only two low-detail decorative meshes.
- Each portal adds one 32-segment circle with no collision behavior.
- `shared/dungeon-layout.js` remains unchanged, preserving client and server AABB parity.
- Both camera modes continue to use one presentation-only transform path.

## Validation

Focused tests cover palette selection, portal visibility, camera offsets, reduced-motion lighting, layout parity, and procedural trap rendering. Fresh human visual review is still required at desktop and phone sizes before this pass is considered release-ready.

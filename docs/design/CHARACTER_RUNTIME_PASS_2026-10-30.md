# Character runtime pass — October 30, 2026

## Scope and authority boundary

This pass changes only procedural Three.js presentation in `client/render.js`. Player roles are stable visual silhouettes derived from the opaque player ID and display name; they are not gameplay classes and never enter room state, combat calculations, collision, rewards, inventory, movement, or target authority. Server snapshots still own transforms, health, connection state, downed state, enemies, and progression.

## Approved reference and palette

The primary reference is the tracked `client/title-cover-deepwood.png`, recorded in `docs/design/ASSET_LEDGER.md`. The runtime interpretation uses the approved wounded-frontier direction: wet slate, gray-violet cloth, dead moss, weathered leather, tarnished bronze, dirty frost, and sparse banked-ember or faint-violet accents. It adds no downloaded art, texture, font, model, animation, or repeated diamond badge.

The four Wayfarer reads are:

- **Vanguard:** broad torso, round battered shield, axe, planted stance.
- **Mage:** tall uneven hood, crooked staff, restrained violet focus.
- **Scout:** narrow cloak, bow, tilted quiver/field pack.
- **Healer:** medicine satchel, bottle, circular revive charm.

The mock-party names map intentionally to all four silhouettes so automated demonstrations show a mixed expedition: Ember is Vanguard, Rune is Mage, Vale is Scout, and Moss is Healer. Other names receive a deterministic visual role.

Deepwood now has explicit runtime forms instead of the generic fallback: the `DEEPWOOD_SENTINEL` uses a broad charcoal trunk, root spread, moss shoulders, antler crown, restrained amber core, and wide ground marker; `ROOTLING` uses a low body with three projecting root limbs. Barkwing keeps its existing ragged airborne profile.

## Prototype budget

| Runtime actor | Mesh ceiling | Geometry/material strategy |
| --- | ---: | --- |
| Wayfarer | 11 per actor / 66 for a six-player party | Low-segment primitives; the two boots share one geometry buffer; no textures or per-frame allocations |
| Deepwood Sentinel | 12 | Low-segment trunk, roots, moss plates, antler branches, core, ground/selection markers |
| Rootling | 7 | Low poly body, core, three roots, ground/selection markers |

These are draw-mesh ceilings for the procedural release candidate, not claims about a future rigged GLB. The repository's Blender triangle, material, bone, LOD, and real-phone gates still apply before any binary model promotion.

## Readability and lifecycle behavior

- Local identity remains a bright floor ring and chest point; remote identity uses a restrained warm marker.
- All worn surfaces fade together when a player disconnects, so tools do not remain opaque beside a ghosted body.
- Downed players rotate their actor group while their floor marker remains on the ground plane. Revive restores the standing pose from the next authoritative snapshot.
- Model construction happens once per player/enemy record and is reused across 30 Hz snapshots.
- Player interpolation, camera tracking, selection, hit effects, and enemy altitude remain unchanged.

## Evidence and limits

Focused renderer checks cover four role silhouettes, the eleven-mesh ceiling, shared boot geometry, disconnect/downed presentation, snapshot immutability, explicit Deepwood/Rootling forms, and resource reuse. The complete local suite must be run with loopback permission because Socket.IO tests open local ports.

Headless Chrome/SwiftShader captures were produced locally at desktop 1440 × 900 and phone 390 × 844 in angled and top-down views. They show the five-player runtime party and reported WebGL ready with no browser errors; the optional favicon is still missing. The capture folder is deliberately excluded from the milestone commit because its UI contains an ephemeral room code. It is internal review evidence, not physical-phone or public-deployment acceptance.

Open gates:

1. Capture the actual Deepwood encounter at both view sizes; structural tests are not a visual encounter capture.
2. Perform a physical-phone frame-rate and readability pass with six players, boss, Rootlings, and Barkwings active.
3. Obtain Marcus's in-game review of proportions and role readability before treating this procedural pass as the final art style.
4. Any future GLB replacement still needs provenance, optimized exports, animation/rig evidence, collision-proxy agreement, and device measurements.

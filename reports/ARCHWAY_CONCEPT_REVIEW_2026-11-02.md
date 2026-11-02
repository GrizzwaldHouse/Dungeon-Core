# Archway Concept Review | 2026-11-02

## Decision

The first two code-drawn archway studies were rejected as too basic. They remain out of runtime and are not treated as approved art direction.

Two new generated references were created from the approved Deepwood story-art direction:

- `client/assets/archways/deepwood-archway-aqueduct.png`: fractured basalt aqueduct threshold with roots, moss, ember bowls, and a violet opening.
- `client/assets/archways/deepwood-archway-root-crown.png`: monumental tree-root crown fused to ruined stone with a readable passage.

The review page is available at `/archway-preview.html` while the local preview server is running. The assets are preview references only. They do not alter `shared/dungeon-layout.js`, server AABBs, portal routing, or authoritative collision.

## Generation constraints

- Match the approved Deepwood cover and story art: dark dusk, ruined stone, twisted roots, mist, waterfalls, restrained violet and amber light.
- Keep the passage visibly open and readable at gameplay distance.
- Avoid diamonds, crystal motifs, text, logos, UI, flat vector geometry, cheerful yellow, and generic science-fiction portal shapes.
- Use the selected reference only as a style and composition anchor. Do not integrate an unapproved generated image into the runtime renderer.

## Promotion gate

Marcus selects one direction first. The selected direction then needs authored 3D modeling, a visual review at the angled and top-down camera modes, exact server collision parity, mobile-sized screenshots, and an explicit runtime promotion commit.

## Verification

- `node --test tests/client-ui.test.js`: 14 passed.
- `npm run check`: 67 JavaScript files syntax checked.
- Existing full suite evidence remains 159 passed from the prior UI milestone.

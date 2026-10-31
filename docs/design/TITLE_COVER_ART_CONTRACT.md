# Dungeon Core title cover and visual reference contract

Decision: Marcus selected the exact Deepwood confrontation image as the game's title cover on October 27, 2026. This is the primary image reference for later game art and 3D rendering. Future agents should use the saved file as an image input, not attempt to recreate it from prose.

## Canonical file and provenance

- Repository asset: `client/title-cover-deepwood.png`
- Served route: `/title-cover-deepwood.png` from `server/static-client.js`
- SHA-256: `B7332DB53BB3D3D91E1D8540BDF3E2433A3DBD2C7738F2E2E7D1E2CA993A820B`
- Generated for this project with the built-in image tool on October 26, 2026; selected by Marcus on October 27.
- This PNG is an explicit project asset exception to the normal exclusion of unreviewed concept images. Do not substitute another image at this filename.

## Visual rules

Use cool gray-violet storm light, charcoal bark, rain-worn slate, dark moss, dirty frost, and small violet, ember, or cyan cues. The Guild's world is beautiful but ominous and withholding. Materials show wet stone, weathered cloth, repaired gear, and root growth. The four Wayfarers have distinct readable silhouettes and practical roles. The Deepwood guardian is monumental and rooted. Barkwing minions occupy visible vertical space above ground enemies.

Diamonds are rare. At most an occasional portal focal mark may use that shape. Do not repeat diamonds on each hero, guardian, minion, banner, room, or control. Avoid broad yellow grading, cheerful saturation, and crystal overload.

## Reusable generation brief

Use `client/title-cover-deepwood.png` as Image 1 and the primary style and world reference.

```text
Use case: stylized-concept
Asset type: <dungeon room / character / guardian / attack VFX / UI backdrop>
Primary request: <one concrete scene or asset>
Style: original high-end stylized 3D game art with tactile, weathered materials.
Lighting: gray-violet dusk, mist, wet reflections, strong gameplay readability, narrow violet, ember, or cyan accents.
Palette: charcoal bark, slate, muted moss, dirty frost; avoid broad yellow and high saturation.
Composition: specify the gameplay camera and readable actor scale. Use the cover's atmosphere, not its exact pose.
Constraints: distinct silhouettes, practical gear, mysterious Guild world, few or no diamonds outside an occasional portal focal point.
Avoid: copied franchise characters, cheerful storybook grading, repeated diamonds, logos, captions, and watermarks.
```

Review generated work beside the actual PNG. Record source, prompt, license or usage terms, generated path, optimization state, and approval status. Resemblance to the cover does not authorize runtime integration. Require silhouette, rig, animation, collision, performance, and owner approval gates.

## Runtime acceptance

1. The same-origin title-cover route returns PNG content matching the recorded hash.
2. Desktop and phone crops keep the form readable and do not block controls.
3. Joining hides the cover and exposes WebGL. Leaving restores the cover.
4. Loading and graphics failures remain legible.
5. A later UI or art change preserves this file unless Marcus explicitly selects a replacement.

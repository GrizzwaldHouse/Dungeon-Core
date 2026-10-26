# Visual direction: the wounded frontier

**Decision recorded:** October 26, 2026

Marcus selected the Expedition Company style, particularly the Crowned Wardens and Deepwood & Permafrost variants, then requested a darker, less saturated treatment with much less yellow. The Guild is mysterious. The intended feeling is strange wonder under a depressing, dystopian sky: beautiful enough to invite exploration, uneasy enough to make every portal a risk.

## Palette and lighting

These values are art-direction starting points for future UI, materials, lighting, and video work, not sampled or implemented game colors.

| Role | Suggested color | Use |
|---|---|---|
| Ink shadow | `#141923` | Deep recesses, UI panels, portal interiors |
| Wet slate | `#303745` | Stone, armor, major environmental mass |
| Bruised cloud | `#625F70` | Overcast sky, distance fog, violet-gray cloud shapes |
| Strange cloud green | `#576158` | Subtle cloud undertone and sickly horizon light |
| Dead moss | `#4E5B4F` | Deepwood foliage, lichen, root growth |
| Tarnished bronze | `#77695F` | Small gear fittings and Guild seals instead of polished gold |
| Dirty frost | `#A9B9C2` | Snow, ice faces, cool readability highlights |
| Faint violet | `#8C75A6` | Portals, arcane clues, mage magic; focused accents |
| Glacial cyan | `#7FAEBB` | Ice effects and Warden core; focused accents |
| Banked ember | `#A8785B` | A few candles, recovery fire, or damage cues |

- Most of each scene should sit in slate, smoke, dirty frost, and desaturated green. Reserve saturated violet and cyan for mechanics or story clues.
- Replace broad yellow bounce light and large bright orange surfaces with sparse practical lights. The recovery room may be warmer than the combat floors but should still feel fragile and temporary.
- Favor diffuse overcast light, wet reflections, weathered rough materials, fog layers, and imperfect silhouettes. Let clouds carry a muted gray-violet and faint green cast; avoid cheerful blue skies or golden-hour sun.
- Keep room edges, doors, hazards, player silhouettes, pickup shapes, and captions readable by value contrast and shape. Darkness must not conceal collision boundaries or attack telegraphs.

## Character and environment notes

- **Wayfarers:** practical, worn expedition clothes; small Guild marks and aged metal rather than polished trim. Retain distinct silhouettes so players remain identifiable during multiplayer combat.
- **Tree Sentinel:** charcoal bark, gray-green moss, twisted antlers and only thin amber fissures. Roots read as a threat through motion and marked ground, not a large golden glow.
- **Ice Sentinel:** weathered stone with pale, dirty ice. Cyan is concentrated at the core and the edges of attacks rather than filling the figure.
- **Guild:** symbols, sealed charts, obstructed faces, and partial answers imply withheld knowledge. The Guild's motive is not revealed in the opening scene.
- **Dungeon:** subtly impossible routes, asymmetrical ruins, warped trees, and cloud formations provide the Wonderland influence. Portal shifts should feel uncanny, not festive.

## Review artifacts

The four [dusk concept images](OPENING_CINEMATIC_AND_STORY.md#concept-images) are local approval artifacts. The original brighter concepts remain alongside them for comparison. Neither image set has been integrated into the running game, and the cutscene remains a storyboard and script.

Before model or shader integration, review the result at ordinary play size on desktop and phone. Confirm that the darker treatment retains readable player classes, hidden-wall discovery cues, enemy attack zones, item pickups, and `READ & FOLLOW` / `SKIP INTRO` buttons.

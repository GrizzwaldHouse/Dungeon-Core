# Character turnaround sheets

This folder defines the approved input sheets for staged Blender modeling. It intentionally contains specifications, not generated character art or binary Blender files.

## Sheet format

Create one 2048px square PNG per asset. Place front, left, back, and three-quarter views on a neutral rain-dark background. Include a silhouette strip, a close-up callout, a five-colour muted palette strip, and an approximate height marker. Keep all labels outside the painted areas. The phone-scale review crop is 390px wide; if an important read disappears there, simplify the source model rather than adding text in the game.

## Wayfarer set

| File stem | Distinguishing construction | Close-up callout | Gameplay read |
| --- | --- | --- | --- |
| `wayfarer-vanguard-v1` | Shield/axe, uneven armor plates, planted stance | battered shield rim | front-line protector |
| `wayfarer-mage-v1` | Crooked staff, spell satchel, asymmetrical hood | ward/fire hand | arcane damage and wards |
| `wayfarer-scout-v1` | Bow, field map, light pack, gait or leg brace | map or fletching | range and route finding |
| `wayfarer-healer-v1` | Medicine kit, charm bundle, uneven cloak or prosthesis | revive charm | recovery source |

All four are Expedition Company underdogs: weathered teal, dusk navy, worn leather and restrained bronze; they are not matching uniforms. Avoid generic capsule bodies, glossy gold, or repeating diamond badges.

## Enemy set

| File stem | Required poses/views | Gameplay read |
| --- | --- | --- |
| `tree-sentinel-v1` | idle, root-eruption, exposed bark core | rooted guardian and telegraph origin |
| `barkwing-v1` | folded, glide, strike | airborne direction and attack wind-up |
| `ice-sentinel-v1` | idle, frost-cone, charge | horned heavy guardian and frost source |
| `ice-minions-v1` | shard crab, snow wisp, shield soldier | ground, air and defensive silhouettes |

For every enemy, show its weak point and telegraph attachment in the sheet. Effect colour never stands alone: combine it with a distinct pose, geometry, and in-game label/icon.

## Handoff checklist

Before modeling, record the source/provenance and reviewer approval. Before runtime promotion, link the source script/BLEND, GLB candidate, headless render, triangle/material count, texture sizes, rig/bone count, LOD list, and a real phone capture. The source specification and the final mesh may differ; record that decision rather than silently overwriting a sheet.

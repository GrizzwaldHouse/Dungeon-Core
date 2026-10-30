# Runtime character and Barkwing handoff

## Candidate and method

- Worktree branch: `design/character-runtime-pass`; capture baseline HEAD: `dd3d7592fde74acd456c694e50e4485d8a7926f3`.
- Exact captured `client/render.js` SHA-256: `55e8c6b643fa0442fbbeb994eddf98da35e21cde5c8249063fe69d303598ccda`.
- Evidence directory: `deepwood-2026-10-30T18-55-00-722Z/`; the contained `report.json` records viewport, server tick, authoritative health, live actor kinds, warnings, and WebGL state for each image.
- A local headless Chrome/SwiftShader host and a second Socket.IO client traversed the campaign to fourth-floor Deepwood using server movement, combat, trap, and portal intents. This is a real Deepwood encounter, not a rendered fixture. The capture-only server used 1,000 maximum HP and speed 25 to survive the route. The host's 220 to 200 boss hit was verified against server state before the attack image was named.
- Room codes and status messages were hidden in retained images; the report replaces the loopback URL with a generic label. No public host or physical phone was used.

## Visual and behavior proof

| Image | Live state proved |
| --- | --- |
| `boss-before-summon-angled-1440x900.png` | Sentinel at 220/220 HP. |
| `player-attack-angled-1440x900.png` | Browser host strike; Sentinel at 200/220 HP. The short Wayfarer arc follows confirmed damage metrics only. |
| `boss-and-minions-angled-1440x900.png` | Calm flight: boss and two Barkwings with their floor shadows separated from airborne bodies. |
| `barkwing-dive-warning-angled-1440x900.png` | Two live `BARKWING_DIVE` warnings; warm halos and pitched flight posture. |
| `boss-and-minions-angled-390x844.png` | Portrait framing, 988/1,000 HP, two dive warnings. |
| `boss-and-minions-angled-844x390.png` | Landscape framing, 976/1,000 HP. |
| `boss-wing-rootling-angled-1440x900.png` | Boss, three Barkwings, one Rootling, and player damage down to 964/1,000 HP. |
| `boss-wing-rootling-top-down-1440x900.png` | Same encounter in top-down view; health down to 952/1,000 HP. |

Every capture recorded one WebGL canvas, `webglReady=true`, and `recoveryVisible=false`. The browser recorded zero console/page errors. Its two warnings were the optional missing favicon (HTTP 404). The health decrease proves damage display; this high-health capture did not reach a natural downed/revive interaction.

## Actor budgets and authority

- Four Wayfarer roles: at most 13 meshes and 9 material instances each. Cloth, leather, worn metal, and role accents distinguish Vanguard, Mage, Scout, and Healer with their existing three role tools. The additional arc is a presentation cue; damage remains server controlled.
- Deepwood Sentinel: 15 meshes, at most 6 material instances. Rootling: 8 meshes, at most 6 materials. Barkwing: 14 meshes, at most 10 materials; mirrored wing membranes and spars share geometry/material within each actor.
- New flight, dive, and strike animation changes only prebuilt transforms and visibility each frame; it creates no geometry or materials during the frame. Reduced motion holds a stable airborne wing/hover pose and removes the Wayfarer lunge. Barkwing world altitude comes from snapshots; the shadow and selection ring compensate locally to remain on the ground.
- The capture and tests leave interpolation, target selection, hitboxes, health, downed/revive state, and the 30 Hz server simulation untouched.

## Visual review and integration

Compared with `client/title-cover-deepwood.png` and the strict visual jury baseline, the silhouettes are clearer and Barkwings read as flying in angled and top-down views. They remain deliberately procedural, low-poly runtime geometry rather than the painted concept art. The boss's dark body overlaps nearby Wayfarers in close melee. The portrait HUD covers much of the fight; the character branch does not own HUD files. The actor strike is a brief arc and lunge, not a fully rigged weapon animation. Physical-phone performance, public-host rendering, and a natural downed/revive capture remain pending.

Integrate actor sections of `client/render.js` manually if layout changes also touch that file: renderer actor bookkeeping in constructor/reset/pushSnapshot, `playerMesh`, `enemyMesh`, `animateBarkwing`, `animateWayfarer`, actor interpolation in `samplePlayers`, and the actor animation call in `start`. Environment, portal, root, and trap sections are outside this branch's ownership. Run character/Barkwing tests and a fresh Deepwood capture after reconciliation.

# Hidden Room and HUD Polish | 2026-11-02

## Fixed locally

- The secret-west discovery now reveals a complete chamber footprint instead of only a floor patch.
- Added a back wall, two side walls, a threshold arch, and a crown marker tied to the authoritative `secret-west` node.
- The client only shows those objects after the server sends the discovery event or includes the node in a snapshot.
- The existing secret wall still disappears only after server-confirmed discovery.
- Added a local HUD opacity slider from 35% to 100%. It applies to the mission panel, status message, and touch controls and persists per device.

## Not yet integrated

The generated archway images are review references. They are not runtime meshes and do not change portal collision. The earlier procedural portal frames remain in the playable build until Marcus approves one generated direction for authored 3D modeling.

## Verification

- `node --test tests/client-ui.test.js tests/layout-parity.test.js`: 21 passed.
- `npm test`: 160 passed.
- `npm run check`: 67 JavaScript files syntax checked.

## Owner review

1. Restart the preview server on port 3002, then reload the page in Safari.
2. Create a room, add the mock party, and walk to the secret-west discovery zone near the hidden wall.
3. Confirm the wall disappears and the chamber shell appears behind it.
4. Open Mission & view and move HUD opacity toward 35% until the scene is readable while labels remain legible.
5. Repeat once in desktop Safari or Chrome and once on the iPhone. Physical-device evidence remains open until the owner tests it.

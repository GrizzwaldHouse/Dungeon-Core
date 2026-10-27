# Phone running quick actions QA

Date: October 27, 2026
Branch: `gameplay/release-integration`
Starting revision: `43de322df20e49caf2c36d11d93a666dd744fe4f`

## Change

Moved **Leave room** and **Sound off/on** out of the collapsible party details into a two-column quick-actions row. During a coarse-pointer running session, the party details remain hidden while both actions stay in the squad panel.

## Evidence

- `node --test tests/client-ui.test.js`: 7 passed, including a structural regression check for the phone running HUD.
- `npm run check`: passed; syntax checked 28 JavaScript files.
- `npm test` before this change: failed with repeated `WebSocket connection failed: unknown` errors.
- A fresh local health and asset probe could not complete: the process could start its listener, but the sandbox denied the HTTP request with `EACCES`.
- The server defaults to listening on all network interfaces on port 3000. Same-Wi-Fi phone reachability and actual phone layout/audio behavior remain unverified; local network access and a physical-device browser were unavailable for this check.

The 11 pre-existing untracked design concept images were preserved and are outside this change.

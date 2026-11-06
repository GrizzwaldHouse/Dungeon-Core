# Connection and vitality cues QA

**Run:** 2026-11-06 13:07 UTC
**Checkout:** `qa/final-sprint-integration` at `10008cc7fdba67b6028bfc472ddeed42ffb1916f` plus the reviewed UI/test changes in this milestone
**Scope:** Local connection recovery and non-color vitality cues; no public or physical-device acceptance.

## Change and evidence

- The top bar keeps `CONNECTED`, `RECONNECTING`, and `OFFLINE` as text. A `Reload` button appears on disconnect or connection error and clears after reconnect. Reload uses the current page, allowing the existing stored-session restoration path to run again.
- Authoritative local health now changes the vitality caption to `LOW VITALITY` at or below 30 percent and `DOWNED` at zero. The numeric health stays visible. No client health prediction was added.
- `node --test tests/client-ui.test.js` passed 15/15 after the final button label and size adjustment. The VM harness checked the disconnected and error labels, Reload visibility and click, reconnection clearing, and vitality captions at 25/100, 0/100, and 100/100. `npm run check` syntax checked 52 JavaScript files before that HTML/CSS-only adjustment.
- The first full `npm test` run could not establish restricted-sandbox WebSocket handshakes before Socket.IO assertions. The identical suite rerun with permitted local loopback passed 127/127 before the final HTML/CSS-only adjustment. This is local automated evidence.
- A local headless Chrome/SwiftShader capture at 390 x 844 showed the connected label, live HUD, WebGL ready, and zero browser errors. A second capture set the header to `RECONNECTING` and revealed the Reload button for a layout-only check. The label, button, and room locator fit in the header at that viewport. The reconnecting image simulates DOM presentation; it is not proof of a live socket failure or reload recovery. The only browser warning was an optional favicon 404.

Private local captures are under `C:\Users\daley\.codex\visualizations\2026\11\06\01a1b0f0-baeb-7022-a4fc-a1275dcb2565\connection-cue-local` and `C:\Users\daley\.codex\visualizations\2026\11\06\01a1b0f0-baeb-7022-a4fc-a1275dcb2565\reconnecting-layout-local`. They contain an ephemeral room locator and are not publication assets.

## Open acceptance

Test a real network interruption and restoration in two independent browser/device contexts, verify the Reload action restores the right session, inspect a physical phone in portrait and landscape, and check screen-reader announcements. The full public release remains NO-GO.

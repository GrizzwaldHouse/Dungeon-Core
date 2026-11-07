# Title cover and entry form browser QA, 2026-11-07

Candidate before this QA-only milestone: `d1038a9d63da3bbe11490da599f458d0374c2124` on `qa/final-sprint-integration`. The approved Deepwood PNG and production UI source were unchanged.

## Local browser result

Ran `scripts/check-title-cover-browser.js` in headless Chrome with SwiftShader against an ephemeral local server and inspected four private screenshots. The script paused the Socket.IO startup script to capture `CONNECTING`, then released it to reach `CONNECTED`. At 1440 x 900, the cover image loaded beside the complete entry form. Creating and then joining the same room each hid the cover; leaving each session restored it. At 390 x 844, the cover remained visible above the form, and the name field and both room buttons were in the viewport. The phone crop shows a narrow slice of the guardian scene, as expected from a wide source image, while the form copy and actions remain readable.

Blocking the pinned Three.js CDN and reloading produced `STARTUP ERROR`, current-origin reload guidance, and a visible cover at 390 x 844. The browser result JSON contains no room locator. Captures and JSON stay in the private local directory `C:\Users\daley\.codex\visualizations\2026\11\07\01a1b695-3fd0-72f1-95e2-860a231b6500\cover-browser-local` and are excluded from Git. The browser run passed after correcting the QA script's room-state selector. An earlier sandboxed run could not start Chrome, so the passing run used permitted local loopback.

`npm run check` passed for 53 JavaScript files. No gameplay source changed, so the full gameplay suite was not rerun for this QA-only milestone.

## Scope limit

This closes the exact-source local desktop and phone-sized browser review of the cover, form, create/join/leave transitions, loading label, and blocked-CDN failure path. Headless Chrome is not a physical phone, independent browser profile, assistive-technology check, or public-host CDN test. The October 30 exact-candidate audit remains NO-GO, and the broader release gates remain open.

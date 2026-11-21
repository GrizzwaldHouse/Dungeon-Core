---
name: brightforge-game-integration
description: Import BrightForge GLB review exports into a game candidate and validate rendering, gameplay and cross-device behavior while retaining generation provenance.
---

Find the project's asset adapter and export contract before submitting new generation work. Dungeon Core uses docs/BRIGHTFORGE_BROWSER_QA.md, scripts/import-brightforge.js, and the optional ?assets=brightforge view.

Use an isolated candidate checkout. Keep the export's GLB, manifest, SHA-256, BrightForge revision, generation method and review status together. Validate the transfer and import before runtime review. Confirm source axes, meters, placement, texture dependencies and collision ownership in the target engine. Check the actual loaded scene with browser or engine automation and retain a readable image for visual review.

For Dungeon Core, npm run assets:import accepts the extracted local export folder. QA_BRIGHTFORGE=1 enables model verification during npm run test:browser. QA_HARDWARE=1 exercises the installed GPU renderer. The per-device browser roles in npm run qa:browser-device require a common candidate server, private short-lived ticket handoff and independent matching receipts. Read the project runbook for required environment variables.

Use the existing BrightForge local generation/export APIs when their real contract and provider choice are established. Preserve the actual provenance of procedural, reused and AI-generated assets. Obtain authorization before submitting paid generation work. The current Dungeon Core proof uses an optimized chest and a procedural doorway, and provides no full AI environment-generation evidence.

Report structural import, rendered runtime, physical two-device gameplay and human art/play approval separately. If requested generation or a device is unavailable, finish the independent import and local tests and state the specific missing evidence.

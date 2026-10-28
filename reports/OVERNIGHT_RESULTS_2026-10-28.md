# Explicit expedition victory and harder-cycle choice

October 28, 2026, 07:45–07:53 PDT. Local milestone; public release remains HOLD.

## Preflight and ownership

Read AGENTS.md, docs/GIT_WORKFLOW.md, client/handshake_guidelines.md, the overnight handoff, current mock-jury report and automation memory. Branch `gameplay/release-integration` at `4d1a2bd9e4188f3690c8b71bbf84957a71191b06`; documented touch/measurement/jury advancement accounts for the change from the older handoff. No other project chat was active in the fresh app inventory. No tracked or staged changes existed; eleven untracked concept PNGs were preserved. Main remains `eeabf4108d5def29c8bf38605ab269096913e549`, design worktree `c70683b9c6ed719ad2ea5dcd5fa7cf5878a07f2f`.

Owned paths: server/server.js; client/app.js, network.js, index.html, styles.css; tests/five-floor-integration.test.js, client-ui.test.js; this report and docs/SUBMISSION_PACKAGE_2026-10-28.md. No generated assets, infrastructure or other worktree changes.

## Behavior

- A validated exit after clearing the Warden and minions awards Floor Five once, records server-owned results and changes room phase to COMPLETED. Simulation stops; no automatic cycle restart occurs.
- Results include completed cycle, level, server tick and each explorer's XP, riches and contribution metrics. Snapshot copies prevent callers from changing the stored record. Same-server reconnect returns that record.
- `run:continue` accepts only the current host in COMPLETED with the matching `completedCycle`. It reuses existing safe-spawn and stronger-cycle code, preserves levels, halves each explorer's riches, resets healing charges and restores health. Results clear only after successful continuation. No client damage, rewards or progression prediction.
- Rapid distinct portal requests yield one completion and one rejection; replay of the original portal action returns the cached success without another award. Concurrent continuation requests yield one cycle restart and one INVALID_PHASE response. A previous cycle's choice cannot advance a later result.
- Results panel shows shared party records, labels mocks, focuses its heading on opening and presents the host's explicit choice. Guests see the wait/leave guidance. Disconnection disables continuation. Explorer names use textContent. Results and rooms remain temporary under existing expiry/restart behavior.

## Acceptance evidence

- `npm run check`: 34 JavaScript files passed.
- `npm test`: 80/80 passed with approved loopback networking. The initial restricted sandbox run failed WebSocket setup; no source/tests were weakened. Final suite includes results reconnect, host/phase/cycle checks, frozen completed ticks, portal replay/double entry, double continuation, one 500-base-XP campaign award total, resource resets and the stronger Sentinel.
- Client VM checks cover authoritative result visibility, host/guest choice, offline disable, literal name text, ACK without predicted restart, leave cleanup and intent payload.
- Temporary headless Edge/Playwright probe used the actual loopback application and renderer, exposing the module only through a temporary response interceptor. After creating a normal room, it injected a synthetic six-explorer COMPLETED presentation snapshot. This is results-layout evidence only, not a human campaign or live server victory demonstration.
- At 390x844 touch emulation, the scrolled continuation button was x108/y753.28, 238x44; at 844x390, x548/y205.28, 242x44. Both fit within the viewport, with no document horizontal overflow. Guest button hidden, no page exceptions, zero console errors during this isolated probe. The squad remains vertically scrollable. Browser and temporary server closed in finally; no room capabilities recorded.

## Remaining gates

Morning jury remains 68.3/100 HOLD on the pre-results runtime; no new score assigned here. Human full campaign, actual results interaction across two browsers, physical phone/multitouch/audio/rotation, Barkwing browser fight, continuous capture, public HTTPS/WSS, exact deployed SHA, restart/rollback, complete rights inventory and memory stability remain open. This probe's clean console does not resolve the morning jury's separate unattributed resource 404.

The morning jury already reviewed the completed isolated 30-minute aggregate (shutdown marker true, zero transport failures); do not launch a duplicate. Server-memory attribution/stability and full expiry acceptance remain unresolved. DigitalOcean provisioning still awaits the previously requested region/size choice; no repeated question or paid resource creation. Submission copy was refreshed to the implemented local behavior but still requires deployed verification.

Next bounded priority: broader human/browser campaign acceptance, warning-audio deduplication, and public-hosting/phone gates once the billing choice is supplied. Overnight authorization ends at 08:00 PDT; do not start another overnight implementation after that cutoff without renewed scope.

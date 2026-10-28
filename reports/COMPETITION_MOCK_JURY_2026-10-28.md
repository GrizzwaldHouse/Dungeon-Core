# Dungeon Core Crawler competition mock jury — October 28, 2026

## Final morning decision

**Panel score: 68.3/100 — HOLD for submission** (previous panel: rounded 71/100, underlying 70.7). Three independent agents scored Execution, Creativity, Usefulness/Value and Polish/Thoughtfulness on the official 1–5 scale, equally weighted. This is an evidence-limited morning re-score requested by the owner, despite the earlier report's unmet re-score gates. It is not public-release certification.

The lower panel result does not indicate a code regression. The portfolio juror applies a stricter Execution anchor to the missing required public playable link; the other two judges give stronger credit to the implemented local multiplayer architecture. Targeting, submission documentation and transport evidence improved overnight, but core submission blockers remain.

## Exact revision and repository state

- Audited branch: `gameplay/release-integration`.
- Audited HEAD: `10507e28bdd90fd69d1f75af7cddb5a09256f63e` (Isolate soak server memory and bound probe windows).
- Root: `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler`.
- Initial and pre-report status: no tracked edits; eleven untracked concept PNGs under `docs/design/concepts/`. Preserved and excluded from staging.
- Active worktrees: this integration checkout at the audited HEAD; `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler-design-qa` on `design/dusk-qa` at `c70683b9c6ed719ad2ea5dcd5fa7cf5878a07f2f`.
- `main`: `eeabf4108d5def29c8bf38605ab269096913e549`. Remote name `origin` exists; no push, deployment, authentication change or infrastructure mutation performed.
- Required instructions and both prior reports were read. The old overnight handoff's docs-only assumption is superseded by documented, intentional commits: `f5b419d` target authority, `70afe67` desktop selection, `bf37bfc` soak tooling, `19f333b` protocol QA, `bda0d6c` submission/ledger, `29459ca` touch selection, and `10507e2` isolated measurement. No unexplained handoff drift found.
- This report's later documentation commit does not change the audited runtime. Review `git log -1` for its containing commit; no self-referential commit SHA is implied.

## Official rubric and independent scorecards

The competition juror re-opened the primary official rules and mission during this run. Each criterion contributes 25%; total = sum of four scores / 20 × 100. Fractional scores are panel estimates within the 1–5 scale, not official judge results.

| Independent judge | Execution /5 | Creativity /5 | Value /5 | Polish /5 | Total /100 | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| A — technical director | 4 | 4 | 3.5 | 3 | 72.5 | HOLD |
| B — player-experience/release QA | 4 | 4 | 3.5 | 3 | 72.5 | HOLD |
| C — competition/portfolio juror | 2 | 4 | 3 | 3 | 60 | HOLD |
| Panel mean | 3.333 | 4 | 3.333 | 3 | **68.3** | **HOLD** |

**A rationale:** Execution earns 4 for authoritative simulation, replay-safe combat, encounter modules and validated targeting; Creativity 4 for Guild/shifting-world/cooperative recovery identity; Value 3.5 for accountless rooms limited by unproved external access; Polish 3 for target feedback and recovery controls limited by automatic ending, phone crowding and presentation gaps.

**B rationale:** Execution 4 for shared campaign/reconnect and meaningful selection controls; Creativity 4 for distinct encounters and Deepwood identity; Value 3.5 for accessible co-op intent without delivered public-phone proof; Polish 3 for labelled controls/camera/accessibility, reduced by HUD obstruction, missing ending and incomplete media. Historical emulator evidence is not physical-device acceptance.

**C rationale:** Execution 2 reflects substantial implementation with major required-access gaps: no verified public playable URL or phone/laptop session. Creativity 4 credits distinctive world framing; Value 3 reflects accountless co-op with unproved reach; Polish 3 credits honest temporary-room warnings and target feedback while retaining ending, capture and rights gaps. The stricter requirement anchor explains disagreement with A/B.

BAFTA, D.I.C.E. and IGN are secondary qualitative craft lenses only: controls/readability, pacing/completion, multiplayer coherence, art/audio consistency and technical confidence. No AAA numeric scale or IGN conversion changes the Handshake score.

Required submission fields remain title, cover, description and project URL. Official-rules deadline: **October 30, 2026, 11:59 PM Pacific**; promotional mission page says October 31. Use the rules deadline.

Primary sources verified by the competition juror:
- [Official rules](https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0)
- [Handshake mission](https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/)

Secondary references retained from the earlier panel (not newly certified rule summaries): [BAFTA](https://www.bafta.org/awards/games-rules/), [D.I.C.E.](https://www.interactive.org/awards/voting_rules.asp), [IGN](https://ign-corp.squarespace.com/review-practices).

## Fresh morning validation

Run window: October 28, 2026, approximately 07:28–07:43 PDT; Node v24.22.1, Windows x64. All source/tests were at audited HEAD with no tracked edits.

- `npm run check`: **34 JavaScript files passed**.
- `npm test`: **79/79 passed**, zero failed/skipped, outside the network sandbox with approved loopback. The initial sandbox attempt failed WebSocket setup; it is not the accepted transport result. No tests or source were weakened.
- `npm run measure -- --duration=10 --rooms=2 --players=6 --isolated`: **exit 0**, shutdown marker true; 619 host snapshots; interval p95/p99 46.78/48.31 ms, ACK p95 9.82 ms, tick-work p95/p99 8.09/10.24 ms. Zero unexpected disconnects, socket errors, input failures, probe rejections or server input rejections.
- Tick p95 slightly exceeds the provisional <8 ms budget. This short sample supports local transport function, not performance acceptance. Recent-window percentiles are not full-run distributions.
- Server-only RSS in that short probe: 63,623,168 → 79,470,592 bytes; after 31.01 seconds recovery 80,285,696 bytes, two rooms remain. Rooms need not expire in 31 seconds; configured completed-room TTL is longer. No leak-free verdict.
- Local `/healthz`: HTTP 200 and `ok: true` in an ephemeral loopback server. This is not public health/deployment proof.
- Native browser discovery timed out after five minutes. Fallback used installed headless Edge through bundled Playwright, without installing tools. Final run exited 0: two independent contexts joined with 2/6 rosters, observed 1-of-2 intro vote then shared completion, entered Floor One, switched camera, selected with Q and restored 2/6 after reload. Initial retries exposed probe readiness/visibility mistakes: wait for CONNECTED before Create; the restored count is deliberately hidden in the running responsive HUD, so verify text state rather than visibility. These were corrected in the temporary probe, with no project changes.
- Fresh touch emulation: 390×844 target bounds x228/y554,154×44; 844×390 x713/y154,123×44. This proves bounds under emulation, not physical touch, rotation or full HUD usability. No physical device was attached. No fresh human Barkwing/combat/portal/full-campaign acceptance is claimed.
- Final browser diagnostics: no page exceptions observed; one console resource-404 error remained unattributed. Do not claim clean consoles or assume it is harmless. Temporary browser contexts and loopback servers were closed in `finally`; no live room codes/tokens were printed or preserved.

## Overnight endurance artifact reviewed this morning

`reports/errors/isolated-soak-2026-10-28-0649.json` exists, parses and records a completed 1800-second, two-room, six-probes-per-room run with `serverShutdownVerified: true`. Matching stderr log is zero bytes. SHA-256: `D1242F2C78D2DE5A4775B5324090B14310940BD8EE542F7BA5073D70F188725C`. Artifacts remain ignored and unstaged. No source SHA is embedded in the aggregate; the filename/tooling context supports provenance but is not an immutable exact-revision stamp.

- 108,025 observed host snapshots; recent-window interval p95 46.95 ms, ACK p95 7.35 ms, final recent tick p95 6.81 ms. All five failure/rejection counters zero.
- Isolated server heap 9,729,400 → 56,200,144 bytes; RSS 61,984,768 → 243,040,256 bytes. Sampled peak RSS 243,613,696 bytes; 181 memory samples.
- After 31.02 seconds recovery: heap 34,697,784, RSS 237,461,504 bytes; two rooms remain. Memory attribution/stability and full expiry acceptance remain open; unforced GC and room retention prevent a leak diagnosis.
- This advances the old launch-only evidence to a completed transport aggregate. It does not prove continuous campaign, browser frame time, phone performance, public WSS, restart behavior or full release endurance. The older shared-process soak is separately documented in `reports/OVERNIGHT_SOAK_RESULT_2026-10-28.md`.

## Judge-facing artifact and gameplay inspection

| Item | Current evidence | Remaining gap |
| --- | --- | --- |
| Title | `Dungeon Core Crawler` in DOM and submission draft | Final deployed title check |
| Cover | Actual canonical dusk guardian confrontation visually inspected by juror; ledger SHA matches `B7332DB53BB3D3D91E1D8540BDF3E2433A3DBD2C7738F2E2E7D1E2CA993A820B` | Rights/input terms and deployed crop/load acceptance; 3.25 MiB PNG has no measured mobile budget |
| Description | Honest draft in `docs/SUBMISSION_PACKAGE_2026-10-28.md`, separates cover concept from procedural runtime | Match eventual deployed SHA; README still says 33 checks and only Floor Four progression |
| Live URL | Repository records proposed domain/host instructions and `render.yaml`; no assigned origin/deployed SHA verified | Public state **UNVERIFIED**, not proof that no deployment exists anywhere. No guessed host probed; HTTPS/WSS/origin/restart/rollback acceptance missing |
| Asset provenance | `docs/design/ASSET_LEDGER.md` records cover origin/hash/dimensions and unpromoted concepts | Complete rights/dependency/audio/production inventory missing; no finished models/rigs/music claimed |
| Gameplay capture | No continuous gameplay video found in repository inventory; local QA screenshot referenced in touch report | Honest runtime screenshots and continuous human campaign/capture missing |
| Victory/results | Source `server/server.js` still invokes `restartStrongerCycle(room)` after Floor Five; integration test expects cycle two | Server-owned results and explicit optional continuation absent |
| Airborne targeting | `server/combat-target.js` plus replay/range/stale-ID tests; Q/dropdown, touch cycle, selection ring implemented | Actual browser Barkwing encounter and physical simultaneous touch acceptance missing |
| Phone | Historical 390×844/844×390 emulator targeting documented in touch milestone | No physical model/OS/browser evidence, physical rotation/safe-area/multitouch/audio/background acceptance; historical HUD obscures enemy health/ring |

## Changes since 71/100 HOLD

**Implemented/proved progress:** validated server target intent; desktop and touch selection/feedback; protocol-boundary tests; 72 → 79 fresh passing tests and 30 → 34 syntax-checked files; submission draft and initial asset ledger; longer/bounded/isolated measurement and completed overnight transport aggregate.

**Still open:** verified public playable link, real computer-plus-phone session, explicit victory/results, continuous gameplay capture, complete rights/production inventory, crowded phone HUD, browser Barkwing combat, public origin/restart/rollback and memory acceptance. Fresh browser creation/reconnect passed after correcting probe synchronization. The unattributed resource 404 and full runtime/device acceptance remain open.

## First demo steps and release priority

1. From `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler`, run `npm start`. Open `http://localhost:3000` on that computer using the default port; if configured differently use the printed port. `0.0.0.0` is a bind address, not a public URL.
2. Wait for connection and usable Create/Join controls. If the page remains connecting, inspect browser module/CDN errors before continuing; this morning's successful retry waited for CONNECTED before creating.
3. In two independent browser sessions use distinct explorer names. Create on the first, join using its four-character code on the second; compare two-human rosters. Keep codes/tokens out of published evidence.
4. Each human votes to skip the Guild briefing; confirm shared completion, then host selects Begin expedition.
5. Focus the viewport; move with WASD/arrows, Q cycles targets, Space strikes within reach and clear path. Compare enemy health in both sessions, switch camera, claim supply (G), cross an unlocked portal (E), reload one client and verify same-process identity/state continuity.
6. Present the above as a local desktop rehearsal only after it passes. Physical phone uses a separately verified reachable address; phone localhost refers to the phone. Do not promise victory/results or public access.

Next release order: complete explicit results/continuation; investigate the remaining resource 404; verify authenticated hosting path and exact deployed SHA/HTTPS/WSS; execute the real phone checklist; capture honest media and finish rights/copy; resolve memory/public security/restart/rollback gates. Existing deployment/production-asset authorization does not establish provider access, billing selections or evidence. No provisioning or repeat billing-choice request occurred in this audit.

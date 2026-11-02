# Independent animation, camera, and phone evidence audit

Date: 2026-11-01. Lane: Animation and Camera QA. Disposition: partial local verification; phone recovery and asset promotion remain open.

## Candidate and scope

Repository: `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler-post-release-polish`.

Branch: `post-release/preview-polish-2026-11-01`. HEAD: `cbe3839672018cb7928deb02eb0fc4f9fb3bbdea`.

This is a read-only audit of source, local focused tests, retained capture evidence, and the existing Run 05 GLB. The sole authored artifact is this report. No production source, Blender/Spline asset, board, or existing report was changed. No new live browser, physical phone, Blender playback, publication, or deployment test was performed.

Concurrent worktree edits existed and expanded during this audit, including TASKS.md, client/audio.js, docs/NOTION_TASK_BOARD.csv, server/floor-three.js, server/server.js, tests/floor-three.test.js, and tests/warning-audio.test.js, alongside untracked generated evidence. Test results therefore describe the inspected working files, not a sealed clean release revision. Other-agent work was preserved.

## Acceptance classification

| Area | Structural evidence | Visual evidence | Current disposition |
| --- | --- | --- | --- |
| OWNER-004 phone loading/recovery | Renderer has context-loss pause/restoration handling; app exposes recovery text and reload action. No test matching contextLost, webglcontextlost, webglcontextrestored, or graphics-state was found in tests/*.test.js. | Historical owner report records phone lag/freeze and reload/phone restart. No fresh physical reproduction or request/GPU trace. | OPEN. Recovery implementation is not evidence that the reported failure is fixed. |
| Camera modes | Focused tests pass for local preference persistence/fallback, finite targets, normalized modes, and non-singular top-down up-vector. Default is angled. Camera changes remain client presentation. | Retained desktop angled and top-down screenshots visibly differ. | STRUCTURAL PASS; retained visual partial pass. Physical-phone switching, framing during movement, and persistence still require owner/device evidence. |
| Runtime Barkwing altitude | Node tests verify airborne actor height, ground selection marker compensation during hit scale, snapshot immutability, and removal. | Wings are visible above the arena; crowded boss/player overlap remains in inspected captures. | STRUCTURAL PASS; visual separation acceptance remains PARTIAL. Do not equate nonzero Y with readable combat. |
| Barkwing Run 05 model | GLB parses and hash matches its handoff; 0 skins and only 2 wing-rotation animation channels. 1,716 triangles and 6 materials exceed the stated 1,200/1 minion caps. | Existing phone-sized studio render shows the revised broad wing shape. It is not a gameplay or physical-phone capture. | HOLD. Rig/combat-clip, budget, loader, runtime, performance, and approval gates remain open. |
| Runtime animation feedback | Tests cover procedural wing motion, reduced-motion pose, role silhouettes, snapshot-driven attack/ranged effects, down/connection presentation, and defeated-object disposal. | Still captures establish pose/readability only. This audit did not inspect the full recorded motion or audio. | PARTIAL. Not a complete authored animation-state validation. |
| Desktop/phone framing | Current renderer hash matches the retained capture report. | Desktop 1440x900, portrait 390x844, and landscape 844x390 inspected. Portrait boss obscures much of the player; wing/crown silhouettes overlap. Landscape increases visible arena but reduces detail size. | Retained browser-size evidence only. Actual touch controls, device pixel ratio, GPU stability, and current UI changes are not proven. |

## Fresh checks

Command, run at the repository root:

```text
node --test tests/client-ui.test.js tests/barkwing-render.test.js tests/character-render.test.js
```

Result: **22 passed, 0 failed, 0 skipped; exit 0; duration 241.8877 ms**. These use Node test doubles; they do not render real WebGL or exercise physical phone hardware. The full test suite was not rerun by this audit lane.

An independent read-only GLB binary/JSON inspection verified magic, version 2, declared file length, triangle count, materials, skins, animation channel target paths, and external URI dependencies:

```text
art/blender/exports/barkwing-sprint-run-05/barkwing-camber.glb
SHA256 48d7ea7d9e52add17b8b2892e2cd2b64a5309ad4e304d8e2dc531168ee09e583
164680 bytes; 1716 triangles; 6 materials; 0 skins
02 Left leaf wingAction: 1 rotation channel
02 Right leaf wingAction: 1 rotation channel
External URIs: none
```

Channel existence does not prove playback quality, deformation, blend transitions, bounds, or root motion. No attack, hit, defeat, or skeletal deformation claim can be made for this export.

## Evidence inspected

Paths below are relative to the repository root identified above.

- `AGENTS.md`, `docs/GIT_WORKFLOW.md`, `docs/AGENT_EXECUTION_PLAN_43_TASKS_2026-11-01.md`, and `docs/NOTION_TASK_BOARD.csv` establish ownership and the still-open owner gates.
- `reports/OWNER_DEVICE_QA_2026-10-31.md` records Marcus operating laptop plus physical iPhone, historical lag/freeze, and limits of the media review. One person using two devices does not establish coordinated two-human acceptance. Original private footage was not published or reprocessed here.
- `reports/POST_RELEASE_VISUAL_RECOVERY_2026-11-01.md` and `docs/evidence/post-release-visual-pass-final/report.json` describe retained local Chrome/SwiftShader capture evidence. Its renderer SHA256, `ee4c684a20faa984371bdff063ee9c092999a9b3ea952d8390f536d031e66740`, matches the freshly inspected `client/render.js`. This binds the renderer, not the entire current application or server revision. The capture uses elevated fixture health and cannot prove normal-health campaign balance.
- Images opened in this audit: `docs/evidence/post-release-visual-pass-final/boss-wing-rootling-angled-1440x900.png`, `boss-wing-rootling-top-down-1440x900.png`, `boss-and-minions-angled-390x844.png`, and `boss-and-minions-angled-844x390.png` within that same folder.
- `docs/evidence/post-release-visual-pass-final/dungeon-core-gameplay-canvas.webm` exists as retained recording evidence. This audit did not play it, score its complete animation sequence, or infer audio from a canvas capture.
- `reports/BARKWING_POLISH_RUN_05_HANDOFF_2026-11-01.md`, `art/blender/renders/barkwing-sprint-run-05-export/review-manifest.json`, and the inspected `phone-angled.png` bind a studio review to the Run 05 model. Historical 44/100 HOLD is the handoff's provisional score, not a new independent jury score.
- `client/render.js`: camera defaults/modes near lines 183 and 437-473; context events near 229-246; Barkwing animation near 1411; render loop near 1565; hit feedback near 1599. Camera lerp and procedural feedback do not modify authoritative simulation coordinates.
- `client/app.js:635-654`: reload handler, graphics recovery text, restored state, and arrival acknowledgment. Error text alone does not diagnose whether the original failure was resource, WebGL, network, or host related.
- `tests/client-ui.test.js`, `tests/barkwing-render.test.js`, and `tests/character-render.test.js` provide the fresh focused results above.

## Missing measurements and captures

1. **OWNER-004:** exact candidate SHA, frontend URL, Socket.IO endpoint, phone/OS/browser version, orientation and DPR; cold versus warm load timings; failed resource URL/status or error; console errors; context-loss/restoration timestamps; loading-to-first-frame time; frame interval p50/p95/p99 and longest stall; network RTT/disconnect timing. Record memory only if available, rather than inventing an estimate. Redact room codes, names, tokens, and unrelated tabs before sharing.
2. **Recovery behavior:** demonstrate renderer context loss, recoverable restoration, persistent failure/reload fallback, and whether network session and input state remain coherent. Distinguish graphics loss from Socket.IO disconnect. A phone restart is not an acceptable recovery demonstration.
3. **Camera and separation:** short clips in both camera modes and both phone orientations while moving, attacking, receiving damage, and targeting an airborne Barkwing beside a Sentinel. Keep player, ground target cue, wing silhouette, and dive warning readable without crown/actor ambiguity.
4. **Animations:** actual playback and exported-runtime evidence for idle/move, attack, hit, defeat, and any required revive state; transition/blend behavior, finite geometry and bounds, foot/ground or flight clearances, and reduced-motion handling. The existing model's two rigid wing tracks do not satisfy this list.
5. **Performance/asset promotion:** bring the same candidate within approved triangle/material budgets or obtain an explicit budget revision, then measure the served asset and animation cost on the target phone. No runtime promotion is recommended from studio renders alone.

## Smallest reproducible next QA step

Use one exact local candidate and one disposable browser session. Record its SHA and URL, join a room, switch angled/top-down, and capture a normal-render baseline. Through a scoped browser test harness, request `WEBGL_lose_context` from the actual game canvas, invoke loss once, then restoration once if supported. Observe the recovery message, paused rendering, first resumed frame, absence of duplicate render loops, and continued input/session behavior. Record unsupported-extension results as blocked, not passed. This separates one browser recovery mechanism from the unresolved phone report without changing gameplay or assets.

Then Marcus should run three cold and three warm loads on the physical phone against the same identified candidate, recording the measurements above and one laptop/phone reconnect sequence. Capture background durations below and above the documented 30-second grace separately, and test both camera orientations during crowded combat. If a freeze occurs, preserve resource/console/context evidence before reload where possible. Leave OWNER-004 open until this reproduces the fault or demonstrates the accepted recovery behavior on the actual device.

The separate next asset step is an approved, bounded continuation of the existing Barkwing candidate: budget correction, required motion states, export validation, then runtime readability/performance comparison. This report does not authorize a redesign or production integration.

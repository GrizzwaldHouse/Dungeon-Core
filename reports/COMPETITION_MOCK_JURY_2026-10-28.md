# Dungeon Core Crawler competition mock jury — October 28, 2026

## Decision

**Panel score: 71/100 — HOLD for submission.**

The current game is a strong technical multiplayer prototype with a distinctive world direction. It is not yet judge-ready because an external judge cannot open a verified public URL, the intended computer-plus-phone experience lacks direct device evidence, the final campaign beat automatically restarts instead of presenting victory/results, airborne targeting is unclear, and the playable presentation does not yet match the cover and concept art.

Judged runtime baseline: `8cde2e1024ebb32ca545bc3ec40e11c25f3b7ce6`; runtime code is unchanged from `d637aabdcd8e4c019de746f976cd6bc8eeb11435`.

## Real competition rubric

The Handshake official rules use four equally weighted criteria. Each is scored from 1 to 5 and contributes 25%:

1. Execution
2. Creativity
3. Usefulness / Value
4. Polish & Thoughtfulness

Round Two applies the same criteria to the top 20 entries. The required submission fields are project title, cover image, description, and project link/URL. The official rules set the entry deadline at **October 30, 2026, 11:59 PM Pacific**, even though the public mission page says October 31. Use the official-rules deadline.

Sources:

- Handshake mission: https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/
- Official rules: https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0

## AAA craft lens

There is no universal numeric “AAA grading scale.” This audit uses three established industry approaches as a secondary diagnostic lens:

- BAFTA considers game design through innovation, mechanics, controls, world structure, pacing, and second-to-second play, with separate multiplayer, art, audio, narrative, animation, new-IP, and technical categories.
- D.I.C.E. assigns specialist craft voting to developers with the relevant expertise and uses ranked peer voting across design, direction, art, animation, audio, story, technical achievement, online play, and game-of-the-year categories.
- IGN uses a descriptive 10-point critic scale. A score around 7 is “Good,” 8 is “Great,” and 9 is “Amazing”; it explicitly treats the score as a summary of the reviewer’s experience rather than an objective formula.

Sources:

- BAFTA Games rules: https://www.bafta.org/awards/games-rules/
- D.I.C.E. voting rules: https://www.interactive.org/awards/voting_rules.asp
- IGN review practices: https://ign-corp.squarespace.com/review-practices

## Independent panel scores

| Judge | Execution | Creativity | Value | Polish | Total | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| A — AAA technical director | 20/25 | 20/25 | 15/25 | 15/25 | **70** | Hold |
| B — player experience and release QA | 20.5/25 | 19/25 | 18.5/25 | 16/25 | **74** | Hold |
| C — competition and portfolio juror | 19/25 | 21/25 | 16/25 | 12/25 | **68** | Hold |
| **Panel average** | **19.8/25** | **20/25** | **16.5/25** | **14.3/25** | **70.7** | **Hold** |

The rough IGN-style crosswalk is **7/10 — Good**. This label is advisory and is not part of Handshake scoring.

## Evidence accepted by the panel

- `npm run check`: 30 JavaScript files passed.
- `npm test`: 72 of 72 tests passed.
- Fresh four-second, two-room, six-players-per-room local probe: snapshot interval p95 46.38 ms; server tick work p95 7.74 ms; input acknowledgement p95 11.01 ms; zero rejected inputs.
- Two local browser tabs created and joined one room, completed the shared intro vote, started Floor One, changed camera modes, restored a session after reload, exercised a touch-sized action, unlocked browser audio, and kept both consoles clean.
- The authoritative server owns movement, collision, combat, encounters, portals, inventory, rewards, reconnect continuity, and revisioned snapshots.
- The title and tracked Deepwood cover are present.

Limits: the performance probe is too short to prove memory stability. Browser emulation is not a physical-phone result. Automated progression tests are not a continuous human-observed Floor One-to-Floor Five playthrough.

## Judge-visible strengths

1. The 30 Hz authoritative multiplayer architecture, action replay protection, room isolation, reconnect rules, deterministic encounter modules, and automated coverage are portfolio-level technical strengths.
2. Four-character accountless rooms and zero-install browser play directly match the competition mission.
3. The mysterious Guild, dusk frontier, shifting vaults, Deepwood and Permafrost guardians, shared intro decision, anti-rush exploration, personal cache rights, and revive-oriented party AI create a recognizable identity.
4. Accessible labels, live-region restraint, reduced-motion support, touch controls, recovery states, and two camera modes show unusual thoughtfulness for a prototype.

## Blocking weaknesses

1. **No live URL:** the official entry requires a project link. `render.yaml` and a deployment runbook are configuration, not a deployment.
2. **No real-device proof:** computer-plus-phone join, touch, rotation, audio unlock, portal, combat, reconnect, and shared state are unverified.
3. **No judge-readable ending:** Floor Five automatically starts a stronger cycle. A victory/results screen and explicit optional continuation are needed.
4. **Unclear airborne combat:** “nearest enemy” is informational; Barkwings lack explicit server-validated target intent, clear selection, and a readable runtime silhouette.
5. **Presentation gap:** the cover and concept boards promise a much richer art direction than the procedural runtime scene currently delivers.
6. **Submission package gap:** README evidence is stale, there is no continuous gameplay capture, and asset provenance/licensing is incomplete.
7. **Endurance/security gap:** no 30-minute soak, public CORS/origin check, room-code abuse/rate-limit review, or public restart/reconnect proof.

## Submission-field status

| Required field | Status | Evidence / action |
| --- | --- | --- |
| Project title | Ready | `Dungeon Core Crawler` is consistent in the client and repository. |
| Cover image | Ready with provenance follow-up | `client/title-cover-deepwood.png` is tracked and used. Record its generation/source and usage rights in the asset ledger. |
| Description | Needs update | README is clear but its test count and progression status are stale. Create concise judge-facing copy that matches the deployed build. |
| Project URL | Blocking | No verified public HTTPS/WSS deployment exists. |

## 48-hour score-raising order

### P0 — external access and submission validity

1. Restore a deployment path. The GitHub remote exists, but `gh auth status` reports an invalid token. The DigitalOcean provisioning skill is installed, but its required authenticated DigitalOcean app tools are not exposed. Render configuration exists, but no Render account connection is verified.
2. Deploy the exact reviewed candidate to a single Node/WebSocket service.
3. Verify `/healthz`, HTTPS/WSS, clean startup/shutdown, two independent devices, reconnect after restart, and rollback.
4. Record deployed SHA, public URL, host plan, cost/limits, and rollback method.

### P0 — judge comprehension

1. Replace automatic Floor Five restart with server-owned victory/results and a host-only, replay-safe “continue harder cycle” choice.
2. Add explicit validated Barkwing targeting, desktop/touch selection, selected-target feedback, and an approved readable flying silhouette.
3. Fix the intro-completion status mismatch observed on the host and tighten the crowded 390 x 844 HUD.

### P0 — submission package

1. Update the public description and evidence to the exact deployed revision.
2. Add the live URL, cover, three to five honest runtime screenshots, controls, and a 60–90 second continuous demo showing two clients, intro voting, movement, combat, revive, portal progression, victory/results, and reconnect.
3. Add an asset provenance/licensing ledger; stage only approved optimized assets.

### P1 — release confidence

1. Extend the measurement tool beyond its current 60-second cap and run the 30-minute soak.
2. Perform room-code abuse, payload, origin/CORS, logging/redaction, CDN failure, and reconnect-token review.
3. Run the complete physical computer-plus-phone acceptance checklist and preserve evidence.

## Deployment and asset authorization state

The user has explicitly authorized deployment and production-asset creation. That authorization removes the earlier policy gate, but it does not supply missing platform authentication, a billable DigitalOcean region/size choice, DNS values, or asset provenance. Those must still be recorded before external changes or publication claims.

## Re-score gate

Run the three independent judges again only after all four conditions are true:

1. A public URL opens and supports a real two-device session.
2. Victory/results and explicit continuation are visible.
3. Airborne targeting works on desktop and touch.
4. The judge-facing description, media, and asset ledger match the deployed revision.

Target for the next panel: **85/100 or higher with no individual HOLD caused by submission validity.** This target is internal, not an official Handshake threshold.

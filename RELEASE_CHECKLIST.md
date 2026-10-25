# October 30 release gate

- [x] Recoverable local milestones exist for the authoritative mock-party and client-feedback/concept baselines; no secrets or ignored files were staged.
- [x] `npm run check`, `npm test` (56/56), and local 2-player plus 12-client `npm run measure` baselines pass; the enhanced probe records snapshot bytes and memory deltas.
- [ ] Two real clients traverse all five floors and a stronger reset cycle without a stuck portal or duplicate reward.
- [ ] Six-player room remains isolated from a second room; disconnect/rejoin, down/revive, host departure, and party wipe are exercised.
- [ ] Mock-party AI visibly explores independently, attacks enemies and bosses, responds to a downed human, performs a server-validated revive, and resumes play; deterministic tests and recorded browser evidence exist.
- [ ] Every visible wall, pillar, secret boundary, rune, warning, cache, and portal has consistent server collision/range behavior.
- [ ] Desktop keyboard and mobile touch controls work; reduced-motion, legibility, audio toggle, and error messages are reviewed.
- [ ] Boss phases and minion caps, personal loot, floor XP, anti-rush, 45-tick warnings, and 30 Hz snapshots have test and browser evidence.
- [ ] Public HTTPS staging on an authorized Node/WebSocket host passes room creation, multi-client join, reconnect, and health checks.
- [ ] README under 400 words and production optimization notes match measured behavior.
- [ ] Marcus reviews the Figma direction and Notion acceptance board; a final go/no-go is recorded before publication.
- [ ] Marcus approves one of three character/enemy design directions before any Blender, motion, or Unreal-derived art replaces the tested procedural visuals.

The [release and access plan](docs/OCT30_RELEASE_AND_ACCESS_PLAN.md) and [test plan](docs/PUBLISH_READINESS_AND_TEST_PLAN.md) provide the broader rubric. Current status: **no-go, integrated candidate still needs end-to-end proof**.

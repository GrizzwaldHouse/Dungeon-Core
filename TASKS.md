# Five-floor implementation board

Status is evidence-based as of October 24, 2026. An unchecked task is open even if source exists.

- [x] Preserve existing authoritative movement, room codes, collision, and first-floor Sentinel source.
- [x] Implement isolated unit-tested floor-two boss sequence and floor-three finite waves/resources.
- [x] Implement isolated unit-tested floor-four rune trial and floor-five Warden phases.
- [x] Add server integration candidate for five-floor transitions, rest spaces, personal supplies, bounded down threat, and stronger-cycle reset.
- [x] Add desktop and touch action controls, procedural sound, warning/item/rune markers, and floor objectives.
- [x] Pass a two-human transport-free first-floor to Keeper integration check with one-time XP and recovery state.
- [x] Pass a transport-free progression check through both floor-two bosses and floor-three resources into the floor-four trial.
- [x] Pass a fresh full Socket.IO regression suite for the integrated authoritative mock-party/client-feedback candidate: 54 tests passed on October 25, 2026.
- [x] Add a server-owned Deepwood encounter after Floor Three recovery; two health gates summon bounded airborne Barkwings and Rootlings, then the existing Floor Four rune trial continues. Automated integration and unit checks passed October 27.
- [x] Add a server-owned unanimous intro skip vote for connected human players, with a 50-second timeout, disconnect/leave re-evaluation, private voter identities, and an accessible lobby control. Automated state, transport, and client checks passed October 27.
- [ ] Add explicit server-validated target intent and desktop/touch target selection for airborne enemies; give Barkwings a readable approved flying silhouette and verify it in two browsers.
- [ ] Complete the ice guardian and player mage status/counterplay; browser-check the Quest Master intro vote in two clients and on a phone; keep the existing bosses and five-floor ending.
- [ ] Demonstrate floor-one to floor-five progression in two real browser clients, including disconnect/rejoin, revive, personal cache claims, trap timing, boss phases, and cycle reset.
- [ ] Demonstrate four server-owned mock teammates independently investigating, selecting enemies/bosses, attacking, detecting a downed human, attempting and completing a safe revive, then resuming the objective. Host-orbit motion does not satisfy this gate.
- [ ] Capture a reviewable gameplay recording or, if Codex recording remains unavailable, an explicitly incomplete screenshot sequence covering exploration, boss combat, damage/down, mock revive assistance, and resumed play.
- [ ] Verify touch controls and audio unlock in a real phone-sized browser and at least one mobile device.
- [ ] Audit rendered geometry against authoritative collision for every floor; fix any mismatch.
- [ ] Review Figma design direction with Marcus; implement approved polish and accessibility changes.
- [x] Save Marcus's selected Deepwood image as the canonical title art and agent art contract on `design/dusk-qa` at `62d2c593d3df3d8df55cb27c05749765297dadd4`.
- [ ] Browser-check the selected cover at desktop/mobile sizes, then integrate the approved design branch into the release candidate without losing gameplay changes.
- [x] Marcus approved Option 3 (Expedition Company) as the visual style on October 25, 2026.
- [ ] Review three Option 3 variants with tree/ice Sentinel Guardians, minions, and mage effects; select specific designs before Blender production. See `docs/design/concepts/ELEMENTAL_GUARDIANS.md`.
- [ ] Replace automatic post-Floor-Five restart with victory/results and an explicit optional harder-cycle choice; verify one-time rewards and stale/repeated portal rejection.
- [ ] Plan and implement the requested elemental bosses and mage statuses after contract and floor placement review; keep all existing gameplay scope.
- [ ] Import the 26-card CSV into signed-in Notion and maintain status with commit and test evidence.
- [ ] Complete performance proof: local 2-player and 2-room/12-client timing plus serialized snapshot-size baselines now pass, but public-network latency and long-session memory growth still need measurement.
- [ ] Complete public staging, security/configuration review, HTTPS/WebSocket smoke checks, and exact-candidate go/no-go audit before publishing.

See [docs/NOTION_TASK_BOARD.csv](docs/NOTION_TASK_BOARD.csv) for owner, priority, date, acceptance condition, and user feedback fields per card.

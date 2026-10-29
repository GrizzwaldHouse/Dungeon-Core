# Five-floor implementation board

Status reconciled October 28, 2026. Checked implementation and automated evidence are separate from open browser, device, art-approval, and public-release gates. Current sprint evidence: [reports/barkwing-sprint-2026-10-28.md](reports/barkwing-sprint-2026-10-28.md).

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
- [x] Preserve and test explicit server-validated target intent and desktop/touch selection already present at `c8dc460`; cover malformed, stale/dead, foreign-room, range/LOS, cooldown, replay, downed, disconnect, and reconnect boundaries. Add readable procedural Barkwing wings, selection status, focus handling, and downed/disconnected selection reset; automated coverage passes October 28.
- [ ] Approve final Barkwing art and complete final-source desktop/touch browser review. Two independent IAB tabs exercised fixture-assisted selected airborne combat with matching HP and clean consoles before the final projection correction; this is partial runtime evidence, not full campaign or phone proof.
- [ ] Complete the ice guardian and player mage status/counterplay; the Quest Master intro vote passed a two-tab desktop check, but still needs the real phone pass; keep the existing bosses and five-floor ending.
- [ ] Demonstrate floor-one to floor-five progression in two real browser clients, including disconnect/rejoin, revive, personal cache claims, trap timing, boss phases, and cycle reset.
- [ ] Demonstrate four server-owned mock teammates independently investigating, selecting enemies/bosses, attacking, detecting a downed human, attempting and completing a safe revive, then resuming the objective. Host-orbit motion does not satisfy this gate.
- [ ] Capture a reviewable gameplay recording or, if Codex recording remains unavailable, an explicitly incomplete screenshot sequence covering exploration, boss combat, damage/down, mock revive assistance, and resumed play.
- [ ] Verify touch controls and audio unlock in a real phone-sized browser and at least one mobile device.
- [ ] Audit rendered geometry against authoritative collision for every floor; fix any mismatch.
- [ ] Review Figma design direction with Marcus; implement approved polish and accessibility changes.
- [x] Save Marcus's selected Deepwood image as the canonical title art and agent art contract on `design/dusk-qa` at `62d2c593d3df3d8df55cb27c05749765297dadd4`.
- [x] Preserve the canonical cover already integrated in the gameplay checkout, its same-origin route, and its verified SHA-256. The separate design worktree remains preserved.
- [ ] Browser-check desktop/phone cover crop, readable form interaction, join hides/leave restores cover, and loading/failure states on the exact final source; preserve the approved PNG.
- [x] Marcus approved Option 3 (Expedition Company) as the visual style on October 25, 2026.
- [ ] Review three Option 3 variants with tree/ice Sentinel Guardians, minions, and mage effects; select specific designs before Blender production. See `docs/design/concepts/ELEMENTAL_GUARDIANS.md`.
- [x] Replace automatic post-Floor-Five restart with server-owned victory/results and an explicit host-selected optional harder cycle (`06cf914`); automated tests cover one-time rewards, stale/repeated portal rejection, reconnect, and repeated continuation. Full browser ending remains open.
- [x] Cue each server warning window once (`c8dc460`); preserve synthesized warning regression coverage without claiming recorded orchestral or voice assets.
- [ ] Plan and implement the requested elemental bosses and mage statuses after contract and floor placement review; keep all existing gameplay scope.
- [ ] Import the 26-card CSV into signed-in Notion and maintain status with commit and test evidence.
- [x] Record a 30-minute isolated loopback transport/memory baseline with two rooms of six probes, zero transport/probe failures, and verified server shutdown on October 28. This measures snapshots/input and sampled process memory, not sustained campaign combat or leak freedom.
- [ ] Complete performance proof across final-source load configurations, authored-world long play, real devices, and public-network latency. See the sprint report for source and measurement limits.
- [ ] Complete public staging, security/configuration review, HTTPS/WebSocket smoke checks, and exact-candidate go/no-go audit before publishing.

See [docs/NOTION_TASK_BOARD.csv](docs/NOTION_TASK_BOARD.csv) for owner, priority, date, acceptance condition, and user feedback fields per card.

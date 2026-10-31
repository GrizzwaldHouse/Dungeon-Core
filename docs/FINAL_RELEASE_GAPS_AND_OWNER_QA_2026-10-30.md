# Dungeon Core release gaps and owner QA

## Released candidate

- Public URL: `https://dungeon-core-crawler.onrender.com`
- Deployed revision: `e641fb033876af134d7145a331ddd469bd73d275`
- Automated result at handoff: 124 of 124 tests passed.
- Included: five-floor authoritative campaign, victory and optional harder cycle, compact phone HUD, keyboard and touch controls, server-owned combat and progression, Deepwood encounter, Barkwings, downed and revive behavior, title cover, reconnect support, procedural audio cues, story chapters, and safe-start recovery.

## Not included or not proven in the competition release

| Item | State | Reason |
| --- | --- | --- |
| Physical computer plus phone full campaign | Not proven | It requires Marcus and a real phone. Headless and emulated viewports cannot substitute. |
| Six real human players | Not proven | Automated room and protocol tests exist, but a six-human public session was not recorded. |
| Finished Ice Guardian and player mage status counterplay | Deferred | These ideas arrived after the active five-floor contract and needed new combat, balance, art, and QA scope. |
| Finished Blender-quality characters, minions, rigs, and animation set | Deferred | The competition build uses tested procedural runtime silhouettes. Approved concepts were not production-ready web assets. |
| Fully authored five-floor environment matching the cover | Deferred | Collision-safe procedural rooms shipped. Replacing them needed asset budgets, parity checks, and phone performance proof. |
| Quest Master cinematic with finished video and voice | Deferred | Story chapters and skip voting exist, but a rights-cleared, synchronized cinematic was not completed. |
| Recorded orchestral score and final sound library | Deferred | Procedural cues shipped. Finished music, voice, and asset provenance require a separate production pass. |
| Continuous public gameplay video | Not captured | Exact-revision screenshots and deterministic evidence exist, but no complete public campaign recording was produced. |
| Fresh 90-point strict visual-jury result | Not performed | The historical panel scored an earlier candidate 68.3. Final improvements were not blindly re-scored. |
| Full public performance and restart matrix | Partial | A 30-minute isolated loopback baseline exists. It does not prove sustained public combat, phone frame rate, or host restart behavior. |
| Custom domain and portfolio Vercel publication | In progress | Portfolio code and approved cover exist locally, but no verified Vercel preview or production deployment was returned. |
| Handshake submission receipt | Owner action | The final handoff did not contain a confirmed form submission receipt. |

## Owner desktop and phone acceptance

Record device, OS, browser, orientation, public URL, health revision, approximate time, and result. Keep room codes and reconnect capabilities out of screenshots.

- [ ] Desktop creates a room and phone joins with a different explorer name.
- [ ] Both rosters show the same two human players before starting.
- [ ] Intro vote resolves for the entire party.
- [ ] Keyboard and touch move different players without cross-control or stuck input.
- [ ] Portrait and landscape HUD leave the player, objective, enemy health, and portal visible.
- [ ] Zoom controls and camera preference work after rotation.
- [ ] Strike and target selection damage the same enemy on both clients.
- [ ] Each player can collect a personal supply without duplicating inventory.
- [ ] One player enters downed state and the other player or server-owned ally completes a revive.
- [ ] Health, inventory, objectives, boss phases, and floor number agree on both clients.
- [ ] Phone disconnects and rejoins with identity, XP, health, and inventory continuity.
- [ ] Sound unlocks after touch, toggles correctly, and warning, attack, damage, pickup, portal, victory, and loss cues are distinguishable.
- [ ] Portals do not repeat infinitely or skip beyond the intended transition.
- [ ] Floor Five shows victory results once and only the host can choose the optional harder cycle.
- [ ] No page exception, persistent loading state, clipped control, or unreachable button appears.
- [ ] Public `/healthz` still reports revision `e641fb033876af134d7145a331ddd469bd73d275`.

## Immediate decision order

1. Complete the physical device checklist.
2. Save the Handshake submission receipt.
3. Finish and verify the separate portfolio commit, Vercel preview, and production URL.
4. Park every new idea in the continuation board unless it fixes a verified blocker.
5. Begin post-release visual, story, elemental combat, and audio milestones from the approved board.

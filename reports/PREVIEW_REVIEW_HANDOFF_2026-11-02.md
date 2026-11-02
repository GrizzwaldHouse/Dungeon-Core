# November 2 local preview and owner review

Branch: `post-release/preview-polish-2026-11-01`. This candidate is local only. No push or deployment has been requested for this review.

## Integrated candidate

- Floor Three safe recovery and personal-claim edge cases were recovered in the prior `f3adc73` milestone.
- Results now reject gameplay actions after victory or defeat, hold a harder-cycle request until the authoritative stage changes, map errors to player-facing text, and describe a personal cache as "Collect your share".
- Two independent local Socket.IO clients confirmed personal pickup broadcasts and snapshots, one claim per eligible explorer, and repeat rejection. Within-grace reconnect rotated a token; after-grace reconnect rejected the old session while the host room continued.
- The current procedural Barkwing remains in the playable build. Run 5 Blender model is a review artifact, not a promoted runtime asset.

## Evidence and limits

After integrating the new client and protocol tests, `npm test` passed 158/158 with loopback permission and `npm run check` checked 67 JavaScript files. Focused UI/mobile tests passed 23/23. A separate Chrome/SwiftShader run captured ten desktop and viewport-emulated phone views with zero reported browser errors, WebGL active, and no horizontal overflow. Those captures use a server damage fixture for the loss screen and are not a normal campaign proof. See `C:\AgentForge-Control\10_OUTPUTS\DungeonCore_OWNER007_QA_2026-11-02\report.json`.

The local preview server is configured on port 3002. Health returned `ok: true` and `tickHz: 30`; the in-app browser displayed the title and `CONNECTED`. This server is a live process and may stop when the session ends. Run `node server/server.js` from this branch for a persistent replacement, with a free port selected through the supported configuration.

## Marcus approval checklist

1. Open `http://localhost:3002/` on the MSI computer. Enter a new name and create a room. Confirm the title art remains visible and that "Collect your share" communicates personal loot.
2. Join the same room on the physical iPhone using this computer's LAN address and the same port, if LAN/firewall permits. `localhost` on the phone points to the phone, not the MSI computer. Test portrait, landscape, keyboard open/closed, and a long drag from the movement pad across a notice.
3. Test two separate claims on one recovery cache. Each explorer should get one charge and see their own claim reflected; the other explorer may still collect their share.
4. Background the iPhone for less than 30 seconds, near 30 seconds, and longer than 30 seconds. Report whether it rejoins or gives a clear expired-session route. Repeat from a completed run if practical.
5. Review victory and defeat wording, enabled actions, and leave-to-title behavior. Listen to sound on phone speakers and headphones. Note any crowding, selection popup, stuck movement, or slow load.
6. Compare the Run 5 Barkwing top and phone-sized renders against the approved title reference. Approve continued refinement of this exact candidate or reject it. Model promotion is still HOLD at provisional 44/100.

Approval to push should be based on this local candidate and the recorded defects, not on the earlier public Render revision. The independent two-human campaign, physical Safari recovery, and 95-point visual matrix remain open.

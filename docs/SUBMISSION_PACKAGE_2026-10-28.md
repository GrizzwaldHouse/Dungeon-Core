# Dungeon Core Crawler — Handshake submission package

**Refreshed:** October 29, 2026

**Review basis:** `gameplay/release-integration`, local `HEAD` `ffa51260885bb0b03808099fe2a9cd12594a9226`

**State:** submission fields are prepared; live deployment and physical-phone acceptance are not verified.

## Confirmed contest and mission requirements

- The [official contest rules](https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0) require an entry in the Handshake AI Skills Studio **Create a Multiplayer Game** mission with a project title, cover image, description, and project URL. The entry window closes **October 30, 2026 at 11:59 p.m. Pacific**. Use this rules deadline even though the [mission page](https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/) advertises completing the mission by October 31.
- The [mission page](https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/) describes the target as a live, reusable multiplayer game at a public URL, joined by room code without logins or app installs, and usable from a phone or laptop.
- Contest eligibility in the official rules includes being an individual legal resident of a listed eligible country, at least 18 or the local age of majority, present in an eligible country at entry, and using an active Handshake account associated with the entry email. Check the full list and exclusions in the rules.
- The rules state that entry grants Handshake and OpenAI a worldwide, perpetual, royalty-free license to use the submission to promote the challenge and OpenAI services. Review and accept the actual terms knowingly before submitting.
- The rules weight execution, creativity, usefulness/value, and polish/thoughtfulness equally. They describe working, stable, demo-ready execution as the top anchor; this is judging guidance, not an additional entry field.

## Submission fields — ready to paste

**Title**

Dungeon Core Crawler

**Cover image**

Use the already selected, tracked project asset `client/title-cover-deepwood.png` (1774 × 887 PNG; about 3.4 MB). It depicts a party facing the Deepwood guardian. This is generated title/concept art, not a screenshot of the playable scene. Keep this exact image; do not substitute one of the unreviewed concept images.

**Project URL**

https://dungeon-core-crawler.onrender.com

This is the URL supplied for the live demo. It was **not independently reachable from this review environment**: the environment's DNS lookup returned “No such host is known.” That result does not establish that the service is down. Before entry, open the link on an ordinary desktop connection and on the target phone, then confirm the deployed build matches the reviewed candidate.

**Description**

> Dungeon Core Crawler is a cooperative browser dungeon for 2–6 players. One explorer creates a room and friends join with a four-character code—no accounts or app installs. The party explores a five-floor expedition, fights guardians, finds supplies, and helps one another through a shared world managed by a Node.js and Socket.IO server. Keyboard and touch controls let players move, select combat targets, and coordinate across desktop and phone browsers. I developed the existing project iteratively in OpenAI Codex, using AI-assisted planning, implementation, and code/test review. This accurately describes a Codex-based workflow; the project was not built entirely in ChatGPT Work. The playable dungeon uses procedural 3D visuals; the cover is separate generated concept art.

This wording describes the source and documented controls. Keep the phone sentence only after the real-phone checklist below passes. If it does not pass, replace “Keyboard and touch controls let players … across desktop and phone browsers” with “Keyboard controls support desktop play; phone compatibility is still being checked.” Do not claim a completed human campaign, public uptime, persistent saves, or a finished cinematic based on the local test record.

## Short demo script (about 3 minutes)

Use the submitted live URL and two independent clients, ideally the intended desktop and physical phone. Keep the room code out of any public recording. This script is an opening/co-op excerpt, not a claim that a full five-floor campaign has been recorded.

1. **0:00–0:25 — Set the scene.** Open the game on desktop and phone. Show the title, 2–6 player label, and “No account. No installer.” Say: “This is a cooperative browser dungeon. The host creates a room; friends join with a short code.”
2. **0:25–0:55 — Join the same party.** Enter distinct explorer names, create a room on desktop, and join from the phone with the displayed code. Show both clients displaying the same two-player roster. Each connected human votes to skip the Guild briefing; show the shared vote result, then let the host begin.
3. **0:55–1:35 — Move and coordinate.** Move each explorer independently. On desktop use WASD or arrow keys; on phone use the labelled touch controls. Show the different player positions on both screens and briefly demonstrate the alternate camera if it is comfortable on the phone.
4. **1:35–2:15 — Show shared combat.** Select a reachable enemy with the target control and attack. Show the selected-target feedback and the same server-owned enemy-health change on both clients. State that clients send actions and the server resolves the shared game state.
5. **2:15–2:45 — Show a cooperative objective.** Pick up a nearby supply and cross an available portal together. Confirm both screens show the same party/floor state. If an action fails, stop and describe the observed issue; do not edit state or splice in a separate run.
6. **2:45–3:00 — Close honestly.** Say: “That was a live multiplayer excerpt. The project has a five-floor campaign; this clip does not represent a complete human playthrough.” Mention results/stronger-cycle choice only if those states are reached in the actual deployed session.

If the live service sleeps, wait for it to wake and disclose the wait in the recording. Do not use mock players, test fixtures, debug controls, accelerated time, staged screenshots, or separate rooms as proof of two-human gameplay. A separate local automated-test summary may be described as local automated evidence only.

## Physical-phone QA checklist

Record the test date, exact deployed revision if available, phone model, OS version, browser/version, network, desktop browser, and any failure. Test on the actual public URL; an emulator or localhost run is not a phone result.

- [ ] Open the public URL directly on desktop and phone. Verify HTTPS, page title, cover/poster load, connection reaches `CONNECTED`, and there is no blocking error or unexpected paid prompt.
- [ ] Create a room on desktop; join from the phone using its code and a different explorer name. Confirm both screens show the same two-human roster. Try one invalid code and verify the page gives a recoverable error.
- [ ] Cast one Guild briefing vote on each device. Confirm the count updates on both, completion is shared, and the host can begin.
- [ ] Move both explorers independently using keyboard and touch. Check portrait and landscape, safe areas, browser/address-bar changes, keyboard appearance, readable text, and controls that are not obscured by the HUD.
- [ ] Use touch target selection and attack. Confirm selection feedback is visible, controls respond to direct taps, and enemy health/state agrees on both devices. Check movement, attack, target, pickup, and portal actions separately.
- [ ] Pick up a supply and cross an unlocked portal. Compare the roster, floor/objective, inventory, and visible enemy state on both clients.
- [ ] Background the phone tab briefly, return, and use the in-app reconnect flow if shown. Confirm the same explorer rejoins the same still-running room and the shared state is coherent. Record if the service restarted or slept; do not expect in-memory rooms to survive a server restart.
- [ ] Check audio only after a direct user gesture. Verify the sound toggle works and is understandable; note muted autoplay behavior rather than treating it as failure.
- [ ] Observe for at least 10 minutes of ordinary play if time permits. Note disconnects, stuck controls, rendering failures, battery/heat, and any browser or server errors. This is a smoke check, not an endurance certification.
- [ ] Capture screenshots/video only after masking room locators and any reconnect/session capability. Record findings; do not describe an emulator pass as physical-device proof.

## Remaining submission blockers

1. **Verify the public URL and deployed revision.** The link was provided, but this review environment could not resolve its hostname and no deployment record establishes which source SHA it serves. Open it on ordinary networks, confirm the lobby and `/healthz`, and verify the deployed revision is the reviewed candidate. Do not infer that the site is down from this environment's DNS failure.
2. **Complete real desktop-plus-phone acceptance.** Local checks and CSS/emulator evidence do not prove that the submitted live service works from a physical phone. Close the checklist's join, shared-state, touch, rotation/readability, and reconnect checks or describe the limitation honestly.
3. **Submit the four fields in the Handshake mission before the rules deadline.** This package does not submit the entry. Confirm eligibility and review the contest's broad promotional license before pressing Submit.

The current worktree has the documented October 29 local QA result of **43 JavaScript files syntax-checked and 106/106 tests passing**. This is local evidence only; it does not close blockers 1 or 2. The initial and extended public/release gates elsewhere in the repository (such as full-campaign human play, long endurance, rollback, and complete asset-license inventory) are not additional contest form fields; do not call them passed or required entry fields without a source saying so.

## Assumptions kept separate

- **Confirmed:** four submission fields, mission submission route, October 30 11:59 p.m. PT entry deadline, eligibility requirements, equal 25% judging categories, and the mission's public room-code/no-login/no-install/phone-or-laptop target are in the linked official sources above.
- **Not confirmed:** whether the supplied Render service currently resolves publicly, whether it serves `ffa51260885bb0b03808099fe2a9cd12594a9226`, whether it remains on a $0 plan, and whether real phones complete the flows. The repository's Render configuration and historical account notes are not live account/deployment evidence.
- **Workflow description:** the supplied correction and current project record support describing the work as iterative OpenAI Codex development with AI-assisted planning, implementation, and review. Do not say it was built entirely in ChatGPT Work.
- **Cover rights:** repository provenance records the image as generated project concept art and selected for the title. The project asset ledger does not certify broad commercial/redistribution rights for every input or dependency; the contest's explicit promotional license is a separate term the entrant must review.

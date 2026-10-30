# Phone gameplay and visual QA capture

Use one recording per short scenario. This is a test worksheet, not a claim that a scenario passed.

## Capture loop

1. Open the public game on the phone. Record the device model, OS, browser, orientation, URL, and approximate local time. Keep room codes, reconnect tokens, account details, and notifications out of shared clips.
2. Start the phone's built-in screen recording before tapping **Create room**. Keep a second player or the mock party in the room. Speak a short marker such as “bug one, floor four, down arrow” when something breaks, or note the video timestamp afterward.
3. Record 20–60 seconds around each event: before the action, the action, visible result, and any error. Take a still screenshot at the most informative frame. Capture a second still after rotating or changing camera mode if the issue is layout related.
4. Attach the clip and stills to this ChatGPT Work task. If video attachment is unavailable, attach 3–5 sequential stills with the approximate timestamps. Ask for one issue row per defect, severity, reproduction steps, expected/actual behavior, and a proposed fix. Keep the original clip until the issue is verified.
5. After a fix lands, repeat the same route in the same browser and one other browser. Compare before/after captures at the same orientation and floor. Mark the issue verified only after the phone behavior changes as expected.

## Scenario checklist

| Scenario | Record and inspect |
| --- | --- |
| Lobby and party | Create room, invite mocks, intro vote, start; fit, type size, contrast, scroll reachability. |
| Movement and recovery | Hold Up, release, press Down, cross a wall edge, rotate, background/return, **Reset position**; no stuck motion or floor reset. |
| First fight | Human targets/strikes before mocks finish enemy; enemy health, attack cue, player damage, healing and counterattack visible. |
| Portal and story | Clear objective, approach portal, active particles, enter, chapter appears once, dismiss and continue moving. |
| Trap | Approach from outside the trigger radius, identify tripwire before danger, observe warning, disarm or take damage, verify health feedback. |
| HUD and zoom | Portrait and landscape in Chrome and Brave; expanded/collapsed HUD, zoom out/in, bottom controls, toast and safe areas. |
| Full run | Two clients through all five floors, recovery rooms, results, explicit harder-cycle choice; record disconnect/rejoin once. |

## Issue card to paste with each upload

**Build URL and revision (if known):**
**Device / OS / browser / orientation:**
**Room type / floor / stage:**
**Video timestamp and screenshot number:**
**Steps:**
**Expected:**
**Actual:**
**Frequency:** once / sometimes / every time
**Severity:** blocker / major / minor / polish
**Visual notes:** text size, contrast, overlap, viewport occlusion, animation readability
**Retest:** pending / passed / failed

## Visual-polish review frame

Compare each image at actual phone size. The playable character, current objective, interactable portal/trap, enemy health, and at least one clear movement route should remain visible. The HUD must not overlap controls or feedback. Text must remain readable in portrait and landscape, including enlarged system text. A particle effect should signal an available portal without hiding its interaction area; reduced-motion mode should retain a static cue. Story art should identify the chapter as an illustration and leave a visible way back to play.

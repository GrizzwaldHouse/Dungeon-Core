# OBS recording steward

## Session role

The recording steward exclusively owns OBS controls during an active development session. The lead tells the steward when visible QA starts and ends. The steward verifies actual OBS state after each transition. A spawned agent is session-scoped; it is not an installed background recorder.

## Recording decisions

| Work phase | OBS action |
| --- | --- |
| Visible gameplay QA, controls, combat, multiplayer, visual comparison | Start recording and verify the recording timer before testing |
| Visible team progress or Notion task-board review | Start recording and verify the intended screen is captured |
| Headless Blender, builds, automated tests, code-only work, idle waiting | Stop recording and verify file finalization |
| Authentication, credentials, private account details | Stop recording before displaying sensitive content |
| Desktop locked or capture controls unavailable | Report recording state as unknown and defer visual QA recording claims |

Stopping means stopping OBS recording, not shutting down OBS or deleting recordings. Do not start streaming, change audio devices, change capture permissions, or install plugins as part of this role.

## Lead messages

Before visible work, send `START_VISUAL_QA` with scene, tested revision, viewport/device scope, and expected demonstration. Wait for `RECORDING_CONFIRMED` before claiming a recorded test.

After visible work, send `STOP_FOR_HEADLESS` with the test result. Wait for `STOP_CONFIRMED`; record the output path when OBS exposes it.

For a visible board review, send `START_TEAM_REVIEW`. This records the review; it does not itself authorize posting or modifying external boards.

## Evidence manifest

For each clip, preserve start/end time, recording path, revision, scene, test action, expected result, observed result, and evidence limits. Link captured clips in the existing QA report. Record headless tests separately. An OBS recording alone is not proof that a gameplay assertion passed.

If start or stop fails, refresh OBS state before retrying once. Never submit repeated toggles against unknown state. Preserve the active recording until state can be established.

## Reuse packet

Assign one recording steward per session with exclusive OBS ownership, the phase rules above, the tested checkout, and the evidence folder. Use the available supported desktop or OBS connector. Do not store OBS remote-control passwords in project files or logs. Report unavailable tools truthfully.

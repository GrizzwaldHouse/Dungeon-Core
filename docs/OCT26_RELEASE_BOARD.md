# Dungeon Core Crawler — October 26 release board (superseded)

The owner moved the full-design publication target to October 30, 2026. Continue from [the October 30 full-release and access plan](OCT30_RELEASE_AND_ACCESS_PLAN.md). This earlier board remains as a historical planning snapshot.

**Target date:** 2026-10-26 (America/Los_Angeles)  
**Lead:** ChatGPT Work system architect  
**Source of truth:** current repository state and fresh acceptance evidence, with `docs/PUBLISH_READINESS_AND_TEST_PLAN.md` as the complete rubric.

## Scope decision

The full rubric includes portal routing, anti-rush traps, floor progression, cooperative recovery, public operations, and two-browser proof. The October 23 audit estimated 27–47 focused working days of P0 work. Treat an October 26 release as **conditional**. Until the owner chooses otherwise, prepare a clearly labeled playable beta and keep the full-rubric launch blocked. A date does not turn an untested feature into a release claim.

**Owner decision pending:** beta versus full-rubric release; public host and off-machine Git destination. Record the answer here before deploying or writing public release copy.

## Ordered gates

| Order | Gate | Owner | Evidence required | Status |
| --- | --- | --- | --- | --- |
| 0 | Recoverable local Git baseline | Git steward | Reviewed explicit paths, clean baseline status, full commit SHA | **Done:** `712831bce7c72537030d35031ba15fb9e1e017e2` |
| 0a | Continuing Git discipline | Git steward / every agent | `AGENTS.md`, `docs/GIT_WORKFLOW.md`, explicit staging and SHA per milestone; daily stewardship check | **Active**; no remote or off-machine backup yet |
| 1 | Freeze a truthful release contract | Lead | Beta/full scope decision, implemented feature list, excluded features, target host | Pending owner answers |
| 2 | Complete one bounded dungeon floor slice | Gameplay agent | Server-owned transition, trap timing, one-time team reward; automated tests | In progress; verify before checking |
| 3 | Make the viewport and controls release usable | UI/UX agent | Focus-safe input, legible connection/HUD state, WebGL failure path, scene changes keyed to server state | In progress; browser proof pending |
| 4 | Protocol and concurrency QA | QA protocol agent | Fresh checks, 2/4/6 players, two rooms, malformed/replayed actions, disconnect/reconnect, collision parity | Pending revised build |
| 5 | Visual playtest | QA gameplay agent | Two independent browsers; create/join, movement, combat, wall/pillar/portal interactions, console and screenshots | Pending revised build and browser availability |
| 6 | Endurance and publish operations | Lead + QA | 30-minute soak, security review, chosen host config, public HTTPS/WSS two-device test, rollback | Pending host and build |
| 7 | Release decision | Lead + owner | All claims backed by fresh evidence, reviewed revision, explicit go/no-go | Pending |

## Three-day working sequence

- **October 23:** Preserve the repository before edits. Finish bounded server and UI milestones, each with a reviewed local commit. Write down the exact playable contract and open defects.
- **October 24:** Run automated protocol and collision checks against the merged milestones. Repair P0 defects. Run a two-browser playthrough and capture evidence if browser controls are available.
- **October 25:** Run endurance and accessibility checks, choose and configure a single-process Node/WebSocket host, establish an off-machine recovery copy, and validate the deployed candidate from two devices.
- **October 26:** Re-run acceptance checks on the exact candidate revision. Publish only if the chosen scope and all corresponding P0 gates pass; otherwise report the failed gate and continue the beta privately or delay launch.

## Agent handoff rule

Each agent starts with `git status --short --branch`, `git log -1 --oneline`, and `AGENTS.md`; owns distinct files; runs task-relevant checks; reviews an explicit staged diff; and reports a full local commit SHA with any remaining dirty paths. QA records **pass**, **fail**, **blocked**, or **not implemented** rather than inferring results from source or earlier reports. The Git steward checks recovery discipline daily. A local commit protects against accidental edit loss, but an approved remote or separate archive is still needed before publication.

## Go / no-go record

| Question | Required answer before public launch |
| --- | --- |
| What is the advertised scope? | A written list of features actually played and tested in the candidate revision. |
| Can two real browsers finish the advertised loop? | Capture the same room, movement, collisions, core gameplay, and reconnect with no blocking defect. |
| Does the server protect room state? | Pass malformed/replayed input, isolation, 2–6 capacity, 30 Hz cadence, and disconnect tests. |
| Can the build recover? | Local commit plus an off-machine copy, documented restart/rollback, and no secrets in the published artifact. |
| Does the public URL work? | HTTPS page and WSS session work from two devices against the exact release revision. |

If any answer is missing, mark **NO-GO** and record the specific blocker. Do not advertise unfinished dungeon or arena mechanics as shipped.

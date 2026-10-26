# Dungeon Core Crawler: Opening Story and Cinematic

**Status:** concept for review; not wired into the game and not rendered as a motion video
**Visual baseline:** Option 3, Expedition Company, with the user's preferred Crowned Wardens and Deepwood & Permafrost variants
**Date:** October 25, 2026

## Concept images

These images are approval concepts. They do not replace the current playable models or assert that the depicted rooms exist in the build.

- [Combined party and Warden design](concepts/expedition-combined-wardens-party.png)
- [Five-floor dungeon layout](concepts/dungeon-five-floor-layout.png)
- [Guild-to-dungeon story board](concepts/dungeon-origin-story-board.png)
- [Opening cinematic and dialogue UI board](concepts/opening-cinematic-storyboard.png)

## Story premise

The Guild sends a small expedition to a remote frontier where an old outpost has gone silent. The frontier sits between an ancient deepwood and a permafrost shelf. The forest is freezing from its roots upward, the weather boundary is moving, and a violet signal has appeared beneath the outpost. The expedition's charter is to find the source, mark a safe route, recover missing survey records, and bring every crawler home.

The dungeon is a buried system that once kept the boundary between the two elemental regions stable. Its shifting portals are damaged routing gates. The Tree Sentinel and Ice Sentinel are wardens bound to the system; they attack intruders but are not initially framed as evil. The team's discoveries should gradually reveal that defeating the wardens without understanding the core may worsen the frontier. The final choice and exact resolution remain open for story approval.

## Player backstory approach

The shared backstory is the Guild charter and the expedition's trust contract. Individual histories remain player-owned until Marcus chooses them. The visuals suggest optional motivations rather than fixed canon:

- a scholar or mage follows the anomalous crystal signal;
- a scout knows the frontier routes or has a missing survey marker to recover;
- a protector accepts the Guild's duty to bring the team back alive;
- another crawler may have a personal tie to a missing expedition member.

These hooks can become optional character-select dialogue or journal lines. They should not block play, prescribe a player's identity, or change the co-op premise. The Quest Master addresses the group as a team and avoids assuming names, class, or prior relationships.

## Proposed floor-to-story progression

This is a narrative mapping for review, not a claim about the implemented campaign or a request to add more floors.

| Floor | Story purpose | Visual and gameplay reveal |
|---|---|---|
| 1 — Frontier Threshold | Establish the missing outpost and first portal | Guild trail markers, abandoned supplies, first corrupted route gate |
| 2 — Recovery Sanctuary | Give the party a safe pause and evidence from prior surveyors | Warm camp light, supplies, a readable journal/map clue |
| 3 — Rootbound Works | Show the forest side of the failing boundary | Root structures, spores, Tree Warden signs, an optional hidden archive |
| 4 — Permafrost Conduit | Show that the freeze is coming from below | Ice bridge, shard hazards, frozen survey records, Ice Warden signs |
| 5 — Twin Warden Core | Resolve the expedition's objective and explain the portals | One arena divided by root and ice motifs, linked Warden encounter, core evidence |

Floor Five victory should return the team to a clear ending. A harder cycle remains an explicit optional choice, consistent with the approved ending direction.

## Opening video script: approximately 50 seconds

The timing is a planning estimate. Voice duration and subtitle timing must be checked against the recorded performance before editing.

| Time | Picture and camera | Quest Master / on-screen text |
|---|---|---|
| 0–6s | Guild map room. A violet mark pulses between a forest and a frozen ridge. Slow push toward the map. | **QUEST MASTER:** “Wayfarers, our signal from the Thornwake frontier ended three nights ago.” |
| 6–15s | The Quest Master turns from the map to the four-person team. Their faces and class details are not required for this shot. | “The forest is freezing from its roots upward. The old outpost is silent.” |
| 15–25s | Cut to the abandoned frontier: wind through split-season trees, empty watchtower, violet crystal trail. | “Surveyors found a buried gate where deepwood meets ice. Something below is shifting the paths—and waking its wardens.” |
| 25–37s | Team follows the trail. Brief close-ups of a map, a Guild token, a scout's marker, and the mage's crystal. | “Find the source. Recover the survey records. Mark a safe route through the dungeon.” |
| 37–47s | The team reaches the portal; through it, silhouettes of the two Sentinels frame a bright core. | “Work together. Protect one another. Bring every crawler home.” |
| 47–50s | Hold on the portal, then fade to the room-code/lobby screen. | **MISSION:** “Trace the signal. Find the core. Return together.” |

### Dialogue panel and player controls

- Display the current speaker name, readable line-by-line caption text, and a quiet progress indicator.
- `READ & FOLLOW` begins voice plus captions. The text remains visible long enough to read and can be advanced manually.
- `SKIP INTRO` is visible from the first frame; it immediately opens the lobby and records the mission brief in the journal so players do not lose the objective.
- Provide captions independently of voice, mute/volume controls, a reduced-motion option, and keyboard/controller focus for both choices.
- Do not auto-play narration before the player has entered the game or interacted, and do not pause a joined multiplayer party indefinitely. The host's choice should offer the group a shared skip vote or a short countdown; the exact rule needs approval.

## PixVerse production handoff

The storyboard image is a design board, not a shot-control image for video generation. A multi-shot render needs clean, individual reference frames for the Guild hall, frontier approach, and portal reveal, plus a locked Quest Master look. The motion prompt should preserve the exact approved script, use restrained camera movement, include natural spoken English with the same lines, and leave subtitles/UI for deterministic compositing so the copy remains exact.

The PixVerse creation integration was not available in this session's tool list, so no video task was queued and no generated motion clip is claimed. The actual cutscene, voice recording, subtitle timing, and skip behavior remain unimplemented and need production and in-game verification.

## Review questions for Marcus

1. Do you want the Guild to be a trusted rescue organization, a politically motivated employer, or a deliberately mysterious sponsor?
2. Should the missing surveyors be rescued, found as records/echoes, or left as an unresolved mystery?
3. Which optional personal hook should the magic player use: crystal researcher, missing mentor, or a player-written background?
4. Should the portal discovery explain the Tree and Ice Wardens as guardians protecting the core, or as forces corrupted by it?
5. For multiplayer, should the host choose `SKIP INTRO` for the whole party, or should all players vote?

## Approval boundary

Reviewing these concepts does not approve production model integration, new encounter code, floor-map implementation, voice generation, or a cinematic render. After story and UI approval, make clean shot-specific control frames, produce the video, and implement the intro as a skippable client experience while keeping mission progression authoritative on the server.

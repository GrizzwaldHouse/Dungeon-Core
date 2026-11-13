# November 13 boulder gauntlet milestone

## Player-facing change

The shifting vault no longer contains a passive timer that clears itself. Both route variants now contain three alternating masonry-and-root barriers. The path forces the party to change sides while approaching a visible release mechanism.

Entering the mechanism's trigger radius starts a server-owned sequence:

1. A 45-tick warning marks the release lane.
2. A banded boulder rolls across that lane for 30 ticks.
3. Contact removes 18 health and applies a three-meter horizontal knockback.
4. The mechanism rearms after 45 ticks if nobody disarms it.
5. The floor exit stays sealed until an explorer reaches the mechanism and deliberately disarms it.

The client only renders the server-published state, lane, timing, damage, and knockback. It cannot clear the trap or decide whether contact occurred.

## Fresh evidence

- Full regression: 180 passed, 0 failed.
- JavaScript syntax validation: 71 files passed.
- Layout parity: 49 visible objects match authoritative collision, including 10 amber and 11 violet vault colliders.
- Maze route proof: both mirrored vault routes remain radius-clear for authoritative navigation.
- Headed Chrome sequence: 9 captures, connected WebGL, warning, active, rearming, and armed-again states, with 0 browser errors.
- Headed evidence location: `C:\Users\daley\AppData\Local\Temp\dungeon-boulder-headed-2026-11-13`.
- Final midpoint capture location: `C:\Users\daley\AppData\Local\Temp\dungeon-boulder-final-check-2026-11-13\trap-active.png`.

The retained captures hide the room code. They are local QA evidence and are excluded from the milestone commit.

## Remaining review

- Marcus should play both vault routes with keyboard and physical-phone touch controls.
- Confirm the 18-damage hit and knockback are readable at normal gameplay speed.
- Confirm the release mechanism is understandable without relying only on objective text.
- This milestone does not add a fall-through pit. The rolling boulder is the selected active hazard for this route.

No push, merge, deployment, paid generation, or public publication occurred.

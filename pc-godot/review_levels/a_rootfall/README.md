# Rootfall Aqueduct review level (Level A)

Status: **review candidate**. It is not wired into `scenes/main.tscn`, the outpost, the LAN party or the portable package. Integration waits on Marcus's visual and gameplay decision.

## What it shows

A two-member party, Warden Brannoch and Thornbow Sefa, descends a wet basalt aqueduct into a root basin. A rooted Bark Guardian and an airborne Barkwing are waiting there.

| Beat | Rule (in `rootfall_state.gd`) | How it reads on screen |
| --- | --- | --- |
| Axe | 8 damage, 0.9 s cooldown, hits the guardian. Hits the barkwing only during its low dive | Large steel blade with a pale edge, swing arc, white damage number |
| Arrow | 4 damage, prefers the airborne barkwing | Visible shaft in flight, impact knock |
| Hush spell | 14 damage, 6 s cooldown, one slow violet bolt | Small violet orb with a short-range light |
| Root attack | 1.4 s windup locked on the leader, 2.2 m radius, 12 damage | Ember ring with a filling disc, raised guardian arms, low rumble, then erupting root spikes |
| Barkwing dive | 0.7 s shriek with a ring under the Thornbow, then a dive for 5 damage | Faster flaps, shriek cue, red damage number |
| Health | Party and enemy bars with a pale lag segment for the latest hit | HUD top left and top right |
| Rewards | Heartwood sap from the guardian, Barkwing quill from the barkwing | Glowing drop with a light column. Pickup adds a Pack line and a `+ item` flash |
| Audio | 14 cues synthesized at startup from sine, sweep and seeded noise | No audio files. One `AudioStreamGenerator` mixer |

The palette follows the Deepwood title cover contract: gray-violet dusk, charcoal bark, wet slate, muted moss, and restrained violet, ember and cyan accents. It uses no diamond motifs. All meshes are Godot primitives built in code.

## Files

- `rootfall_state.gd`: deterministic rules, fixed 1/60 s step, no randomness, autoplay director, event history
- `rootfall_level.gd`: scene construction, HUD, input, effects, capture hooks
- `rootfall_audio.gd`: procedural cue synthesis and mixer
- `rootfall.tscn`: standalone scene root
- `test_rootfall.gd`: focused headless checks

## Launch

From the repository root, with the console build at `GODOT`:

    GODOT --path pc-godot res://review_levels/a_rootfall/rootfall.tscn

Controls: WASD or arrows to move, J to swing the axe, K to loose an arrow, L to cast the hush spell. P toggles autoplay, R restarts.

Autoplay with screenshots, an event log and a video capture:

    GODOT --path pc-godot --resolution 1280x720 --write-movie build/rootfall-review/rootfall_autoplay.avi --fixed-fps 30 res://review_levels/a_rootfall/rootfall.tscn -- --autoplay --capture --quit-on-finish

Output goes to the ignored `pc-godot/build/rootfall-review/` folder: ten PNG beats (`01_descent` to `10_victory`), `events.json` and the AVI.

## Tests

    GODOT --headless --path pc-godot -s res://review_levels/a_rootfall/test_rootfall.gd

The 38 checks cover:

- Victory under autoplay
- Descent before the encounter
- Hits from all three attacks
- Arrows on the airborne barkwing
- The full telegraph windup
- One root hit followed by dodges
- The barkwing dive hit
- Health changes on both sides
- Drops and inventory
- Identical snapshots and event order across two runs
- Axe immunity in flight
- Dodging out of the ring
- Walkable clamps
- Bounded, repeatable audio
- Scene and HUD wiring
- Restart

## Evidence for this candidate (2026-11-20, Godot 4.7.2, local Windows)

- Headless focused test: 38 of 38 pass, exit 0. Godot sometimes prints a single "ObjectDB instance leaked" warning on exit. It did not reproduce with `--verbose`.
- Existing regressions: `tests/test_outpost.gd` passes 31 checks, exit 0. `tests/run_lan.py` headless host and guest both pass, exit 0.
- Headed autoplay: 689 frames at 30 FPS (22.9 s), exit 0. The headed snapshot matches the headless model: `1226|3|0|0|36|27|1.745,3.457|94|...`.
- AVI audio: a 16-bit stereo 48 kHz track with sound from the encounter onward and a peak of 22782 out of 32767. The descent has no ambience.

These are local automated and capture checks. They are not physical-device, owner or AAA acceptance.

## Known limitations

- The approved Rootfall concept image was not available in this checkout. The level matches the written brief and the Deepwood palette contract, not a side-by-side image comparison.
- Characters, guardian and barkwing are primitive placeholders with procedural animation. There are no rigs, authored animations or final materials.
- The descent has no ambient audio bed. Cues are synthetic placeholders.
- Manual play is single-player. The Thornbow follows the Warden and attacks only when K or L is held.
- The encounter camera can let the guardian trunk overlap the party in some frames.

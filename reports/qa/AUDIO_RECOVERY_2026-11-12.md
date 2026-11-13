# Audio recovery QA, November 12

Branch: `qa/audio-2026-11-12`, based on `6249212`.

The existing procedural cue map covers strike, enemy hit, damage, pickup, heal, revive, portal, spider warning, ordinary warning, victory, and defeat. `client/app.js` calls these only from local acknowledged actions, server events, or validated warning snapshots. There is no recorded music or authored performance in this candidate.

Concrete defect: after a browser suspended an already enabled audio context, the sound button's first gesture muted the game. It took another gesture to unlock sound again. `GameAudio.toggle()` now resumes a suspended context on that first gesture; a running context still mutes immediately.

Verification: `node --test tests/warning-audio.test.js` passed 8/8, including the new suspended-context recovery case. `npm test` passed 174/174 with approved loopback access and the existing dependency directory. The VM audio harness verifies scheduling, envelopes, voice limits, cleanup, gesture gating, warning deduplication, and distinct victory/defeat profiles. It cannot verify audible quality, loudness, speaker routing, or Safari's real audio policy.

Review gate: open a headed browser, unlock sound with one click, hear attack, damage, pickup, portal, victory, and defeat in a normal campaign, background and resume the browser, then click Sound once and verify audio resumes. Repeat on a physical iPhone with speaker and headphones. Record a screen video with system audio and note device and browser version. No headed audio recording or physical-device listening pass was produced in this milestone.

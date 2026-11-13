// warning-audio.test.js
// Developer: Marcus Daley
// Date: 2026-11-01
// Why: Keep procedural cues bounded and silent until the user permits playback.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Fake graph records scheduling and cleanup, not subjective loudness or device output.
function createHarness({ resume, gainFailure = false, hidden = false } = {}) {
  const contexts = [];
  const listeners = new Map();
  const document = {
    hidden,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
      if (listeners.get(name) === fn) listeners.delete(name);
    }
  };
  function parameter() {
    return {
      changes: [],
      setValueAtTime(value, time) { this.changes.push({ value, time }); },
      exponentialRampToValueAtTime(value, time) { this.changes.push({ value, time }); }
    };
  }
  class AudioContext {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = {};
      this.oscillators = [];
      this.gains = [];
      contexts.push(this);
    }
    async resume() {
      if (resume) await resume();
      this.state = 'running';
    }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createOscillator() {
      const node = {
        frequency: parameter(),
        connections: [], stops: [], disconnected: false,
        connect(target) { this.connections.push(target); },
        disconnect() { this.disconnected = true; },
        start(time) { this.startedAt = time; },
        stop(time) { this.stops.push(time); }
      };
      this.oscillators.push(node);
      return node;
    }
    createGain() {
      if (gainFailure) throw new Error('device graph unavailable');
      const node = {
        gain: parameter(), disconnected: false,
        connect(target) { this.destination = target; },
        disconnect() { this.disconnected = true; }
      };
      this.gains.push(node);
      return node;
    }
  }
  const source = fs.readFileSync(path.join(__dirname, '../client/audio.js'), 'utf8')
    .replace('export class GameAudio', 'class GameAudio');
  const sandbox = { AudioContext, document };
  vm.runInNewContext(`${source}\nthis.GameAudio = GameAudio;`, sandbox);
  return { audio: new sandbox.GameAudio(), contexts, document, listeners, sandbox };
}

test('warning windows cue once across repeated snapshots, with bounded scope history', () => {
  const source = fs.readFileSync(path.join(__dirname, '../client/audio.js'), 'utf8')
    .replace('export class GameAudio', 'class GameAudio');
  const context = {};
  vm.runInNewContext(`${source}\nthis.GameAudio = GameAudio;`, context);
  const audio = new context.GameAudio();
  const cues = [];
  audio.play = (cue) => cues.push(cue);
  const warning = { id: 'hex', kind: 'HEX_BLAST', endsAtTick: 80 };
  const snapshot = { phase: 'RUNNING', roomId: 'one', tick: 40, floor: { cycle: 1 },
    space: { id: 'vault', revision: 1 }, warnings: [warning] };
  for (let i = 0; i < 30; i++) audio.observeWarnings(snapshot);
  assert.deepEqual(cues, ['warning']);
  snapshot.warnings = [];
  audio.observeWarnings(snapshot);
  snapshot.warnings = [warning];
  audio.observeWarnings(snapshot);
  assert.equal(cues.length, 1, 'brief omission cannot replay the same warning');
  snapshot.warnings = [{ ...warning, endsAtTick: 120 }, { ...warning, id: 'root', endsAtTick: 120 }];
  audio.observeWarnings(snapshot);
  assert.equal(cues.length, 2, 'new simultaneous windows form one cue');
  snapshot.tick = 120;
  snapshot.warnings = [{ ...warning, endsAtTick: 120 }, { id: 'bad', kind: 'X', endsAtTick: NaN }];
  audio.observeWarnings(snapshot);
  assert.equal(cues.length, 2, 'expired and malformed windows stay silent');
  snapshot.tick = 40;
  snapshot.warnings = [warning];
  snapshot.space.revision = 2;
  audio.observeWarnings(snapshot);
  assert.equal(cues.length, 3, 'new space may reuse an encounter identifier');
  snapshot.roomId = 'two';
  audio.observeWarnings(snapshot);
  assert.equal(cues.length, 4, 'independent room has independent warning history');
  for (let i = 0; i < 200; i++) {
    snapshot.warnings = [{ ...warning, endsAtTick: 200 + i }];
    audio.observeWarnings(snapshot);
  }
  assert.equal(audio.seenWarnings.size, 128);
  snapshot.phase = 'COMPLETED';
  audio.observeWarnings(snapshot);
  assert.equal(audio.seenWarnings.size, 0);
});

test('audio requires explicit unlock and mute immediately disconnects active voices', async () => {
  const { audio, contexts } = createHarness();
  audio.play('strike');
  assert.equal(contexts.length, 0, 'construction and unsolicited events cannot autoplay');
  assert.equal(await audio.toggle(), true);
  audio.play('strike');
  assert.equal(audio.voices.size, 1);
  assert.equal(await audio.toggle(), false);
  assert.equal(audio.voices.size, 0);
  assert.equal(contexts[0].oscillators[0].disconnected, true);
  assert.equal(contexts[0].gains[0].disconnected, true);
  audio.play('pickup');
  assert.equal(contexts[0].oscillators.length, 1);
});

test('one sound-button gesture resumes a context suspended by the browser', async () => {
  const { audio, contexts } = createHarness();
  assert.equal(await audio.toggle(), true);
  contexts[0].state = 'suspended';
  audio.play('portal');
  assert.equal(contexts[0].oscillators.length, 0);
  assert.equal(await audio.toggle(), true, 'the first gesture resumes instead of muting');
  audio.play('portal');
  assert.equal(contexts[0].oscillators.length, 1);
});

test('pending unlock cannot undo a later mute or disposal', async () => {
  for (const cancel of ['mute', 'dispose']) {
    let resolveResume;
    const pending = new Promise((resolve) => { resolveResume = resolve; });
    const { audio, contexts, listeners } = createHarness({ resume: () => pending });
    const unlocking = audio.toggle();
    if (cancel === 'mute') assert.equal(await audio.toggle(), false);
    else audio.dispose();
    resolveResume();
    assert.equal(await unlocking, false);
    assert.equal(audio.enabled, false);
    assert.equal(audio.unlockPending, false);
    audio.play('damage');
    assert.equal(contexts[0].oscillators.length, 0);
    if (cancel === 'dispose') {
      assert.equal(audio.context, null);
      assert.equal(listeners.size, 0);
      assert.equal(await audio.toggle(), false);
    }
  }
});

test('missing or rejected audio support stays silent and graph failures release partial nodes', async () => {
  const unavailable = createHarness();
  unavailable.sandbox.AudioContext = undefined;
  assert.equal(await unavailable.audio.toggle(), false);
  const rejected = createHarness({ resume: () => Promise.reject(new Error('gesture required')) });
  assert.equal(await rejected.audio.toggle(), false);
  assert.equal(rejected.audio.unlockPending, false);
  const failed = createHarness({ gainFailure: true });
  await failed.audio.toggle();
  assert.doesNotThrow(() => failed.audio.play('strike'));
  assert.equal(failed.audio.voices.size, 0);
  assert.equal(failed.contexts[0].oscillators[0].disconnected, true);
  assert.equal(failed.audio.lastCueAt.size, 0, 'failed playback must not consume the cooldown');
});

test('all shipped cues schedule finite bounded envelopes with distinct victory and defeat identities', async () => {
  const { audio, contexts } = createHarness();
  await audio.toggle();
  const context = contexts[0];
  const profiles = {};
  for (const name of ['strike', 'enemyHit', 'damage', 'pickup', 'heal', 'revive', 'portal', 'warning', 'victory', 'defeat']) {
    audio.play(name);
    const oscillator = context.oscillators.at(-1);
    const gain = context.gains.at(-1);
    assert.equal(oscillator.startedAt, context.currentTime);
    assert.ok(oscillator.stops[0] > context.currentTime && oscillator.stops[0] <= context.currentTime + 0.51);
    for (const change of gain.gain.changes) assert.ok(change.value > 0 && change.value <= 0.11);
    assert.equal(gain.destination, context.destination);
    profiles[name] = [oscillator.type, ...oscillator.frequency.changes.map((entry) => entry.value)];
    oscillator.onended();
    assert.equal(audio.voices.size, 0);
    assert.equal(oscillator.disconnected, true);
    assert.equal(gain.disconnected, true);
    context.currentTime += 1;
  }
  assert.notDeepEqual(profiles.victory, profiles.defeat);
  assert.ok(profiles.victory[2] > profiles.victory[1], 'victory rises');
  assert.ok(profiles.defeat[2] < profiles.defeat[1], 'defeat falls');
});

test('voice budget and per-cue throttle bound floods while results take priority', async () => {
  const { audio, contexts } = createHarness();
  await audio.toggle();
  const context = contexts[0];
  for (let i = 0; i < 30; i++) audio.play('warning');
  assert.equal(context.oscillators.length, 1);
  for (const name of ['damage', 'strike', 'enemyHit', 'pickup', 'heal', 'portal']) audio.play(name);
  assert.equal(audio.voices.size, 4);
  assert.equal(context.oscillators.length, 4);
  audio.play('victory');
  assert.equal(audio.voices.size, 1);
  assert.ok(context.oscillators.slice(0, 4).every((node) => node.disconnected));
  audio.play('unknown');
  assert.equal(context.oscillators.length, 5);
  context.oscillators.at(-1).onended();
  context.currentTime += 0.081;
  audio.play('warning');
  assert.equal(context.oscillators.length, 6, 'eligible later cue can reuse the freed budget');
});

test('visibility silences active voices and muted warning history does not replay or mutate snapshots', async () => {
  const { audio, contexts, document, listeners } = createHarness();
  const snapshot = Object.freeze({ phase: 'RUNNING', roomId: 'fixture', tick: 40,
    floor: Object.freeze({ cycle: 1 }), space: Object.freeze({ id: 'vault', revision: 1 }),
    warnings: Object.freeze([Object.freeze({ id: 'hex', kind: 'HEX_BLAST', endsAtTick: 80 })]) });
  audio.observeWarnings(snapshot);
  await audio.toggle();
  audio.observeWarnings(snapshot);
  assert.equal(contexts[0].oscillators.length, 0, 'unlock does not replay warnings observed while muted');
  audio.play('damage');
  document.hidden = true;
  listeners.get('visibilitychange')();
  assert.equal(audio.voices.size, 0);
  audio.play('portal');
  assert.equal(contexts[0].oscillators.length, 1);
  document.hidden = false;
  listeners.get('visibilitychange')();
  audio.play('portal');
  assert.equal(contexts[0].oscillators.length, 2, 'visible running context accepts fresh cues');
  contexts[0].state = 'suspended';
  audio.play('pickup');
  assert.equal(contexts[0].oscillators.length, 2, 'browser suspension cannot be bypassed by gameplay');
  audio.dispose();
  audio.dispose();
  assert.equal(contexts[0].state, 'closed');
  assert.equal(audio.voices.size, 0);
  assert.equal(listeners.size, 0);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

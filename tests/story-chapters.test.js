// story-chapters.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep illustrated chapters bound to real transitions and avoid reconnect repeats.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'client', 'story-chapters.js'), 'utf8')
  .replace('export function chapterForTransition', 'function chapterForTransition')
  .replace('export function claimChapter', 'function claimChapter');
const context = {};
vm.runInNewContext(`${source}\nthis.api = { chapterForTransition, claimChapter };`, context);
const { chapterForTransition, claimChapter } = context.api;

test('only authoritative travel events select tracked storyboard chapters', () => {
  assert.equal(chapterForTransition('floor-transition', { revision: 1, toStage: 'REST', floorIndex: 2 }).title,
    'The outpost');
  assert.equal(chapterForTransition('floor-transition', { revision: 2, toStage: 'DEEPWOOD', floorIndex: 4 }).title,
    'The Deepwood guardian');
  assert.equal(chapterForTransition('portal-resolved', { revision: 3, portalId: 'shift-gate' }).title,
    'The route beneath the map');
  assert.equal(chapterForTransition('portal-resolved', { revision: 3, portalId: 'floor-exit' }), null);
  assert.equal(chapterForTransition('floor-transition', { toStage: 'FLOOR_FIVE', floorIndex: 5 }), null);
});

test('each player sees each chapter once per room and cycle, including duplicate events', () => {
  const records = new Map();
  const storage = { getItem: (key) => records.get(key), setItem: (key, value) => records.set(key, value) };
  const chapter = chapterForTransition('floor-transition',
    { revision: 8, cycle: 1, toStage: 'FLOOR_FIVE', floorIndex: 5 });
  assert.match(chapter.image, /quest-storyboard-draft\.png$/);
  assert.equal(claimChapter(storage, 'AB2C', 'p1', chapter.id), true);
  assert.equal(claimChapter(storage, 'AB2C', 'p1', chapter.id), false);
  assert.equal(claimChapter(storage, 'AB2C', 'p2', chapter.id), true);
  assert.equal(claimChapter(storage, 'AB2C', 'p1', '2:FLOOR_FIVE'), true);
});

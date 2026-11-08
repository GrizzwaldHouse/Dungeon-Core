// matchjaw-runtime.test.js
// Developer: Marcus Daley
// Date: 2026-11-07
// Why: Keep the optional skeletal spider visual subordinate to server positions and preserve the procedural fallback.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(loadAsync) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'client', 'matchjaw-runtime.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export async function attachMatchjaw', 'async function attachMatchjaw');
  class Vec {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, {x, y, z}); }
    clone() { return new Vec(this.x, this.y, this.z); }
    copy(other) { Object.assign(this, {x: other.x, y: other.y, z: other.z}); return this; }
    distanceTo(other) { return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z); }
    setScalar(value) { this.x = this.y = this.z = value; }
  }
  const createdMixers = [];
  class AnimationMixer {
    constructor(model) { this.model = model; this.times = []; createdMixers.push(this); }
    clipAction(clip) { this.clip = clip; return {play() {}}; }
    setTime(value) { this.times.push(value); }
  }
  class AnimationClip {
    constructor(name, duration, tracks) { Object.assign(this, {name, duration, tracks}); }
  }
  const gltf = {
    scene: {}, animations: [{tracks: [
      {name: 'Matchjaw_Root.position'}, {name: 'Matchjaw_Gait_Rig.bones[0].quaternion'}
    ]}]
  };
  const loaderCalls = [];
  class GLTFLoader {
    loadAsync(url) { loaderCalls.push(url); return loadAsync ? loadAsync(gltf) : Promise.resolve(gltf); }
  }
  const clone = () => ({
    scale: new Vec(1, 1, 1), position: new Vec(),
    traverse(visitor) { visitor({isMesh: true, geometry: {clone: () => ({owned: true})},
      material: {clone: () => ({owned: true})}}); }
  });
  const context = {THREE: {AnimationMixer, AnimationClip}, GLTFLoader, clone};
  vm.runInNewContext(`${source}\nthis.attachMatchjaw = attachMatchjaw`, context);
  const record = {
    group: {position: new Vec(2, 0, 3), children: [], add(child) { this.children.push(child); }},
    actor: {visible: true}, poseCalls: 0,
    pose() { this.poseCalls += 1; }
  };
  return {attach: context.attachMatchjaw, record, createdMixers, loaderCalls};
}

test('skeletal visual follows authoritative position without applying animation root motion', async () => {
  const {attach, record, createdMixers, loaderCalls} = fixture();
  assert.equal(await attach(record, () => true), true);
  assert.equal(loaderCalls.length, 1);
  assert.equal(record.actor.visible, false);
  assert.equal(record.group.children.length, 1);
  assert.deepEqual(createdMixers[0].clip.tracks.map(track => track.name),
    ['Matchjaw_Gait_Rig.bones[0].quaternion']);
  record.pose(0, 1);
  record.group.position.x = 2.5;
  record.pose(0, 1.033);
  assert.equal(record.group.position.x, 2.5);
  assert.equal(record.poseCalls, 2);
  assert.ok(createdMixers[0].times[1] > 0, 'server movement advances visual gait');
  record.pose(0.75, 2);
  assert.ok(createdMixers[0].times[2] > 4, 'server warning advances attack visual');
});

test('removed enemy does not attach and a failed asset load can retry', async () => {
  let calls = 0;
  const {attach, record} = fixture(gltf => ++calls === 1
    ? Promise.reject(new Error('temporary missing asset')) : Promise.resolve(gltf));
  await assert.rejects(attach(record, () => true), /temporary missing asset/);
  assert.equal(record.actor.visible, true);
  assert.equal(await attach(record, () => false), false);
  assert.equal(record.actor.visible, true);
  assert.equal(record.group.children.length, 0);
  assert.equal(calls, 2);
});

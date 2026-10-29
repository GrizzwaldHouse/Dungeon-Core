// Why: Verify the procedural Barkwing's flight, selection, and resource lifecycle
// without letting presentation alter authoritative room snapshots.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
  const resources = [];
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
    copy(v) { return this.set(v.x, v.y, v.z); }
    lerp(v, alpha) { this.x += (v.x - this.x) * alpha; this.y += (v.y - this.y) * alpha; this.z += (v.z - this.z) * alpha; return this; }
  }
  class Group {
    constructor() { this.children = []; this.position = new Vector3(); this.rotation = { x: 0, y: 0, z: 0 }; this.scale = new Vector3(1, 1, 1); }
    add(...children) { this.children.push(...children); }
    traverse(callback) { callback(this); for (const child of this.children) child.traverse(callback); }
  }
  class Geometry {
    constructor(...args) { this.args = args; this.disposed = false; resources.push(this); }
    dispose() { this.disposed = true; }
  }
  class Material extends Geometry {
    constructor(options) { super(); Object.assign(this, options); this.emissive = { setHex() {} }; }
  }
  class Mesh extends Group { constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); } }
  class Shape {
    constructor() { this.points = []; }
    moveTo(x, y) { this.points.push([x, y]); }
    lineTo(x, y) { this.points.push([x, y]); }
    closePath() { this.closed = true; }
  }
  const THREE = {
    Group, Mesh, Shape, Vector3, DoubleSide: 2,
    DodecahedronGeometry: Geometry, ConeGeometry: Geometry, SphereGeometry: Geometry, TorusGeometry: Geometry,
    ShapeGeometry: Geometry, MeshStandardMaterial: Material, MeshBasicMaterial: Material,
    MathUtils: { clamp: (value, min, max) => Math.min(max, Math.max(min, value)) }
  };
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'render.js'), 'utf8')
    .replace(/^import \* as THREE from 'three';\r?\n/m, '')
    .replace('export class DungeonRenderer', 'class DungeonRenderer');
  const context = { THREE };
  vm.runInNewContext(`${source}\nthis.DungeonRenderer = DungeonRenderer;`, context);
  const state = {
    scene: { add() {}, remove() {} }, enemyMeshes: new Map(), playerMeshes: new Map(),
    motionPreference: { matches: false }, snapshots: [], updateCamera() {}
  };
  const methods = context.DungeonRenderer.prototype;
  state.enemyMesh = methods.enemyMesh;
  return { state, methods, resources };
}

test('Barkwing has mirrored ragged wings and reuses geometry across snapshots', () => {
  const { state, methods, resources } = fixture();
  const record = methods.enemyMesh.call(state, 'wing', 'BARKWING');
  assert.equal(record.wings.length, 2);
  assert.deepEqual(Array.from(record.wings, ({ pivot }) => pivot.scale.x), [-1, 1]);
  for (const { pivot } of record.wings) {
    const membrane = pivot.children[0];
    assert.equal(membrane.geometry.args[0].closed, true);
    assert.ok(membrane.geometry.args[0].points.length >= 10, 'ragged wing contour replaces the generic cone silhouette');
  }
  const allocationCount = resources.length;
  assert.equal(methods.enemyMesh.call(state, 'wing', 'BARKWING'), record);
  assert.equal(resources.length, allocationCount, 'snapshot reuse does not create new GPU resources');
  methods.animateBarkwing.call(state, record, 0.2);
  const angle = record.wings[0].pivot.rotation.z;
  methods.animateBarkwing.call(state, record, 0.6);
  assert.notEqual(record.wings[0].pivot.rotation.z, angle);
  assert.equal(record.wings[0].pivot.rotation.z, -record.wings[1].pivot.rotation.z);
  state.motionPreference.matches = true;
  methods.animateBarkwing.call(state, record, 1);
  const reducedAngle = record.wings[0].pivot.rotation.z;
  methods.animateBarkwing.call(state, record, 20);
  assert.equal(record.wings[0].pivot.rotation.z, reducedAngle, 'reduced motion holds an open-wing silhouette');
});

test('airborne selection projects onto the floor without moving authoritative altitude', () => {
  const { state, methods, resources } = fixture();
  const snapshot = { phase: 'RUNNING', players: {}, enemies: {
    wing: { kind: 'BARKWING', transform: { position: { x: 2, y: 2.4, z: 3 }, rotation: { y: 0.3 } },
      health: { current: 28 }, state: 'ALIVE' }
  } };
  const before = JSON.stringify(snapshot);
  state.snapshots = [{ snapshot, at: 100 }];
  state.selectedEnemyId = 'wing';
  methods.samplePlayers.call(state, 200);
  const record = state.enemyMeshes.get('wing');
  assert.equal(record.group.position.y, 2.4);
  assert.equal(record.selection.visible, true);
  assert.ok(Math.abs(record.selection.position.y + record.group.position.y + 0.35) < 1e-10);
  record.group.scale.set(1.1, 1.1, 1.1);
  methods.samplePlayers.call(state, 210);
  const markerWorldY = record.group.position.y + record.selection.position.y * record.group.scale.y;
  assert.ok(Math.abs(markerWorldY + 0.35) < 1e-10,
    'the hit pulse cannot pull the selected floor marker below its ground plane');
  methods.animateBarkwing.call(state, record, 0.8);
  assert.equal(JSON.stringify(snapshot), before, 'flight and selection never mutate the snapshot');
  snapshot.enemies.wing.health.current = 0;
  snapshot.enemies.wing.state = 'DEFEATED';
  methods.samplePlayers.call(state, 250);
  assert.equal(record.selection.visible, false);
  assert.equal(record.group.visible, false);
  state.snapshots = [{ snapshot: { phase: 'RUNNING', players: {}, enemies: {} }, at: 200 }];
  methods.samplePlayers.call(state, 300);
  assert.equal(state.enemyMeshes.size, 0);
  assert.ok(resources.every((resource) => resource.disposed), 'removing the actor disposes wing geometry and materials too');
});

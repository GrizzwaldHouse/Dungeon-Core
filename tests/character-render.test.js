// character-render.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep distinct Wayfarer and Deepwood silhouettes presentation-only, bounded, and readable at multiplayer scale.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
    setScalar(value) { return this.set(value, value, value); }
    copy(value) { return this.set(value.x, value.y, value.z); }
    lerp(value, alpha) {
      this.x += (value.x - this.x) * alpha;
      this.y += (value.y - this.y) * alpha;
      this.z += (value.z - this.z) * alpha;
      return this;
    }
  }
  class Group {
    constructor() {
      this.children = [];
      this.position = new Vector3();
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = new Vector3(1, 1, 1);
      this.visible = true;
    }
    add(...children) { this.children.push(...children); }
    traverse(callback) { callback(this); for (const child of this.children) child.traverse(callback); }
  }
  class Geometry {
    constructor(...args) { this.args = args; this.type = this.constructor.name; }
    dispose() { this.disposed = true; }
  }
  class Material {
    constructor(options = {}) {
      Object.assign(this, options);
      this.opacity = options.opacity ?? 1;
      this.emissive = { setHex() {} };
    }
    dispose() { this.disposed = true; }
  }
  class Mesh extends Group {
    constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); }
  }
  class Shape {
    moveTo() {}
    lineTo() {}
    closePath() {}
  }
  const geometryNames = ['BoxGeometry', 'CapsuleGeometry', 'ConeGeometry', 'CylinderGeometry',
    'DodecahedronGeometry', 'IcosahedronGeometry', 'OctahedronGeometry', 'ShapeGeometry',
    'SphereGeometry', 'TetrahedronGeometry', 'TorusGeometry'];
  const THREE = {
    Group, Mesh, Shape, Vector3, DoubleSide: 2,
    MeshBasicMaterial: Material, MeshStandardMaterial: Material,
    MathUtils: { clamp: (value, min, max) => Math.min(max, Math.max(min, value)) }
  };
  for (const name of geometryNames) {
    THREE[name] = class extends Geometry {
      constructor(...args) { super(...args); this.type = name; }
    };
  }
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'render.js'), 'utf8')
    .replace(/^import \* as THREE from 'three';\r?\n/m, '')
    .replace('export class DungeonRenderer', 'class DungeonRenderer');
  const context = { THREE, performance: { now: () => 200 } };
  vm.runInNewContext(`${source}\nthis.DungeonRenderer = DungeonRenderer;`, context);
  const state = {
    scene: { add() {}, remove() {} },
    playerMeshes: new Map(), enemyMeshes: new Map(), snapshots: [],
    localPlayerId: 'human', input: { x: 0, z: 0 }, updateCamera() {}, selectedEnemyId: null
  };
  const methods = context.DungeonRenderer.prototype;
  state.playerMesh = methods.playerMesh;
  state.enemyMesh = methods.enemyMesh;
  return { state, methods };
}

function meshesIn(group) {
  const meshes = [];
  group.traverse((object) => { if (object.geometry) meshes.push(object); });
  return meshes;
}

test('named mock party receives four stable role silhouettes without capsule bodies', () => {
  const { state, methods } = fixture();
  const expected = new Map([
    ['Mock Ember', 'VANGUARD'],
    ['Mock Rune', 'MAGE'],
    ['Mock Vale', 'SCOUT'],
    ['Mock Moss', 'HEALER']
  ]);
  for (const [name, role] of expected) {
    const record = methods.playerMesh.call(state, name, name);
    assert.equal(record.role, role);
    assert.equal(record.roleParts.length, 3, `${role} carries three silhouette-defining tools`);
    assert.ok(meshesIn(record.group).length <= 11, `${role} stays within the eleven-mesh prototype budget`);
    assert.equal(record.actor.children[0].geometry, record.actor.children[1].geometry,
      `${role} shares its boot geometry instead of duplicating buffers`);
  }
  assert.equal(state.playerMeshes.size, 4);
  assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname, '..', 'client', 'render.js'), 'utf8'),
    /new THREE\.CapsuleGeometry/, 'the runtime Wayfarer no longer uses a generic capsule body');
});

test('connection and downed presentation affect visuals without mutating snapshots', () => {
  const { state, methods } = fixture();
  const snapshot = { phase: 'LOBBY', players: {
    ally: { displayName: 'Mock Moss', connection: 'DISCONNECTED', health: { current: 0 }, downedAtTick: 42,
      transform: { position: { x: 2, y: 0, z: 3 }, rotation: { y: 0.4 } } }
  }, enemies: {} };
  const before = JSON.stringify(snapshot);
  state.snapshots = [{ snapshot, at: 100 }];
  methods.samplePlayers.call(state, 200);
  const record = state.playerMeshes.get('ally');
  assert.equal(record.role, 'HEALER');
  assert.equal(record.actor.rotation.z, -Math.PI / 2, 'downed actor falls while its ground ring remains independent');
  assert.ok(record.opacityMaterials.every((surface) => surface.opacity === 0.34),
    'every actor surface fades on disconnect instead of leaving opaque tools behind');
  assert.equal(JSON.stringify(snapshot), before, 'visual treatment cannot write to authoritative state');
});

test('Deepwood boss and Rootling use explicit bark silhouettes and restrained accents', () => {
  const { state, methods } = fixture();
  const boss = methods.enemyMesh.call(state, 'deepwood', 'DEEPWOOD_SENTINEL');
  const rootling = methods.enemyMesh.call(state, 'rootling', 'ROOTLING');
  assert.equal(boss.body.geometry.type, 'CylinderGeometry');
  assert.equal(meshesIn(boss.group).length, 12, 'boss budget includes crown branches, roots, moss shoulders, core, and markers');
  assert.ok(meshesIn(boss.group).some((part) => part.geometry.type === 'TorusGeometry' && part.geometry.args[0] === 1.2),
    'boss ground marker matches its broad root mass');
  assert.equal(meshesIn(rootling.group).length, 7, 'Rootling has three projecting roots within its seven-mesh budget');
  assert.ok(meshesIn(rootling.group).some((part) => part.geometry.type === 'TorusGeometry' && part.geometry.args[0] === 0.52));
  assert.equal(methods.enemyMesh.call(state, 'deepwood', 'DEEPWOOD_SENTINEL'), boss,
    'unchanged snapshots reuse the same procedural actor resources');
});

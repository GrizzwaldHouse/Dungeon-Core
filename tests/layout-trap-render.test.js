// Why: Keep the procedural tripwire silhouette, state colors, and resource reuse explicit without changing server authority.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadRenderer() {
  class Vector3 {
    constructor() { this.set(0, 0, 0); }
    set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  }
  class Group {
    constructor() { this.children = []; this.position = new Vector3(); this.scale = new Vector3(); this.rotation = { x: 0, y: 0, z: 0 }; this.visible = true; }
    add(...children) { this.children.push(...children); }
  }
  class Geometry {
    constructor(...args) { this.args = args; this.type = this.constructor.name; }
  }
  class BoxGeometry extends Geometry {}
  class RingGeometry extends Geometry {}
  class CylinderGeometry extends Geometry {}
  class SphereGeometry extends Geometry {}
  class Material {
    constructor(options = {}) { this.color = { value: options.color, setHex(value) { this.value = value; } }; }
    clone() { return new this.constructor({ color: this.color.value }); }
  }
  class Mesh extends Group { constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); } }
  const THREE = {
    Group, Mesh, Vector3, BoxGeometry, RingGeometry, CylinderGeometry, SphereGeometry,
    MeshBasicMaterial: Material, MeshStandardMaterial: Material,
    MathUtils: { clamp: (value, min, max) => Math.min(max, Math.max(min, value)) },
    DoubleSide: 2
  };
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'render.js'), 'utf8')
    .replace(/^import \* as THREE from 'three';\r?\n/m, '')
    .replace('export class DungeonRenderer', 'class DungeonRenderer');
  const context = { THREE };
  vm.runInNewContext(`${source}\nthis.DungeonRenderer = DungeonRenderer;`, context);
  return context.DungeonRenderer.prototype.updateTrapMesh;
}

test('tripwire is a readable raised silhouette and clearly changes from warning to active', () => {
  const updateTrapMesh = loadRenderer();
  const state = {
    scene: { add() {} }, trapMesh: { visible: false, position: { set() {} }, scale: { set() {} }, material: { color: { setHex() {} } } },
    trapWireMesh: null
  };
  const trap = { position: { x: 2, y: 0, z: 3 }, radius: 1.5, state: 'WARNING' };
  updateTrapMesh.call(state, trap);

  const record = state.trapWireParts;
  assert.equal(record.stakes.length, 4, 'two stakes and two feet anchor the raised lines');
  assert.equal(record.wireMeshes.length, 3, 'three raised wires make the trap readable in both camera modes');
  assert.equal(record.tips.length, 2, 'lit caps provide a readable warning cue');
  assert.ok(record.wireMeshes.every((wire) => wire.position.y > 0), 'wires sit above the floor surface');
  assert.equal(state.trapWireMesh.visible, true);
  assert.equal(state.trapWireMesh.scale.x, 1.5);

  updateTrapMesh.call(state, { ...trap, state: 'ACTIVE' });
  assert.equal(state.trapWireParts, record, 'snapshot changes reuse existing meshes and materials');
  assert.equal(record.wireMeshes[0].material.color.value, 0xff5d56);
  assert.equal(record.stakes[0].material.color.value, 0x75423e);
  assert.equal(record.tips[0].material.color.value, 0xff746c);
});

test('Deepwood root clumps retain a raised crown and visibly branched bark silhouette', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'render.js'), 'utf8');
  const rootSection = source.slice(source.indexOf('const addRootClump'), source.indexOf('const secretFloorMaterial'));

  assert.match(rootSection, /const rootCrown = new THREE\.Mesh\(new THREE\.CylinderGeometry/);
  assert.match(rootSection, /const addRootSegment = \(from, to, baseRadius, tipRadius/);
  assert.ok((rootSection.match(/fork:/g) || []).length >= 5, 'five roots preserve visible secondary branches');
  assert.doesNotMatch(rootSection, /CylinderGeometry\(0\.035, 0\.07/, 'roots do not regress to hairline cylinders');
});

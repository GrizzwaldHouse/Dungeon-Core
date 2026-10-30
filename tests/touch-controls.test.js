// touch-controls.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Catch stuck movement and untrusted touch actions before they affect multiplayer play.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const clientRoot = path.resolve(__dirname, '..', 'client');
const source = fs.readFileSync(path.join(clientRoot, 'touch-controls.js'), 'utf8');
const modulePromise = import(`data:text/javascript,${encodeURIComponent(source)}`);

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  removeEventListener(name, callback) { if (this.listeners.get(name) === callback) this.listeners.delete(name); }
  emit(name, event = {}) { this.listeners.get(name)?.(event); }
}

function controlsFixture(TouchControls) {
  const root = new Events();
  root.contains = () => true;
  const oldWindow = global.window;
  const oldDocument = global.document;
  global.window = new Events();
  global.document = new Events();
  global.document.hidden = false;
  const moves = [];
  const actions = [];
  const controls = new TouchControls(root, { onMove: (move) => moves.push(move), onAction: (name) => actions.push(name) });
  const button = (attribute, name) => ({
    dataset: { [attribute]: name }, disabled: false,
    closest(selector) { return selector === `[data-${attribute}]` ? this : null; },
    setPointerCapture() {}
  });
  const cleanup = () => {
    controls.dispose();
    global.window = oldWindow;
    global.document = oldDocument;
  };
  return { root, controls, moves, actions, button, cleanup };
}

test('two held directions normalize and pointer cancellation always stops movement', async () => {
  const { TouchControls } = await modulePromise;
  const { root, controls, moves, button, cleanup } = controlsFixture(TouchControls);
  try {
    controls.setEnabled(true);
    root.emit('pointerdown', { pointerId: 1, target: button('move', 'up'), preventDefault() {} });
    root.emit('pointerdown', { pointerId: 2, target: button('move', 'right'), preventDefault() {} });
    assert.deepEqual(moves[0], { x: 0, z: -1 });
    assert.ok(Math.abs(moves[1].x - Math.SQRT1_2) < 1e-10);
    assert.ok(Math.abs(moves[1].z + Math.SQRT1_2) < 1e-10);
    root.emit('pointercancel', { pointerId: 2 });
    assert.deepEqual(moves[2], { x: 0, z: -1 });
    root.emit('lostpointercapture', { pointerId: 1 });
    assert.deepEqual(moves[3], { x: 0, z: 0 });
  } finally { cleanup(); }
});

test('blur, visibility, and disabled state release held movement; only known actions emit', async () => {
  const { TouchControls } = await modulePromise;
  const { root, controls, moves, actions, button, cleanup } = controlsFixture(TouchControls);
  try {
    controls.setEnabled(true);
    root.emit('pointerdown', { pointerId: 1, target: button('move', 'left'), preventDefault() {} });
    global.window.emit('blur');
    assert.deepEqual(moves.at(-1), { x: 0, z: 0 });
    root.emit('pointerdown', { pointerId: 2, target: button('move', 'down'), preventDefault() {} });
    global.document.hidden = true;
    global.document.emit('visibilitychange');
    assert.deepEqual(moves.at(-1), { x: 0, z: 0 });
    for (const action of ['attack', 'target', 'portal', 'disarm', 'collect', 'use', 'revive']) {
      root.emit('click', { target: button('action', action) });
    }
    root.emit('click', { target: button('action', 'override-health') });
    const disabledTarget = button('action', 'target');
    disabledTarget.disabled = true;
    root.emit('click', { target: disabledTarget });
    assert.deepEqual(actions, ['attack', 'target', 'portal', 'disarm', 'collect', 'use', 'revive']);
    controls.setEnabled(false);
    root.emit('pointerdown', { pointerId: 3, target: button('move', 'right'), preventDefault() {} });
    root.emit('click', { target: button('action', 'attack') });
    assert.deepEqual(moves.at(-1), { x: 0, z: 0 });
    assert.equal(actions.length, 7);
  } finally { cleanup(); }
});

test('a down press overrides a stale up pointer and page exit releases motion', async () => {
  const { TouchControls } = await modulePromise;
  const { root, controls, moves, actions, button, cleanup } = controlsFixture(TouchControls);
  try {
    controls.setEnabled(true);
    root.emit('pointerdown', { pointerId: 1, target: button('move', 'up'), preventDefault() {} });
    root.emit('pointerdown', { pointerId: 2, target: button('move', 'down'), preventDefault() {} });
    assert.deepEqual(moves.at(-1), { x: 0, z: 1 });
    global.window.emit('pointerup', { pointerId: 2 });
    assert.deepEqual(moves.at(-1), { x: 0, z: 0 });
    root.emit('pointerdown', { pointerId: 3, target: button('move', 'left'), preventDefault() {} });
    global.window.emit('pagehide');
    assert.deepEqual(moves.at(-1), { x: 0, z: 0 });
    root.emit('click', { target: button('action', 'recover') });
    assert.deepEqual(actions, ['recover']);
  } finally { cleanup(); }
});

test('touch control shell exposes accessible movement and action controls', () => {
  const html = fs.readFileSync(path.join(clientRoot, 'index.html'), 'utf8');
  assert.match(html, /id="touch-controls"[^>]*aria-label="Touch game controls"/);
  for (const direction of ['up', 'down', 'left', 'right']) {
    assert.match(html, new RegExp(`data-move="${direction}"[^>]*aria-label=`));
  }
  for (const action of ['attack', 'portal', 'disarm', 'collect', 'use', 'revive']) {
    assert.match(html, new RegExp(`data-action="${action}"`));
  }
});

test('renderer markers follow only valid server warnings and available items', () => {
  class Material {
    constructor() {
      this.opacity = 1;
      this.color = { setHex() {} };
      this.emissive = { setHex() {} };
    }
    dispose() {}
  }
  class Group {
    constructor() {
      this.children = [];
      this.position = { set() {} };
      this.scale = { set() {} };
    }
    add(...items) { this.children.push(...items); }
    traverse(callback) { this.children.forEach(callback); }
  }
  class Mesh {
    constructor(geometry, meshMaterial) {
      this.geometry = geometry;
      this.material = meshMaterial;
      this.rotation = {};
      this.position = { set() {} };
    }
  }
  class Geometry { dispose() {} }
  const THREE = {
    Group, Mesh, CylinderGeometry: Geometry, TorusGeometry: Geometry, IcosahedronGeometry: Geometry,
    MeshBasicMaterial: Material, MeshStandardMaterial: Material,
    MathUtils: { clamp: (value, min, max) => Math.min(max, Math.max(min, value)) }
  };
  const renderSource = fs.readFileSync(path.join(clientRoot, 'render.js'), 'utf8')
    .replace(/^import \* as THREE from 'three';\r?\n/m, '')
    .replace('export class DungeonRenderer', 'class DungeonRenderer');
  const context = { THREE };
  vm.runInNewContext(`${renderSource}\nthis.DungeonRenderer = DungeonRenderer;`, context);
  const scene = { added: [], removed: [], add(value) { this.added.push(value); }, remove(value) { this.removed.push(value); } };
  const state = { scene, warningMeshes: new Map(), itemMeshes: new Map() };
  const { updateWarningMeshes, updateItemMeshes } = context.DungeonRenderer.prototype;
  const position = { x: 2, y: 0, z: -3 };
  updateWarningMeshes.call(state, [
    { id: 'warning-one', position, radius: 2 },
    { id: 'forged', position, radius: Infinity }
  ]);
  assert.equal(state.warningMeshes.size, 1);
  updateItemMeshes.call(state, [{ id: 'cache-one', kind: 'HEALING_CHARGE', position, state: 'AVAILABLE' }]);
  assert.equal(state.itemMeshes.size, 1);
  assert.equal(state.itemMeshes.get('cache-one').group.visible, true);
  updateItemMeshes.call(state, [{ id: 'cache-one', kind: 'HEALING_CHARGE', position, state: 'CLAIMED' }]);
  assert.equal(state.itemMeshes.get('cache-one').group.visible, false);
  updateWarningMeshes.call(state, []);
  updateItemMeshes.call(state, []);
  assert.equal(state.warningMeshes.size, 0);
  assert.equal(state.itemMeshes.size, 0);
  assert.equal(scene.removed.length, 2);
});

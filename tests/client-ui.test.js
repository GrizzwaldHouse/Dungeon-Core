// client-ui.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Detect regressions in browser-facing controls and client state contracts.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const clientRoot = path.resolve(__dirname, '..', 'client');

test('phone running HUD keeps sound and leave actions outside collapsed party details', () => {
  const html = fs.readFileSync(path.join(clientRoot, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(clientRoot, 'styles.css'), 'utf8');
  const details = html.match(/<details id="party-details"[\s\S]*?<\/details>/)?.[0];
  assert.ok(details, 'party details section is present');
  assert.doesNotMatch(details, /id="(?:leave-room|sound-toggle)"/);
  assert.match(html, /<div class="squad-quick-actions"[^>]*>[\s\S]*id="leave-room"[\s\S]*id="sound-toggle"[\s\S]*<\/div>/);
  assert.match(css, /\.squad-quick-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.is-running \.squad \.party-details[^\n]*display:\s*none/);
});

class Element {
  constructor() {
    this.value = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this.classes = new Set();
    this.classList = {
      add: (name) => this.classes.add(name),
      toggle: (name, force) => force ? this.classes.add(name) : this.classes.delete(name)
    };
  }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  trigger(name) { return this.listeners.get(name)?.({ preventDefault() {}, code: '', detail: {} }); }
  replaceChildren() { this.children = []; }
  append(...children) { this.children.push(...children); }
}

test('opening the HTML as a file shows a launch path instead of indefinite loading', () => {
  const html = fs.readFileSync(path.join(clientRoot, 'index.html'), 'utf8');
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /id="scene-poster"/);
  const inline = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline, 'inline bootstrap is present');
  const elements = new Map();
  const get = (selector) => { if (!elements.has(selector)) elements.set(selector, new Element()); return elements.get(selector); };
  const document = { querySelector: get, documentElement: new Element() };
  vm.runInNewContext(inline, { document, location: { protocol: 'file:' } });
  assert.equal(get('#room-form').hidden, true);
  assert.equal(get('#launch-help').hidden, false);
  assert.match(get('#status').textContent, /local game server/i);
  assert.equal(get('#connection-label').textContent, 'SERVER REQUIRED');
});

test('combat HUD exposes authoritative vitality, supply, enemy, and feedback surfaces', () => {
  const html = fs.readFileSync(path.join(clientRoot, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(clientRoot, 'styles.css'), 'utf8');
  const app = fs.readFileSync(path.join(clientRoot, 'app.js'), 'utf8');
  assert.match(html, /id="player-vitals"/);
  assert.match(html, /id="player-health"/);
  assert.match(html, /id="healing-charges"/);
  assert.match(html, /id="enemy-name"/);
  assert.match(css, /\.damage-flash\.is-active/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(app, /player\.bot\?\.intent/);
  assert.match(app, /pulseFeedback\('damage'\)/);
});

test('renderer uses the current Three.js timer lifecycle without deprecated Clock warnings', () => {
  const render = fs.readFileSync(path.join(clientRoot, 'render.js'), 'utf8');
  assert.doesNotMatch(render, /new THREE\.Clock/);
  assert.match(render, /new THREE\.Timer\(\)/);
  assert.match(render, /timer\.connect\(document\)/);
  assert.match(render, /timer\.update\(timestamp\)/);
  assert.match(render, /timer\.getElapsed\(\)/);
  assert.match(render, /timer\.dispose\(\)/);
});

test('name entry, create, start, leave, and join buttons follow room rules', async () => {
  const html = fs.readFileSync(path.join(clientRoot, 'index.html'), 'utf8');
  assert.match(html, /id="add-mocks"/, 'the host lobby exposes a mock-party control');
  const elements = new Map();
  const get = (selector) => { if (!elements.has(selector)) elements.set(selector, new Element()); return elements.get(selector); };
  let gameNetwork;
  class GameNetwork {
    constructor() {
      gameNetwork = this;
      this.session = null;
      this.latestSnapshot = null;
      this.socket = { connected: true };
      this.listeners = new Map();
      this.calls = [];
    }
    addEventListener(name, listener) { this.listeners.set(name, listener); }
    emit(name, detail) { this.listeners.get(name)?.({ detail }); }
    restoreStoredSession() { return false; }
    connect() { this.emit('connection', { connected: true }); }
    async enter(mode, displayName, roomCode) {
      this.calls.push({ mode, displayName, roomCode });
      const isHost = mode === 'create';
      this.session = { roomCode: 'AB2C', playerId: isHost ? 'host' : 'guest' };
      this.latestSnapshot = {
        phase: 'LOBBY', hostPlayerId: 'host', players: {
          host: { displayName: isHost ? displayName : 'Other', connection: 'CONNECTED', health: { current: 100 } },
          ...(isHost ? {} : { guest: { displayName, connection: 'CONNECTED', health: { current: 100 } } })
        }
      };
      this.emit('session', this.session);
      this.emit('snapshot', { snapshot: this.latestSnapshot, receivedAt: 1 });
      return { roomCode: 'AB2C' };
    }
    async start() { this.latestSnapshot.phase = 'RUNNING'; this.emit('snapshot', { snapshot: this.latestSnapshot, receivedAt: 2 }); return { ok: true }; }
    async addMocks() {
      this.calls.push({ mode: 'mocks', count: 4 });
      for (let index = 1; index <= 4; index += 1) {
        this.latestSnapshot.players[`bot-${index}`] = { displayName: `Mock ${index}`, connection: 'BOT', health: { current: 100 } };
      }
      this.emit('snapshot', { snapshot: this.latestSnapshot, receivedAt: 2 });
      return { added: 4 };
    }
    async disarmTrap(trapId) {
      this.calls.push({ mode: 'disarm', trapId });
      this.latestSnapshot.trap.state = 'CLEARED';
      this.emit('snapshot', { snapshot: this.latestSnapshot, receivedAt: 3 });
      return { ok: true };
    }
    async leave() { this.session = null; this.latestSnapshot = null; this.emit('session', null); }
    sendInput() {}
  }
  class DungeonRenderer {
    setCameraMode(mode) { return mode === 'top-down' ? 'top-down' : 'angled'; }
    setLocalPlayer() {}
    setInput() {}
    pushSnapshot() {}
    resetSession() {}
    reveal() {}
    dispose() {}
  }
  class TouchControls {
    constructor() { this.enabled = false; }
    setEnabled(enabled) { this.enabled = enabled; }
    release() {}
    dispose() {}
  }
  class GameAudio { async toggle() { return false; } play() {} dispose() {} }
  const document = {
    querySelector: get,
    createElement: () => new Element(),
    documentElement: new Element(),
    activeElement: { tagName: 'BODY' },
    addEventListener() {},
    hidden: false
  };
  const window = { addEventListener() {} };
  const source = fs.readFileSync(path.join(clientRoot, 'app.js'), 'utf8').replace(/^import .*;\r?\n/gm, '');
  vm.runInNewContext(source, { document, window, GameNetwork, DungeonRenderer, TouchControls, GameAudio,
    setInterval: () => 1, clearInterval() {} });

  assert.equal(get('#camera-mode').value, 'angled');
  get('#camera-mode').value = 'top-down';
  get('#camera-mode').trigger('change');
  assert.equal(get('#camera-mode').value, 'top-down');

  get('#display-name').value = 'Aria';
  await get('#create-room').trigger('click');
  assert.deepEqual(gameNetwork.calls[0], { mode: 'create', displayName: 'Aria', roomCode: '' });
  assert.equal(get('#gate').hidden, true);
  assert.equal(get('#start-room').hidden, false);
  assert.equal(get('#start-room').disabled, true, 'one player cannot start');
  assert.equal(get('#add-mocks').hidden, false, 'host can add a mock party in the lobby');
  await get('#add-mocks').trigger('click');
  assert.deepEqual(gameNetwork.calls[1], { mode: 'mocks', count: 4 });
  assert.equal(get('#player-count').textContent, '5 / 6');
  gameNetwork.latestSnapshot.players.guest = { displayName: 'Bram', connection: 'CONNECTED', health: { current: 100 } };
  gameNetwork.emit('snapshot', { snapshot: gameNetwork.latestSnapshot, receivedAt: 3 });
  assert.equal(get('#start-room').disabled, false);
  await get('#start-room').trigger('click');
  assert.equal(get('#phase-label').textContent, 'RUNNING');
  assert.equal(get('#hint').hidden, false);
  gameNetwork.latestSnapshot.players.host.transform = { position: { x: 0, y: 0, z: 0 } };
  gameNetwork.latestSnapshot.trap = { id: 'vault-trap', state: 'TELEGRAPHED', position: { x: 0, y: 0, z: 0 }, radius: 1 };
  gameNetwork.emit('snapshot', { snapshot: gameNetwork.latestSnapshot, receivedAt: 3 });
  assert.equal(get('#disarm-trap').hidden, false);
  await get('#disarm-trap').trigger('click');
  assert.deepEqual(gameNetwork.calls[2], { mode: 'disarm', trapId: 'vault-trap' });
  assert.equal(get('#disarm-trap').hidden, true);
  await get('#leave-room').trigger('click');
  assert.equal(get('#gate').hidden, false);
  assert.equal(get('#squad').hidden, true);

  get('#display-name').value = 'Bram';
  get('#room-code').value = 'AB2C';
  get('#room-form').trigger('submit');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(gameNetwork.calls[3], { mode: 'join', displayName: 'Bram', roomCode: 'AB2C' });
  assert.equal(get('#start-room').hidden, true, 'guest cannot start');
});

test('hidden wall changes only after a server discovery message or snapshot', () => {
  const source = fs.readFileSync(path.join(clientRoot, 'render.js'), 'utf8')
    .replace(/^import \* as THREE from 'three';\r?\n/m, '')
    .replace('export class DungeonRenderer', 'class DungeonRenderer');
  const context = {};
  vm.runInNewContext(`${source}\nthis.DungeonRenderer = DungeonRenderer;`, context);
  const wall = { visible: true, material: { opacity: 1, depthWrite: true, needsUpdate: false } };
  const state = {
    snapshots: [],
    secretWalls: new Map([['secret-west', wall]]),
    revealed: new Set(),
    currentSpaceId: 'entry',
    spaceMeshes: [],
    applySpaceVisibility: context.DungeonRenderer.prototype.applySpaceVisibility,
    secretFloor: { visible: false },
    playerMeshes: new Map(),
    scene: { remove() {} },
    reveal: context.DungeonRenderer.prototype.reveal
  };
  context.DungeonRenderer.prototype.pushSnapshot.call(state, { players: {}, revealedNodeIds: [] }, 1);
  assert.equal(wall.visible, true);
  context.DungeonRenderer.prototype.pushSnapshot.call(state, { players: {}, revealedNodeIds: ['secret-west'] }, 2);
  assert.equal(wall.visible, false);
  assert.equal(wall.material.opacity, 0.08);
  assert.equal(state.secretFloor.visible, true);
  context.DungeonRenderer.prototype.resetSession.call(state);
  assert.equal(wall.visible, true);
  assert.equal(wall.material.opacity, 1);
  assert.equal(state.secretFloor.visible, false);
});

test('space change hides old geometry while keeping shared perimeter visible', () => {
  const source = fs.readFileSync(path.join(clientRoot, 'render.js'), 'utf8')
    .replace(/^import \* as THREE from 'three';\r?\n/m, '')
    .replace('export class DungeonRenderer', 'class DungeonRenderer');
  const context = {};
  vm.runInNewContext(`${source}\nthis.DungeonRenderer = DungeonRenderer;`, context);
  const entry = { visible: true };
  const amber = { visible: false };
  const violet = { visible: false };
  const perimeter = { visible: true };
  const state = { revealed: new Set(), spaceMeshes: [
    { mesh: entry, spaceId: 'entry', kind: 'pillar' },
    { mesh: amber, spaceId: 'amber-vault', kind: 'vault-column' },
    { mesh: violet, spaceId: 'violet-vault', kind: 'vault-column' },
    { mesh: perimeter, spaceId: 'all', kind: 'wall' }
  ] };
  context.DungeonRenderer.prototype.applySpaceVisibility.call(state, 'amber-vault');
  assert.equal(entry.visible, false);
  assert.equal(amber.visible, true);
  assert.equal(violet.visible, false);
  assert.equal(perimeter.visible, true);
});

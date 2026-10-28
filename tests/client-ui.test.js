// client-ui.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Detect regressions in browser-facing controls and client state contracts.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const clientRoot = path.resolve(__dirname, '..', 'client');

test('selected Deepwood cover and title stay in the lobby', () => {
  const html = fs.readFileSync(path.join(clientRoot, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(clientRoot, 'styles.css'), 'utf8');
  const app = fs.readFileSync(path.join(clientRoot, 'app.js'), 'utf8');
  const cover = fs.readFileSync(path.join(clientRoot, 'title-cover-deepwood.png'));
  assert.equal(crypto.createHash('sha256').update(cover).digest('hex').toUpperCase(),
    'B7332DB53BB3D3D91E1D8540BDF3E2433A3DBD2C7738F2E2E7D1E2CA993A820B');
  assert.match(html, /id="title-cover" src="\.\/title-cover-deepwood\.png"/);
  assert.match(html, /<h1 id="gate-title">Dungeon Core <em>Crawler<\/em><\/h1>/);
  assert.match(css, /\.in-room #title-cover\s*\{\s*display:\s*none/);
  assert.match(app, /classList\.toggle\('in-room', Boolean\(session\)\)/);
});

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
    this._textContent = '';
    this.textContentWrites = 0;
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
  get textContent() { return this._textContent; }
  set textContent(value) { this._textContent = value; this.textContentWrites += 1; }
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

test('Guild briefing exposes an accessible dusk skip-vote surface', () => {
  const html = fs.readFileSync(path.join(clientRoot, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(clientRoot, 'styles.css'), 'utf8');
  assert.match(html, /<section id="intro-briefing" class="guild-briefing"[^>]*aria-labelledby="intro-briefing-title"[^>]*hidden>/);
  assert.match(html, /id="intro-vote-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="intro-skip-vote"[^>]*>Vote to skip intro<\/button>/);
  assert.match(css, /\.guild-briefing\s*\{[^}]*#303745/i);
  assert.match(css, /\.guild-briefing[^}]*#8c75a6/i);
});

test('network sends an opaque intro vote and leaves snapshots authoritative', async () => {
  const source = fs.readFileSync(path.join(clientRoot, 'network.js'), 'utf8')
    .replace('export class GameNetwork', 'class GameNetwork');
  const context = { EventTarget, CustomEvent: class {}, crypto, window: {}, sessionStorage: {} };
  vm.runInNewContext(`${source}\nthis.GameNetwork = GameNetwork;`, context);
  const snapshot = { phase: 'LOBBY', intro: { status: 'PLAYING', voteCount: 0, eligibleCount: 2 } };
  const calls = [];
  const state = {
    session: { roomCode: 'AB2C', playerId: 'host' },
    socket: { connected: true },
    latestSnapshot: snapshot,
    call(name, payload) { calls.push({ name, payload }); return Promise.resolve({ ok: true }); }
  };

  await context.GameNetwork.prototype.voteToSkipIntro.call(state);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'intro:skip-vote');
  assert.match(calls[0].payload.actionId, /^[0-9a-f-]{36}$/i);
  assert.equal(state.latestSnapshot, snapshot, 'an acknowledgement cannot replace snapshot truth');

  state.latestSnapshot.intro.status = 'COMPLETE';
  await assert.rejects(() => context.GameNetwork.prototype.voteToSkipIntro.call(state), /Intro vote is not active/);
});

test('network forwards selected combat intent without forging damage or changing snapshots', async () => {
  const source = fs.readFileSync(path.join(clientRoot, 'network.js'), 'utf8')
    .replace('export class GameNetwork', 'class GameNetwork');
  const context = { EventTarget, crypto };
  vm.runInNewContext(`${source}\nthis.GameNetwork = GameNetwork;`, context);
  const calls = [];
  const snapshot = { phase: 'RUNNING' };
  const state = { session: {}, socket: { connected: true }, latestSnapshot: snapshot,
    call(event, payload) { calls.push({ event, payload }); return Promise.resolve({ damage: 10 }); } };
  await context.GameNetwork.prototype.attack.call(state, 'barkwing-2');
  assert.equal(calls[0].event, 'combat:attack');
  assert.equal(calls[0].payload.targetEnemyId, 'barkwing-2');
  assert.deepEqual(Object.keys(calls[0].payload).sort(), ['actionId', 'targetEnemyId']);
  await context.GameNetwork.prototype.attack.call(state);
  assert.deepEqual(Object.keys(calls[1].payload), ['actionId'], 'automatic mode retains server selection');
  assert.notEqual(calls[0].payload.actionId, calls[1].payload.actionId);
  assert.equal(state.latestSnapshot, snapshot);
  state.socket.connected = false;
  await assert.rejects(() => context.GameNetwork.prototype.attack.call(state, 'barkwing-2'), /Not in a running room/);
  assert.equal(calls.length, 2);
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

test('renderer camera modes apply local presentation transforms without network actions', () => {
  const source = fs.readFileSync(path.join(clientRoot, 'render.js'), 'utf8')
    .replace(/^import \* as THREE from 'three';\r?\n/m, '')
    .replace('export class DungeonRenderer', 'class DungeonRenderer');
  const context = { THREE: {} };
  vm.runInNewContext(`${source}\nthis.DungeonRenderer = DungeonRenderer;`, context);

  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(value) { this.x = value.x; this.y = value.y; this.z = value.z; return this; }
    add(value) { this.x += value.x; this.y += value.y; this.z += value.z; return this; }
    lerp(value) { return this.copy(value); }
  }
  const networkActions = [];
  const state = {
    cameraMode: 'angled',
    cameraTarget: new Vector3(),
    cameraOffset: new Vector3(),
    cameraDesired: new Vector3(),
    camera: {
      position: new Vector3(),
      up: new Vector3(0, 1, 0),
      lookAt(value) { this.lastLookAt = new Vector3().copy(value); }
    },
    container: { dataset: {} },
    playerMeshes: new Map(),
    localPlayerId: 'local-player',
    network: { emit: (...args) => networkActions.push(args), sendInput: (...args) => networkActions.push(args) },
    updateCamera: context.DungeonRenderer.prototype.updateCamera
  };

  const normalized = context.DungeonRenderer.prototype.setCameraMode.call(state, 'unknown');
  assert.equal(normalized, 'angled');
  assert.deepEqual({ ...state.camera.position }, { x: 0, y: 13, z: 17 });
  assert.deepEqual({ ...state.camera.up }, { x: 0, y: 1, z: 0 });

  const topDown = context.DungeonRenderer.prototype.setCameraMode.call(state, 'top-down');
  assert.equal(topDown, 'top-down');
  assert.deepEqual({ ...state.camera.position }, { x: 0, y: 22, z: 0 });
  assert.deepEqual({ ...state.camera.up }, { x: 0, y: 0, z: -1 });
  assert.deepEqual(networkActions, []);
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
        phase: 'LOBBY', tick: 100, hostPlayerId: 'host',
        intro: { status: 'PLAYING', completionReason: null, startedAtTick: 100, endsAtTick: 1600,
          completedAtTick: null, voteCount: 0, eligibleCount: 1 },
        players: {
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
    async voteToSkipIntro() {
      this.calls.push({ mode: 'intro-vote' });
      return { ok: true, completed: Boolean(this.voteCompletes),
        intro: { ...this.latestSnapshot.intro, voteCount: this.latestSnapshot.intro.voteCount + 1 } };
    }
    async disarmTrap(trapId) {
      this.calls.push({ mode: 'disarm', trapId });
      this.latestSnapshot.trap.state = 'CLEARED';
      this.emit('snapshot', { snapshot: this.latestSnapshot, receivedAt: 3 });
      return { ok: true };
    }
    async attack(targetEnemyId) { this.calls.push({ mode: 'attack', targetEnemyId }); return { damage: 10 }; }
    async leave() { this.session = null; this.latestSnapshot = null; this.emit('session', null); }
    sendInput() {}
  }
  const cameraModes = [];
  class DungeonRenderer {
    setCameraMode(mode) {
      const normalized = mode === 'top-down' ? 'top-down' : 'angled';
      cameraModes.push(normalized);
      return normalized;
    }
    setLocalPlayer() {}
    setSelectedTarget(id) { this.selectedEnemyId = id; }
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
  const windowListeners = new Map();
  const window = {
    addEventListener(name, listener) { windowListeners.set(name, listener); },
    localStorage: {
      getItem() { throw new Error('storage unavailable'); },
      setItem() { throw new Error('storage unavailable'); }
    }
  };
  const source = fs.readFileSync(path.join(clientRoot, 'app.js'), 'utf8').replace(/^import .*;\r?\n/gm, '');
  vm.runInNewContext(source, { document, window, GameNetwork, DungeonRenderer, TouchControls, GameAudio,
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {} });

  assert.equal(get('#camera-mode').value, 'angled');
  assert.deepEqual(cameraModes, ['angled'], 'blocked storage retains the local angled default');
  get('#camera-mode').value = 'top-down';
  get('#camera-mode').trigger('change');
  assert.equal(get('#camera-mode').value, 'top-down');
  assert.deepEqual(cameraModes, ['angled', 'top-down']);

  get('#display-name').value = 'Aria';
  await get('#create-room').trigger('click');
  assert.deepEqual(gameNetwork.calls[0], { mode: 'create', displayName: 'Aria', roomCode: '' });
  assert.equal(get('#gate').hidden, true);
  assert.equal(get('#start-room').hidden, false);
  assert.equal(get('#start-room').disabled, true, 'one player cannot start');
  assert.equal(get('#add-mocks').hidden, false, 'host can add a mock party in the lobby');
  assert.equal(get('#intro-briefing').hidden, false);
  assert.equal(get('#intro-vote-status').textContent, '0 of 1 votes · 50s remaining');
  const voteStatusWrites = get('#intro-vote-status').textContentWrites;
  gameNetwork.emit('snapshot', { snapshot: gameNetwork.latestSnapshot, receivedAt: 2 });
  assert.equal(get('#intro-vote-status').textContentWrites, voteStatusWrites,
    'an unchanged displayed second does not repeat the polite live-region announcement');
  assert.equal(get('#intro-skip-vote').disabled, false);
  gameNetwork.voteCompletes = true;
  await get('#intro-skip-vote').trigger('click');
  await get('#intro-skip-vote').trigger('click');
  assert.deepEqual(gameNetwork.calls[1], { mode: 'intro-vote' });
  assert.equal(gameNetwork.calls.filter((call) => call.mode === 'intro-vote').length, 1,
    'local acknowledgement prevents repeat submissions');
  assert.equal(get('#intro-skip-vote').disabled, true);
  assert.equal(get('#status').textContent, 'The party skipped the intro.');
  assert.equal(get('#intro-briefing').hidden, false, 'acknowledgement cannot infer shared completion');
  gameNetwork.emit('session', { ...gameNetwork.session });
  assert.equal(get('#intro-skip-vote').disabled, true, 'same-session reconnect preserves the local vote marker');
  assert.equal(get('#intro-skip-vote').textContent, 'Vote recorded');
  await get('#add-mocks').trigger('click');
  assert.deepEqual(gameNetwork.calls[2], { mode: 'mocks', count: 4 });
  assert.equal(get('#player-count').textContent, '5 / 6');
  gameNetwork.latestSnapshot.players.guest = { displayName: 'Bram', connection: 'CONNECTED', health: { current: 100 } };
  gameNetwork.latestSnapshot.intro.eligibleCount = 2;
  gameNetwork.emit('snapshot', { snapshot: gameNetwork.latestSnapshot, receivedAt: 3 });
  assert.equal(get('#start-room').disabled, false);
  await get('#start-room').trigger('click');
  assert.equal(get('#phase-label').textContent, 'RUNNING');
  assert.equal(get('#hint').hidden, false);
  assert.equal(get('#intro-briefing').hidden, true, 'running rooms hide an unfinished presentation snapshot');
  gameNetwork.latestSnapshot.players.host.transform = { position: { x: 0, y: 0, z: 0 } };
  gameNetwork.latestSnapshot.enemies = {
    distant: { kind: 'DISTANT_ENEMY', health: { current: 80, max: 100 }, transform: { position: { x: 8, z: 0 } } },
    dead: { kind: 'DEFEATED_ENEMY', health: { current: 0, max: 100 }, transform: { position: { x: 0, z: 0 } } },
    nearest: { kind: 'NEAR_ENEMY', health: { current: 40, max: 50 }, transform: { position: { x: 2, z: 0 } } }
  };
  gameNetwork.emit('snapshot', { snapshot: gameNetwork.latestSnapshot, receivedAt: 3 });
  assert.equal(get('#enemy-name').textContent, 'NEAREST: NEAR ENEMY');
  assert.equal(get('#enemy-health').textContent, '40 / 50 HP');
  assert.equal(get('#attack-enemy').textContent, 'Strike · Space');
  gameNetwork.latestSnapshot.enemies.nearest.transform.position.x = 10;
  gameNetwork.emit('snapshot', { snapshot: gameNetwork.latestSnapshot, receivedAt: 3 });
  assert.equal(get('#enemy-name').textContent, 'NEAREST: DISTANT ENEMY');
  assert.equal(get('#attack-enemy').disabled, false, 'range and line of sight remain server decisions');
  gameNetwork.latestSnapshot.trap = { id: 'vault-trap', state: 'TELEGRAPHED', position: { x: 0, y: 0, z: 0 }, radius: 1 };
  gameNetwork.emit('snapshot', { snapshot: gameNetwork.latestSnapshot, receivedAt: 3 });
  assert.equal(get('#disarm-trap').hidden, false);
  await get('#disarm-trap').trigger('click');
  assert.deepEqual(gameNetwork.calls[3], { mode: 'disarm', trapId: 'vault-trap' });
  assert.equal(get('#disarm-trap').hidden, true);
  get('#combat-target').value = 'nearest';
  get('#combat-target').trigger('change');
  assert.equal(get('#enemy-name').textContent, 'SELECTED: NEAR ENEMY', 'explicit selection beats proximity');
  await get('#attack-enemy').trigger('click');
  assert.deepEqual(gameNetwork.calls.at(-1), { mode: 'attack', targetEnemyId: 'nearest' });
  assert.equal(gameNetwork.latestSnapshot.enemies.nearest.health.current, 40, 'ACK cannot predict damage');
  document.activeElement = get('#viewport');
  const key = { code: 'KeyQ', repeat: false, preventDefault() {} };
  windowListeners.get('keydown')(key);
  assert.equal(get('#combat-target').value, '', 'cycle wraps through automatic mode');
  windowListeners.get('keydown')(key);
  assert.equal(get('#combat-target').value, 'distant', 'stable ID order excludes defeated enemies');
  windowListeners.get('keydown')({ ...key, repeat: true });
  assert.equal(get('#combat-target').value, 'distant', 'held Q cannot race selection');
  document.activeElement = get('#display-name');
  windowListeners.get('keydown')(key);
  assert.equal(get('#combat-target').value, 'distant', 'typing does not change target');
  gameNetwork.latestSnapshot.space = { id: 'next-chamber', revision: 2 };
  gameNetwork.emit('snapshot', { snapshot: gameNetwork.latestSnapshot, receivedAt: 4 });
  assert.equal(get('#combat-target').value, '', 'a new space clears selection even when an ID is reused');
  get('#combat-target').value = 'distant';
  get('#combat-target').trigger('change');
  gameNetwork.latestSnapshot.enemies.distant.health.current = 0;
  gameNetwork.emit('snapshot', { snapshot: gameNetwork.latestSnapshot, receivedAt: 4 });
  assert.equal(get('#combat-target').value, '', 'dead target clears');
  get('#combat-target').value = 'nearest';
  get('#combat-target').trigger('change');
  gameNetwork.latestSnapshot.enemies = {};
  gameNetwork.emit('snapshot', { snapshot: gameNetwork.latestSnapshot, receivedAt: 5 });
  assert.equal(get('#combat-target').value, '', 'removed or previous-space target clears');
  assert.equal(get('#target-controls').hidden, true);
  await get('#leave-room').trigger('click');
  assert.equal(get('#gate').hidden, false);
  assert.equal(get('#squad').hidden, true);

  get('#display-name').value = 'Bram';
  get('#room-code').value = 'AB2C';
  get('#room-form').trigger('submit');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(gameNetwork.calls.at(-1), { mode: 'join', displayName: 'Bram', roomCode: 'AB2C' });
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

// app.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Coordinate player input and HUD state between the network and graphics adapters.

import { GameNetwork } from './network.js';
import { DungeonRenderer } from './render.js';

const $ = (selector) => document.querySelector(selector);
const ui = {
  form: $('#room-form'), name: $('#display-name'), code: $('#room-code'),
  create: $('#create-room'), join: $('#join-room'), start: $('#start-room'),
  addMocks: $('#add-mocks'),
  attack: $('#attack-enemy'), enemyPanel: $('#enemy-panel'), enemyHealth: $('#enemy-health'),
  portal: $('#enter-portal'),
  leave: $('#leave-room'), room: $('#room-label'), phase: $('#phase-label'),
  roster: $('#roster'), status: $('#status'), gate: $('#gate'), hint: $('#hint'),
  squad: $('#squad'), playerCount: $('#player-count'), startHelp: $('#start-help'),
  connection: $('#connection-label'), viewport: $('#viewport'), partyDetails: $('#party-details'),
  renderRecovery: $('#render-recovery'), renderRecoveryMessage: $('#render-recovery-message'),
  reload: $('#reload-game')
};

let renderer;
let network;
try {
  renderer = new DungeonRenderer($('#viewport'));
  network = new GameNetwork();
} catch (error) {
  ui.status.textContent = `Unable to start the game: ${error.message}`;
  throw error;
}

const keys = new Set();
let lastInput = { x: 0, z: 0, rotationY: 0 };
let lastRosterSignature = '';
let attackInFlight = false;
let portalInFlight = false;
let nearbyPortal = null;
let lastPhase = null;
let hintTicksRemaining = 0;
const INPUT_INTERVAL_MS = 1000 / 30;
const HINT_TICKS = 30 * 8;

function status(message, error = false) {
  ui.status.textContent = message;
  ui.status.dataset.error = String(error);
}

function updateUi(snapshot = network.latestSnapshot) {
  const session = network.session;
  const phase = session ? snapshot?.phase || 'LOBBY' : 'OFFLINE';
  if (phase !== lastPhase) {
    ui.partyDetails.open = phase !== 'RUNNING';
    hintTicksRemaining = phase === 'RUNNING' ? HINT_TICKS : 0;
    if (phase === 'RUNNING' && (document.activeElement === ui.start || ui.gate.contains?.(document.activeElement))) {
      ui.viewport.focus?.({ preventScroll: true });
    }
    lastPhase = phase;
  }
  document.documentElement.classList.toggle('in-room', Boolean(session));
  document.documentElement.classList.toggle('is-running', phase === 'RUNNING');
  ui.gate.hidden = Boolean(session);
  ui.squad.hidden = !session;
  ui.room.textContent = session ? session.roomCode : '—';
  ui.phase.textContent = phase === 'RUNNING' && Number.isSafeInteger(snapshot?.floor?.index)
    ? `FLOOR ${snapshot.floor.index}` : phase;
  ui.leave.hidden = !session;
  const players = snapshot?.players ? Object.entries(snapshot.players) : [];
  const activeCount = players.filter(([, player]) => player?.connection === 'CONNECTED' || player?.connection === 'BOT').length;
  const isHost = Boolean(session && snapshot?.hostPlayerId === session.playerId);
  ui.playerCount.textContent = `${activeCount} / 6`;
  ui.start.hidden = !isHost || snapshot?.phase !== 'LOBBY';
  ui.start.disabled = activeCount < 2 || !network.socket.connected;
  ui.addMocks.hidden = !isHost || snapshot?.phase !== 'LOBBY';
  ui.addMocks.disabled = activeCount >= 6 || !network.socket.connected;
  ui.startHelp.hidden = snapshot?.phase !== 'LOBBY';
  ui.startHelp.textContent = isHost
    ? activeCount < 2 ? 'Invite an explorer or a mock party before the run can begin.' : 'Your party is ready. Begin when everyone is prepared.'
    : 'Waiting for the room host to begin the expedition.';
  ui.hint.hidden = phase !== 'RUNNING' || hintTicksRemaining <= 0;
  const enemy = Object.values(snapshot?.enemies || {})[0];
  ui.enemyPanel.hidden = snapshot?.phase !== 'RUNNING' || !enemy;
  ui.enemyHealth.textContent = enemy ? `${enemy.health.current} / ${enemy.health.max} HP` : '—';
  ui.attack.hidden = snapshot?.phase !== 'RUNNING';
  ui.attack.disabled = !enemy || enemy.health.current <= 0 ||
    (snapshot?.players?.[session?.playerId]?.health?.current ?? 0) <= 0 ||
    !network.socket.connected || attackInFlight;
  ui.attack.textContent = enemy?.health.current === 0 ? 'Sentinel defeated' : 'Strike sentinel · Space';
  nearbyPortal = null;
  const localPosition = snapshot?.players?.[session?.playerId]?.transform?.position;
  if (phase === 'RUNNING' && localPosition && Number.isFinite(localPosition.x) && Number.isFinite(localPosition.z)) {
    let nearestDistance = Infinity;
    for (const portal of Array.isArray(snapshot?.portals) ? snapshot.portals : []) {
      if (!portal || typeof portal.id !== 'string' || !Number.isFinite(portal.position?.x) ||
        !Number.isFinite(portal.position?.z) || !Number.isFinite(portal.interactionRadius)) continue;
      const distance = Math.hypot(localPosition.x - portal.position.x, localPosition.z - portal.position.z);
      if (distance <= Math.min(5, Math.max(0, portal.interactionRadius)) + 0.35 && distance < nearestDistance) {
        nearbyPortal = portal;
        nearestDistance = distance;
      }
    }
  }
  ui.portal.hidden = !nearbyPortal;
  ui.portal.disabled = !nearbyPortal || nearbyPortal.state !== 'AVAILABLE' || portalInFlight || !network.socket.connected ||
    (snapshot?.players?.[session?.playerId]?.health?.current ?? 0) <= 0;
  ui.portal.textContent = nearbyPortal?.state === 'SEALED' ? 'Portal sealed · complete the objective' : 'Enter portal · E';
  const rosterSignature = JSON.stringify(players.map(([id, player]) =>
    [id, player?.displayName, player?.connection, player?.health?.current, snapshot?.hostPlayerId]));
  if (rosterSignature !== lastRosterSignature) {
    lastRosterSignature = rosterSignature;
    ui.roster.replaceChildren();
    for (const [id, player] of players) {
      if (!player || typeof player.displayName !== 'string') continue;
      const row = document.createElement('li');
      if (player.connection !== 'CONNECTED') row.classList.add('disconnected');
      const name = document.createElement('span');
      name.textContent = `${id === session?.playerId ? 'You · ' : ''}${player.displayName}${id === snapshot.hostPlayerId ? ' (host)' : ''}${player.connection === 'BOT' ? ' (mock)' : ''}`;
      const state = document.createElement('span');
      state.textContent = player.connection === 'CONNECTED' ? `${player.health?.current ?? '—'} HP` : player.connection === 'BOT' ? 'BOT' : 'offline';
      row.append(name, state);
      ui.roster.append(row);
    }
  }
}

async function enter(mode) {
  ui.create.disabled = ui.join.disabled = true;
  try {
    const result = await network.enter(mode, ui.name.value, ui.code.value);
    status(mode === 'create' ? `Room ${result.roomCode} created. Share the code with friends.` : `Joined room ${result.roomCode}.`);
  } catch (error) {
    status(error.message, true);
  } finally { ui.create.disabled = ui.join.disabled = false; }
}

ui.form.addEventListener('submit', (event) => { event.preventDefault(); enter('join'); });
ui.create.addEventListener('click', () => enter('create'));
ui.addMocks.addEventListener('click', async () => {
  ui.addMocks.disabled = true;
  try {
    const result = await network.addMocks(4);
    status(`${result.added} mock explorers joined the expedition.`);
  } catch (error) { status(`Could not add mock explorers: ${error.message}`, true); }
  finally { updateUi(); }
});
ui.start.addEventListener('click', async () => {
  ui.start.disabled = true;
  try { await network.start(); status('Dungeon run started'); }
  catch (error) { status(`Could not start: ${error.message}`, true); }
  finally { updateUi(); }
});
async function attack() {
  if (attackInFlight || ui.attack.disabled) return;
  attackInFlight = true;
  ui.attack.disabled = true;
  try {
    const result = await network.attack();
    status(result.defeated ? 'Sentinel defeated!' : `Sentinel hit for ${result.damage} damage.`);
  } catch (error) {
    status(error.message === 'OUT_OF_RANGE' ? 'Move closer to the sentinel to strike.' : `Strike failed: ${error.message}`, true);
  } finally {
    attackInFlight = false;
    updateUi();
  }
}
ui.attack.addEventListener('click', attack);
async function enterPortal() {
  if (!nearbyPortal || ui.portal.disabled || portalInFlight) return;
  portalInFlight = true;
  const portalId = nearbyPortal.id;
  const roomCode = network.session?.roomCode;
  ui.portal.disabled = true;
  try {
    await network.enterPortal(portalId);
    if (network.session?.roomCode === roomCode) status('Portal entry accepted. The party is shifting…');
  } catch (error) {
    const message = error.message === 'OUT_OF_RANGE' ? 'Move closer to the portal.'
      : error.message === 'OBJECTIVES_INCOMPLETE' ? 'Complete the floor objective first.'
        : `Portal entry failed: ${error.message}`;
    if (network.session?.roomCode === roomCode) status(message, true);
  } finally {
    portalInFlight = false;
    updateUi();
  }
}
ui.portal.addEventListener('click', enterPortal);
ui.leave.addEventListener('click', async () => {
  ui.leave.disabled = true;
  await network.leave();
  renderer.setLocalPlayer(null);
  keys.clear();
  status('Left the room');
  updateUi();
  ui.leave.disabled = false;
});
ui.viewport.addEventListener('pointerdown', (event) => {
  if (event.target === ui.viewport || event.target.tagName === 'CANVAS') ui.viewport.focus?.({ preventScroll: true });
});
ui.reload.addEventListener('click', () => window.location.reload());
let graphicsWasInterrupted = false;
function showGraphicsState(event) {
  const state = event.detail?.state;
  if (state === 'ready') {
    ui.renderRecovery.hidden = true;
    if (graphicsWasInterrupted) status('3D view restored. Continue the expedition.');
    graphicsWasInterrupted = false;
    return;
  }
  graphicsWasInterrupted = true;
  ui.renderRecovery.hidden = false;
  ui.renderRecoveryMessage.textContent = state === 'lost'
    ? 'The 3D view lost its graphics connection. We are trying to restore it. Reload if it stays paused.'
    : 'The 3D view could not recover. Reload the game to reconnect.';
  status(state === 'lost' ? 'Graphics paused; attempting recovery.' : 'Graphics recovery failed.', true);
}
ui.viewport.addEventListener('graphics-state', showGraphicsState);
if (renderer.graphicsState === 'error') showGraphicsState({ detail: { state: 'error' } });

network.addEventListener('session', (event) => {
  renderer.resetSession();
  renderer.setLocalPlayer(event.detail?.playerId || null);
  lastRosterSignature = '';
  updateUi();
});
network.addEventListener('snapshot', (event) => {
  const { snapshot, receivedAt } = event.detail;
  renderer.pushSnapshot(snapshot, receivedAt);
  updateUi(snapshot);
});
network.addEventListener('discovery', (event) => {
  renderer.reveal(event.detail.nodeId);
  status('A hidden chamber has been revealed');
});
network.addEventListener('portal-resolved', () => status('The party entered a new chamber.'));
network.addEventListener('floor-completed', () => status('Floor complete. Your party advanced together.'));
network.addEventListener('enemy-hit', (event) => {
  if (event.detail.attackerPlayerId !== network.session?.playerId) {
    status(event.detail.defeated ? 'Your party defeated the sentinel!' : `An explorer struck the sentinel for ${event.detail.damage}.`);
  }
});
network.addEventListener('player-hit', (event) => {
  status(event.detail.currentHealth === 0 ? 'You have fallen. Your party can continue fighting.' : `The sentinel hit you for ${event.detail.amount}.`, true);
});
network.addEventListener('notice', (event) => status(event.detail));
network.addEventListener('error', (event) => {
  ui.connection.textContent = 'OFFLINE';
  ui.connection.dataset.state = 'offline';
  status(event.detail, true);
});
network.addEventListener('connection', (event) => {
  ui.connection.textContent = event.detail.connected ? 'CONNECTED' : 'RECONNECTING';
  ui.connection.dataset.state = event.detail.connected ? 'connected' : 'reconnecting';
  updateUi();
});

const trackedKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
// Why: Keep gameplay commands away from focused room controls and modal surfaces.
// Input: The active DOM focus and the latest server-approved phase; both may change between key events.
// Output: True only while a connected explorer can control the visible playfield.
// Watch Out: Focus changes clear held keys so stale movement cannot resume after a menu closes.
function canControlGame() {
  const focus = document.activeElement;
  const playfieldFocused = focus === ui.viewport || focus === document.body || focus === document.documentElement;
  const modalOpen = (document.querySelectorAll?.('dialog[open], [aria-modal="true"]:not([hidden])')?.length || 0) > 0;
  const localHealth = network.latestSnapshot?.players?.[network.session?.playerId]?.health?.current;
  return Boolean(network.session && network.socket.connected && network.latestSnapshot?.phase === 'RUNNING' &&
    Number.isFinite(localHealth) && localHealth > 0 && !document.hidden && playfieldFocused && !modalOpen);
}
window.addEventListener('keydown', (event) => {
  if (!canControlGame()) return;
  if (event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat) attack();
    return;
  }
  if (event.code === 'KeyE' && nearbyPortal?.state === 'AVAILABLE') {
    event.preventDefault();
    if (!event.repeat) enterPortal();
    return;
  }
  if (!trackedKeys.has(event.code)) return;
  event.preventDefault();
  keys.add(event.code);
});
window.addEventListener('keyup', (event) => {
  if (!trackedKeys.has(event.code)) return;
  if (canControlGame()) event.preventDefault();
  keys.delete(event.code);
});
document.addEventListener('focusin', () => { keys.clear(); renderer.setInput(0, 0); });
window.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => { if (document.hidden) keys.clear(); });

function sampleInput() {
  if (!canControlGame()) keys.clear();
  if (hintTicksRemaining > 0) {
    hintTicksRemaining -= 1;
    if (hintTicksRemaining === 0) ui.hint.hidden = true;
  }
  const x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  const z = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
  const length = Math.hypot(x, z) || 1;
  const moveX = x / length;
  const moveZ = z / length;
  const rotationY = x || z ? Math.atan2(moveX, moveZ) : lastInput.rotationY;
  lastInput = { x: moveX, z: moveZ, rotationY };
  renderer.setInput(moveX, moveZ);
  network.sendInput(moveX, moveZ, rotationY);
}
const inputTimer = setInterval(sampleInput, INPUT_INTERVAL_MS);
window.addEventListener('beforeunload', () => { clearInterval(inputTimer); renderer.dispose(); });

if (network.restoreStoredSession()) status('Restoring your room session…');
else { network.connect(); status('Enter a name to create or join a room'); }
updateUi();

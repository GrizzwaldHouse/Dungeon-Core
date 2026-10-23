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
  leave: $('#leave-room'), room: $('#room-label'), phase: $('#phase-label'),
  roster: $('#roster'), status: $('#status'), gate: $('#gate'), hint: $('#hint'),
  squad: $('#squad'), playerCount: $('#player-count'), startHelp: $('#start-help'),
  connection: $('#connection-label')
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
const INPUT_INTERVAL_MS = 1000 / 30;

function status(message, error = false) {
  ui.status.textContent = message;
  ui.status.dataset.error = String(error);
}

function updateUi(snapshot = network.latestSnapshot) {
  const session = network.session;
  document.documentElement.classList.toggle('in-room', Boolean(session));
  ui.gate.hidden = Boolean(session);
  ui.squad.hidden = !session;
  ui.room.textContent = session ? session.roomCode : '—';
  ui.phase.textContent = snapshot?.phase || 'OFFLINE';
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
  ui.hint.hidden = snapshot?.phase !== 'RUNNING';
  const enemy = Object.values(snapshot?.enemies || {})[0];
  ui.enemyPanel.hidden = snapshot?.phase !== 'RUNNING' || !enemy;
  ui.enemyHealth.textContent = enemy ? `${enemy.health.current} / ${enemy.health.max} HP` : '—';
  ui.attack.hidden = snapshot?.phase !== 'RUNNING';
  ui.attack.disabled = !enemy || enemy.health.current <= 0 ||
    (snapshot?.players?.[session?.playerId]?.health?.current ?? 0) <= 0 ||
    !network.socket.connected || attackInFlight;
  ui.attack.textContent = enemy?.health.current === 0 ? 'Sentinel defeated' : 'Strike sentinel · Space';
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
ui.leave.addEventListener('click', async () => {
  ui.leave.disabled = true;
  await network.leave();
  renderer.setLocalPlayer(null);
  keys.clear();
  status('Left the room');
  updateUi();
  ui.leave.disabled = false;
});

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
  status(event.detail, true);
});
network.addEventListener('connection', (event) => {
  ui.connection.textContent = event.detail.connected ? 'CONNECTED' : 'RECONNECTING';
  updateUi();
});

const trackedKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    if (!event.repeat) attack();
    return;
  }
  if (!trackedKeys.has(event.code) || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  event.preventDefault();
  keys.add(event.code);
});
window.addEventListener('keyup', (event) => {
  if (!trackedKeys.has(event.code)) return;
  event.preventDefault();
  keys.delete(event.code);
});
window.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => { if (document.hidden) keys.clear(); });

function sampleInput() {
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

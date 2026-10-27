// app.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Coordinate player input and HUD state between the network and graphics adapters.

import { GameNetwork } from './network.js';
import { DungeonRenderer } from './render.js';
import { TouchControls } from './touch-controls.js';
import { GameAudio } from './audio.js';

const $ = (selector) => document.querySelector(selector);
const ui = {
  form: $('#room-form'), name: $('#display-name'), code: $('#room-code'),
  create: $('#create-room'), join: $('#join-room'), start: $('#start-room'),
  addMocks: $('#add-mocks'),
  attack: $('#attack-enemy'), enemyPanel: $('#enemy-panel'), enemyName: $('#enemy-name'), enemyHealth: $('#enemy-health'),
  vitals: $('#player-vitals'), playerHealth: $('#player-health'), healingCharges: $('#healing-charges'),
  portal: $('#enter-portal'), disarm: $('#disarm-trap'),
  collect: $('#collect-item'), use: $('#use-item'), revive: $('#revive-player'),
  sound: $('#sound-toggle'), objective: $('#objective-label'), touch: $('#touch-controls'),
  leave: $('#leave-room'), room: $('#room-label'), phase: $('#phase-label'),
  roster: $('#roster'), status: $('#status'), gate: $('#gate'), hint: $('#hint'),
  squad: $('#squad'), playerCount: $('#player-count'), startHelp: $('#start-help'),
  connection: $('#connection-label'), viewport: $('#viewport'), partyDetails: $('#party-details'),
  renderRecovery: $('#render-recovery'), renderRecoveryMessage: $('#render-recovery-message'),
  reload: $('#reload-game'), damageFlash: $('#damage-flash'), cameraMode: $('#camera-mode')
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

const CAMERA_PREFERENCE_KEY = 'dungeon-core:camera-mode:v1';
// Camera preference is presentation-only; blocked browser storage must never prevent joining a room.
let savedCameraMode = 'angled';
try { savedCameraMode = window.localStorage.getItem(CAMERA_PREFERENCE_KEY) || 'angled'; } catch {}
ui.cameraMode.value = renderer.setCameraMode(savedCameraMode);
ui.cameraMode.addEventListener('change', () => {
  const mode = renderer.setCameraMode(ui.cameraMode.value);
  ui.cameraMode.value = mode;
  try { window.localStorage.setItem(CAMERA_PREFERENCE_KEY, mode); } catch {}
});

const keys = new Set();
let lastInput = { x: 0, z: 0, rotationY: 0 };
let lastRosterSignature = '';
let attackInFlight = false;
let portalInFlight = false;
let disarmInFlight = false;
let nearbyPortal = null;
let nearbyTrap = null;
let nearbyItem = null;
let nearbyDowned = null;
let touchMove = { x: 0, z: 0 };
const audio = new GameAudio();
const touch = new TouchControls(ui.touch, {
  onMove: (move) => { touchMove = move; },
  onAction: (action) => {
    if (action === 'attack') attack();
    else if (action === 'portal') enterPortal();
    else if (action === 'disarm') disarmTrap();
    else if (action === 'collect') collectItem();
    else if (action === 'use') useItem();
    else if (action === 'revive') revivePlayer();
  }
});
let lastPhase = null;
let hintTicksRemaining = 0;
let feedbackTimer = null;
const INPUT_INTERVAL_MS = 1000 / 30;
const HINT_TICKS = 30 * 8;

function status(message, error = false) {
  ui.status.textContent = message;
  ui.status.dataset.error = String(error);
}

// Why: Acknowledged combat and supply events need a short visible response without changing simulation state.
// Input: A trusted local presentation category derived from validated network events or action acknowledgements.
// Output: One bounded, replaceable viewport pulse that automatically clears.
// Watch Out: Reduced-motion CSS removes camera motion while preserving the non-motion damage vignette.
function pulseFeedback(kind) {
  const damaged = kind === 'damage';
  ui.viewport.classList.toggle('feedback-damage', damaged);
  ui.viewport.classList.toggle('feedback-confirm', !damaged);
  ui.damageFlash.classList.toggle('is-active', damaged);
  if (feedbackTimer !== null) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    ui.viewport.classList.toggle('feedback-damage', false);
    ui.viewport.classList.toggle('feedback-confirm', false);
    ui.damageFlash.classList.toggle('is-active', false);
    feedbackTimer = null;
  }, damaged ? 220 : 200);
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
  const localPlayer = snapshot?.players?.[session?.playerId];
  const localHealth = localPlayer?.health?.current;
  const localMaxHealth = localPlayer?.health?.max;
  ui.vitals.hidden = phase !== 'RUNNING' || !localPlayer;
  ui.playerHealth.textContent = Number.isFinite(localHealth) && Number.isFinite(localMaxHealth)
    ? `${localHealth} / ${localMaxHealth}` : '—';
  ui.playerHealth.dataset.state = Number.isFinite(localHealth) && Number.isFinite(localMaxHealth) && localHealth <= localMaxHealth * 0.3
    ? 'critical' : 'ready';
  ui.healingCharges.textContent = String(localPlayer?.inventory?.healingCharges ?? 0);
  touch.setEnabled(phase === 'RUNNING' && network.socket.connected && (localPlayer?.health?.current ?? 0) > 0);
  ui.gate.hidden = Boolean(session);
  ui.squad.hidden = !session;
  ui.room.textContent = session ? session.roomCode : '—';
  ui.phase.textContent = phase === 'RUNNING' && Number.isSafeInteger(snapshot?.floor?.index)
    ? `FLOOR ${snapshot.floor.index} · ${snapshot.floor.phase?.replaceAll('_', ' ') || 'EXPLORE'}` : phase;
  const objectiveByStage = {
    FLOOR_ONE: 'Learn the dungeon: defeat the Sentinel, explore, and disarm the vault trap.',
    REST: 'Safe chamber: collect supplies, heal allies, and enter the next portal.',
    FLOOR_TWO: 'Defeat the Threshold Keeper, then the Mirror Hexer and its Shardlings.',
    FLOOR_THREE: 'Clear two mob waves and gather a personal share of the caches.',
    DEEPWOOD: 'Face the Deepwood Sentinel. Evade rooted ground and strike its flying Barkwings before the rune trial.',
    FLOOR_FOUR: 'Solve the rune trial and defeat its guardian.',
    FLOOR_FIVE: 'Defeat the Shifting Core Warden and its phased minions.'
  };
  ui.objective.textContent = phase === 'RUNNING' ? (objectiveByStage[snapshot?.floor?.phase] || 'Explore the chamber together.') :
    phase === 'FAILED' ? 'The party fell. Create a new room to try again.' : 'Find your party, then begin the expedition.';
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
  // This is a snapshot-based proximity display; the server independently checks range and line of sight.
  const position = localPlayer?.transform?.position;
  let enemy = null;
  let closestDistance = Infinity;
  if (Number.isFinite(position?.x) && Number.isFinite(position?.z)) {
    for (const entry of Object.values(snapshot?.enemies || {})) {
      const enemyPosition = entry?.transform?.position;
      if (!(entry?.health?.current > 0) || !Number.isFinite(enemyPosition?.x) || !Number.isFinite(enemyPosition?.z)) continue;
      const distance = Math.hypot(enemyPosition.x - position.x, enemyPosition.z - position.z);
      if (distance <= closestDistance) { closestDistance = distance; enemy = entry; }
    }
  }
  ui.enemyPanel.hidden = snapshot?.phase !== 'RUNNING' || !enemy;
  ui.enemyName.textContent = enemy ? `NEAREST: ${enemy.kind?.replaceAll('_', ' ') || 'ENEMY'}` : 'ENEMY';
  ui.enemyHealth.textContent = enemy ? `${enemy.health.current} / ${enemy.health.max} HP` : '—';
  ui.attack.hidden = snapshot?.phase !== 'RUNNING';
  ui.attack.disabled = !enemy || enemy.health.current <= 0 ||
    (snapshot?.players?.[session?.playerId]?.health?.current ?? 0) <= 0 ||
    !network.socket.connected || attackInFlight;
  ui.attack.textContent = enemy ? 'Strike · Space' : 'No enemy tracked';
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
  nearbyTrap = null;
  const trap = snapshot?.trap;
  if (phase === 'RUNNING' && localPosition && trap?.id === 'vault-trap' && trap.state !== 'CLEARED' &&
    Number.isFinite(trap.position?.x) && Number.isFinite(trap.position?.z) && Number.isFinite(trap.radius) &&
    Math.hypot(localPosition.x - trap.position.x, localPosition.z - trap.position.z) <= trap.radius + 1.1) {
    nearbyTrap = trap;
  }
  ui.disarm.hidden = !nearbyTrap;
  ui.disarm.disabled = !nearbyTrap || disarmInFlight || !network.socket.connected ||
    (snapshot?.players?.[session?.playerId]?.health?.current ?? 0) <= 0;
  nearbyItem = (snapshot?.items || []).find((item) => !item.claimedBy?.includes(session?.playerId) &&
    localPosition && Math.hypot(localPosition.x - item.position.x, localPosition.z - item.position.z) <= 2.2) || null;
  ui.collect.hidden = !nearbyItem;
  ui.collect.disabled = !nearbyItem || !network.socket.connected || (localPlayer?.health?.current ?? 0) <= 0;
  ui.use.hidden = phase !== 'RUNNING' || (localPlayer?.inventory?.healingCharges ?? 0) <= 0;
  ui.use.disabled = !network.socket.connected || (localPlayer?.health?.current ?? 0) <= 0 ||
    (localPlayer?.health?.current ?? 0) >= (localPlayer?.health?.max ?? 0);
  nearbyDowned = players.find(([id, ally]) => id !== session?.playerId && ally.connection !== 'BOT' &&
    ally.health?.current === 0 && localPosition &&
    Math.hypot(localPosition.x - ally.transform?.position?.x, localPosition.z - ally.transform?.position?.z) <= 2.2)?.[0] || null;
  ui.revive.hidden = !nearbyDowned;
  ui.revive.disabled = !nearbyDowned || !network.socket.connected || (localPlayer?.inventory?.healingCharges ?? 0) <= 0;
  const rosterSignature = JSON.stringify(players.map(([id, player]) =>
    [id, player?.displayName, player?.connection, player?.health?.current, player?.bot?.intent,
      player?.bot?.targetId, snapshot?.hostPlayerId]));
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
      const botIntent = typeof player.bot?.intent === 'string' ? player.bot.intent.replaceAll('_', ' ').toLowerCase() : 'waiting';
      state.textContent = player.connection === 'CONNECTED' ? `${player.health?.current ?? '—'} HP`
        : player.connection === 'BOT' ? `${player.health?.current ?? '—'} HP · ${botIntent}` : 'offline';
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
    status(result.defeated ? 'Enemy defeated!' : `Enemy hit for ${result.damage} damage.`);
    audio.play('strike');
    pulseFeedback('confirm');
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
async function disarmTrap() {
  if (!nearbyTrap || ui.disarm.disabled || disarmInFlight) return;
  disarmInFlight = true;
  ui.disarm.disabled = true;
  const roomCode = network.session?.roomCode;
  try {
    await network.disarmTrap(nearbyTrap.id);
    if (network.session?.roomCode === roomCode) status('Trap disarmed. The way ahead is safer.');
  } catch (error) {
    if (network.session?.roomCode === roomCode) status(error.message === 'OUT_OF_RANGE'
      ? 'Move closer to the trap to disarm it.' : `Disarm failed: ${error.message}`, true);
  } finally {
    disarmInFlight = false;
    updateUi();
  }
}
ui.disarm.addEventListener('click', disarmTrap);
async function collectItem() {
  if (!nearbyItem || ui.collect.disabled) return;
  try {
    await network.collectItem(nearbyItem.id);
    status('Supply collected for your explorer.');
    audio.play('pickup');
    pulseFeedback('confirm');
  } catch (error) { status(`Collect failed: ${error.message}`, true); }
}
async function useItem() {
  if (ui.use.disabled) return;
  try {
    const result = await network.useItem();
    status(`Healing used. ${result.currentHealth} HP.`);
    audio.play('heal');
    pulseFeedback('confirm');
  } catch (error) { status(`Heal failed: ${error.message}`, true); }
}
async function revivePlayer() {
  if (!nearbyDowned || ui.revive.disabled) return;
  try {
    await network.revivePlayer(nearbyDowned);
    status('Explorer revived.');
    audio.play('revive');
    pulseFeedback('confirm');
  } catch (error) { status(`Revive failed: ${error.message}`, true); }
}
ui.collect.addEventListener('click', collectItem);
ui.use.addEventListener('click', useItem);
ui.revive.addEventListener('click', revivePlayer);
ui.sound.addEventListener('click', async () => {
  const enabled = await audio.toggle();
  ui.sound.textContent = enabled ? 'Sound on' : 'Sound off';
  ui.sound.setAttribute('aria-pressed', String(enabled));
  if (enabled) audio.play('pickup');
});
ui.leave.addEventListener('click', async () => {
  ui.leave.disabled = true;
  await network.leave();
  renderer.setLocalPlayer(null);
  keys.clear();
  touch.release();
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
network.addEventListener('portal-resolved', () => audio.play('portal'));
network.addEventListener('trap-disarmed', (event) => {
  if (event.detail.playerId !== network.session?.playerId) status('An explorer disarmed the trap.');
});
network.addEventListener('floor-completed', () => status('Floor complete. Your party advanced together.'));
network.addEventListener('floor-completed', () => audio.play('victory'));
network.addEventListener('floor-transition', (event) => {
  status(`Floor ${event.detail.floorIndex}: ${event.detail.toStage.replaceAll('_', ' ').toLowerCase()}.`);
  audio.play('portal');
});
network.addEventListener('run-failed', () => { status('The party has fallen. This run is over.', true); audio.play('defeat'); });
network.addEventListener('run-cycle', (event) => {
  status(`Core defeated! Cycle ${event.detail.cycle} begins. Your party kept its levels and banked riches.`);
  audio.play('victory');
});
network.addEventListener('item-collected', (event) => {
  audio.play('pickup');
  if (event.detail.playerId === network.session?.playerId) pulseFeedback('confirm');
});
network.addEventListener('player-revived', (event) => {
  audio.play('revive');
  if (event.detail.targetPlayerId === network.session?.playerId) pulseFeedback('confirm');
});
network.addEventListener('enemy-hit', (event) => {
  if (event.detail.attackerPlayerId !== network.session?.playerId) {
    status(event.detail.defeated ? 'Your party defeated an enemy!' : `An explorer struck an enemy for ${event.detail.damage}.`);
    audio.play('enemyHit');
  }
});
network.addEventListener('player-hit', (event) => {
  status(event.detail.currentHealth === 0 ? 'You have fallen. An ally may revive you.' : `You took ${event.detail.amount} damage.`, true);
  audio.play('damage');
  pulseFeedback('damage');
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
  if (event.code === 'KeyF' && nearbyTrap) {
    event.preventDefault();
    if (!event.repeat) disarmTrap();
    return;
  }
  if (event.code === 'KeyG' && nearbyItem) { event.preventDefault(); if (!event.repeat) collectItem(); return; }
  if (event.code === 'KeyH') { event.preventDefault(); if (!event.repeat) useItem(); return; }
  if (event.code === 'KeyR' && nearbyDowned) { event.preventDefault(); if (!event.repeat) revivePlayer(); return; }
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
  const x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + touchMove.x;
  const z = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + touchMove.z;
  const length = Math.hypot(x, z) || 1;
  const moveX = x / length;
  const moveZ = z / length;
  const rotationY = x || z ? Math.atan2(moveX, moveZ) : lastInput.rotationY;
  lastInput = { x: moveX, z: moveZ, rotationY };
  renderer.setInput(moveX, moveZ);
  network.sendInput(moveX, moveZ, rotationY);
}
const inputTimer = setInterval(sampleInput, INPUT_INTERVAL_MS);
window.addEventListener('beforeunload', () => {
  clearInterval(inputTimer);
  if (feedbackTimer !== null) clearTimeout(feedbackTimer);
  touch.dispose();
  audio.dispose();
  renderer.dispose();
});

if (network.restoreStoredSession()) status('Restoring your room session…');
else { network.connect(); status('Enter a name to create or join a room'); }
updateUi();

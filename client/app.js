// app.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Coordinate player input and HUD state between the network and graphics adapters.

import { GameNetwork } from './network.js';
import { DungeonRenderer } from './render.js';
import { TouchControls } from './touch-controls.js';
import { GameAudio } from './audio.js';
import { chapterForTransition, claimChapter } from './story-chapters.js';

const $ = (selector) => document.querySelector(selector);
const ui = {
  form: $('#room-form'), name: $('#display-name'), code: $('#room-code'),
  create: $('#create-room'), join: $('#join-room'), start: $('#start-room'),
  addMocks: $('#add-mocks'),
  results: $('#expedition-results'), resultsTitle: $('#results-title'), resultsSummary: $('#results-summary'),
  resultsPlayers: $('#results-players'), resultsKicker: $('#results-kicker'), resultsCopy: $('#results-copy'),
  resultsStatus: $('#results-status'),
  continueCycle: $('#continue-cycle'), resultsHelp: $('#results-help'), resultsLeave: $('#results-leave'), partyStatus: $('#party-status'),
  attack: $('#attack-enemy'), enemyPanel: $('#enemy-panel'), enemyName: $('#enemy-name'), enemyHealth: $('#enemy-health'),
  targetControls: $('#target-controls'), target: $('#combat-target'), targetStatus: $('#target-status'), touchTarget: $('#touch-target'),
  vitals: $('#player-vitals'), playerHealth: $('#player-health'), healingCharges: $('#healing-charges'),
  portal: $('#enter-portal'), disarm: $('#disarm-trap'),
  collect: $('#collect-item'), use: $('#use-item'), revive: $('#revive-player'),
  sound: $('#sound-toggle'), recover: $('#recover-position'), objective: $('#objective-label'), touch: $('#touch-controls'),
  leave: $('#leave-room'), room: $('#room-label'), phase: $('#phase-label'), floorBanner: $('#floor-banner'),
  roster: $('#roster'), status: $('#status'), gate: $('#gate'), hint: $('#hint'),
  squad: $('#squad'), playerCount: $('#player-count'), startHelp: $('#start-help'),
  connection: $('#connection-label'), viewport: $('#viewport'), partyDetails: $('#party-details'),
  introBriefing: $('#intro-briefing'), introVoteStatus: $('#intro-vote-status'),
  introSkipVote: $('#intro-skip-vote'),
  renderRecovery: $('#render-recovery'), renderRecoveryMessage: $('#render-recovery-message'),
  reload: $('#reload-game'), damageFlash: $('#damage-flash'), cameraMode: $('#camera-mode'),
  hudToggle: $('#hud-toggle'), viewActions: $('#view-actions'), zoomOut: $('#zoom-out'), zoomIn: $('#zoom-in'), hudOpacity: $('#hud-opacity'), hudOpacityValue: $('#hud-opacity-value'),
  story: $('#story-chapter'), storyArt: $('#story-chapter-art'), storyTitle: $('#story-chapter-title'),
  storyCopy: $('#story-chapter-copy'), storyContinue: $('#story-chapter-continue')
};

let renderer;
let network;
try {
  renderer = new DungeonRenderer($('#viewport'));
  network = new GameNetwork();
} catch (error) {
  ui.status.textContent = 'The game could not load. Check your connection, then reload this page.';
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

const HUD_OPACITY_KEY = 'dungeon-core:hud-opacity:v1';
// Why: A solid HUD can hide the scene on narrow phones and angled desktop views.
// Input: A local range value from 35 to 100 percent; malformed storage falls back safely.
// Output: CSS receives a presentation-only alpha and the setting remains local to this device.
function setHudOpacity(value) {
  const numeric = Math.min(100, Math.max(35, Number(value) || 94));
  document.documentElement?.style?.setProperty('--hud-alpha', String(numeric / 100));
  ui.hudOpacity.value = String(numeric);
  ui.hudOpacityValue.value = `${numeric}%`;
  ui.hudOpacityValue.textContent = `${numeric}%`;
  try { window.localStorage.setItem(HUD_OPACITY_KEY, String(numeric)); } catch {}
}
let savedHudOpacity = 94;
try { savedHudOpacity = Number(window.localStorage.getItem(HUD_OPACITY_KEY)) || 94; } catch {}
setHudOpacity(savedHudOpacity);
ui.hudOpacity.addEventListener('input', () => setHudOpacity(ui.hudOpacity.value));

// The mobile mission panel starts compact so the playfield remains visible.
ui.hudToggle.addEventListener('click', () => {
  const expanded = ui.squad.dataset.expanded !== 'true';
  ui.squad.dataset.expanded = String(expanded);
  ui.hudToggle.setAttribute('aria-expanded', String(expanded));
  ui.hudToggle.textContent = expanded ? 'Hide mission' : 'Mission & view';
});

// Why: Room-code entry should make the intended join action unmistakable before a form submit.
// Input: The room field's current value, including mobile keyboard edits.
// Output: A scoped class and accessible label that guide the player without changing room authority.
function updateJoinIntent() {
  const hasCode = ui.code.value.trim().length > 0;
  ui.form.classList.toggle('has-room-code', hasCode);
  ui.join.setAttribute('aria-label', hasCode ? 'Join a room using the entered code' : 'Join a room');
}
ui.code.addEventListener('input', updateJoinIntent);
ui.code.addEventListener('change', updateJoinIntent);
updateJoinIntent();
ui.zoomOut.addEventListener('click', () => renderer.setCameraZoom(renderer.cameraZoom + 0.2));
ui.zoomIn.addEventListener('click', () => renderer.setCameraZoom(renderer.cameraZoom - 0.2));

const keys = new Set();
let lastInput = { x: 0, z: 0, rotationY: 0 };
let lastRosterSignature = '';
let attackInFlight = false;
let selectedEnemyId = null;
let targetOptionsSignature = '';
let targetSpaceKey = null;
let portalInFlight = false;
let disarmInFlight = false;
let pendingCycleKey = null;
let leaveInFlight = false;
let nearbyPortal = null;
let nearbyTrap = null;
let nearbyItem = null;
let nearbyDowned = null;
let touchMove = { x: 0, z: 0 };
const audio = new GameAudio();
const touch = new TouchControls(ui.touch, {
  onMove: (move) => { touchMove = move; },
  onAction: (action) => {
    if (action === 'attack') return attack();
    else if (action === 'target') cycleTarget();
    else if (action === 'portal') enterPortal();
    else if (action === 'disarm') disarmTrap();
    else if (action === 'collect') collectItem();
    else if (action === 'use') useItem();
    else if (action === 'revive') revivePlayer();
    else if (action === 'recover') recoverPosition();
  }
});

// Why: Keep illustrated story local to the player after the server confirms travel.
// Input: A validated room transition from GameNetwork; no chapter changes game rules.
// Output: One dismissible chapter per player, room, cycle, and destination.
function showTravelChapter(type, detail) {
  const chapter = chapterForTransition(type, { ...detail,
    cycle: detail?.cycle ?? network.latestSnapshot?.floor?.cycle });
  if (!chapter || !network.session) return false;
  let storage = null;
  try { storage = window.sessionStorage; } catch {}
  if (!claimChapter(storage, network.session.roomCode, network.session.playerId, chapter.id)) return false;
  keys.clear();
  touch.release();
  touchMove = { x: 0, z: 0 };
  renderer.setInput(0, 0);
  network.sendInput(0, 0, lastInput.rotationY);
  ui.storyArt.style.backgroundPosition = chapter.position;
  ui.storyArt.setAttribute('aria-label', chapter.alt);
  ui.storyTitle.textContent = chapter.title;
  ui.storyCopy.textContent = chapter.copy;
  if (ui.story.open) ui.story.close();
  ui.story.showModal();
  ui.storyContinue.focus();
  return true;
}
ui.storyContinue.addEventListener('click', () => ui.story.close());
let arrivalReadyInFlight = null;
let arrivalReadySent = null;
function acknowledgeArrival() {
  const arrival = network.latestSnapshot?.arrival;
  const playerId = network.session?.playerId;
  if (!arrival || !playerId || !arrival.pendingPlayerIds?.includes(playerId) ||
    ui.story.open || renderer.graphicsState !== 'ready' || !ui.renderRecovery.hidden || !network.socket.connected ||
    arrivalReadySent === arrival.transitionId || arrivalReadyInFlight === arrival.transitionId) return;
  const transitionId = arrival.transitionId;
  arrivalReadyInFlight = transitionId;
  network.readyForArrival(transitionId).then(() => {
    arrivalReadySent = transitionId;
  }).catch((error) => {
    if (network.latestSnapshot?.arrival?.transitionId === transitionId) status(`Waiting for the party: ${playerError(error)}`, true);
  }).finally(() => { arrivalReadyInFlight = null; });
}
ui.story.addEventListener('close', () => {
  ui.viewport.focus({ preventScroll: true });
  acknowledgeArrival();
});
let lastPhase = null;
let lastFloorKey = null;
let hintTicksRemaining = 0;
let feedbackTimer = null;
let introVoteSubmitted = false;
let activeSessionKey = null;
const INPUT_INTERVAL_MS = 1000 / 30;
const HINT_TICKS = 30 * 8;
const SERVER_TICK_HZ = 30;

function status(message, error = false) {
  ui.status.textContent = message;
  ui.status.dataset.error = String(error);
  if (!ui.results.hidden) ui.resultsStatus.textContent = message;
}

// Only approved player-facing wording crosses from transport failures into the HUD.
// Unknown responses remain diagnosable in the transport, without echoing internals to players.
function playerError(error) {
  const message = typeof error === 'string' ? error : error?.message;
  if (message?.startsWith('Could not restore room:')) return 'Your previous room could not be restored. Join again or create a new expedition.';
  if (message?.startsWith('Connection failed:')) return 'The game could not connect. Check your network and try again.';
  const messages = {
    ROOM_NOT_FOUND: 'That room is no longer available. Check the code or create a new expedition.',
    ROOM_FULL: 'That party is full. Ask for another room or create your own.',
    HOST_ONLY: 'Only the host can choose this for the party.',
    NOT_ENOUGH_PLAYERS: 'Invite another explorer or add a mock teammate before starting.',
    STALE_RESULTS: 'The party has already moved on. Wait for the current chamber to appear.',
    INVALID_PHASE: 'That action is not available at this point in the expedition.',
    NOT_IN_RUNNING_ROOM: 'Join an active expedition before using this action.',
    NOT_IN_ROOM: 'Join or create a room to continue.',
    STALE_SESSION: 'Your room connection has expired. Join again or create a new expedition.',
    INVALID_REJOIN: 'Your room connection has expired. Join again or create a new expedition.',
    ARRIVAL_PENDING: 'Wait for the party to finish entering this chamber.',
    OUT_OF_RANGE: 'Move closer and find a clear path to your target.',
    TARGET_UNAVAILABLE: 'That enemy is no longer available. Choose another target.',
    ATTACK_COOLDOWN: 'Your next strike is almost ready. Try again shortly.',
    PLAYER_DOWN: 'You have fallen. Wait for an ally to revive you.',
    PLAYER_UNAVAILABLE: 'That explorer is no longer available.',
    ALREADY_CLAIMED: 'You have already collected your share of this supply.',
    INVENTORY_FULL: 'Your supply pouch is full.',
    HEALTH_FULL: 'You are already at full health.',
    NO_HEALING_CHARGE: 'Collect a healing supply first.',
    TARGET_NOT_DOWN: 'That ally no longer needs a revive.',
    OBJECTIVES_INCOMPLETE: 'Complete the floor objective first.',
    PORTAL_BUSY: 'The portal is shifting. Wait a moment before entering.',
    RECOVERY_COOLDOWN: 'Safe start is cooling down. Try again shortly.',
    TRAP_ALREADY_CLEARED: 'That trap has already been disarmed.',
    ROOM_ATTEMPT_LIMIT: 'Too many room requests. Wait a moment and try again.',
    SERVER_ATTEMPT_LIMIT: 'The Guild is busy. Wait a moment and try again.',
    SERVER_ROOM_CAPACITY: 'All expedition spaces are busy. Try again shortly.',
    'Not in a running room': 'Join an active expedition before using this action.',
    'No completed expedition': 'A harder cycle is available only after a completed expedition.',
    'Enter a display name': 'Enter an explorer name first.',
    'Enter a valid 4-character room code': 'Enter the four-character room code shared by your host.',
    'Connection timed out': 'The connection is taking too long. Check your network and try again.',
    'Server did not respond in time': 'The expedition has not responded yet. Check your connection and try again.',
    'Portal is unavailable': 'That portal is not ready yet.',
    'Item is unavailable': 'That supply is no longer available.',
    'Ally is not down': 'That ally no longer needs a revive.',
    'Trap is unavailable': 'That trap is no longer active.',
    'Intro vote is not active': 'The briefing has already ended.'
  };
  return Object.hasOwn(messages, message) ? messages[message]
    : 'That action could not be completed. Wait a moment and try again.';
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
  const cycleKey = phase === 'COMPLETED' ? `${session?.roomCode}:${snapshot?.results?.cycle}` : null;
  if (pendingCycleKey !== cycleKey) pendingCycleKey = null;
  if (phase !== lastPhase) {
    ui.squad.dataset.expanded = 'false';
    ui.hudToggle.setAttribute('aria-expanded', 'false');
    ui.hudToggle.textContent = 'Mission & view';
    ui.partyDetails.open = phase !== 'RUNNING';
    hintTicksRemaining = phase === 'RUNNING' ? HINT_TICKS : 0;
    if (phase === 'RUNNING' && (document.activeElement === ui.start || ui.gate.contains?.(document.activeElement))) {
      ui.viewport.focus?.({ preventScroll: true });
    }
    lastPhase = phase;
  }
  document.documentElement.classList.toggle('in-room', Boolean(session));
  document.documentElement.classList.toggle('is-running', phase === 'RUNNING');
  ui.hudToggle.hidden = phase !== 'RUNNING';
  ui.viewActions.hidden = phase !== 'RUNNING';
  const localPlayer = snapshot?.players?.[session?.playerId];
  const localHealth = localPlayer?.health?.current;
  const localMaxHealth = localPlayer?.health?.max;
  const intro = snapshot?.intro;
  const introPlaying = phase === 'LOBBY' && intro?.status === 'PLAYING';
  ui.introBriefing.hidden = !introPlaying;
  if (introPlaying) {
    const voteCount = Number.isSafeInteger(intro.voteCount) ? Math.max(0, intro.voteCount) : 0;
    const eligibleCount = Number.isSafeInteger(intro.eligibleCount) ? Math.max(0, intro.eligibleCount) : 0;
    const remainingTicks = Number.isSafeInteger(intro.endsAtTick) && Number.isSafeInteger(snapshot?.tick)
      ? Math.max(0, intro.endsAtTick - snapshot.tick) : 0;
    const remainingSeconds = Math.ceil(remainingTicks / SERVER_TICK_HZ);
    const voteStatus = `${voteCount} of ${eligibleCount} votes · ${remainingSeconds}s remaining`;
    if (ui.introVoteStatus.textContent !== voteStatus) ui.introVoteStatus.textContent = voteStatus;
    const eligible = Boolean(session && network.socket.connected && localPlayer?.connection === 'CONNECTED' && !localPlayer?.bot);
    ui.introSkipVote.disabled = !eligible || introVoteSubmitted;
    ui.introSkipVote.textContent = introVoteSubmitted ? 'Vote recorded' : 'Vote to skip intro';
  } else {
    ui.introSkipVote.disabled = true;
    ui.introSkipVote.textContent = 'Vote to skip intro';
  }
  ui.vitals.hidden = phase !== 'RUNNING' || !localPlayer;
  ui.playerHealth.textContent = Number.isFinite(localHealth) && Number.isFinite(localMaxHealth)
    ? `${localHealth} / ${localMaxHealth}` : '—';
  ui.playerHealth.dataset.state = Number.isFinite(localHealth) && Number.isFinite(localMaxHealth) && localHealth <= localMaxHealth * 0.3
    ? 'critical' : 'ready';
  ui.healingCharges.textContent = String(localPlayer?.inventory?.healingCharges ?? 0);
  touch.setEnabled(phase === 'RUNNING' && !snapshot?.arrival && network.socket.connected && (localPlayer?.health?.current ?? 0) > 0);
  ui.recover.hidden = phase !== 'RUNNING';
  ui.recover.disabled = !network.socket.connected || (localPlayer?.health?.current ?? 0) <= 0;
  ui.gate.hidden = Boolean(session);
  ui.squad.hidden = !session;
  ui.room.textContent = session ? session.roomCode : '—';
  const floor = snapshot?.floor;
  const floorName = Number.isSafeInteger(floor?.index)
    ? `FLOOR ${floor.index} · ${floor.phase?.replaceAll('_', ' ') || 'EXPLORE'}` : phase;
  ui.phase.textContent = phase === 'RUNNING' ? floorName : phase;
  const floorKey = phase === 'RUNNING' && floor ? `${floor.cycle}:${floor.index}:${floor.phase}` : null;
  if (floorKey !== lastFloorKey) {
    lastFloorKey = floorKey;
    if (floorKey && ui.floorBanner) {
      ui.floorBanner.textContent = `${floorName} · cycle ${floor.cycle}`;
      ui.floorBanner.hidden = false;
    } else if (ui.floorBanner) {
      ui.floorBanner.hidden = true;
    }
  }
  const objectiveByStage = {
    FLOOR_ONE: 'Learn the dungeon: defeat the Sentinel, explore, and disarm the vault trap.',
    REST: 'Safe chamber: collect supplies, heal allies, and enter the next portal.',
    FLOOR_TWO: 'Defeat the Threshold Keeper, then the Mirror Hexer and its Shardlings.',
    FLOOR_THREE: 'Clear two mob waves and gather a personal share of the caches.',
    DEEPWOOD: 'Face the Deepwood Sentinel. Evade rooted ground and strike its flying Barkwings before the rune trial.',
    FLOOR_FOUR: 'Solve the rune trial and defeat its guardian.',
    FLOOR_FIVE: 'Defeat the Shifting Core Warden and its phased minions.'
  };
  const portal = snapshot?.portals?.[0];
  const objective = objectiveByStage[snapshot?.floor?.phase] || 'Explore the chamber together.';
  const portalHint = phase === 'RUNNING' && portal?.state === 'AVAILABLE'
    ? ' Walk toward the glowing teal gate to continue.' : '';
  ui.objective.textContent = phase === 'RUNNING' ? `${objective}${portalHint}` :
    phase === 'COMPLETED' ? 'Victory! The Shifting Core Warden has fallen. Your expedition is complete.' :
      phase === 'FAILED' ? 'The party fell. Create a new room to try again.' : 'Find your party, then begin the expedition.';
  ui.leave.hidden = !session;
  const players = snapshot?.players ? Object.entries(snapshot.players) : [];
  const activeCount = players.filter(([, player]) => player?.connection === 'CONNECTED' || player?.connection === 'BOT').length;
  const isHost = Boolean(session && snapshot?.hostPlayerId === session.playerId);
  const partyStatus = snapshot?.partyStatus;
  const downedNames = (partyStatus?.downedPlayerIds || []).map((id) => snapshot?.players?.[id]?.displayName || 'An explorer');
  const isLastHumanStanding = partyStatus?.lastHumanStandingId === session?.playerId && partyStatus?.humanLivingCount === 1;
  ui.partyStatus.hidden = phase !== 'RUNNING' || (!downedNames.length && !isLastHumanStanding);
  if (phase === 'RUNNING' && downedNames.length) {
    ui.partyStatus.textContent = isLastHumanStanding
      ? `LAST EXPLORER STANDING · ${downedNames.join(', ')} down`
      : `${downedNames.join(', ')} down · revive an ally`;
  } else if (phase === 'RUNNING' && isLastHumanStanding) {
    ui.partyStatus.textContent = 'LAST EXPLORER STANDING · find your party';
  }
  if (phase === 'RUNNING' && snapshot?.arrival) {
    const waiting = snapshot.arrival.pendingPlayerIds?.length ?? 0;
    ui.partyStatus.hidden = false;
    ui.partyStatus.textContent = waiting > 0
      ? `Safe arrival · waiting for ${waiting} explorer${waiting === 1 ? '' : 's'} to view the chamber`
      : 'Safe arrival · preparing the chamber';
  }
  const showResults = (phase === 'COMPLETED' && Boolean(snapshot?.results)) ||
    (phase === 'FAILED' && snapshot?.outcome?.kind === 'PARTY_WIPED');
  const openingResults = showResults && (ui.results.hidden || ui.results.dataset.phase !== phase);
  ui.results.dataset.phase = phase;
  ui.results.hidden = !showResults;
  if (openingResults || !showResults) ui.resultsStatus.textContent = '';
  ui.continueCycle.hidden = phase !== 'COMPLETED' || !showResults || !isHost;
  ui.continueCycle.disabled = ui.continueCycle.hidden || !network.socket.connected || Boolean(pendingCycleKey) || leaveInFlight;
  ui.continueCycle.textContent = pendingCycleKey ? 'Preparing the next cycle...' : 'Begin a harder cycle';
  if (showResults) {
    const isVictory = phase === 'COMPLETED';
    ui.resultsKicker.textContent = isVictory ? 'GUILD RECORD · VICTORY' : 'GUILD RECORD · EXPEDITION LOST';
    ui.resultsTitle.textContent = isVictory ? 'The Core has fallen' : 'Your party was overwhelmed';
    ui.resultsSummary.textContent = isVictory
      ? `Cycle ${snapshot.results.cycle} cleared · Party level ${snapshot.results.level}`
      : `Floor ${snapshot?.outcome?.floorIndex ?? snapshot?.floor?.index ?? '—'} · recover, regroup, and begin a new room.`;
    ui.resultsPlayers.replaceChildren();
    if (isVictory) {
      for (const player of snapshot.results.players || []) {
        const item = document.createElement('li');
        item.textContent = `#${player.rank || '—'} ${player.displayName}${player.mock ? ' (mock)' : ''}: ${player.xp?.total || 0} XP · ${player.score || 0} score · ${player.metrics?.enemiesDefeated || 0} defeats · ${player.metrics?.damageDealt || 0} damage`;
        ui.resultsPlayers.append(item);
      }
      ui.resultsCopy.textContent = 'The Guild records damage, enemy defeats, objectives, and rescues. Compare this run, then challenge the next cycle.';
      ui.resultsHelp.textContent = `${!network.socket.connected ? 'Reconnecting to your party. You can still leave this expedition.' : pendingCycleKey ? 'Waiting for the next chamber. You can leave if you prefer to finish here.' : isHost ? 'Choose a harder cycle when your party is ready, or leave after this victory.' : 'Waiting for the host’s choice.'} Results are temporary; save your own record before leaving.`;
    } else {
      const item = document.createElement('li');
      item.textContent = `${downedNames.length ? downedNames.join(', ') : 'The expedition'} fell in battle. This expedition has ended.`;
      ui.resultsPlayers.append(item);
      ui.resultsCopy.textContent = 'The Guild has marked this expedition lost. Leave the room, regroup, and create a new expedition when ready.';
      ui.resultsHelp.textContent = 'Leave expedition to return to the title screen. A new room begins a fresh attempt.';
    }
    if (openingResults) {
      status(isVictory ? 'Victory! Your expedition is complete.' : 'Your expedition has ended. Leave to regroup.');
      ui.resultsStatus.textContent = '';
      ui.resultsTitle.focus?.();
    }
  }
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
  // Selection is local intent only. Keep a stable ID order as enemies move; rebuild
  // options only when the roster changes so native keyboard selection stays usable.
  const targets = Object.entries(snapshot?.enemies || {})
    .filter(([, entry]) => entry?.health?.current > 0 &&
      Number.isFinite(entry.transform?.position?.x) && Number.isFinite(entry.transform?.position?.z))
    .sort(([a], [b]) => a.localeCompare(b));
  const spaceKey = JSON.stringify([session?.roomCode, snapshot?.space?.id, snapshot?.space?.revision]);
  if (spaceKey !== targetSpaceKey) selectedEnemyId = null;
  targetSpaceKey = spaceKey;
  if (phase !== 'RUNNING' || !network.socket.connected || (localHealth ?? 0) <= 0 ||
    !targets.some(([id]) => id === selectedEnemyId)) selectedEnemyId = null;
  const signature = JSON.stringify(targets.map(([id, entry]) => [id, entry.kind]));
  if (signature !== targetOptionsSignature) {
    ui.target.replaceChildren();
    const automatic = document.createElement('option');
    automatic.value = '';
    automatic.textContent = 'Automatic · nearest reachable';
    ui.target.append(automatic);
    targets.forEach(([id, entry], index) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = `${index + 1}. ${entry.kind?.replaceAll('_', ' ') || 'ENEMY'}${entry.kind === 'BARKWING' ? ' · airborne' : ''}`;
      ui.target.append(option);
    });
    targetOptionsSignature = signature;
  }
  ui.target.value = selectedEnemyId || '';
  ui.targetControls.hidden = phase !== 'RUNNING' || !targets.length;
  ui.target.disabled = !network.socket.connected || (localHealth ?? 0) <= 0 || attackInFlight;
  ui.touchTarget.disabled = ui.target.disabled || !targets.length;
  ui.touchTarget.textContent = selectedEnemyId
    ? `Target: ${ui.target.children[ui.target.selectedIndex]?.textContent || 'enemy'}`
    : 'Target: Auto';
  // Announce selection changes, never every health/tick update. The native select
  // retains focus so arrow keys and assistive technology can finish choosing.
  const targetStatus = selectedEnemyId
    ? `Selected ${ui.target.children[ui.target.selectedIndex]?.textContent || 'enemy'}. Gold ring marks selection.`
    : (localHealth ?? 0) <= 0 && phase === 'RUNNING' ? 'Targeting paused while downed.'
      : !network.socket.connected ? 'Targeting paused while reconnecting.' : 'Automatic targeting.';
  if (ui.targetStatus.textContent !== targetStatus) ui.targetStatus.textContent = targetStatus;
  const touchTargetLabel = `${ui.touchTarget.textContent}. Cycle enemy target`;
  if (ui.touchTarget.getAttribute('aria-label') !== touchTargetLabel) ui.touchTarget.setAttribute('aria-label', touchTargetLabel);
  renderer.setSelectedTarget(selectedEnemyId);
  if (selectedEnemyId) enemy = snapshot.enemies[selectedEnemyId];
  ui.enemyPanel.hidden = snapshot?.phase !== 'RUNNING' || !enemy;
  ui.enemyName.textContent = enemy ? `${selectedEnemyId ? 'SELECTED' : 'NEAREST'}: ${enemy.kind?.replaceAll('_', ' ') || 'ENEMY'}` : 'ENEMY';
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
  // Hidden desktop controls and touch callbacks must both reject terminal-room actions.
  if (phase !== 'RUNNING') {
    for (const control of [ui.attack, ui.target, ui.touchTarget, ui.portal, ui.disarm, ui.collect, ui.use, ui.revive, ui.recover]) {
      control.disabled = true;
      control.hidden = true;
    }
  } else {
    ui.target.hidden = false;
    ui.touchTarget.hidden = false;
  }
  const rosterSignature = JSON.stringify(players.map(([id, player]) =>
    [id, player?.displayName, player?.connection, player?.health?.current, player?.downedAtTick, player?.bot?.intent,
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
      state.textContent = player.health?.current === 0 ? 'DOWNED'
        : player.connection === 'CONNECTED' ? `${player.health?.current ?? '—'} HP`
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
    status(playerError(error), true);
  } finally { ui.create.disabled = ui.join.disabled = false; }
}

ui.form.addEventListener('submit', (event) => { event.preventDefault(); enter('join'); });
ui.create.addEventListener('click', () => enter('create'));
ui.addMocks.addEventListener('click', async () => {
  ui.addMocks.disabled = true;
  try {
    const result = await network.addMocks(4);
    status(`${result.added} mock explorers joined the expedition.`);
  } catch (error) { status(`Could not add mock explorers: ${playerError(error)}`, true); }
  finally { updateUi(); }
});
ui.continueCycle.addEventListener('click', async () => {
  if (ui.continueCycle.disabled || ui.continueCycle.hidden) return;
  const requestKey = `${network.session?.roomCode}:${network.latestSnapshot?.results?.cycle}`;
  pendingCycleKey = requestKey;
  updateUi();
  try {
    await network.continueCycle();
    if (pendingCycleKey === requestKey) status('Preparing the next cycle. Waiting for the party to enter.');
  } catch (error) {
    if (pendingCycleKey === requestKey) {
      pendingCycleKey = null;
      status(playerError(error), true);
    }
  }
  finally { updateUi(); }
});

ui.start.addEventListener('click', async () => {
  ui.start.disabled = true;
  try { await network.start(); status('Dungeon run started'); }
  catch (error) { status(`Could not start: ${playerError(error)}`, true); }
  finally { updateUi(); }
});
ui.introSkipVote.addEventListener('click', async () => {
  if (introVoteSubmitted || ui.introSkipVote.disabled) return;
  ui.introSkipVote.disabled = true;
  try {
    const result = await network.voteToSkipIntro();
    introVoteSubmitted = true;
    status(result.completed ? 'The party skipped the intro.' :
      'Your skip vote was recorded. Waiting for the party.');
  } catch (error) {
    status(`Skip vote failed: ${playerError(error)}`, true);
  } finally { updateUi(); }
});
async function attack() {
  if (attackInFlight || ui.attack.disabled) return;
  attackInFlight = true;
  updateUi();
  try {
    const result = await network.attack(selectedEnemyId || undefined);
    status(result.defeated ? 'Enemy defeated!' : `Enemy hit for ${result.damage} damage.`);
    audio.play('strike');
    pulseFeedback('confirm');
  } catch (error) {
    status(error.message === 'OUT_OF_RANGE' ? 'Move closer and find a clear path to your target.' : `Strike failed: ${playerError(error)}`, true);
  } finally {
    attackInFlight = false;
    updateUi();
  }
}
ui.attack.addEventListener('click', attack);
function cycleTarget() {
  if (ui.target.disabled || ui.targetControls.hidden) return;
  const values = Array.from(ui.target.children, (option) => option.value);
  selectedEnemyId = values[(values.indexOf(selectedEnemyId || '') + 1) % values.length] || null;
  updateUi();
  status(selectedEnemyId ? `Target selected: ${ui.target.children[ui.target.selectedIndex]?.textContent}. Gold ring marks selection.` : 'Automatic targeting restored.');
}
ui.target.addEventListener('change', () => {
  selectedEnemyId = ui.target.value || null;
  updateUi();
});
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
        : `Portal entry failed: ${playerError(error)}`;
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
      ? 'Move closer to the trap to disarm it.' : `Disarm failed: ${playerError(error)}`, true);
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
  } catch (error) { status(`Collect failed: ${playerError(error)}`, true); }
}
async function useItem() {
  if (ui.use.disabled) return;
  try {
    const result = await network.useItem();
    status(`Healing used. ${result.currentHealth} HP.`);
    audio.play('heal');
    pulseFeedback('confirm');
  } catch (error) { status(`Heal failed: ${playerError(error)}`, true); }
}
async function revivePlayer() {
  if (!nearbyDowned || ui.revive.disabled) return;
  try {
    await network.revivePlayer(nearbyDowned);
    status('Explorer revived.');
    audio.play('revive');
    pulseFeedback('confirm');
  } catch (error) { status(`Revive failed: ${playerError(error)}`, true); }
}
ui.collect.addEventListener('click', collectItem);
ui.use.addEventListener('click', useItem);
ui.revive.addEventListener('click', revivePlayer);

// Why: Recover from a blocked position within the same authoritative floor and clear stale local motion.
// Output: A server-selected safe start or a visible cooldown/state error.
async function recoverPosition() {
  if (ui.recover.disabled) return;
  keys.clear();
  touch.release();
  touchMove = { x: 0, z: 0 };
  renderer.setInput(0, 0);
  try {
    await network.recoverPosition();
    status('Returned to the safe start of this area.');
  } catch (error) {
    status(error.message === 'RECOVERY_COOLDOWN' ? 'Safe start is cooling down; try again shortly.' :
      `Could not reset position: ${playerError(error)}`, true);
  }
}
ui.recover.addEventListener('click', recoverPosition);
ui.sound.addEventListener('click', async () => {
  const enabled = await audio.toggle();
  ui.sound.textContent = enabled ? 'Sound on' : 'Sound off';
  ui.sound.setAttribute('aria-pressed', String(enabled));
  if (enabled) audio.play('pickup');
});
// Both the in-run menu and final result panel must provide the same recoverable exit.
async function leaveExpedition() {
  if (leaveInFlight) return;
  leaveInFlight = true;
  ui.leave.disabled = true;
  ui.resultsLeave.disabled = true;
  ui.continueCycle.disabled = true;
  try {
    await network.leave();
    renderer.setLocalPlayer(null);
    keys.clear();
    touch.release();
    status('Left the room');
    updateUi();
  } catch (error) {
    status(`Could not leave the expedition: ${playerError(error)}`);
  } finally {
    leaveInFlight = false;
    ui.leave.disabled = false;
    ui.resultsLeave.disabled = false;
    updateUi();
  }
}
ui.leave.addEventListener('click', leaveExpedition);
ui.resultsLeave.addEventListener('click', leaveExpedition);
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
    acknowledgeArrival();
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
  arrivalReadySent = null;
  arrivalReadyInFlight = null;
  if (ui.story.open) ui.story.close();
  selectedEnemyId = null;
  const nextSessionKey = event.detail?.roomCode && event.detail?.playerId
    ? `${event.detail.roomCode}:${event.detail.playerId}` : null;
  if (nextSessionKey !== activeSessionKey) introVoteSubmitted = false;
  activeSessionKey = nextSessionKey;
  renderer.resetSession();
  renderer.setLocalPlayer(event.detail?.playerId || null);
  lastRosterSignature = '';
  updateUi();
});
network.addEventListener('snapshot', (event) => {
  const { snapshot, receivedAt } = event.detail;
  renderer.pushSnapshot(snapshot, receivedAt);
  audio.observeWarnings(snapshot);
  updateUi(snapshot);
  acknowledgeArrival();
});
network.addEventListener('discovery', (event) => {
  renderer.reveal(event.detail.nodeId);
  status('A hidden chamber has been revealed');
});
network.addEventListener('portal-resolved', (event) => {
  status('The party entered a new chamber.');
  if (!showTravelChapter('portal-resolved', event.detail)) acknowledgeArrival();
});
network.addEventListener('portal-resolved', () => audio.play('portal'));
network.addEventListener('trap-disarmed', (event) => {
  if (event.detail.playerId !== network.session?.playerId) status('An explorer disarmed the trap.');
});
network.addEventListener('floor-completed', () => status('Floor complete. Your party advanced together.'));
network.addEventListener('floor-completed', () => audio.play('victory'));
network.addEventListener('floor-transition', (event) => {
  status(`Floor ${event.detail.floorIndex}: ${event.detail.toStage.replaceAll('_', ' ').toLowerCase()}.`);
  audio.play('portal');
  if (!showTravelChapter('floor-transition', event.detail)) acknowledgeArrival();
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
  renderer.showCombatHit?.(event.detail);
  if (event.detail.attackerPlayerId !== network.session?.playerId) {
    status(event.detail.defeated ? 'Your party defeated an enemy!' : `An explorer struck an enemy for ${event.detail.damage}.`);
    audio.play('enemyHit');
  }
});
network.addEventListener('player-hit', (event) => {
  if (network.latestSnapshot?.phase !== 'RUNNING') return;
  status(event.detail.currentHealth === 0 ? 'You have fallen. An ally may revive you.' : `You took ${event.detail.amount} damage.`, true);
  audio.play('damage');
  pulseFeedback('damage');
});
network.addEventListener('notice', (event) => {
  const message = String(event.detail || '');
  status(message.startsWith('Connection lost') ? 'Connection interrupted. Reconnecting to your party...'
    : message.startsWith('Room closed:') ? 'This room has closed. Create or join another expedition.' : message);
});
network.addEventListener('error', (event) => {
  ui.connection.textContent = 'OFFLINE';
  ui.connection.dataset.state = 'offline';
  status(playerError(event.detail), true);
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
  const playfieldFocused = focus === ui.viewport || focus === document.body || focus === document.documentElement || Boolean(ui.touch.contains?.(focus));
  const modalOpen = (document.querySelectorAll?.('dialog[open], [aria-modal="true"]:not([hidden])')?.length || 0) > 0;
  const localHealth = network.latestSnapshot?.players?.[network.session?.playerId]?.health?.current;
  return Boolean(network.session && network.socket.connected && network.latestSnapshot?.phase === 'RUNNING' &&
    !network.latestSnapshot?.arrival && Number.isFinite(localHealth) && localHealth > 0 &&
    !document.hidden && playfieldFocused && !modalOpen);
}
window.addEventListener('keydown', (event) => {
  if (!canControlGame()) return;
  if (event.code === 'KeyQ') {
    event.preventDefault();
    if (!event.repeat) cycleTarget();
    return;
  }
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
window.addEventListener('blur', () => { keys.clear(); touch.release(); touchMove = { x: 0, z: 0 }; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { keys.clear(); touch.release(); touchMove = { x: 0, z: 0 }; }
});

function sampleInput() {
  if (!canControlGame()) { keys.clear(); touch.release(); touchMove = { x: 0, z: 0 }; }
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

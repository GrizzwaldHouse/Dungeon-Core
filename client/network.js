// network.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Validate Socket.IO traffic and recover sessions without coupling transport to rendering.

const STORAGE_KEY = 'dungeon-core-session-v1';
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{4}$/;

function validSnapshot(value) {
  return value && value.protocolVersion === 1 && CODE_PATTERN.test(value.roomCode) &&
    Number.isSafeInteger(value.tick) && Number.isSafeInteger(value.revision) &&
    value.players && typeof value.players === 'object' && !Array.isArray(value.players);
}

export class GameNetwork extends EventTarget {
  constructor() {
    super();
    if (typeof window.io !== 'function') throw new Error('Socket.IO browser library did not load');
    this.socket = window.io({ autoConnect: false, reconnection: true, transports: ['websocket', 'polling'] });
    this.session = null;
    this.lastRevision = -1;
    this.latestSnapshot = null;
    this.inputSeq = -1;
    this.rejoining = false;
    this.bindEvents();
  }

  emitChange(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  bindEvents() {
    this.socket.on('connect', async () => {
      this.emitChange('connection', { connected: true });
      if (!this.session || this.rejoining) return;
      this.rejoining = true;
      try {
        const result = await this.call('room:rejoin', { roomCode: this.session.roomCode, reconnectToken: this.session.reconnectToken });
        this.acceptSession(result);
        this.emitChange('notice', 'Session restored');
      } catch (error) {
        this.clearSession();
        this.emitChange('error', `Could not restore room: ${error.message}`);
      } finally { this.rejoining = false; }
    });
    this.socket.on('disconnect', (reason) => {
      this.emitChange('connection', { connected: false });
      this.emitChange('notice', `Connection lost (${String(reason).slice(0, 60)}); reconnecting…`);
    });
    this.socket.on('connect_error', (error) => this.emitChange('error', `Connection failed: ${error.message}`));
    this.socket.on('room:snapshot', (snapshot) => this.acceptSnapshot(snapshot));
    this.socket.on('node:discovered', (event) => {
      if (!this.session || !event || event.protocolVersion !== 1 || event.roomCode !== this.session.roomCode || typeof event.nodeId !== 'string') return;
      this.emitChange('discovery', { nodeId: event.nodeId, playerId: event.playerId });
    });
    this.socket.on('combat:enemy-hit', (event) => {
      if (!this.session || !event || event.protocolVersion !== 1 || event.roomCode !== this.session.roomCode) return;
      if (typeof event.enemyId !== 'string' || !Number.isFinite(event.damage)) return;
      this.emitChange('enemy-hit', event);
    });
    this.socket.on('combat:damage', (event) => {
      if (!this.session || !event || event.protocolVersion !== 1 || event.roomCode !== this.session.roomCode) return;
      if (event.playerId !== this.session.playerId || !Number.isFinite(event.amount)) return;
      this.emitChange('player-hit', event);
    });
    this.socket.on('portal:resolved', (event) => {
      if (!this.session || !event || event.protocolVersion !== 1 || event.roomCode !== this.session.roomCode ||
        !Number.isSafeInteger(event.tick) || !Number.isSafeInteger(event.revision) ||
        typeof event.portalId !== 'string' || typeof event.toSpaceId !== 'string') return;
      this.emitChange('portal-resolved', event);
    });
    this.socket.on('trap:disarmed', (event) => {
      if (!this.session || !event || event.protocolVersion !== 1 || event.roomCode !== this.session.roomCode ||
        typeof event.trapId !== 'string' || typeof event.playerId !== 'string' ||
        !Number.isSafeInteger(event.tick)) return;
      this.emitChange('trap-disarmed', event);
    });
    this.socket.on('floor:completed', (event) => {
      if (!this.session || !event || event.protocolVersion !== 1 || event.roomCode !== this.session.roomCode ||
        !Number.isSafeInteger(event.tick) || !Number.isSafeInteger(event.revision) ||
        !Number.isSafeInteger(event.floorIndex)) return;
      this.emitChange('floor-completed', event);
    });
    this.socket.on('floor:transition', (event) => {
      if (!this.validRoomEvent(event) || typeof event.toStage !== 'string' ||
        !Number.isSafeInteger(event.floorIndex)) return;
      this.emitChange('floor-transition', event);
    });
    this.socket.on('item:collected', (event) => {
      if (!this.validRoomEvent(event) || typeof event.itemId !== 'string' || typeof event.playerId !== 'string') return;
      this.emitChange('item-collected', event);
    });
    this.socket.on('item:used', (event) => {
      if (!this.validRoomEvent(event) || typeof event.playerId !== 'string' || !Number.isFinite(event.currentHealth)) return;
      this.emitChange('item-used', event);
    });
    this.socket.on('player:revived', (event) => {
      if (!this.validRoomEvent(event) || typeof event.playerId !== 'string' ||
        typeof event.targetPlayerId !== 'string' || !Number.isFinite(event.currentHealth)) return;
      this.emitChange('player-revived', event);
    });
    this.socket.on('player:downed', (event) => {
      if (!this.validRoomEvent(event) || typeof event.playerId !== 'string') return;
      this.emitChange('player-downed', event);
    });
    this.socket.on('run:failed', (event) => {
      if (!this.validRoomEvent(event)) return;
      this.emitChange('run-failed', event);
    });
    this.socket.on('run:cycle', (event) => {
      if (!this.validRoomEvent(event) || !Number.isSafeInteger(event.cycle)) return;
      this.emitChange('run-cycle', event);
    });
    this.socket.on('room:closed', (event) => {
      if (!this.session || !event || event.roomCode !== this.session.roomCode) return;
      this.clearSession();
      this.emitChange('notice', `Room closed: ${event.reason || 'unknown reason'}`);
    });
  }

  connect() { if (!this.socket.connected) this.socket.connect(); }

  validRoomEvent(event) {
    return Boolean(this.session && event && event.protocolVersion === 1 &&
      event.roomCode === this.session.roomCode && Number.isSafeInteger(event.tick));
  }

  call(event, payload) {
    return new Promise((resolve, reject) => {
      this.socket.timeout(5000).emit(event, payload, (error, answer) => {
        if (error) return reject(new Error('Server did not respond in time'));
        if (!answer || answer.ok !== true) return reject(new Error(answer?.error || 'Invalid server response'));
        resolve(answer);
      });
    });
  }

  async enter(mode, displayName, roomCode = '') {
    const name = displayName.trim().slice(0, 20);
    if (!name) throw new Error('Enter a display name');
    const code = roomCode.trim().toUpperCase();
    if (mode === 'join' && !CODE_PATTERN.test(code)) throw new Error('Enter a valid 4-character room code');
    if (!this.socket.connected) {
      this.connect();
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Connection timed out')), 5000);
        this.socket.once('connect', () => { clearTimeout(timer); resolve(); });
      });
    }
    const result = await this.call(mode === 'create' ? 'room:create' : 'room:join',
      mode === 'create' ? { displayName: name } : { displayName: name, roomCode: code });
    this.acceptSession(result);
    return result;
  }

  acceptSession(result) {
    if (!result || !CODE_PATTERN.test(result.roomCode) || typeof result.playerId !== 'string' ||
      typeof result.reconnectToken !== 'string' || !validSnapshot(result.snapshot)) throw new Error('Malformed room response');
    this.session = { roomCode: result.roomCode, playerId: result.playerId, reconnectToken: result.reconnectToken };
    this.lastRevision = -1;
    this.inputSeq = Math.max(-1, result.snapshot.players[result.playerId]?.lastInputSeq ?? -1);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.session)); } catch {
      // Private storage may be unavailable.
    }
    this.emitChange('session', { roomCode: result.roomCode, playerId: result.playerId });
    this.acceptSnapshot(result.snapshot);
  }

  acceptSnapshot(snapshot) {
    if (!validSnapshot(snapshot) || !this.session || snapshot.roomCode !== this.session.roomCode || snapshot.revision <= this.lastRevision) return;
    this.lastRevision = snapshot.revision;
    this.latestSnapshot = snapshot;
    this.emitChange('snapshot', { snapshot, receivedAt: performance.now() });
  }

  restoreStoredSession() {
    try {
      const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (value && CODE_PATTERN.test(value.roomCode) && typeof value.reconnectToken === 'string' && typeof value.playerId === 'string') {
        this.session = value;
        this.connect();
        return true;
      }
    } catch {
      // A corrupt saved capability is discarded.
    }
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {
      // Storage may be denied.
    }
    return false;
  }

  async start() { return this.call('room:start', {}); }

  async addMocks(count = 4) { return this.call('room:add-mocks', { count }); }

  // Why: The client may cast one skip intent, while only server snapshots decide shared completion.
  // Input: A connected human session in a lobby whose public intro state is still playing.
  // Output: The server acknowledgement; this method never mutates the cached snapshot.
  async voteToSkipIntro() {
    if (!this.session || !this.socket.connected || this.latestSnapshot?.phase !== 'LOBBY' ||
      this.latestSnapshot?.intro?.status !== 'PLAYING') throw new Error('Intro vote is not active');
    return this.call('intro:skip-vote', { actionId: crypto.randomUUID() });
  }

  async attack(targetEnemyId) {
    if (!this.session || !this.socket.connected || this.latestSnapshot?.phase !== 'RUNNING') throw new Error('Not in a running room');
    return this.call('combat:attack', { actionId: crypto.randomUUID(),
      ...(targetEnemyId === undefined ? {} : { targetEnemyId }) });
  }

  // Why: Carry an explorer's portal intent to the authoritative room tick without selecting a destination locally.
  // Input: A portal ID from the latest current-space snapshot; the server still checks range and objectives.
  // Output: The acknowledged server result or a validation/timeout error.
  // Watch Out: A late ACK can follow a room transition, so the caller must use subsequent snapshots as truth.
  async enterPortal(portalId) {
    if (!this.session || !this.socket.connected || this.latestSnapshot?.phase !== 'RUNNING') throw new Error('Not in a running room');
    const portal = Array.isArray(this.latestSnapshot.portals)
      ? this.latestSnapshot.portals.find((entry) => entry?.id === portalId) : null;
    if (!portal || portal.state !== 'AVAILABLE') throw new Error('Portal is unavailable');
    return this.call('portal:enter', { actionId: crypto.randomUUID(), portalId });
  }

  // Why: A client may request trap disarming but cannot decide its range, timing, or reward.
  // Input: Trap ID from the latest server snapshot; authoritative validation still runs on the server.
  // Output: An acknowledged result or an error without mutating local game state.
  async disarmTrap(trapId) {
    if (!this.session || !this.socket.connected || this.latestSnapshot?.phase !== 'RUNNING') throw new Error('Not in a running room');
    const trap = this.latestSnapshot.trap;
    if (!trap || trap.id !== trapId || trap.state === 'CLEARED') throw new Error('Trap is unavailable');
    return this.call('trap:disarm', { actionId: crypto.randomUUID(), trapId });
  }

  // Why: Item claims must always be validated against the server's personal entitlement and range.
  // Input: An item ID published in the current room snapshot; no quantity or position is sent.
  // Output: The server's acknowledged claim or a validation error.
  async collectItem(itemId) {
    if (!this.session || !this.socket.connected || this.latestSnapshot?.phase !== 'RUNNING') throw new Error('Not in a running room');
    const item = Array.isArray(this.latestSnapshot.items)
      ? this.latestSnapshot.items.find((entry) => entry?.id === itemId) : null;
    if (!item || item.claimedBy?.includes(this.session.playerId)) throw new Error('Item is unavailable');
    return this.call('item:collect', { actionId: crypto.randomUUID(), itemId });
  }

  async useItem() {
    if (!this.session || !this.socket.connected || this.latestSnapshot?.phase !== 'RUNNING') throw new Error('Not in a running room');
    return this.call('item:use', { actionId: crypto.randomUUID() });
  }

  async revivePlayer(targetPlayerId) {
    if (!this.session || !this.socket.connected || this.latestSnapshot?.phase !== 'RUNNING') throw new Error('Not in a running room');
    const target = this.latestSnapshot.players?.[targetPlayerId];
    if (!target || target.health?.current !== 0) throw new Error('Ally is not down');
    return this.call('player:revive', { actionId: crypto.randomUUID(), targetPlayerId });
  }

  sendInput(moveX, moveZ, rotationY) {
    if (!this.session || !this.socket.connected || this.latestSnapshot?.phase !== 'RUNNING') return;
    this.socket.emit('player:input', { inputSeq: ++this.inputSeq, moveX, moveZ, rotationY });
  }

  async leave() {
    if (this.socket.connected && this.session) {
      try { await this.call('room:leave', {}); } catch {
        // Local session still clears.
      }
    }
    this.clearSession();
  }

  clearSession() {
    this.session = null;
    this.latestSnapshot = null;
    this.lastRevision = -1;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {
      // Ignore storage denial.
    }
    this.emitChange('session', null);
  }
}

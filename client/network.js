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
    this.socket.on('floor:completed', (event) => {
      if (!this.session || !event || event.protocolVersion !== 1 || event.roomCode !== this.session.roomCode ||
        !Number.isSafeInteger(event.tick) || !Number.isSafeInteger(event.revision) ||
        !Number.isSafeInteger(event.floorIndex)) return;
      this.emitChange('floor-completed', event);
    });
    this.socket.on('room:closed', (event) => {
      if (!this.session || !event || event.roomCode !== this.session.roomCode) return;
      this.clearSession();
      this.emitChange('notice', `Room closed: ${event.reason || 'unknown reason'}`);
    });
  }

  connect() { if (!this.socket.connected) this.socket.connect(); }

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

  async attack() {
    if (!this.session || !this.socket.connected || this.latestSnapshot?.phase !== 'RUNNING') throw new Error('Not in a running room');
    return this.call('combat:attack', { actionId: crypto.randomUUID() });
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

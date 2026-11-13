// audio.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Provide small, original game cues without external asset loading or autoplay failures.

const CUES = Object.freeze({
  strike: [330, 145, 0.1, 'triangle'],
  enemyHit: [520, 210, 0.13, 'sawtooth'],
  damage: [150, 65, 0.24, 'sawtooth'],
  pickup: [660, 990, 0.18, 'sine'],
  heal: [480, 760, 0.22, 'sine'],
  revive: [390, 880, 0.32, 'sine'],
  portal: [220, 600, 0.38, 'triangle'],
  screech: [980, 235, 0.38, 'sawtooth'],
  warning: [440, 330, 0.27, 'square'],
  victory: [520, 1040, 0.48, 'sine'],
  defeat: [260, 90, 0.5, 'triangle']
});
const MAX_VOICES = 4;

export class GameAudio {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.lastCueAt = new Map();
    this.warningScope = null;
    this.seenWarnings = new Set();
    this.voices = new Set();
    this.unlockPending = false;
    this.unlockVersion = 0;
    this.disposed = false;
    this.document = globalThis.document;
    this.onVisibilityChange = () => {
      if (this.document?.hidden) this.stopVoices();
    };
    this.document?.addEventListener?.('visibilitychange', this.onVisibilityChange);
  }

  // One cue per server warning window, even when the same window arrives at 30 Hz.
  observeWarnings(snapshot) {
    const scope = snapshot?.phase === 'RUNNING'
      ? `${snapshot.roomId}:${snapshot.floor?.cycle}:${snapshot.space?.id}:${snapshot.space?.revision}` : null;
    if (scope !== this.warningScope) {
      this.warningScope = scope;
      this.seenWarnings.clear();
    }
    if (!scope || !Number.isSafeInteger(snapshot.tick)) return;
    let newWarning = false;
    let spiderWarning = false;
    for (const warning of Array.isArray(snapshot.warnings) ? snapshot.warnings : []) {
      if (typeof warning?.id !== 'string' || typeof warning.kind !== 'string' ||
        !Number.isSafeInteger(warning.endsAtTick) || warning.endsAtTick <= snapshot.tick) continue;
      const key = JSON.stringify([warning.id, warning.kind, warning.endsAtTick]);
      if (this.seenWarnings.has(key)) continue;
      this.seenWarnings.add(key);
      if (this.seenWarnings.size > 128) this.seenWarnings.delete(this.seenWarnings.values().next().value);
      newWarning = true;
      if (warning.kind.startsWith('SPIDER_')) spiderWarning = true;
    }
    // Simultaneous warnings form one cue; muted windows are not replayed on sound unlock.
    if (newWarning) this.play(spiderWarning ? 'screech' : 'warning');
  }

  // Why: Browsers require a direct user gesture before the audio context can start.
  // Input: Called only from the sound button's click handler.
  // Output: Whether audio is enabled after the browser accepts or rejects the request.
  async toggle() {
    if (this.disposed) return false;
    const version = ++this.unlockVersion;
    if (this.unlockPending || (this.enabled && this.context?.state === 'running')) {
      this.enabled = false;
      this.unlockPending = false;
      this.stopVoices();
      return false;
    }
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    this.unlockPending = true;
    try {
      this.context ||= new AudioContextClass();
      const context = this.context;
      await context.resume();
      if (version === this.unlockVersion && !this.disposed) this.enabled = context.state === 'running';
    } catch {
      if (version === this.unlockVersion) this.enabled = false;
    } finally {
      if (version === this.unlockVersion) this.unlockPending = false;
    }
    return this.enabled;
  }

  // Why: Repeated 30 Hz snapshots must not multiply an effect into an audio flood.
  // Input: A known cue name tied to a server-confirmed event or local acknowledged action.
  // Output: A short oscillator effect, or silence when muted or unavailable.
  play(name) {
    const cue = CUES[name];
    const context = this.context;
    if (!cue || !this.enabled || !context || context.state !== 'running' || this.document?.hidden) return;
    const now = context.currentTime;
    if (now - (this.lastCueAt.get(name) ?? -Infinity) < 0.08) return;
    // Results must remain audible even when combat fills the voice budget.
    if (name === 'victory' || name === 'defeat') this.stopVoices();
    if (this.voices.size >= MAX_VOICES) return;
    let voice;
    try {
      const oscillator = context.createOscillator();
      voice = { oscillator, gain: null };
      const gain = context.createGain();
      voice.gain = gain;
      oscillator.type = cue[3];
      oscillator.frequency.setValueAtTime(cue[0], now);
      oscillator.frequency.exponentialRampToValueAtTime(cue[1], now + cue[2]);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + cue[2]);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onended = () => this.releaseVoice(voice);
      this.voices.add(voice);
      oscillator.start(now);
      oscillator.stop(now + cue[2] + 0.01);
      this.lastCueAt.set(name, now);
    } catch {
      // Audio failure cannot interrupt simulation or input.
      if (voice) this.releaseVoice(voice, true);
    }
  }

  // Disconnect even partially constructed nodes after a browser audio failure.
  releaseVoice(voice, stop = false) {
    this.voices.delete(voice);
    voice.oscillator.onended = null;
    if (stop) {
      try { voice.oscillator.stop(); } catch {
        // A source that never started or already ended may reject stop.
      }
    }
    try { voice.oscillator.disconnect(); } catch {
      // Continue cleanup when the browser has already detached this source.
    }
    try { voice.gain?.disconnect(); } catch {
      // Continue teardown when the gain was detached with its context.
    }
  }

  stopVoices() {
    for (const voice of this.voices) this.releaseVoice(voice, true);
  }

  dispose() {
    this.disposed = true;
    this.unlockVersion += 1;
    this.unlockPending = false;
    this.enabled = false;
    this.stopVoices();
    this.document?.removeEventListener?.('visibilitychange', this.onVisibilityChange);
    try { this.context?.close?.().catch?.(() => {}); } catch {
      // An already closed context must not interrupt page teardown.
    }
    this.context = null;
    this.lastCueAt.clear();
    this.seenWarnings.clear();
  }
}

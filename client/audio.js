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
  warning: [440, 330, 0.27, 'square'],
  victory: [520, 1040, 0.48, 'sine'],
  defeat: [260, 90, 0.5, 'triangle']
});

export class GameAudio {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.lastCueAt = new Map();
  }

  // Why: Browsers require a direct user gesture before the audio context can start.
  // Input: Called only from the sound button's click handler.
  // Output: Whether audio is enabled after the browser accepts or rejects the request.
  async toggle() {
    if (this.enabled) {
      this.enabled = false;
      return false;
    }
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      this.context ||= new AudioContextClass();
      await this.context.resume();
      this.enabled = this.context.state === 'running';
    } catch {
      this.enabled = false;
    }
    return this.enabled;
  }

  // Why: Repeated 30 Hz snapshots must not multiply an effect into an audio flood.
  // Input: A known cue name tied to a server-confirmed event or local acknowledged action.
  // Output: A short oscillator effect, or silence when muted or unavailable.
  play(name) {
    const cue = CUES[name];
    const context = this.context;
    if (!cue || !this.enabled || !context || context.state !== 'running') return;
    const now = context.currentTime;
    if (now - (this.lastCueAt.get(name) ?? -Infinity) < 0.08) return;
    this.lastCueAt.set(name, now);
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = cue[3];
      oscillator.frequency.setValueAtTime(cue[0], now);
      oscillator.frequency.exponentialRampToValueAtTime(cue[1], now + cue[2]);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + cue[2]);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + cue[2] + 0.01);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch {
      // Audio failure cannot interrupt simulation or input.
    }
  }

  dispose() {
    this.enabled = false;
    this.context?.close?.().catch?.(() => {});
    this.context = null;
  }
}

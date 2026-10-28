// touch-controls.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Give touch explorers bounded movement intents without making the viewport own game rules.

const DIRECTIONS = Object.freeze({
  up: { x: 0, z: -1 },
  down: { x: 0, z: 1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 }
});
const ACTIONS = new Set(['attack', 'target', 'portal', 'disarm', 'collect', 'use', 'revive']);

export class TouchControls {
  constructor(root, { onMove, onAction }) {
    if (!root || typeof onMove !== 'function' || typeof onAction !== 'function') {
      throw new TypeError('TouchControls requires a root, onMove, and onAction');
    }
    this.root = root;
    this.onMove = onMove;
    this.onAction = onAction;
    this.enabled = false;
    this.held = new Map();
    this.lastX = 0;
    this.lastZ = 0;
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerEnd = this.onPointerEnd.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onBlur = () => this.release();
    this.onVisibility = () => { if (document.hidden) this.release(); };
    root.addEventListener('pointerdown', this.onPointerDown);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      root.addEventListener(type, this.onPointerEnd);
    }
    root.addEventListener('click', this.onClick);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.setEnabled(false);
  }

  // Why: A held direction can outlive the viewport if touch is canceled or focus moves.
  // Input: An untrusted pointer event that may originate from any descendant.
  // Output: Emits only normalized directional intent from known movement buttons.
  onPointerDown(event) {
    if (!this.enabled) return;
    const button = event.target?.closest?.('[data-move]');
    const direction = button?.dataset?.move;
    if (!button || !this.root.contains(button) || !DIRECTIONS[direction]) return;
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    this.held.set(event.pointerId, direction);
    this.emitMove();
  }

  onPointerEnd(event) {
    if (!this.held.delete(event.pointerId)) return;
    this.emitMove();
  }

  onClick(event) {
    if (!this.enabled) return;
    const button = event.target?.closest?.('[data-action]');
    const action = button?.dataset?.action;
    if (button && this.root.contains(button) && !button.disabled && ACTIONS.has(action)) this.onAction(action);
  }

  emitMove() {
    let x = 0;
    let z = 0;
    for (const direction of this.held.values()) {
      x += DIRECTIONS[direction].x;
      z += DIRECTIONS[direction].z;
    }
    const length = Math.hypot(x, z) || 1;
    x /= length;
    z /= length;
    if (x === this.lastX && z === this.lastZ) return;
    this.lastX = x;
    this.lastZ = z;
    this.onMove({ x, z });
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.root.hidden = !this.enabled;
    if (!this.enabled) this.release();
  }

  release() {
    this.held.clear();
    this.emitMove();
  }

  dispose() {
    this.setEnabled(false);
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.root.removeEventListener(type, this.onPointerEnd);
    }
    this.root.removeEventListener('click', this.onClick);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}

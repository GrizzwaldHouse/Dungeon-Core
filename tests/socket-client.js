// socket-client.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Exercise Socket.IO room behavior with a controlled local test client.

'use strict';

// Minimal Socket.IO v4 websocket probe for local tests; no external test dependency.
class ProbeClient {
  constructor(url) {
    this.ws = new WebSocket(`${url.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`);
    this.pending = new Map();
    this.listeners = new Map();
    this.nextAck = 1;
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket.IO handshake timed out')), 3000);
      this.ws.addEventListener('error', (event) => { clearTimeout(timer); reject(new Error(`WebSocket connection failed: ${event.error?.message || event.message || 'unknown'}`)); });
      this.ws.addEventListener('message', (event) => {
        const frame = String(event.data);
        if (frame.startsWith('0')) this.ws.send('40');
        else if (frame.startsWith('40')) { clearTimeout(timer); resolve(); }
        else this.receive(frame);
      });
      this.ws.addEventListener('close', () => {
        for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('Socket closed')); }
        this.pending.clear();
      });
    });
  }

  receive(frame) {
    if (frame === '2') { this.ws.send('3'); return; }
    if (frame.startsWith('43')) {
      const match = /^43(\d+)(\[.*)$/s.exec(frame);
      if (!match) return;
      const entry = this.pending.get(Number(match[1]));
      if (!entry) return;
      this.pending.delete(Number(match[1]));
      clearTimeout(entry.timer);
      try { entry.resolve(JSON.parse(match[2])[0]); } catch (error) { entry.reject(error); }
    } else if (frame.startsWith('42')) {
      try {
        const [name, payload] = JSON.parse(frame.slice(2));
        for (const listener of this.listeners.get(name) || []) listener(payload);
      } catch {
        // Ignore malformed server probe frames.
      }
    }
  }

  on(name, listener) {
    const set = this.listeners.get(name) || new Set();
    set.add(listener);
    this.listeners.set(name, set);
    return () => set.delete(listener);
  }

  async rpc(name, payload = {}) {
    await this.ready;
    const id = this.nextAck++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${name} ack timed out`)); }, 3000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(`42${id}${JSON.stringify([name, payload])}`);
    });
  }

  async emit(name, payload = {}) {
    await this.ready;
    this.ws.send(`42${JSON.stringify([name, payload])}`);
  }

  async waitFor(name, predicate = () => true, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { off(); reject(new Error(`${name} timed out`)); }, timeoutMs);
      const off = this.on(name, (payload) => {
        if (!predicate(payload)) return;
        clearTimeout(timer);
        off();
        resolve(payload);
      });
    });
  }

  close() { if (this.ws.readyState === WebSocket.OPEN) this.ws.close(); }
}

module.exports = { ProbeClient };

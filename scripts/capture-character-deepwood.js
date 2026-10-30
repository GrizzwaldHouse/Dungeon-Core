// capture-character-deepwood.js
// Why: Drive the real server through the campaign and capture its live Deepwood actors.
// Scope: Local headless QA only; room codes are hidden from retained screenshots and reports.

'use strict';

const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createGameServer } = require('../server/server');
const { ProbeClient } = require('../tests/socket-client');

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let gameUrl;
const outputPath = path.resolve(process.argv[2] || `docs/evidence/character-runtime-2026-10-30/deepwood-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), 'dungeon-layout-qa-'));
const browserErrors = [];
const browserWarnings = [];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function moveNear(app, peer, code, playerId, target, tolerance = 1.1) {
  for (let step = 0; step < 140; step += 1) {
    const position = app.getRoomSnapshot(code).players[playerId].transform.position;
    const dx = target.x - position.x;
    const dz = target.z - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= tolerance) {
      await peer.rpc('player:input', { inputSeq: ++peer.seq, moveX: 0, moveZ: 0 });
      return;
    }
    const moved = await peer.rpc('player:input', { inputSeq: ++peer.seq,
      moveX: dx / distance, moveZ: dz / distance });
    if (!moved.ok) throw new Error(`Movement rejected: ${moved.error}`);
    await delay(35);
  }
  const final = app.getRoomSnapshot(code).players[playerId].transform.position;
  throw new Error(`Could not reach encounter target ${JSON.stringify(target)} from ${JSON.stringify(final)}`);
}

async function waitForJson(url, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await delay(100);
  }
  throw new Error(`Chrome DevTools was not ready at ${url}`);
}

async function waitForCondition(send, expression, label, attempts = 160) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.result?.value) return result.result.value;
    await delay(125);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function connectDevTools(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let commandId = 0;
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push({ source: 'page-exception', text: message.params.exceptionDetails?.text || 'Uncaught exception' });
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      browserErrors.push({ source: 'console.error', text: message.params.args?.map((arg) => arg.value || arg.description || '').join(' ').slice(0, 500) });
    } else if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
      const entry = message.params.entry;
      const text = String(entry.text || '').slice(0, 500);
      const favicon404 = /favicon\.ico/i.test(entry.url || '') ||
        (/Failed to load resource.*404/i.test(text) && browserWarnings.some((warning) => warning.url?.endsWith('/favicon.ico')));
      (favicon404 ? browserWarnings : browserErrors).push({ source: favicon404 ? 'optional-favicon' : 'browser-log',
        text, ...(entry.url ? { url: entry.url.replace(/[?#].*$/, '') } : {}) });
    } else if (message.method === 'Network.responseReceived' && message.params.response?.status >= 400) {
      const response = message.params.response;
      const failure = { source: 'http-response', status: response.status, url: String(response.url || '').replace(/[?#].*$/, '') };
      (response.status === 404 && /\/favicon\.ico$/i.test(response.url || '') ? browserWarnings : browserErrors).push(failure);
    }
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  return {
    socket,
    send(method, params = {}) {
      commandId += 1;
      return new Promise((resolve, reject) => {
        pending.set(commandId, { resolve, reject });
        socket.send(JSON.stringify({ id: commandId, method, params }));
      });
    }
  };
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
}

const captures = [];

async function run() {
  if (!fs.existsSync(chromePath)) throw new Error(`Chrome was not found at ${chromePath}`);
  const app = createGameServer({ host: 'localhost', port: 0, playerSpeed: 25, maxHealth: 1000 });
  await app.listen();
  gameUrl = `http://localhost:${app.httpServer.address().port}/`;
  fs.mkdirSync(outputPath, { recursive: true });
  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
    '--disable-sync', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars',
    '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profilePath}`,
    '--use-angle=swiftshader', '--window-size=1440,900', 'about:blank'
  ], { stdio: 'ignore' });

  let devTools;
  let peer;
  try {
    let devToolsPort;
    for (let attempt = 0; attempt < 100 && !devToolsPort; attempt += 1) {
      try { devToolsPort = Number(fs.readFileSync(path.join(profilePath, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]); }
      catch { await delay(100); }
    }
    if (!devToolsPort) throw new Error('Chrome did not create its temporary DevTools port file');
    const targets = await waitForJson(`http://localhost:${devToolsPort}/json`);
    const target = targets.find((entry) => entry.type === 'page');
    if (!target) throw new Error('Chrome did not expose a page target');
    devTools = await connectDevTools(target.webSocketDebuggerUrl);
    const { send } = devTools;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: gameUrl });
    await waitForCondition(send, "document.readyState === 'complete'", 'document load');
    await waitForCondition(send, "document.querySelector('#connection-label')?.textContent === 'CONNECTED'", 'local Socket.IO connection');
    await evaluate(send, `(() => {
      const name = document.querySelector('#display-name');
      name.value = 'Visual QA';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#create-room').click();
      return true;
    })()`);
    await waitForCondition(send, "!document.querySelector('#add-mocks')?.hidden", 'host lobby controls');
    const roomCode = await evaluate(send, "document.querySelector('#room-label').textContent");
    peer = new ProbeClient(gameUrl.slice(0, -1));
    peer.seq = 0;
    const joined = await peer.rpc('room:join', { roomCode, displayName: 'Mock Ember' });
    if (!joined.ok) throw new Error(`Peer join rejected: ${joined.error}`);
    await waitForCondition(send, "document.querySelector('#start-room')?.disabled === false", 'two-player start control');
    await evaluate(send, "document.querySelector('#start-room').click(); true");
    await waitForCondition(send, "document.querySelector('#phase-label')?.textContent !== 'LOBBY'", 'running entry room');
    await waitForCondition(send, "document.querySelector('#viewport')?.classList.contains('webgl-ready')", 'WebGL ready');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "document.addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = '.room-tag, #status { visibility: hidden !important }'; document.head.append(style); });" });
    await evaluate(send, "(() => { const style = document.createElement('style'); style.textContent = '.room-tag, #status { visibility: hidden !important }'; document.head.append(style); return true; })()");
    const snapshot = () => app.getRoomSnapshot(roomCode);
    let action = 0;
    const waitFor = async (predicate, label, limit = 160) => {
      for (let i = 0; i < limit; i += 1) {
        if (predicate(snapshot())) return;
        await delay(40);
      }
      throw new Error(`Timed out waiting for ${label}`);
    };
    const strikeUntil = async (done, label, limit = 90) => {
      for (let i = 0; i < limit; i += 1) {
        if (done(snapshot())) return;
        const enemy = Object.values(snapshot().enemies).find((entry) => entry.health.current > 0);
        if (!enemy) { await delay(40); continue; }
        await moveNear(app, peer, roomCode, joined.playerId, enemy.transform.position);
        const result = await peer.rpc('combat:attack', { actionId: `capture-strike-${++action}`, targetEnemyId: enemy.enemyId });
        if (!result.ok && !['ATTACK_COOLDOWN', 'OUT_OF_RANGE'].includes(result.error)) throw new Error(`${label}: ${result.error}`);
        await delay(470);
      }
      throw new Error(`${label} did not reach its authoritative gate`);
    };
    const enterPortal = async (label) => {
      const portal = snapshot().portals[0];
      if (portal.state !== 'AVAILABLE') throw new Error(`${label}: portal is ${portal.state}`);
      if (snapshot().space?.id === 'amber-vault' && portal.position.z > 2) {
        await moveNear(app, peer, roomCode, joined.playerId, { x: 4, z: -1 }, 0.6);
        await moveNear(app, peer, roomCode, joined.playerId, { x: 4, z: 8 }, 0.6);
      }
      await moveNear(app, peer, roomCode, joined.playerId, portal.position, 0.8);
      const result = await peer.rpc('portal:enter', { actionId: `capture-route-${++action}`, portalId: portal.id });
      if (!result.ok) throw new Error(`${label}: ${result.error}`);
    };
    await strikeUntil((state) => state.floor.requiredObjectives.sentinelDefeated, 'first sentinel', 20);
    await enterPortal('entry gate');
    await moveNear(app, peer, roomCode, joined.playerId, snapshot().trap.position, 1.4);
    const disarmed = await peer.rpc('trap:disarm', { actionId: `capture-route-${++action}`, trapId: 'vault-trap' });
    if (!disarmed.ok) throw new Error(`trap: ${disarmed.error}`);
    await enterPortal('floor one exit');
    await enterPortal('rest to floor two');
    await strikeUntil((state) => state.encounter?.stage === 'CLEARED', 'floor two', 65);
    await enterPortal('floor two exit');
    await enterPortal('rest to floor three');
    await waitFor((state) => state.encounter?.waveIndex >= 1, 'first wave');
    await strikeUntil((state) => state.encounter?.phase === 'REST_AVAILABLE', 'floor three', 95);
    await enterPortal('floor three exit');
    await enterPortal('Deepwood entry');
    await waitFor((state) => state.floor?.phase === 'DEEPWOOD', 'Deepwood');
    await evaluate(send, "document.querySelector('#story-chapter-continue')?.click(); true");
    await evaluate(send, "document.querySelector('#viewport').focus(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', bubbles: true })); true");
    await delay(420);
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS', bubbles: true })); true");
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true })); true");
    await delay(40);
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', bubbles: true })); true");
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', bubbles: true })); true");
    await delay(95);
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS', bubbles: true })); true");
    await delay(400);
    for (let correction = 0; correction < 12; correction += 1) {
      const current = snapshot().players[snapshot().hostPlayerId].transform.position;
      if (Math.hypot(current.x, current.z - 7) <= 2.1) break;
      const key = Math.abs(current.x) > Math.abs(current.z - 7)
        ? current.x > 0 ? 'KeyA' : 'KeyD' : current.z < 7 ? 'KeyS' : 'KeyW';
      await evaluate(send, `document.querySelector('#viewport').focus(); window.dispatchEvent(new KeyboardEvent('keydown', { code: '${key}', bubbles: true })); true`);
      await delay(35);
      await evaluate(send, `window.dispatchEvent(new KeyboardEvent('keyup', { code: '${key}', bubbles: true })); true`);
      await delay(70);
    }
    const hostPosition = snapshot().players[snapshot().hostPlayerId].transform.position;
    if (Math.hypot(hostPosition.x, hostPosition.z - 7) > 2.3)
      throw new Error(`Browser host did not reach boss attack range: ${JSON.stringify(hostPosition)}`);
    const captureState = async (label, width, height, mobile, cameraMode = 'angled', settleMs = 130) => {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
      await evaluate(send, `(() => { const camera = document.querySelector('#camera-mode'); camera.value = '${cameraMode}'; camera.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
      await delay(settleMs);
      const state = snapshot();
      const graphics = await evaluate(send, `({ webglReady: document.querySelector('#viewport')?.classList.contains('webgl-ready') || false,
        recoveryVisible: !document.querySelector('#render-recovery')?.hidden,
        canvasCount: document.querySelectorAll('#viewport canvas').length })`);
      if (label === 'barkwing-dive-warning' && !(state.warnings || []).some((warning) => warning.kind === 'BARKWING_DIVE'))
        throw new Error('Dive warning expired before its named screenshot');
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
      const file = `${label}-${cameraMode}-${width}x${height}.png`;
      fs.writeFileSync(path.join(outputPath, file), Buffer.from(screenshot.data, 'base64'));
      captures.push({ file, label, cameraMode, viewport: { width, height }, graphics, serverTick: state.tick,
        phase: state.floor.phase, kinds: Object.values(state.enemies).filter((enemy) => enemy.health.current > 0).map((enemy) => enemy.kind),
        playerHealth: state.players[state.hostPlayerId].health.current,
        playerPosition: state.players[state.hostPlayerId].transform.position,
        enemyPositions: Object.values(state.enemies).filter((enemy) => enemy.health.current > 0)
          .map((enemy) => ({ kind: enemy.kind, position: enemy.transform.position,
            health: enemy.health.current, maxHealth: enemy.health.max })),
        warningKinds: (state.warnings || []).map((warning) => warning.kind) });
    };
    await captureState('boss-before-summon', 1440, 900, false);
    const bossHealthBeforeHostAttack = snapshot().enemies['deepwood-sentinel'].health.current;
    await evaluate(send, "document.querySelector('#attack-enemy').click(); true");
    await waitFor((state) => state.enemies['deepwood-sentinel'].health.current < bossHealthBeforeHostAttack,
      'browser host attack damage', 20);
    await captureState('player-attack', 1440, 900, false, 'angled', 20);
    await strikeUntil((state) => state.encounter?.minionsSpawned >= 2, 'Deepwood summons', 25);
    await captureState('boss-and-minions', 1440, 900, false);
    await waitFor((state) => (state.warnings || []).some((warning) => warning.kind === 'BARKWING_DIVE'), 'Barkwing warning', 160);
    await captureState('barkwing-dive-warning', 1440, 900, false, 'angled', 0);
    await captureState('boss-and-minions', 390, 844, true);
    await captureState('boss-and-minions', 844, 390, true);
    await strikeUntil((state) => state.encounter?.minionsSpawned >= 4, 'Deepwood second summon', 35);
    await captureState('boss-wing-rootling', 1440, 900, false);
    await captureState('boss-wing-rootling', 1440, 900, false, 'top-down');
    await moveNear(app, peer, roomCode, joined.playerId, { x: 3, z: 7 }, 0.8);
    await evaluate(send, "document.querySelector('#viewport').focus(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true })); true");
    await delay(100);
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', bubbles: true })); document.querySelector('#zoom-in').click(); true");
    await captureState('cover-detail-combat', 1440, 900, false);
    const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const sourceDigest = crypto.createHash('sha256').update(fs.readFileSync('client/render.js')).digest('hex');
    const report = {
      generatedAt: new Date().toISOString(),
      candidateHead: gitHead,
      candidateRendererSha256: sourceDigest,
      source: 'live authoritative Deepwood server; local headless Chrome / SwiftShader',
      gameUrl: 'local loopback server',
      captures,
      browserErrors: browserErrors.map(({ source, text }) => ({ source, text: String(text).replace(/https?:\/\/[^/\s]+/g, '[local]') })),
      browserWarnings: browserWarnings.map(({ source, status, text }) => ({ source, status, text: String(text || '').replace(/https?:\/\/[^/\s]+/g, '[local]') }))
    };
    fs.writeFileSync(path.join(outputPath, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ outputPath, candidateHead: gitHead, sourceDigest, screenshotCount: captures.length, browserErrorCount: browserErrors.length }, null, 2)}\n`);
    if (browserErrors.length) {
      process.exitCode = 1;
    }
  } finally {
    if (devTools) devTools.socket.close();
    peer?.close();
    chrome.kill();
    await app.close();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

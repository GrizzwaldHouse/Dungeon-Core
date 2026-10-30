// capture-downed-revive.js
// Why: Capture a server-caused down and server-validated ally revive in the live browser.
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
const outputPath = path.resolve(process.argv[2] || `docs/evidence/downed-revive-2026-10-30/run-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), 'dungeon-revive-qa-'));
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

async function run() {
  if (!fs.existsSync(chromePath)) throw new Error('Chrome unavailable');
  const app = createGameServer({ host: 'localhost', port: 0, maxHealth: 80, playerSpeed: 25 });
  await app.listen();
  gameUrl = `http://localhost:${app.httpServer.address().port}/`;
  fs.mkdirSync(outputPath, { recursive: true });
  const chrome = spawn(chromePath, ['--headless=new', '--disable-background-networking',
    '--disable-extensions', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars',
    '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profilePath}`,
    '--use-angle=swiftshader', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  let devTools;
  let peer;
  try {
    let port;
    for (let i = 0; i < 100 && !port; i += 1) {
      try { port = Number(fs.readFileSync(path.join(profilePath, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]); }
      catch { await delay(100); }
    }
    if (!port) throw new Error('Chrome DevTools port unavailable');
    const targets = await waitForJson(`http://localhost:${port}/json`);
    devTools = await connectDevTools(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
    const { send } = devTools;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: gameUrl });
    await waitForCondition(send, "document.querySelector('#connection-label')?.textContent === 'CONNECTED'", 'connection');
    peer = new ProbeClient(gameUrl.slice(0, -1));
    peer.seq = 0;
    const created = await peer.rpc('room:create', { displayName: 'Rescue Partner' });
    if (!created.ok) throw new Error(`Peer create: ${created.error}`);
    const code = created.roomCode;
    await evaluate(send, `(() => { const name = document.querySelector('#display-name'); name.value = 'Revive QA'; name.dispatchEvent(new Event('input', { bubbles: true })); const input = document.querySelector('#room-code'); input.value = '${code}'; input.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#join-room').click(); return true; })()`);
    await waitForCondition(send, "document.querySelector('#phase-label')?.textContent === 'LOBBY' && document.querySelector('#room-label')?.textContent?.length === 4", 'joined lobby');
    const started = await peer.rpc('room:start');
    if (!started.ok) throw new Error(`Peer start: ${started.error}`);
    await waitForCondition(send, "document.querySelector('#phase-label')?.textContent !== 'LOBBY'", 'running room');
    await waitForCondition(send, "document.querySelector('#viewport')?.classList.contains('webgl-ready')", 'WebGL');
    await evaluate(send, "(() => { const style = document.createElement('style'); style.textContent = '.room-tag, #status { visibility: hidden !important }'; document.head.append(style); document.querySelector('#story-chapter-continue')?.click(); return true; })()");
    const snapshot = () => app.getRoomSnapshot(code);
    const browserPlayerId = Object.values(snapshot().players).find((player) => player.displayName === 'Revive QA')?.playerId;
    if (!browserPlayerId) throw new Error('Browser player not in authoritative room');
    const host = () => snapshot().players[browserPlayerId];
    const peerState = () => snapshot().players[created.playerId];
    const save = async (label, width, height, mobile, settleMs = 160) => {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
      if (settleMs) await delay(settleMs);
      const state = snapshot();
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
      fs.writeFileSync(path.join(outputPath, `${label}-${width}x${height}.png`), Buffer.from(screenshot.data, 'base64'));
      return { label, width, height, tick: state.tick, hostHealth: host().health.current,
        hostDowned: host().downedAtTick !== null, partnerCharges: peerState().inventory.healingCharges,
        partnerSupport: peerState().metrics.supportActions };
    };
    let action = 0;
    const first = Object.values(snapshot().enemies).find((entry) => entry.kind === 'SENTINEL');
    if (!first) throw new Error('No entry Sentinel');
    for (let i = 0; i < 10 && snapshot().enemies[first.enemyId].health.current > 0; i += 1) {
      await moveNear(app, peer, code, created.playerId, first.transform.position);
      const hit = await peer.rpc('combat:attack', { actionId: `route-${++action}`, targetEnemyId: first.enemyId });
      if (!hit.ok && hit.error !== 'ATTACK_COOLDOWN') throw new Error(`Entry attack: ${hit.error}`);
      await delay(470);
    }
    if (snapshot().enemies[first.enemyId].health.current > 0) throw new Error('Entry Sentinel remained alive');
    const enter = async (label) => {
      const portal = snapshot().portals[0];
      if (portal.state !== 'AVAILABLE') throw new Error(`${label}: portal unavailable`);
      if (snapshot().space?.id === 'amber-vault' && portal.position.z > 2) {
        await moveNear(app, peer, code, created.playerId, { x: 4, z: -1 }, 0.6);
        await moveNear(app, peer, code, created.playerId, { x: 4, z: 8 }, 0.6);
      }
      await moveNear(app, peer, code, created.playerId, portal.position, 0.8);
      const result = await peer.rpc('portal:enter', { actionId: `route-${++action}`, portalId: portal.id });
      if (!result.ok) throw new Error(`${label}: ${result.error}`);
    };
    await enter('entry gate');
    await moveNear(app, peer, code, created.playerId, snapshot().trap.position, 1.4);
    const disarmed = await peer.rpc('trap:disarm', { actionId: `route-${++action}`, trapId: 'vault-trap' });
    if (!disarmed.ok) throw new Error(`Trap: ${disarmed.error}`);
    await enter('floor one exit');
    await moveNear(app, peer, code, created.playerId, { x: 0, z: -3 }, 0.5);
    const supply = await peer.rpc('item:collect', { actionId: `route-${++action}`, itemId: 'rest-supply' });
    if (!supply.ok) throw new Error(`Supply: ${supply.error}`);
    await enter('rest to floor two');
    await evaluate(send, "document.querySelector('#story-chapter-continue')?.click(); document.querySelector('#viewport').focus(); true");
    if (peerState().inventory.healingCharges < 1) throw new Error('Rescue partner did not earn a charge');
    await moveNear(app, peer, code, created.playerId, { x: -4, z: -6 }, 0.7);
    const enemy = Object.values(snapshot().enemies).find((entry) => entry.health.current > 0);
    if (!enemy) throw new Error('No live floor two enemy to cause damage');
    await evaluate(send, "document.querySelector('#viewport').focus(); true");
    const goal = enemy.transform.position;
    for (let step = 0; step < 150 && host().health.current > 0; step += 1) {
      const player = host().transform.position;
      const distance = Math.hypot(goal.x - player.x, goal.z - player.z);
      if (distance < 1.1) break;
      const key = Math.abs(goal.x - player.x) > Math.abs(goal.z - player.z)
        ? goal.x > player.x ? 'KeyD' : 'KeyA' : goal.z > player.z ? 'KeyS' : 'KeyW';
      await evaluate(send, `window.dispatchEvent(new KeyboardEvent('keydown', { code: '${key}', bubbles: true })); true`);
      await delay(40);
      await evaluate(send, `window.dispatchEvent(new KeyboardEvent('keyup', { code: '${key}', bubbles: true })); true`);
      await delay(50);
    }
    const before = await save('sentinel-approach', 1440, 900, false);
    const chargesBefore = peerState().inventory.healingCharges;
    if (chargesBefore < 1) throw new Error('Rescue companion entered combat without a healing charge');
    for (let i = 0; i < 1000 && host().health.current > 0; i += 1) await delay(20);
    if (host().health.current !== 0 || host().downedAtTick === null) throw new Error(`Sentinel down was not observable: host=${host().health.current}, enemy=${snapshot().enemies[enemy.enemyId]?.health?.current}, botCharges=${peerState().inventory.healingCharges}, support=${peerState().metrics.supportActions}`);
    const downDesktop = await save('player-downed', 1440, 900, false, 0);
    const downPortrait = await save('player-downed', 390, 844, true, 0);
    if (!downDesktop.hostDowned || !downPortrait.hostDowned)
      throw new Error('A saved downed frame did not retain the downed server state');
    await moveNear(app, peer, code, created.playerId, host().transform.position, 1.2);
    const revive = await peer.rpc('player:revive', { actionId: 'live-rescue-proof', targetPlayerId: browserPlayerId });
    if (!revive.ok) throw new Error(`Server refused revive: ${revive.error}`);
    if (host().health.current <= 0 || host().downedAtTick !== null ||
      peerState().inventory.healingCharges !== chargesBefore - 1) throw new Error('Revive state mismatch');
    const revived = await save('player-revived', 390, 844, true);
    if (revived.hostDowned || revived.hostHealth !== 25 || revived.partnerSupport !== 1)
      throw new Error('Saved revive frame did not retain the recovered server state');
    const report = { baseline: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      rendererSha256: crypto.createHash('sha256').update(fs.readFileSync('client/render.js')).digest('hex'),
      source: 'local live Socket.IO room and headless Chrome / SwiftShader', captureMaxHealth: 80,
      captures: [before, downDesktop, downPortrait, revived], serverRevive: { ok: revive.ok,
        health: host().health.current, chargesSpent: 1 }, browserErrors: browserErrors.map((item) => item.text),
      browserWarnings: browserWarnings.map((item) => item.source) };
    fs.writeFileSync(path.join(outputPath, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ outputPath, captureCount: report.captures.length,
      browserErrors: browserErrors.length, downed: downDesktop.hostDowned, revivedHealth: revived.hostHealth })}\n`);
    if (browserErrors.length) process.exitCode = 1;
  } finally {
    devTools?.socket.close();
    peer?.close();
    chrome.kill();
    await app.close();
  }
}

run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });

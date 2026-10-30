// capture-layout-stage-two.js
// Why: Capture the staged layout candidate and an authoritative trap sequence in one local process.
// Scope: Local headless QA only; room codes are hidden from retained screenshots and reports.

'use strict';

const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createGameServer } = require('../server/server');

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let gameUrl;
const outputPath = path.resolve(process.argv[2] || `docs/evidence/layout-stage-two/capture-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), 'dungeon-layout-qa-'));
const browserErrors = [];
const browserWarnings = [];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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

async function capture(send, label, width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile,
    screenWidth: width, screenHeight: height,
    ...(mobile ? { mobile: true } : {})
  });
  for (const cameraMode of ['angled', 'top-down']) {
    await evaluate(send, `(() => {
      const camera = document.querySelector('#camera-mode');
      camera.value = '${cameraMode}';
      camera.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    await delay(500);
    const state = await evaluate(send, `({
      phase: document.querySelector('#phase-label')?.textContent || null,
      cameraMode: document.querySelector('#camera-mode')?.value || null,
      connected: document.querySelector('#connection-label')?.textContent === 'CONNECTED',
      webglReady: document.querySelector('#viewport')?.classList.contains('webgl-ready') || false,
      recoveryVisible: !document.querySelector('#render-recovery')?.hidden,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      canvasCount: document.querySelectorAll('#viewport canvas').length,
      hudBottom: Math.round(document.querySelector('.squad')?.getBoundingClientRect().bottom || 0),
      sceneBottom: Math.round(document.querySelector('.touch-controls')?.getBoundingClientRect().top || window.innerHeight)
    })`);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    const file = path.join(outputPath, `${label}-${cameraMode}.png`);
    fs.writeFileSync(file, Buffer.from(screenshot.data, 'base64'));
    captures.push({ file, label, ...state });
  }
}

const captures = [];

async function run() {
  if (!fs.existsSync(chromePath)) throw new Error(`Chrome was not found at ${chromePath}`);
  const app = createGameServer({ host: 'localhost', port: 0 });
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
      name.value = 'Layout QA';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#create-room').click();
      return true;
    })()`);
    await waitForCondition(send, "!document.querySelector('#add-mocks')?.hidden", 'host lobby controls');
    await evaluate(send, "document.querySelector('#add-mocks').click(); true");
    await waitForCondition(send, "document.querySelector('#player-count')?.textContent?.startsWith('5')", 'mock party');
    await evaluate(send, "document.querySelector('#start-room').click(); true");
    await waitForCondition(send, "document.querySelector('#phase-label')?.textContent !== 'LOBBY'", 'running entry room');
    await waitForCondition(send, "document.querySelector('#viewport')?.classList.contains('webgl-ready')", 'WebGL ready');
    const roomCode = await evaluate(send, "document.querySelector('#room-label').textContent");
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "document.addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = '.room-tag, #status { visibility: hidden !important }'; document.head.append(style); });" });
    await evaluate(send, "(() => { const style = document.createElement('style'); style.textContent = '.room-tag, #status { visibility: hidden !important }'; document.head.append(style); return true; })()");
    await delay(900);

    await capture(send, 'desktop', 1440, 900, false);
    await capture(send, 'phone-viewport', 390, 844, true);
    const captureTrap = async (label, expectedState) => {
      const snapshot = app.getRoomSnapshot(roomCode);
      if ((snapshot?.trap?.state || 'ABSENT') !== expectedState) throw new Error(`${label}: expected ${expectedState}, got ${snapshot?.trap?.state || 'ABSENT'}`);
      await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await evaluate(send, "(() => { const camera = document.querySelector('#camera-mode'); camera.value = 'angled'; camera.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
      await delay(100);
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
      fs.writeFileSync(path.join(outputPath, `trap-${label}.png`), Buffer.from(screenshot.data, 'base64'));
      captures.push({ file: `trap-${label}.png`, trapState: expectedState, serverTick: snapshot.tick, source: 'authoritative local room snapshot' });
    };
    await captureTrap('pre-trigger-entry', 'ABSENT');
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true })); true");
    await delay(1050);
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', bubbles: true })); true");
    for (let attempt = 0; attempt < 35 && !app.getRoomSnapshot(roomCode)?.floor?.requiredObjectives?.sentinelDefeated; attempt += 1) {
      await evaluate(send, "document.querySelector('#attack')?.click(); true");
      await delay(480);
    }
    if (!app.getRoomSnapshot(roomCode)?.floor?.requiredObjectives?.sentinelDefeated) throw new Error('Sentinel was not cleared');
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true })); true");
    await delay(1050);
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', bubbles: true })); true");
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true })); true");
    await delay(1450);
    await evaluate(send, "window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true })); true");
    await delay(100);
    await evaluate(send, "document.querySelector('#enter-portal').click(); true");
    for (let attempt = 0; attempt < 20 && app.getRoomSnapshot(roomCode)?.trap?.state !== 'TELEGRAPHED'; attempt += 1) await delay(50);
    await evaluate(send, "document.querySelector('#story-chapter-continue')?.click(); true");
    await captureTrap('warning', 'TELEGRAPHED');
    for (let attempt = 0; attempt < 60 && app.getRoomSnapshot(roomCode)?.trap?.state !== 'ACTIVE'; attempt += 1) await delay(50);
    await captureTrap('active', 'ACTIVE');
    for (let attempt = 0; attempt < 60 && app.getRoomSnapshot(roomCode)?.trap?.state !== 'CLEARED'; attempt += 1) await delay(50);
    await captureTrap('cleared', 'CLEARED');
    const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const sourceDigest = crypto.createHash('sha256').update(fs.readFileSync('client/render.js'))
      .update(fs.readFileSync('shared/dungeon-layout.js')).digest('hex');
    const report = {
      generatedAt: new Date().toISOString(),
      candidateHead: gitHead,
      candidateLayoutSourceSha256: sourceDigest,
      source: 'local headless Chrome / SwiftShader; entry room runtime geometry',
      gameUrl: 'local loopback server',
      captures,
      browserErrors: browserErrors.map(({ source, text }) => ({ source, text: String(text).replace(/https?:\/\/[^/\s]+/g, '[local]') })),
      browserWarnings: browserWarnings.map(({ source, status, text }) => ({ source, status, text: String(text || '').replace(/https?:\/\/[^/\s]+/g, '[local]') }))
    };
    fs.writeFileSync(path.join(outputPath, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ outputPath, candidateHead: gitHead, sourceDigest, screenshotCount: captures.length, browserErrorCount: browserErrors.length }, null, 2)}\n`);
    if (captures.some((capture) => capture.cameraMode && (!capture.connected || !capture.webglReady || capture.recoveryVisible)) || browserErrors.length) {
      process.exitCode = 1;
    }
  } finally {
    if (devTools) devTools.socket.close();
    chrome.kill();
    await app.close();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

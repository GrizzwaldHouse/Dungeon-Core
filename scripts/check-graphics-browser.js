// Local browser evidence for resize and actual WebGL context recovery.
// Captures stay outside Git because a running room can show its locator.
'use strict';

const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createGameServer } = require('../server/server');

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputPath = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'dungeon-graphics-browser'));
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), 'dungeon-graphics-profile-'));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, label) {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const value = await check();
    if (value) return value;
    await delay(125);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 0;
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  return {
    socket,
    send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
  };
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
}

async function capture(send, label) {
  const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(outputPath, `${label}.png`), Buffer.from(screenshot.data, 'base64'));
}

async function run() {
  assert.ok(fs.existsSync(chromePath), 'Chrome must be installed');
  fs.mkdirSync(outputPath, { recursive: true });
  const app = createGameServer({ host: '127.0.0.1', port: 0 });
  await app.listen();
  const url = `http://127.0.0.1:${app.httpServer.address().port}/`;
  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
    '--disable-sync', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run',
    '--remote-debugging-port=0', `--user-data-dir=${profilePath}`, '--use-angle=swiftshader',
    '--window-size=1440,900', 'about:blank'
  ], { stdio: 'ignore' });
  let browser;
  try {
    const port = await waitFor(() => {
      try { return Number(fs.readFileSync(path.join(profilePath, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]); }
      catch { return 0; }
    }, 'Chrome DevTools port');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    browser = await connect(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
    const { send } = browser;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url });
    await waitFor(() => evaluate(send, "document.querySelector('#connection-label')?.textContent === 'CONNECTED'"), 'local connection');
    await evaluate(send, `(() => {
      const name = document.querySelector('#display-name');
      name.value = 'Graphics QA';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#create-room').click();
      return true;
    })()`);
    await waitFor(() => evaluate(send, "!document.querySelector('#add-mocks')?.hidden"), 'room controls');
    await evaluate(send, "document.querySelector('#add-mocks').click(); true");
    await waitFor(() => evaluate(send, "document.querySelector('#player-count')?.textContent?.startsWith('5')"), 'mock party');
    await evaluate(send, "document.querySelector('#start-room').click(); true");
    await waitFor(() => evaluate(send, "document.querySelector('#viewport')?.classList.contains('webgl-ready') && document.documentElement.classList.contains('is-running')"), 'running WebGL scene');

    const inspect = () => evaluate(send, `(() => {
      const viewport = document.querySelector('#viewport');
      const canvas = viewport.querySelector('canvas');
      const recovery = document.querySelector('#render-recovery');
      const reload = document.querySelector('#reload-game');
      const rect = reload.getBoundingClientRect();
      return {
        width: innerWidth, height: innerHeight,
        ready: viewport.classList.contains('webgl-ready'),
        recoveryVisible: !recovery.hidden,
        recoveryText: recovery.hidden ? null : document.querySelector('#render-recovery-message').textContent,
        reloadInViewport: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
        canvasWidth: canvas.clientWidth, canvasHeight: canvas.clientHeight,
        viewportWidth: viewport.clientWidth, viewportHeight: viewport.clientHeight
      };
    })()`);

    const desktop = await inspect();
    assert.ok(desktop.ready && !desktop.recoveryVisible);
    await capture(send, 'desktop-running');
    await send('Emulation.setDeviceMetricsOverride', { width: 720, height: 450, deviceScaleFactor: 1, mobile: false });
    await delay(350);
    const zoomEquivalent = await inspect();
    assert.ok(zoomEquivalent.ready && !zoomEquivalent.recoveryVisible);
    assert.equal(zoomEquivalent.canvasWidth, zoomEquivalent.viewportWidth);
    assert.equal(zoomEquivalent.canvasHeight, zoomEquivalent.viewportHeight);
    await capture(send, 'zoom-equivalent-running');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
      screenWidth: 390, screenHeight: 844 });
    await delay(350);
    const narrow = await inspect();
    assert.ok(narrow.ready && !narrow.recoveryVisible);
    await capture(send, 'narrow-running');

    const extensionAvailable = await evaluate(send, `(() => {
      const canvas = document.querySelector('#viewport canvas');
      const gl = canvas.getContext('webgl2');
      window.__graphicsQaExtension = gl?.getExtension('WEBGL_lose_context');
      return Boolean(window.__graphicsQaExtension);
    })()`);
    assert.ok(extensionAvailable, 'WEBGL_lose_context extension must be available');
    await evaluate(send, 'window.__graphicsQaExtension.loseContext(); true');
    await waitFor(() => evaluate(send, "!document.querySelector('#render-recovery').hidden"), 'real context loss overlay');
    const lost = await inspect();
    assert.ok(!lost.ready && lost.recoveryVisible && lost.reloadInViewport);
    assert.match(lost.recoveryText, /Reload if it stays paused/);
    await capture(send, 'graphics-lost');
    await evaluate(send, 'window.__graphicsQaExtension.restoreContext(); true');
    await waitFor(() => evaluate(send, "document.querySelector('#viewport').classList.contains('webgl-ready') && document.querySelector('#render-recovery').hidden"), 'real context restoration');
    const restored = await inspect();
    assert.ok(restored.ready && !restored.recoveryVisible);
    await capture(send, 'graphics-restored');

    const result = {
      candidateHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      browser: 'local headless Chrome with SwiftShader',
      desktop, zoomEquivalent, narrow, lost, restored,
      captures: ['desktop-running.png', 'zoom-equivalent-running.png', 'narrow-running.png',
        'graphics-lost.png', 'graphics-restored.png']
    };
    fs.writeFileSync(path.join(outputPath, 'report.json'), `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ outputPath, ...result }, null, 2)}\n`);
  } finally {
    browser?.socket.close();
    chrome.kill();
    await app.close();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

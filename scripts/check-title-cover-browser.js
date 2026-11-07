// check-title-cover-browser.js
// Why: Exercise the approved cover and room form in a real local browser on the exact source revision.
// Scope: Local headless Chrome only. Captures omit the room state and stay outside Git.

'use strict';

const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createGameServer } = require('../server/server');

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputPath = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'dungeon-cover-browser'));
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), 'dungeon-cover-profile-'));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, label) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const value = await check();
    if (value) return value;
    await delay(125);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const pausedRequests = [];
  let nextId = 0;
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === 'Fetch.requestPaused') pausedRequests.push(message.params.requestId);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  return {
    socket,
    pausedRequests,
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
    await send('Network.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*socket.io/socket.io.js*' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url });
    const pausedScript = await waitFor(() => browser.pausedRequests.shift(), 'paused Socket.IO startup script');
    const loading = await evaluate(send, `({
      label: document.querySelector('#connection-label')?.textContent,
      coverVisible: getComputedStyle(document.querySelector('#title-cover')).display !== 'none',
      formVisible: !document.querySelector('#gate').hidden
    })`);
    assert.deepEqual(loading, { label: 'CONNECTING', coverVisible: true, formVisible: true });
    await capture(send, 'desktop-loading');
    await send('Fetch.continueRequest', { requestId: pausedScript });
    await send('Fetch.disable');
    await waitFor(() => evaluate(send, "document.querySelector('#connection-label')?.textContent === 'CONNECTED'"), 'connected desktop page');

    const inspect = () => evaluate(send, `(() => {
      const cover = document.querySelector('#title-cover');
      const form = document.querySelector('#room-form');
      const panel = document.querySelector('#gate');
      const rect = cover.getBoundingClientRect();
      const formRect = form.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      return {
        width: innerWidth, height: innerHeight,
        imageLoaded: cover.complete && cover.naturalWidth > 0,
        imageVisible: getComputedStyle(cover).display !== 'none' && rect.width > 0 && rect.height > 0,
        visibleCoverHeight: Math.max(0, Math.min(rect.bottom, panelRect.top) - Math.max(rect.top, 0)),
        formUsable: formRect.width > 200 && formRect.left >= 0 && formRect.right <= innerWidth &&
          getComputedStyle(panel).display !== 'none',
        connected: document.querySelector('#connection-label').textContent === 'CONNECTED'
      };
    })()`);

    const desktop = await inspect();
    assert.ok(desktop.imageLoaded && desktop.imageVisible && desktop.formUsable && desktop.connected);
    await capture(send, 'desktop-entry');

    await evaluate(send, `(() => {
      const name = document.querySelector('#display-name');
      name.value = 'Cover QA';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#create-room').click();
    })()`);
    await waitFor(() => evaluate(send, "document.documentElement.classList.contains('in-room')"), 'created room');
    assert.equal(await evaluate(send, "getComputedStyle(document.querySelector('#title-cover')).display"), 'none');
    const roomCode = await evaluate(send, "document.querySelector('#room-label').textContent");
    await evaluate(send, "document.querySelector('#leave-room').click()");
    await waitFor(() => evaluate(send, "!document.documentElement.classList.contains('in-room')"), 'left room');
    assert.equal((await inspect()).imageVisible, true);
    await evaluate(send, `(() => {
      const code = document.querySelector('#room-code');
      code.value = ${JSON.stringify(roomCode)};
      code.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#join-room').click();
    })()`);
    await waitFor(() => evaluate(send, "document.documentElement.classList.contains('in-room')"), 'rejoined room');
    assert.equal(await evaluate(send, "getComputedStyle(document.querySelector('#title-cover')).display"), 'none');
    await evaluate(send, "document.querySelector('#leave-room').click()");
    await waitFor(() => evaluate(send, "!document.documentElement.classList.contains('in-room')"), 'left rejoined room');
    assert.equal((await inspect()).imageVisible, true);

    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
      screenWidth: 390, screenHeight: 844 });
    await delay(350);
    const phone = await inspect();
    assert.ok(phone.imageLoaded && phone.imageVisible && phone.formUsable && phone.connected);
    assert.ok(phone.visibleCoverHeight >= 100, 'cover should be visible above the phone form');
    await capture(send, 'phone-entry');

    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Network.setBlockedURLs', { urls: ['*cdn.jsdelivr.net*'] });
    await send('Page.reload', { ignoreCache: true });
    await waitFor(() => evaluate(send, "document.querySelector('#connection-label')?.textContent === 'STARTUP ERROR'"), 'blocked CDN failure');
    const failure = await evaluate(send, `({
      label: document.querySelector('#connection-label').textContent,
      helpVisible: !document.querySelector('#launch-help').hidden,
      errorText: document.querySelector('#launch-message').textContent,
      coverVisible: getComputedStyle(document.querySelector('#title-cover')).display !== 'none'
    })`);
    assert.ok(failure.helpVisible && failure.coverVisible && /Three\.js CDN/.test(failure.errorText));
    await capture(send, 'phone-startup-failure');

    const result = { candidateHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      browser: 'headless Chrome with SwiftShader', loading, desktop, phone,
      roomTransition: 'create and join hid cover; leave restored cover',
      blockedCdn: { label: failure.label, helpVisible: failure.helpVisible, coverVisible: failure.coverVisible },
      captures: ['desktop-loading.png', 'desktop-entry.png', 'phone-entry.png', 'phone-startup-failure.png'] };
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

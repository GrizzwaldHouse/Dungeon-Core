'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { createGameServer } = require('../server/server');

const output = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'dungeon-browser-gameplay'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (value, label) => assert.ok(value, label);

function observeSnapshots() {
  const NativeSocket = window.WebSocket;
  window.__gameQaMovement = {};
  window.WebSocket = class extends NativeSocket {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        const frame = String(event.data);
        if (!frame.startsWith('42')) return;
        try {
          const [type, data] = JSON.parse(frame.slice(2));
          if (type !== 'room:snapshot') return;
          window.__gameQaSnapshot = data;
          for (const [id, player] of Object.entries(data.players)) {
            const p = player.transform.position;
            const record = window.__gameQaMovement[id] ||= { x: p.x, z: p.z, distance: 0 };
            record.distance = Math.max(record.distance, Math.hypot(p.x - record.x, p.z - record.z));
          }
        } catch {}
      });
    }
  };
}

async function snapshot(page) {
  return page.evaluate(() => window.__gameQaSnapshot);
}
async function waitFor(checkValue, label, attempts = 160) {
  for (let index = 0; index < attempts; index++) {
    if (await checkValue()) return;
    await delay(125);
  }
  throw new Error(label);
}
async function hold(page, key, milliseconds) {
  await page.locator('#viewport').focus();
  await page.keyboard.down(key);
  try { await delay(milliseconds); } finally { await page.keyboard.up(key); }
}
function player(state, name) {
  return Object.values(state.players).find(value => value.displayName === name);
}
async function screenshot(page, name) {
  // Hide the live locator before retaining any screenshots.
  await page.addStyleTag({ content: '#room-label, #room-code { visibility: hidden !important; }' });
  await page.screenshot({ path: path.join(output, name + '.png') });
}
async function run() {
  fs.mkdirSync(output, { recursive: true });
  const errors = [];
  const hardware = process.env.QA_HARDWARE === '1';
  const app = process.env.DUNGEON_QA_ORIGIN ? null : createGameServer({ host: '127.0.0.1', port: 0 });
  if (app) await app.listen();
  const origin = process.env.DUNGEON_QA_ORIGIN || 'http://127.0.0.1:' + app.httpServer.address().port;
  let browser;
  const contexts = [];
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: process.env.QA_VISIBLE !== '1',
      args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
        ...(hardware ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])]
    });
    const pages = [];
    for (const name of ['Browser Host', 'Browser Peer']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      contexts.push(context);
      await context.addInitScript(observeSnapshots);
      const page = await context.newPage();
      page.on('pageerror', () => errors.push('browser-runtime-error'));
      await page.goto(origin + (process.env.QA_BRIGHTFORGE === '1' ? '/?assets=brightforge' : '/'));
      await page.waitForFunction(() => document.querySelector('#connection-label')?.textContent === 'CONNECTED');
      await page.locator('#display-name').fill(name);
      pages.push(page);
    }
    const [host, peer] = pages;
    await host.locator('#create-room').click();
    await waitFor(async () => Boolean(await snapshot(host)), 'host-room-snapshot');
    const code = (await snapshot(host)).roomCode;
    await peer.locator('#room-code').fill(code);
    await peer.locator('#join-room').click();
    await waitFor(async () => Object.keys((await snapshot(host)).players).length === 2, 'two-player-roster');
    await host.locator('#start-room').click();
    for (const page of pages) {
      await page.waitForFunction(() => document.querySelector('#viewport')?.classList.contains('webgl-ready') &&
        document.documentElement.classList.contains('is-running'));
    }
    if (process.env.QA_BRIGHTFORGE === '1') {
      for (const page of pages) await page.waitForFunction(() => document.querySelector('#viewport').dataset.brightforgeState === 'ready' && Number(document.querySelector('#viewport').dataset.brightforgeCount) === 2);
    }
    const render = await Promise.all(pages.map(page => page.evaluate(() => {
      const canvas = document.querySelector('#viewport canvas');
      const gl = canvas.getContext('webgl2');
      return { width: canvas.width, height: canvas.height, webgl: Boolean(gl),
        contextLost: gl.isContextLost(), renderer: gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL) };
    })));
    check(render.every(value => value.webgl && value.width > 0 && value.height > 0 && !value.contextLost), 'rendered-canvas');
    for (const [page, name] of [[host, 'Browser Host'], [peer, 'Browser Peer']]) {
      const before = player(await snapshot(page), name).transform.position;
      await page.bringToFront();
      await hold(page, 'd', 600);
      await waitFor(async () => player(await snapshot(page), name).transform.position.x > before.x + 0.4, 'keyboard-movement');
      const other = page === host ? peer : host;
      const after = player(await snapshot(page), name).transform.position;
      await waitFor(async () => Math.abs(player(await snapshot(other), name).transform.position.x - after.x) < 0.3,
        'replicated-movement');
    }
    await host.bringToFront();
    const first = Object.values((await snapshot(host)).enemies)[0];
    check(first?.health.current > 0, 'live-sentinel');
    await host.locator('#viewport').focus();
    await host.keyboard.press('Space');
    await delay(200);
    check(Object.values((await snapshot(host)).enemies)[0].health.current === first.health.current, 'far-strike-rejected');
    let inRange = false;
    for (let index = 0; index < 65; index++) {
      const state = await snapshot(host);
      const local = player(state, 'Browser Host');
      const enemy = Object.values(state.enemies).find(value => value.health.current > 0);
      check(local.health.current > 0 && enemy, 'combatants-alive');
      const a = local.transform.position, b = enemy.transform.position;
      if (Math.hypot(a.x - b.x, a.z - b.z) < 1.9) { inRange = true; break; }
      const key = Math.abs(b.x-a.x) > Math.abs(b.z-a.z) ? (b.x>a.x?'d':'a') : (b.z>a.z?'s':'w');
      await hold(host, key, 120);
    }
    check(inRange, 'navigate-to-sentinel');
    const beforeAttack = Object.values((await snapshot(host)).enemies)[0].health.current;
    await host.locator('#viewport').focus();
    await host.keyboard.press('Space');
    await host.keyboard.press('Space');
    await waitFor(async () => Object.values((await snapshot(host)).enemies)[0].health.current < beforeAttack, 'valid-melee-damage');
    const health = Object.values((await snapshot(host)).enemies)[0].health.current;
    await waitFor(async () => Object.values((await snapshot(peer)).enemies)[0].health.current === health, 'replicated-enemy-health');
    check(beforeAttack - health === 20, 'attack-cooldown');
    await screenshot(host, 'host-combat');
    await screenshot(peer, 'peer-combat');
    const peerId = player(await snapshot(peer), 'Browser Peer').playerId;
    await peer.reload();
    await waitFor(async () => {
      const state = await snapshot(peer);
      return state?.phase === 'RUNNING' && state.players[peerId]?.connection === 'CONNECTED';
    }, 'browser-rejoin');
    if (process.env.QA_BRIGHTFORGE === '1') {
      const recovery = await browser.newContext();
      contexts.push(recovery);
      await recovery.route('**/assets/brightforge/*/candidate.glb', route => route.fulfill({ status: 200, body: 'invalid mesh' }));
      const review = await recovery.newPage();
      await review.goto(origin + '/?assets=brightforge');
      await review.waitForFunction(() => document.querySelector('#viewport').dataset.brightforgeState === 'failed' && document.querySelector('#viewport').classList.contains('webgl-ready'));
    }
    check(errors.length === 0, 'browser-runtime-errors');
    const result = { status: 'passed', scope: 'two-browser-automation', hardware,
      rendering: render, movement: 'both-controls-and-replication', combat: 'range-damage-replication-cooldown',
      reload: 'same-player-rejoined', brightforge: process.env.QA_BRIGHTFORGE === '1' ? 'two-loaded-hash-verified-models' : 'disabled', humanAcceptance: 'pending' };
    fs.writeFileSync(path.join(output, 'gameplay-report.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } finally {
    for (const context of contexts) await context.close();
    if (browser) await browser.close();
    if (app) await app.close();
  }
}
module.exports = { snapshot, waitFor, hold, player, screenshot, observeSnapshots };
if (require.main === module) run().catch((error) => {
  const stage = /^[a-z0-9-]+$/.test(error.message) ? error.message : 'browser-action-or-assertion';
  console.error(JSON.stringify({ status: 'failed', stage }));
  process.exitCode = 1;
});

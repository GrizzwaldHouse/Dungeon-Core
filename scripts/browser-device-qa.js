'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { snapshot, waitFor, hold, player, screenshot, observeSnapshots } = require('./check-gameplay-browser');

const hash = value => createHash('sha256').update(value).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const marker = run => hash(run + '/' + os.hostname().toLowerCase()).slice(0, 12);
const check = (condition, stage) => assert.ok(condition, stage);
async function run() {
  const role = process.env.QA_BROWSER_ROLE;
  check(process.env.QA_HUMAN_REVIEW !== '1' || process.env.QA_VISIBLE === '1', 'human-review-needs-visible-browser');
  check(['host', 'peer'].includes(role), 'set-browser-role');
  const ticketFile = process.env.QA_JOIN_FILE, receiptFile = process.env.QA_RECEIPT_FILE;
  check(ticketFile && receiptFile && !fs.existsSync(receiptFile), 'set-new-private-file-paths');
  const origin = new URL(process.env.DUNGEON_QA_ORIGIN);
  check(['https:', 'http:'].includes(origin.protocol) && !origin.username && !origin.password, 'invalid-origin');
  let ticket = role === 'peer' ? JSON.parse(fs.readFileSync(ticketFile, 'utf8').replace(/^\uFEFF/, '')) : null;
  if (ticket) check(ticket.expires > Date.now() && marker(ticket.run) !== ticket.host, 'fresh-second-device-ticket-required');
  const name = role === 'host' ? 'Browser Host' : 'Browser Peer';
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: process.env.QA_VISIBLE !== '1',
    args: ['--disable-renderer-backgrounding', ...(process.env.QA_HARDWARE === '1' ? [] :
      ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])]
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(observeSnapshots);
    const page = await context.newPage();
    let errors = 0;
    page.on('pageerror', () => errors++);
    const health = await context.request.get(origin.origin + '/healthz');
    check(health.ok(), 'health-check');
    const healthBody = await health.json();
    if (process.env.DUNGEON_QA_REVISION) check(healthBody.revision === process.env.DUNGEON_QA_REVISION, 'game-revision-mismatch');
    await page.goto(origin.origin + (process.env.QA_BRIGHTFORGE === '1' ? '/?assets=brightforge' : '/'));
    await page.waitForFunction(() => document.querySelector('#connection-label')?.textContent === 'CONNECTED');
    await page.locator('#display-name').fill(name);
    if (role === 'host') {
      check(!fs.existsSync(ticketFile), 'choose-new-ticket-path');
      await page.locator('#create-room').click();
      await waitFor(async () => Boolean(await snapshot(page)), 'created-room');
      const runId = randomUUID();
      ticket = { run: runId, host: marker(runId), room: (await snapshot(page)).roomCode,
        expires: Date.now() + 180000 };
      fs.writeFileSync(ticketFile, JSON.stringify(ticket), { flag: 'wx', mode: 0o600 });
      console.log(JSON.stringify({ status: 'waiting', stage: 'private-browser-peer' }));
      await waitFor(async () => Object.keys((await snapshot(page)).players).length === 2, 'browser-peer-timeout', 1440);
      await page.locator('#start-room').click();
    } else {
      await page.locator('#room-code').fill(ticket.room);
      await page.locator('#join-room').click();
    }
    await waitFor(async () => (await snapshot(page))?.phase === 'RUNNING', 'running-room', 1440);
    await page.waitForFunction(() => document.querySelector('#viewport')?.classList.contains('webgl-ready'));
    if (process.env.QA_BRIGHTFORGE === '1') await page.waitForFunction(() =>
      document.querySelector('#viewport').dataset.brightforgeState === 'ready' &&
      document.querySelector('#viewport').dataset.brightforgeCount === '2');
    if (process.env.QA_HUMAN_REVIEW === '1') {
      console.log(JSON.stringify({ status: 'ready', scope: 'human-review', role, acceptance: 'pending' }));
      await page.waitForEvent('close', { timeout: 0 });
      return;
    }
    await page.locator('#viewport').focus();
    const before = player(await snapshot(page), name).transform.position;
    await hold(page, 'd', 600);
    await waitFor(async () => player(await snapshot(page), name).transform.position.x > before.x + 0.4, 'local-keyboard-movement');
    const otherName = role === 'host' ? 'Browser Peer' : 'Browser Host';
    await waitFor(async () => {
      const other = player(await snapshot(page), otherName);
      return other && await page.evaluate(id => window.__gameQaMovement[id]?.distance > 0.4, other.playerId);
    }, 'remote-movement-replication');
    // Strike in order so each participant independently proves a valid hit.
    if (role === 'peer') await waitFor(async () =>
      Object.values((await snapshot(page)).enemies)[0]?.health.current <= 80, 'host-combat-replication');
    let reachable = false;
    for (let i = 0; i < 80; i++) {
      const state = await snapshot(page), local = player(state, name);
      const enemy = Object.values(state.enemies)[0];
      check(local.health.current > 0 && enemy?.health.current > 0, 'live-combatants');
      const a = local.transform.position, b = enemy.transform.position;
      if (Math.hypot(a.x-b.x, a.z-b.z) < 1.9) { reachable = true; break; }
      const key = Math.abs(b.x-a.x) > Math.abs(b.z-a.z) ? (b.x>a.x?'d':'a') : (b.z>a.z?'s':'w');
      await hold(page, key, 120);
    }
    check(reachable, 'sentinel-reachable');
    const previousDamage = player(await snapshot(page), name).metrics.damageDealt;
    await page.locator('#viewport').focus();
    await page.keyboard.press('Space');
    await waitFor(async () => player(await snapshot(page), name).metrics.damageDealt >= previousDamage + 20,
      'local-melee-damage');
    await waitFor(async () => Object.values((await snapshot(page)).enemies)[0].health.current <= 60,
      'both-melee-actions-replicated');
    check(errors === 0, 'browser-errors');
    fs.mkdirSync(path.resolve(process.argv[2]), { recursive: true });
    await screenshot(page, role + '-physical-combat');
    const state = await snapshot(page);
    const receipt = { status: 'observed', scope: 'two-device', role, run: ticket.run,
      session: hash(ticket.run + '/' + state.roomId), device: marker(ticket.run), phase: state.phase,
      connected: Object.values(state.players).filter(p => p.connection === 'CONNECTED').length,
      client: 'chrome-browser', rendering: 'webgl-ready', movement: 'local-and-remote',
      combat: 'both-players-dealt-damage', brightforge: process.env.QA_BRIGHTFORGE === '1' ? 'two-models-loaded' : 'disabled',
      humanAcceptance: 'pending' };
    fs.writeFileSync(receiptFile, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
    await delay(3000);
    console.log(JSON.stringify({ status: 'passed', scope: 'physical-browser-role', role,
      rendering: receipt.rendering, movement: receipt.movement, combat: receipt.combat }));
    if (process.env.QA_KEEP_OPEN === '1') await page.waitForEvent('close', { timeout: 0 });
  } finally { await browser.close(); }
}
run().catch(error => {
  const stage = /^[a-z0-9-]+$/.test(error.message) ? error.message : 'browser-action-or-runtime';
  console.error(JSON.stringify({ status: 'failed', stage }));
  process.exitCode = 1;
});

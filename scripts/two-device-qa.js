'use strict';

const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const { ProbeClient } = require('../tests/socket-client');

const timeoutMs = 180000;
const modes = ['host', 'peer', 'rehearse', 'verify', 'serve'];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const machine = (run) => hash(run + '/' + os.hostname().toLowerCase()).slice(0, 12);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

function check(condition, reason) {
  if (!condition) throw new QaError(reason);
}
class QaError extends Error {}

function configuredOrigin() {
  let url;
  try { url = new URL(process.env.DUNGEON_QA_ORIGIN); } catch { throw new QaError('set-private-game-origin'); }
  check(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password &&
    url.pathname === '/' && !url.search && !url.hash, 'expected-game-origin-only');
  return url.origin;
}

async function connect(origin) {
  let response;
  try {
    response = await fetch(origin + '/healthz', { redirect: 'error', signal: AbortSignal.timeout(5000) });
    check(response.ok, 'game-health-http');
    const data = await response.json();
    check(data.ok === true && Number.isInteger(data.tickHz) && data.tickHz > 0, 'unexpected-game-health');
    if (process.env.DUNGEON_QA_REVISION) {
      check(data.revision === process.env.DUNGEON_QA_REVISION, 'game-revision-mismatch-or-missing');
    }
  } catch (error) { throw error instanceof QaError ? error : new QaError('game-health-unreachable-or-invalid'); }
  const client = new ProbeClient(origin);
  try { await client.ready; } catch { client.close(); throw new QaError('socket-handshake'); }
  return client;
}

async function rpc(client, event, payload) {
  try {
    const result = await client.rpc(event, payload);
    check(result?.ok === true, event + '-rejected');
    return result;
  } catch (error) { throw error instanceof QaError ? error : new QaError(event + '-ack'); }
}

function observe(client, predicate, stage) {
  return new Promise((resolve, reject) => {
    const finish = (snapshot) => {
      clearTimeout(timer);
      off();
      client.ws.removeEventListener('close', closed);
      if (snapshot) resolve(snapshot);
      else reject(new QaError(stage));
    };
    const closed = () => finish();
    const timer = setTimeout(closed, timeoutMs);
    const off = client.on('room:snapshot', snapshot => {
      if (predicate(snapshot)) finish(snapshot);
    });
    client.ws.addEventListener('close', closed, { once: true });
  });
}

function pair(snapshot, ticket, ownRole, ownMachine, rehearsal) {
  if (snapshot.roomCode !== ticket.room || !snapshot.roomId) return false;
  const roster = Object.values(snapshot.players);
  if (roster.length !== 2 || !roster.every(p => p.connection === 'CONNECTED')) return false;
  const leader = roster.find(p => p.playerId === snapshot.hostPlayerId);
  const guest = roster.find(p => p !== leader);
  if (leader?.displayName !== 'H' + ticket.host || !/^P[a-f0-9]{12}$/.test(guest?.displayName)) return false;
  const guestMachine = guest.displayName.slice(1);
  return (rehearsal || guestMachine !== ticket.host) &&
    (ownRole === 'host' ? ownMachine === ticket.host : ownMachine === guestMachine);
}

function receipt(role, ticket, snapshot, rehearsal) {
  return { status: 'observed', scope: rehearsal ? 'local-rehearsal' : 'two-device',
    role, run: ticket.run, session: hash(ticket.run + '/' + snapshot.roomId),
    device: machine(ticket.run), phase: snapshot.phase, connected: 2 };
}

async function host(origin, deliver, rehearsal) {
  const client = await connect(origin);
  try {
    const run = randomUUID();
    const id = machine(run);
    const created = await rpc(client, 'room:create', { displayName: 'H' + id });
    const ticket = { run, host: id, room: created.roomCode, expires: Date.now() + timeoutMs };
    await Promise.all([
      observe(client, s => s.phase === 'LOBBY' && pair(s, ticket, 'host', id, rehearsal), 'waiting-for-peer'),
      Promise.resolve().then(() => deliver(ticket))
    ]);
    const [snapshot] = await Promise.all([
      observe(client, s => s.phase === 'RUNNING' && pair(s, ticket, 'host', id, rehearsal), 'host-running-snapshot'),
      rpc(client, 'room:start')
    ]);
    return receipt('host', ticket, snapshot, rehearsal);
  } finally { client.close(); }
}

async function peer(origin, ticket, rehearsal) {
  check(ticket && uuid.test(ticket.run) && /^[a-f0-9]{12}$/.test(ticket.host) &&
    /^[A-HJ-NP-Z2-9]{4}$/.test(ticket.room) && Number.isSafeInteger(ticket.expires), 'invalid-handoff');
  check(ticket.expires > Date.now(), 'handoff-expired');
  const id = machine(ticket.run);
  check(rehearsal || id !== ticket.host, 'peer-must-run-on-second-computer');
  const client = await connect(origin);
  try {
    const [snapshot] = await Promise.all([
      observe(client, s => s.phase === 'RUNNING' && pair(s, ticket, 'peer', id, rehearsal), 'peer-running-snapshot'),
      rpc(client, 'room:join', { roomCode: ticket.room, displayName: 'P' + id })
    ]);
    return receipt('peer', ticket, snapshot, rehearsal);
  } finally { client.close(); }
}

function verify(hostReport, peerReport, rehearsal) {
  const scope = rehearsal ? 'local-rehearsal' : 'two-device';
  for (const [role, report] of [['host', hostReport], ['peer', peerReport]]) {
    check(report?.status === 'observed' && report.role === role && report.scope === scope &&
      uuid.test(report.run) && /^[a-f0-9]{64}$/.test(report.session) && /^[a-f0-9]{12}$/.test(report.device) &&
      report.phase === 'RUNNING' && report.connected === 2, 'invalid-role-receipt');
  }
  check(hostReport.run === peerReport.run && hostReport.session === peerReport.session, 'session-mismatch');
  check(rehearsal || hostReport.device !== peerReport.device, 'duplicate-device');
  return { status: 'passed', scope, run: hostReport.run, phase: 'RUNNING', connected: 2 };
}

async function serve() {
  const port = Number(process.env.DUNGEON_QA_PORT || 3001);
  check(Number.isInteger(port) && port > 0 && port < 65536, 'invalid-local-port');
  const app = require('../server/server').createGameServer({ host: '127.0.0.1', port });
  // The game server emits listen errors on its HTTP server.
  await Promise.race([
    app.listen(),
    new Promise((_, reject) => app.httpServer.once('error', () => reject(new QaError('game-listener-unavailable'))))
  ]);
  console.log(JSON.stringify({ status: 'ready', scope: 'loopback-server', port }));
  await new Promise(resolve => {
    process.once('SIGINT', resolve);
    process.once('SIGTERM', resolve);
  });
  await app.close();
  return { status: 'stopped', scope: 'loopback-server' };
}

async function rehearse() {
  const app = require('../server/server').createGameServer({ host: '127.0.0.1', port: 0 });
  await app.listen();
  try {
    const origin = 'http://127.0.0.1:' + app.httpServer.address().port;
    const handoff = Promise.withResolvers();
    const [leader, guest] = await Promise.all([
      host(origin, handoff.resolve, true),
      handoff.promise.then(ticket => peer(origin, ticket, true))
    ]);
    return verify(leader, guest, true);
  } finally { await app.close(); }
}

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function write(file, value) {
  fs.writeFileSync(file, JSON.stringify(value) + '\n', { flag: 'wx', mode: 0o600 });
}

async function main() {
  const [mode, first, second] = process.argv.slice(2);
  check(modes.includes(mode), 'use-serve-host-peer-rehearse-or-verify');
  if (mode === 'serve') return serve();
  if (mode === 'rehearse') return rehearse();
  check(first && second && first !== second, 'supply-two-distinct-file-paths');
  if (mode === 'verify') return verify(read(first), read(second), false);
  check(!fs.existsSync(second), 'choose-a-new-receipt-path');
  const origin = configuredOrigin();
  const result = mode === 'host'
    ? await host(origin, ticket => write(first, ticket), false)
    : await peer(origin, read(first), false);
  write(second, result);
  return result;
}

main().then(result => {
  process.stdout.write(JSON.stringify(result) + '\n');
}, error => {
  const stage = error instanceof QaError ? error.message : 'file-or-runtime-error';
  process.stderr.write(JSON.stringify({ status: 'failed', stage }) + '\n');
  process.exitCode = 1;
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const { createGameServer } = require('../server/server');
const { createServerConfig } = require('../server/config/game-parameters');
const { ProbeClient } = require('./socket-client');

async function fixture(t, overrides = {}) {
  const app = createGameServer({ host: '127.0.0.1', port: 0, ...overrides });
  const clients = [];
  t.after(async () => { clients.forEach((client) => client.close()); await app.close(); });
  await app.listen();
  const url = `http://127.0.0.1:${app.httpServer.address().port}`;
  async function client() {
    const probe = new ProbeClient(url);
    clients.push(probe);
    await probe.ready;
    return probe;
  }
  return { app, url, client };
}

function handshake(url, { origin, websocket = false, forwardedHost, sessionId, returnSession = false } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (origin !== undefined) headers.Origin = origin;
    if (forwardedHost) headers['X-Forwarded-Host'] = forwardedHost;
    if (websocket) Object.assign(headers, { Upgrade: 'websocket', Connection: 'Upgrade',
      'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'), 'Sec-WebSocket-Version': '13' });
    const request = http.get(`${url}/socket.io/?EIO=4&transport=${websocket ? 'websocket' : 'polling'}${sessionId ? `&sid=${encodeURIComponent(sessionId)}` : ''}`, { headers });
    request.on('response', (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (part) => { body += part; });
      response.on('end', () => {
        const expectedRejection = sessionId ? /Bad request|"code":3/i.test(body) : body.includes('Forbidden');
        if (response.statusCode >= 400 && !expectedRejection) return reject(new Error('Handshake failed before the intended boundary'));
        if (returnSession) return resolve(JSON.parse(body.slice(1)).sid);
        resolve(response.statusCode);
      });
    });
    request.on('upgrade', (response, socket) => { socket.destroy(); resolve(response.statusCode); });
    request.on('error', reject);
  });
}

test('create/join/rejoin share a per-socket attempt budget and recover after the window', async (t) => {
  const { app, client } = await fixture(t, { roomAttemptsPerSocket: 3, roomAttemptWindowMs: 1000 });
  const probe = await client();
  await probe.rpc('room:create', {});
  await probe.rpc('room:join', {});
  await probe.rpc('room:rejoin', {});
  assert.equal((await probe.rpc('room:create', { displayName: 'Limited' })).error, 'ROOM_ATTEMPT_LIMIT');
  assert.equal(app.getRoomCount(), 0);
  assert.equal(app.getMetrics().publicBoundaryRejections.roomAttempts, 1);
  const fresh = await client();
  assert.equal((await fresh.rpc('room:create', { displayName: 'Independent' })).ok, true);
  await delay(1050);
  assert.equal((await probe.rpc('room:create', { displayName: 'Recovered' })).ok, true);
  assert.equal(app.getRoomCount(), 2);
});

test('aggregate attempts survive socket replacement and reject before allocation', async (t) => {
  const { app, client } = await fixture(t, { roomAttemptsGlobal: 2 });
  const first = await client();
  const second = await client();
  await first.rpc('room:join', {});
  await second.rpc('room:rejoin', {});
  first.close();
  const third = await client();
  assert.equal((await third.rpc('room:create', { displayName: 'Aggregate' })).error, 'SERVER_ATTEMPT_LIMIT');
  assert.equal(app.getRoomCount(), 0);
});

test('room capacity bounds live room allocation independently of the attempt budget', async (t) => {
  const { app, client } = await fixture(t, { maxRooms: 1 });
  const first = await client();
  const second = await client();
  assert.equal((await first.rpc('room:create', { displayName: 'First' })).ok, true);
  assert.equal((await second.rpc('room:create', { displayName: 'Second' })).error, 'SERVER_ROOM_CAPACITY');
  assert.equal(app.getRoomCount(), 1);
  assert.equal(app.getMetrics().publicBoundaryRejections.roomCapacity, 1);
});

test('explicit origin allowlist gates polling and websocket upgrades, preserving native probes', async (t) => {
  const { url, client } = await fixture(t, { corsOrigin: 'https://game.example' });
  for (const websocket of [false, true]) {
    assert.equal(await handshake(url, { origin: 'https://game.example', websocket }), websocket ? 101 : 200);
    // Engine.IO returns 400/Forbidden for denied upgrades, and 403 for polling.
    assert.equal(await handshake(url, { origin: 'https://untrusted.example', websocket }), websocket ? 400 : 403);
    assert.equal(await handshake(url, { origin: 'null', websocket }), websocket ? 400 : 403);
    assert.equal(await handshake(url, { origin: url, websocket }), websocket ? 400 : 403, 'explicit deployment origin excludes other hosts');
  }
  const native = await client();
  assert.equal((await native.rpc('room:create', { displayName: 'Native' })).ok, true);
});

test('local wildcard mode means same-host browser access and never trusts forwarded host', async (t) => {
  const { url } = await fixture(t, { corsOrigin: '*' });
  for (const websocket of [false, true]) {
    assert.equal(await handshake(url, { origin: url, websocket }), websocket ? 101 : 200);
    assert.equal(await handshake(url, { origin: 'https://untrusted.example', forwardedHost: 'untrusted.example', websocket }), websocket ? 400 : 403);
  }
});

test('connection capacity rejects additional polling and websocket handshakes', async (t) => {
  const { url, client } = await fixture(t, { maxConnections: 2 });
  await client();
  await client();
  assert.equal(await handshake(url), 403);
  assert.equal(await handshake(url, { websocket: true }), 400);
});

test('existing session IDs cannot bypass polling or websocket origin validation', async (t) => {
  const { url } = await fixture(t, { corsOrigin: 'https://game.example' });
  const sessionId = await handshake(url, { origin: 'https://game.example', returnSession: true });
  assert.equal(typeof sessionId, 'string');
  assert.equal(await handshake(url, { origin: 'https://untrusted.example', sessionId }), 400);
  assert.equal(await handshake(url, { origin: 'https://untrusted.example', sessionId, websocket: true }), 400);
  assert.equal(await handshake(url, { origin: 'https://game.example', sessionId, websocket: true }), 101);
});

test('public bounds reject invalid configuration and Render origin supplies an exact deployment default', () => {
  assert.throws(() => createServerConfig({ maxRooms: 0 }), /maxRooms/);
  assert.throws(() => createServerConfig({ roomAttemptsPerSocket: 0 }), /roomAttemptsPerSocket/);
  assert.throws(() => createGameServer({ corsOrigin: 'https://game.example/path' }), /corsOrigin/);
  assert.throws(() => createGameServer({ corsOrigin: ['*', 'https://game.example'] }), /wildcard/);
  const originalCors = process.env.CORS_ORIGIN;
  const originalRender = process.env.RENDER_EXTERNAL_URL;
  try {
    delete process.env.CORS_ORIGIN;
    process.env.RENDER_EXTERNAL_URL = 'https://demo.example';
    assert.equal(createServerConfig().corsOrigin, 'https://demo.example');
    process.env.CORS_ORIGIN = 'https://custom.example';
    assert.equal(createServerConfig().corsOrigin, 'https://custom.example');
  } finally {
    if (originalCors === undefined) delete process.env.CORS_ORIGIN; else process.env.CORS_ORIGIN = originalCors;
    if (originalRender === undefined) delete process.env.RENDER_EXTERNAL_URL; else process.env.RENDER_EXTERNAL_URL = originalRender;
  }
});

'use strict';

// Local diagnostic worker: keep server allocations separate from WebSocket probes.
const { createGameServer } = require('../server/server');
const app = createGameServer({ host: '127.0.0.1', port: 0 });
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await app.close();
  process.exit(0);
}
process.on('disconnect', close);
process.on('message', async ({ id, command }) => {
  if (command === 'sample') process.send({ id, sample: { usage: process.memoryUsage(), metrics: app.getMetrics(), rooms: app.getRoomCount() } });
  if (command === 'close') await close();
});
app.listen().then(() => process.send({ ready: true, port: app.httpServer.address().port, tickHz: app.config.tickHz, disconnectGraceMs: app.config.disconnectGraceMs }))
  .catch(() => { process.stderr.write('Measurement server failed to listen\n'); process.exit(1); });

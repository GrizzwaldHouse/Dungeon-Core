// static-client.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Serve the browser client from the same local origin as the game socket.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const clientRoot = path.resolve(__dirname, '..', 'client');
const sharedRoot = path.resolve(__dirname, '..', 'shared');
const files = new Map([
  ['/', [path.join(clientRoot, 'index.html'), 'text/html; charset=utf-8']],
  ['/index.html', [path.join(clientRoot, 'index.html'), 'text/html; charset=utf-8']],
  ['/app.js', [path.join(clientRoot, 'app.js'), 'text/javascript; charset=utf-8']],
  ['/network.js', [path.join(clientRoot, 'network.js'), 'text/javascript; charset=utf-8']],
  ['/render.js', [path.join(clientRoot, 'render.js'), 'text/javascript; charset=utf-8']],
  ['/touch-controls.js', [path.join(clientRoot, 'touch-controls.js'), 'text/javascript; charset=utf-8']],
  ['/audio.js', [path.join(clientRoot, 'audio.js'), 'text/javascript; charset=utf-8']],
  ['/styles.css', [path.join(clientRoot, 'styles.css'), 'text/css; charset=utf-8']],
  ['/dungeon-layout.js', [path.join(sharedRoot, 'dungeon-layout.js'), 'text/javascript; charset=utf-8']]
]);

function serveClient(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' });
    response.end();
    return;
  }
  let pathname;
  try { pathname = new URL(request.url, 'http://localhost').pathname; } catch { pathname = ''; }
  const entry = files.get(pathname);
  if (!entry) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  const [file, contentType] = entry;
  fs.readFile(file, (error, body) => {
    if (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Client asset unavailable');
      return;
    }
    response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
}

module.exports = { serveClient };

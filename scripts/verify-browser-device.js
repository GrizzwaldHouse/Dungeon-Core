'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

try {
  const files = process.argv.slice(2);
  if (files.length !== 2) throw new Error('supply-two-browser-receipts');
  for (const file of files) {
    const receipt = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    if (receipt.client !== 'chrome-browser' || receipt.rendering !== 'webgl-ready' ||
      receipt.movement !== 'local-and-remote' || receipt.combat !== 'both-players-dealt-damage' ||
      receipt.brightforge !== 'two-models-loaded' || receipt.humanAcceptance !== 'pending') {
      throw new Error('browser-gameplay-evidence-missing');
    }
  }
  const result = spawnSync(process.execPath, [path.join(__dirname, 'two-device-qa.js'), 'verify', ...files],
    { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('independent-browser-receipts-mismatch');
  const verification = JSON.parse(result.stdout);
  console.log(JSON.stringify({ ...verification, scope: 'two-device-browser-gameplay',
    rendering: 'passed', movement: 'passed', combat: 'passed', brightforge: 'passed', humanAcceptance: 'pending' }));
} catch (error) {
  const stage = /^[a-z0-9-]+$/.test(error.message) ? error.message : 'receipt-file-error';
  console.error(JSON.stringify({ status: 'failed', stage }));
  process.exitCode = 1;
}

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { inspectGlb } = require('../scripts/import-brightforge');

function glb(json) {
  const content = Buffer.from(JSON.stringify(json).padEnd(Math.ceil(JSON.stringify(json).length / 4) * 4));
  const bytes = Buffer.alloc(20 + content.length);
  bytes.write('glTF');
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(content.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  content.copy(bytes, 20);
  return bytes;
}
test('GLB importer rejects external resources and malformed sizes', () => {
  const bytes = glb({ asset: { version: '2.0' } });
  assert.doesNotThrow(() => inspectGlb(bytes));
  assert.throws(() => inspectGlb(glb({ asset: { version: '2.0' }, images: [{ uri: '../private.png' }] })), /embedded/);
  assert.throws(() => inspectGlb(bytes.subarray(0, bytes.length - 1)), /size/);
});
test('candidate import is atomic, verifies hashes and preserves a previous import', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brightforge-import-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.copyFileSync(path.join(__dirname, '../scripts/import-brightforge.js'), path.join(root, 'scripts/import-brightforge.js'));
  const source = path.join(root, 'source');
  const asset = path.join(source, 'test-prop');
  fs.mkdirSync(asset, { recursive: true });
  const bytes = glb({ asset: { version: '2.0' } });
  const manifest = { schemaVersion: 1, assetId: 'test-prop', status: 'REVIEW_CANDIDATE',
    quality: { face_count: 1 }, artifacts: [{ file: 'candidate.glb', bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex') }] };
  for (const file of ['EXPORT_CONTRACT.md', 'PROVENANCE.md']) fs.writeFileSync(path.join(source, file), 'Test fixture');
  fs.writeFileSync(path.join(asset, 'candidate.glb'), bytes);
  const manifestFile = path.join(asset, 'manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, artifacts: [{ ...manifest.artifacts[0], sha256: '0'.repeat(64) }] }));
  const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/import-brightforge.js'), source], { encoding: 'utf8' });
  const destination = path.join(root, 'client/assets/brightforge');
  assert.equal(run().status, 1);
  assert.equal(fs.existsSync(destination), false);
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  assert.equal(run().status, 0);
  const saved = fs.readFileSync(path.join(destination, 'scene.json'));
  assert.equal(run().status, 1);
  assert.deepEqual(fs.readFileSync(path.join(destination, 'scene.json')), saved);
});

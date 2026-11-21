'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function check(condition, message) {
  if (!condition) throw new Error(message);
}
function inspectGlb(bytes) {
  check(bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'glTF', 'Invalid GLB header');
  check(bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'Invalid GLB version or size');
  check(bytes.readUInt32LE(16) === 0x4e4f534a, 'Missing GLB JSON chunk');
  const size = bytes.readUInt32LE(12);
  check(size <= bytes.length - 20, 'Truncated GLB JSON');
  const document = JSON.parse(bytes.toString('utf8', 20, 20 + size));
  check(document.asset?.version === '2.0', 'Expected glTF 2.0');
  for (const resource of [...(document.buffers || []), ...(document.images || [])]) {
    check(!resource.uri || resource.uri.startsWith('data:'), 'Expected embedded GLB resources');
  }
}
function install(source) {
  const root = path.resolve(__dirname, '..');
  const destination = path.join(root, 'client', 'assets', 'brightforge');
  check(!fs.existsSync(destination), 'Review or move the previous candidate import before installing another');
  const names = fs.readdirSync(source, { withFileTypes: true }).filter(item => item.isDirectory());
  const assets = names.map((item, index) => {
    const manifest = JSON.parse(fs.readFileSync(path.join(source, item.name, 'manifest.json'), 'utf8'));
    check(manifest.schemaVersion === 1 && manifest.status === 'REVIEW_CANDIDATE', 'Expected review manifest');
    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.assetId) && manifest.assetId === item.name, 'Invalid asset ID');
    const artifact = manifest.artifacts?.find(value => value.file === 'candidate.glb');
    check(artifact && /^[a-f0-9]{64}$/.test(artifact.sha256), 'Missing GLB digest');
    const bytes = fs.readFileSync(path.join(source, item.name, artifact.file));
    check(bytes.length <= 16 * 1024 * 1024 && bytes.length === artifact.bytes, 'Candidate size mismatch');
    check(crypto.createHash('sha256').update(bytes).digest('hex') === artifact.sha256, 'Candidate hash mismatch');
    inspectGlb(bytes);
    check(Number.isInteger(manifest.quality?.face_count) && manifest.quality.face_count > 0 &&
      manifest.quality.face_count <= 50000, 'Expected bounded triangle measurement');
    return { id: manifest.assetId, status: manifest.status, sha256: artifact.sha256,
      position: { x: index % 2 ? 3 : -3, z: index % 2 ? -3 : 1 }, manifest, bytes };
  });
  check(assets.length > 0 && assets.length <= 8, 'Expected one to eight candidates');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const stage = fs.mkdtempSync(path.join(path.dirname(destination), '.brightforge-stage-'));
  try {
    for (const asset of assets) {
      const directory = path.join(stage, asset.id);
      fs.mkdirSync(directory);
      fs.writeFileSync(path.join(directory, 'candidate.glb'), asset.bytes);
      fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(asset.manifest, null, 2) + '\n');
    }
    for (const file of ['EXPORT_CONTRACT.md', 'PROVENANCE.md']) {
      fs.copyFileSync(path.join(source, file), path.join(stage, file));
    }
    const scene = { schemaVersion: 1, coordinateSystem: 'source-z-up-meters',
      assets: assets.map(({ manifest, bytes, ...asset }) => asset) };
    fs.writeFileSync(path.join(stage, 'scene.json'), JSON.stringify(scene, null, 2) + '\n');
    fs.renameSync(stage, destination);
    console.log(JSON.stringify({ status: 'imported', candidates: assets.length, hashesVerified: true,
      source: 'BrightForge-review-export', artApproval: 'pending' }));
  } catch (error) {
    fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }
}
if (require.main === module) {
  try { check(process.argv[2], 'Supply an extracted BrightForge export folder'); install(path.resolve(process.argv[2])); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { inspectGlb };

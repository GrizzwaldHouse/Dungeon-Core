// layout-parity.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep visible dungeon solids and authoritative collision proxies identical across every authored space.

'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const layout = require('../shared/dungeon-layout');
const { validateLayout } = require('../scripts/validate-layout');

function mutableLayout() { return structuredClone(layout); }

test('all authored spaces have exact visible-solid and authoritative-AABB parity', () => {
  const report = validateLayout(layout);
  assert.equal(report.objectCount, 33);
  assert.deepEqual(report.decorativeObjectIds, [
    'entry-wayfinder-inlay-1', 'entry-wayfinder-inlay-2', 'entry-wayfinder-inlay-3',
    'entry-wayfinder-inlay-4', 'secret-floor'
  ]);
  assert.deepEqual(report.spaceIds, ['entry', 'amber-vault', 'violet-vault']);
  assert.deepEqual(report.collidersBySpace, { entry: 21, 'amber-vault': 7, 'violet-vault': 8 });

  for (const spaceId of report.spaceIds) {
    const geometry = spaceId === 'entry' ? layout.world : layout.world.spaces[spaceId];
    for (const solid of report.solidManifestBySpace[spaceId]) {
      const source = layout.objects.find((entry) => entry.id === solid.id);
      assert.ok(source, `${spaceId} solid ${solid.id} has a visible source mesh`);
      assert.deepEqual(solid.aabb, {
        min: { x: source.position.x - source.size.x / 2, y: source.position.y - source.size.y / 2,
          z: source.position.z - source.size.z / 2 },
        max: { x: source.position.x + source.size.x / 2, y: source.position.y + source.size.y / 2,
          z: source.position.z + source.size.z / 2 },
        ...(source.revealNodeId ? { revealNodeId: source.revealNodeId } : {})
      });
      assert.ok(geometry.obstacles.some((obstacle) => JSON.stringify(obstacle) === JSON.stringify(solid.aabb)),
        `${spaceId} server AABB matches visible ${solid.id}`);
    }
  }
});

test('entry portal frames preserve a wide straight walk lane and wayfinder marks stay non-colliding', () => {
  const frames = layout.objects.filter((entry) => entry.kind === 'portal-arch');
  assert.equal(frames.length, 8);
  for (const frame of frames) {
    const left = frame.position.x - frame.size.x / 2;
    const right = frame.position.x + frame.size.x / 2;
    assert.ok(right <= -1.5 || left >= 1.5, `${frame.id} leaves at least a three-metre portal gap`);
    assert.equal(frame.collider, true);
    assert.equal(frame.spaceId, 'entry');
  }
  const inlays = layout.objects.filter((entry) => entry.kind === 'wayfinder-inlay');
  assert.equal(inlays.length, 4);
  assert.ok(inlays.every((entry) => entry.collider === false && entry.spaceId === 'entry'));
});

test('decorative pillar caps remain inside their parent visible solid and collision AABB', () => {
  const report = validateLayout(layout);
  const pillars = layout.objects.filter((entry) => entry.cap);
  assert.equal(pillars.length, 6);
  assert.equal(report.solidManifestBySpace.entry.length, 21);
  for (const entry of pillars) {
    const parent = report.solidManifestBySpace.entry.find((solid) => solid.id === entry.id).aabb;
    const capMin = { x: entry.position.x - entry.cap.size.x / 2, y: entry.cap.y - entry.cap.size.y / 2,
      z: entry.position.z - entry.cap.size.z / 2 };
    const capMax = { x: entry.position.x + entry.cap.size.x / 2, y: entry.cap.y + entry.cap.size.y / 2,
      z: entry.position.z + entry.cap.size.z / 2 };
    for (const axis of ['x', 'y', 'z']) {
      assert.ok(capMin[axis] >= parent.min[axis] && capMax[axis] <= parent.max[axis], `${entry.id} cap stays contained on ${axis}`);
    }
  }
});

test('validator rejects missing, extra, or shifted authoritative collision', () => {
  const shifted = mutableLayout();
  shifted.world.obstacles[0].max.x += 0.25;
  assert.throws(() => validateLayout(shifted), /entry obstacle parity mismatch/);

  const missing = mutableLayout();
  missing.world.spaces['amber-vault'].obstacles.pop();
  assert.throws(() => validateLayout(missing), /amber-vault obstacle parity mismatch/);

  const extra = mutableLayout();
  extra.world.spaces['violet-vault'].obstacles.push(structuredClone(extra.world.spaces['violet-vault'].obstacles[0]));
  assert.throws(() => validateLayout(extra), /violet-vault obstacle parity mismatch/);
});

test('validator rejects ambiguous object ownership and missing reveal metadata', () => {
  const duplicate = mutableLayout();
  duplicate.objects.push(structuredClone(duplicate.objects[0]));
  assert.throws(() => validateLayout(duplicate), /Duplicate layout object ID/);

  const unknownSpace = mutableLayout();
  unknownSpace.objects[0].spaceId = 'unpublished-room';
  assert.throws(() => validateLayout(unknownSpace), /Unknown layout space/);

  const missingDiscovery = mutableLayout();
  missingDiscovery.world.discoveryNodes = [];
  assert.throws(() => validateLayout(missingDiscovery), /references missing discovery node/);

  const protrudingCap = mutableLayout();
  protrudingCap.objects.find((entry) => entry.id === 'pillar-0--15').cap.size.x = 2;
  assert.throws(() => validateLayout(protrudingCap), /cap extends beyond its visible solid and authoritative AABB/);
});

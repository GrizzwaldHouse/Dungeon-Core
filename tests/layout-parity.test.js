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
  assert.deepEqual(validateLayout(layout), {
    objectCount: 21,
    decorativeObjectIds: ['secret-floor'],
    spaceIds: ['entry', 'amber-vault', 'violet-vault'],
    collidersBySpace: { entry: 13, 'amber-vault': 7, 'violet-vault': 8 }
  });
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
});

// environment-render.test.js
// Developer: Marcus Daley
// Date: 2026-11-01
// Why: Protect the approved dusk environment language without coupling presentation tests to authoritative collision state.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const renderPath = path.resolve(__dirname, '..', 'client', 'render.js');

function loadEnvironmentContract() {
  const source = fs.readFileSync(renderPath, 'utf8')
    .replace(/^import \* as THREE from 'three';\r?\n/m, '')
    .replace('export class DungeonRenderer', 'class DungeonRenderer');
  const context = { THREE: {} };
  vm.runInNewContext(`${source}\nthis.environmentContract = { ENVIRONMENT_PALETTES, environmentPalette };`, context);
  return context.environmentContract;
}

test('floor and vault snapshots select immutable restrained environment palettes', () => {
  const { ENVIRONMENT_PALETTES, environmentPalette } = loadEnvironmentContract();

  assert.equal(environmentPalette({ floor: { phase: 'FLOOR_THREE' } }), ENVIRONMENT_PALETTES.DEEPWOOD);
  assert.equal(environmentPalette({ floor: { phase: 'REST' } }), ENVIRONMENT_PALETTES.REST);
  assert.equal(environmentPalette({ space: { id: 'violet-vault' } }), ENVIRONMENT_PALETTES['violet-vault']);
  assert.equal(environmentPalette({ floor: { phase: 'UNKNOWN' }, space: { id: 'unknown' } }), ENVIRONMENT_PALETTES.ENTRY);
  assert.equal(Object.isFrozen(ENVIRONMENT_PALETTES), true);
  assert.equal(Object.isFrozen(ENVIRONMENT_PALETTES.DEEPWOOD), true);
  assert.notEqual(ENVIRONMENT_PALETTES.DEEPWOOD.floor, ENVIRONMENT_PALETTES.FLOOR_FIVE.floor);
  assert.ok(ENVIRONMENT_PALETTES.DEEPWOOD.fog > ENVIRONMENT_PALETTES.REST.fog);
});

test('portal and camera presentation remain readable in angled and top-down views', () => {
  const source = fs.readFileSync(renderPath, 'utf8');
  const portalSection = source.slice(source.indexOf('updatePortalMeshes(portals'), source.indexOf('updatePickupMeshes(items'));
  const cameraSection = source.slice(source.indexOf('updateCamera(position'), source.indexOf('resetSession()'));

  assert.match(portalSection, /new THREE\.CircleGeometry\(0\.65, 32\)/, 'available portals retain a translucent vertical veil');
  assert.match(portalSection, /new THREE\.CylinderGeometry\(0\.9, 0\.9, 0\.06, 32\)/, 'top-down view retains a ground portal footprint');
  assert.match(portalSection, /record\.veil\.visible = !sealed/, 'sealed portals cannot show a misleading open veil');
  assert.match(cameraSection, /topDown \? 22 : 13/, 'camera keeps a dedicated top-down height');
  assert.match(cameraSection, /topDown \? 0 : 17/, 'angled camera keeps its depth offset');
});

test('environment polish stays presentation-only and bounded for mobile rendering', () => {
  const source = fs.readFileSync(renderPath, 'utf8');
  const environmentSection = source.slice(source.indexOf('updateEnvironment(snapshot)'), source.indexOf('updatePortalMeshes(portals'));

  assert.match(source, /setPixelRatio\(Math\.min\(window\.devicePixelRatio \|\| 1, 2\)\)/);
  assert.doesNotMatch(environmentSection, /Box3|collision|collider|socket|emit\(/i);
  assert.match(source, /this\.motionPreference\?\.matches \? 0 : Math\.sin/);
});

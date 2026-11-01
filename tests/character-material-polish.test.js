// character-material-polish.test.js
// Developer: Marcus Daley
// Date: 2026-11-01
// Why: Prevent character polish from regressing into flat prototype primitives or ground-bound flying silhouettes.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'render.js'), 'utf8');

test('Wayfarers use smoother geometry and woven surface relief', () => {
  const players = source.slice(source.indexOf('playerMesh(id'), source.indexOf('enemyMesh(id'));
  assert.match(players, /bumpMap: this\.actorClothTexture/);
  assert.match(players, /role === 'VANGUARD' \? 0\.88 : 0\.96, 12\), cloth/);
  assert.match(players, /new THREE\.SphereGeometry\(0\.28, 16, 12\)/);
  assert.doesNotMatch(players, /flatShading: true, \.\.\.options/);
});

test('Deepwood creatures use bark relief and Barkwings carry visible talons', () => {
  const enemies = source.slice(source.indexOf('enemyMesh(id'), source.indexOf('animateBarkwing(record'));
  assert.match(enemies, /body\.material\.bumpMap = this\.actorBarkTexture/);
  assert.match(enemies, /bumpScale = kind === 'DEEPWOOD_SENTINEL' \? 0\.045 : 0\.025/);
  assert.match(enemies, /barkwing-raised-leg/);
  assert.match(enemies, /barkwing-branch-talon/);
});

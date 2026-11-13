// character-render.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep distinct Wayfarer and Deepwood silhouettes presentation-only, bounded, and readable at multiplayer scale.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
    setScalar(value) { return this.set(value, value, value); }
    copy(value) { return this.set(value.x, value.y, value.z); }
    clone() { return new Vector3(this.x, this.y, this.z); }
    sub(value) { return this.set(this.x - value.x, this.y - value.y, this.z - value.z); }
    addScaledVector(value, scale) { return this.set(this.x + value.x * scale,
      this.y + value.y * scale, this.z + value.z * scale); }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() { const length = this.length() || 1; return this.set(this.x / length, this.y / length, this.z / length); }
    lerp(value, alpha) {
      this.x += (value.x - this.x) * alpha;
      this.y += (value.y - this.y) * alpha;
      this.z += (value.z - this.z) * alpha;
      return this;
    }
  }
  class Group {
    constructor() {
      this.children = [];
      this.position = new Vector3();
      this.rotation = { x: 0, y: 0, z: 0 };
      this.quaternion = { setFromUnitVectors() {} };
      this.scale = new Vector3(1, 1, 1);
      this.visible = true;
    }
    add(...children) { this.children.push(...children); }
    remove(child) { this.children = this.children.filter((value) => value !== child); }
    traverse(callback) { callback(this); for (const child of this.children) child.traverse(callback); }
  }
  class Geometry {
    get attributes() {
      const points = this.args?.[0]?.points || [[0, 0], [1, 0.5]];
      return { position: { count: points.length, getX: i => points[i][0], getY: i => points[i][1],
        setZ: (i, value) => { points[i][2] = value; } } };
    }
    computeVertexNormals() { this.normalsUpdated = true; }

    constructor(...args) { this.args = args; this.type = this.constructor.name; }
    dispose() { this.disposed = true; }
  }
  class Material {
    constructor(options = {}) {
      Object.assign(this, options);
      this.opacity = options.opacity ?? 1;
      this.color = { setHex() {} };
      this.emissive = { setHex() {} };
    }
    dispose() { this.disposed = true; }
  }
  class Mesh extends Group {
    constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); }
  }
  class Shape {
    moveTo() {}
    lineTo() {}
    closePath() {}
  }
  const geometryNames = ['BoxGeometry', 'CapsuleGeometry', 'CircleGeometry', 'ConeGeometry', 'CylinderGeometry',
    'DodecahedronGeometry', 'IcosahedronGeometry', 'OctahedronGeometry', 'ShapeGeometry',
    'SphereGeometry', 'TetrahedronGeometry', 'TorusGeometry'];
  const THREE = {
    Group, Object3D: Group, Mesh, Shape, Vector3, DoubleSide: 2,
    MeshBasicMaterial: Material, MeshStandardMaterial: Material, MeshPhysicalMaterial: Material,
    MathUtils: { clamp: (value, min, max) => Math.min(max, Math.max(min, value)) }
  };
  for (const name of geometryNames) {
    THREE[name] = class extends Geometry {
      constructor(...args) { super(...args); this.type = name; }
    };
  }
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'render.js'), 'utf8')
    .replace(/^import \* as THREE from 'three';\r?\n/m, '')
    .replace('export class DungeonRenderer', 'class DungeonRenderer');
  const context = { THREE, performance: { now: () => 200 } };
  vm.runInNewContext(`${source}\nthis.DungeonRenderer = DungeonRenderer;`, context);
  const state = {
    scene: { add() {}, remove() {} },
    playerMeshes: new Map(), enemyMeshes: new Map(), snapshots: [],
    localPlayerId: 'human', input: { x: 0, z: 0 }, updateCamera() {}, selectedEnemyId: null,
    motionPreference: { matches: false }
  };
  const methods = context.DungeonRenderer.prototype;
  state.playerMesh = methods.playerMesh;
  state.enemyMesh = methods.enemyMesh;
  return { state, methods, DungeonRenderer: context.DungeonRenderer };
}

function meshesIn(group) {
  const meshes = [];
  group.traverse((object) => { if (object.geometry) meshes.push(object); });
  return meshes;
}

function materialCount(group) { return new Set(meshesIn(group).map((mesh) => mesh.material)).size; }

test('Aqueduct spider attack effects launch below the eye cluster from a named mouth anchor', () => {
  const { state, methods, DungeonRenderer } = fixture();
  const fire = DungeonRenderer.aqueductSpider('SPIDER_FIRE');
  assert.equal(fire.mouthAnchor.position.z, 0.78);
  assert.ok(fire.mouthAnchor.position.y < 0.4, 'Matchjaw mouth anchor stays below its eye cluster');
  const warningState = { ...state, warningMeshes: new Map() };
  methods.updateWarningMeshes.call(warningState, [{ id: 'fire', kind: 'SPIDER_FIRE',
    position: { x: 0, y: 0, z: 3 }, origin: { x: 0, y: 0, z: 0 }, radius: 1, endsAtTick: 36 }], 0);
  const fireShot = warningState.warningMeshes.get('fire').shot;
  assert.ok(fireShot.position.y <= 0.3 + Number.EPSILON,
    'Matchjaw projectile starts at mouth height instead of its eyes');
});

test('server-published elemental spider warnings use bounded distinct volleys and reduced-motion arcs', () => {
  const { state, methods } = fixture();
  const warningState = { ...state, warningMeshes: new Map(), motionPreference: { matches: true } };
  const origin = { x: 0, y: 0, z: 0 };
  const position = { x: 0, y: 0, z: 3 };
  methods.updateWarningMeshes.call(warningState, ['SPIDER_FIRE', 'SPIDER_LAVA', 'SPIDER_ACID'].map((kind) =>
    ({ id: kind, kind, origin, position, radius: 1, endsAtTick: 36 })), 18);
  const fire = warningState.warningMeshes.get('SPIDER_FIRE').shot;
  const lava = warningState.warningMeshes.get('SPIDER_LAVA').shot;
  const acid = warningState.warningMeshes.get('SPIDER_ACID').shot;
  assert.equal(fire.children.length, 0);
  assert.equal(lava.children.length, 1, 'lava has one hot inner core');
  assert.equal(acid.children.length, 2, 'acid has two trailing drops');
  assert.equal(warningState.warningMeshes.size, 3);
  assert.ok(lava.position.y > acid.position.y);
  assert.ok(acid.position.y > fire.position.y);
  methods.updateWarningMeshes.call(warningState, [], 37);
  assert.equal(warningState.warningMeshes.size, 0);
});

test('only server-confirmed elemental damage shows one bounded player impact cue', () => {
  const { state, methods } = fixture();
  const snapshot = { phase: 'RUNNING', players: { human: {
    displayName: 'Test Explorer', health: { current: 80 }, combatProfile: { role: 'VANGUARD' },
    transform: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } }
  } }, enemies: {
    fire: { kind: 'SPIDER_FIRE' }, lava: { kind: 'SPIDER_LAVA' }, acid: { kind: 'SPIDER_ACID' },
    moss: { kind: 'SPIDER_MOSS' }
  } };
  state.snapshots = [{ snapshot, at: 100 }];
  const before = JSON.stringify(snapshot);
  const hit = (sourceId) => ({ playerId: 'human', sourceId, amount: 5, currentHealth: 80 });
  assert.equal(methods.showElementalPlayerHit.call(state, hit('moss')), false);
  assert.equal(methods.showElementalPlayerHit.call(state, { ...hit('fire'), amount: 0 }), false);
  assert.equal(methods.showElementalPlayerHit.call(state, hit('missing')), false);
  assert.equal(state.playerMeshes.size, 0, 'invalid source does not create presentation meshes');
  for (const [sourceId, childCount] of [['fire', 3], ['lava', 2], ['acid', 3]]) {
    assert.equal(methods.showElementalPlayerHit.call(state, hit(sourceId)), true);
    const record = state.playerMeshes.get('human');
    assert.equal(record.impactCue.children.length, childCount);
    assert.equal(record.impactKind, `SPIDER_${sourceId.toUpperCase()}`);
    assert.equal(record.group.children.filter((child) => child === record.impactCue).length, 1);
    state.motionPreference.matches = true;
    methods.animateElementalPlayerHit.call(state, record, 250);
    assert.equal(record.impactCue.visible, true);
    assert.equal(record.impactCue.scale.x, 1, 'reduced motion keeps a still impact');
    methods.animateElementalPlayerHit.call(state, record, 481);
    assert.equal(record.impactCue.visible, false);
  }
  assert.equal(JSON.stringify(snapshot), before, 'impact presentation does not alter server state');
});

test('named mock party receives four stable role silhouettes without capsule bodies', () => {
  const { state, methods } = fixture();
  const expected = new Map([
    ['Mock Ember', 'VANGUARD'],
    ['Mock Rune', 'MAGE'],
    ['Mock Vale', 'SCOUT'],
    ['Mock Moss', 'HEALER']
  ]);
  for (const [name, role] of expected) {
    const record = methods.playerMesh.call(state, name, name);
    assert.equal(record.role, role);
    assert.equal(record.roleParts.length, 3, `${role} carries three silhouette-defining tools`);
    assert.ok(meshesIn(record.group).length >= 27 && meshesIn(record.group).length <= 40,
      `${role} retains layered anatomy within its bounded presentation mesh budget`);
    assert.equal(meshesIn(record.group).filter((mesh) => mesh.name === 'wayfarer-open-hood').length, 1);
    assert.equal(meshesIn(record.group).filter((mesh) => mesh.name === 'wayfarer-recessed-face').length, 1);
    assert.equal(meshesIn(record.group).filter((mesh) => mesh.name === 'wayfarer-layered-hem').length, 5);
    assert.ok(materialCount(record.group) <= 11, `${role} shares clothing surfaces across its added anatomy`);
    assert.equal(record.actor.children[0].geometry, record.actor.children[1].geometry,
      `${role} shares its boot geometry instead of duplicating buffers`);
  }
  assert.equal(state.playerMeshes.size, 4);
  assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname, '..', 'client', 'render.js'), 'utf8'),
    /new THREE\.CapsuleGeometry/, 'the runtime Wayfarer no longer uses a generic capsule body');
});

test('Wayfarer strike cue follows confirmed server damage and respects reduced motion', () => {
  const { state, methods } = fixture();
  const player = (damageDealt) => ({ displayName: 'Mock Ember', connection: 'CONNECTED',
    health: { current: 100 }, metrics: { damageDealt },
    transform: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } } });
  methods.pushSnapshot.call(state, { phase: 'RUNNING', players: { human: player(0) }, enemies: {} }, 100);
  methods.samplePlayers.call(state, 200);
  const record = state.playerMeshes.get('human');
  assert.equal(record.strikeArc.material.depthTest, false, 'attack cue remains readable when actors overlap');
  methods.animateWayfarer.call(state, 'human', record, 200);
  assert.equal(record.strikeArc.visible, false, 'joining with an existing score is not an attack');
  methods.pushSnapshot.call(state, { phase: 'RUNNING', players: { human: player(20) }, enemies: {} }, 210);
  assert.equal(state.playerStrikeUntil.get('human'), 460);
  methods.animateWayfarer.call(state, 'human', record, 330);
  assert.equal(record.strikeArc.visible, true, 'confirmed damage exposes the arc');
  assert.ok(record.actor.position.z > 0, 'ordinary motion adds a short lunge');
  assert.ok(record.weaponPivot.rotation.x < 0, 'weapon pivots with the confirmed strike');
  state.motionPreference.matches = true;
  methods.animateWayfarer.call(state, 'human', record, 350);
  assert.equal(record.actor.position.z, 0, 'reduced motion removes the lunge');
  assert.equal(record.weaponPivot.rotation.x, 0, 'reduced motion keeps the weapon still');
  methods.animateWayfarer.call(state, 'human', record, 461);
  assert.equal(record.strikeArc.visible, false, 'cue expires without changing state');
});

test('confirmed ranged traces follow server profile and terminate at the authoritative target', () => {
  const { state, methods } = fixture();
  const snapshot = { phase: 'RUNNING', players: {
    human: { displayName: 'Mock Rune', health: { current: 100 }, combatProfile: { role: 'SCOUT', style: 'ARROW', rangeMeters: 7 },
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } } }
  }, enemies: { target: { transform: { position: { x: 0, y: 0, z: 5 } } } } };
  state.snapshots = [{ snapshot, at: 100 }];
  const before = JSON.stringify(snapshot);
  methods.showCombatHit.call(state, { attackerPlayerId: 'human', enemyId: 'target', attackStyle: 'ARROW', rangeMeters: 7 });
  const record = state.playerMeshes.get('human');
  assert.equal(record.role, 'SCOUT', 'server profile overrides a name-based mage fallback');
  assert.equal(record.hitTraceUntil, 340);
  assert.ok(Math.abs(record.hitTrace.scale.y * record.group.scale.x - 5) < 1e-9,
    'the actor scale cannot extend the trace beyond the target');
  assert.ok(Math.abs(record.hitTrace.position.z * record.group.scale.x - 2.5) < 1e-9);
  snapshot.enemies.target.transform.position = { x: 3, y: 0, z: 4 };
  methods.showCombatHit.call(state, { attackerPlayerId: 'human', enemyId: 'target', attackStyle: 'ARROW', rangeMeters: 7 });
  const trace = record.hitTrace;
  const length = trace.scale.y * record.group.scale.x;
  assert.ok(Math.abs(-Math.sin(trace.rotation.z) * length - 3) < 1e-9,
    'diagonal trace orientation reaches the authoritative X endpoint');
  assert.ok(Math.abs(Math.cos(trace.rotation.z) * Math.sin(trace.rotation.x) * length - 4) < 1e-9,
    'diagonal trace orientation reaches the authoritative Z endpoint');
  snapshot.enemies.target.transform.position = { x: 0, y: 0, z: 5 };
  methods.animateWayfarer.call(state, 'human', record, 250);
  assert.equal(record.hitTrace.visible, true);
  methods.animateWayfarer.call(state, 'human', record, 341);
  assert.equal(record.hitTrace.visible, false, 'trace expires independently of damage');
  record.hitTraceUntil = 0;
  for (const invalid of [
    { attackerPlayerId: 'human', enemyId: 'missing', attackStyle: 'ARROW', rangeMeters: 7 },
    { attackerPlayerId: 'human', enemyId: 'target', attackStyle: 'MELEE', rangeMeters: 7 },
    { attackerPlayerId: 'human', enemyId: 'target', attackStyle: 'ARROW', rangeMeters: 2 }
  ]) methods.showCombatHit.call(state, invalid);
  assert.equal(record.hitTraceUntil, 0, 'missing, melee, and out-of-range events cannot show a ranged trace');
  assert.equal(JSON.stringify(snapshot), before, 'presentation never changes authoritative positions or health');
});

test('connection and downed presentation affect visuals without mutating snapshots', () => {
  const { state, methods } = fixture();
  const snapshot = { phase: 'LOBBY', players: {
    ally: { displayName: 'Mock Moss', connection: 'DISCONNECTED', health: { current: 0 }, downedAtTick: 42,
      transform: { position: { x: 2, y: 0, z: 3 }, rotation: { y: 0.4 } } }
  }, enemies: {} };
  const before = JSON.stringify(snapshot);
  state.snapshots = [{ snapshot, at: 100 }];
  methods.samplePlayers.call(state, 200);
  const record = state.playerMeshes.get('ally');
  assert.equal(record.role, 'HEALER');
  assert.equal(record.actor.rotation.z, -Math.PI / 2, 'downed actor falls while its ground ring remains independent');
  assert.ok(record.opacityMaterials.every((surface) => surface.opacity === 0.34),
    'every actor surface fades on disconnect instead of leaving opaque tools behind');
  assert.equal(JSON.stringify(snapshot), before, 'visual treatment cannot write to authoritative state');
});

test('Deepwood boss and Rootling use explicit bark silhouettes and restrained accents', () => {
  const { state, methods } = fixture();
  const boss = methods.enemyMesh.call(state, 'deepwood', 'DEEPWOOD_SENTINEL');
  const rootling = methods.enemyMesh.call(state, 'rootling', 'ROOTLING');
  assert.equal(boss.body.geometry.type, 'CylinderGeometry');
  assert.equal(boss.body.scale.y, 1.4, 'cover-inspired height affects the visible trunk only');
  assert.equal(boss.group.scale.x, 1, 'the horizontal actor transform remains unchanged');
  assert.ok(meshesIn(boss.group).length <= 60, 'boss foliage and grown limbs stay within a bounded mesh budget');
  assert.equal(meshesIn(boss.group).filter((mesh) => mesh.name === 'sentinel-grown-branch').length, 10);
  assert.equal(meshesIn(boss.group).filter((mesh) => mesh.name === 'sentinel-torn-canopy').length, 8);
  assert.equal(meshesIn(boss.group).filter((mesh) => mesh.name === 'sentinel-bark-layer').length, 12);
  assert.ok(materialCount(boss.group) <= 10, 'boss bark layers, claws, and canopy reuse materials');
  assert.ok(meshesIn(boss.group).some((part) => part.geometry.type === 'TorusGeometry' && part.geometry.args[0] === 1.2),
    'boss ground marker matches its broad root mass');
  assert.equal(meshesIn(rootling.group).length, 14, 'Rootling has five mantle layers and paired eyes');
  assert.ok(materialCount(rootling.group) <= 6, 'Rootling roots share one surface');
  assert.ok(meshesIn(rootling.group).some((part) => part.geometry.type === 'TorusGeometry' && part.geometry.args[0] === 0.52));
  assert.equal(methods.enemyMesh.call(state, 'deepwood', 'DEEPWOOD_SENTINEL'), boss,
    'unchanged snapshots reuse the same procedural actor resources');
});

test('close melee keeps local, hostile, and selected cues separate', () => {
  const { state, methods } = fixture();
  const local = methods.playerMesh.call(state, 'human', 'Visual QA');
  const boss = methods.enemyMesh.call(state, 'deepwood', 'DEEPWOOD_SENTINEL');
  const rootRing = meshesIn(boss.group).find((mesh) =>
    mesh.geometry.type === 'TorusGeometry' && mesh.geometry.args[0] === 1.2);
  const playerRing = meshesIn(local.group).find((mesh) =>
    mesh.geometry.type === 'TorusGeometry' && mesh.geometry.args[0] === 0.54);
  assert.ok(local.localMarker && local.localMarker.position.y > local.actor.children[0].position.y,
    'local player has an overhead marker when ground rings overlap');
  assert.equal(local.localMarker.material.depthTest, false,
    'the local marker stays visible behind the Sentinel');
  assert.ok(boss.selection.geometry.args[0] > rootRing.geometry.args[0],
    'selected outline extends beyond the boss root marker');
  assert.notEqual(playerRing.material.color, rootRing.material.color,
    'local and hostile ground rings have different colors');
  assert.notEqual(rootRing.material.color, boss.selection.material.color,
    'hostile and selected rings have different colors');
});

test('Barkwing flight rig hovers above a separate shadow and uses only server warning posture', () => {
  const { state, methods } = fixture();
  const record = methods.enemyMesh.call(state, 'wing', 'BARKWING');
  assert.ok(record.flightRig && record.shadow && record.diveHalo);
  assert.equal(record.wings.length, 2);
  assert.equal(meshesIn(record.group).length, 30,
    'flight silhouette includes eight layered flight leaves plus raised legs and six branch talons');
  assert.ok(materialCount(record.group) <= 10, 'mirrored Barkwing wings share their surfaces');
  assert.equal(record.wings[0].pivot.children[0].geometry, record.wings[1].pivot.children[0].geometry,
    'mirrored wings share one membrane buffer');
  assert.equal(record.wings[0].pivot.children[0].material, record.wings[1].pivot.children[0].material,
    'mirrored wings share one membrane surface');
  assert.equal(record.wings[0].pivot.children[1].geometry, record.wings[1].pivot.children[1].geometry,
    'layered flight leaves share a buffer across both wings');
  assert.equal(record.wings[0].pivot.children[5].geometry, record.wings[1].pivot.children[5].geometry,
    'matching wing spars share a buffer');
  assert.ok(record.wings[0].pivot.children[0].rotation.x > -Math.PI / 2,
    'wing face remains visible from the angled camera');
  methods.animateBarkwing.call(state, record, 0.2);
  const calmHover = record.flightRig.position.y;
  methods.animateBarkwing.call(state, record, 0.8);
  assert.notEqual(record.flightRig.position.y, calmHover, 'calm flight has bounded local hover motion');
  assert.equal(record.diveHalo.visible, false);

  const snapshot = { phase: 'RUNNING', players: {}, warnings: [{ id: 'warning-wing', kind: 'BARKWING_DIVE',
    position: { x: 2, y: 0, z: 3 }, radius: 1.2 }], enemies: {
    wing: { kind: 'BARKWING', transform: { position: { x: 2, y: 2.4, z: 3 }, rotation: { y: 0.3 } },
      health: { current: 28 }, state: 'ALIVE' }
  } };
  const before = JSON.stringify(snapshot);
  state.snapshots = [{ snapshot, at: 100 }];
  methods.samplePlayers.call(state, 200);
  methods.animateBarkwing.call(state, record, 1.1);
  assert.equal(record.warningActive, true);
  assert.equal(record.diveHalo.visible, true, 'server warning enables the visible dive halo');
  assert.equal(record.flightRig.rotation.x, -0.42, 'server warning pitches the flying body into an attack posture');
  const shadowWorldY = record.group.position.y + record.shadow.position.y * record.group.scale.y;
  assert.ok(Math.abs(shadowWorldY + 0.39) < 1e-10, 'shadow remains on the floor while the body keeps server altitude');
  assert.equal(JSON.stringify(snapshot), before, 'flight feedback cannot write to authoritative warning or enemy state');

  state.motionPreference.matches = true;
  methods.animateBarkwing.call(state, record, 2);
  const reducedHover = record.flightRig.position.y;
  methods.animateBarkwing.call(state, record, 20);
  assert.equal(record.flightRig.position.y, reducedHover, 'reduced motion holds a stable airborne pose');
});

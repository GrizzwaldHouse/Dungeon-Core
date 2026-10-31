// render.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Turn server-approved room snapshots into smooth WebGL visuals without owning game rules.

import * as THREE from 'three';

const INTERPOLATION_DELAY_MS = 100;
const MAX_EXTRAPOLATION_MS = 80;
const MOVE_SPEED = 5;
const vectorOK = (v) => v && ['x', 'y', 'z'].every((axis) => Number.isFinite(v[axis]));
const WAYFARER_ROLES = Object.freeze(['VANGUARD', 'MAGE', 'SCOUT', 'HEALER']);

// Why: Stable presentation roles keep a six-player party readable without trusting the client with gameplay classes.
// Input: A server-supplied display name and opaque player identifier used only as a visual seed.
// Output: One of four visual silhouettes; this never changes combat, inventory, or authoritative state.
function wayfarerRole(displayName, id) {
  const label = String(displayName || '').toUpperCase();
  const namedRole = [
    ['VANGUARD', ['VANGUARD', 'EMBER', 'AXE']],
    ['MAGE', ['MAGE', 'RUNE', 'ARCANE']],
    ['SCOUT', ['SCOUT', 'VALE', 'RANGER']],
    ['HEALER', ['HEALER', 'MOSS', 'MEDIC']]
  ].find(([, words]) => words.some((word) => label.includes(word)))?.[0];
  if (namedRole) return namedRole;
  let hash = 2166136261;
  for (const character of `${displayName || ''}:${id || ''}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return WAYFARER_ROLES[(hash >>> 0) % WAYFARER_ROLES.length];
}

// Why: Give the authored stone rooms readable surface detail without a network asset or a blue debug grid.
// Output: One deterministic floor texture shared by every stage; no game geometry or collision changes.
function makeFlagstoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext('2d');
  const tile = 64;
  context.fillStyle = '#64716d';
  context.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 16; row += 1) {
    for (let column = -1; column < 17; column += 1) {
      const seed = Math.abs((row * 73856093 ^ column * 19349663) >>> 0);
      const inset = 1 + seed % 2;
      const x = column * tile + (row % 2) * 31 + inset;
      const y = row * tile + inset;
      context.fillStyle = ['#8b9691', '#909991', '#808e89', '#9aa39a', '#87938c'][seed % 5];
      context.fillRect(x, y, tile - inset * 2, tile - inset * 2);
      context.strokeStyle = '#b0b8ad';
      context.globalAlpha = 0.12;
      context.strokeRect(x + 2, y + 2, tile - inset * 2 - 4, tile - inset * 2 - 4);
      context.globalAlpha = 1;
      if (seed % 7 === 0) {
        context.strokeStyle = '#586a65';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x + 9, y + 5);
        context.lineTo(x + 23, y + 19);
        context.lineTo(x + 17, y + 36);
        context.stroke();
      }
      if (seed % 5 === 0) {
        context.fillStyle = '#6f8372';
        context.fillRect(x + 4, y + tile - inset * 2 - 10, 13, 3);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Why: Pillars need weathered masonry and vertical relief while preserving the exact server collision volume.
// Output: A small shared map for stone faces; the texture adds no geometry or per-frame work.
function makePillarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#7b8082';
  context.fillRect(0, 0, 256, 256);
  for (let course = 0; course < 5; course += 1) {
    const y = course * 52;
    context.fillStyle = ['#747b7e', '#81888a', '#777e83'][course % 3];
    context.fillRect(0, y + 3, 256, 48);
    context.fillStyle = '#343e46';
    context.fillRect(0, y, 256, 3);
    context.fillStyle = '#a0a7a6';
    context.fillRect(0, y + 4, 256, 2);
  }
  for (const x of [22, 38, 218, 234]) {
    context.fillStyle = '#48555b';
    context.fillRect(x, 9, 3, 238);
    context.fillStyle = '#a1a9a5';
    context.fillRect(x + 3, 9, 2, 238);
  }
  for (let index = 0; index < 70; index += 1) {
    const seed = Math.imul(index + 1, 2654435761) >>> 0;
    const x = seed % 256;
    const y = (seed >>> 9) % 256;
    context.fillStyle = index % 3 ? '#606c6c' : '#a0a7a0';
    context.fillRect(x, y, 1 + seed % 4, 1 + seed % 3);
  }
  context.strokeStyle = '#3c474d';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(153, 31);
  context.lineTo(143, 57);
  context.lineTo(150, 75);
  context.lineTo(135, 99);
  context.stroke();
  context.fillStyle = '#4b6258';
  context.fillRect(0, 237, 256, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Small deterministic surface maps are built once per renderer, never per frame.
// Grayscale grain preserves role colors while adding bark fissures or woven wear.
function makeActorSurface(bark) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = bark ? '#b2aaa0' : '#d3d0c8';
  context.fillRect(0, 0, 256, 256);
  for (let index = 0; index < (bark ? 95 : 128); index += 1) {
    const seed = (Math.imul(index + 1, 2654435761) >>> 0);
    const x = seed % 256;
    const y = (seed >>> 8) % 256;
    context.strokeStyle = bark ? ['#51473f', '#756a60', '#e1d2ba'][index % 3] : '#a49f94';
    context.lineWidth = bark ? 1 + seed % 3 : 0.6;
    context.beginPath();
    context.moveTo(bark ? x : index * 2, bark ? y : 0);
    context.lineTo(bark ? x + (seed % 9) - 4 : index * 2, bark ? y + 14 + seed % 60 : 256);
    context.stroke();
    if (!bark) context.fillRect(0, index * 2, 256, 0.4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export class DungeonRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x141923);
    this.scene.fog = new THREE.FogExp2(0x141923, 0.015);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 130);
    this.cameraMode = 'angled';
    this.cameraZoom = 1;
    this.cameraTarget = new THREE.Vector3();
    this.cameraOffset = new THREE.Vector3();
    this.cameraDesired = new THREE.Vector3();
    this.updateCamera(this.cameraTarget, true);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.38;
    container.append(this.renderer.domElement);
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.snapshots = [];
    this.playerMeshes = new Map();
    this.enemyMeshes = new Map();
    this.motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.warningMeshes = new Map();
    this.itemMeshes = new Map();
    this.runeMeshes = new Map();
    this.lastEnemyHealth = new Map();
    this.enemyImpactUntil = new Map();
    this.lastPlayerDamage = new Map();
    this.playerStrikeUntil = new Map();
    this.lastLocalHealth = null;
    this.damageFlashUntil = 0;
    this.secretWalls = new Map();
    this.secretFloors = new Map();
    this.spaceMeshes = [];
    this.currentSpaceId = 'entry';
    this.portalMeshes = new Map();
    this.trapMesh = null;
    this.trapWireMesh = null;
    this.trapState = null;
    this.lastSpaceKey = null;
    this.revealed = new Set();
    this.localPlayerId = null;
    this.input = { x: 0, z: 0 };
    this.animationId = null;
    this.hasRendered = false;
    this.contextLost = false;
    this.graphicsState = 'starting';
    this.buildWorld();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost = (event) => {
      event.preventDefault();
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.hasRendered = false;
      this.contextLost = true;
      this.graphicsState = 'lost';
      this.container.classList.remove('webgl-ready');
      this.container.dispatchEvent(new CustomEvent('graphics-state', { detail: { state: 'lost' } }));
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored = () => {
      this.contextLost = false;
      this.start();
    });
    this.start();
  }

  buildWorld() {
    const layout = globalThis.DungeonWorldLayout;
    if (!layout || !Array.isArray(layout.objects)) throw new Error('Dungeon layout did not load');
    this.scene.add(new THREE.HemisphereLight(0xc5d0cc, 0x25302d, 2.5));
    const moon = new THREE.DirectionalLight(0xd4dad4, 2.7);
    moon.position.set(8, 22, 6);
    this.scene.add(moon);
    this.dynamicLights = [
      [0xa8785b, -19.2, 3.2, -11, 25, 0],
      [0x7faebb, 19.2, 3.2, -11, 22, Math.PI],
      [0x8c75a6, -11, 3.2, 19.2, 28, -Math.PI / 2],
      [0x7b9a86, 11, 3.2, -19.2, 18, Math.PI / 2]
    ].map(([color, x, y, z, distance, rotationY]) => {
      const light = new THREE.PointLight(color, 9, distance, 2);
      light.position.set(x, y, z);
      this.scene.add(light);
      const fixture = new THREE.Group();
      fixture.position.set(x, y, z);
      fixture.rotation.y = rotationY;
      const backplate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.62, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x4a5665, roughness: 0.72, metalness: 0.55 }));
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.48, 8),
        new THREE.MeshStandardMaterial({ color: 0x77695f, roughness: 0.52, metalness: 0.7 }));
      arm.rotation.z = Math.PI / 2;
      arm.position.x = 0.22;
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.7, roughness: 0.3 }));
      lantern.position.x = 0.46;
      fixture.add(backplate, arm, lantern);
      this.scene.add(fixture);
      return light;
    });

    this.flagstoneTexture = makeFlagstoneTexture();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({
      color: 0xd7dad2, map: this.flagstoneTexture, roughness: 0.96, metalness: 0.02
    }));
    this.mainFloorMaterial = floor.material;
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.58;
    this.scene.add(floor);
    const stone = new THREE.MeshStandardMaterial({ color: 0x4b565a, roughness: 0.95, metalness: 0.04 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x77695f, roughness: 0.86, metalness: 0.12 });
    const amberStone = new THREE.MeshStandardMaterial({ color: 0x514642, roughness: 0.92, metalness: 0.04 });
    const violetStone = new THREE.MeshStandardMaterial({ color: 0x4a4653, roughness: 0.9, metalness: 0.05 });
    const portalArchStone = new THREE.MeshStandardMaterial({ color: 0x575362, roughness: 0.98, metalness: 0.02,
      emissive: 0x171322, emissiveIntensity: 0.18 });
    const wayfinderStone = new THREE.MeshStandardMaterial({ color: 0x5b554f, roughness: 0.99, metalness: 0.01 });
    const rootBark = new THREE.MeshStandardMaterial({ color: 0x574f43, roughness: 0.99, metalness: 0.0 });
    const rootMoss = new THREE.MeshStandardMaterial({ color: 0x405c4e, roughness: 1, metalness: 0.0 });
    this.pillarTexture = makePillarTexture();
    const pillarStone = new THREE.MeshStandardMaterial({ color: 0x8b9398, map: this.pillarTexture,
      bumpMap: this.pillarTexture, bumpScale: 0.035, roughness: 0.94, metalness: 0.02 });
    this.environmentMaterials = { stone, trim, amberStone, violetStone, portalArchStone, wayfinderStone, rootBark, rootMoss, pillarStone };
    const addBox = (w, h, d, x, y, z, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      return mesh;
    };
    const addRootClump = (entry) => {
      const group = new THREE.Group();
      group.position.set(entry.position.x, entry.position.y, entry.position.z);
      const groundCover = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), rootMoss);
      groundCover.scale.set(1.55, 0.06, 1.15);
      groundCover.position.set(0, -0.34, 0);
      group.add(groundCover);

      const rootCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.48, 0.62, 7), rootBark);
      rootCrown.position.set(0, -0.08, 0);
      rootCrown.rotation.y = 0.34;
      group.add(rootCrown);

      const addRootSegment = (from, to, baseRadius, tipRadius, material = rootBark) => {
        const direction = to.clone().sub(from);
        const segment = new THREE.Mesh(
          new THREE.CylinderGeometry(tipRadius, baseRadius, direction.length(), 7),
          material
        );
        segment.position.copy(from).add(to).multiplyScalar(0.5);
        segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        group.add(segment);
      };

      const start = new THREE.Vector3(0, -0.18, 0);
      const roots = [
        { mid: [-0.9, -0.06, -0.3], end: [-2.15, -0.3, -0.82], fork: [-1.65, -0.3, -1.35] },
        { mid: [-0.42, -0.03, 0.72], end: [-0.62, -0.3, 2.0], fork: [0.05, -0.31, 1.55] },
        { mid: [0.75, -0.05, 0.55], end: [1.82, -0.3, 1.45], fork: [1.95, -0.31, 0.72] },
        { mid: [0.88, -0.06, -0.4], end: [2.12, -0.3, -0.92], fork: [1.45, -0.31, -1.48] },
        { mid: [-0.1, -0.04, -0.78], end: [-0.28, -0.3, -1.92], fork: [-0.92, -0.31, -1.55] }
      ];
      for (const root of roots) {
        const middle = new THREE.Vector3(...root.mid);
        const finish = new THREE.Vector3(...root.end);
        const fork = new THREE.Vector3(...root.fork);
        addRootSegment(start, middle, 0.27, 0.18);
        addRootSegment(middle, finish, 0.18, 0.055);
        addRootSegment(middle.clone().lerp(finish, 0.42), fork, 0.09, 0.025);
      }

      const mossPatch = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 5), rootMoss);
      mossPatch.scale.set(1, 0.12, 0.72);
      mossPatch.position.set(-0.18, 0.2, 0.04);
      group.add(mossPatch);
      this.scene.add(group);
      this.spaceMeshes.push({ mesh: group, spaceId: entry.spaceId || 'entry', kind: 'deepwood-roots' });
    };
    const secretFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x184f4a, emissive: 0x0b2927, emissiveIntensity: 0.55 });
    const singleDiscoveryId = layout.world?.discoveryNodes?.length === 1 ? layout.world.discoveryNodes[0].id : null;
    for (const entry of layout.objects) {
      if (entry.kind === 'deepwood-roots') {
        addRootClump(entry);
        continue;
      }
      // Each secret wall owns its material so revealing one node cannot change another chamber.
      const material = entry.kind === 'secret-wall'
        ? new THREE.MeshStandardMaterial({ color: 0x5d626c, roughness: 0.89, metalness: 0.07, transparent: true, opacity: 1, depthWrite: true })
          : ['pillar', 'column', 'vault-column'].includes(entry.kind) ? pillarStone
          : entry.kind === 'secret-floor' ? secretFloorMaterial
          : entry.kind === 'portal-arch' ? portalArchStone
            : entry.kind === 'wayfinder-inlay' ? wayfinderStone : entry.spaceId === 'amber-vault' ? amberStone
          : entry.spaceId === 'violet-vault' ? violetStone : entry.kind === 'column' ? trim : stone;
      const mesh = addBox(entry.size.x, entry.size.y, entry.size.z, entry.position.x, entry.position.y, entry.position.z, material);
      this.spaceMeshes.push({ mesh, spaceId: entry.spaceId || 'entry', kind: entry.kind,
        revealNodeId: entry.revealNodeId || (entry.kind === 'secret-floor' ? singleDiscoveryId : null) });
      if (entry.kind === 'pillar' || entry.kind === 'vault-column') {
        // Inset courses and seams dress the exact collider volume without adding a false obstacle.
        const course = new THREE.MeshStandardMaterial({ color: 0x6b716e, roughness: 0.96 });
        for (const offset of [-entry.size.y / 2 + 0.2, 0, entry.size.y / 2 - 0.23]) {
          const band = addBox(entry.size.x * 0.96, 0.09, entry.size.z * 0.96,
            entry.position.x, entry.position.y + offset, entry.position.z, course);
          this.spaceMeshes.push({ mesh: band, spaceId: entry.spaceId || 'entry', kind: 'masonry-course' });
        }
      }
      if (entry.cap) {
        const cap = addBox(entry.cap.size.x, entry.cap.size.y, entry.cap.size.z, entry.position.x, entry.cap.y, entry.position.z, trim);
        this.spaceMeshes.push({ mesh: cap, spaceId: entry.spaceId || 'entry', kind: 'cap', revealNodeId: null });
      }
      if (entry.kind === 'secret-wall' && entry.revealNodeId) {
        const walls = this.secretWalls.get(entry.revealNodeId) || [];
        walls.push(mesh);
        this.secretWalls.set(entry.revealNodeId, walls);
      }
      if (entry.kind === 'secret-floor') {
        mesh.visible = false;
        this.secretFloor = mesh;
        const nodeId = entry.revealNodeId || singleDiscoveryId;
        if (nodeId) {
          const floors = this.secretFloors.get(nodeId) || [];
          floors.push(mesh);
          this.secretFloors.set(nodeId, floors);
        }
      }
    }
    this.applySpaceVisibility('entry');
  }

  // Why: A server-selected chamber must show only meshes whose colliders belong to that chamber.
  // Input: Space ID from the latest authoritative snapshot; unknown IDs show shared perimeter only.
  // Output: Wall, pillar, and secret-floor visibility follows the shared layout registry.
  applySpaceVisibility(spaceId) {
    this.currentSpaceId = spaceId;
    for (const record of this.spaceMeshes) {
      const inSpace = record.spaceId === 'all' || record.spaceId === spaceId;
      record.mesh.visible = inSpace && (record.kind === 'secret-wall'
        ? !this.revealed.has(record.revealNodeId)
        : record.kind === 'secret-floor' ? this.revealed.has(record.revealNodeId) : true);
    }
  }

  setLocalPlayer(playerId) { this.localPlayerId = playerId; }

  setSelectedTarget(enemyId) { this.selectedEnemyId = enemyId; }
  setInput(x, z) { this.input = { x, z }; }

  // Why: Each explorer can choose a clear viewing angle without changing movement or network state.
  // Input: A local preference from the UI or storage; unknown values use the angled default.
  // Output: The canonical mode and an immediate camera change around the current local target.
  // Watch Out: Top-down uses world -Z as screen up so looking vertically down cannot roll the camera.
  setCameraMode(mode) {
    this.cameraMode = mode === 'top-down' ? 'top-down' : 'angled';
    this.container.dataset.cameraMode = this.cameraMode;
    const local = this.playerMeshes.get(this.localPlayerId);
    this.updateCamera(local?.group.position || this.cameraTarget, true);
    return this.cameraMode;
  }

  // Local camera distance changes presentation only; the server keeps every gameplay rule.
  setCameraZoom(zoom) {
    this.cameraZoom = THREE.MathUtils.clamp(Number.isFinite(zoom) ? zoom : 1, 0.8, 1.8);
    const local = this.playerMeshes.get(this.localPlayerId);
    this.updateCamera(local?.group.position || this.cameraTarget, true);
    return this.cameraZoom;
  }

  // Keep one camera transform path for normal following, explicit view changes, and portal snaps.
  updateCamera(position, snap = false) {
    if (!vectorOK(position)) return;
    this.cameraTarget.copy(position);
    const topDown = this.cameraMode === 'top-down';
    const distance = Number.isFinite(this.cameraZoom) ? this.cameraZoom : 1;
    this.cameraOffset.set(0, (topDown ? 22 : 13) * distance, (topDown ? 0 : 17) * distance);
    this.camera.up.set(0, topDown ? 0 : 1, topDown ? -1 : 0);
    this.cameraDesired.copy(this.cameraTarget).add(this.cameraOffset);
    if (snap) this.camera.position.copy(this.cameraDesired);
    else this.camera.position.lerp(this.cameraDesired, 0.06);
    this.camera.lookAt(this.cameraTarget);
  }

  resetSession() {
    this.snapshots = [];
    this.lastSpaceKey = null;
    this.revealed.clear();
    this.applySpaceVisibility('entry');
    for (const group of this.secretWalls.values()) {
      for (const wall of Array.isArray(group) ? group : [group]) {
        wall.visible = true;
        wall.material.opacity = 1;
        wall.material.depthWrite = true;
        wall.material.needsUpdate = true;
      }
    }
    for (const group of this.secretFloors?.values() || []) {
      for (const floor of Array.isArray(group) ? group : [group]) floor.visible = false;
    }
    if (this.secretFloor) this.secretFloor.visible = false;
    for (const record of this.playerMeshes.values()) {
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
    }
    this.playerMeshes.clear();
    for (const record of this.enemyMeshes?.values() || []) {
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
    }
    this.enemyMeshes?.clear();
    for (const collection of [this.warningMeshes, this.itemMeshes, this.runeMeshes]) {
      for (const record of collection?.values() || []) {
        this.scene.remove(record.group);
        record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
      }
      collection?.clear();
    }
    this.lastEnemyHealth?.clear();
    this.enemyImpactUntil?.clear();
    this.lastPlayerDamage?.clear();
    this.playerStrikeUntil?.clear();
    this.lastLocalHealth = null;
    this.damageFlashUntil = 0;
    this.container?.classList?.remove('damage-active');
    for (const record of this.portalMeshes?.values() || []) {
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
    }
    this.portalMeshes?.clear();
    if (this.trapMesh) this.trapMesh.visible = false;
    if (this.trapWireMesh) this.trapWireMesh.visible = false;
    this.trapState = null;
  }

  pushSnapshot(snapshot, receivedAt) {
    if (!snapshot || typeof snapshot.players !== 'object') return;
    this.lastEnemyHealth ||= new Map();
    this.enemyImpactUntil ||= new Map();
    this.lastPlayerDamage ||= new Map();
    this.playerStrikeUntil ||= new Map();
    for (const [id, player] of Object.entries(snapshot.players)) {
      const dealt = player?.metrics?.damageDealt;
      if (!Number.isFinite(dealt)) continue;
      const previous = this.lastPlayerDamage.get(id);
      if (Number.isFinite(previous) && dealt > previous) this.playerStrikeUntil.set(id, performance.now() + 260);
      this.lastPlayerDamage.set(id, dealt);
    }
    for (const id of this.lastPlayerDamage.keys()) {
      if (!(id in snapshot.players)) {
        this.lastPlayerDamage.delete(id);
        this.playerStrikeUntil.delete(id);
      }
    }
    const localHealth = snapshot.players?.[this.localPlayerId]?.health?.current;
    if (Number.isFinite(localHealth)) {
      if (Number.isFinite(this.lastLocalHealth) && localHealth < this.lastLocalHealth) {
        this.damageFlashUntil = performance.now() + 420;
      }
      this.lastLocalHealth = localHealth;
    }
    for (const [id, enemy] of Object.entries(snapshot.enemies || {})) {
      const current = enemy?.health?.current;
      if (!Number.isFinite(current)) continue;
      const previous = this.lastEnemyHealth.get(id);
      if (Number.isFinite(previous) && current < previous) this.enemyImpactUntil.set(id, performance.now() + 260);
      this.lastEnemyHealth.set(id, current);
    }
    for (const id of this.lastEnemyHealth.keys()) {
      if (!(id in (snapshot.enemies || {}))) this.lastEnemyHealth.delete(id);
    }
    if (typeof this.updateEnvironment === 'function') this.updateEnvironment(snapshot);
    this.snapshots.push({ snapshot, at: receivedAt });
    if (this.snapshots.length > 12) this.snapshots.shift();
    for (const nodeId of snapshot.revealedNodeIds || []) this.reveal(nodeId);
  }

  // Why: A new server-owned space must snap actors to its spawn rather than interpolate through old walls.
  // Input: A validated room snapshot; portal and trap objects are presentation data only.
  // Output: World colors and markers match the latest space without choosing any route or applying damage.
  // Watch Out: Missing optional fields from older snapshots leave no portal or trap markers.
  updateEnvironment(snapshot) {
    const space = snapshot.space;
    if (space && typeof space.id === 'string' && Number.isSafeInteger(space.revision)) {
      const key = `${space.id}:${space.revision}`;
      if (this.lastSpaceKey !== key) {
        this.snapshots = [];
        this.lastSpaceKey = key;
        for (const [id, record] of this.playerMeshes) {
          const position = snapshot.players?.[id]?.transform?.position;
          if (vectorOK(position)) record.group.position.copy(position);
        }
        for (const [id, record] of this.enemyMeshes) {
          const position = snapshot.enemies?.[id]?.transform?.position;
          if (vectorOK(position)) record.group.position.copy(position);
        }
        const localPosition = snapshot.players?.[this.localPlayerId]?.transform?.position;
        if (vectorOK(localPosition)) this.updateCamera(localPosition, true);
        const stage = snapshot.floor?.phase;
        const backdrop = stage === 'REST' ? 0x1d2421 : stage === 'FLOOR_TWO' ? 0x26211f :
          stage === 'FLOOR_THREE' || stage === 'DEEPWOOD' ? 0x1a2320 : stage === 'FLOOR_FOUR' ? 0x1c252c :
            stage === 'FLOOR_FIVE' ? 0x242128 : space.id === 'amber-vault' ? 0x25211e :
              space.id === 'violet-vault' ? 0x211f29 : 0x141923;
        const floor = stage === 'REST' ? 0xe1ddce : stage === 'FLOOR_TWO' ? 0xd5c9c0 :
          stage === 'FLOOR_THREE' || stage === 'DEEPWOOD' ? 0xc3d1c4 : stage === 'FLOOR_FOUR' ? 0xd4dfe5 :
            stage === 'FLOOR_FIVE' ? 0xd9cad7 : space.id === 'amber-vault' ? 0xd4cabe :
              space.id === 'violet-vault' ? 0xcac4d7 : 0xd7dad2;
        this.scene.background.setHex(backdrop);
        this.scene.fog.color.setHex(backdrop);
        this.mainFloorMaterial.color.setHex(floor);
        this.environmentMaterials.stone.color.setHex(stage === 'DEEPWOOD' || stage === 'FLOOR_THREE'
          ? 0x526054 : stage === 'FLOOR_FOUR' ? 0x52616a : 0x4b565a);
        this.applySpaceVisibility(space.id);
      }
    }
    this.updatePortalMeshes(Array.isArray(snapshot.portals) ? snapshot.portals : []);
    this.updateTrapMesh(snapshot.trap);
    this.updateWarningMeshes(Array.isArray(snapshot.warnings) ? snapshot.warnings : []);
    this.updateItemMeshes(Array.isArray(snapshot.items) ? snapshot.items : []);
    this.updateRuneMeshes(Array.isArray(snapshot.encounter?.runes) ? snapshot.encounter.runes : []);
  }

  // Why: Ordered puzzle targets must be visible before proximity checks can teach the trial.
  // Input: Only server-published rune coordinates and solved flags.
  // Output: Three floor rings during the trial, with completed targets visually dimmed.
  updateRuneMeshes(runes) {
    const active = new Set();
    for (const rune of runes) {
      if (!Number.isSafeInteger(rune?.index) || !vectorOK(rune.position)) continue;
      active.add(rune.index);
      let record = this.runeMeshes.get(rune.index);
      if (!record) {
        const group = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.03, 32),
          new THREE.MeshBasicMaterial({ color: 0x8ad7ff, transparent: true, opacity: 0.28 }));
        const edge = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 8, 32),
          new THREE.MeshBasicMaterial({ color: 0x9be4ff }));
        edge.rotation.x = -Math.PI / 2;
        group.add(disc, edge);
        this.scene.add(group);
        record = { group, disc, edge };
        this.runeMeshes.set(rune.index, record);
      }
      record.group.position.set(rune.position.x, -0.44, rune.position.z);
      record.disc.material.opacity = rune.solved ? 0.08 : 0.3;
      record.edge.material.color.setHex(rune.solved ? 0x5d706f : 0x9be4ff);
    }
    for (const [index, record] of this.runeMeshes) {
      if (active.has(index)) continue;
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
      this.runeMeshes.delete(index);
    }
  }

  // Why: Only server-published warning bounds can preview an attack; the client never infers its damage.
  // Input: Public warning markers with finite world positions and radii.
  // Output: One pulsing ground marker per active server warning.
  updateWarningMeshes(warnings) {
    const active = new Set();
    for (const warning of warnings) {
      if (!warning || typeof warning.id !== 'string' || !vectorOK(warning.position) ||
        !Number.isFinite(warning.radius)) continue;
      active.add(warning.id);
      let record = this.warningMeshes.get(warning.id);
      if (!record) {
        const group = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.035, 40),
          new THREE.MeshBasicMaterial({ color: 0xffaa3d, transparent: true, opacity: 0.28, depthWrite: false }));
        const edge = new THREE.Mesh(new THREE.TorusGeometry(1, 0.055, 8, 40),
          new THREE.MeshBasicMaterial({ color: 0xffd18a, transparent: true, opacity: 0.95 }));
        edge.rotation.x = -Math.PI / 2;
        group.add(disc, edge);
        this.scene.add(group);
        record = { group, disc, edge };
        this.warningMeshes.set(warning.id, record);
      }
      record.group.position.set(warning.position.x, -0.43, warning.position.z);
      const radius = THREE.MathUtils.clamp(warning.radius, 0.1, 12);
      record.group.scale.set(radius, 1, radius);
    }
    for (const [id, record] of this.warningMeshes) {
      if (active.has(id)) continue;
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
      this.warningMeshes.delete(id);
    }
  }

  // Why: Resource discovery must reflect server-owned claims rather than client guesses.
  // Input: Public item markers; unknown kinds receive a neutral visual.
  // Output: Available items have distinct world markers, claimed items have none.
  updateItemMeshes(items) {
    const active = new Set();
    for (const item of items) {
      if (!item || typeof item.id !== 'string' || !vectorOK(item.position) || item.state === 'CLEARED' ||
        item.claimedBy?.includes(this.localPlayerId)) continue;
      active.add(item.id);
      let record = this.itemMeshes.get(item.id);
      if (!record) {
        const group = new THREE.Group();
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1),
          new THREE.MeshStandardMaterial({ color: 0x91f4b4, emissive: 0x2d9454, emissiveIntensity: 1.2 }));
        orb.position.y = 0.3;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 24),
          new THREE.MeshBasicMaterial({ color: 0xcafad7 }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.31;
        group.add(orb, ring);
        this.scene.add(group);
        record = { group, orb };
        this.itemMeshes.set(item.id, record);
      }
      record.group.position.set(item.position.x, item.position.y, item.position.z);
      const healing = /HEAL|POTION|CHARGE/i.test(item.kind || '');
      record.orb.material.color.setHex(healing ? 0x91f4b4 : 0xffd083);
      record.orb.material.emissive.setHex(healing ? 0x2d9454 : 0x936029);
      record.group.visible = item.state !== 'CLAIMED' && item.state !== 'DEPLETED';
    }
    for (const [id, record] of this.itemMeshes) {
      if (active.has(id)) continue;
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
      this.itemMeshes.delete(id);
    }
  }

  updatePortalMeshes(portals) {
    const active = new Set();
    for (const portal of portals) {
      if (!portal || typeof portal.id !== 'string' || !vectorOK(portal.position)) continue;
      active.add(portal.id);
      let record = this.portalMeshes.get(portal.id);
      if (!record) {
        const group = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.12, 12, 32),
          new THREE.MeshStandardMaterial({ color: 0x8debd8, emissive: 0x3fa899, emissiveIntensity: 1.6, roughness: 0.3 }));
        ring.position.y = 0.95;
        group.add(ring);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 32),
          new THREE.MeshBasicMaterial({ color: 0x4abbaa, transparent: true, opacity: 0.65 }));
        base.position.y = -0.47;
        const sill = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.11, 6, 28),
          new THREE.MeshStandardMaterial({ color: 0x77695f, roughness: 0.93 }));
        sill.rotation.x = -Math.PI / 2;
        sill.position.y = -0.43;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 1.45, 8),
          new THREE.MeshStandardMaterial({ color: 0x3f6670, emissive: 0x153b46, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.45 }));
        pillar.position.y = 0.2;
        const beacon = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 6),
          new THREE.MeshStandardMaterial({ color: 0xa2fff0, emissive: 0x49cbbb, emissiveIntensity: 2.2, transparent: true, opacity: 0.92 }));
        beacon.position.y = 1.48;
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 4),
          new THREE.MeshBasicMaterial({ color: 0xe8fff8, transparent: true, opacity: 0.9 }));
        arrow.rotation.x = Math.PI;
        arrow.position.y = -0.55;
        group.add(sill, base, pillar, beacon, arrow);
        const particlePositions = new Float32Array(18 * 3);
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
          color: 0xb8fff1, size: 0.14, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false
        }));
        group.add(particles);
        this.scene.add(group);
        record = { group, ring, base, beacon, arrow, particles };
        this.portalMeshes.set(portal.id, record);
      }
      record.group.position.set(portal.position.x, portal.position.y, portal.position.z);
      const sealed = portal.state !== 'AVAILABLE';
      record.ring.material.color.setHex(sealed ? 0x71848c : 0x8debd8);
      record.ring.material.emissive.setHex(sealed ? 0x242d3a : 0x3fa899);
      record.base.material.color.setHex(sealed ? 0x52606c : 0x4abbaa);
      record.base.material.opacity = sealed ? 0.35 : 0.65;
      record.beacon.material.color.setHex(sealed ? 0x71848c : 0xa2fff0);
      record.beacon.material.emissive.setHex(sealed ? 0x242d3a : 0x49cbbb);
      record.arrow.visible = !sealed;
      record.particles.visible = !sealed && !this.motionPreference?.matches;
    }
    for (const [id, record] of this.portalMeshes) {
      if (active.has(id)) continue;
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
      this.portalMeshes.delete(id);
    }
  }

  updateTrapMesh(trap) {
    if (!trap || !vectorOK(trap.position) || !Number.isFinite(trap.radius) || trap.state === 'CLEARED') {
      if (this.trapMesh) this.trapMesh.visible = false;
      if (this.trapWireMesh) this.trapWireMesh.visible = false;
      this.trapState = null;
      return;
    }
    if (!this.trapMesh) {
      this.trapMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 36),
        new THREE.MeshBasicMaterial({ color: 0xffb349, transparent: true, opacity: 0.45, depthWrite: false }));
      this.scene.add(this.trapMesh);
    }
    if (!this.trapWireMesh) {
      const wires = new THREE.Group();
      const material = new THREE.MeshBasicMaterial({ color: 0xffc16d, depthWrite: false, side: THREE.DoubleSide });
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.84, 0.94, 32), material);
      rim.rotation.x = -Math.PI / 2;
      const wireMeshes = [];
      const stakes = [];
      const stakeMaterial = new THREE.MeshStandardMaterial({ color: 0x806448, roughness: 0.74, metalness: 0.28,
        emissive: 0x281b0e, emissiveIntensity: 0.45 });
      const tipMaterial = new THREE.MeshBasicMaterial({ color: 0xffd291 });
      wires.add(rim);
      for (const side of [-1, 1]) {
        const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, 0.7, 7), stakeMaterial);
        stake.position.set(side * 0.78, 0.22, 0);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.045, 8), stakeMaterial);
        foot.position.set(side * 0.78, -0.13, 0);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), tipMaterial);
        tip.position.set(side * 0.78, 0.59, 0);
        wires.add(stake, foot, tip);
        stakes.push(stake, foot);
      }
      for (const height of [0.16, 0.34, 0.52]) {
        const wire = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.035, 0.035), material.clone());
        wire.position.y = height;
        wires.add(wire);
        wireMeshes.push(wire);
      }
      this.scene.add(wires);
      this.trapWireMesh = wires;
      this.trapWireParts = { wireMeshes, stakes, tips: wires.children.filter((child) => child.geometry?.type === 'SphereGeometry') };
    }
    this.trapMesh.visible = true;
    this.trapMesh.position.set(trap.position.x, -0.46, trap.position.z);
    const radius = THREE.MathUtils.clamp(trap.radius, 0.1, 10);
    this.trapMesh.scale.set(radius, 1, radius);
    this.trapWireMesh.visible = true;
    this.trapWireMesh.position.set(trap.position.x, -0.41, trap.position.z);
    this.trapWireMesh.scale.set(radius, 1, radius);
    this.trapState = trap.state;
    this.trapMesh.material.color.setHex(trap.state === 'ACTIVE' ? 0xff5d56 : 0xffb349);
    for (const wire of this.trapWireParts.wireMeshes) wire.material.color.setHex(trap.state === 'ACTIVE' ? 0xff5d56 : 0xffc16d);
    for (const stake of this.trapWireParts.stakes) stake.material.color.setHex(trap.state === 'ACTIVE' ? 0x75423e : 0x806448);
    for (const tip of this.trapWireParts.tips) tip.material.color.setHex(trap.state === 'ACTIVE' ? 0xff746c : 0xffd291);
  }

  reveal(nodeId) {
    if (this.revealed.has(nodeId)) return;
    const group = this.secretWalls.get(nodeId);
    if (!group) return;
    this.revealed.add(nodeId);
    for (const wall of Array.isArray(group) ? group : [group]) {
      wall.material.opacity = 0.08;
      wall.material.depthWrite = false;
      wall.material.needsUpdate = true;
      wall.visible = false;
    }
    const floors = this.secretFloors?.get(nodeId) ||
      (this.secretWalls.size === 1 && this.secretFloor ? [this.secretFloor] : []);
    for (const floor of Array.isArray(floors) ? floors : [floors]) floor.visible = this.currentSpaceId === 'entry';
  }

  playerMesh(id, displayName) {
    let record = this.playerMeshes.get(id);
    if (record) return record;
    const local = id === this.localPlayerId;
    const role = wayfarerRole(displayName, id);
    const palettes = {
      VANGUARD: { cloth: 0x303745, hood: 0x576158, accent: 0xa8785b },
      MAGE: { cloth: 0x3e354c, hood: 0x625f70, accent: 0x8c75a6 },
      SCOUT: { cloth: 0x344139, hood: 0x4e5b4f, accent: 0x7e8b76 },
      HEALER: { cloth: 0x485158, hood: 0x7a8589, accent: 0xa9b9c2 }
    };
    const palette = palettes[role];
    const group = new THREE.Group();
    const actor = new THREE.Group();
    group.add(actor);
    const opacityMaterials = [];
    const material = (color, options = {}) => {
      const surface = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.03,
        transparent: true, flatShading: true, ...options });
      opacityMaterials.push(surface);
      return surface;
    };
    const cloth = material(palette.cloth, { roughness: 0.98 });
    this.actorClothTexture ||= makeActorSurface(false);
    cloth.map = this.actorClothTexture;
    const leather = material(0x443d39, { roughness: 0.94 });
    const wornMetal = material(0x77695f, { roughness: 0.72, metalness: 0.28 });
    const roleAccent = material(palette.accent, { emissive: palette.accent, emissiveIntensity: 0.08 });
    const sharedBoot = new THREE.CylinderGeometry(0.13, 0.17, 0.58, 6);
    for (const side of [-1, 1]) {
      const boot = new THREE.Mesh(sharedBoot, leather);
      boot.position.set(side * 0.17, 0.08, 0);
      actor.add(boot);
    }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(role === 'VANGUARD' ? 0.43 : 0.34,
      role === 'VANGUARD' ? 0.5 : 0.42, role === 'VANGUARD' ? 0.88 : 0.96, 7), cloth);
    body.position.y = 0.72;
    actor.add(body);
    const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.13, 7),
      material(palette.cloth, { roughness: 1, side: THREE.DoubleSide }));
    cloak.position.y = 0.46;
    cloak.rotation.z = Math.PI;
    cloak.scale.x = role === 'VANGUARD' ? 1.18 : role === 'SCOUT' ? 0.86 : 1;
    actor.add(cloak);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
      material(palette.hood, { roughness: 0.92 }));
    hood.position.y = 1.49;
    hood.scale.set(role === 'VANGUARD' ? 1.12 : 0.96, role === 'MAGE' ? 1.12 : 0.92, 1);
    actor.add(hood);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.22),
      leather);
    pack.position.set(0, 0.96, -0.4);
    pack.rotation.z = role === 'SCOUT' ? -0.14 : 0.06;
    actor.add(pack);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(role === 'VANGUARD' ? 0.39 : 0.33, 0.035, 5, 12), leather);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.73;
    actor.add(belt);

    // Layered travelling clothes and articulated sleeves follow the cover's
    // practical, weathered expedition silhouettes. Reuse buffers per actor.
    const sleeveGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.42, 6);
    const gloveGeometry = new THREE.SphereGeometry(0.12, 7, 5);
    const panelGeometry = new THREE.ConeGeometry(0.22, 0.65, 4);
    const mantle = material(role === 'HEALER' ? 0xb0a99a : role === 'VANGUARD' ? 0x898477 : palette.hood,
      { roughness: 1 });
    for (const side of [-1, 1]) {
      for (let joint = 0; joint < 2; joint += 1) {
        const sleeve = new THREE.Mesh(sleeveGeometry, joint ? leather : cloth);
        sleeve.name = 'wayfarer-sleeve';
        sleeve.position.set(side * (0.4 + joint * 0.07), 1.13 - joint * 0.3, 0.08 + joint * 0.1);
        sleeve.rotation.z = side * (joint ? 0.22 : 0.38);
        actor.add(sleeve);
      }
      const glove = new THREE.Mesh(gloveGeometry, leather);
      glove.position.set(side * 0.49, 0.65, 0.22);
      actor.add(glove);
      const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25), mantle);
      shoulder.position.set(side * 0.34, 1.2, -0.02);
      shoulder.scale.set(1.15, 0.65, 1);
      actor.add(shoulder);
    }
    for (let panel = 0; panel < 5; panel += 1) {
      const hem = new THREE.Mesh(panelGeometry, panel % 2 ? leather : cloth);
      hem.name = 'wayfarer-layered-hem';
      const angle = panel * Math.PI * 2 / 5;
      hem.position.set(Math.sin(angle) * 0.34, 0.3 + (panel % 2) * 0.08, Math.cos(angle) * 0.34);
      hem.rotation.z = Math.PI;
      hem.rotation.y = angle;
      hem.scale.set(0.9, 1, 0.35);
      actor.add(hem);
    }
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.08), leather);
    face.name = 'wayfarer-hood-opening';
    face.position.set(0, 1.47, 0.24);
    actor.add(face);

    // A recessed face, open hood rim, repaired cloak, and packed bedroll read as
    // travelling people at game scale instead of helmets on conical counters.
    const skin = material(role === 'SCOUT' ? 0x8c7566 : 0xa28a79, { roughness: 0.94 });
    const visibleFace = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), skin);
    visibleFace.name = 'wayfarer-recessed-face';
    visibleFace.scale.set(0.82, 1.08, 0.45);
    visibleFace.position.set(0, 1.45, 0.293);
    actor.add(visibleFace);
    const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.045, 5, 12, Math.PI * 1.35), mantle);
    hoodRim.name = 'wayfarer-open-hood';
    hoodRim.rotation.z = -Math.PI * 0.175;
    hoodRim.position.set(0, 1.48, 0.225);
    actor.add(hoodRim);
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.59, 7), mantle);
    bedroll.name = 'wayfarer-bedroll';
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 1.23, -0.43);
    actor.add(bedroll);
    const harness = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.61, 0.055), leather);
    harness.name = 'wayfarer-diagonal-harness';
    harness.position.set(0.05, 0.99, 0.36);
    harness.rotation.z = -0.48;
    actor.add(harness);
    const foldGeometry = new THREE.ConeGeometry(0.09, 0.73, 4);
    for (let fold = 0; fold < 3; fold += 1) {
      const seam = new THREE.Mesh(foldGeometry, mantle);
      seam.name = 'wayfarer-cloak-fold';
      seam.position.set((fold - 1) * 0.2, 0.43 + fold * 0.035, -0.4);
      seam.scale.z = 0.25;
      seam.rotation.z = Math.PI + (fold - 1) * 0.12;
      actor.add(seam);
    }
    const shinGeometry = new THREE.BoxGeometry(0.17, 0.28, 0.075);
    for (const side of [-1, 1]) {
      const shin = new THREE.Mesh(shinGeometry, role === 'VANGUARD' ? wornMetal : leather);
      shin.name = 'wayfarer-shin-guard';
      shin.position.set(side * 0.17, 0.07, 0.14);
      actor.add(shin);
    }

    const roleParts = [];
    const addRolePart = (geometry, surface, position, rotation = {}) => {
      const part = new THREE.Mesh(geometry, surface);
      part.position.set(...position);
      Object.assign(part.rotation, rotation);
      actor.add(part);
      roleParts.push(part);
      return part;
    };
    if (role === 'VANGUARD') {
      addRolePart(new THREE.CylinderGeometry(0.43, 0.43, 0.11, 9), wornMetal,
        [-0.52, 0.78, 0.08], { z: Math.PI / 2 });
      addRolePart(new THREE.CylinderGeometry(0.035, 0.055, 0.98, 6), leather,
        [0.48, 0.77, 0.04], { z: -0.14 });
      addRolePart(new THREE.BoxGeometry(0.34, 0.22, 0.1), wornMetal, [0.55, 1.18, 0.04], { z: -0.14 });
    } else if (role === 'MAGE') {
      addRolePart(new THREE.CylinderGeometry(0.035, 0.06, 1.4, 6), leather,
        [0.51, 0.78, 0.02], { z: -0.11 });
      addRolePart(new THREE.SphereGeometry(0.13, 8, 6), roleAccent, [0.44, 1.5, 0.02]);
      addRolePart(new THREE.ConeGeometry(0.19, 0.42, 6), material(0x332d3d, { roughness: 1 }), [0, 1.76, -0.02], { z: -0.12 });
    } else if (role === 'SCOUT') {
      addRolePart(new THREE.TorusGeometry(0.42, 0.035, 5, 16, Math.PI * 1.48), wornMetal,
        [0.48, 0.92, 0.09], { z: -0.72 });
      addRolePart(new THREE.CylinderGeometry(0.03, 0.04, 0.92, 5), leather,
        [-0.3, 1.04, -0.39], { z: -0.3 });
      addRolePart(new THREE.BoxGeometry(0.25, 0.56, 0.18), roleAccent, [-0.28, 1.04, -0.42], { z: -0.18 });
    } else {
      addRolePart(new THREE.BoxGeometry(0.43, 0.3, 0.18), roleAccent, [0.43, 0.72, 0.12], { z: -0.1 });
      addRolePart(new THREE.CylinderGeometry(0.07, 0.08, 0.28, 7), material(0x889c95, { roughness: 0.65 }),
        [-0.43, 0.78, 0.11], { z: 0.08 });
      addRolePart(new THREE.TorusGeometry(0.13, 0.028, 5, 12), wornMetal, [-0.31, 1.17, 0.2], { x: Math.PI / 2 });
    }

    // The local explorer uses sky blue while portal light stays sea green.
    // This cue remains legible when the actor and the beacon occupy one tile.
    const identityMaterial = new THREE.MeshBasicMaterial({ color: local ? 0x91cfff : 0xb38a72, transparent: true });
    opacityMaterials.push(identityMaterial);
    const identity = new THREE.Mesh(new THREE.SphereGeometry(local ? 0.095 : 0.075, 7, 5), identityMaterial);
    identity.position.set(0, 1.05, 0.34);
    actor.add(identity);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.055, 6, 24), identityMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.41;
    group.add(ring);
    let localMarker = null;
    if (local) {
      localMarker = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 3),
        new THREE.MeshBasicMaterial({ color: 0xc3e4ff, depthTest: false, depthWrite: false }));
      localMarker.name = 'local-player-marker';
      localMarker.rotation.z = Math.PI;
      localMarker.position.y = 2.25;
      localMarker.renderOrder = 4;
      group.add(localMarker);
    }
    const strikeArc = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 5, 18, Math.PI * 0.78),
      new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.9, depthWrite: false,
        depthTest: false, side: THREE.DoubleSide }));
    strikeArc.position.set(0, 0.95, 0.64);
    strikeArc.visible = false;
    strikeArc.renderOrder = 3;
    actor.add(strikeArc);
    group.scale.setScalar(1.18);
    this.scene.add(group);
    record = { group, actor, body, identity, role, roleParts, strikeArc, localMarker, opacityMaterials, displayName };
    this.playerMeshes.set(id, record);
    return record;
  }

  enemyMesh(id, kind = 'SENTINEL') {
    let record = this.enemyMeshes.get(id);
    if (record?.kind === kind) return record;
    if (record) {
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
      this.enemyMeshes.delete(id);
    }
    const group = new THREE.Group();
    const flightRig = kind === 'BARKWING' ? new THREE.Group() : null;
    const actor = flightRig || group;
    this.actorBarkTexture ||= makeActorSurface(true);
    if (flightRig) group.add(flightRig);
    const palette = kind === 'BARKWING' ? [0x4b5048, 0x171920, 0xa8785b]
      : kind === 'DEEPWOOD_SENTINEL' ? [0x343a36, 0x1b211f, 0xa8785b]
      : kind === 'ROOTLING' ? [0x4e5b4f, 0x232a25, 0xa8785b]
      : kind === 'THRESHOLD_KEEPER' ? [0x9f6040, 0x572819, 0xffc37f]
      : kind === 'MIRROR_HEXER' ? [0x7752b3, 0x30205f, 0xdab8ff]
        : kind === 'SHARDLING' ? [0x8b8fbc, 0x333b72, 0xb7d5ff]
          : kind === 'FLOOR_THREE_MOB' ? [0x72985e, 0x294f29, 0xd2f6a0]
          : kind === 'WARDEN' || kind === 'SHIFTING_CORE_WARDEN' ? [0x4d7c86, 0x184655, 0x9ff6e9]
            : kind === 'SENTINEL' ? [0xb94357, 0x5b172c, 0xffd29a]
              : [0x8197a3, 0x30495a, 0xd8edf7];
    const geometry = kind === 'BARKWING' ? new THREE.DodecahedronGeometry(0.4)
      : kind === 'DEEPWOOD_SENTINEL' ? new THREE.CylinderGeometry(0.72, 1.02, 2.15, 8)
      : kind === 'ROOTLING' ? new THREE.DodecahedronGeometry(0.48)
      : kind === 'MIRROR_HEXER' ? new THREE.OctahedronGeometry(0.85)
      : kind === 'THRESHOLD_KEEPER' ? new THREE.DodecahedronGeometry(0.88)
        : kind === 'FLOOR_THREE_MOB' ? new THREE.TetrahedronGeometry(0.72)
        : kind === 'WARDEN' || kind === 'SHIFTING_CORE_WARDEN' ? new THREE.IcosahedronGeometry(1.15, 1)
          : kind === 'SHARDLING' ? new THREE.ConeGeometry(0.36, 0.9, 6)
            : new THREE.ConeGeometry(0.58, 1.5, 8);
    const body = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: palette[0], emissive: palette[1], emissiveIntensity: kind === 'BARKWING' ? 0.3 : 1.2,
        roughness: kind === 'BARKWING' ? 0.95 : 0.4, metalness: kind === 'BARKWING' ? 0.05 : 0.3 })
    );
    if (['BARKWING', 'DEEPWOOD_SENTINEL', 'ROOTLING'].includes(kind)) body.material.map = this.actorBarkTexture;
    body.position.y = kind === 'SHARDLING' ? 0.35 : kind === 'ROOTLING' ? 0.4
      : kind === 'DEEPWOOD_SENTINEL' ? 0.88 : 0.72;
    if (kind === 'BARKWING') body.scale.set(0.72, 1.25, 1.4);
    actor.add(body);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(kind === 'BARKWING' ? 0.095 : 0.22, 12, 8), new THREE.MeshBasicMaterial({ color: palette[2] }));
    eye.position.set(0, kind === 'SHARDLING' ? 0.86 : kind === 'ROOTLING' ? 0.76
      : kind === 'DEEPWOOD_SENTINEL' ? 1.18 : 1.34, kind === 'DEEPWOOD_SENTINEL' ? 0.69 : 0.29);
    actor.add(eye);
    if (kind === 'SENTINEL' || kind === 'DEEPWOOD_SENTINEL') {
      // Bark and antler shapes make the first enemy readable at phone scale.
      const bark = new THREE.MeshStandardMaterial({ color: 0x695343, roughness: 1 });
      bark.map = this.actorBarkTexture;
      const crownHeight = kind === 'DEEPWOOD_SENTINEL' ? 2.1 : 1.58;
      for (const side of [-1, 1]) {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.14, kind === 'DEEPWOOD_SENTINEL' ? 1.45 : 1.15, 6), bark);
        branch.position.set(side * (kind === 'DEEPWOOD_SENTINEL' ? 0.65 : 0.48), crownHeight, 0);
        branch.rotation.z = side * -0.55;
        group.add(branch);
        const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.075, 0.58, 5), bark);
        fork.position.set(side * (kind === 'DEEPWOOD_SENTINEL' ? 1.02 : 0.73),
          kind === 'DEEPWOOD_SENTINEL' ? 2.54 : 1.94, 0.02);
        fork.rotation.z = side * 0.6;
        group.add(fork);
      }
      if (kind === 'DEEPWOOD_SENTINEL') {
        const moss = new THREE.MeshStandardMaterial({ color: 0x4e5b4f, roughness: 1 });
        for (const side of [-1, 1]) {
          const root = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.35, 6), bark);
          root.position.set(side * 0.72, -0.04, 0);
          root.rotation.z = side * 1.03;
          group.add(root);
          const shoulder = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.82, 7), moss);
          shoulder.position.set(side * 0.67, 1.33, 0.04);
          shoulder.rotation.z = side * 0.72;
          group.add(shoulder);
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.25, 1.25, 7), bark);
          arm.position.set(side * 0.91, 0.96, 0.03);
          arm.rotation.z = side * 0.91;
          group.add(arm);
        }
        const breastplate = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.54, 0.16), bark);
        breastplate.position.set(0, 1.34, 0.69);
        breastplate.rotation.z = -0.08;
        group.add(breastplate);
        // Overlapping bark scales interrupt the cylindrical trunk. Bright
        // edges, a recessed face, and branching fingers replace the totem read.
        const barkEdge = new THREE.MeshStandardMaterial({ color: 0x94775e, roughness: 0.96, flatShading: true });
        barkEdge.map = this.actorBarkTexture;
        const barkPlate = new THREE.CylinderGeometry(0.16, 0.3, 1.15, 5);
        for (let index = 0; index < 12; index += 1) {
          const angle = index * Math.PI / 3;
          const plate = new THREE.Mesh(barkPlate, index % 3 ? barkEdge : bark);
          plate.name = 'sentinel-bark-layer';
          plate.position.set(Math.sin(angle) * 0.95, 0.6 + Math.floor(index / 6) * 0.68,
            Math.cos(angle) * 0.88);
          plate.rotation.y = angle;
          plate.rotation.z = index % 2 ? 0.16 : -0.16;
          plate.scale.set(0.95, 1, 0.38);
          group.add(plate);
        }
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.47, 0.95, 5), bark);
        head.name = 'sentinel-branch-mask';
        head.position.set(0, 2.02, 0.27);
        head.rotation.z = Math.PI;
        group.add(head);
        eye.visible = false;
        const eyeGeometry = new THREE.BoxGeometry(0.065, 0.26, 0.045);
        const amber = new THREE.MeshBasicMaterial({ color: 0xffb75b });
        for (const side of [-1, 1]) {
          const slit = new THREE.Mesh(eyeGeometry, amber);
          slit.position.set(side * 0.13, 2.05, 0.62);
          slit.rotation.z = side * -0.22;
          group.add(slit);
          const forkGeometry = new THREE.CylinderGeometry(0.025, 0.075, 0.65, 5);
          for (let twig = 0; twig < 2; twig += 1) {
            const fork = new THREE.Mesh(forkGeometry, barkEdge);
            fork.position.set(side * (0.89 + twig * 0.3), 2.76 + twig * 0.14, -0.09);
            fork.rotation.z = side * (twig ? -0.5 : 0.65);
            group.add(fork);
          }
          for (let finger = 0; finger < 3; finger += 1) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.58, 5), barkEdge);
            claw.position.set(side * (1.3 + finger * 0.09), 0.45 - finger * 0.04, 0.05 + finger * 0.14);
            claw.rotation.z = side * 0.35;
            group.add(claw);
          }
        }
      }
    }
    if (kind === 'ROOTLING') {
      const rootMaterial = new THREE.MeshStandardMaterial({ color: 0x343a36, roughness: 1 });
      for (let index = 0; index < 3; index += 1) {
        const root = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.72, 5), rootMaterial);
        root.position.set(Math.cos(index * Math.PI * 2 / 3) * 0.42, 0,
          Math.sin(index * Math.PI * 2 / 3) * 0.42);
        root.rotation.z = Math.PI / 2;
        root.rotation.y = index * Math.PI * 2 / 3;
        group.add(root);
      }
      const leafCrown = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.36, 7),
        new THREE.MeshStandardMaterial({ color: 0x4e5b4f, roughness: 1, flatShading: true }));
      leafCrown.position.y = 0.86;
      group.add(leafCrown);
      const leafGeometry = new THREE.ConeGeometry(0.2, 0.62, 4);
      for (let index = 0; index < 5; index += 1) {
        const angle = index * Math.PI * 2 / 5;
        const leaf = new THREE.Mesh(leafGeometry, rootMaterial);
        leaf.name = 'rootling-mantle';
        leaf.position.set(Math.sin(angle) * 0.35, 0.64, Math.cos(angle) * 0.35);
        leaf.rotation.z = Math.PI + Math.sin(angle) * 0.4;
        leaf.rotation.y = angle;
        leaf.scale.z = 0.3;
        group.add(leaf);
      }
      eye.scale.set(0.42, 0.48, 0.45);
      eye.position.x = -0.13;
      const secondEye = new THREE.Mesh(eye.geometry, eye.material);
      secondEye.position.set(0.13, eye.position.y, eye.position.z);
      secondEye.scale.copy(eye.scale);
      group.add(secondEye);
    }
    const ringRadius = kind === 'SHARDLING' || kind === 'ROOTLING' ? 0.52
      : kind === 'DEEPWOOD_SENTINEL' ? 1.2 : 0.73;
    if (kind === 'DEEPWOOD_SENTINEL') {
      // Curved root spars and a broken leafy canopy give the guardian a grown
      // silhouette. These surfaces follow the existing actor transform only.
      const weatheredBark = new THREE.MeshStandardMaterial({ color: 0x776253, roughness: 0.98,
        map: this.actorBarkTexture, flatShading: true });
      const canopy = new THREE.MeshStandardMaterial({ color: 0x485347, roughness: 1,
        map: this.actorBarkTexture, side: THREE.DoubleSide, flatShading: true });
      const addBranch = (from, to, baseRadius, tipRadius) => {
        const delta = { x: to[0] - from[0], y: to[1] - from[1], z: to[2] - from[2] };
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(tipRadius, baseRadius, Math.hypot(delta.x, delta.y, delta.z), 6), weatheredBark);
        limb.name = 'sentinel-grown-branch';
        limb.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
        limb.rotation.z = -Math.atan2(delta.x, delta.y);
        limb.rotation.x = Math.atan2(delta.z, Math.sqrt(delta.x * delta.x + delta.y * delta.y));
        group.add(limb);
      };
      for (const side of [-1, 1]) {
        const asymmetry = side < 0 ? 0.14 : -0.07;
        addBranch([side * 0.48, 1.25, -0.18], [side * 1.04, 1.05 + asymmetry, 0.02], 0.27, 0.18);
        addBranch([side * 1.04, 1.05 + asymmetry, 0.02], [side * 1.30, 0.48, 0.30], 0.19, 0.11);
        addBranch([side * 0.48, 1.66, -0.2], [side * 0.86, 2.37 + asymmetry, -0.23], 0.18, 0.09);
        addBranch([side * 0.86, 2.37 + asymmetry, -0.23], [side * 1.39, 2.75, -0.14], 0.09, 0.015);
        addBranch([side * 0.38, 0.16, 0.0], [side * 0.85, -0.30, 0.47], 0.24, 0.04);
        for (let leafIndex = 0; leafIndex < 4; leafIndex += 1) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.65, 4), canopy);
          leaf.name = 'sentinel-torn-canopy';
          leaf.scale.z = 0.18;
          leaf.position.set(side * (0.53 + leafIndex * 0.19), 2.12 + leafIndex * 0.12, -0.18);
          leaf.rotation.z = side * (0.70 + leafIndex * 0.18);
          leaf.rotation.x = 0.3;
          group.add(leaf);
        }
      }
      body.material.roughness = 0.98;
      body.material.metalness = 0.01;
      body.material.emissiveIntensity = 0.18;
      // A towering trunk without expanding authoritative horizontal reach.
      for (const part of group.children) {
        part.position.y = (part.position.y + 0.4) * 1.4 - 0.4;
        part.scale.y *= 1.4;
      }
    }
    // Hostile rust surrounds the root mass; gold is reserved for the selected
    // target, and neither can be mistaken for the portal's sea-green light.
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.09, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xc77b60 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.43;
    ring.visible = kind !== 'BARKWING';
    group.add(ring);
    const wings = [];
    if (kind === 'BARKWING') {
      // Procedural gameplay prototype based on the canonical title cover's bark
      // splinters and ragged leaf wings. This does not replace approved art.
      // ShapeGeometry and mirrored child Groups follow the Three.js r186 APIs:
      // https://threejs.org/docs/pages/ShapeGeometry.html
      // https://threejs.org/docs/pages/Group.html
      const outline = [[0, 0.12], [0.56, 0.6], [1.6, 0.86], [1.32, 0.35],
        [1.76, 0.09], [1.1, -0.08], [1.39, -0.43], [0.76, -0.3], [0.43, -0.63], [0, -0.26]];
      const shape = new THREE.Shape();
      outline.forEach(([x, y], index) => index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
      shape.closePath();
      const membraneGeometry = new THREE.ShapeGeometry(shape);
      const membraneMaterial = new THREE.MeshStandardMaterial({ color: 0x535a4b, roughness: 1, metalness: 0,
        side: THREE.DoubleSide, flatShading: true });
      membraneMaterial.map = this.actorBarkTexture;
      const sparMaterial = new THREE.MeshStandardMaterial({ color: 0x37373a, roughness: 0.95 });
      const sparParts = [[1.7, -1.16, -0.18], [1.35, -1.72, 0.09]];
      const sparGeometries = sparParts.map(([length]) => new THREE.ConeGeometry(0.07, length, 5));
      const featherGeometry = new THREE.ConeGeometry(0.18, 0.88, 4);
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.2, 0.82, 0);
        pivot.scale.x = side;
        const membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
        membrane.rotation.x = -0.45;
        pivot.add(membrane);
        for (let feather = 0; feather < 4; feather += 1) {
          const leaf = new THREE.Mesh(featherGeometry, feather % 2 ? membraneMaterial : sparMaterial);
          leaf.name = 'barkwing-layered-flight-leaf';
          leaf.position.set(0.48 + feather * 0.29, 0.12 - feather * 0.06, 0.03);
          leaf.rotation.z = -0.6 - feather * 0.22;
          leaf.rotation.x = -0.45;
          leaf.scale.set(1, 1.15 - feather * 0.1, 0.24);
          pivot.add(leaf);
        }
        for (const [index, [length, angle, z]] of sparParts.entries()) {
          const spar = new THREE.Mesh(sparGeometries[index], sparMaterial);
          spar.rotation.z = angle;
          spar.rotation.y = -0.18;
          spar.position.set(length * 0.45, 0.055, z);
          pivot.add(spar);
        }
        actor.add(pivot);
        wings.push({ pivot, side });
      }
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.85, 5),
        new THREE.MeshStandardMaterial({ color: 0x37373a, roughness: 1 }));
      tail.rotation.x = Math.PI / 2;
      tail.position.set(0, 0.52, -0.53);
      actor.add(tail);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 5),
        new THREE.MeshStandardMaterial({ color: 0x77695f, roughness: 0.72, metalness: 0.12, flatShading: true }));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.72, 0.54);
      actor.add(beak);
    }
    let shadow = null;
    let diveHalo = null;
    if (kind === 'BARKWING') {
      shadow = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.22, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x090b0f, transparent: true, opacity: 0.34, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.4;
      shadow.scale.set(1.35, 0.82, 1);
      group.add(shadow);
      diveHalo = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.045, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0xc98b68, transparent: true, opacity: 0.85, depthTest: false }));
      diveHalo.rotation.x = Math.PI / 2;
      diveHalo.position.y = 0.7;
      diveHalo.visible = false;
      actor.add(diveHalo);
    }
    const selection = new THREE.Mesh(new THREE.TorusGeometry(ringRadius + 0.24, 0.095, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe4a2, depthTest: false, depthWrite: false }));
    selection.rotation.x = -Math.PI / 2;
    selection.position.y = -0.35;
    selection.visible = false;
    selection.renderOrder = 2;
    group.add(selection);
    this.scene.add(group);
    record = { group, actor, flightRig, body, kind, selection, wings, shadow, diveHalo,
      warningActive: false, baseEmissive: palette[1] };
    this.enemyMeshes.set(id, record);
    return record;
  }

  // Only child-wing rotation changes. Server altitude, ground projection, and
  // hit resolution remain unchanged; reduced motion keeps the flight silhouette.
  animateBarkwing(record, time) {
    if (record.kind !== 'BARKWING') return;
    const reduced = this.motionPreference?.matches;
    const warning = Boolean(record.warningActive);
    const flapRate = warning ? 12 : 7;
    const flap = reduced ? 0.12 : 0.12 + Math.sin(time * flapRate) * (warning ? 0.4 : 0.28);
    for (let index = 0; index < record.wings.length; index += 1) {
      const wing = record.wings[index];
      wing.pivot.rotation.z = wing.side * flap;
    }
    if (record.flightRig) {
      record.flightRig.position.y = reduced ? 0.04 : Math.sin(time * (warning ? 5.2 : 2.8)) * (warning ? 0.04 : 0.1);
      record.flightRig.rotation.x = warning ? -0.42 : reduced ? 0 : Math.sin(time * 1.7) * 0.045;
    }
    if (record.diveHalo) {
      record.diveHalo.visible = warning;
      const pulse = reduced ? 1 : 1 + (Math.sin(time * 10) + 1) * 0.08;
      record.diveHalo.scale.set(pulse, pulse, pulse);
    }
  }

  // The server's confirmed damage total triggers a brief actor cue. It cannot
  // choose a target or change attack timing, and reduced motion keeps a still arc.
  animateWayfarer(id, record, now) {
    const remaining = (this.playerStrikeUntil?.get(id) || 0) - now;
    const active = remaining > 0 && record.actor.rotation.z === 0;
    record.strikeArc.visible = active;
    if (!active) { record.actor.position.z = 0; return; }
    const progress = 1 - remaining / 260;
    const reduced = this.motionPreference?.matches;
    record.strikeArc.rotation.z = reduced ? -0.12 : -0.65 + progress * 1.1;
    record.actor.position.z = reduced ? 0 : Math.sin(progress * Math.PI) * 0.16;
  }

  samplePlayers(now) {
    if (!this.snapshots.length) return;
    const target = now - INTERPOLATION_DELAY_MS;
    let older = this.snapshots[0];
    let newer = this.snapshots[this.snapshots.length - 1];
    for (let i = 0; i < this.snapshots.length - 1; i += 1) {
      if (this.snapshots[i].at <= target && this.snapshots[i + 1].at >= target) {
        older = this.snapshots[i];
        newer = this.snapshots[i + 1];
        break;
      }
    }
    if (target < older.at) newer = older;
    const alpha = older === newer ? 0 : THREE.MathUtils.clamp((target - older.at) / Math.max(1, newer.at - older.at), 0, 1);
    const latest = this.snapshots[this.snapshots.length - 1];
    const activeIds = new Set(Object.keys(latest.snapshot.players));
    for (const id of activeIds) {
      const a = older.snapshot.players[id] || latest.snapshot.players[id];
      const b = newer.snapshot.players[id] || latest.snapshot.players[id];
      if (!vectorOK(a?.transform?.position) || !vectorOK(b?.transform?.position)) continue;
      const record = this.playerMesh(id, b.displayName);
      const targetPosition = new THREE.Vector3().copy(a.transform.position).lerp(b.transform.position, alpha);
      if (id === this.localPlayerId && latest.snapshot.phase === 'RUNNING') {
        // Bounded local prediction hides the 30 Hz step; authoritative snapshots
        // pull the avatar back if the server rejects movement at a collider.
        const predictionSeconds = Math.min(MAX_EXTRAPOLATION_MS, Math.max(0, now - latest.at)) / 1000;
        targetPosition.copy(latest.snapshot.players[id].transform.position);
        targetPosition.x += this.input.x * MOVE_SPEED * predictionSeconds;
        targetPosition.z += this.input.z * MOVE_SPEED * predictionSeconds;
        record.group.position.lerp(targetPosition, 0.34);
      } else {
        record.group.position.copy(targetPosition);
      }
      const rotation = b.transform.rotation?.y;
      if (Number.isFinite(rotation)) record.group.rotation.y = rotation;
      const connected = b.connection === 'CONNECTED' || b.connection === 'BOT';
      for (const surface of record.opacityMaterials || [record.body.material]) surface.opacity = connected ? 1 : 0.34;
      if (record.localMarker) record.localMarker.visible = connected;
      const downed = Number.isFinite(b.downedAtTick) || b.health?.current <= 0;
      record.actor.rotation.z = downed ? -Math.PI / 2 : 0;
      record.actor.position.y = downed ? -0.18 : 0;
    }
    for (const [id, record] of this.playerMeshes) {
      if (activeIds.has(id)) continue;
      this.scene.remove(record.group);
      record.group.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose();
      });
      this.playerMeshes.delete(id);
    }
    const latestEnemies = latest.snapshot.enemies || {};
    const activeEnemyIds = new Set(Object.keys(latestEnemies));
    for (const id of activeEnemyIds) {
      const a = older.snapshot.enemies?.[id] || latestEnemies[id];
      const b = newer.snapshot.enemies?.[id] || latestEnemies[id];
      if (!vectorOK(a?.transform?.position) || !vectorOK(b?.transform?.position)) continue;
      const record = this.enemyMesh(id, b.kind || 'SENTINEL');
      record.group.position.copy(new THREE.Vector3().copy(a.transform.position).lerp(b.transform.position, alpha));
      record.group.rotation.y = Number.isFinite(b.transform.rotation?.y) ? b.transform.rotation.y : 0;
      record.group.visible = latestEnemies[id].state !== 'DEFEATED';
      record.selection.visible = id === this.selectedEnemyId && latestEnemies[id].health?.current > 0;
      if (record.kind === 'BARKWING') {
        record.warningActive = (latest.snapshot.warnings || []).some((warning) =>
          warning?.id === `warning-${id}` && warning.kind === 'BARKWING_DIVE');
        // The impact pulse scales the actor group, including this child marker.
        // Compensate in local space so the selected ground plane stays fixed.
        record.selection.position.y = (-0.35 - record.group.position.y) / record.group.scale.y;
        if (record.shadow) record.shadow.position.y = (-0.39 - record.group.position.y) / record.group.scale.y;
      }
    }
    for (const [id, record] of this.enemyMeshes) {
      if (activeEnemyIds.has(id)) continue;
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
      this.enemyMeshes.delete(id);
    }
    const local = this.playerMeshes.get(this.localPlayerId);
    if (local) this.updateCamera(local.group.position);
  }

  start() {
    if (this.animationId || this.contextLost) return;
    const frame = (timestamp) => {
      this.animationId = null;
      try {
        this.timer.update(timestamp);
        const time = this.timer.getElapsed();
        this.dynamicLights.forEach((light, index) => { light.intensity = 8.5 + Math.sin(time * 1.7 + index * 1.4) * 0.9; });
        if (this.trapMesh?.visible) {
          this.trapMesh.material.opacity = this.trapState === 'TELEGRAPHED'
            ? 0.3 + (Math.sin(time * 12) + 1) * 0.15 : 0.56;
        }
        for (const record of this.warningMeshes.values()) {
          record.disc.material.opacity = 0.22 + (Math.sin(time * 10) + 1) * 0.12;
        }
        for (const record of this.portalMeshes.values()) {
          if (!record.beacon) continue;
          const pulse = 1 + (Math.sin(time * 4.5) + 1) * 0.08;
          record.beacon.scale.set(pulse, 1 + (pulse - 1) * 1.6, pulse);
          record.arrow.position.y = -0.55 + Math.sin(time * 3.2) * 0.06;
          if (record.particles?.visible && !this.motionPreference?.matches) {
            const positions = record.particles.geometry.attributes.position;
            for (let index = 0; index < positions.count; index += 1) {
              const phase = time * 0.75 + index * 2.399;
              const height = ((time * 0.48 + index / positions.count * 2.3) % 2.3) - 0.2;
              positions.setXYZ(index, Math.cos(phase) * (0.78 + index % 3 * 0.12), height,
                Math.sin(phase) * (0.78 + index % 3 * 0.12));
            }
            positions.needsUpdate = true;
          }
        }
        for (const record of this.itemMeshes.values()) record.orb.rotation.y += 0.012;
        for (const [id, record] of this.enemyMeshes) {
          this.animateBarkwing(record, time);
          const hit = this.enemyImpactUntil.get(id) > performance.now();
          record.body.material.emissive.setHex(hit ? 0xffb36e : record.baseEmissive);
          record.group.scale.setScalar(hit ? 1.1 : 1);
        }
        this.container.classList.toggle('damage-active', performance.now() < this.damageFlashUntil);
        this.samplePlayers(performance.now());
        for (const [id, record] of this.playerMeshes) this.animateWayfarer(id, record, performance.now());
        this.renderer.render(this.scene, this.camera);
        if (!this.hasRendered) {
          this.container.classList.add('webgl-ready');
          this.hasRendered = true;
          this.graphicsState = 'ready';
          this.container.dispatchEvent(new CustomEvent('graphics-state', { detail: { state: 'ready' } }));
        }
        this.animationId = requestAnimationFrame(frame);
      } catch (error) {
        this.container.classList.remove('webgl-ready');
        this.graphicsState = 'error';
        this.container.dispatchEvent(new CustomEvent('graphics-state', { detail: { state: 'error' } }));
      }
    };
    frame();
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  dispose() {
    this.contextLost = true;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.timer.dispose();
    this.scene.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
    this.flagstoneTexture?.dispose();
    this.pillarTexture?.dispose();
    this.actorBarkTexture?.dispose();
    this.actorClothTexture?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

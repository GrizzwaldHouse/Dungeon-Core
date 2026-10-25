// render.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Turn server-approved room snapshots into smooth WebGL visuals without owning game rules.

import * as THREE from 'three';

const INTERPOLATION_DELAY_MS = 100;
const MAX_EXTRAPOLATION_MS = 80;
const MOVE_SPEED = 5;
const vectorOK = (v) => v && ['x', 'y', 'z'].every((axis) => Number.isFinite(v[axis]));

export class DungeonRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090f1b);
    this.scene.fog = new THREE.FogExp2(0x090f1b, 0.018);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 130);
    this.camera.position.set(0, 14, 19);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    container.append(this.renderer.domElement);
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.snapshots = [];
    this.playerMeshes = new Map();
    this.enemyMeshes = new Map();
    this.warningMeshes = new Map();
    this.itemMeshes = new Map();
    this.runeMeshes = new Map();
    this.lastEnemyHealth = new Map();
    this.enemyImpactUntil = new Map();
    this.lastLocalHealth = null;
    this.damageFlashUntil = 0;
    this.secretWalls = new Map();
    this.secretFloors = new Map();
    this.spaceMeshes = [];
    this.currentSpaceId = 'entry';
    this.portalMeshes = new Map();
    this.trapMesh = null;
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
    this.scene.add(new THREE.HemisphereLight(0x93c9ff, 0x101526, 2.3));
    const moon = new THREE.DirectionalLight(0xd6e6ff, 2.5);
    moon.position.set(8, 22, 6);
    this.scene.add(moon);
    this.dynamicLights = [
      [0xffa760, -11, 4, -11, 30],
      [0x7dd8ff, 11, 4, -11, 25],
      [0xaa85ff, 0, 5, 11, 35],
      [0x54ffbb, -12, 3, 0, 18]
    ].map(([color, x, y, z, distance]) => {
      const light = new THREE.PointLight(color, 15, distance, 2);
      light.position.set(x, y, z);
      this.scene.add(light);
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), new THREE.MeshBasicMaterial({ color }));
      orb.position.copy(light.position);
      this.scene.add(orb);
      return light;
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x293548, roughness: 0.91, metalness: 0.12 }));
    this.mainFloorMaterial = floor.material;
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.58;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(40, 40, 0x3d5d78, 0x344458);
    grid.position.y = -0.565;
    this.scene.add(grid);
    const stone = new THREE.MeshStandardMaterial({ color: 0x34445b, roughness: 0.84, metalness: 0.2 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x8f754e, roughness: 0.55, metalness: 0.55 });
    const amberStone = new THREE.MeshStandardMaterial({ color: 0xa66c39, roughness: 0.66, metalness: 0.22 });
    const violetStone = new THREE.MeshStandardMaterial({ color: 0x6d57a0, roughness: 0.6, metalness: 0.3 });
    const addBox = (w, h, d, x, y, z, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      return mesh;
    };
    const secretFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x184f4a, emissive: 0x0b2927, emissiveIntensity: 0.55 });
    const singleDiscoveryId = layout.world?.discoveryNodes?.length === 1 ? layout.world.discoveryNodes[0].id : null;
    for (const entry of layout.objects) {
      // Each secret wall owns its material so revealing one node cannot change another chamber.
      const material = entry.kind === 'secret-wall'
        ? new THREE.MeshStandardMaterial({ color: 0x766096, roughness: 0.4, metalness: 0.18, transparent: true, opacity: 1, depthWrite: true })
        : entry.kind === 'secret-floor' ? secretFloorMaterial : entry.spaceId === 'amber-vault' ? amberStone
          : entry.spaceId === 'violet-vault' ? violetStone : entry.kind === 'column' ? trim : stone;
      const mesh = addBox(entry.size.x, entry.size.y, entry.size.z, entry.position.x, entry.position.y, entry.position.z, material);
      this.spaceMeshes.push({ mesh, spaceId: entry.spaceId || 'entry', kind: entry.kind,
        revealNodeId: entry.revealNodeId || (entry.kind === 'secret-floor' ? singleDiscoveryId : null) });
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
  setInput(x, z) { this.input = { x, z }; }

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
    this.lastLocalHealth = null;
    this.damageFlashUntil = 0;
    this.container?.classList?.remove('damage-active');
    for (const record of this.portalMeshes?.values() || []) {
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
    }
    this.portalMeshes?.clear();
    if (this.trapMesh) this.trapMesh.visible = false;
    this.trapState = null;
  }

  pushSnapshot(snapshot, receivedAt) {
    if (!snapshot || typeof snapshot.players !== 'object') return;
    this.lastEnemyHealth ||= new Map();
    this.enemyImpactUntil ||= new Map();
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
        if (vectorOK(localPosition)) this.camera.position.set(localPosition.x, localPosition.y + 13, localPosition.z + 17);
        const stage = snapshot.floor?.phase;
        const backdrop = stage === 'REST' ? 0x14251e : stage === 'FLOOR_TWO' ? 0x231711 :
          stage === 'FLOOR_THREE' ? 0x11221c : stage === 'FLOOR_FOUR' ? 0x111d2e :
            stage === 'FLOOR_FIVE' ? 0x251322 : space.id === 'amber-vault' ? 0x221b16 :
              space.id === 'violet-vault' ? 0x181526 : 0x090f1b;
        const floor = stage === 'REST' ? 0x294b3b : stage === 'FLOOR_TWO' ? 0x493426 :
          stage === 'FLOOR_THREE' ? 0x244536 : stage === 'FLOOR_FOUR' ? 0x2b3b56 :
            stage === 'FLOOR_FIVE' ? 0x503049 : space.id === 'amber-vault' ? 0x493a2d :
              space.id === 'violet-vault' ? 0x372d4e : 0x293548;
        this.scene.background.setHex(backdrop);
        this.scene.fog.color.setHex(backdrop);
        this.mainFloorMaterial.color.setHex(floor);
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
        group.add(base);
        this.scene.add(group);
        record = { group, ring, base };
        this.portalMeshes.set(portal.id, record);
      }
      record.group.position.set(portal.position.x, portal.position.y, portal.position.z);
      const sealed = portal.state !== 'AVAILABLE';
      record.ring.material.color.setHex(sealed ? 0x71848c : 0x8debd8);
      record.ring.material.emissive.setHex(sealed ? 0x242d3a : 0x3fa899);
      record.base.material.color.setHex(sealed ? 0x52606c : 0x4abbaa);
      record.base.material.opacity = sealed ? 0.35 : 0.65;
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
      this.trapState = null;
      return;
    }
    if (!this.trapMesh) {
      this.trapMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 36),
        new THREE.MeshBasicMaterial({ color: 0xffb349, transparent: true, opacity: 0.45, depthWrite: false }));
      this.scene.add(this.trapMesh);
    }
    this.trapMesh.visible = true;
    this.trapMesh.position.set(trap.position.x, -0.46, trap.position.z);
    const radius = THREE.MathUtils.clamp(trap.radius, 0.1, 10);
    this.trapMesh.scale.set(radius, 1, radius);
    this.trapState = trap.state;
    this.trapMesh.material.color.setHex(trap.state === 'ACTIVE' ? 0xff5d56 : 0xffb349);
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
    const material = new THREE.MeshStandardMaterial({ color: local ? 0x59f0c2 : 0xf5a66e, emissive: local ? 0x0a665b : 0x703824, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.25, transparent: true });
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.78, 5, 9), material);
    body.position.y = 0.72;
    group.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.055, 6, 24), new THREE.MeshBasicMaterial({ color: local ? 0x69ffd3 : 0xffb583 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.41;
    group.add(ring);
    this.scene.add(group);
    record = { group, body, displayName };
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
    const palette = kind === 'THRESHOLD_KEEPER' ? [0x9f6040, 0x572819, 0xffc37f]
      : kind === 'MIRROR_HEXER' ? [0x7752b3, 0x30205f, 0xdab8ff]
        : kind === 'SHARDLING' ? [0x8b8fbc, 0x333b72, 0xb7d5ff]
          : kind === 'FLOOR_THREE_MOB' ? [0x72985e, 0x294f29, 0xd2f6a0]
          : kind === 'WARDEN' || kind === 'SHIFTING_CORE_WARDEN' ? [0x4d7c86, 0x184655, 0x9ff6e9]
            : kind === 'SENTINEL' ? [0xb94357, 0x5b172c, 0xffd29a]
              : [0x8197a3, 0x30495a, 0xd8edf7];
    const geometry = kind === 'MIRROR_HEXER' ? new THREE.OctahedronGeometry(0.85)
      : kind === 'THRESHOLD_KEEPER' ? new THREE.DodecahedronGeometry(0.88)
        : kind === 'FLOOR_THREE_MOB' ? new THREE.TetrahedronGeometry(0.72)
        : kind === 'WARDEN' || kind === 'SHIFTING_CORE_WARDEN' ? new THREE.IcosahedronGeometry(1.15, 1)
          : kind === 'SHARDLING' ? new THREE.ConeGeometry(0.36, 0.9, 6)
            : new THREE.ConeGeometry(0.58, 1.5, 8);
    const body = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: palette[0], emissive: palette[1], emissiveIntensity: 1.2, roughness: 0.4, metalness: 0.3 })
    );
    body.position.y = kind === 'SHARDLING' ? 0.35 : 0.72;
    group.add(body);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: palette[2] }));
    eye.position.set(0, kind === 'SHARDLING' ? 0.86 : 1.34, 0.29);
    group.add(eye);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(kind === 'SHARDLING' ? 0.52 : 0.73, 0.08, 8, 28), new THREE.MeshBasicMaterial({ color: palette[2] }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.43;
    group.add(ring);
    this.scene.add(group);
    record = { group, body, kind, baseEmissive: palette[1] };
    this.enemyMeshes.set(id, record);
    return record;
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
      record.body.material.opacity = b.connection === 'CONNECTED' || b.connection === 'BOT' ? 1 : 0.4;
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
    }
    for (const [id, record] of this.enemyMeshes) {
      if (activeEnemyIds.has(id)) continue;
      this.scene.remove(record.group);
      record.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
      this.enemyMeshes.delete(id);
    }
    const local = this.playerMeshes.get(this.localPlayerId);
    if (local) {
      const desired = local.group.position.clone().add(new THREE.Vector3(0, 13, 17));
      this.camera.position.lerp(desired, 0.06);
      this.camera.lookAt(local.group.position.x, 0, local.group.position.z);
    }
  }

  start() {
    if (this.animationId || this.contextLost) return;
    const frame = (timestamp) => {
      this.animationId = null;
      try {
        this.timer.update(timestamp);
        const time = this.timer.getElapsed();
        this.dynamicLights.forEach((light, index) => { light.intensity = 12 + Math.sin(time * 1.7 + index * 1.4) * 2.2; });
        if (this.trapMesh?.visible) {
          this.trapMesh.material.opacity = this.trapState === 'TELEGRAPHED'
            ? 0.3 + (Math.sin(time * 12) + 1) * 0.15 : 0.56;
        }
        for (const record of this.warningMeshes.values()) {
          record.disc.material.opacity = 0.22 + (Math.sin(time * 10) + 1) * 0.12;
        }
        for (const record of this.itemMeshes.values()) record.orb.rotation.y += 0.012;
        for (const [id, record] of this.enemyMeshes) {
          const hit = this.enemyImpactUntil.get(id) > performance.now();
          record.body.material.emissive.setHex(hit ? 0xffb36e : record.baseEmissive);
          record.group.scale.setScalar(hit ? 1.1 : 1);
        }
        this.container.classList.toggle('damage-active', performance.now() < this.damageFlashUntil);
        this.samplePlayers(performance.now());
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
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

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
    this.clock = new THREE.Clock();
    this.snapshots = [];
    this.playerMeshes = new Map();
    this.enemyMeshes = new Map();
    this.secretWalls = new Map();
    this.secretFloors = new Map();
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
        : entry.kind === 'secret-floor' ? secretFloorMaterial : entry.kind === 'column' ? trim : stone;
      const mesh = addBox(entry.size.x, entry.size.y, entry.size.z, entry.position.x, entry.position.y, entry.position.z, material);
      if (entry.cap) addBox(entry.cap.size.x, entry.cap.size.y, entry.cap.size.z, entry.position.x, entry.cap.y, entry.position.z, trim);
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
  }

  setLocalPlayer(playerId) { this.localPlayerId = playerId; }
  setInput(x, z) { this.input = { x, z }; }

  resetSession() {
    this.snapshots = [];
    this.lastSpaceKey = null;
    this.revealed.clear();
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
        const backdrop = space.id === 'amber-vault' ? 0x221b16 : space.id === 'violet-vault' ? 0x181526 : 0x090f1b;
        const floor = space.id === 'amber-vault' ? 0x493a2d : space.id === 'violet-vault' ? 0x372d4e : 0x293548;
        this.scene.background.setHex(backdrop);
        this.scene.fog.color.setHex(backdrop);
        this.mainFloorMaterial.color.setHex(floor);
      }
    }
    this.updatePortalMeshes(Array.isArray(snapshot.portals) ? snapshot.portals : []);
    this.updateTrapMesh(snapshot.trap);
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
    for (const floor of Array.isArray(floors) ? floors : [floors]) floor.visible = true;
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

  enemyMesh(id) {
    let record = this.enemyMeshes.get(id);
    if (record) return record;
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.58, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xb94357, emissive: 0x5b172c, emissiveIntensity: 1.2, roughness: 0.4, metalness: 0.3 })
    );
    body.position.y = 0.56;
    group.add(body);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd29a }));
    eye.position.set(0, 1.34, 0.29);
    group.add(eye);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.08, 8, 28), new THREE.MeshBasicMaterial({ color: 0xff596d }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.43;
    group.add(ring);
    this.scene.add(group);
    record = { group };
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
      const record = this.enemyMesh(id);
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
    const frame = () => {
      this.animationId = null;
      try {
        const time = this.clock.getElapsedTime();
        this.dynamicLights.forEach((light, index) => { light.intensity = 12 + Math.sin(time * 1.7 + index * 1.4) * 2.2; });
        if (this.trapMesh?.visible) {
          this.trapMesh.material.opacity = this.trapState === 'TELEGRAPHED'
            ? 0.3 + (Math.sin(time * 12) + 1) * 0.15 : 0.56;
        }
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
    this.scene.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

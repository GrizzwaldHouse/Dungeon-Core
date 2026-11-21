import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function dispose(group) {
  group.traverse(object => {
    object.geometry?.dispose();
    for (const material of [].concat(object.material || [])) {
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
  });
}
export class BrightForgeAssets {
  constructor(scene, container) {
    this.scene = scene;
    this.container = container;
    this.group = new THREE.Group();
    this.group.name = 'BrightForge review candidates';
    this.controller = new AbortController();
    this.status = document.createElement('output');
    this.status.id = 'brightforge-status';
    this.status.setAttribute('role', 'status');
    this.status.textContent = 'Loading BrightForge review candidates';
    container.append(this.status);
    container.dataset.brightforgeState = 'loading';
    this.ready = this.load().catch(() => {
      if (this.controller.signal.aborted) return;
      dispose(this.group);
      this.group.clear();
      this.status.textContent = 'BrightForge candidates unavailable. Check the local import report.';
      container.dataset.brightforgeState = 'failed';
    });
  }
  async load() {
    const response = await fetch('/assets/brightforge/scene.json', { signal: this.controller.signal });
    if (!response.ok) throw new Error('Candidate scene unavailable');
    const config = await response.json();
    const loader = new GLTFLoader();
    for (const item of config.assets) {
      const file = await fetch('/assets/brightforge/' + item.id + '/candidate.glb',
        { signal: this.controller.signal });
      if (!file.ok) throw new Error('Candidate file unavailable');
      const bytes = await file.arrayBuffer();
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map(value => value.toString(16).padStart(2, '0')).join('');
      if (digest !== item.sha256) throw new Error('Candidate hash mismatch');
      const model = await loader.parseAsync(bytes, '');
      if (this.controller.signal.aborted) { dispose(model.scene); return; }
      model.scene.rotation.x = -Math.PI / 2;
      model.scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model.scene);
      const center = bounds.getCenter(new THREE.Vector3());
      model.scene.position.set(item.position.x - center.x, -bounds.min.y, item.position.z - center.z);
      model.scene.name = item.id;
      model.scene.userData.brightforge = { sha256: item.sha256, reviewStatus: item.status };
      this.group.add(model.scene);
    }
    if (this.controller.signal.aborted) return;
    this.scene.add(this.group);
    this.container.dataset.brightforgeState = 'ready';
    this.container.dataset.brightforgeCount = String(this.group.children.length);
    this.status.textContent = 'BrightForge asset review · visual meshes';
  }
  setSpace(spaceId) { this.group.visible = spaceId === 'entry'; }
  dispose() {
    this.controller.abort();
    this.scene.remove(this.group);
    dispose(this.group);
    this.group.clear();
    this.status.remove();
  }
}

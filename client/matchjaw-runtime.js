// matchjaw-runtime.js
// Developer: Marcus Daley
// Date: 2026-11-07
// Why: Bind the reviewed skeletal visual to authoritative enemy snapshots without importing animation root motion into gameplay.

import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/utils/SkeletonUtils.js';

let source;

export async function attachMatchjaw(record, isCurrent) {
  if (!source) {
    source = new GLTFLoader().loadAsync('/assets/candidates/matchjaw-v6-gameplay.glb')
      .catch(error => { source = undefined; throw error; });
  }
  const gltf = await source;
  if (!isCurrent()) return false;
  const model = clone(gltf.scene);
  // Each enemy owns its disposable geometry and material resources.
  model.traverse(object => {
    if (!object.isMesh) return;
    object.geometry = object.geometry.clone();
    object.material = Array.isArray(object.material) ? object.material.map(m => m.clone()) : object.material.clone();
  });
  const mixer = new THREE.AnimationMixer(model);
  const tracks = gltf.animations.flatMap(clip => clip.tracks)
    .filter(track => !track.name.endsWith('Matchjaw_Root.position'));
  const animation = new THREE.AnimationClip('Snapshot driven gait', 6, tracks);
  mixer.clipAction(animation).play();
  model.scale.setScalar(.55);
  model.position.y = -.38;
  record.group.add(model);
  const previousPose = record.pose;
  let previousTickTime, gaitTime = 0;
  const previousPosition = record.group.position.clone();
  record.pose = (progress, serverTime) => {
    previousPose.call(record, progress, serverTime);
    const delta = previousTickTime === undefined ? 0 : Math.max(0, Math.min(.1, serverTime - previousTickTime));
    const distance = previousPosition.distanceTo(record.group.position);
    if (delta > 0 && distance > .0001 && distance < 2) gaitTime += distance / (.55 * .43 / .6);
    const sample = progress > 0 ? 4 + progress * 1.9 : gaitTime % 1;
    mixer.setTime(sample);
    previousPosition.copy(record.group.position);
    previousTickTime = serverTime;
  };
  record.matchjawVisual = model;
  record.actor.visible = false;
  return true;
}

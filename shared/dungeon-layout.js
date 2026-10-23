// dungeon-layout.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Share stable dungeon geometry between server collision and client visualization.

(function registerDungeonLayout(root, factory) {
  const layout = factory();
  if (typeof module === 'object' && module.exports) module.exports = layout;
  root.DungeonWorldLayout = layout;
})(typeof globalThis === 'object' ? globalThis : this, () => {
  const vector = (x, y, z) => Object.freeze({ x, y, z });
  const object = (id, kind, size, position, options = {}) => Object.freeze({
    id,
    kind,
    size: vector(size.x, size.y, size.z),
    position: vector(position.x, position.y, position.z),
    collider: options.collider !== false,
    revealNodeId: options.revealNodeId || null,
    cap: options.cap ? Object.freeze({ size: vector(options.cap.size.x, options.cap.size.y, options.cap.size.z), y: options.cap.y }) : null
  });

  const objects = Object.freeze([
    object('wall-west', 'wall', { x: 0.3, y: 4, z: 40 }, { x: -19.9, y: 1.4, z: 0 }),
    object('wall-east', 'wall', { x: 0.3, y: 4, z: 40 }, { x: 19.9, y: 1.4, z: 0 }),
    object('wall-north', 'wall', { x: 40, y: 4, z: 0.3 }, { x: 0, y: 1.4, z: -19.9 }),
    object('wall-south', 'wall', { x: 40, y: 4, z: 0.3 }, { x: 0, y: 1.4, z: 19.9 }),
    ...[-15, 15].flatMap((z) => [-15, 15, 0].map((x) => object(
      `pillar-${x}-${z}`, 'pillar', { x: 1.4, y: 3.8, z: 1.4 }, { x, y: 1.3, z },
      { cap: { size: { x: 1.8, y: 0.35, z: 1.8 }, y: 3.3 } }
    ))),
    object('secret-west', 'secret-wall', { x: 0.5, y: 3.6, z: 6 }, { x: -9, y: 1.2, z: 0 }, { revealNodeId: 'secret-west' }),
    object('column-west', 'column', { x: 0.6, y: 3.4, z: 0.6 }, { x: -17, y: 1.1, z: 0 }),
    object('column-inner', 'column', { x: 0.6, y: 3.4, z: 0.6 }, { x: -3, y: 1.1, z: 0 }),
    object('secret-floor', 'secret-floor', { x: 6, y: 0.04, z: 6 }, { x: -12, y: -0.52, z: 0 }, { collider: false })
  ]);

  const toAabb = (entry) => ({
    min: vector(entry.position.x - entry.size.x / 2, entry.position.y - entry.size.y / 2, entry.position.z - entry.size.z / 2),
    max: vector(entry.position.x + entry.size.x / 2, entry.position.y + entry.size.y / 2, entry.position.z + entry.size.z / 2),
    ...(entry.revealNodeId ? { revealNodeId: entry.revealNodeId } : {})
  });
  const world = Object.freeze({
    bounds: Object.freeze({ min: vector(-20, -2, -20), max: vector(20, 8, 20) }),
    obstacles: Object.freeze(objects.filter((entry) => entry.collider).map(toAabb)),
    discoveryNodes: Object.freeze([
      Object.freeze({ id: 'secret-west', bounds: Object.freeze({ min: vector(-8.5, -1, -2), max: vector(-6.5, 2, 2) }) })
    ])
  });

  return Object.freeze({ objects, world });
});

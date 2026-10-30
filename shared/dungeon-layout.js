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
    spaceId: options.spaceId || 'entry',
    revealNodeId: options.revealNodeId || null,
    cap: options.cap ? Object.freeze({ size: vector(options.cap.size.x, options.cap.size.y, options.cap.size.z), y: options.cap.y }) : null
  });

  const objects = Object.freeze([
    object('wall-west', 'wall', { x: 0.3, y: 4, z: 40 }, { x: -19.9, y: 1.4, z: 0 }, { spaceId: 'all' }),
    object('wall-east', 'wall', { x: 0.3, y: 4, z: 40 }, { x: 19.9, y: 1.4, z: 0 }, { spaceId: 'all' }),
    object('wall-north', 'wall', { x: 40, y: 4, z: 0.3 }, { x: 0, y: 1.4, z: -19.9 }, { spaceId: 'all' }),
    object('wall-south', 'wall', { x: 40, y: 4, z: 0.3 }, { x: 0, y: 1.4, z: 19.9 }, { spaceId: 'all' }),
    ...[-15, 15].flatMap((z) => [-15, 15, 0].map((x) => object(
      `pillar-${x}-${z}`, 'pillar', { x: 1.4, y: 3.8, z: 1.4 }, { x, y: 1.3, z },
      { cap: { size: { x: 1.24, y: 0.22, z: 1.24 }, y: 3.04 } }
    ))),
    object('secret-west', 'secret-wall', { x: 0.5, y: 3.6, z: 6 }, { x: -9, y: 1.2, z: 0 }, { revealNodeId: 'secret-west' }),
    object('column-west', 'column', { x: 0.6, y: 3.4, z: 0.6 }, { x: -17, y: 1.1, z: 0 }),
    object('column-inner', 'column', { x: 0.6, y: 3.4, z: 0.6 }, { x: -3, y: 1.1, z: 0 }),
    object('secret-floor', 'secret-floor', { x: 6, y: 0.04, z: 6 }, { x: -12, y: -0.52, z: 0 }, { collider: false }),
    // The entry route uses broken side crowns around both portal positions. The three-metre opening
    // leaves a straight, unblocked approach while every visible solid remains an explicit AABB.
    ...[-8, 8].flatMap((z) => {
      const end = z < 0 ? 'north' : 'south';
      return [
        object(`entry-portal-arch-west-${end}`, 'portal-arch', { x: 0.65, y: 3, z: 0.9 }, { x: -2.5, y: 0.94, z }),
        object(`entry-portal-arch-east-${end}`, 'portal-arch', { x: 0.65, y: 3, z: 0.9 }, { x: 2.5, y: 0.94, z }),
        object(`entry-portal-crown-west-${end}`, 'portal-arch', { x: 1.2, y: 0.5, z: 0.9 }, { x: -2.1, y: 2.57, z }),
        object(`entry-portal-crown-east-${end}`, 'portal-arch', { x: 1.2, y: 0.5, z: 0.9 }, { x: 2.1, y: 2.57, z })
      ];
    }),
    ...[-5.2, -2.8, 2.8, 5.2].map((z, index) => object(
      `entry-wayfinder-inlay-${index + 1}`, 'wayfinder-inlay', { x: 1.7, y: 0.025, z: 1.4 }, { x: 0, y: -0.55, z }, { collider: false }
    )),
    object('entry-deepwood-root-west', 'deepwood-roots', { x: 5.2, y: 1.9, z: 4.8 },
      { x: -9.5, y: 0.35, z: 7.5 }, { collider: false }),
    object('entry-deepwood-root-east', 'deepwood-roots', { x: 5.2, y: 1.9, z: 4.8 },
      { x: 9.5, y: 0.35, z: -1 }, { collider: false }),
    object('amber-arch-west', 'vault-column', { x: 1.5, y: 4.2, z: 1.5 }, { x: -8, y: 1.5, z: -2 }, { spaceId: 'amber-vault' }),
    object('amber-arch-east', 'vault-column', { x: 1.5, y: 4.2, z: 1.5 }, { x: 8, y: 1.5, z: -2 }, { spaceId: 'amber-vault' }),
    object('amber-altar', 'vault-altar', { x: 4, y: 1.2, z: 2 }, { x: 0, y: 0.1, z: 3 }, { spaceId: 'amber-vault' }),
    object('violet-spire-west', 'vault-column', { x: 1.6, y: 5, z: 1.6 }, { x: -11, y: 1.9, z: 4 }, { spaceId: 'violet-vault' }),
    object('violet-spire-east', 'vault-column', { x: 1.6, y: 5, z: 1.6 }, { x: 11, y: 1.9, z: -4 }, { spaceId: 'violet-vault' }),
    object('violet-divider-west', 'vault-wall', { x: 4, y: 2.5, z: 0.6 }, { x: -6, y: 0.65, z: 7 }, { spaceId: 'violet-vault' }),
    object('violet-divider-east', 'vault-wall', { x: 4, y: 2.5, z: 0.6 }, { x: 6, y: 0.65, z: -7 }, { spaceId: 'violet-vault' })
  ]);

  const toAabb = (entry) => ({
    min: vector(entry.position.x - entry.size.x / 2, entry.position.y - entry.size.y / 2, entry.position.z - entry.size.z / 2),
    max: vector(entry.position.x + entry.size.x / 2, entry.position.y + entry.size.y / 2, entry.position.z + entry.size.z / 2),
    ...(entry.revealNodeId ? { revealNodeId: entry.revealNodeId } : {})
  });
  const bounds = Object.freeze({ min: vector(-20, -2, -20), max: vector(20, 8, 20) });
  const obstaclesFor = (spaceId) => Object.freeze(objects.filter((entry) => entry.collider &&
    (entry.spaceId === 'all' || entry.spaceId === spaceId)).map(toAabb));
  const world = Object.freeze({
    bounds,
    obstacles: obstaclesFor('entry'),
    discoveryNodes: Object.freeze([
      Object.freeze({ id: 'secret-west', bounds: Object.freeze({ min: vector(-8.5, -1, -2), max: vector(-6.5, 2, 2) }) })
    ]),
    spaces: Object.freeze({
      'amber-vault': Object.freeze({ bounds, obstacles: obstaclesFor('amber-vault'), discoveryNodes: Object.freeze([]) }),
      'violet-vault': Object.freeze({ bounds, obstacles: obstaclesFor('violet-vault'), discoveryNodes: Object.freeze([]) })
    })
  });

  return Object.freeze({ objects, world });
});

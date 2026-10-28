// combat-target.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Resolve optional target intent against live room state without trusting client geometry or damage.

'use strict';

// Why: A stale selection must fail instead of silently striking a different enemy.
// Input: Trusted room/player/range and visibility predicate, plus a validated optional enemy ID.
// Output: A live reachable room enemy or an error; never mutates state.
// Watch Out: Horizontal reach intentionally preserves existing combat against airborne Barkwings.
function selectAttackTarget(room, player, range, visible, targetEnemyId) {
  if (targetEnemyId !== undefined) {
    const selected = room.enemies.get(targetEnemyId);
    if (!selected || selected.health.current <= 0) return { error: 'TARGET_UNAVAILABLE' };
  }
  const origin = player.transform.position;
  let target = null;
  let nearest = range ** 2;
  const candidates = targetEnemyId === undefined ? room.enemies.values() : [room.enemies.get(targetEnemyId)];
  for (const enemy of candidates) {
    if (enemy.health.current <= 0) continue;
    const position = enemy.transform.position;
    const distanceSquared = (position.x - origin.x) ** 2 + (position.z - origin.z) ** 2;
    if (distanceSquared <= nearest && visible(origin, position)) {
      nearest = distanceSquared;
      target = enemy;
    }
  }
  return target ? { target } : { error: 'OUT_OF_RANGE' };
}

module.exports = { selectAttackTarget };

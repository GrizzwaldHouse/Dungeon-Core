// weapon-profile.js
// Developer: Marcus Daley
// Date: 2026-10-31
// Why: Match existing Wayfarer silhouettes to immutable server-owned weapon reach.
'use strict';
const ROLES = ['VANGUARD', 'MAGE', 'SCOUT', 'HEALER'];

// Input: Server-accepted identity, never an attack payload. Output: Stable existing visual role.
function roleForIdentity(displayName, id) {
  const label = String(displayName || '').toUpperCase();
  const named = [
    ['VANGUARD', ['VANGUARD', 'EMBER', 'AXE']],
    ['MAGE', ['MAGE', 'RUNE', 'ARCANE']],
    ['SCOUT', ['SCOUT', 'VALE', 'RANGER']],
    ['HEALER', ['HEALER', 'MOSS', 'MEDIC']]
  ].find(([, words]) => words.some(word => label.includes(word)))?.[0];
  if (named) return named;
  let hash = 2166136261;
  for (const character of `${displayName || ''}:${id || ''}`) {
    hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619);
  }
  return ROLES[(hash >>> 0) % ROLES.length];
}

// Why: Clients may request a target but cannot choose reach, style, or damage per strike.
// Input: Trusted identity and validated server configuration. Output: Frozen public profile.
function createWeaponProfile(displayName, id, combat) {
  const role = roleForIdentity(displayName, id);
  const style = role === 'VANGUARD' ? 'MELEE' : role === 'SCOUT' ? 'ARROW' : 'SPELL';
  const rangeMeters = role === 'VANGUARD' ? combat.playerAttackRangeMeters :
    role === 'MAGE' ? combat.mageAttackRangeMeters : role === 'SCOUT' ? combat.scoutAttackRangeMeters : combat.healerAttackRangeMeters;
  return Object.freeze({ role, style, rangeMeters });
}
module.exports = { createWeaponProfile, roleForIdentity };

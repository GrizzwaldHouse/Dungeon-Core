# Expedition Company: elemental guardian review

Decision date: October 25, 2026. Owner: Marcus Daley.

## Confirmed decisions

- Option 3 is the approved visual style baseline.
- Produce three variants within that style, each showing tree and ice guardians, their minions, and the magic player.
- Guardians must have attacks matching their element; players need magic/status effects usable against bosses.
- After Floor Five, show victory. A harder cycle is optional and must be explicitly selected; automatic restart is no longer the intended behavior.

## Variant exploration

| Variant | Tree guardian and minions | Ice guardian and minions |
|---|---|---|
| A: Ancient Wilds | Walking oak, seedling defender, mushroom spore caster | Glacial bear, frost hound, icicle sprite |
| B: Crowned Wardens | Wooden antler-crowned knight, acorn pikeman, thorn sprite | Floating ice knight, shield soldier, snowflake familiar |
| C: Deepwood and Permafrost | Stump colossus, root beetle, pinecone bomber | Glacial ram, shard crab, snow-wisp caster |

These are proposed designs, not additional implemented encounters. Select or combine silhouettes before model production. Floor placement remains unresolved; do not silently replace existing bosses or add floors.

## Proposed elemental combat contract

| Actor | Telegraph and attack | Effect | Player counterplay |
|---|---|---|---|
| Tree guardian | Marked ground lanes before roots erupt | Brief root, with bounded duration | Move out before eruption; fire clears roots |
| Tree guardian/minions | Visible spore circle and seed volley | Poison damage over time | Leave the pool; cleansing magic removes poison |
| Ice guardian | Clearly marked frontal frost cone | Bounded chill/slow stacks | Move behind or outside cone; ward mitigates chill |
| Ice guardian/minions | Marked spike lanes, shard volley, or charge lane | Damage and brief stagger | Dodge the telegraph; interrupt eligible minion casts |
| Player mage | Fire bolt or pulse | Burn and temporary bark weakening | Damage continues for a limited period; no infinite stacking |
| Player mage | Arcane fracture | Brief armor vulnerability | Team attacks during a readable exposed-core window |
| Player mage | Ward/cleanse | Mitigate chill or remove root/poison | Limited resource or cooldown; server validates use |

Exact damage, range, mana, cooldown, resistance, stack caps, and effect durations require balance tests. Bosses should resist repeated hard control so players cannot permanently freeze/root them. Visual color must be supplemented with shapes, icons, and text.

## Engineering order

1. Fix campaign closure and reproduce rapid portal requests before introducing new encounter complexity.
2. Define authoritative status records (kind, source, stacks, expiry tick) and damage/cleanse rules in the shared contract.
3. Implement one tree and one ice attack with deterministic telegraph and counterplay tests.
4. Add bounded minion waves at configured boss health thresholds; trigger each threshold once, including large hits that cross multiple thresholds.
5. Add mage abilities with server-owned cooldown/resource checks and snapshot feedback.
6. Integrate approved models with existing collision proxies, then verify desktop and mobile readability.

## Acceptance requirements

- Clients cannot forge boss damage, status duration, cooldown, mana, or minion spawns.
- Same status state and expiry appear on both clients; death, revive, transition, and reconnect follow explicit cleanup/preservation rules.
- Minions respect population caps and do not duplicate after threshold crossing or reconnect.
- Boss control resistance prevents permanent stun/root chains.
- Floor Five victory awards occur once; no automatic teleport into cycle two.
- Optional restart is server-validated and cannot be triggered by a stale portal event or double click.

## Evidence state

This document records approved direction and proposed mechanics. No elemental encounter, mage ability, victory-flow fix, or Blender asset is claimed implemented by this concept pass.

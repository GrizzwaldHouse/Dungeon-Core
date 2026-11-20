# Compact HUD QA

## Scope

This milestone changes only the Godot PC prototype HUD at small desktop review resolutions. It does not change authoritative LAN state, combat rules, dungeon geometry, assets, or the web game.

## Acceptance

- At 800 by 450, the objective and nearest-landmark columns reserve separate screen regions.
- The compact landmark list shows no more than three nearest entries.
- Combat status, hints, messages, and dialogue use smaller but readable type.
- At 1280 by 720 and larger, the full HUD layout and complete landmark list return.
- The solo route and independent two-process LAN regression remain green.

## Evidence boundary

Automated Godot checks and headed local screenshots are local PC evidence only. Physical MSI-to-PowerSpec play, physical phone behavior, public deployment, and human visual approval remain separate gates.

## Fresh evidence, 2026-11-19

- Godot 4.7.2 headless route test exited 0. All compact-layout assertions and the full solo frontier, dungeon, combat, return, and collision route passed.
- Headed two-process ENet regression exited 0 for host and guest at 800 by 450. Both clients connected, moved independently, synchronized the guest pickup, entered the dungeon, alternated attacks, observed guardian health from 3 to 0, and completed disconnect observation on the host.
- Headed artifacts: `pc-godot/build/lan-qa/run-io9llxsd/host-combat.png`, `guest-combat.png`, and `results.json`. The ignored build directory is local evidence and is not part of the milestone commit.
- Visual inspection confirmed the objective, region, landmark, combat status, message, hint, and LAN badge remain visible without the prior top-row collision. This is a local visual check, not human approval.
- Godot could not write its default or relative editor log under the managed test profile, but both test processes returned success and the dedicated LAN runner captured its engine logs inside the ignored evidence directory.

## Portable review package, 2026-11-20

- Package: `pc-godot/build/windows-playtest/DungeonCore-Windows-354f9ecc-ce5bed3b1c461cf3.zip`
- Source commit: `354f9ecc5ae04f805d91359e0280a864638c642f`
- Payload ID: `ce5bed3b1c461cf3`
- SHA-256: `d19cac1d101f6e073c4d3ea98aa0a69bcfd5a1079838c0d4c9c9c4323e6e377e`
- Fresh extraction, runtime-file checksum verification, and bundled-engine launch exited 0.

This package is ready for the separate physical MSI-to-PowerSpec LAN review. It has not been pushed, deployed, published, or accepted on the second computer.

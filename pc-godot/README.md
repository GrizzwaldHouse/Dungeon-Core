# Thornwake Frontier

A Godot PC exploration build with solo and two-player LAN modes of Dungeon Core Crawler. The Guild dispatches a Wayfarer to investigate a silent outpost between a root forest and a permafrost shelf.

Open project.godot in Godot 4.7.2 and press F6 on scenes/main.tscn, or use F5 from the editor. Move with WASD or arrow keys. Press E near a landmark. Space advances the briefing, Esc skips it and R starts a fresh expedition.

Follow the Hollow Cairn west or Frost Obelisk east. Recover both survey records in either order, then report to the Quest Master at Guild Hall. The northern portal leads to a dungeon hall and its southern exit returns to the frontier. The Elder Tree and Glacier Spire are optional discoveries.

## Local QA

Run from this project directory with Godot on PATH.

    godot --headless -s res://tests/test_outpost.gd
    godot -s res://tests/capture_frontier.gd

The first script walks the mission through the game input handlers in both orders, checks gate traversal and checks a long step against a pillar. The second captures four staged camera views into build/ (create the folder first). These checks cover the solo exploration prototype. Additional encounters, five-floor progression and persistent saves are future porting milestones.

In the dungeon, F swings your weapon. Move outside the amber circle before the guardian lands its strike. Defeat returns you to the dungeon threshold.

## Windows two-PC playtest

Use the same portable ZIP on both PCs. Extract it and open Play Dungeon Core.cmd. Select LAN party. One player hosts and the other joins using the host computer's LAN IPv4 address. The host advances the briefing. Both players can move, collect survey records and fight. Taking a gate brings the party together. A guest who rejoins starts beside the host with the current party objective. See [the two-PC checklist](../pc-godot-two-pc-checklist.md).

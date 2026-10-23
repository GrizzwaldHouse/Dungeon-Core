# Target Project Configuration & Grading Guidelines

## Core Inspirations

- Gameplay Dynamics: Inspired by 'Gauntlet' (multiplayer co-op dungeon exploration, distinct classes, shared survival).
- Combat & Pacing: Inspired by 'Halo 2' (tight map control, tactical positioning, real-time spatial awareness).
- Aesthetic & World Rules: A shifting fantasy environment (Alice in Wonderland/Narnia). Portals randomly transition players to entirely different 3D room segments or trap zones. Hidden walls reveal secret chambers upon proximity.

## Technical Framework Constraints

- Architecture: Authoritative server-client architecture. The client only sends inputs and renders what the server permits.
- Network State Layer: Real-time 3D coordinate syncing (X, Y, Z positions) over WebSockets using Socket.io.
- Viewport Engine: 3D browser rendering utilizing vanilla HTML5 Canvas or Three.js.
- Matchmaking Rules: Strict compliance with the Handshake Challenge—zero login, zero downloads. Session access must be granted purely via 4-character room codes.

## Academic Quality & Grading Rubric

1. Client-Side Prediction: Basic interpolation or extrapolation must be planned for player positions to avoid visual rubber-banding at 30Hz network ticks.
2. Complete Error Handling: No placeholders or 'stub functions' in the networking loops. All socket event listeners must include clear validation checks.
3. Modular File Architecture: Separation of concerns—networking logic must remain entirely separated from the 3D graphics rendering loops.

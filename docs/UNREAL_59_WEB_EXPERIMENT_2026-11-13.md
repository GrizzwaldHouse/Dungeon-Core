# Unreal 5.9 browser experiment

Status: planned experiment, not a replacement for the submitted Three.js game.

## Verified engine facts

Epic's 5.9 Preview introduces an experimental WebAssembly target using WebGPU and the mobile renderer. It is not the existing game's WebGL pipeline. Epic says a C++ project and engine source build are currently required, Chrome is the best supported browser for this preview, and package time and performance can be rough. The preview is not production qualified. See [release notes](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-9-release-notes) and [Epic preview notes and known issues](https://forums.unrealengine.com/t/unreal-engine-5-9-megajam-preview/2852840).

The preview issue list includes browser memory crashes, mobile startup and rotation problems, missing texture support on older iPhones, a multiplayer WebSocket relay setup bug for a web-ready template, and stale incremental packaging. These must be tested against the exact preview revision before any web release claim.

## Bounded PowerSpec spike

1. Keep the current JavaScript and authoritative Socket.IO game unchanged. Make a separate Unreal C++ project and source-control branch on PowerSpec.
2. Recreate one Floor Two aqueduct room with the approved dark masonry and roots, one selectable Wayfarer, one elemental spider, and the angled and top-down camera choices. Use licensed source assets with provenance.
3. First package and profile Windows. Capture 1080p gameplay, frame timing, draw calls, GPU memory, load time, and a matching camera view from the current browser game.
4. Then package the same small room for Wasm/WebGPU. Test Chrome desktop and the actual iPhone separately. Record first load, memory, input latency, audio, reload, rotation, graphics, and failures. Check the current multiplayer known issue before attempting two clients.
5. Decide whether Unreal web is viable for this game only after the small-room test. Keep the native Windows remake as the main Unreal target even if the web preview fails.

## Agent and local model setup

Use Epic's Unreal MCP and Python tools for scene inspection, asset import, material setup, test captures, and profiling. The 5.9 preview requires project toolsets to be enabled before agents receive edit tools. OpenCode or Hermes may connect to a local coding endpoint on PowerSpec; a 7B to 14B coding model is the initial 16 GB VRAM target. A 30B quantization may require system-RAM offload and should be benchmarked, not assumed to fit entirely on the GPU. Keep engine compilation, asset generation, and inference from competing for VRAM at the same time.

Local image-to-mesh is an optional candidate pipeline, followed by Blender topology, rig, materials, animation, LOD, and runtime review. Check model weights and output licenses before commercial use. No generated mesh enters the game without the approved visual review and measured budget.

## Acceptance

The experiment passes only when its Windows build is playable and its web build, if attempted, is recorded on the exact engine revision with browser/device results. One room and one encounter are enough to decide the engine path. The five-floor web game remains the playable baseline.

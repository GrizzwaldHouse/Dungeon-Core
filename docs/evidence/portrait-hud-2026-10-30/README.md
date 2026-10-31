# Compact HUD live capture

Captured from branch `qa/portrait-hud-sprint` with baseline HEAD `6c9a095230527721020c83866b7e6117d3237795`. The captured `client/styles.css` SHA-256 is `a14e0caa79c7dccbb1827f3885c2840902014e96144a67815a282de418a7f546`.

The local headless browser and a second Socket.IO client reached the actual Deepwood encounter through server actions. Chrome emulated a coarse pointer and five touch points. Room codes and status text were hidden in these retained frames. The capture used a local server with 1,000 maximum HP for endurance; this is not physical-phone or public-host acceptance.

| Image | Observed result |
| --- | --- |
| `deepwood-portrait-390x844.png` | Compact HUD occupies y=54–115; roster display is `none`; health 964/1,000, target, movement, Strike, and recovery actions remain visible. |
| `deepwood-landscape-844x390.png` | Compact HUD occupies y=54–126; roster display is `none`; health, target, movement, and Strike remain visible. |

Both captures recorded `pointerCoarse=true`, touch controls `display:flex`, Strike `display:block`, one ready WebGL canvas, no graphics recovery, and zero browser errors. The landscape recovery label is cramped and needs a separate action-control layout pass. All images show local headless emulation only.

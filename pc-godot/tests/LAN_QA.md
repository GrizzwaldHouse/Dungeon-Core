# Godot LAN QA, November 19, 2026

Source milestone: `77438c19f77931df0851bde256450b24be7b5fa8`.

The independent loopback harness launches two Godot processes over ENet on a temporary UDP port. The final headless run exited 0 for host and guest. Both clients observed peer movement, a guest-only Permafrost survey pickup, marker removal, the checked objective, shared dungeon transition, alternating player strikes, guardian health 3 to 2 to 1 to 0, and guardian defeat. The host also observed the guest disconnect.

A headed run used Godot 4.7.2, OpenGL 3.3 and the MSI NVIDIA RTX 4070 Laptop GPU. Both windows were 800 by 450. The paired frame is in the ignored local evidence folder at `build/lan-qa/nov19-two-client-combat.png`.

The paired frame shows both players in the same warning ring, both HUDs at Stone Watch 2/3 and the Permafrost objective checked. The HUD overlaps at 800 by 450 and needs a compact low-resolution layout before that resolution is supported.

The solo route test also exited 0 with 21 checks. These tests establish local two-process synchronization. Physical MSI-to-PowerSpec LAN performance, Windows firewall behavior, Wi-Fi latency and reconnect usability remain for Marcus's morning test.

Run the local regression with:

    python tests/run_lan.py PATH_TO_GODOT_EXE

Add `--headed` to open both windows. The runner saves detailed logs and result JSON under the ignored `build/lan-qa` directory.

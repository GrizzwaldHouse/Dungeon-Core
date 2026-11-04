# Accountless access boundary review, 2026-11-04

Reviewed revision: `f2ec5214f99429b56ecf256e5762f7b2b6d550ab` on `qa/final-sprint-integration`. This is a source review and local loopback test, not a public-host security certification.

## Source observations

- Room codes are four symbols from a 32-symbol alphabet. They are shareable room locators, not authentication secrets. A correct code admits a player only to a lobby with capacity. The server validates name length and strips control characters.
- `room:create`, `room:join`, and `room:rejoin` share a per-socket attempt window and a process-wide attempt window. The process also caps rooms and connections. Rejections increment aggregate counters without logging payloads. The global limit constrains a reconnecting attacker but can also delay legitimate players during a burst. These bounds reset on process restart and do not provide a per-address limit across instances.
- Rejoin requires a disconnected player, matching room, and random token. The server stores a SHA-256 digest, rotates the token after successful rejoin, and rejects stale tokens. A client with a valid reconnect token still has a capability, so it must not appear in logs, screenshots, reports, or issue intake.
- Socket.IO caps packet size at `maxPayloadBytes` and movement accepts finite vectors and safe sequence integers. Server-owned room membership, position, health, and combat results are not accepted from a client snapshot.
- The Render URL supplies an exact default origin unless `CORS_ORIGIN` overrides it. Browser handshakes and subsequent polling or upgrade requests check Origin. Native clients may omit Origin, so this is browser isolation, not player authentication. The wildcard local setting accepts only same-host browser origins.
- The server startup log prints host, port, and tick rate. The reviewed server code has no room code, reconnect token, player payload, or IP logging path. The health endpoint returns room count and revision, without player or room identifiers. This source review does not prove external hosting, proxy, or platform log redaction.

## Fresh local evidence

With root `node_modules` supplied through `NODE_PATH`, `node --test tests/public-boundary.test.js tests/target-intent-boundary.test.js tests/protocol-boundary.test.js` passed **14/14** on 2026-11-04 using permitted loopback access. The checks cover shared attempt budgets and reset, process room/connection limits, polling and WebSocket Origin checks, existing-session Origin checks, six-player capacity, malformed movement, target authority, replay after reconnect, and stale transport rejection. The restricted first run failed before network assertions with loopback `EACCES`; it is not a product failure or pass.

## Open release checks

This completes the checklist's local **inspection**. Public-host verification of the exact deployed revision, actual Origin behavior through its proxy, oversized packet handling, platform logs, sustained guessing or denial-of-service pressure, and two-device gameplay remain open. The overall release verdict remains **NO-GO**. Keep player feedback local for human review; no issue-triggered AI repair is enabled.

# Thirty-minute local soak result — October 28, 2026

## Verdict

**VERIFIED: complete local transport/timing sample. PARTIAL: endurance acceptance remains open.**

The complete aggregate covers 1800 seconds, two rooms and six connected probes per room. Snapshot cadence and sampled tick work met the provisional local budgets, with no recorded disconnects, socket errors, input failures or rejections. Memory increased substantially; this shared-process measurement cannot establish server memory stability. This report does not change the mock-jury score of 71/100 HOLD.

## Provenance and ownership

- Launch revision recorded by the previous run: `bf37bfc910663dd9db825769811811b4b38e4304`, branch `gameplay/release-integration`.
- Command: `node scripts/measure.js --duration=1800 --rooms=2 --players=6`.
- Prior launch record: approximately 03:43 PDT on October 28. Final artifact write: 04:13:15 PDT; last sample elapsed time: 1800.31 seconds.
- Reviewed during 04:41–04:43 PDT on October 28. Review-time HEAD still matched the launch revision. `git diff --name-only HEAD -- server shared scripts/measure.js tests/socket-client.js` returned no changes.
- Aggregate: `reports/errors/overnight-soak-2026-10-28-0343.json`, 75,565 bytes, SHA-256 `ad3503d739a717acf8b12d4c00e7e31853d6652fff21a9898ad928a7ec354a77`. JSON parsed successfully, including all 181 memory samples. Matching stderr `.log` is zero bytes. Both raw artifacts are ignored and excluded from staging.
- The launching exec session is unavailable in this run, so its process exit code was not recovered. Evidence is the complete final aggregate and empty stderr, not an observed exit status or post-shutdown health check.
- Earlier touch owner `01a181db-9f12-77f0-b426-68ceef231805` remains active, waiting on approval. Its six modified client/test files remain untouched. Eleven concept PNGs remain untracked and unstaged. This milestone owns only this new report.
- `main` remains `eeabf4108d5def29c8bf38605ab269096913e549`; design worktree remains `c70683b9c6ed719ad2ea5dcd5fa7cf5878a07f2f`.

## Recorded metrics

| Metric | Result | Interpretation |
| --- | --- | --- |
| Host snapshots / interval samples | 108,022 / 108,020 | Two host observers; other ten probes are connected but not timing observers |
| Snapshot interval p50 / p95 / p99 | 31.51 / 46.97 / 49.41 ms | Meets provisional p95 <=50 ms and p99 <=67 ms |
| Input ACK p50 / p95 / p99 | 3.36 / 9.09 / 10.45 ms | 16,925 successful probes from first client; p95 <=15 ms |
| Final recent server tick p50 / p95 / p99 | 4.01 / 6.02 / 6.48 ms | Last 600-sample window, not full-run tick percentiles |
| Maximum periodic-window tick p95 / p99 | 7.20 / 9.21 ms | Across 180 sampled windows; zero windows at or above 8 ms p95 |
| Final recent scheduling lateness p95 / p99 | 13.84 / 14.83 ms | Last 600-sample window |
| Maximum periodic-window lateness p95 | 14.46 ms | Below proposed 20 ms budget in sampled windows |
| Snapshot payload p50 / p95 / p99 | 4090 / 4174 / 4174 bytes | Serialized host snapshot payload; excludes protocol overhead |
| Scheduler ticks / room ticks | 54,009 / 108,010 | Configured 30 Hz |
| Broadcast snapshots | 108,024 | Server count, separate from observed host count |
| Unexpected disconnects / socket errors | 0 / 0 | Counters before intentional teardown |
| Input failures / probe rejections / server rejections | 0 / 0 / 0 | No recorded transport or valid-input failures |

## Memory concern

| Elapsed seconds | Heap MiB | RSS MiB |
| ---: | ---: | ---: |
| 0 | 8.95 | 60.17 |
| 300.17 | 76.11 | 242.47 |
| 600.35 | 47.53 | 241.65 |
| 900.54 | 82.51 | 253.92 |
| 1200.76 | 65.50 | 253.14 |
| 1500.97 | 65.97 | 255.41 |
| 1800.31 | 76.73 | 249.54 |

Exact start/end heap: 9,387,000 / 80,454,088 bytes (delta +71,067,088). Exact start/end RSS: 63,094,784 / 261,656,576 bytes (delta +198,561,792). Sampled peaks: heap 91,089,744 bytes (86.87 MiB), RSS 268,435,456 bytes (256 MiB). Peaks are ten-second samples plus endpoints, not continuous high-water marks.

RSS grows quickly in the first five minutes, then stays near 242–256 MiB at the selected later checkpoints. This observation neither proves an unbounded leak nor establishes acceptable server-only memory. The measurement process retains interval, RTT and payload-size arrays and performs snapshot serialization; it also hosts the server and all twelve WebSocket probes. No heap attribution or isolated server RSS measurement exists here.

Next memory investigation should separate server and load probes into different processes, bound retained measurement samples, and compare the server trend during load and after room teardown. Record runtime/version and host configuration with that follow-up. Do not diagnose or patch server retention from this aggregate alone.

## Remaining acceptance gates

This is a limited transport soak: only the first client sends repeated diagonal movement intent; it does not exercise a continuous human campaign, victory/results, duplicate rewards, cross-room state isolation, browser frame times, physical phone, public HTTPS/WSS, restart/reconnect or audio behavior. Two- and four-player load variants remain unmeasured by this run. The broader publish-plan endurance checkbox must remain open.

No runtime code changed, so no new syntax or unit-test result is claimed. The prior tooling report records 32 syntax-checked files and 76/76 passing tests; these are historical checks, not a fresh certification of the pending touch edits. The report's numeric evidence was checked directly against the final aggregate and measurement implementation.

The next serialized gameplay slice remains touch QA, then server-owned victory/results and explicit harder-cycle continuation. DigitalOcean provisioning remains blocked on the previously requested region/size choice; no repeat request or paid provisioning occurred. No assets, push, deployment or public URL were produced by this milestone.

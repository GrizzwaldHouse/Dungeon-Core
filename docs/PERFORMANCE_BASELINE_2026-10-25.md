# Local performance baseline — October 25, 2026

Revision measured: `9be2e77`

## Two-player baseline

Command: `npm run measure -- --duration=8 --rooms=1 --players=2`

- Configured simulation: 30 Hz
- Public snapshot payload: p50 1,999 bytes, p95 2,001 bytes, p99 2,002 bytes
- Snapshot interval: p50 31.42 ms, p95 46.85 ms, p99 47.94 ms
- Input acknowledgement: p50 1.52 ms, p95 3.85 ms, p99 5.93 ms
- Server tick duration: p50 0.60 ms, p95 1.16 ms, p99 1.72 ms
- Samples: 242 tick durations, 73 input acknowledgements, 243 observed snapshots, 244 snapshots broadcast
- Process memory: 9,229,120 to 14,559,120 heap bytes; 63,791,104 to 74,141,696 resident bytes
- Short-run delta: +5,330,000 heap bytes; +10,350,592 resident bytes
- Input rejections: 0

## Twelve-client baseline

Command: `npm run measure -- --duration=8 --rooms=2 --players=6`

- Configured simulation: 30 Hz
- Public snapshot payload: p50 3,934 bytes, p95 4,016 bytes, p99 4,018 bytes
- Snapshot interval: p50 31.26 ms, p95 46.94 ms, p99 48.82 ms
- Input acknowledgement: p50 1.60 ms, p95 4.20 ms, p99 10.11 ms
- Server tick duration: p50 1.41 ms, p95 4.09 ms, p99 5.75 ms
- Samples: 245 tick durations, 73 input acknowledgements, 498 observed snapshots, 500 snapshots broadcast
- Process memory: 9,270,744 to 16,302,352 heap bytes; 63,868,928 to 84,172,800 resident bytes
- Short-run delta: +7,031,608 heap bytes; +20,303,872 resident bytes
- Input rejections: 0

## Interpretation and open proof

The local server tick cost remained well below the 33.33 ms simulation budget in both samples. Snapshot arrival tails exceeded one nominal tick because this short probe includes local scheduler and transport timing; the client interpolation buffer remains necessary.

This evidence does not establish public-network latency or long-session memory stability. Those remain release gates, along with the two-browser recording and computer-plus-phone acceptance pass.

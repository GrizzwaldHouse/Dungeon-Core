# Local performance baseline — October 25, 2026

Revision measured: `9be2e77`

## Two-player baseline

Command: `npm run measure -- --duration=8 --rooms=1 --players=2`

- Configured simulation: 30 Hz
- Snapshot interval: p50 31.39 ms, p95 46.61 ms, p99 48.16 ms
- Input acknowledgement: p50 2.14 ms, p95 5.93 ms, p99 8.13 ms
- Server tick duration: p50 0.94 ms, p95 1.56 ms, p99 1.94 ms
- Samples: 241 tick durations, 73 input acknowledgements, 243 snapshots broadcast
- Process memory at completion: 14,254,136-byte heap; 73,273,344-byte resident set
- Input rejections: 0

## Twelve-client baseline

Command: `npm run measure` (two rooms, six players per room, four seconds)

- Configured simulation: 30 Hz
- Snapshot interval: p50 31.13 ms, p95 46.95 ms, p99 49.71 ms
- Input acknowledgement: p50 3.81 ms, p95 7.44 ms, p99 7.46 ms
- Server tick duration: p50 1.93 ms, p95 4.19 ms, p99 5.42 ms
- Samples: 128 tick durations, 37 input acknowledgements, 264 snapshots broadcast
- Process memory at completion: 16,936,720-byte heap; 82,354,176-byte resident set
- Input rejections: 0

## Interpretation and open proof

The local server tick cost remained well below the 33.33 ms simulation budget in both samples. Snapshot arrival tails exceeded one nominal tick because this short probe includes local scheduler and transport timing; the client interpolation buffer remains necessary.

This evidence does not establish public-network latency, serialized snapshot payload size, or long-session memory stability. Those remain release gates, along with the two-browser recording and computer-plus-phone acceptance pass.

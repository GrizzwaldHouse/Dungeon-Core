// measure.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep release-performance summaries deterministic and prevent misleading byte or percentile reports.

'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { memorySummary, memorySample, sampledMemorySummary, options, percentile, summary } = require('../scripts/measure');

test('soak duration accepts 30 minutes and rejects invalid load settings', () => {
  assert.deepEqual(options(['--duration=1800', '--rooms=2', '--players=6']), { seconds: 1800, roomCount: 2, playersPerRoom: 6 });
  assert.equal(options([]).seconds, 4);
  for (const duration of ['0', '1801', '-1', 'NaN', '1.5']) {
    assert.throws(() => options([`--duration=${duration}`]), RangeError);
  }
  assert.throws(() => options(['--players=1']), RangeError);
  assert.throws(() => options(['--rooms=11']), RangeError);
});

test('sampled memory peaks retain intermediate growth even when final usage falls', () => {
  const samples = [memorySample({ heapUsed: 100, rss: 500 }, 0),
    memorySample({ heapUsed: 250, rss: 600 }, 10.123),
    memorySample({ heapUsed: 90, rss: 550 }, 20)];
  assert.equal(samples[1].elapsedSeconds, 10.12);
  assert.deepEqual(sampledMemorySummary(samples), {
    sampleCount: 3, sampledPeak: { heapUsedBytes: 250, residentBytes: 600 }, samples
  });
});

test('measurement percentiles are deterministic and preserve empty samples', () => {
  assert.equal(percentile([], 0.95), null);
  assert.equal(percentile([40, 10, 30, 20], 0.5), 20);
  assert.deepEqual(summary([1, 2, 3, 4, 5]), { samples: 5, p50: 3, p95: 5, p99: 5 });
});

test('memory summary reports explicit start, end, and signed deltas', () => {
  assert.deepEqual(memorySummary(
    { heapUsed: 1000, rss: 5000 },
    { heapUsed: 850, rss: 5600 }
  ), {
    start: { heapUsedBytes: 1000, residentBytes: 5000 },
    end: { heapUsedBytes: 850, residentBytes: 5600 },
    delta: { heapUsedBytes: -150, residentBytes: 600 }
  });
});

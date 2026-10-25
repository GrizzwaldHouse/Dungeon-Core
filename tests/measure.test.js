// measure.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep release-performance summaries deterministic and prevent misleading byte or percentile reports.

'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { memorySummary, percentile, summary } = require('../scripts/measure');

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

// Partition overlap checks for the browser simulation's half-open date ranges.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { partitionMatches } = require('../docs/gitbook/javascripts/lab02-explorer.js');
const selected = (start, end) => partitionMatches(start, end).filter(p => p.eligible).map(p => p.name);

test('a range entirely within 2025 overlaps only the 2025 partition', () => {
  assert.deepEqual(selected('2025-01-01', '2025-04-01'), ['sales_2025']);
  assert.deepEqual(selected('2025-01-01', '2026-01-01'), ['sales_2025']);
});

test('half-open boundaries handle adjacent years and spanning ranges', () => {
  assert.deepEqual(selected('2025-12-31', '2026-01-01'), ['sales_2025']);
  assert.deepEqual(selected('2024-11-01', '2025-02-01'), ['sales_2024', 'sales_2025']);
  assert.deepEqual(selected('2024-01-01', '2027-01-01'), ['sales_2024', 'sales_2025', 'sales_2026']);
  assert.deepEqual(selected('2027-01-01', '2028-01-01'), []);
});

test('invalid dates and empty or reversed ranges are rejected', () => {
  assert.throws(() => partitionMatches('2025-02-29', '2025-03-01'));
  assert.throws(() => partitionMatches('2025-01-01', '2025-01-01'));
  assert.throws(() => partitionMatches('2025-12-01', '2025-01-01'));
});

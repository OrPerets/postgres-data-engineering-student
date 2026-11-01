const test = require('node:test');
const assert = require('node:assert/strict');
const { traceRecords } = require('../docs/gitbook/javascripts/lab04-pack.js');

test('local combination sums within records without combining across records', () => {
  const raw = traceRecords(['AAA', 'ABA'], false);
  const combined = traceRecords(['AAA', 'ABA'], true);
  assert.deepEqual(combined.localGroups, [[['A', 3]], [['A', 2], ['B', 1]]]);
  assert.deepEqual([...combined.grouped], [['A', [3, 2]], ['B', [1]]]);
  assert.deepEqual(combined.counts, raw.counts);
  assert.equal(raw.pairs.length, 6);
  assert.equal(combined.pairs.length, 3);
});

test('trace rejects invalid and oversized input', () => {
  assert.throws(() => traceRecords([], false));
  assert.throws(() => traceRecords(['A B'], false));
  assert.throws(() => traceRecords(['A'.repeat(31)], false));
  assert.throws(() => traceRecords(Array(13).fill('A'), false));
  assert.throws(() => traceRecords(Array(5).fill('A'.repeat(25)), false));
});

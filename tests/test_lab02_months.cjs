const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate } = require('../docs/gitbook/javascripts/lab02-months.js');

test('March LAG and ROWS frame differ when February is missing', () => {
  const sparse = calculate('sparse', 'March');
  const complete = calculate('complete', 'March');
  assert.equal(sparse.previous.revenue, 100);
  assert.deepEqual(sparse.frame.map(row => row.revenue), [100, 300]);
  assert.equal(sparse.average, 200);
  assert.equal(complete.previous.revenue, 0);
  assert.deepEqual(complete.frame.map(row => row.revenue), [100, 0, 300]);
  assert.ok(Math.abs(complete.average - 400 / 3) < 1e-12);
});
test('April frames count rows and include different months', () => {
  assert.equal(calculate('sparse', 'April').average, 200);
  assert.ok(Math.abs(calculate('complete', 'April').average - 500 / 3) < 1e-12);
});
test('first row has NULL previous and short frame; missing sparse month has no result', () => {
  const january = calculate('complete', 'January');
  assert.equal(january.previous, null); assert.equal(january.frame.length, 1); assert.equal(january.average, 100);
  const missing = calculate('sparse', 'February');
  assert.equal(missing.current, null); assert.equal(missing.average, null);
  assert.throws(() => calculate('invalid', 'March')); assert.throws(() => calculate('complete', 'May'));
});

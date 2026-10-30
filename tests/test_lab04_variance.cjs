const test = require('node:test');
const assert = require('node:assert/strict');
const { compute, merge, partial, presets } = require('../docs/gitbook/javascripts/lab04-variance.js');

test('worker states merge to the variance for all four observations', () => {
  const r = compute(presets.separated);
  assert.deepEqual(r.partials, [{count: 2, sum: 3, squares: 5}, {count: 2, sum: 7, squares: 25}]);
  assert.deepEqual(r.combined, {count: 4, sum: 10, squares: 30});
  assert.deepEqual(r.localVariances, [0.25, 0.25]);
  assert.equal(r.globalVariance, 1.25);
});
test('zero local variance can conceal global spread', () => {
  const r = compute(presets.constant);
  assert.deepEqual(r.localVariances, [0, 0]); assert.equal(r.globalVariance, 1);
});
test('empty states merge safely and zero total has no variance', () => {
  const r = compute(presets.empty);
  assert.deepEqual(r.combined, {count: 0, sum: 0, squares: 0});
  assert.deepEqual(r.localVariances, [null, null]); assert.equal(r.globalVariance, null);
  assert.deepEqual(merge(partial([]), partial([2, 4])), {count: 2, sum: 6, squares: 20});
});
test('rejects invalid groups', () => {
  assert.throws(() => compute([[1], [NaN]])); assert.throws(() => compute([[1]]));
});

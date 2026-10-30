const test = require('node:test');
const assert = require('node:assert/strict');
const { compareMeans, presets } = require('../docs/gitbook/javascripts/lab04-mean.js');

test('unequal worker sizes need weighted aggregation', () => {
  const result = compareMeans(presets.unequal);
  assert.deepEqual(result.partials, [{ sum: 1, count: 1, mean: 1 }, { sum: 15, count: 3, mean: 5 }]);
  assert.equal(result.naive, 3); assert.equal(result.weighted, 4);
  assert.equal(result.sum, 16); assert.equal(result.count, 4);
});
test('equal worker counts give the same result', () => {
  const result = compareMeans(presets.equal);
  assert.equal(result.naive, 4); assert.equal(result.weighted, 4);
});
test('unequal counts can coincide when local means match', () => {
  const result = compareMeans(presets.coincidence);
  assert.equal(result.naive, 1); assert.equal(result.weighted, 1);
});
test('invalid and empty examples are rejected', () => {
  assert.throws(() => compareMeans([[1], []]));
  assert.throws(() => compareMeans([[1], [NaN]]));
});

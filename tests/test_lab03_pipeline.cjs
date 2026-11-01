const test = require('node:test');
const assert = require('node:assert/strict');
const { appendedObservations } = require('../docs/gitbook/javascripts/lab03-pack.js');

test('the pipeline appends two five-row feeds', () => {
  assert.equal(appendedObservations([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]).length, 10);
});

test('append preserves matching observations, their source order, and the original feeds', () => {
  const first = ['same', 'first'];
  const second = ['same', 'second'];
  assert.deepEqual(appendedObservations(first, second), ['same', 'first', 'same', 'second']);
  assert.deepEqual(first, ['same', 'first']);
  assert.deepEqual(second, ['same', 'second']);
  assert.deepEqual(appendedObservations([], []), []);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../docs/gitbook/javascripts/lab01-null.js');
test('known matching city: FALSE defeats UNKNOWN in AND', () => {
  const a = evaluate('Haifa', true);
  assert.deepEqual(a.comparisons.map(c => c.result), ['FALSE','TRUE','UNKNOWN']);
  assert.equal(a.notIn, 'FALSE'); assert.equal(a.notExists, 'FALSE'); assert.equal(a.guarded, 'FALSE');
  const withoutNull = evaluate('Haifa', false);
  assert.deepEqual(withoutNull.comparisons.map(c => c.result), ['FALSE','TRUE']);
  assert.equal(withoutNull.notIn, 'FALSE'); assert.equal(withoutNull.notExists, 'FALSE'); assert.equal(withoutNull.guarded, 'FALSE');
});
test('known nonmatch: NULL produces UNKNOWN, without NULL becomes TRUE', () => {
  assert.equal(evaluate('Eilat', true).notIn, 'UNKNOWN');
  assert.equal(evaluate('Eilat', false).notIn, 'TRUE');
  assert.equal(evaluate('Eilat', true).notExists, 'TRUE');
  assert.equal(evaluate('Eilat', true).guarded, 'TRUE');
});
test('unknown outer city: nonempty NOT IN is UNKNOWN, NOT EXISTS needs guard', () => {
  for (const includeNull of [false, true]) {
    const a = evaluate(null, includeNull);
    assert.equal(a.notIn, 'UNKNOWN'); assert.equal(a.notExists, 'TRUE'); assert.equal(a.guarded, 'FALSE');
  }
});
test('rejects invalid values to keep simulation domain explicit', () => {
  assert.throws(() => evaluate('Jerusalem', true)); assert.throws(() => evaluate('Eilat', 'yes'));
});

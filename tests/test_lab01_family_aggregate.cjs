const test = require('node:test');
const assert = require('node:assert/strict');
const family = require('../docs/gitbook/javascripts/lab01-family-aggregate.js');
const find = id => family.functions.find(fn => fn.id === id);
const result = (id, i) => find(id).steps[i].result;

test('running sums, averages, counts and extrema use the current frame', () => {
  assert.equal(result('sum', 4), '1220');
  assert.equal(result('avg', 3), '275.00 (rounded)');
  assert.equal(result('count', 2), '3');
  assert.equal(result('min', 4), '120');
  assert.equal(result('max', 2), '300');
});
test('population and sample statistics differ and sample singleton is NULL', () => {
  assert.equal(result('stddev_pop', 1), '50.00 (rounded)');
  assert.equal(result('stddev_samp', 1), '70.71 (rounded)');
  assert.equal(result('var_pop', 1), '2500.00 (rounded)');
  assert.equal(result('var_samp', 1), '5000.00 (rounded)');
  assert.equal(result('stddev_samp', 0), 'NULL');
  assert.equal(result('var_samp', 0), 'NULL');
});
test('boolean and collection examples follow the ordered frame', () => {
  assert.equal(result('bool_or', 2), 'FALSE');
  assert.equal(result('bool_or', 3), 'TRUE');
  assert.equal(result('bool_and', 3), 'TRUE');
  assert.equal(result('bool_and', 4), 'FALSE');
  assert.equal(result('array_agg', 2), '[101, 102, 103]');
  assert.equal(result('string_agg', 2), '101, 102, 103');
});
test('every function has five labeled steps and one current row', () => {
  assert.equal(family.functions.length, 13);
  for (const fn of family.functions) {
    assert.equal(fn.steps.length, 5, fn.name);
    assert.match(fn.syntax, /ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW/);
    for (const step of fn.steps) {
      assert.equal(step.rows.length, 5);
      assert.equal(step.rows.filter(row => row.role === 'current').length, 1);
      assert.ok(step.result && step.detail);
    }
  }
});

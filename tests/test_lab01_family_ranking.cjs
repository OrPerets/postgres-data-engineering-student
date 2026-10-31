const test = require('node:test');
const assert = require('node:assert/strict');
const { ranking, distribution } = require('../docs/gitbook/javascripts/lab01-family-ranking.js');

function steps(family, name) {
  const model = family.functions.find(item => item.name === name);
  assert.ok(model, name);
  assert.equal(model.steps.length, 5);
  return model.steps;
}
function results(family, name) { return steps(family, name).map(step => step.result); }

test('ranks revenue-descending orders and preserves only intended ties', () => {
  assert.deepEqual(results(ranking, 'ROW_NUMBER'), ['1', '2', '3', '4', '5']);
  assert.deepEqual(results(ranking, 'RANK'), ['1', '2', '3', '3', '5']);
  assert.deepEqual(results(ranking, 'DENSE_RANK'), ['1', '2', '3', '3', '4']);
  const tie = steps(ranking, 'RANK')[2];
  assert.deepEqual(tie.rows.map(row => row.id), [104, 101, 102, 103, 134]);
  assert.equal(tie.rows.find(row => row.id === 102).role, 'Current');
  assert.equal(tie.rows.find(row => row.id === 103).role, 'Peer');
  assert.equal(steps(ranking, 'ROW_NUMBER')[2].rows.find(row => row.id === 103).role, 'Later');
});

test('distribution measures account for the entire peer group', () => {
  assert.deepEqual(results(distribution, 'PERCENT_RANK'), ['0', '0.25', '0.5', '0.5', '1']);
  assert.deepEqual(results(distribution, 'CUME_DIST'), ['0.2', '0.4', '0.8', '0.8', '1']);
  assert.equal(steps(distribution, 'CUME_DIST')[2].rows.find(row => row.id === 103).role, 'Peer');
});

test('ntile uses near-equal bucket sizes and explains deterministic ties', () => {
  assert.deepEqual(results(distribution, 'NTILE'), ['1', '1', '1', '2', '2']);
  assert.deepEqual(steps(distribution, 'NTILE')[0].rows.map(row => row.annotation), ['Bucket 1', 'Bucket 1', 'Bucket 1', 'Bucket 2', 'Bucket 2']);
  assert.match(distribution.functions.find(item => item.id === 'ntile').syntax, /revenue DESC, order_id/);
  assert.match(distribution.functions.find(item => item.id === 'ntile').explanation, /split ties/);
});

test('each step has exactly one current row and readable explanations', () => {
  for (const family of [ranking, distribution]) {
    for (const model of family.functions) {
      assert.ok(model.syntax.includes('OVER'));
      for (const step of model.steps) {
        assert.equal(step.rows.filter(row => row.role === 'Current').length, 1, model.name);
        assert.ok(step.detail && step.result);
      }
    }
  }
});

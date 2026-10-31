const test = require('node:test');
const assert = require('node:assert/strict');
const { offsets, values } = require('../docs/gitbook/javascripts/lab01-family-navigation.js');

const get = (family, name) => family.functions.find(fn => fn.name === name);
const ids = [101, 102, 103, 104, 134];

test('LAG and LEAD navigate within the ordered customer partition', () => {
  const lag = get(offsets, 'LAG');
  const lead = get(offsets, 'LEAD');
  assert.deepEqual(lag.steps.map(step => step.result), ['NULL', '300', '200', '200', '400']);
  assert.deepEqual(lead.steps.map(step => step.result), ['200', '200', '400', '120', 'NULL']);
  assert.equal(lag.steps[3].rows.find(row => row.role === 'Previous').id, 103);
  assert.equal(lead.steps[3].rows.find(row => row.role === 'Next').id, 134);
  assert.ok(!lag.steps[0].rows.some(row => row.role === 'Previous'));
  assert.ok(!lead.steps[4].rows.some(row => row.role === 'Next'));
  assert.ok(!lag.syntax.includes('ROWS BETWEEN'));
});

test('value functions read the specified position in the full frame', () => {
  for (const [name, sourceId, result] of [
    ['FIRST_VALUE', 101, '300'], ['LAST_VALUE', 134, '120'], ['NTH_VALUE', 103, '200']
  ]) {
    const fn = get(values, name);
    assert.match(fn.syntax, /ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING/);
    assert.equal(fn.steps.length, ids.length);
    for (let i = 0; i < ids.length; i++) {
      const step = fn.steps[i];
      assert.deepEqual(step.rows.map(row => row.id), ids);
      assert.equal(step.result, result);
      assert.equal(step.rows.find(row => row.role.includes('Source')).id, sourceId);
      assert.equal(step.rows.find(row => row.role.includes('Current')).id, ids[i]);
    }
  }
});

test('browser registration preserves the other function families', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const path = require('node:path');
  const script = fs.readFileSync(path.join(__dirname, '../docs/gitbook/javascripts/lab01-family-navigation.js'), 'utf8');
  const existing = { title: 'Aggregate windows' };
  const context = { window: { Lab01FunctionFamilies: { aggregate: existing } } };
  vm.runInNewContext(script, context);
  assert.equal(context.window.Lab01FunctionFamilies.aggregate, existing);
  assert.equal(context.window.Lab01FunctionFamilies.offsets.functions.length, 2);
  assert.equal(context.window.Lab01FunctionFamilies.values.functions.length, 3);
});

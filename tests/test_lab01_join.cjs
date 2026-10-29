// Regression checks for the browser explorer's SQL-style join simulation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildRows, countCustomers } = require('../docs/gitbook/javascripts/lab01-join.js');

test('LEFT JOIN retains a customer with no matching orders', () => {
  const rows = buildRows('left', false);
  assert.equal(rows.length, 5);
  assert.equal(countCustomers(rows), 3);
  assert.equal(rows.find(row => row.customer.name === 'Noa').order, null);
  assert.equal(rows.filter(row => row.order && row.order.id === 101).length, 2);
});

test('INNER JOIN removes unmatched customers', () => {
  const rows = buildRows('inner', false);
  assert.equal(rows.length, 4);
  assert.equal(countCustomers(rows), 2);
  assert.ok(rows.every(row => row.order && row.item));
});

test('WHERE completed filters both pending and NULL orders', () => {
  for (const kind of ['left', 'inner']) {
    const rows = buildRows(kind, true);
    assert.equal(rows.length, 3);
    assert.equal(countCustomers(rows), 2);
    assert.ok(rows.every(row => row.order && row.order.status === 'completed'));
  }
});

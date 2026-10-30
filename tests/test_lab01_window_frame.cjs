const { test } = require('node:test');
const assert = require('node:assert/strict');
const { orders, calculateFrame, windowSql } = require('../docs/gitbook/javascripts/lab01-window-frame.js');

test('running ROWS uses order-by-order cumulative sums', () => {
  assert.deepEqual(orders.map((_, i) => calculateFrame(i, 'running', 'date_id').result), [300, 500, 700, 1100, 1220]);
  assert.deepEqual(calculateFrame(3, 'running', 'date_id').frame.map(r => r.id), [101, 102, 103, 104]);
});

test('the three-order frame begins smaller and slides', () => {
  assert.deepEqual(calculateFrame(1, 'moving', 'date_id').frame.map(r => r.id), [101, 102]);
  const fourth = calculateFrame(3, 'moving', 'date_id');
  assert.deepEqual(fourth.frame.map(r => r.id), [102, 103, 104]);
  assert.equal(fourth.result, 800 / 3);
  assert.equal(calculateFrame(4, 'moving', 'date_id').result, 240);
});

test('default date-only frame includes all same-date peers, but unique order IDs remove peers', () => {
  assert.deepEqual(orders.map((_, i) => calculateFrame(i, 'default', 'date').result), [300, 700, 700, 1100, 1220]);
  assert.deepEqual(calculateFrame(1, 'default', 'date').frame.map(r => r.id), [101, 102, 103]);
  assert.deepEqual(orders.map((_, i) => calculateFrame(i, 'default', 'date_id').result), [300, 500, 700, 1100, 1220]);
});

test('generated SQL matches each frame and ordering', () => {
  assert.match(windowSql('moving', 'date_id'), /AVG\(revenue\)[\s\S]*ORDER BY order_date, order_id[\s\S]*ROWS BETWEEN 2 PRECEDING AND CURRENT ROW/);
  assert.match(windowSql('running', 'date'), /ORDER BY order_date\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW/);
  assert.doesNotMatch(windowSql('default', 'date'), /ROWS BETWEEN/);
  assert.throws(() => calculateFrame(-1, 'running', 'date'));
  assert.throws(() => windowSql('bad', 'date'));
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rankRows, lagRows } = require('../docs/gitbook/javascripts/lab01-window-rank-lag.js');

test('ranking keeps revenue peers and distinguishes rank gaps', () => {
  const rows = rankRows(false, false);
  assert.deepEqual(rows.map(x => x.rowNumber), [1, 2, 3]);
  assert.deepEqual(rows.map(x => x.rank), [1, 1, 3]);
  assert.deepEqual(rows.map(x => x.denseRank), [1, 1, 2]);
});

test('each unique ID tie-breaker affects only its own ranking window', () => {
  let rows = rankRows(true, false);
  assert.deepEqual(rows.map(x => x.rank), [1, 2, 3]);
  assert.deepEqual(rows.map(x => x.denseRank), [1, 1, 2]);
  rows = rankRows(false, true);
  assert.deepEqual(rows.map(x => x.rank), [1, 1, 3]);
  assert.deepEqual(rows.map(x => x.denseRank), [1, 2, 3]);
  rows = rankRows(true, true);
  assert.deepEqual(rows.map(x => x.rank), [1, 2, 3]);
  assert.deepEqual(rows.map(x => x.denseRank), [1, 2, 3]);
});

test('distinct revenue preset has no peers regardless of tie-breakers', () => {
  for (const rankBreak of [false, true]) for (const denseBreak of [false, true]) {
    const rows = rankRows(rankBreak, denseBreak, false);
    assert.deepEqual(rows.map(x => x.revenue), [600, 500, 300]);
    assert.deepEqual(rows.map(x => x.rank), [1, 2, 3]);
    assert.deepEqual(rows.map(x => x.denseRank), [1, 2, 3]);
  }
});

test('filtering before LAG removes January and February input rows', () => {
  const rows = lagRows(true);
  assert.deepEqual(rows.map(x => x.id), [104, 134]);
  assert.deepEqual(rows.map(x => x.previous), [null, 400]);
  assert.deepEqual(rows.map(x => x.previousOrder), [null, 104]);
});

test('filtering after LAG preserves the preceding February order', () => {
  const rows = lagRows(false);
  assert.deepEqual(rows.map(x => x.id), [104, 134]);
  assert.deepEqual(rows.map(x => x.previous), [200, 400]);
  assert.deepEqual(rows.map(x => x.previousOrder), [103, 104]);
});

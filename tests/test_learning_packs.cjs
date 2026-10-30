const { test } = require('node:test');
const assert = require('node:assert/strict');
const { traceRecords } = require('../docs/gitbook/javascripts/lab04-pack.js');
const { step } = require('../docs/gitbook/javascripts/lab05-pack.js');
const { score } = require('../docs/gitbook/javascripts/lab06-pack.js');

test('MapReduce trace preserves counts with and without a combiner', () => {
  const normal = traceRecords(['ABR', 'CCR', 'ACB'], false);
  const combined = traceRecords(['ABR', 'CCR', 'ACB'], true);
  assert.deepEqual(normal.counts, [['A',2],['B',2],['C',3],['R',2]]);
  assert.deepEqual(combined.counts, normal.counts);
  assert.equal(normal.pairs.length, 9);
  assert.equal(combined.pairs.length, 8);
  assert.throws(() => traceRecords(['abc'], false));
});

test('PageRank conserves mass and damps dangling mass', () => {
  let ranks = { A:.25, B:.25, C:.25, D:.25 };
  const initial = step(ranks);
  for (const [node, expected] of Object.entries({A:.303125,B:.196875,C:.409375,D:.090625})) {
    assert.ok(Math.abs(initial.next[node] - expected) < 1e-12);
  }
  for (let i=0; i<100; i++) {
    ranks = step(ranks).next;
    assert.ok(Math.abs(Object.values(ranks).reduce((a,b) => a+b, 0) - 1) < 1e-12);
  }
});

test('PageRank damping changes a first step while preserving mass', () => {
  const uniform = { A:.25, B:.25, C:.25, D:.25 };
  // Each pre-damping input is link contribution + .25/4 from dangling D.
  const expected = {
    0.50: { A:.28125, B:.21875, C:.34375, D:.15625 },
    0.85: { A:.303125, B:.196875, C:.409375, D:.090625 },
    0.95: { A:.309375, B:.190625, C:.428125, D:.071875 }
  };
  for (const d of [.5, .85, .95]) {
    const result = step(uniform, d);
    for (const [node, value] of Object.entries(expected[d])) assert.ok(Math.abs(result.next[node] - value) < 1e-12);
    assert.ok(Math.abs(result.teleport - (1-d)/4) < 1e-12);
    assert.ok(Math.abs(result.danglingContribution - d*.25/4) < 1e-12);
    let ranks = uniform;
    for (let i = 0; i < 50; i++) {
      ranks = step(ranks, d).next;
      assert.ok(Math.abs(Object.values(ranks).reduce((sum, v) => sum + v, 0) - 1) < 1e-12);
    }
  }
  assert.throws(() => step(uniform, -0.1));
  assert.throws(() => step(uniform, 1.1));
});

test('TF-IDF uses document frequency and natural log consistently', () => {
  const data = score('D1', 'data');
  assert.equal(data.count, 2); assert.equal(data.length, 4); assert.equal(data.df, 3);
  assert.ok(Math.abs(data.value - 0.5 * Math.log(5/4)) < 1e-12);
  assert.equal(score('D1', 'pipelines').value, 0);
  assert.throws(() => score('missing', 'data'));
});

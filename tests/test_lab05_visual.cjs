const { test } = require('node:test');
const assert = require('node:assert/strict');
const { step } = require('../docs/gitbook/javascripts/lab05-pack.js');

test('the practice graph distributes contributions and conserves damped dangling mass', () => {
  const practice = { A: ['B'], B: ['A', 'C'], C: ['B'], D: [] };
  const update = step({ A: .25, B: .25, C: .25, D: .25 }, .85, practice);
  assert.deepEqual(update.incoming, { A: .125, B: .5, C: .125, D: 0 });
  assert.equal(update.dangling, .25);
  for (const [page, value] of Object.entries({ A: .196875, B: .515625, C: .196875, D: .090625 })) {
    assert.ok(Math.abs(update.next[page] - value) < 1e-12);
  }
  assert.ok(Math.abs(Object.values(update.next).reduce((a,b) => a+b, 0) - 1) < 1e-12);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { expectedStagedCost } = require('../docs/gitbook/javascripts/lab03-pack.js');

test('the supplied populated cost strings become numbers, while the blank cost stays unknown', () => {
  assert.equal(expectedStagedCost('sf'), 'number');
  assert.equal(expectedStagedCost('dk'), 'number');
  assert.equal(expectedStagedCost('missing'), 'null');
  assert.throws(() => expectedStagedCost('invalid'), /Unknown observation/);
});

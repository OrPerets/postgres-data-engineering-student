const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDraft, notesText } = require('../docs/gitbook/javascripts/lab04-browser.js');

test('browser draft keeps Python and task notes, including an intentionally blank file', () => {
  assert.deepEqual(parseDraft(JSON.stringify({code: '', notes: {'1': 'Trace', '7': 'Population variance'}})),
    {code: '', notes: {'1': 'Trace', '7': 'Population variance'}});
  assert.equal(parseDraft('not json'), null);
  assert.equal(parseDraft('{"code":12,"notes":{}}'), null);
  assert.equal(parseDraft('{"code":"x","notes":{"1":12}}'), null);
  assert.equal(parseDraft('{"code":"x","notes":{"12":"unexpected"}}'), null);
});

test('download notes preserves each question and the matching response', () => {
  assert.equal(notesText([{id: 1, question: 'Trace'}, {id: 2, question: 'Reducers'}], {'1': 'My answer'}),
    'Question 1: Trace\n\nMy answer\n\n---\n\nQuestion 2: Reducers\n\n\n');
});

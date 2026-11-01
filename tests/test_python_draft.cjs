const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDraft, notesText } = require('../docs/gitbook/javascripts/python-draft.js');

test('saved Python, SQL and per-question notes round-trip for each lab', () => {
  const draft = { code: '', sql: 'SELECT 1;', notes: {'1': 'graph', '13': 'reasoning'} };
  assert.deepEqual(parseDraft(JSON.stringify(draft), 13), draft);
  assert.equal(parseDraft(JSON.stringify({...draft, notes: {'14': 'outside'}}), 13), null);
  assert.deepEqual(parseDraft(JSON.stringify({...draft, notes: {'14': 'allowed'}}), 14).notes, {'14': 'allowed'});
  assert.equal(parseDraft('{broken', 14), null);
});

test('notes download associates each answer with the correct question', () => {
  const text = notesText([{id: 1, question: 'First'}, {id: 2, question: 'Second'}], {'2': 'Answer two'});
  assert.match(text, /Question 1: First/);
  assert.match(text, /Question 2: Second\n\nAnswer two/);
});

// Exercise the real browser export handler with SQL responses and a mocked DOM.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function parseCsv(text) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') quoted = false;
      else value += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(value); value = ''; }
    else if (c === '\r' && text[i + 1] === '\n') { row.push(value); rows.push(row); row = []; value = ''; i++; }
    else value += c;
  }
  assert.equal(quoted, false, 'CSV must close quoted fields');
  assert.deepEqual(row, [], 'CSV must end at a row boundary');
  return rows;
}

function element() {
  return {
    handlers: {}, children: [], value: '', selectionStart: 0, selectionEnd: 0,
    addEventListener(type, fn) { this.handlers[type] = fn; },
    async trigger(type) { return this.handlers[type]?.(); },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    remove() {}, setAttribute() {}, getAttribute() { return 'false'; },
    querySelectorAll() { return []; },
  };
}

test('SQL result CSV preserves NULL and literal values through the download handler', async () => {
  const elements = new Map(); let blob;
  const document = {
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement(tag) { const node = element(); if (tag === 'a') node.click = () => {}; return node; },
    createTextNode(text) { return { textContent: text }; }, body: element(),
  };
  const columns = ['null','literal NULL','literal marker','empty','backslash','punctuation','header\\name'];
  const values = [null, 'NULL', '\\N', '', 'a\\b', 'comma,"quote"\nnext', 'ok'];
  const responses = {
    '/api/tasks': {lab:'06', tasks:[{id:1, question:'Example', hint:''}]},
    '/api/state': {state:{source:'',sql:'',notes:{},scratch:''},revision:'a'},
    '/api/sql': {columns,rows:[values],truncated:true},
  };
  const context = {
    document, window:{addEventListener(){}}, Blob, setTimeout(){},
    URL:{createObjectURL(value){blob=value;return 'blob:test';},revokeObjectURL(){}},
    fetch:async endpoint=>({ok:true,json:async()=>responses[endpoint]}),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  const sql = document.getElementById('sql'); sql.value = 'SELECT 1';
  await document.getElementById('run-sql').trigger('click');
  await document.getElementById('download-results').trigger('click');
  assert.ok(blob, 'the real download handler must create a CSV blob');
  const rows = parseCsv(await blob.text());
  assert.deepEqual(rows[0], ['Displayed rows','1']);
  assert.deepEqual(rows[1], ['Truncated','Yes']);
  assert.deepEqual(rows[2], ['Data encoding','SQL NULL = \\N; backslashes in non-null values are doubled']);
  assert.deepEqual(rows[4], columns, 'headers must not be backslash encoded');
  assert.deepEqual(rows[5], ['\\N','NULL','\\\\N','','a\\\\b','comma,"quote"\nnext','ok']);
  const decoded = rows[5].map(v => v === '\\N' ? null : v.replace(/\\\\/g, '\\'));
  assert.deepEqual(decoded, values);
});

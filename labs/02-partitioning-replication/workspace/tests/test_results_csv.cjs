// Exercise the real download handler with a captured Blob; no browser or database is required.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Parse standard quoted CSV, including embedded quotes, commas and newlines.
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else cell += c;
  }
  assert.equal(quoted, false);
  assert.equal(cell, '');
  assert.deepEqual(row, []);
  return rows;
}

for (const [lab, expectedServer] of [['02-partitioning-replication', 'Primary'], ['03-dwh-etl', 'Warehouse']]) {
  test(`${lab} downloads distinguish NULL and escaped values`, async () => {
    const script = path.resolve(__dirname, '..', '..', '..', lab, 'workspace', 'app.js');
    let source = fs.readFileSync(script, 'utf8');
    const marker = "  elements.hintToggle.addEventListener('click', () => {";
    assert.equal(source.split(marker).length, 2);
    source = source.replace(marker, '  window.__setLastResult = value => { lastResult = value; };\n' + marker);
    assert.match(source, /  initialize\(\);\n  loadSchema\(\);/);
    source = source.replace(/  initialize\(\);\n  loadSchema\(\);/, '');

    const elements = new Map(); let blob; let clicked; let link;
    const element = id => {
      if (!elements.has(id)) elements.set(id, {
        handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; },
        setAttribute() {}, getAttribute() { return null; }
      });
      return elements.get(id);
    };
    const document = {
      getElementById: element, querySelectorAll: () => [],
      createElement: () => ({click() { clicked = true; }, remove() {}}),
      body: {append(node) { link = node; }}
    };
    const window = {addEventListener() {}, matchMedia: () => ({matches: false})};
    const context = {
      document, window, Blob,
      URL: {createObjectURL(value) { blob = value; return 'blob:test'; }, revokeObjectURL() {}},
      setTimeout() {}
    };
    vm.runInNewContext(source, context, {filename: script});
    const input = [null, 'NULL', '\\N', '\\', '', 'a,b', 'a"b', 'a\nb', 0, false];
    window.__setLastResult({
      data: {columns: ['header\\N', 'other'], rows: [input], truncated: true},
      executedTarget: 'primary', mode: 'read', questionId: 'A1'
    });
    element('download-results').handlers.click();
    assert.ok(clicked);
    assert.match(link.download, /^lab0[23]-A1-/);
    const rows = parseCsv(await blob.text());
    assert.deepEqual(rows[0], ['Server', expectedServer]);
    assert.deepEqual(rows[1], ['Mode', 'Query']);
    assert.deepEqual(rows[2], ['Question', 'A1']);
    assert.deepEqual(rows[3], ['Displayed rows', '1']);
    assert.deepEqual(rows[4], ['Truncated', 'Yes']);
    assert.deepEqual(rows[5], ['Data encoding', 'SQL NULL = \\N; backslashes in non-null values are doubled']);
    assert.deepEqual(rows[6], ['']);
    assert.deepEqual(rows[7], ['header\\N', 'other']);
    assert.deepEqual(rows[8], ['\\N', 'NULL', '\\\\N', '\\\\', '', 'a,b', 'a"b', 'a\nb', '0', 'false']);
    const decoded = rows[8].map(value => value === '\\N' ? null : value.replace(/\\\\/g, '\\'));
    assert.deepEqual(decoded, [null, 'NULL', '\\N', '\\', '', 'a,b', 'a"b', 'a\nb', '0', 'false']);
  });
}

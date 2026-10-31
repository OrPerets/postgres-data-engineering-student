/* Exercise the actual vendored browser PostgreSQL engine with the classroom seed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { formatDownload } = require('../docs/gitbook/javascripts/lab01-practice.js');

const assets = path.resolve(__dirname, '../docs/gitbook/assets/lab01-practice');

test('browser PostgreSQL runs the lab data, window queries and multiple statements', async () => {
  const { PGlite } = await import(pathToFileURL(path.join(assets, 'pglite/index.js')).href);
  const db = new PGlite();
  try {
    await db.exec(await fs.readFile(path.join(assets, 'schema.sql'), 'utf8'));
    await db.exec(await fs.readFile(path.join(assets, 'seed.sql'), 'utf8'));
    await db.exec('SET default_transaction_read_only = on');
    const results = await db.exec(`
      SELECT count(*) FROM customers;
      SELECT count(*) FROM orders;
      SELECT 1 AS same, 2 AS same;
      SELECT order_id, lag(order_id) OVER (ORDER BY order_id) AS previous
        FROM orders WHERE customer_id = 1 ORDER BY order_id LIMIT 2;
      SELECT 1 / NULLIF(0, 0) AS protected;
    `, { rowMode: 'array' });
    assert.deepEqual(results[0].rows, [[15]]);
    assert.deepEqual(results[1].rows, [[34]]);
    assert.deepEqual(results[2].fields.map(field => field.name), ['same', 'same']);
    assert.deepEqual(results[2].rows, [[1, 2]]);
    assert.deepEqual(results[3].rows, [[101, null], [102, 101]]);
    assert.deepEqual(results[4].rows, [[null]]);
    const downloaded = formatDownload([
      { number: 1, sql: 'SELECT 1 -- a trailing comment' },
      { number: 2, sql: 'SELECT 2;' },
      { number: 3, sql: '' },
      { number: 4, sql: '-- explanation only' },
      { number: 5, sql: 'SELECT 3' },
    ]);
    assert.match(downloaded, /SELECT 1 -- a trailing comment\n;/);
    assert.match(downloaded, /-- Question 3\n\n;/);
    assert.deepEqual((await db.exec(downloaded, { rowMode: 'array' })).map(result => result.rows), [[[1]], [[2]], [[3]]]);
    await assert.rejects(db.exec('SELECT * FROM unknown_table'), /does not exist/);
    await assert.rejects(db.exec('DELETE FROM customers'), /read-only/);
    assert.deepEqual((await db.exec('SELECT count(*) FROM customers', { rowMode: 'array' }))[0].rows, [[15]]);
  } finally {
    await db.close();
  }
});

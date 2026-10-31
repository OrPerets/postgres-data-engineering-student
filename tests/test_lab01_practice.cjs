/* Exercise the actual vendored browser PostgreSQL engine with the classroom seed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { formatDownload, sampleQuery } = require('../docs/gitbook/javascripts/lab01-practice.js');

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
    // The reference panel uses the same actual database and deterministic
    // order as the exercises, with a deliberately small sample for each table.
    for (const [table, expectedFields, expectedFirst, expectedTotal] of [
      ['customers', ['customer_id', 'full_name', 'city'], [1, 'Dana Cohen', 'Haifa'], 15],
      ['orders', ['order_id', 'customer_id', 'order_date', 'status'], [101, 1], 34],
      ['order_items', ['order_id', 'line_no', 'product_name', 'category', 'quantity', 'unit_price', 'discount_pct'], [101, 1, 'Novel', 'books'], 43],
    ]) {
      const sample = (await db.exec(sampleQuery(table), { rowMode: 'array' }))[0];
      assert.deepEqual(sample.fields.map(field => field.name), expectedFields, table);
      assert.equal(sample.rows.length, 5, table);
      assert.deepEqual(sample.rows[0].slice(0, expectedFirst.length), expectedFirst, table);
      const allRows = (await db.exec(sampleQuery(table, true), { rowMode: 'array' }))[0];
      assert.equal(allRows.rows.length, expectedTotal, table);
      assert.deepEqual(allRows.rows.slice(0, 5), sample.rows, table);
    }
    // User-controlled input must never be interpolated into reference SQL.
    assert.ok(!sampleQuery('customers; DROP TABLE customers;'));
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

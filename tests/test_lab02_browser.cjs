/* Exercise the browser dataset with the same vendored PostgreSQL engine. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');

test('browser sales data supports real partitions, writes and plans', async () => {
  const engine = path.join(root, 'docs/gitbook/assets/lab01-practice/pglite/index.js');
  const { PGlite } = await import(pathToFileURL(engine).href);
  const db = new PGlite();
  try {
    const seed = await fs.readFile(path.join(root, 'docs/gitbook/assets/lab02-browser/seed.sql'), 'utf8');
    await db.exec(seed);
    const stats = (await db.exec(`
      SELECT count(*) AS n, min(sale_date)::text AS first, max(sale_date)::text AS last,
             count(DISTINCT date_trunc('month', sale_date)) AS months
      FROM sales_partitioned;
      SELECT count(*) AS mismatches FROM (
        (SELECT * FROM sales_regular EXCEPT ALL SELECT * FROM sales_partitioned)
        UNION ALL
        (SELECT * FROM sales_partitioned EXCEPT ALL SELECT * FROM sales_regular)
      ) difference;
    `, { rowMode: 'array' }));
    assert.deepEqual(stats[0].rows, [[3288, '2024-01-01', '2026-12-31', 36]]);
    assert.deepEqual(stats[1].rows, [[0]]);
    const plan = (await db.exec(`EXPLAIN SELECT * FROM sales_partitioned
      WHERE sale_date >= DATE '2025-01-01' AND sale_date < DATE '2026-01-01'`, { rowMode: 'array' }))[0].rows.flat().join('\n');
    assert.match(plan, /sales_2025/);
    assert.doesNotMatch(plan, /sales_2024|sales_2026/);
    // DDL and writes are essential to the assignment: this is a writable,
    // disposable browser database, not the read-only Lab 01 worker.
    await db.exec(`CREATE TABLE sales_test_2031 PARTITION OF sales_partitioned
      FOR VALUES FROM ('2031-01-01') TO ('2032-01-01');
      INSERT INTO sales_partitioned VALUES (99999999, DATE '2031-02-01', 1, 25.00);`);
    const routed = (await db.exec('SELECT count(*) FROM sales_test_2031', { rowMode: 'array' }))[0];
    assert.deepEqual(routed.rows, [[1]]);
    const joins = (await db.exec(`SELECT count(*) FROM sales_regular r JOIN sales_partitioned p
      ON r.sale_id = p.sale_id AND r.sale_date = p.sale_date`, { rowMode: 'array' }))[0];
    assert.deepEqual(joins.rows, [[3288]]);
  } finally {
    await db.close();
  }
});

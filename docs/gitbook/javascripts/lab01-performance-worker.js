import { PGlite } from '../assets/lab01-practice/pglite/index.js';

const subquery = `SELECT s1.id, s1.amount,
       (SELECT SUM(s2.amount) FROM sales s2 WHERE s2.id <= s1.id) AS running_total
FROM sales s1 ORDER BY s1.id`;
const windowQuery = `SELECT id, amount,
       SUM(amount) OVER (ORDER BY id ROWS UNBOUNDED PRECEDING) AS running_total
FROM sales ORDER BY id`;

self.onmessage = async ({ data }) => {
  let db;
  try {
    const count = Number(data.count);
    if (!Number.isInteger(count) || count < 1 || count > 12000) throw new Error('Choose a whole number from 1 to 12,000.');
    self.postMessage({ phase: 'setup' });
    db = new PGlite();
    await db.exec(`CREATE TABLE sales AS SELECT id, (10 + (id * 17 % 90))::integer AS amount FROM generate_series(1, ${count}) AS id`);
    const results = [];
    for (const [name, query] of [['Subquery', subquery], ['Window function', windowQuery]]) {
      self.postMessage({ phase: 'running', name });
      const start = performance.now();
      const result = await db.query(query, [], { rowMode: 'array' });
      results.push({ name, ms: performance.now() - start, rows: result.rows });
    }
    const same = results[0].rows.length === results[1].rows.length && results[0].rows.every((row, i) => row.every((v, j) => String(v) === String(results[1].rows[i][j])));
    self.postMessage({ phase: 'done', same, results: results.map(({name, ms, rows}) => ({name, ms, rows: rows.slice(0, 10), truncated: rows.length > 10})) });
  } catch (error) {
    self.postMessage({ phase: 'error', message: error.message || String(error) });
  } finally { if (db) await db.close(); }
};

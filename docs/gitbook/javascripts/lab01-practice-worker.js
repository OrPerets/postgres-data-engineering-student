/* The database lives in a disposable worker, so long queries can be stopped. */
import { PGlite } from '../assets/lab01-practice/pglite/index.js';

let database;
const base = new URL('../assets/lab01-practice/', import.meta.url);

async function initialize() {
  if (database) return database;
  const [schema, seed] = await Promise.all(['schema.sql', 'seed.sql'].map(async (file) => {
    const response = await fetch(new URL(file, base));
    if (!response.ok) throw new Error(`Could not load the sample data (${response.status}).`);
    return response.text();
  }));
  const instance = new PGlite();
  try {
    await instance.exec(schema);
    await instance.exec(seed);
    await instance.exec('SET default_transaction_read_only = on');
    database = instance;
    return database;
  } catch (error) {
    await instance.close();
    throw error;
  }
}

self.onmessage = async (event) => {
  const { id, sql } = event.data;
  try {
    const db = await initialize();
    self.postMessage({ id, initialized: true });
    const results = await db.exec(sql, { rowMode: 'array' });
    const limited = results.map((result) => ({
      fields: result.fields.map((field) => field.name),
      rows: result.rows.slice(0, 100),
      truncated: result.rows.length > 100,
      affectedRows: result.affectedRows ?? null,
    }));
    self.postMessage({ id, results: limited });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};

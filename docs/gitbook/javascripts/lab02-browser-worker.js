/* A writable, disposable single-node PostgreSQL instance in this browser.
   This worker does not provide or simulate a physical replica. */
import { PGlite } from '../assets/lab02-browser/pglite/index.js';

let database;
const seedUrl = new URL('../assets/lab02-browser/seed.sql', import.meta.url);
// Carry the generated content fingerprint through to the sample-data request.
seedUrl.search = new URL(import.meta.url).search;

async function initialize() {
  if (database) return database;
  const response = await fetch(seedUrl);
  if (!response.ok) throw new Error(`Could not load the browser sample data (${response.status}).`);
  const sql = await response.text();
  const instance = new PGlite();
  try {
    await instance.exec(sql);
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
    self.postMessage({ id, results: results.map((result) => ({
      fields: result.fields.map((field) => field.name),
      rows: result.rows.slice(0, 200),
      truncated: result.rows.length > 200,
      affectedRows: result.affectedRows ?? null,
    })) });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};

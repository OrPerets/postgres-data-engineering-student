/* The database lives in a disposable worker, so long queries can be stopped. */
import { PGlite } from '../assets/lab01-practice/pglite/index.js';

let database;
const base = new URL('../assets/lab01-practice/', import.meta.url);

async function initialize() {
  if (database) return database;
  const [schema, seed, readOnly] = await Promise.all(['schema.sql', 'seed.sql', 'read-only.sql'].map(async (file) => {
    const response = await fetch(new URL(file, base));
    if (!response.ok) throw new Error(`Could not load the sample data (${response.status}).`);
    return response.text();
  }));
  const instance = new PGlite();
  try {
    await instance.exec(schema);
    await instance.exec(seed);
    await instance.exec(readOnly);
    database = instance;
    return database;
  } catch (error) {
    await instance.close();
    throw error;
  }
}

// PostgreSQL rejects SET while a transaction is aborted. Allow the student's
// next statement through in that case so ROLLBACK can recover the session.
// The reader role still protects the classroom tables while it is aborted.
export async function executeStudentQuery(db, sql) {
  try {
    await db.exec('SET default_transaction_read_only = on');
  } catch (error) {
    if (error?.code !== '25P02') throw error;
  }
  return db.exec(sql, { rowMode: 'array' });
}

if (typeof self !== 'undefined') self.onmessage = async (event) => {
  const { id, sql } = event.data;
  try {
    const db = await initialize();
    self.postMessage({ id, initialized: true });
    // Restore the default where possible; table privileges also protect the
    // data if the student changes it or a transaction remains open.
    const results = await executeStudentQuery(db, sql);
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

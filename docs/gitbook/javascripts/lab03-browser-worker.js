/* A writable, disposable PostgreSQL database in this browser. */
import { PGlite } from '../assets/lab03-browser/pglite/index.js';

let database;
let warehouseSql;
const base = new URL('../assets/lab03-browser/', import.meta.url);
const version = new URL(import.meta.url).search;

async function loadScript(name) {
  const url = new URL(name, base);
  url.search = version;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load the lab setup (${response.status}).`);
  return response.text();
}

async function initialize() {
  if (database) return database;
  const [stageSql, loadSql] = await Promise.all([loadScript('01_stage.sql'), loadScript('02_dwh.sql')]);
  const instance = new PGlite();
  try {
    await instance.exec(stageSql);
    await instance.exec(loadSql);
    warehouseSql = loadSql;
    database = instance;
    return database;
  } catch (error) {
    await instance.close();
    throw error;
  }
}

self.onmessage = async (event) => {
  const { id, sql, action } = event.data;
  try {
    const db = await initialize();
    self.postMessage({ id, initialized: true });
    if (action && action !== 'reload-warehouse') throw new Error('Unknown workspace action.');
    const statement = action === 'reload-warehouse' ? warehouseSql : sql;
    if (typeof statement !== 'string' || !statement.trim()) throw new Error('Enter a SQL statement.');
    const results = await db.exec(statement, { rowMode: 'array' });
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

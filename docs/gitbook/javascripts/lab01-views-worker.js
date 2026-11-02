/* Each example gets an isolated, disposable PostgreSQL database. */
import { PGlite } from '../assets/lab01-practice/pglite/index.js';
self.onmessage = async ({ data }) => {
  let db;
  try {
    const base = new URL('../assets/lab01-practice/', import.meta.url);
    const files = await Promise.all(['schema.sql', 'seed.sql'].map(async (name) => {
      const response = await fetch(new URL(name, base));
      if (!response.ok) throw new Error('Could not load sample data.');
      return response.text();
    }));
    db = new PGlite();
    for (const file of files) await db.exec(file);
    self.postMessage({ id: data.id, initialized: true });
    const results = await db.exec(data.sql, { rowMode: 'array' });
    const queries = results.filter((result) => result.fields.length).map((result) => ({ fields: result.fields.map((field) => field.name), rows: result.rows.slice(0, 100), truncated: result.rows.length > 100 }));
    self.postMessage({ id: data.id, results: queries });
  } catch (error) { self.postMessage({ id: data.id, error: error.message || String(error) }); }
  finally { if (db) await db.close(); }
};

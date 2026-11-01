/* Exercise the actual Lab 03 setup using the vendored browser PostgreSQL. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');

test('browser warehouse preserves sample provenance, missing values and repeat-load semantics', async () => {
  const engine = path.join(root, 'docs/gitbook/assets/lab01-practice/pglite/index.js');
  const { PGlite } = await import(pathToFileURL(engine).href);
  const db = new PGlite();
  try {
    const stage = await fs.readFile(path.join(root, 'labs/03-dwh-etl/sql/01_stage.sql'), 'utf8');
    const warehouse = await fs.readFile(path.join(root, 'labs/03-dwh-etl/sql/02_dwh.sql'), 'utf8');
    await db.exec(stage);
    await db.exec(warehouse);
    const stats = await db.exec(`SELECT source_code, count(*) FROM stage_schema.usage GROUP BY source_code ORDER BY source_code;
      SELECT count(*) FROM dwh_schema.fact_usage;
      SELECT source_code, cost_basis FROM dwh_schema.dim_source ORDER BY source_code;
      SELECT cost_usd, total_tokens, token_consistent, quality_flags, status
      FROM dwh_schema.fact_usage WHERE batch_id='dk-sample-v1' AND row_no=4;`, { rowMode: 'array' });
    assert.deepEqual(stats[0].rows, [['DATAIKU', 5], ['SNOWFLAKE', 5]]);
    assert.deepEqual(stats[1].rows, [[10]]);
    assert.deepEqual(stats[2].rows, [['DATAIKU', 'Estimated USD'], ['SNOWFLAKE', 'Reported USD']]);
    assert.deepEqual(stats[3].rows[0].slice(0, 3), [null, null, null]);
    assert.ok(stats[3].rows[0][3].includes('MISSING_COST'));
    assert.ok(stats[3].rows[0][3].includes('MISSING_TOTAL_TOKENS'));
    assert.ok(stats[3].rows[0][3].includes('STATUS_UNAVAILABLE'));
    assert.equal(stats[3].rows[0][4], null);

    // Views reflect a source correction; a repeat of the supplied fixed-batch
    // DO NOTHING load skips the old fact instead of propagating the change.
    await db.exec("UPDATE src_schema.dataiku_raw SET estimated_cost_usd='0.123' WHERE batch_id='dk-sample-v1' AND row_no=1");
    await db.exec(warehouse);
    const correction = (await db.exec(`SELECT
      (SELECT cost_usd FROM stage_schema.usage WHERE batch_id='dk-sample-v1' AND row_no=1),
      (SELECT cost_usd FROM dwh_schema.fact_usage WHERE batch_id='dk-sample-v1' AND row_no=1),
      (SELECT count(*) FROM dwh_schema.fact_usage);`, { rowMode: 'array' }))[0];
    assert.equal(Number(correction.rows[0][0]), 0.123);
    assert.equal(Number(correction.rows[0][1]), 0.008205);
    assert.equal(correction.rows[0][2], 10);

    await db.exec("UPDATE src_schema.dataiku_raw SET estimated_cost_usd='not-a-number' WHERE batch_id='dk-sample-v1' AND row_no=1");
    const invalid = (await db.exec("SELECT cost_usd, invalid_number FROM stage_schema.usage WHERE batch_id='dk-sample-v1' AND row_no=1", { rowMode: 'array' }))[0];
    assert.deepEqual(invalid.rows, [[null, true]]);
  } finally {
    await db.close();
  }
});

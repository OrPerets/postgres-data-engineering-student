-- Diagnostics for sample from original teaching SQL.
SELECT 'snowflake_raw' AS source_table, COUNT(*) AS records FROM src_schema.snowflake_raw
UNION ALL SELECT 'dataiku_raw', COUNT(*) FROM src_schema.dataiku_raw;
SELECT source_code, COUNT(*) AS stage_records FROM stage_schema.usage GROUP BY source_code ORDER BY source_code;
SELECT s.source_code, COUNT(*) AS fact_records
FROM dwh_schema.fact_usage f
JOIN dwh_schema.dim_source s ON s.source_id=f.source_id
GROUP BY s.source_code ORDER BY s.source_code;
SELECT COUNT(*) AS invalid_numeric_rows FROM stage_schema.usage WHERE invalid_number;
-- Known missing Dataiku cost is NULL, not 0.
SELECT batch_id,row_no,cost_usd,total_tokens
FROM dwh_schema.fact_usage WHERE batch_id='dk-sample-v1' AND row_no=4;

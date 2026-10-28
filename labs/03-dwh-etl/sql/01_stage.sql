CREATE SCHEMA IF NOT EXISTS SRC_SCHEMA;
CREATE SCHEMA IF NOT EXISTS STAGE_SCHEMA;

CREATE TABLE IF NOT EXISTS SRC_SCHEMA.snowflake_raw (
  batch_id text NOT NULL,
  row_no integer,
  source_view text,
  start_time text,
  end_time text,
  function_name text,
  model_name text,
  query_id text,
  user_id text,
  warehouse_id text,
  cost_usd text,
  tokens text,
  PRIMARY KEY (batch_id,row_no)
);

CREATE TABLE IF NOT EXISTS SRC_SCHEMA.dataiku_raw (
    batch_id text NOT NULL,
    row_no integer CHECK (row_no > 0),
    event_time text,
    event_month text,
    project_key text,
    llm_type text,
    authenticated_user text,
    llm_connection text,
    llm_model text,
    prompt_tokens text,
    completion_tokens text,
    total_tokens text,
    estimated_cost_usd text,
    PRIMARY KEY (batch_id, row_no)
  );

INSERT INTO SRC_SCHEMA.snowflake_raw VALUES
 ('sf-sample-v1',1,'SF_AI_FUNCTIONS','6.10.2026 9:12','6.10.2026 10:00','AI_COMPLETE','GPT-5.5-high','01c78bac-040c-98fe-0001-9c9283fe6dc6','100726','32','9.785','1634458'),
 ('sf-sample-v1',2,'SF_AI_FUNCTIONS','6.10.2026 8:34','6.10.2026 9:00','AI_GENERATE_IMAGE','Claude-Sonnet-5','01c78b61-040c-98fe-0001-9c9283fa7566','65661','32','5.050502','25344'),
 ('sf-sample-v1',3,'SF_AI_FUNCTIONS','17.4.2026 14:00','17.4.2026 15:00','AI_COMPLETE','GPT-5.5-high','01c3c55b-0109-ee96-0001-9c925abba622','71844','4','0.1339','157'),
 ('sf-sample-v1',4,'API_AI_FUNCTIONS','12.4.2026 11:05','12.4.2026 12:00','AI_COMPLETE','Claude-Haiku-5','01c3a89f-0309-dc79-0001-9c9259ac7696','71844','4','4.4599','620'),
 ('sf-sample-v1',5,'API_AI_FUNCTIONS','15.4.2026 19:01','15.4.2026 20:00','AI_COMPLETE','Qwen-32B','01c3bb6d-0109-e68e-0001-9c925a5cb18a','71844','4','0.309','183')
ON CONFLICT DO NOTHING;

INSERT INTO SRC_SCHEMA.dataiku_raw VALUES
 ('dk-sample-v1',1,'2026-08-01T11:14:25.999','2026-08','AGENT2AGENT','SNOWFLAKE','user1@example.org','SFPROD','Claude-Sonnet-5','2200','107','2307','0.008205'),
 ('dk-sample-v1',2,'2026-08-01T11:14:26.354','2026-08','AGENT2AGENT','SNOWFLAKE','user1@example.org','SFPROD','Claude-Sonnet-5','2204','107','2311','0.008217'),
 ('dk-sample-v1',3,'2026-08-01T11:14:26.500','2026-08','CHURN_FORECAST','SNOWFLAKE','user1@example.org','SFPROD','Claude-Sonnet-5','2723','161','2884','0.010584'),
 ('dk-sample-v1',4,'2026-08-01T11:14:26.515','2026-08','AGENT2AGENT','DATAIKU','user2@example.org','','GPT-5.5-high','','','',''),
 ('dk-sample-v1',5,'2026-08-01T11:14:29.721','2026-08','CHURN_FORECAST','LOCAL','user2@example.org','SFPROD','Claude-Haiku-5','2201','107','2308','0.008208')
ON CONFLICT DO NOTHING;

-- S02A: clean Snowflake by itself. One expression, one clearly named column.
-- nk = natural key: the identifier supplied by the source, not a DWH key.
-- TRIM removes surrounding spaces; AS names the output; :: changes the type.
-- All transformations appear inside SELECT; no custom functions/procedures.
-- Numeric conversion uses built-in SQL operations only:
--   TRIM removes spaces -> CASE checks the input -> CAST converts its type.
-- pg_input_is_valid is built into PostgreSQL 16+. We do not define it ourselves.
-- CASE without ELSE returns NULL when the condition is not true.
-- '9.785' -> numeric 9.785; '' / NULL -> NULL; 'bad' -> NULL + invalid_number.
-- Missing optional values are allowed. Inspect invalid_number before loading.
-- A direct CAST would fail on 'bad'; NULLIF alone only handles blank strings.
-- Dates use the supplied sample formats; malformed dates can still fail parsing.
-- The format DD.MM.YYYY means 6.10.2026 is 6 October, not 10 June.
-- Timestamps here have no time zone; the sample supplies no zone to normalize.
CREATE OR REPLACE VIEW STAGE_SCHEMA.snowflake_clean AS
SELECT
    batch_id AS batch_id,
    row_no AS row_no,
    'SNOWFLAKE'::text AS source_code,
    to_timestamp(start_time, 'DD.MM.YYYY HH24:MI')::timestamp AS started_at,
    to_timestamp(end_time, 'DD.MM.YYYY HH24:MI')::timestamp AS ended_at,
    trim(user_id) AS user_nk,
    trim(warehouse_id) AS entity_nk,
    'WAREHOUSE'::text AS entity_type,
    'N/A'::text AS environment_label,
    trim(model_name) AS model_name,
    source_view AS source_view,
    query_id AS query_id,
    function_name AS function_name,
    NULL::text AS llm_type,
    NULL::text AS llm_connection,
    CASE WHEN pg_input_is_valid(trim(cost_usd), 'numeric')
         THEN CAST(trim(cost_usd) AS numeric) END AS cost_usd,
    CASE WHEN pg_input_is_valid(trim(tokens), 'bigint')
         THEN CAST(trim(tokens) AS bigint) END AS total_tokens,
    NULL::bigint AS prompt_tokens,
    NULL::bigint AS completion_tokens,
    NULL::text AS event_month,
    -- Supplied validation: distinguish malformed numbers from missing values.
    (nullif(trim(cost_usd), '') IS NOT NULL
        AND NOT pg_input_is_valid(trim(cost_usd), 'numeric'))
    OR (nullif(trim(tokens), '') IS NOT NULL
        AND NOT pg_input_is_valid(trim(tokens), 'bigint')) AS invalid_number
FROM SRC_SCHEMA.snowflake_raw;

CREATE OR REPLACE VIEW STAGE_SCHEMA.dataiku_clean AS
SELECT
    batch_id AS batch_id,
    row_no AS row_no,
    'DATAIKU'::text AS source_code,
    event_time::timestamp AS started_at,
    NULL::timestamp AS ended_at,
    trim(authenticated_user) AS user_nk,
    trim(project_key) AS entity_nk,
    'PROJECT'::text AS entity_type,
    'Unknown'::text AS environment_label,
    trim(llm_model) AS model_name,
    NULL::text AS source_view,
    NULL::text AS query_id,
    NULL::text AS function_name,
    trim(llm_type) AS llm_type,
    nullif(trim(llm_connection), '') AS llm_connection,
    CASE WHEN pg_input_is_valid(trim(estimated_cost_usd), 'numeric')
         THEN CAST(trim(estimated_cost_usd) AS numeric) END AS cost_usd,
    CASE WHEN pg_input_is_valid(trim(total_tokens), 'bigint')
         THEN CAST(trim(total_tokens) AS bigint) END AS total_tokens,
    CASE WHEN pg_input_is_valid(trim(prompt_tokens), 'bigint')
         THEN CAST(trim(prompt_tokens) AS bigint) END AS prompt_tokens,
    CASE WHEN pg_input_is_valid(trim(completion_tokens), 'bigint')
         THEN CAST(trim(completion_tokens) AS bigint) END AS completion_tokens,
    event_month AS event_month,
    -- Supplied validation: each populated numeric field must be parseable.
    (nullif(trim(estimated_cost_usd), '') IS NOT NULL
        AND NOT pg_input_is_valid(trim(estimated_cost_usd), 'numeric'))
    OR (nullif(trim(prompt_tokens), '') IS NOT NULL
        AND NOT pg_input_is_valid(trim(prompt_tokens), 'bigint'))
    OR (nullif(trim(completion_tokens), '') IS NOT NULL
        AND NOT pg_input_is_valid(trim(completion_tokens), 'bigint'))
    OR (nullif(trim(total_tokens), '') IS NOT NULL
        AND NOT pg_input_is_valid(trim(total_tokens), 'bigint')) AS invalid_number
FROM SRC_SCHEMA.dataiku_raw;

-- CHECKPOINT 3: 5 Dataiku rows. Row 4 stays present with unknown cost/tokens.
-- SQL tools may display NULL as an empty cell; IS NULL makes it explicit.
SELECT batch_id, row_no, started_at, user_nk, entity_nk, cost_usd,
       total_tokens, cost_usd IS NULL AS cost_is_missing
FROM STAGE_SCHEMA.dataiku_clean
ORDER BY batch_id, row_no;

-- S02C: combine the already-understood shapes and attach quality information.
-- UNION ALL appends rows; it does not join matching users or remove duplicates.
-- Columns align by position, so list them explicitly in the same order.
-- combined is a local query name inside this view, not another schema object.
CREATE OR REPLACE VIEW STAGE_SCHEMA.usage AS
WITH combined AS (
SELECT batch_id, row_no, source_code, started_at, ended_at,
       user_nk, entity_nk, entity_type, environment_label, model_name,
       source_view, query_id, function_name, llm_type, llm_connection,
       cost_usd, total_tokens, prompt_tokens, completion_tokens,
       event_month, invalid_number
FROM STAGE_SCHEMA.snowflake_clean
UNION ALL
SELECT batch_id, row_no, source_code, started_at, ended_at,
       user_nk, entity_nk, entity_type, environment_label, model_name,
       source_view, query_id, function_name, llm_type, llm_connection,
       cost_usd, total_tokens, prompt_tokens, completion_tokens,
       event_month, invalid_number
FROM STAGE_SCHEMA.dataiku_clean
)
SELECT t.*,
 CASE WHEN prompt_tokens IS NOT NULL AND completion_tokens IS NOT NULL
           AND total_tokens IS NOT NULL
      THEN prompt_tokens::numeric+completion_tokens=total_tokens END AS token_consistent,
 array_remove(ARRAY[
   CASE WHEN cost_usd IS NULL THEN 'MISSING_COST' END,
   CASE WHEN total_tokens IS NULL THEN 'MISSING_TOTAL_TOKENS' END,
   CASE WHEN invalid_number THEN 'INVALID_NUMBER' END,
   CASE WHEN prompt_tokens::numeric+completion_tokens<>total_tokens THEN 'TOKEN_MISMATCH' END,
   CASE WHEN source_code='DATAIKU' THEN 'ENVIRONMENT_UNAVAILABLE' END,
   CASE WHEN source_code='DATAIKU' AND llm_type='LOCAL' AND llm_connection='SFPROD'
        THEN 'LOCAL_WITH_SFPROD_REVIEW' END,
   CASE WHEN event_month<>to_char(started_at,'YYYY-MM') THEN 'EVENT_MONTH_MISMATCH' END,
   'STATUS_UNAVAILABLE'],NULL) AS quality_flags
FROM combined AS t;

-- Expected for the supplied sample: 5 rows per source, 10 rows altogether.
SELECT source_code, count(*) AS staging_rows
FROM STAGE_SCHEMA.usage
GROUP BY source_code
ORDER BY source_code;

-- Expected: no rows. Correct flagged input before proceeding to DWH.sql.
SELECT source_code, batch_id, row_no
FROM STAGE_SCHEMA.usage
WHERE invalid_number;

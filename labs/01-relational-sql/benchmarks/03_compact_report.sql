-- Compact benchmark report: one row per approach, columns for 4 key stages + total.
-- Execute AFTER benchmarks/01_seed_running_total.sql.
-- EXPLAIN (ANALYZE, FORMAT JSON) executes each query and returns plan metadata.
-- No full execution-plan dump. PostgreSQL 16 compatible.
DROP TABLE IF EXISTS pg_temp.benchmark_plan_results;
CREATE TEMP TABLE benchmark_plan_results (approach text, plan jsonb);

DO $$
DECLARE q text; j jsonb;
BEGIN
  q := $query$
    SELECT s.sale_id,s.customer_id,s.sale_date,s.amount,
      (SELECT SUM(s2.amount) FROM benchmark_sales s2
       WHERE s2.customer_id=s.customer_id
         AND (s2.sale_date,s2.sale_id)<=(s.sale_date,s.sale_id)) AS running_total
    FROM benchmark_sales s
  $query$;
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, FORMAT JSON) ' || q INTO j;
  INSERT INTO benchmark_plan_results VALUES ('Correlated Subquery', j);

  q := $query$
    SELECT s.sale_id,s.customer_id,s.sale_date,s.amount,
      SUM(s.amount) OVER (
        PARTITION BY s.customer_id
        ORDER BY s.sale_date,s.sale_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
    FROM benchmark_sales s
  $query$;
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, FORMAT JSON) ' || q INTO j;
  INSERT INTO benchmark_plan_results VALUES ('Window Function', j);
END $$;

WITH RECURSIVE plan_nodes AS (
  SELECT r.approach, r.plan->0->'Plan' AS node
  FROM benchmark_plan_results r
  UNION ALL
  SELECT p.approach, child.node
  FROM plan_nodes p
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.node->'Plans','[]'::jsonb)) child(node)
), metrics AS (
  SELECT approach,
    coalesce(sum((node->>'Actual Loops')::bigint) FILTER (WHERE node->>'Node Type'='Seq Scan'),0) AS seq_scan_loops,
    coalesce(sum((node->>'Actual Loops')::bigint) FILTER (WHERE node->>'Node Type'='Aggregate'),0) AS aggregate_loops,
    coalesce(sum((node->>'Actual Loops')::bigint) FILTER (WHERE node->>'Node Type'='WindowAgg'),0) AS window_loops,
    coalesce(sum((node->>'Actual Loops')::bigint) FILTER (WHERE node->>'Node Type'='Sort'),0) AS sort_loops
  FROM plan_nodes GROUP BY approach
)
SELECT r.approach,
       m.seq_scan_loops AS "Seq scan executions",
       m.aggregate_loops+m.window_loops AS "Aggregate / Window executions",
       m.sort_loops AS "Sort executions",
       (r.plan->0->'Plan'->>'Shared Hit Blocks')::bigint AS "Shared buffer hits",
       round((r.plan->0->>'Execution Time')::numeric,3) AS "Total time (ms)"
FROM benchmark_plan_results r
JOIN metrics m USING (approach)
ORDER BY CASE WHEN r.approach='Correlated Subquery' THEN 0 ELSE 1 END;

-- Speedup (same execution that produced the table):
SELECT round(
  (max((plan->0->>'Execution Time')::numeric) FILTER (WHERE approach='Correlated Subquery'))
  / nullif(max((plan->0->>'Execution Time')::numeric) FILTER (WHERE approach='Window Function'),0),1
) AS "Window speedup (x)"
FROM benchmark_plan_results;

-- CORRECTNESS CHECK (not included in benchmark timing above).
-- Compare the FULL results, not just the first few displayed rows.
-- Materialize both outputs once so a small sample and full comparison use
-- exactly the same snapshot of this classroom dataset.
DROP TABLE IF EXISTS pg_temp.benchmark_correlated_output;
DROP TABLE IF EXISTS pg_temp.benchmark_window_output;
CREATE TEMP TABLE benchmark_correlated_output AS
SELECT s.sale_id,s.customer_id,s.sale_date,s.amount,
  (SELECT sum(s2.amount) FROM benchmark_sales s2
   WHERE s2.customer_id=s.customer_id
     AND (s2.sale_date,s2.sale_id)<=(s.sale_date,s.sale_id)) AS running_total
FROM benchmark_sales s;
CREATE TEMP TABLE benchmark_window_output AS
SELECT s.sale_id,s.customer_id,s.sale_date,s.amount,
  sum(s.amount) OVER (
    PARTITION BY s.customer_id ORDER BY s.sale_date,s.sale_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM benchmark_sales s;

-- A readable sample from both implementations (same sale IDs side by side).
SELECT c.sale_id,c.customer_id,c.sale_date,c.amount,
       c.running_total AS correlated_total,
       w.running_total AS window_total,
       c.running_total IS NOT DISTINCT FROM w.running_total AS equal
FROM benchmark_correlated_output c
JOIN benchmark_window_output w USING(sale_id)
ORDER BY c.customer_id,c.sale_date,c.sale_id
LIMIT 10;

-- Verify every column in every output row, including multiplicities.
-- Expected: row_count=12000, both mismatch counts=0, result=MATCH.
WITH left_only AS (
 SELECT * FROM benchmark_correlated_output
 EXCEPT ALL
 SELECT * FROM benchmark_window_output
), right_only AS (
 SELECT * FROM benchmark_window_output
 EXCEPT ALL
 SELECT * FROM benchmark_correlated_output
), summary AS (
 SELECT (SELECT count(*) FROM benchmark_correlated_output) correlated_rows,
        (SELECT count(*) FROM benchmark_window_output) window_rows,
        (SELECT count(*) FROM left_only) only_correlated,
        (SELECT count(*) FROM right_only) only_window
)
SELECT *,CASE WHEN correlated_rows=window_rows AND only_correlated=0 AND only_window=0
              THEN 'MATCH' ELSE 'MISMATCH' END AS result
FROM summary;

-- Note: generating the correctness results executes the slow correlated query
-- again. This is deliberately NOT part of the measured EXPLAIN timings.

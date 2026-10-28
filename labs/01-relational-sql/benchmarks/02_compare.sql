-- Identical result: each row's cumulative amount within customer,
-- ordered by (sale_date,sale_id), inclusive of current transaction.
-- EXPLAIN ANALYZE executes the queries but does not return result rows.
-- Query A: correlated subquery, repeatedly finding previous rows.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT s.sale_id,s.customer_id,s.sale_date,s.amount,
  (SELECT sum(s2.amount)
   FROM benchmark_sales s2
   WHERE s2.customer_id=s.customer_id
     AND (s2.sale_date,s2.sale_id) <= (s.sale_date,s.sale_id)) AS running_total
FROM benchmark_sales s;

-- Query B: window function, one logical ordered window per customer.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT s.sale_id,s.customer_id,s.sale_date,s.amount,
  sum(s.amount) OVER (
    PARTITION BY s.customer_id
    ORDER BY s.sale_date,s.sale_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM benchmark_sales s;

-- Verify exact equivalence using EXCEPT ALL in both directions:
WITH correlated AS (
  SELECT s.sale_id,
    (SELECT sum(s2.amount) FROM benchmark_sales s2
     WHERE s2.customer_id=s.customer_id
       AND (s2.sale_date,s2.sale_id) <= (s.sale_date,s.sale_id)) AS total
  FROM benchmark_sales s
), windowed AS (
  SELECT sale_id,
    sum(amount) OVER (PARTITION BY customer_id
      ORDER BY sale_date,sale_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total
  FROM benchmark_sales
)
SELECT
  (SELECT count(*) FROM
    (SELECT * FROM correlated EXCEPT ALL SELECT * FROM windowed) mismatches) AS only_correlated,
  (SELECT count(*) FROM
    (SELECT * FROM windowed EXCEPT ALL SELECT * FROM correlated) mismatches) AS only_windowed;
-- Expected: 0 and 0.

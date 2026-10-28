-- Compare execution plans and shared buffer usage.
EXPLAIN (ANALYZE, BUFFERS) SELECT SUM(amount) FROM sales_regular
 WHERE sale_date >= DATE '2025-01-01' AND sale_date < DATE '2025-04-01';
EXPLAIN (ANALYZE, BUFFERS) SELECT SUM(amount) FROM sales_partitioned
 WHERE sale_date >= DATE '2025-01-01' AND sale_date < DATE '2025-04-01';
BEGIN;
SET LOCAL enable_partition_pruning=off;
EXPLAIN (ANALYZE, BUFFERS) SELECT SUM(amount) FROM sales_partitioned
 WHERE sale_date >= DATE '2025-01-01' AND sale_date < DATE '2025-04-01';
ROLLBACK;
-- No condition on partition key:
EXPLAIN (ANALYZE, BUFFERS) SELECT SUM(amount) FROM sales_partitioned WHERE customer_id = 42;
-- Bonus:
-- CREATE INDEX ON sales_regular (sale_date);
-- CREATE INDEX ON sales_partitioned (sale_date);

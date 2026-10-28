# Performance Challenge (optional, 15 points)

**Business requirement:** For each customer's transactions, show cumulative sales as of that transaction ordered by date and ID.

1. Write a correlated subquery solution **without** looking at `02_compare.sql`.
2. Rewrite the same calculation using `SUM(amount) OVER (PARTITION BY ... ORDER BY ... ROWS ...)`.
3. Verify both are semantically identical, including same-day transactions.
4. Time both with `EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)` three times each. Report median, speedup, and `loops`.
5. Add `CREATE INDEX ON benchmark_sales(customer_id,sale_date,sale_id)`, rerun timings and record how the optimizer reacts.
6. Explain why this case favors window processing, and why it does **not** establish that window functions are always faster.

Submit SQL, both plans, a 2×2 timing table (before/after index, correlated/window), and a paragraph interpreting the change. Do not use unmeasured timing claims.

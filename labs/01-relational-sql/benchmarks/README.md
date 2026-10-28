# Why a window function can be much faster

## Scenario
Compute **customer running revenue** per transaction on 12,000 synthetic rows. Compare two SQL implementations of *exactly the same logical answer*:

- **Correlated subquery:** for every sale, rescan earlier sales for the same customer.
- **Window function:** sort by customer/date/id and compute a cumulative sum with `SUM(...) OVER`.

This is a teaching demonstration of a particularly inefficient correlated formulation **on an unindexed table**, not a claim that every window function is faster than every alternative.

## Run (Codespaces, after Lab 01 setup)
From the repository root:

```bash
cd labs/01-relational-sql
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U student -d query_lab < benchmarks/01_seed_running_total.sql
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U student -d query_lab < benchmarks/03_compact_report.sql
```

The generated benchmark table is independent of the original classroom tables. Query A can take noticeably longer: 12,000 correlated subquery executions can scan the 12,000-row table repeatedly. If it is too slow on your Codespace, reduce the upper limit in the seed from 12,000 to 3,000 while retaining its educational purpose.

## What to record
1. Execution Time in milliseconds for each `EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)` query (repeat 3 times and report the median).
2. The correlated plan's `SubPlan` and repeated scan `loops`, versus the `WindowAgg` and `Sort` operations.
3. Shared buffers and the result-equivalence check; both mismatch counts must be zero.
4. Speedup = **correlated elapsed time / window elapsed time** (only after measuring; don't invent a value).

## Critical discussion
- Both queries have **the same per-row meaning**, including ties broken using `sale_id`. Avoid ambiguous cumulative totals with duplicate dates.
- The unindexed correlated query often behaves approximately quadratically in the number of rows. Window processing typically requires a sort `O(n log n)` and a window pass for this case.
- PostgreSQL may optimize some correlated queries, and a composite index such as `(customer_id, sale_date, sale_id)` may change the plan and runtime substantially.
- **Challenge:** create that composite index, rerun `ANALYZE`, and explain whether the advantage persists. A good answer may show smaller speedup or a different plan.
- Timing is environment-dependent; Codespaces CPU, caching, table size, planner version and indexes all matter.

## Detailed query plans (optional)
For advanced investigation, run `benchmarks/02_compare.sql`. The default `03_compact_report.sql` gives two rows with scan executions, aggregation/window executions, sorts, buffer hits, total time, and speedup. The table counts executed plan-node loops; these are not separate timings. It executes each query once and does not repeat the result-equivalence check in the detailed script.

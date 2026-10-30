# Data Engineering Lab 2 — Partitioning, Replication & Window Functions

**Work independently:** Write all SQL queries in `sql/student_exercises.sql`. The starter contains questions, NOT answers. Submit the completed SQL file, a brief report, EXPLAIN plans and screenshots. Use PostgreSQL 16 in GitHub Codespaces.

## Setup

From the **repository root**:

```bash
make lab-partitions
cd labs/02-partitioning-replication
```

The initializer preserves existing tables. If it reports incomplete setup, save your work and follow its recovery guidance instead of rerunning the destructive schema script. From the lab folder, optionally create a helper view for exploration:

```bash
docker compose exec -T primary psql -v ON_ERROR_STOP=1 -U lab -d engineering < sql/04_lab_extensions.sql
```

Connect to Primary: `docker compose exec primary psql -U lab -d engineering`.
Connect to Replica: `docker compose exec replica psql -U lab -d engineering`.

The worksheet contains statements for **both** servers. Do not run the whole file against either server, even after all statements are valid. Copy and run each selected statement in the appropriate `psql` prompt; label it Primary or Replica in your answer. Use Primary for DDL and writes, and Replica for the reads and checks requested there. Exit a prompt with `\q` before connecting to the other server.

For B5 only, first confirm the connection is the Replica with `SELECT pg_is_in_recovery();` (it should return `true`). In that Replica prompt, start a transaction, run your attempted modification separately and capture the expected read-only standby error, then issue `ROLLBACK;` to clear the failed transaction. Do not retry that write on Primary. If the role check is not `true`, stop and reconnect to the Replica before attempting the write.

## Part A: Write partitioning SQL (30 points)

A1 (5) Inspect existing partitions using PostgreSQL system views; show partition name and bounds.
A2 (5) Write a query giving yearly transaction counts and revenue for 2024–2026 on `sales_partitioned`.
A3 (5) Write an identical 2025-Q1 aggregation on `sales_regular` and `sales_partitioned`; use `EXPLAIN (ANALYZE, BUFFERS)` for both and explain scanned relations.
A4 (5) Create a new **monthly-partitioned** table for 2025 only (12 partitions). Insert only 2025 sales from the regular table. Prove query correctness against the regular table.
A5 (5) Compare pruning for a 1-month filter and a full-year filter on the monthly table; explain why an index may or may not help.
A6 (5) Add a new partition for 2027 to the existing yearly partitioned table, insert three synthetic 2027 records and verify routing.

## Part B: Replicas and consistency (20 points)

B1 (4) Write SQL that identifies Primary vs Replica using `pg_is_in_recovery()`, and report results from each server.
B2 (4) On Primary write a transaction that inserts a single unique sale into `sales_regular`; on Replica write SQL to find it. Report observed delay (if any). Avoid reusing existing IDs.
B3 (4) Write SQL on Primary to inspect `pg_stat_replication`, including application name, state, and the WAL byte difference between sent and replayed positions.
B4 (4) Write SQL on Replica to inspect `pg_stat_wal_receiver` and `pg_last_xact_replay_timestamp()`. Explain why an idle database can make elapsed replay time misleading.
B5 (4) Attempt a data modification on Replica inside a transaction (show error screenshot). Explain the role of hot standby and contrast replica vs backup.

## Part C: Window functions (35 points)

Use `sales_partitioned`, always show all requested columns. Aggregations of monetary amounts should use `SUM(amount)`.

C1 (5) Produce one row per transaction with `sale_id,customer_id,sale_date,amount` and a **customer lifetime running total** ordered by `sale_date, sale_id`.
C2 (5) Find each customer's **three largest transactions**, using `ROW_NUMBER()`; handle ties deterministically.
C3 (5) Aggregate monthly sales revenue and show previous-month revenue and month-over-month **absolute difference** using `LAG()`. Generate a complete monthly series for 2024–2026 so empty months are included.
C4 (5) For each customer, show each transaction and days since the previous transaction using `LAG(sale_date)`.
C5 (5) Monthly revenue: compute `RANK()` of each customer's revenue within each month; return the top five customers for **January 2025** including ties when rank = 5.
C6 (5) Compute a **three-month moving average** of global monthly revenue, using `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` and a complete monthly calendar.
C7 (5) Explain with your own example why SQL `PARTITION BY` in `OVER(...)` is **not the same thing** as PostgreSQL table partitioning.

## Part D: Integration challenge (15 points)

D1 (8) Write one analytical SQL query combining a date predicate suitable for partition pruning with a window function. Run on Primary and Replica, record a query plan on both, and discuss whether observed differences indicate replication or caching.
D2 (7) Design an ETL-write / analytics-read architecture. State how to route connections, what changes under replica lag, and why replica failure does not imply primary data loss.

## Submission

- `sql/student_exercises.sql` with labeled answers A1–D1 and comments marking Primary/Replica.
- `report.md` or PDF including timings, plans, screenshots and D2.
- No credentials, real personal data, or production workloads.
- Explain your results rather than claiming partitioning always improves speed.

# Lab 02 — Partitioning & Replication

> **Your mission:** Keep analytical queries efficient as sales data grows, while separating reporting workloads from ETL writes.

**You will practice:** RANGE partitions, partition pruning, physical PostgreSQL replication, replication lag, and analytical Window Functions.

## 1. Get ready

In GitHub Codespaces, **from the repository root**:

```bash
make lab-partitions
```

The initializer starts a Primary and a Read Replica, creates the sales tables, and prepares synthetic data. It preserves existing tables when already initialized.

[Open lab files](https://github.com/OrPerets/postgres-data-engineering-student/tree/main/labs/02-partitioning-replication) · [Complete student assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/02-partitioning-replication/assignments/STUDENT_ASSIGNMENT.md)

### Checkpoint — Both servers ready?

From the repository root:

```bash
cd labs/02-partitioning-replication
docker compose ps
docker compose exec -T primary psql -U lab -d engineering -c "SELECT pg_is_in_recovery();"
docker compose exec -T replica psql -U lab -d engineering -c "SELECT pg_is_in_recovery();"
```

**Expected:** Primary returns `f`; Replica returns `t`.

## 2. Understand — Partitioning is not replication

- **Partitioning:** Organizes one logical table into physical subsets, often by date.
- **Replication:** Maintains a read-only standby by replaying Primary changes.
- **SQL window PARTITION BY:** Defines logical groups for calculation; it does **not** create physical table partitions.

### Predict before running

A query asks for transactions from January to March 2025. Which yearly partitions should PostgreSQL read? What if the filter uses only `customer_id`?

## 3. Explore the query plan

From `labs/02-partitioning-replication`:

```bash
docker compose exec -T primary psql -U lab -d engineering < sql/02_partition_experiments.sql
```

Examine `EXPLAIN (ANALYZE, BUFFERS)`. Compare relations scanned, buffer usage and timing.

**Checkpoint:** Does filtering by the partition key exclude irrelevant partitions? If not, inspect the predicate and pruning settings.

**Hint:** Partition pruning can save work, but a small table may still be faster without elaborate partitioning.

## 4. Investigate the Read Replica

Insert a new row **on Primary** and query it on Replica. Inspect replication status on Primary with `pg_stat_replication`.

**Predict:** Can you write directly to Replica? Does it always show a committed Primary row immediately?

**Checkpoint:** Explain asynchronous lag and why a replica is neither a backup nor automatic failover.

## 5. Complete the SQL exercises

Work in [sql/student_exercises.sql](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/02-partitioning-replication/sql/student_exercises.sql). The assignment covers monthly partition creation, replica diagnostics, running totals, ranking, `LAG`, moving averages and a combined pruning/window query.

### Before moving on

- Can you distinguish physical partitions from logical window partitions?
- Can you explain why filtering by a partition key changes the plan?
- Can you route ETL writes to Primary and BI reads to Replica?

**Submit:** Your SQL, execution-plan evidence, and the explanations required by the assignment.

**Next:** [Lab 03 — DWH & ETL](03-dwh-etl.md).

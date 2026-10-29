# Lab 02 — Partitioning & Replication

> **Your mission:** Keep analytical queries efficient as sales data grows, while separating reporting workloads from ETL writes.

**You will practice:** RANGE partitions, partition pruning, physical PostgreSQL replication, replication lag, and analytical Window Functions.

!!! info "Your work"

    **Edit in Codespaces:** In Explorer, open `labs → 02-partitioning-replication → sql → student_exercises.sql` and write your labeled SQL answers there. Save with **Ctrl+S** (Windows/Linux) or **⌘S** (Mac).

    **Check your environment:** After starting the lab, run `make test LAB=02-partitioning-replication` from the repository root. It checks that the sales tables contain data and that Primary and Replica report the expected roles; it **does not grade your answers**.

    **Run your SQL:** From the repository root, first run `cd labs/02-partitioning-replication`. Then use either command to open a SQL prompt on the appropriate server:

    ```bash
    docker compose exec primary psql -U lab -d engineering
    docker compose exec replica psql -U lab -d engineering
    ```

    Run selected statements on the correct server, not the entire mixed worksheet. Use Primary for writes. Run the exercise that attempts a write on the read-only Replica separately; it should produce an error. Exit each `psql` prompt with `\q` before opening another.

    **Keep for submission:** Your completed SQL file and a brief `report.md` or PDF with timings, execution plans, screenshots and the D2 explanation, as described in the [assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/02-partitioning-replication/assignments/STUDENT_ASSIGNMENT.md). Submit using your instructor's instructions.

    **Back up:** Keep copies outside the Codespace: download your files from Explorer or commit and push them to your own GitHub fork. Saving in the editor alone does not submit or back up your work. See [environment setup](../getting-started.md) and [troubleshooting](../troubleshooting.md).

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

### See how the pieces connect

```mermaid
flowchart LR
  P["Primary PostgreSQL<br/>writes + queries"] -->|"WAL: asynchronous replication"| R["Physical standby<br/>read-only queries"]
  P --> T["sales_partitioned<br/>logical table on primary"]
  T --> Y24["2024 partition"]
  T --> Y25["2025 partition"]
  T --> Y26["2026 partition"]
```

A write goes to the primary. PostgreSQL routes a row in `sales_partitioned` to a yearly partition using its `sale_date`: each partition includes its start date and excludes the next year's start date. A suitable date predicate can let PostgreSQL skip partitions that cannot match. Physical replication replays the primary's changes on a standby; the standby can lag and also contains the replicated table and partitions. This diagram is conceptual—use `EXPLAIN` and replication views to inspect your running lab.

[Try the interactive partitioning explorer and practice quiz](../activities/lab02-learning-pack.md). These browser examples are separate simulations and do not connect to your PostgreSQL servers.

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

### Optional hints for the assignment

Try each task yourself first. Expand a hint if you need a direction; the hints do not contain the full answers.

#### A. Partitioning

<details><summary>A1 — Partition names and bounds</summary><p>Look for PostgreSQL's catalog information about partition relationships and bounds. Identify the parent table before listing its children.</p></details>

<details><summary>A2 — Yearly counts and revenue</summary><p>Think about one output row per year. Count transactions and sum amounts, then group and order by the same year definition.</p></details>

<details><summary>A3 — Compare one quarter</summary><p>Use equivalent date bounds and aggregation on both tables. Compare the results before interpreting the plans, then inspect which child relations PostgreSQL scanned or pruned.</p></details>

<details><summary>A4 — Monthly partitions for 2025</summary><p>Define non-overlapping monthly boundaries that cover all of 2025. Load only rows in that year, then compare counts and values with the regular table.</p></details>

<details><summary>A5 — One month versus a full year</summary><p>Predict which monthly partitions can overlap each date range. Compare plans and consider selectivity, table size and overhead before deciding whether an index helps.</p></details>

<details><summary>A6 — Route 2027 rows</summary><p>Use a 2027 range that begins where the 2026 range ends. Write on the primary, then check the child receiving each new row.</p></details>

#### B. Replication

<details><summary>B1 — Identify each server</summary><p>Run the same recovery-status check on both connections. A primary and a standby report different roles.</p></details>

<details><summary>B2 — Observe a replicated write</summary><p>Use a new identifier, commit the transaction on the primary, then read the same identifier on the standby. Record the observation and retry interval; one run does not establish a universal lag.</p></details>

<details><summary>B3 — Inspect replication positions</summary><p>Query the primary's replication status and compare sent and replayed WAL positions using PostgreSQL's position-difference function. Interpret a byte gap as a position difference, not elapsed time.</p></details>

<details><summary>B4 — Inspect receiver and replay time</summary><p>Run these checks on the standby. A replay timestamp can be old simply because the primary has been idle, so elapsed time since replay is not always a measure of current lag.</p></details>

<details><summary>B5 — Read-only standby</summary><p>Run the attempted write separately on the standby and record the error. Explain why a standby that replays changes is not a substitute for a recoverable backup.</p></details>

#### C. Window functions

<details><summary>C1 — Customer running total</summary><p>Keep one row per transaction. Group the window by customer and choose a stable order that includes both the date and the sale ID.</p></details>

<details><summary>C2 — Three largest transactions</summary><p>Rank rows separately for each customer, using amount and a stable tie-breaker. Then filter the numbered rows in an outer query.</p></details>

<details><summary>C3 — Monthly revenue and previous month</summary><p>Build a complete month series first and attach aggregated revenue to it. Apply the previous-row calculation after filling missing months so adjacent rows really are adjacent months.</p></details>

<details><summary>C4 — Days since the previous transaction</summary><p>For each customer, identify the previous sale date in a deterministic order, then compare it with the current date. Consider the first transaction and same-day sales.</p></details>

<details><summary>C5 — Monthly customer ranking</summary><p>Aggregate to one row per customer per month before ranking. Rank within each month by revenue without adding a tie-breaking expression to the rank; filter January afterward so ties remain tied.</p></details>

<details><summary>C6 — Three-month moving average</summary><p>Create a complete month calendar and one global revenue value per month before applying the specified three-row frame. Consider how many months contribute at the beginning of the series.</p></details>

<details><summary>C7 — Two kinds of partition</summary><p>Contrast physical storage and pruning of table partitions with logical groups inside an analytical window. Give an example in which the grouping column and the storage partition key differ.</p></details>

#### D. Integration

<details><summary>D1 — Pruning plus a window</summary><p>Use a date predicate that the partition key can support, and apply a window to the rows in the selected scope. Compare both result and plan on the two servers; caching and timing alone cannot prove a replication effect.</p></details>

<details><summary>D2 — Route writes and reads</summary><p>Sketch the primary and standby connections, then explain what a reader might observe during replay lag. A standby failure alone does not establish primary data loss; also consider shared failures and backups.</p></details>

### Before moving on

- Can you distinguish physical partitions from logical window partitions?
- Can you explain why filtering by a partition key changes the plan?
- Can you route ETL writes to Primary and BI reads to Replica?

**Submit:** Your SQL, execution-plan evidence, and the explanations required by the assignment.

**Next:** [Lab 03 — DWH & ETL](03-dwh-etl.md).

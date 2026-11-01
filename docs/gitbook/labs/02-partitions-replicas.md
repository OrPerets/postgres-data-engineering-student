# Lab 02 — Partitioning & Replication

Help a growing sales system answer analytical questions while separating reporting reads from incoming writes. You will explore **table partitioning**, **replication**, and SQL **window functions** using PostgreSQL.

## Learning path

<ol class="lab01-timeline" markdown="1">
<li markdown="block">

### [Get ready](#1-get-ready)

Start the two PostgreSQL servers and choose where to write your answers.

</li>
<li markdown="block">

### [Understand the system](#2-understand-partitioning-is-not-replication)

Distinguish physical table partitions, the standby, and window partitions.

</li>
<li markdown="block">

### [Explore plans](#3-explore-the-query-plan) and [the replica](#4-investigate-the-read-replica)

Compare query plans, then observe how a committed write reaches the standby.

</li>
<li markdown="block">

### [Complete the exercises](02-exercises.md)

Apply the ideas to the assignment, save your SQL, and explain your findings.

</li>
<li markdown="block">

### [Job interview questions](02-interview.md)

Explain partitioning, replication, and window functions in your own words.

</li>
</ol>

## The lab's data

The lab follows a sales system as its data grows. On a fresh setup, both tables start with the same **200,000 sample sales**, so you can compare how PostgreSQL reads them.

<div class="lab02-data-compare" aria-label="Compare the two sales tables">
  <section class="lab02-data-card">
    <p class="lab02-data-card__label">Regular table</p>
    <h3><code>sales_regular</code></h3>
    <p>Stores sales in one non-partitioned table.</p>
  </section>
  <section class="lab02-data-card">
    <p class="lab02-data-card__label">Partitioned table</p>
    <h3><code>sales_partitioned</code></h3>
    <p>Stores sales in yearly partitions by <code>sale_date</code>.</p>
    <div class="lab02-data-years" aria-label="Yearly partitions">
      <span>2024</span><span>2025</span><span>2026</span>
    </div>
  </section>
</div>

Each row represents **one sale** in either table. The columns are:

<dl class="lab02-data-columns">
  <div><dt><code>sale_id</code></dt><dd>Sale identifier</dd></div>
  <div><dt><code>sale_date</code></dt><dd>Date of the sale</dd></div>
  <div><dt><code>customer_id</code></dt><dd>Customer identifier</dd></div>
  <div><dt><code>amount</code></dt><dd>Sale amount</dd></div>
</dl>

Each yearly partition includes its starting date and excludes the next year's starting date. The tables start with the same records, but changing one does not automatically change the other. Both tables are on the **Primary** and its changes are replayed on the **Replica**. The browser simulations below are separate from these servers.

## 1. Get ready

In GitHub Codespaces, **from the repository root**:

```bash
make lab-partitions
```

The initializer starts a Primary and a Read Replica, creates the sales tables, and prepares the sample data. It preserves existing tables when already initialized; if it reports incomplete setup, save your work and follow its recovery guidance.

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

### Choose where to write your answers

After setup, choose one route. The guided draft and the worksheet are **separate copies** and do not sync. A query runs only the SQL you select in the workspace or enter in the terminal.

<details markdown="1">
<summary>Route A · Guided workspace</summary>

From the repository root, run `make lab-partitions-workspace`. Keep that terminal open, then open private port **8766** from the Codespace **Ports** tab. Write your draft and choose **Primary** or **Replica** for each statement; check the server shown with its result.

Choose **Save answers** regularly; edits are not autosaved. **Download SQL** saves the draft as `lab02_student_exercises.sql`. Label Primary and Replica statements with SQL comments. Guided drafts are stored in `.workspace-data/`, which Git ignores; committing the worksheet does not back them up. **Download results CSV** contains only the rows displayed.

Primary read mode rolls back. The explicit apply action commits a successful statement on Primary, including DDL and inserts. Each run uses one statement in its own transaction; use the terminal for an interactive transaction, including exercises B2 and B5. Replica rejects writes as a real standby.
</details>

<details markdown="1">
<summary>Route B · Codespace editor and PostgreSQL terminal</summary>

Edit `labs/02-partitioning-replication/sql/student_exercises.sql` and save it with **Ctrl+S** (Windows/Linux) or **⌘S** (Mac). From the repository root, enter the lab directory and open the appropriate server:

```bash
cd labs/02-partitioning-replication
docker compose exec primary psql -U lab -d engineering
docker compose exec replica psql -U lab -d engineering
```

Run the Primary and Replica commands separately. Copy only the relevant statements into each `psql` prompt, not the entire mixed worksheet. Use Primary for writes and DDL; use Replica for the requested reads and checks. Enter `\q` to exit a prompt. Download the saved worksheet or commit and push it to your own fork as a backup.
</details>

For **B5**, use the Replica `psql` prompt: first run `SELECT pg_is_in_recovery();` and proceed only if it returns `true` (`t`). Start a transaction, attempt the write separately, capture the expected error, and issue `ROLLBACK;`. Do not retry that write on Primary. If the role check is not true, stop and reconnect to Replica.

### Check and submit

From the repository root, `make test LAB=02-partitioning-replication` checks data and server roles; it does **not** grade SQL or test either answer copy. Keep your SQL answers A1–D1 with Primary/Replica labels, and a `report.md` or PDF with timings, plans, screenshots, and the D2 explanation, as described in the [assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/02-partitioning-replication/assignments/STUDENT_ASSIGNMENT.md).

Download or otherwise back up your SQL, report, and required evidence outside the Codespace. The assignment names `student_exercises.sql`; if that filename is required, rename a copy of the guided download without overwriting your original worksheet. Saving or downloading is not submission: follow your instructor's method and deadline. See [environment setup](../getting-started.md) and [troubleshooting](../troubleshooting.md).

## 2. Understand — Partitioning is not replication

- **Partitioning:** Organizes one logical table into physical subsets, often by date.
- **Replication:** Maintains a read-only standby by replaying Primary changes.
- **SQL window PARTITION BY:** Defines logical groups for calculation; it does **not** create physical table partitions.

### See how the pieces connect

<div class="lab02-system" aria-label="Primary database and replicated standby">
  <section class="lab02-system__server">
    <p class="lab02-system__label">1 · Primary</p>
    <strong>Accepts writes and queries</strong>
    <p>Stores both <code>sales_regular</code> and <code>sales_partitioned</code>.</p>
    <div class="lab02-system__partitions" aria-label="Yearly partitions of sales_partitioned">
      <span>2024</span><span>2025</span><span>2026</span>
    </div>
    <p class="lab02-system__caption">Yearly partitions of <code>sales_partitioned</code></p>
  </section>
  <p class="lab02-system__connector">↓ &nbsp; Changes replay asynchronously through WAL</p>
  <section class="lab02-system__server">
    <p class="lab02-system__label">2 · Replica</p>
    <strong>Serves read-only queries</strong>
    <p>Replays Primary changes and contains the replicated tables and partitions. It may be behind the Primary.</p>
  </section>
</div>

A write goes to the primary. PostgreSQL routes a row in `sales_partitioned` to a yearly partition using its `sale_date`: each partition includes its start date and excludes the next year's start date. A suitable date predicate can let PostgreSQL skip partitions that cannot match. Physical replication replays the primary's changes on a standby; the standby can lag and also contains the replicated table and partitions. This diagram is conceptual—use `EXPLAIN` and replication views to inspect your running lab.

[Try the interactive partitioning explorer, monthly-calendar window activity, and practice quiz](../activities/lab02-learning-pack.md). These browser examples are separate simulations and do not connect to your PostgreSQL servers.

### Predict before running

A query asks for transactions from July through September 2024. Which yearly partitions should PostgreSQL read? What if the filter uses only `customer_id`?

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

[Open the SQL exercises and optional hints →](02-exercises.md)

<a id="optional-hints-for-the-assignment"></a><a id="a-partitioning"></a><a id="b-replication"></a><a id="c-window-functions"></a><a id="d-integration"></a><a id="before-moving-on"></a>

<a id="job-interview-questions"></a>

[Practice job interview questions →](02-interview.md)

**Next:** [Lab 03 — DWH & ETL](03-dwh-etl.md).

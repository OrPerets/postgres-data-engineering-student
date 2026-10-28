# Relational SQL Practice — Pre-DWH lab

This lab reproduces the **schema, constraints, calculation rules and 15 exercises** from the instructor's 4-page *Query Optimization Practice* PDF. The original PDF did **not** include INSERT statements or a source database, so the seed data here is **new synthetic demonstration data**, not a reconstruction of a supplied dataset.

## Open in Codespaces (no installation on your laptop)

Open the course repository in **GitHub Codespaces**. Docker must be available (`docker --version`). From the **repository root**, start the lab:

```bash
make lab-sql
```

The initializer preserves existing tables and reports incomplete setup instead of recreating them. To connect, change to the lab folder:

```bash
cd labs/01-relational-sql
docker compose exec postgres psql -U student -d query_lab
```

In the interactive `psql` prompt, try `\dt`, `SELECT * FROM customers LIMIT 5;`, and `\q` to exit.

**Important:** This is a separate PostgreSQL container and database from the partitions/replication lab. Its host port is `55432`. From the Codespace terminal, connect at `localhost:55432` as `student` to database `query_lab`. Classroom password: `studentpass`. Do not use the password in production.

## Student work

1. Read the [student brief](STUDENT_BRIEF.md) and the original course PDF.
2. Open [sql/student_answers.sql](sql/student_answers.sql) and write 15 solutions.
3. Run chosen queries interactively: `docker compose exec postgres psql -U student -d query_lab`.
4. For longer scripts: `docker compose exec -T postgres psql -U student -d query_lab < sql/student_answers.sql`.
5. Submit SQL, a short explanation for Q6/Q7/Q15, and query plans for selected queries.

## Query optimization exploration

Run `EXPLAIN (ANALYZE, BUFFERS)` for joins and aggregations, then try creating an index on `orders(customer_id,status,order_date)` and compare the plan. For this small correctness-oriented dataset, sequential scans may be best; do not promise performance gains.

## Reset

Resetting deletes the lab's database volume, including student database work. Back up anything you need first. From the **repository root**, deliberately reset and then initialize again:

```bash
CONFIRM_RESET=YES make reset LAB=01-relational-sql
make lab-sql
```

The direct `sql/01_schema.sql` script also drops and recreates the exercise tables; do not use it for routine startup.

## Instructor note

The original exercise's Q7 asks students to predict the query behavior on 'supplied data'; here the nullable city and returned-order rows are intentionally present to demonstrate NOT IN/NULL pitfalls. Q15 includes two completed orders on 2026-02-05 to demonstrate the difference between ROWS and RANGE. The source PDF does not contain a full reference dataset, so expected result counts can differ from a separate instructor dataset.

## Window function performance demonstration

Try the [running-total benchmark](benchmarks/README.md): an unindexed correlated subquery vs a `SUM() OVER` running total with equal results, `EXPLAIN (ANALYZE, BUFFERS)` comparisons, and an optional index challenge.

```bash
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U student -d query_lab < benchmarks/01_seed_running_total.sql
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U student -d query_lab < benchmarks/03_compact_report.sql
```

This is a deliberately favorable example for window functions, not a universal speed guarantee. Execution times must be measured in your Codespace.

For a detailed plan and equality validation, run `benchmarks/02_compare.sql` separately. The default compact report is `benchmarks/03_compact_report.sql`.

# Lab 03 — Data Warehouse & ETL

This is a hands-on continuation of the course's relational SQL and performance labs. It uses the **original supplied SQL files**, adjusted only in filenames for clear execution order, in a separate PostgreSQL 16 database.

## Run in GitHub Codespaces

Open the course repository in Codespaces. From the repository root:

```bash
make lab-dwh
```

To inspect the diagnostic output or connect after initialization, from the repository root:

```bash
cd labs/03-dwh-etl
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U student -d dwh_etl_lab < sql/03_verify.sql
docker compose exec postgres psql -U student -d dwh_etl_lab
```

The SQL setup scripts are available for inspecting and deliberately rerunning the load; back up changes first. The initializer preserves an existing database and stops on partially initialized objects.

Container host port: `55433`; username `student`, database `dwh_etl_lab`, classroom-only password `studentpass`. This lab is independent of the other Docker Compose projects.

## Learning path

1. Inspect raw text data in `SRC_SCHEMA.snowflake_raw` and `SRC_SCHEMA.dataiku_raw`.
2. Explore typed views `STAGE_SCHEMA.snowflake_clean` and `STAGE_SCHEMA.dataiku_clean`.
3. Understand `STAGE_SCHEMA.usage` (`UNION ALL`, quality flags, original grain).
4. Explore five dimension tables and `DWH_SCHEMA.fact_usage`.
5. Write analytical SQL using window functions and `generate_series`.
6. Rerun `sql/02_dwh.sql` and study idempotency.
7. Complete [student assignment](STUDENT_ASSIGNMENT.md) using [blank SQL worksheet](sql/student_exercises.sql).

## Original materials

The original lecture covers warehouse-vs-lake, ETL vs ELT, CDC, grain, stars/snowflakes, and partition pruning. The source provided an additional analytical answer key (`practice4-formal-solution.sql`), a Hebrew solution document, and an ERD.

The original files are named `STAGE.sql` and `DWH.sql`. Preserve this order. `01_stage.sql` includes demo INSERT statements; those use `ON CONFLICT DO NOTHING`. `02_dwh.sql` skips existing fact rows rather than refreshing changed source records. Do not treat this as general CDC.

## Reset

From the repository root, a full reset **deletes all lab database data**:

```bash
CONFIRM_RESET=YES make reset LAB=03-dwh-etl
make lab-dwh
```

The demo is intended only for a controlled classroom environment and has fixed credentials. The scripts have not been validated in a live Codespaces Docker run in this session.

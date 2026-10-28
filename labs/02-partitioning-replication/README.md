# Lab 02 — PostgreSQL Partitioning, Replication & Window Functions

A complete browser-based PostgreSQL 16 lab running inside GitHub Codespaces. The folder contains a Primary, a physical Streaming Replica, SQL partitioning exercises, Python data load and student SQL tasks.

## Start in Codespaces

From the repository root:

```bash
make lab-partitions
```

The initializer preserves existing tables and reports incomplete setup instead of recreating them. For the optional benchmark and partition experiments, continue from the lab folder:

```bash
cd labs/02-partitioning-replication
docker compose ps
python scripts/benchmark.py
docker compose exec -T primary psql -v ON_ERROR_STOP=1 -U lab -d engineering < sql/02_partition_experiments.sql
```

## Verify replica

```bash
docker compose exec primary psql -U lab -d engineering -c "SELECT pg_is_in_recovery();"
docker compose exec replica psql -U lab -d engineering -c "SELECT pg_is_in_recovery();"
docker compose exec primary psql -U lab -d engineering -c "SELECT application_name,state FROM pg_stat_replication;"
docker compose exec primary psql -U lab -d engineering -c "INSERT INTO sales_regular VALUES (99999999,'2026-10-26',100,500);"
docker compose exec replica psql -U lab -d engineering -c "SELECT * FROM sales_regular WHERE sale_id=99999999;"
```

Replication is asynchronous; a committed row can take a moment to appear. Standby rejects writes. This is **not an automatic-failover cluster** and **not a backup**.

## Assignments

- [Student assignment](assignments/STUDENT_ASSIGNMENT.md)
- [Student SQL worksheet](sql/student_exercises.sql)

Optional after generating data: `docker compose exec -T primary psql -U lab -d engineering < sql/04_lab_extensions.sql`.

All passwords and network permissions are for classroom demonstration. The direct `sql/01_schema.sql` script drops and recreates the experiment tables; do not use it for routine startup. To reset deliberately, back up your work first, then run `CONFIRM_RESET=YES make reset LAB=02-partitioning-replication` from the repository root. This deletes the lab's database volumes. Run `make lab-partitions` to initialize again.

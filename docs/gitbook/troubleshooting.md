# Troubleshooting

## `docker: command not found`
You may be in a Codespaces recovery container, or Docker tooling is unavailable. Check Codespaces creation logs and the repository's `.devcontainer/devcontainer.json`. Rebuild or recreate the Codespace using the current configuration; don't install Docker on your laptop just to fix the cloud container.

## `service "postgres" is not running`
Run the initializer **from the repository root**:
```bash
make lab-sql
```
Or, inside `labs/01-relational-sql`, run `docker compose up -d --wait`. Check `docker compose ps -a` and `docker compose logs postgres` if it fails.

## `No rule to make target lab-sql`
You're likely not at repository root or your Codespace has an older checkout. Run `pwd`, `ls Makefile` and `git pull origin main` after saving local edits.

## Python tests fail with `NotImplementedError`
This is intentional in the **student** templates. Complete the indicated function. Run the separate `tests.test_demo` module to check the reference demonstration.

## My SQL results differ from examples
Check which database you're connected to, whether you ran the correct lab initializer, and whether an older exercise changed the data. Avoid resetting tables until you've backed up your work.

## `EXPLAIN ANALYZE` output is too long
For the SQL running-total benchmark, use `benchmarks/03_compact_report.sql`, which prints a compact table and checks output equivalence.

## Performance results differ between students
That's normal: Codespaces machines, workloads, caches, indexes and execution plans vary. Compare measurements on the **same machine and data**; don't treat an example speedup as a guarantee.

## Setup stops because no completion marker was found

An older database or an interrupted setup may have all expected tables but incomplete sample data. The initializer preserves it and prints an inspection command. Run that command from the lab directory, check the data, and back up your work. For an unchanged initial sample, expect 15 customers and 34 orders in Lab 01; 200,000 rows in each Lab 02 sales table; five rows per source and ten facts in Lab 03; and four documents in the TF-IDF SQL database. Student changes can legitimately change counts.

If you confirm the database is complete, run the printed `LAB_ADOPT_EXISTING=YES make ...` command from the repository root. It records your decision without reloading the data. If it is incomplete, repair it or back up work before a confirmed reset. The marker confirms initial setup only, not later modifications. See the [getting-started guide](getting-started.md) for more detail.

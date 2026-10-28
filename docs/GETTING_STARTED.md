# Getting started — 6 labs, one workflow

Open GitHub Codespaces for this repository. In the terminal run:

```bash
git pull origin main
make help
make health LAB=04-mapreduce
make lab-sql
make demo LAB=01-relational-sql
```

The same interface works for all labs: `make setup`, `make demo`, `make test`, `make health`, and (where supported) `make benchmark`. Always specify `LAB=...`. Run one PostgreSQL lab at a time to avoid resource pressure.

**Caution:** `make setup` now uses the same preserving initializer as the one-command lab starters. Direct SQL setup scripts may still recreate tables. `make reset` requires explicit `CONFIRM_RESET=YES` and deletes database volumes. Make backups of your edits.

**Student tests:** In Labs 04–06, `make test` includes deliberate `NotImplementedError` failures in student templates. This is expected before implementing functions and is not necessarily an environment problem.

**Health checks:** After starting a lab, `make health` checks Python and, for SQL labs, whether each PostgreSQL service accepts connections. It does not prove every query or feature is correct. If Codespaces starts in recovery mode, inspect creation logs; Docker may not be available.

| Lab | Folder | Type |
|---|---|---|
| 01 | `labs/01-relational-sql` | PostgreSQL |
| 02 | `labs/02-partitioning-replication` | PostgreSQL Primary + Replica |
| 03 | `labs/03-dwh-etl` | PostgreSQL |
| 04 | `labs/04-mapreduce` | Python |
| 05 | `labs/05-pagerank` | Python |
| 06 | `labs/06-tfidf` | Python; PostgreSQL required for the full assignment |

**Note:** These commands are a unified starter interface, not a full assignment autograder. Do not treat passing demo checks as confirmation that your own SQL answers are correct.

## Simplest way to start each lab

Run these from the **repository root** (not a lab subdirectory):

| Lab | One command |
|---|---|
| SQL | `make lab-sql` |
| Partitions and Replicas | `make lab-partitions` |
| DWH and ETL | `make lab-dwh` |
| MapReduce | `make lab-mapreduce` |
| PageRank | `make lab-pagerank` |
| TF-IDF | `make lab-tfidf` |

Initializers bring up Docker services where needed, wait for health, create missing data, and run basic checks. They preserve existing tables and stop when key objects are partially initialized; they do not repair or fully validate modified schemas. Python labs run their reference demo but do not complete student exercises. Full test suites may fail on deliberately blank student code. Lab 06 starts with Python only; run `make lab-tfidf-sql` separately for the SQL portion required by the full assignment.

To remove a lab's database state intentionally, use `CONFIRM_RESET=YES make reset LAB=01-relational-sql` and then `make lab-sql`. Reset is destructive. Run only one resource-heavy lab at a time.

## Existing databases and interrupted setup

The SQL initializers record a completion marker after a successful initial load. An older or interrupted database can have all tables but no marker; startup stops rather than guessing or replacing data. Follow the inspection command printed by the initializer, from the indicated lab directory, and back up your work. A fresh, unmodified Lab 01 sample has 15 customers and 34 orders; Lab 02 initially has 200,000 rows in each sales table; Lab 03 initially has five rows from each source and ten facts; the TF-IDF SQL sample has four documents. Your own changes may legitimately alter those values, so check the data itself as well as the counts.

Only after you have confirmed that the existing database is complete, run the `LAB_ADOPT_EXISTING=YES make ...` command printed by the initializer from the repository root. Adoption records your decision and does not reload tables. If the load is incomplete, repair it manually or back up your work before the separately confirmed reset. A completion marker records initial setup; it does not validate later edits.

# Course map — from lectures to workshops

Use this map to connect the 2027 lecture materials with the hands-on labs. The lecture files are distributed separately by the instructor; their filenames are listed here so you can find them in the course materials. This is a suggested learning order, not a replacement for the instructor's schedule or assessment instructions.

## Before you begin

- For Labs 01–03, review basic SQL: `SELECT`, filtering, joins, grouping and subqueries. You will use PostgreSQL in Codespaces.
- For Labs 04–06, you will write Python functions. Be comfortable with variables, loops, conditionals, lists, dictionaries, function arguments and return values. Review these topics before Lab 04 if they are new to you; the earlier SQL labs do not teach Python.
- The exercises use synthetic data. Follow [environment setup](getting-started.md) and the [lab workflow](how-to-learn.md) before starting.

## Suggested sequence

The time ranges below are **planning estimates**, including reading the lab, trying examples and starting the assignment. They vary with experience, troubleshooting and the depth of the submission; they are not official class-hour allocations.

| Step | Lecture or practice material | Workshop and approximate time | What connects them |
|---|---|---|---|
| 0 | `מבוא להנדסת נתונים.pdf` | Orientation, about 30–60 min | Review the data engineering context and the SQL concepts used in the first part of the course. |
| 1 | `אופטימיזציה של שאילתות SQL.pdf` and `תרגול - אופטימיזציית שאילתות.pdf`; the updated optimization presentation may also be provided by the instructor | [Lab 01 — Relational SQL & Query Optimization](labs/01-relational-sql.md), about 3–5 h | Practice joins, NULLs, windows and query plans before examining performance. |
| 2 | `חישוב מבוזר .pdf` provides general distributed-computing context | [Lab 02 — Partitioning & Replication](labs/02-partitions-replicas.md), about 3–5 h | Bridge from SQL to data infrastructure: partition pruning, a primary and read replica, and analytical window functions. This lab adds a PostgreSQL exercise rather than reproducing one specific lecture. |
| 3 | `Datawarehouse & ETL.pdf` and `new-DWH-practice` materials | [Lab 03 — Data Warehouse & ETL](labs/03-dwh-etl.md), about 3–5 h | Trace raw sources through staging, dimensional modeling and analytical queries. |
| 4 | `חישוב מבוזר .pdf` and `אלגוריתמים מבוזרים - MapReduce.pdf` | [Lab 04 — MapReduce](labs/04-mapreduce.md), about 2–4 h | Translate the distributed-computing ideas into map, shuffle and reduce steps in Python. |
| 5 | `אלגוריתמים מבוזרים - PageRank.pdf` | [Lab 05 — PageRank](labs/05-pagerank.md), about 2–4 h | Apply MapReduce-style reasoning to an iterative graph algorithm and check rank conservation. |
| 6 | `אלגוריתמים מבוזרים TF-IDF.pdf` | [Lab 06 — Regex & TF-IDF](labs/06-tfidf.md), about 3–5 h | Apply the earlier stages to text processing, compare Python with SQL and interpret term weights. |

## What to submit

Each workshop links to its own assignment and student files. Follow the instructor's directions about which assignments count and when they are due. The assignments ask for SQL or Python work and, in several labs, explanations, test output or query plans. The dedicated performance challenges are extensions; check with your instructor if they are assigned. Lab 06's full 100-point assignment includes its PostgreSQL comparison and SQL query; its Python-only path is available for exploration.

## Key terms / מושגים מרכזיים

| English | עברית | In the course |
|---|---|---|
| Query optimization | אופטימיזציה של שאילתות | Compare equivalent queries and execution plans. |
| Partitioning | חלוקה למחיצות | Store parts of a table separately and observe pruning. |
| Replication | שכפול | Copy primary database changes to a standby. |
| Data warehouse / staging | מחסן נתונים / אזור ביניים | Prepare source data for analytical facts and dimensions. |
| Distributed computing | חישוב מבוזר | Divide computation across workers and coordinate the results. |
| Map / Shuffle / Reduce | מיפוי / קיבוץ והפצה / צמצום | Trace how intermediate keys and values flow between stages. |

The MapReduce, PageRank and TF-IDF demonstrations simulate logical steps locally. Some optional benchmarks use multiple processes on one host; neither is a multi-machine cluster.

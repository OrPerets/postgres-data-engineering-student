# Data Engineering

**HANDS-ON LABORATORY COURSE**

*From relational databases to distributed data processing.*

Explore data engineering through hands-on experiments with PostgreSQL, SQL, Python, Docker and GitHub Codespaces. Build ETL pipelines and investigate MapReduce, PageRank and TF-IDF while learning to predict, implement and validate your results.

[**Start Learning**](getting-started.md) · [**Course Map**](course-map.md) · [**Explore Labs**](#explore-the-course) · [**Open GitHub Repository**](https://github.com/OrPerets/postgres-data-engineering-student) · [**Troubleshooting**](troubleshooting.md)

---

## Explore the course

**Part I — Relational Data Engineering**

1. [**Relational SQL & Query Optimization**](labs/01-relational-sql.md) — Write reliable SQL and interpret execution plans.
2. [**Partitioning & Replication**](labs/02-partitions-replicas.md) — Scale storage and separate analytical reads.
3. [**Data Warehouse & ETL**](labs/03-dwh-etl.md) — Transform raw data into trusted analytical facts.

**Part II — Distributed Data Processing**

4. [**MapReduce**](labs/04-mapreduce.md) — Break computations into Map, Shuffle and Reduce.
5. [**PageRank**](labs/05-pagerank.md) — Understand rank propagation across graph edges.
6. [**Regex & TF-IDF**](labs/06-tfidf.md) — Turn messy text into structured numerical features.

## One workflow, six labs

**UNDERSTAND → PREDICT → IMPLEMENT → VALIDATE → EXPLAIN**

Each lab opens with a concrete question, continues with a small worked example and ends with a coding exercise and validation.
Review the [course map](course-map.md) for lecture connections, SQL and Python prerequisites, and estimated workshop times.

### Launch your first lab

Open the GitHub course repository in Codespaces and, from its root, run:

```bash
make lab-sql
```

The starter brings up PostgreSQL and initializes the sample dataset if it has not already been prepared.

[Open the course repository](https://github.com/OrPerets/postgres-data-engineering-student)

---

## Need help?

Use [Troubleshooting](troubleshooting.md) for Docker, Codespaces and SQL issues, or review the [Glossary](glossary.md) for terminology.

**Course documentation** — Shenkar-inspired academic styling. The site is a teaching resource; institutional logo usage and formal publication status should be approved separately.

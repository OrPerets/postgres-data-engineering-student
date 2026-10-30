# Getting started with GitHub Codespaces

**Goal:** Open a ready-to-use cloud development environment without installing PostgreSQL or Docker locally.

For a step-by-step first SQL workshop, follow [Start here: your first SQL lab](start-lab01.md).

## Step 1 — Open the course code
Open the [student repository](https://github.com/OrPerets/postgres-data-engineering-student), then select **Code → Codespaces → Create codespace on main**. Codespaces availability and quotas depend on your GitHub account.

## Step 2 — Check your terminal
In the browser-based editor, open **Terminal**. Confirm you are at the repository root (the folder containing `Makefile`).

```bash
pwd
ls Makefile
make help
```

## Step 3 — Start a lab
Run one command from the root:

| Lab | Command |
|---|---|
| SQL | `make lab-sql` |
| Partitions / Replication | `make lab-partitions` |
| DWH & ETL | `make lab-dwh` |
| MapReduce | `make lab-mapreduce` |
| PageRank | `make lab-pagerank` |
| TF-IDF | `make lab-tfidf` |

The initializer starts services where needed and prepares sample data. It preserves existing tables and stops if key objects are partially initialized. Save your code and database work before repairing or resetting. Lab 06 can be explored in Python alone, but its full 100-point assignment includes SQL: run `make lab-tfidf-sql` separately for that part.

When a workshop is available, open its tutorial for the guided workspace command, private port, and editor alternative:

- [SQL tutorial](labs/01-relational-sql.md)
- [Partitions and replication tutorial](labs/02-partitions-replicas.md)
- [DWH and ETL tutorial](labs/03-dwh-etl.md)
- [MapReduce tutorial](labs/04-mapreduce.md)
- [PageRank tutorial](labs/05-pagerank.md)
- [TF-IDF tutorial](labs/06-tfidf.md)

## Step 4 — Choose how to work
In the workshop tutorial, choose one route:

- **Guided workspace:** Run the tutorial's workspace command from the repository root, keep its terminal open, and open the listed private port from the Codespace **Ports** tab. Edit and explicitly save the guided draft, then download your work and any needed notes or evidence outside the Codespace.
- **Codespace editor:** Open the student SQL or Python file named in the tutorial, edit and save it, then download it or push your work to your own fork to keep a copy outside the Codespace.

The guided draft and the editor file are separate and do not automatically sync. A Git commit does not back up the Git-ignored guided draft. Saving or downloading work does not submit it; follow your instructor's submission method and deadline.

## Step 5 — Check your work
For example, `make demo LAB=04-mapreduce` runs the demonstration and `make test LAB=04-mapreduce` runs the tests. For Python tasks, some tests intentionally fail until you complete the functions. In Labs 01–03, `make test` checks sample data and services; it does not grade your SQL answers.

**Never use `make reset` casually:** it deletes the database volume after explicit confirmation.

[Next: How to work through a lab](how-to-learn.md).

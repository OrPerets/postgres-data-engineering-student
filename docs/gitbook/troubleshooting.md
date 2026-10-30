# Troubleshooting

## The Codespace is taking a long time or cannot connect

The first startup can take several minutes. If the editor remains stuck, go to [Your Codespaces](https://github.com/codespaces) and select the existing course Codespace to reopen it. If needed, use its **… → Stop codespace** menu and then select its name to start it again. Stopping pauses compute usage; storage can still count toward your allowance.

If it still cannot connect, try another browser and check [GitHub's connection troubleshooting](https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-your-connection-to-github-codespaces). Once connected, you can open the Command Palette (**Ctrl+Shift+P** on Windows/Linux or **⌘⇧P** on Mac) and select **Codespaces: View Creation Log** to inspect setup errors. See [GitHub's log guide](https://docs.github.com/en/codespaces/troubleshooting/github-codespaces-logs) for other logs.

Do not delete the Codespace or rebuild its container until you have backed up any work you need. If the editor asks whether you trust the workspace, review the repository and choose **Trust** when you are comfortable enabling its features.

## The guided workspace will not open

The workspace server runs in a Codespace terminal; opening a forwarded port does not start it. If a workspace page is still open with unsaved edits, download them **before** reloading or closing the page as described below.

1. In the Codespace, check the terminal where you started the workspace. If it is still running, leave it open. If it stopped, open **Terminal → New Terminal**, check that you are at the repository root (the folder containing `Makefile`), and run the command for your lab:

    | Lab | Workspace command | Private port |
    |---|---|---|
    | [01 — SQL](labs/01-relational-sql.md) | `make lab-sql-workspace` | 8765 |
    | [02 — Partitions and replicas](labs/02-partitions-replicas.md) | `make lab-partitions-workspace` | 8766 |
    | [03 — DWH and ETL](labs/03-dwh-etl.md) | `make lab-dwh-workspace` | 8767 |
    | [04 — MapReduce](labs/04-mapreduce.md) | `make lab-mapreduce-workspace` | 8768 |
    | [05 — PageRank](labs/05-pagerank.md) | `make lab-pagerank-workspace` | 8769 |
    | [06 — TF-IDF](labs/06-tfidf.md) | `make lab-tfidf-workspace` | 8770 |

2. Wait for the workspace-ready message and keep that terminal running. In the Codespace **Ports** tab, find the listed port and choose **Open in Browser**. Keep its visibility private. If the port is missing, check the terminal for an error and rerun the command only after identifying why the server stopped. If the address is already in use, check whether the workspace is already running in another terminal; do not stop an unknown process.
3. If the page cannot reach the server, check the running terminal and the correct port. After preserving any edits, reopen or reload the page. If the server starts but SQL queries report the database is unavailable, use a **second** terminal and follow that lab's initializer and recovery guidance. Do not reset a database to fix a forwarded port.

The [Lab 06 tutorial](labs/06-tfidf.md) also explains how to start its separate PostgreSQL component for the SQL questions.

## A workspace save failed or another tab changed the draft

Leave the page open. If the workspace loaded and its download controls are available, download the current work before reloading: **Download SQL** in Labs 01–03; **Download Python**, **Download notes** and, if used, **Download example** in Labs 04–06; also **Download SQL** for Lab 06's SQL answer. Save any needed test output or evidence separately. If download controls are unavailable, copy the visible text to a separate file before leaving the page.

If the message says another tab changed the draft, preserve copies from both tabs when possible. The rejected save did not overwrite the other saved version. Compare the copies and decide which text to keep; do not repeatedly retry an older tab over a newer version. For a connection error, check the server terminal and private port, then retry only after preserving your work. When reopening, check the saved content before editing: reopening the same Codespace can load an intact saved draft, but unsaved edits from a closed page may be lost.

## Continue from a downloaded workspace backup

The workspaces do not import an exported file back into the guided draft automatically. Keep the downloaded files unchanged as your backup, and compare them with any draft that is already saved before copying anything:

- **SQL workspaces:** Open the downloaded `.sql` file and manually copy each answer into its matching question in the guided workspace. For Labs 02–03, also keep any report and evidence separately; labels and comments in the export help identify the questions. Save answers and download a fresh backup when finished.
- **Python workspaces:** Open the downloaded Python file and manually copy its code into the guided editor. Copy any needed task notes from the downloaded notes file into the corresponding task, and copy a saved example into the scratchpad if needed. For Lab 06, also copy the downloaded Q9 SQL answer into its SQL editor. Select **Save work** and download a fresh backup.

Alternatively, use your lab's Codespace editor route with a separate copy of the downloaded file. Workspace drafts and editor files do not sync; back up an existing file before replacing it. Downloaded output is evidence, not a restored workspace state. Follow the lab's submission instructions, and keep a copy outside the Codespace.

## `docker: command not found`
You may be in a Codespaces recovery container, or Docker tooling is unavailable. Check Codespaces creation logs and the repository's `.devcontainer/devcontainer.json`. Back up your work before rebuilding or recreating the Codespace using the current configuration; don't install Docker on your laptop just to fix the cloud container.

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

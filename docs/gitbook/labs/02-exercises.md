# Lab 02 — SQL exercises

[← Lab 02 overview](02-partitions-replicas.md) · [Interview questions →](02-interview.md)

## Complete the SQL exercises

The assignment covers monthly partition creation, replica diagnostics, running totals, ranking, `LAG`, moving averages and a combined pruning/window query. Read the [full assignment and submission requirements](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/02-partitioning-replication/assignments/STUDENT_ASSIGNMENT.md). Use the browser workspace to practice SQL here, and the real PostgreSQL workspace for the Primary/Replica parts of the assignment. Point values are the assignment weights; this page does not grade your answers.

For **Part C**, use `sales_partitioned`, show all requested columns, and use `SUM(amount)` for monetary aggregations. For **B5**, confirm `pg_is_in_recovery()` is true on the Replica, start a transaction, attempt the write separately, capture the expected error, and issue `ROLLBACK;`. Never retry that write on the Primary. B2 and B5 need the PostgreSQL terminal for their interactive transactions; the guided workspace runs one statement per transaction.

## Real Primary and Replica workspace

Start the lab in your Codespace from the repository root with `make lab-partitions`, then run `make lab-partitions-workspace`. Keep the terminal running and open private port **8766** from the **Ports** tab. The real workspace connects to your PostgreSQL servers and keeps its own draft, separate from the browser workspace below.

If you have the private forwarded-port URL, you can try opening it inside this page. The URL must be an HTTPS Codespaces port 8766 address. Codespaces authentication or browser security settings may prevent embedding; the **Open in a new tab** link is the fallback. Your URL is not saved by this page.

<div class="lab02-real-workspace" data-lab02-real-workspace>
  <label for="lab02-workspace-url">Private Codespaces workspace URL</label>
  <div class="lab02-real-workspace__actions"><input id="lab02-workspace-url" type="url" placeholder="https://your-codespace-8766.app.github.dev/" autocomplete="off"><button type="button" data-embed-workspace>Open workspace here</button></div>
  <p data-embed-status role="status" aria-live="polite"></p>
  <p><a data-embed-link hidden target="_blank" rel="noopener noreferrer">Open private workspace in a new tab</a></p>
  <iframe data-workspace-frame hidden title="Your private Lab 02 Codespace workspace" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads allow-top-navigation-by-user-activation"></iframe>
</div>

<noscript>To use the real workspace, start it in your Codespace and open the private forwarded port 8766 from the Ports tab. The embedded and browser workspaces need JavaScript.</noscript>

## Browser SQL workspace

Practice with a smaller sample in a writable PostgreSQL database running in this browser. It starts with 3,288 sales across 2024–2026 in each table, rather than the 200,000 sales in a fresh Codespace setup. It is separate from your Codespace, and its data resets when you reload, reset, or a query times out. SQL drafts are saved in this browser on this device; download them for a backup. Changing the browser sample does not change the Codespace data.

This is **one browser database**, not a Primary or Replica. Use a real Codespace for B1–B5 and for D1's two-server plan comparison. C7 and D2 are explanations. Browser query plans and timings are not evidence of real replication or production performance. This workspace does not grade or submit answers.

Downloaded SQL can contain statements for different server targets: run each on its intended server, not the whole file against one server. Use the PostgreSQL terminal for B2 and B5 transactions, as described above.

<div id="lab02-browser-workspace" data-lab02-browser-workspace>
  <p role="status" data-workspace-status>Loading questions…</p>
  <noscript>The browser editor needs JavaScript. You can use the Codespace worksheet and the hints below without it.</noscript>
</div>

<div data-lab02-static-hints markdown="1">

<p id="optional-hints-for-the-assignment"><strong>Optional hints for the assignment</strong></p>

Try each task yourself first. Expand a hint if you need a direction; the hints do not contain the full answers.

<p id="a-partitioning"><strong>A. Partitioning</strong></p>

<details><summary>A1 — Partition names and bounds</summary><p>Look for PostgreSQL's catalog information about partition relationships and bounds. Identify the parent table before listing its children.</p></details>

<details><summary>A2 — Yearly counts and revenue</summary><p>Think about one output row per year. Count transactions and sum amounts, then group and order by the same year definition.</p></details>

<details><summary>A3 — Compare one quarter</summary><p>Use equivalent date bounds and aggregation on both tables. Compare the results before interpreting the plans, then inspect which child relations PostgreSQL scanned or pruned.</p></details>

<details><summary>A4 — Monthly partitions for 2025</summary><p>Define non-overlapping monthly boundaries that cover all of 2025. Load only rows in that year, then compare counts and values with the regular table.</p></details>

<details><summary>A5 — One month versus a full year</summary><p>Predict which monthly partitions can overlap each date range. Compare plans and consider selectivity, table size and overhead before deciding whether an index helps.</p></details>

<details><summary>A6 — Route 2027 rows</summary><p>Use a 2027 range that begins where the 2026 range ends. Write on the primary, then check the child receiving each new row.</p></details>

<p id="b-replication"><strong>B. Replication</strong></p>

<details><summary>B1 — Identify each server</summary><p>Run the same recovery-status check on both connections. A primary and a standby report different roles.</p></details>

<details><summary>B2 — Observe a replicated write</summary><p>Use a new identifier, commit the transaction on the primary, then read the same identifier on the standby. Record the observation and retry interval; one run does not establish a universal lag.</p></details>

<details><summary>B3 — Inspect replication positions</summary><p>Query the primary's replication status and compare sent and replayed WAL positions using PostgreSQL's position-difference function. Interpret a byte gap as a position difference, not elapsed time.</p></details>

<details><summary>B4 — Inspect receiver and replay time</summary><p>Run these checks on the standby. A replay timestamp can be old simply because the primary has been idle, so elapsed time since replay is not always a measure of current lag.</p></details>

<details><summary>B5 — Read-only standby</summary><p>Run the attempted write separately on the standby and record the error. Explain why a standby that replays changes is not a substitute for a recoverable backup.</p></details>

<p id="c-window-functions"><strong>C. Window functions</strong></p>

<details><summary>C1 — Customer running total</summary><p>Keep one row per transaction. Group the window by customer and choose a stable order that includes both the date and the sale ID.</p></details>

<details><summary>C2 — Three largest transactions</summary><p>Rank rows separately for each customer, using amount and a stable tie-breaker. Then filter the numbered rows in an outer query.</p></details>

<details><summary>C3 — Monthly revenue and previous month</summary><p>Build a complete month series first and attach aggregated revenue to it. Apply the previous-row calculation after filling missing months so adjacent rows really are adjacent months.</p></details>

<details><summary>C4 — Days since the previous transaction</summary><p>For each customer, identify the previous sale date in a deterministic order, then compare it with the current date. Consider the first transaction and same-day sales.</p></details>

<details><summary>C5 — Monthly customer ranking</summary><p>Aggregate to one row per customer per month before ranking. Rank within each month by revenue without adding a tie-breaking expression to the rank; filter January afterward so ties remain tied.</p></details>

<details><summary>C6 — Three-month moving average</summary><p>Create a complete month calendar and one global revenue value per month before applying the specified three-row frame. Consider how many months contribute at the beginning of the series.</p></details>

<details><summary>C7 — Two kinds of partition</summary><p>Contrast physical storage and pruning of table partitions with logical groups inside an analytical window. Give an example in which the grouping column and the storage partition key differ.</p></details>

<p id="d-integration"><strong>D. Integration</strong></p>

<details><summary>D1 — Pruning plus a window</summary><p>Use a date predicate that the partition key can support, and apply a window to the rows in the selected scope. Compare both result and plan on the two servers; caching and timing alone cannot prove a replication effect.</p></details>

<details><summary>D2 — Route writes and reads</summary><p>Sketch the primary and standby connections, then explain what a reader might observe during replay lag. A standby failure alone does not establish primary data loss; also consider shared failures and backups.</p></details>

</div>

### Before moving on

- Can you distinguish physical partitions from logical window partitions?
- Can you explain why filtering by a partition key changes the plan?
- Can you route ETL writes to Primary and BI reads to Replica?

**Submit:** Your SQL, execution-plan evidence, and the explanations required by the assignment.

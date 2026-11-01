# Lab 02 — Job interview questions

[← Lab 02 overview](02-partitions-replicas.md) · [SQL exercises](02-exercises.md)

Try answering aloud before expanding each suggested answer. Connect your answer to what you observed in the lab.

<details><summary>1. What is partition pruning, and when can it help?</summary><p>PostgreSQL can skip table partitions that cannot contain rows matching a query's conditions. A suitable filter on the partition key, such as a date range on a table partitioned by sale date, can reduce work. Check the plan: performance still depends on data size, selectivity and other costs.</p></details>

<details><summary>2. Is a table partition the same as PARTITION BY in a window function?</summary><p>No. Table partitioning organizes a logical table into physical child partitions and can enable pruning. Window <code>PARTITION BY</code> groups rows for a calculation such as a running total; it does not create or change physical table partitions.</p></details>

<details><summary>3. What can a client observe when reading from an asynchronous replica?</summary><p>The replica may not yet have replayed a recently committed write, so a read can return older data. Route writes to the primary and choose a consistency strategy appropriate to the application, such as reading from the primary when immediate read-after-write consistency is required.</p></details>

<details><summary>4. Why is a replica not a substitute for a backup?</summary><p>Replication copies changes, including accidental deletes or corrupt data, to the standby; shared failures can also affect both servers. A recoverable backup and tested restore process protect against different failure scenarios. A standby alone also does not provide automatic failover.</p></details>

<details><summary>5. How can a window function calculate a running sales total per customer?</summary><p>Keep each sale as its own row. Group the calculation by customer, order their sales consistently, and choose a frame that accumulates amounts through the current row. Explain how a tie-breaker makes the order reproducible.</p></details>

<details><summary>6. When would you use LAG, and what should you consider when comparing months?</summary><p><code>LAG</code> reads a value from a previous row in the ordered partition, for example to compare monthly revenue with the previous month. It returns the previous available row, not necessarily the previous calendar month: build a complete month series first if missing months must be included.</p></details>

<details><summary>7. How would you compute a three-month moving average?</summary><p>First aggregate sales to one row per month and fill missing months if they count in the calculation. Then apply <code>AVG</code> with an ordered <code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code> frame. The first two rows have fewer than three months in their frames unless you provide earlier history.</p></details>

<details><summary>8. Does filtering dates before a window calculation change the answer?</summary><p>It can: a window sees the rows that remain after the query level's <code>WHERE</code>. Filtering to one month before calculating a running total starts the total within that month. To calculate over a longer history but display only one month, compute the window in a subquery or CTE and apply the display filter outside it.</p></details>

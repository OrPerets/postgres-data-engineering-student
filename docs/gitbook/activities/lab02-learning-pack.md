# Lab 02 — Partitioning and replication practice

Use these activities before or during [Lab 02](../labs/02-partitions-replicas.md). They are optional practice, separate from the graded SQL assignment.

## Explore partitions and replication

Choose a date range to see which yearly partitions could be scanned, then explore how a change moves from a primary to a standby. These examples run in your browser; they are simulations and do not connect to PostgreSQL or measure a real query plan or replication delay.

<div id="lab02-partition-explorer"></div>

<noscript>The explorer needs JavaScript enabled. You can still read the [Lab 02 guide](../labs/02-partitions-replicas.md) and complete the workshop in Codespaces.</noscript>

## Explore missing months and windows

Predict how a missing February changes the previous row and a three-row average. Compare the sparse rows with a complete monthly calendar. These examples are browser-only simulations.

<div id="lab02-months-explorer"></div>

<noscript>Paper exercise: use January = 100, March = 300, April = 200. Compare March's previous row and three-row average before and after adding a February row with revenue 0. Zero is appropriate here only because the example assumes complete data and no February sales; missing or unknown data is not automatically zero.</noscript>

## Check your understanding

Try five short questions about partitioning, replication and window functions. Each answer includes an explanation. This self-check is for practice; no results are recorded or submitted.

<div id="lab02-practice-quiz"></div>

<noscript>The practice quiz needs JavaScript enabled.</noscript>

## Continue the workshop

Return to [Lab 02](../labs/02-partitions-replicas.md) for the full assignment, optional hints and database experiments.

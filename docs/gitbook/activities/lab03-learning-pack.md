# Lab 03 — Data warehouse practice

Explore how source observations become typed records and warehouse facts before or during [Lab 03](../labs/03-dwh-etl.md). These activities are optional practice and do not replace the graded SQL assignment.

## Trace an observation

Choose a sample record to follow its source, staging and warehouse representations. The sample and transformation are illustrative: the browser does not connect to the PostgreSQL database.

<div id="lab03-observation-explorer"></div>

<noscript>The observation explorer needs JavaScript. You can still follow the [Lab 03 guide](../labs/03-dwh-etl.md) and use PostgreSQL in Codespaces.</noscript>

## Explore repeated fact loads

Predict how the existing fact responds when its source cost changes, then step through a fixed-batch load and a rerun. This is a browser simulation of one selected row; it does not modify your database.

<div id="lab03-load-explorer"></div>

<noscript>Paper exercise: load the selected key (dk-sample-v1, 1) with cost 0.008205, rerun, then hypothetically change the source cost to 0.010000 and rerun. What happens to the existing fact under ON CONFLICT DO NOTHING? A fixed fact count alone does not show whether its value matches the source.</noscript>

## Check your understanding

Answer five practice questions on staging, missing values, source meaning and warehouse loading. Each answer has an explanation. Results are not recorded or submitted.

<div id="lab03-practice-quiz"></div>

<noscript>The practice quiz needs JavaScript.</noscript>

## Continue the workshop

Return to [Lab 03](../labs/03-dwh-etl.md) for the full assignment, optional hints and database experiments.

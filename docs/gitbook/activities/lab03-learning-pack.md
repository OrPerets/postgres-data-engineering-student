# Lab 03 — Data warehouse practice

Explore how source observations become typed records and warehouse facts before or during [Lab 03](../labs/03-dwh-etl.md). These activities are optional practice and do not replace the graded SQL assignment.

## Explore the complete pipeline

Follow both feeds through the lab's ETL pipeline. Choose a layer to see what changes and what stays traceable. This browser illustration does not connect to PostgreSQL or execute SQL.

<div id="lab03-pipeline-explorer"></div>

<noscript>
The supplied sample starts with five Snowflake observations and five Dataiku observations. Two typed staging views clean the source fields; the usage view appends the two feeds with UNION ALL, preserving all ten observations. In the sample load, five dimensions (source, date, user, entity and model) provide context for ten fact rows. A fact represents one supplied source observation identified by batch and row number. A blank cost becomes NULL, not zero; Snowflake costs are reported and Dataiku costs are estimated. Staging views are not stored copies, and matching identifiers across sources do not establish the same identity.
</noscript>

## Trace an observation

Choose a sample record, predict how staging will store its cost, then step through its source, staging and warehouse representations. The illustration does not connect to PostgreSQL.

<div id="lab03-observation-explorer"></div>

<noscript>In Dataiku sample row 4, the source cost is blank. The staging view converts the blank to NULL (unknown), and the warehouse fact retains that NULL. For a populated numeric field, staging converts the text to a number. Follow the Lab 03 guide in the navigation to inspect the rows in PostgreSQL.</noscript>

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

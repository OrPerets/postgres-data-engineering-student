# Lab 03 — Data Warehouse & ETL

**Topic:** From two incompatible source feeds to typed staging views, dimensions and fact table.

## Business scenario
Two different systems report LLM usage: Snowflake and Dataiku. You must consolidate the data without inventing shared identities, outcome status or source-completeness guarantees. Unlike a raw event stream, the sample contains *five rows from each source only*.

## Part A: Source and staging (25%)
1. Compare the raw Snowflake and Dataiku schemas. Identify 4 source-to-target mappings (STTM).
2. Query both clean views; explain how raw date and numeric strings are converted.
3. Find records with missing costs and invalid numeric fields. Why is NULL not zero?
4. Query `stage_schema.usage` and justify the use of `UNION ALL`.
5. Identify at least two quality flags and explain their semantics.

## Part B: Dimensional modeling (30%)
6. Declare the **fact grain** in one precise sentence.
7. Draw a small star schema connecting `fact_usage` to five dimensions.
8. Compare the natural identifier `user_nk` to DWH-generated `user_key`.
9. Query the fact row for `batch_id='dk-sample-v1'` and `row_no=4`, joining descriptive dimensions. Explain why missing cost remains NULL.
10. Run the load twice and compare fact row counts. Explain why `ON CONFLICT DO NOTHING` makes this fixed batch insert idempotent but does not implement an update-aware CDC pipeline.

## Part C: Analytics SQL (30%)
11. Calculate known monthly cost per source and count unpriced observations alongside it.
12. Rank the top three users **within each source** by known reported cost, breaking ties consistently.
13. Calculate known cost per 1000 tokens only for records where a positive token count and a cost are both known. State the numerator and denominator.
14. Return observed daily rows and cost, including days with no observations, for each source within the reporting scope. Explain why missing observations cannot prove a true zero.
15. Write your own quality-audit query that counts records with missing cost, invalid numeric input and inconsistent token totals.

## Part D: Engineering reliability (15%)
16. Demonstrate what happens when the same sample is loaded twice; compare to unsafe plain `INSERT`.
17. Explain which ingestion methods (full snapshot, incremental timestamp, CDC) could capture corrections and deletes.
18. Suggest a robust production improvement while preserving unknown values and source-specific meanings.

Write answers in [sql/student_exercises.sql](sql/student_exercises.sql) and submit SQL plus a short PDF or Markdown reasoning report. Do not copy the instructor's analytical solution.

## Important caveats
- `STAGE` objects are **views** over raw tables, not physical data copies.
- This sample contains no verified completeness, no outcome statuses, and no proof that cross-system identifiers refer to the same person.
- Reported Snowflake costs and estimated Dataiku costs have different meanings.
- Model and source references in the sample are synthetic teaching examples, **not current commercial product claims**.

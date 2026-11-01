# Lab 03 — SQL exercises

[← Lab 03 overview](03-dwh-etl.md) · [Interview questions →](03-interview.md)

Use the [full assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/03-dwh-etl/STUDENT_ASSIGNMENT.md) for the complete requirements and point weights. It covers source mapping, staging, dimensional modeling, analytics, and engineering reliability. Keep your SQL answers and the explanations requested in a separate report.

## Browser SQL workspace

Practice with the supplied teaching sample in a writable, disposable PostgreSQL 18 browser database. It starts with five Snowflake and five Dataiku observations; PostgreSQL 16 in Codespaces uses a separate database. Browser data changes disappear after a reload, reset, or query timeout. SQL drafts and report notes are saved in this browser on this device; download a backup. Neither workspace grades or submits your answers.

The sample does not establish source completeness, outcome statuses, or shared identities across systems. Reported Snowflake costs and estimated Dataiku costs have different meanings; missing cost is not zero. STAGE objects are views. The **Rerun fixed-batch load** control executes the provided DWH setup on the browser database: it skips existing observations and does not propagate corrections. Compare counts and values yourself. Test unsafe inserts only in this disposable database or another isolated setup. Query plans and PostgreSQL versions may differ from the Codespace.

<div id="lab03-browser-workspace" data-lab03-browser-workspace>
  <p role="status" data-workspace-status>Loading questions…</p>
  <noscript>The browser editor requires JavaScript. Use the full assignment linked above and the hints below with your Codespace worksheet.</noscript>
</div>

## Real Codespace workspace

From your Codespace repository root, run `make lab-dwh`, then `make lab-dwh-workspace`. Keep the terminal running and open private port **8767** from the **Ports** tab. This workspace connects to PostgreSQL 16 and stores a separate draft. Save and download it regularly; its answers do not sync with the browser drafts. Use the PostgreSQL terminal for multi-statement transactions. Back up database changes before rerunning a load or resetting the database.

You can try opening your private forwarded-port URL inside this page. Codespaces authentication or browser security may prevent embedding; use the **Open in a new tab** link if so. The URL is not saved by this page.

<div class="lab03-real-workspace" data-lab03-real-workspace>
  <label for="lab03-workspace-url">Private Codespaces workspace URL</label>
  <div class="lab03-real-workspace__actions"><input id="lab03-workspace-url" type="url" placeholder="https://your-codespace-8767.app.github.dev/" autocomplete="off"><button type="button" data-embed-workspace>Open workspace here</button></div>
  <p data-embed-status role="status" aria-live="polite"></p>
  <p><a data-embed-link hidden target="_blank" rel="noopener noreferrer">Open private workspace in a new tab</a></p>
  <iframe data-workspace-frame hidden title="Your private Lab 03 Codespace workspace" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads allow-top-navigation-by-user-activation"></iframe>
</div>

<noscript>To use the real workspace, start it in your Codespace and open private forwarded port 8767 from the Ports tab. The embedded and browser workspaces require JavaScript.</noscript>

<div data-lab03-static-hints markdown="1">

<p id="optional-hints-for-the-assignment"><strong>Optional hints for the assignment</strong></p>

<details><summary>Question 1 — Map source fields</summary><p>Compare source names and formats with the target views. Keep each source’s cost meaning visible.</p></details>

<details><summary>Question 2 — Typed staging</summary><p>For each source, identify a raw text field and inspect its corresponding typed output in the clean view.</p></details>

<details><summary>Question 3 — Missing and invalid</summary><p>Compare empty input and malformed populated input with the cost value and invalid-number flag. A NULL cost does not tell you the amount was zero.</p></details>

<details><summary>Question 4 — Combine feeds</summary><p>Consider whether appending both sets of rows or matching them on a shared key preserves the supplied observations.</p></details>

<details><summary>Question 5 — Quality flags</summary><p>Choose flags and trace the inputs or conditions that cause each one. Distinguish unknown information from contradictory information.</p></details>

<details><summary>Question 6 — Fact grain</summary><p>State what one row corresponds to and which source identifiers distinguish it. Avoid implying source coverage or real-world event granularity is verified.</p></details>

<details><summary>Question 7 — Star schema</summary><p>Locate the fact table and follow its foreign keys to each of the five dimensions. Label the relationships.</p></details>

<details><summary>Question 8 — Natural and surrogate keys</summary><p>Identify who supplies the natural identifier and who generates the warehouse key. Check the uniqueness scope for the natural key.</p></details>

<details><summary>Question 9 — Trace missing cost</summary><p>Identify the requested batch and row first. Join the referenced descriptive dimensions and check the value with IS NULL.</p></details>

<details><summary>Question 10 — Repeated load</summary><p>Count fact rows before and after a repeat, then read the conflict action. Ask what would happen if an existing source value changed.</p></details>

<details><summary>Question 11 — Monthly cost</summary><p>Group by source and month. Report the known-cost sum alongside a separate count of observations whose cost is unknown.</p></details>

<details><summary>Question 12 — Top users</summary><p>Aggregate by user within each source before applying a ranking. Add a stable tie-breaker without combining identities from different sources.</p></details>

<details><summary>Question 13 — Cost per 1,000 tokens</summary><p>Define the eligible records before summing. Use cost and positive token values from the same eligible records and state both totals.</p></details>

<details><summary>Question 14 — Daily reporting</summary><p>Start with the reporting scope and a calendar, then attach observed rows. Missing observations alone do not establish complete coverage or true zero usage.</p></details>

<details><summary>Question 15 — Quality audit</summary><p>Use conditional counts for missing cost, invalid numbers and inconsistent totals. Examine how unknown token consistency differs from false.</p></details>

<details><summary>Question 16 — Duplicate insertion</summary><p>Compare counts for the fixed batch before and after the supported load. Test any unsafe INSERT only in an isolated disposable setup.</p></details>

<details><summary>Question 17 — Corrections and deletes</summary><p>For each ingestion approach, ask what evidence of changed or removed rows it receives and what state or comparison it needs.</p></details>

<details><summary>Question 18 — Production improvement</summary><p>Choose a concrete improvement such as reconciliation or monitored data-quality checks and explain how it preserves missing values and source meaning.</p></details>

</div>

**Remember:** `STAGE` objects are views. Missing values are not zero, and the sample does not establish source completeness or cross-system identity. Reported Snowflake costs and estimated Dataiku costs have different meanings. Preserve your work before rerunning the load; test an unsafe plain insert only in an isolated disposable setup.

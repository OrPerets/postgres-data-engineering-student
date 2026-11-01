# Lab 03 — Data Warehouse & ETL

Two systems report LLM usage in different formats. Follow their records from raw sources through staging to a dimensional warehouse, then explore how to report what is known without inventing missing information.

## Learning path

<ol class="lab01-timeline" markdown="1">
<li markdown="block">

### [Explore the data](#the-labs-data)

Meet the two feeds and learn what one warehouse fact represents.

</li>
<li markdown="block">

### [Get ready](#1-get-ready)

Choose the browser SQL workspace or start the lab database in a Codespace.

</li>
<li markdown="block">

### [Follow the pipeline](../activities/lab03-learning-pack.md#explore-the-complete-pipeline)

Trace an observation from raw source to typed staging and the fact table.

</li>
<li markdown="block">

### [Complete the exercises](03-exercises.md)

Practice mapping, dimensional modeling, analysis, and reliable loading.

</li>
<li markdown="block">

### [Job interview questions](03-interview.md) {#lab03-interview-step}

Explain grain, staging, keys, and repeatable loads in your own words.

</li>
</ol>

## The lab's data

The sample contains **five observations from each source**. Their fields and formats differ, so the pipeline keeps the source alongside each observation.

<div class="lab03-sources">
  <section class="lab03-source">
    <p class="lab03-source__label">Source 01 · 5 observations</p>
    <h3>Snowflake</h3>
    <p>Start and end times, user and warehouse identifiers, model, cost and token count.</p>
    <p class="lab03-source__cost">Cost basis: <strong>reported USD</strong></p>
  </section>
  <section class="lab03-source">
    <p class="lab03-source__label">Source 02 · 5 observations</p>
    <h3>Dataiku</h3>
    <p>Event time, project, user, model, prompt and completion tokens, and estimated cost.</p>
    <p class="lab03-source__cost">Cost basis: <strong>estimated USD</strong></p>
  </section>
</div>

Each source observation is identified by its batch and row number. Source identifiers are scoped to their source: matching text does not establish that two records refer to the same person. The model and source names are teaching examples, not claims about current products. Neither completeness of source coverage nor outcome status is supplied.

## 1. Get ready

The [SQL exercises page](03-exercises.md) includes a browser workspace with its own disposable copy of the sample data. To use the separate Codespace database, run this **from the repository root** in GitHub Codespaces:

```bash
make lab-dwh
```

The initializer creates the classroom data and pipeline objects. Existing tables are preserved; if setup is incomplete, save your work and follow the recovery guidance instead of rerunning the setup scripts blindly.

[Open lab files](https://github.com/OrPerets/postgres-data-engineering-student/tree/main/labs/03-dwh-etl) · [Full assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/03-dwh-etl/STUDENT_ASSIGNMENT.md)

### Checkpoint — Did the pipeline load?

From the repository root:

```bash
cd labs/03-dwh-etl
docker compose exec -T postgres psql -U student -d dwh_etl_lab < sql/03_verify.sql
```

With the supplied sample, expect five Snowflake and five Dataiku observations: ten rows in unified staging. These sample counts do not establish source completeness.

### Choose where to write your answers

The guided draft and worksheet are **separate copies** and do not sync. A query runs the SQL selected in the workspace or entered in the terminal, not the other copy.

<details markdown="1">
<summary>Route A · Guided workspace</summary>

From the repository root, run `make lab-dwh-workspace`. Keep the terminal open and open private port **8767** from the Codespace **Ports** tab. **Run query** executes one read-only statement. **Apply changes** commits a successful statement to the lab database; preserve your work first. Each click uses one transaction, so use the terminal for multi-statement transactions and the repeated-load exercise. Test any unsafe insert only in an isolated disposable setup.

Choose **Save answers** regularly; edits are not autosaved. **Download SQL** exports `lab03_student_exercises.sql`. Drafts in `.workspace-data/` are ignored by Git, so committing the worksheet does not back them up. **Download results CSV** includes only displayed rows; prepare and back up your report separately.
</details>

<details markdown="1">
<summary>Route B · Codespace editor and PostgreSQL terminal</summary>

Edit `labs/03-dwh-etl/sql/student_exercises.sql` and save with **Ctrl+S** (Windows/Linux) or **⌘S** (Mac). Keep explanations in a separate Markdown or PDF report. The provided `01_stage.sql` and `02_dwh.sql` are setup scripts, not your answer worksheet. From the repository root:

```bash
cd labs/03-dwh-etl
docker compose exec postgres psql -U student -d dwh_etl_lab
```

Copy your queries into the prompt and compare the output with the assignment. Exit with `\q`. Preserve your work before repeating a load and test unsafe inserts only in an isolated disposable setup. Download the saved worksheet or commit and push it to your own fork as a backup.
</details>

### Check and submit

From the repository root, `make test LAB=03-dwh-etl` checks that the source and fact tables are nonempty; it does **not** grade SQL or test either answer copy. Keep your completed SQL and a Markdown or PDF reasoning report, including the requested explanations and star schema. Back up your SQL, report, evidence, and any database changes you need before a reset or rebuild. If the instructor requires `student_exercises.sql`, rename a copy of the guided download without overwriting the original worksheet. Saving or downloading is not submission; follow the instructor's method and deadline. See [troubleshooting](../troubleshooting.md).

<a id="2-follow-one-record-through-three-layers"></a>
<a id="3-inspect-transformations"></a>
<a id="4-trace-a-fact-row"></a>
<a id="5-test-the-engineering-behavior"></a>
<a id="optional-hints-for-the-assignment"></a>

## Complete and reflect {#6-complete-and-reflect}

[Open the SQL exercises and optional hints →](03-exercises.md)

Explain the fact grain, why dimension keys are resolved before loading facts, and why missing observations cannot establish true zero usage. Keep SQL and the reasoning report requested by the [assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/03-dwh-etl/STUDENT_ASSIGNMENT.md).

<a id="visual-checkpoint-one-observation-across-the-layers"></a>
<a id="expected-counts-for-the-provided-teaching-sample"></a>
<a id="investigate-the-missing-value"></a>
<a id="job-interview-questions"></a>

[Practice job interview questions →](03-interview.md)

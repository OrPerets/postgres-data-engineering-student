# Lab 04 — MapReduce exercises

[← Lab 04 overview](04-mapreduce.md) · [Interactive practice](../activities/lab04-learning-pack.md) · [Interview questions →](04-interview.md)

Complete all 11 tasks below using the [full assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/04-mapreduce/STUDENT_ASSIGNMENT.md) for the point weights and submission requirements. Preserve the signatures in `student_tasks.py`. Record your trace, comparisons and explanations in a short report.

## Your Python workspace

Write a browser draft of your Python file and task notes below. This editor does not run Python or tests; download your work and use one of the Codespace routes below to execute it. Browser drafts are stored on this device and do not sync with Codespace drafts.

<div id="lab04-browser-workspace"></div>

<noscript>The browser draft editor needs JavaScript. Use the Codespace editor or guided workspace below to write and run your Python.</noscript>

## Choose where to work

First run `make lab-mapreduce` from the repository root. Python's standard library is sufficient; this lab does not need PostgreSQL or Docker.

<details markdown="1">
<summary>Guided Codespace workspace</summary>

From the repository root run `make lab-mapreduce-workspace`. Keep the terminal open and open private port **8768** from the Codespace **Ports** tab. The workspace has a Python editor, task notes, an example runner and tests. The example and tests run your code as your Codespace user in a temporary copy; this is not a security sandbox.

To continue a browser draft there, copy your Python from the site editor and paste it into the guided workspace's Python editor. Copy any notes you need into the corresponding task notes. The workspace does not import these automatically.

Choose **Save work** regularly: the workspace does not autosave. Download your Python file, notes and test output, and keep a backup outside the Codespace. The draft is in the Git-ignored `.workspace-data/` folder and is separate from the file in the Codespace editor.
</details>

<details markdown="1">
<summary>Codespace editor and terminal</summary>

Open `labs/04-mapreduce/student_tasks.py` in the editor. Save your changes, then run these commands from the repository root:

To use a browser draft, download your Python above and upload it to the Codespace, or copy and paste it into the editor. Back up any existing `student_tasks.py` before replacing it.

```bash
cd labs/04-mapreduce
python mapreduce_demo.py
python -m unittest tests.test_demo -v
python -m unittest discover -s tests -v
```

The demo tests check the supplied demonstration. The full test suite checks the file in the lab folder, not the guided workspace draft. Download the completed file and report or back them up to your own fork.
</details>

The browser draft, guided workspace draft and Codespace file are separate and do not sync. Student tests initially fail until you implement the functions; do not change the tests to hide errors. The tests are feedback, not a grade.

## A. Trace the pipeline

### 1. Map, shuffle and reduce

By hand, trace `ABR / CCR / ACB`: list the mapper output, group the values by key, and show each reducer result. Include the trace in your report.

<details><summary>1 — Hint</summary><p>Emit one pair for every character occurrence, including repeated letters. Group equal keys before reducing.</p></details>

### 2. Compare reducer counts

Run `mapreduce_demo.py` with 1, 2 and 3 reducers. Explain what changes and what must remain identical.

For example, from the lab folder start `python`, import `run_char_count` from `mapreduce_demo`, and call it with the same input records and `reducers=1`, `2`, then `3`. Keep the other arguments the same for a fair comparison.

<details><summary>2 — Hint</summary><p>Separate the destination of a key from its final count. All values for a given key must be routed consistently.</p></details>

### 3. Compare the combiner

Use repeated-letter input and compare shuffle-pair counts with the combiner on and off. Explain why a combiner can help without changing the result.

<details><summary>3 — Hint</summary><p>Count the mapper outputs and the pairs passed to shuffle separately. Consider what can be combined within each input split.</p></details>

## B. Write the map functions

### 4. Map words

Implement `word_mapper` and explain how repeated words affect multiplicity. Follow the function's rules for whitespace splitting and case normalization.

<details><summary>4 — Hint</summary><p>Consider whether two occurrences in the same line represent one contribution or two.</p></details>

### 5. Filter records

Implement `filter_mapper` to apply `status = 'completed' AND amount >= :threshold`. Compare filtering in Map to SQL `WHERE`.

<details><summary>5 — Hint</summary><p>Check records that satisfy both conditions and records that satisfy only one.</p></details>

## C. Safe distributed aggregation

### 6. Mergeable mean

Implement `mean_mapper`, `mean_combiner` and `mean_reducer` using `(sum, count)`. Demonstrate why averaging mapper means is wrong when split sizes differ. Handle empty input as described in the function docstrings.

<details><summary>6 — Hint</summary><p>Try one worker with one value and another with three values. Each partial result needs enough information to weight its contribution.</p></details>

### 7. Mergeable population variance

Implement `variance_mapper`, `variance_combiner` and `variance_reducer` using `(count, sum, sum of squares)` for population variance. Explain empty input and numerical stability.

<details><summary>7 — Hint</summary><p>Merge the requested state across splits before calculating the result. Think about subtracting similar floating-point numbers.</p></details>

[Explore the mean and variance illustrations →](../activities/lab04-learning-pack.md)

## D. Distribution and performance reasoning

### 8. Reproducible partitioning

Explain why Python's built-in `hash()` is unsuitable for reproducible partition tests and how the provided `stable_partition` works.

<details><summary>8 — Hint</summary><p>Read how the demo converts the key into bytes and chooses a reducer. Consider separate Python processes.</p></details>

### 9. Skewed key

Design an example where most records go to one reducer. Propose a mitigation and explain its cost.

<details><summary>9 — Hint</summary><p>What happens when many records share one key? Consider whether an extra aggregation step can spread some work.</p></details>

### 10. Unsafe combiners

Give two examples of unsafe combiners and explain the algebraic property a safe partial aggregate must satisfy.

<details><summary>10 — Hint</summary><p>Ask whether combining partial results repeatedly and in different groupings retains enough information to reproduce the intended result.</p></details>

### 11. Shuffle and mapper cost

Explain shuffle cost versus mapper CPU cost, then contrast this simulation with actual distributed Hadoop MapReduce.

<details><summary>11 — Hint</summary><p>Distinguish local computation and intermediate data movement. The demo counts pairs; it does not measure a network or elapsed cluster performance.</p></details>

## Check and submit

Run the tests in the workspace or terminal you chose. Keep the completed `student_tasks.py`, passing test output and your report with the trace, explanations and **200–300 word discussion**. Report actual results rather than invented timings or throughput. Download copies outside the Codespace; saving or downloading does not submit your work. Follow your instructor's submission instructions and deadline.

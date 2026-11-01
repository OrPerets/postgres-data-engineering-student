# Lab 05 — PageRank exercises

[← Lab 05 overview](05-pagerank.md) · [Interactive practice](../activities/lab05-learning-pack.md) · [Interview questions →](05-interview.md)

Complete all 14 tasks below. Use the [full assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/05-pagerank/STUDENT_ASSIGNMENT.md) for point weights and submission details. Preserve the function signatures in `student_tasks.py` and keep your calculations and reasoning in a report.

## Your Python workspace

<div id="lab05-browser-workspace"></div>

<noscript>The browser draft editor requires JavaScript. You can use the Codespace editor or guided workspace below.</noscript>

The browser editor saves a draft on this device and offers downloads; it does not run Python or tests. To execute the assignment use one of the Codespace routes below. The browser draft, guided workspace and Codespace file are separate copies and do not sync.

## Choose where to work

First complete the hand calculations and predictions in Questions 2 and 7. Then run `make lab-pagerank` from the repository root: this command runs the reference demonstration and reveals example results. No database or Hadoop cluster is required.

<details markdown="1">
<summary>Guided Codespace workspace</summary>

Run `make lab-pagerank-workspace` from the repository root. Keep the terminal open and open private port **8769** in the Codespace Ports tab. Paste Python and any notes from your browser draft into this workspace if continuing that work; it does not import them automatically.

Use **Run example** for your example, **Run demo tests** for the supplied demonstration, and **Run all tests** for the workspace draft. Execution uses your Codespace account in a temporary copy; it is not a security sandbox. Choose **Save work** regularly; this workspace does not autosave. Download Python, notes and test output as backups outside the Codespace. Its `.workspace-data/` draft is separate from the file in the editor.

</details>

<details markdown="1">
<summary>Codespace editor and terminal</summary>

Open `labs/05-pagerank/student_tasks.py`. To continue a browser draft, download it and upload it to the Codespace, or copy and paste it into the editor. Back up any existing `student_tasks.py` before replacing it. Save your file, then run:

```bash
cd labs/05-pagerank
python pagerank_demo.py
python -m unittest tests.test_demo -v
python -m unittest discover -s tests -v
```

The full test suite checks the file in this folder, not the guided workspace draft. Back up your file, report and evidence outside the Codespace.

</details>

Student tests intentionally fail until the functions are implemented. Tests are feedback, not a grade; do not modify assertions to hide errors.

## A. Directed graphs and two basic iterations

### Question 1

For V={A,B,C} and A→B,C; B→C; C→A, write each node's inlinks, outlinks, in-degree and out-degree (5).

<details><summary>1 — Hint</summary><p>For each node, list incoming and outgoing edges separately. Count the links in each list.</p></details>

### Question 2

Start each rank at 1/3; manually calculate PR1 and PR2 with **no damping** (10).

Use the three-page graph from Question 1. Keep the two rank vectors separate.

<details><summary>2 — Hint</summary><p>Keep a separate rank vector for each iteration. Split each current rank over its outlinks before adding contributions to destinations.</p></details>

### Question 3

Explain why ranking by in-degree alone differs from PageRank (5).

<details><summary>3 — Hint</summary><p>Compare equal in-degree pages whose incoming pages have different ranks or different numbers of outlinks.</p></details>

## B. One iteration in MapReduce style

### Question 4

Implement `out_degree` and `contributions` (10).

<details><summary>4 — Hint</summary><p>Count outgoing neighbors before emitting one destination contribution per edge. Handle a page without outlinks separately.</p></details>

### Question 5

Implement `group_contributions`, describing shuffle-by-destination (5).

<details><summary>5 — Hint</summary><p>Use destination page as the key, gathering all contributions for that destination.</p></details>

### Question 6

Implement `dangling_mass` (5).

<details><summary>6 — Hint</summary><p>Sum the current ranks of all pages whose outgoing-neighbor lists are empty.</p></details>

### Question 7

Implement `pagerank_step` with damping d=.85 and *damped* dangling redistribution (10).

Use `G = {A: [B, C], B: [C], C: [A], D: []}` with uniform initial ranks `0.25`. Predict the results **before** running tests.

<details><summary>7 — Hint</summary><p>For each page, combine teleportation with damped incoming contributions and damped dangling redistribution. Include pages with no incoming contributions.</p></details>

## C. Iteration and correctness

### Question 8

Implement `pagerank_until_convergence` with L1 difference and iteration cap (10).

<details><summary>8 — Hint</summary><p>After each update, compare the old and new vectors using the sum of absolute differences. Add a maximum iteration limit.</p></details>

### Question 9

Show the first five iterations and final ranking for the four-page graph. Verify rank sum≈1 (5).

Use the four-page graph and initial ranks from Question 7.

<details><summary>9 — Hint</summary><p>Record the rank vector after each update and sum all page ranks before rounding for display.</p></details>

### Question 10

Repeat with damping .50 and .95. Compare convergence speed and rank ordering; explain why the values change (10).

Use the four-page graph and initial ranks from Question 7.

<details><summary>10 — Hint</summary><p>Hold the graph and stopping tolerance fixed. Compare both the resulting order and iteration counts, rather than assuming either must always change.</p></details>

## D. Scale and engineering

### Question 11

Explain how the mapper must emit *both* rank contributions and adjacency structure to support another iteration (8).

<details><summary>11 — Hint</summary><p>Ask what the next iteration needs to know about each page in addition to its new rank.</p></details>

### Question 12

Explain a safe combiner (sum contributions, preserve structure) and why a dangling counter or extra pass is needed (7).

<details><summary>12 — Hint</summary><p>Consider which numeric values can be summed locally and how adjacency records pass through. How does the driver obtain a complete global dangling total before it is used?</p></details>

### Question 13

Given one very popular destination page, discuss key skew, shuffle traffic and a two-stage aggregation solution (5).

<details><summary>13 — Hint</summary><p>Think about one destination receiving many contributions, then split that work into partial sums before combining them.</p></details>

### Question 14

Describe at least two limitations of this single-process simulator versus actual multi-node MapReduce (5).

<details><summary>14 — Hint</summary><p>Identify at least two missing distributed costs or behaviors such as network shuffle, fault recovery, or distributed storage.</p></details>

## Optional performance experiment

The optional benchmark compares sequential and multi-process mapping on **one Codespace host**; it does not measure a multi-node cluster. From the lab folder:

```bash
python benchmark.py --nodes 1000 10000 --workers 2 4 --iterations 12 --trials 3
```

Record actual measured times, speedup and efficiency, and consider process startup, communication and centralized reduction. Read the [performance assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/05-pagerank/PERFORMANCE_ASSIGNMENT.md).

## Check and submit

Keep your completed `student_tasks.py` and report with hand calculations, screenshots or test output, convergence observations and discussion. Back up your work; saving or downloading does not submit it. Follow your instructor's submission method and deadline.

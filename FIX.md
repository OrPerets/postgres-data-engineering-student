# Student journey fixes

These tasks address issues observed in the course review. Effort estimates are approximate for one person. They do not include a full classroom usability study. No task is complete until its acceptance criteria have been checked.

## P0 — Make the working and submission paths unambiguous

### 1. Separate guided workspace and editor workflows

- [x] In every lab tutorial, present **Guided workspace** and **Codespace editor** as alternative paths, with their own edit, run, check, save and download steps.
- [x] Explain that workspace drafts and original files are separate and do not automatically sync. State which copy each test command uses.
- [x] Keep the existing distinction between practice checks and official grading; neither saving nor downloading submits work.

**Why:** Labs 04–06 introduce a separate workspace draft immediately before editor and terminal instructions. A student can edit one copy and test another. The same pattern should be checked across all six labs.

**Starting points:** `docs/gitbook/labs/04-mapreduce.md`, `05-pagerank.md`, `06-tfidf.md`; `labs/04-mapreduce/workspace/server.py`; use `docs/gitbook/labs/01-relational-sql.md` as an example of a clearer distinction.

**Acceptance:** A student can follow either path from startup through a check and identify exactly which copy was tested and saved, without needing to follow the other path. Verify instructions against each lab's actual commands and workspace behavior.

**Effort:** Small–medium, approximately 0.5–1 day.

**Status, 2026-10-30:** Documentation updated locally across all six tutorials. Commands, ports and controls were checked against repository sources. The site visibility test suite passed for all-on, all-off and selected lab configurations. A rendered review and fresh Codespaces journey remain pending; local checks do not establish published or live behavior.

### 2. Make backup and submission instructions route-specific

- [x] For each lab, list the artifacts required by its assignment and identify how to export each artifact from the guided workspace or back up the editor file.
- [x] Explain that `.workspace-data/` is Git-ignored: a commit or push does not automatically back up workspace-only drafts and notes. Download those artifacts separately.
- [x] Check the Lab 05 and 06 Python download filenames against their assignments and terminal imports. Align filenames or explain a safe rename when necessary; verify instructor submission expectations before claiming a required format.
- [x] Remind students to follow their instructor's submission method and deadline; do not invent them.

**Why:** Current guidance can mix fork-based backup of editor files with separately stored workspace drafts. Labs 05 and 06 request `student_tasks.py`, while their workspace downloads have lab-prefixed names.

**Starting points:** `.gitignore`; `docs/gitbook/labs/03-dwh-etl.md`, `05-pagerank.md`, `06-tfidf.md`; `labs/05-pagerank/STUDENT_ASSIGNMENT.md`, `labs/06-tfidf/STUDENT_ASSIGNMENT.md`; their workspace `app.js` files.

**Acceptance:** Each route has a lab-specific, accurate checklist for code or SQL, notes/report and requested evidence. A student can tell what is saved in the Codespace, what exists outside it, and what remains to be submitted. Check filenames and commands against the actual exports and tests.

**Effort:** Small–medium, approximately 0.5–1 day across the labs.

**Status, 2026-10-30:** Updated all six tutorials locally with route-specific exports, reports and evidence, and the Git-ignored draft warning. Labs 05–06 explain their prefixed Python exports and how to preserve the original when renaming or testing. Checked assignment wording, export handlers and ignored paths against the source; all eight site visibility tests and `git diff --check` passed. A rendered review, fresh Codespaces journey and instructor-specific submission requirements remain unverified. Nothing was deployed.

### 3. Add workspace recovery guidance

- [x] Add troubleshooting steps for a stopped workspace server, missing or inaccessible forwarded port, and save failure. Include the relevant lab command, private port, and need to keep the server terminal running.
- [x] Explain how to preserve and download current edits before reloading when possible, and how to restart safely without a destructive reset.
- [x] Explain how to use a downloaded backup when returning to work. Where no import exists, say that copying answers back into the guided draft is manual.

**Why:** The troubleshooting guide covers Codespaces, Docker and tests but lacks a workspace-specific recovery path. A downloaded SQL file is useful as a backup, but Lab 01 does not currently provide a per-question import.

**Starting points:** `docs/gitbook/troubleshooting.md`, `docs/gitbook/start-lab01.md`, and each `labs/*/workspace/` interface and server.

**Acceptance:** A student can locate a recovery route for each symptom, preserve available work and reopen the right private port. Do not promise automatic restoration. Verify the steps in a fresh Codespace when one is available.

**Effort:** Small, approximately 0.5 day for documentation; live verification is additional.

**Status, 2026-10-30:** Added local recovery guidance for all six workspace commands and ports, save conflicts and manual restoration. Commands and controls were checked against the source; the strict site builds and eight visibility tests passed, including hidden-lab configurations. Browser rendering and fresh Codespaces port, save-conflict and restoration tests remain pending.

### 4. Connect first-visit setup to the guided workspace

- [x] Update the homepage-to-setup path to make the first concrete next step and the choice of workspace versus editor visible.
- [x] Link each lab starter to its tutorial and show where to find its workspace command and port.
- [x] Keep the Lab 01 illustrated walkthrough easy to find and preserve account/quota and backup guidance.

**Why:** The current setup page lists initializer commands and says to open a student file, while the detailed guided-workspace route is elsewhere.

**Starting points:** `docs/gitbook/README.md`, `docs/gitbook/getting-started.md`, `docs/gitbook/start-lab01.md`.

**Acceptance:** Starting at the homepage, a student can find the Codespace setup, choose a working path and reach Lab 01's first exercise without guessing which command or port to use.

**Effort:** Small, a few hours alongside task 1.

**Status, 2026-10-30:** The homepage links the first SQL walkthrough; environment setup links each tutorial and explains the two routes, private ports, distinct drafts and backup. All eight visibility tests passed, including hidden-lab configurations. Rendered and fresh Codespaces verification remain pending.

### 9. Correct the Lab 02 worksheet execution instructions

- [x] Replace the assignment's whole-file Primary command with instructions to execute selected statements on their intended server, consistent with the tutorial.
- [x] Clarify that B5 is a separate, intentional write attempt on the read-only Replica and preserve the distinction between Primary and Replica queries.
- [x] Update the worksheet warning so valid syntax does not imply that running the entire mixed-server file on Primary is safe.

**Why:** The Lab 02 assignment currently suggests sending the whole completed worksheet to Primary and says not to run writes on Replica, while B5 explicitly asks students to try a write on the read-only Replica. Running that demonstration on Primary could change data rather than show the intended standby error. This is verified from source, not by a live PostgreSQL run.

**Starting points:** `labs/02-partitioning-replication/assignments/STUDENT_ASSIGNMENT.md`, `labs/02-partitioning-replication/sql/student_exercises.sql`, `docs/gitbook/labs/02-partitions-replicas.md`.

**Acceptance:** The assignment and worksheet direct students to run each statement on the correct server, explain the B5 exception and do not recommend sending the mixed file to Primary. Validate instructions against the tutorial and, when available, a fresh lab environment.

**Effort:** Small, a few hours.

**Status, 2026-10-30:** Updated the assignment and starter worksheet locally to run selected statements on the correct server. B5 now explicitly checks the Replica role, runs separately in a transaction and rolls back after the expected standby error. All seven Lab 02 workspace tests and `git diff --check` passed; a live PostgreSQL/Codespaces run remains pending.

## P1 — Repair the learning sequence

### 5. Place the next-lab link after the learning material

- [x] Review all six tutorials for material after deliverable or next-lab links.
- [x] Move or integrate worked examples and visual checkpoints into the relevant learning sequence. Mark optional extensions clearly.
- [x] Place the final next-lab link after the instructional content and completion guidance.

**Why:** Labs 01, 03, 04 and 05 place a next-lab link before additional material; Labs 04 and 05 have substantial worked support after it. The ordering is observed; whether students actually skip it has not been measured.

**Starting points:** `docs/gitbook/labs/01-relational-sql.md`, `03-dwh-etl.md`, `04-mapreduce.md`, `05-pagerank.md`.

**Acceptance:** Each tutorial has a coherent concept → practice → check → keep/submit → next sequence, and all existing learning content and valid links are retained.

**Effort:** Small–medium, approximately 0.5–1 day.

**Status, 2026-10-30:** Moved the Lab 01 and 03 visual checkpoints before their reflection sections, and the Lab 04 and 05 next links after their simulator sections. Labs 02 and 06 already had appropriate endings. Existing content was preserved; all eight visibility tests and `git diff --check` passed. Rendered browser verification remains pending.

### 6. Keep prerequisite graph context visible in PageRank tasks

- [x] Give workspace task 2 access to the three-page graph specified in task 1, and tasks 9–10 access to the four-page graph and relevant setup from task 7.
- [x] Preserve the original assignment wording and clarify the context inline or provide a direct, accessible link to the prerequisite task.
- [x] Check other task cards for similar dependencies before changing the extraction logic.

**Why:** The workspace displays one numbered task at a time. Its task extraction adds the four-page graph to task 7, but tasks 2, 9 and 10 depend on information presented in earlier tasks. Students can navigate back or open the assignment; a failure to do so has not been observed.

**Starting points:** `labs/05-pagerank/STUDENT_ASSIGNMENT.md`, `labs/05-pagerank/workspace/server.py`, `labs/05-pagerank/workspace/app.js`.

**Acceptance:** The affected cards provide enough graph and setup context to understand the question, retain fidelity to the assignment, and pass appropriate workspace checks. Verify the rendered interaction when possible.

**Effort:** Small–medium, approximately 0.5–1 day.

**Status, 2026-10-30:** The Lab 05 workspace now derives prerequisite context from the assignment for tasks 2, 9 and 10, including the Task 7 graph, damping and initial ranks; missing graph context produces a clear error. Reviewed the remaining cards. All 12 Lab 05 workspace tests and 9 Lab 06 workspace tests passed; `git diff --check` passed. Browser rendering and live Codespaces verification remain pending.

### 7. Match starter error messages to assignment tasks

- [ ] Check unfinished function errors in Labs 04–06 against their assignments and replace misleading numbers with the correct task and function name where applicable.
- [ ] Preserve intentionally unfinished student functions and the intended test behavior.

**Why:** In Lab 04, `word_mapper` belongs to assignment task 4 but its starter raises `NotImplementedError("Exercise 1")`. In Lab 05, `out_degree` belongs to task 4 but raises `NotImplementedError("Task 1")`. Untouched student tests reproduce the misleading messages; the failures themselves are expected.

**Starting points:** `labs/04-mapreduce/student_tasks.py`, `labs/04-mapreduce/STUDENT_ASSIGNMENT.md`, `labs/05-pagerank/student_tasks.py`, `labs/05-pagerank/STUDENT_ASSIGNMENT.md`; check Lab 06 too.

**Acceptance:** Each relevant message identifies the correct function and assignment task; unfinished starter tests still fail as expected, and reference demo checks pass. Do not complete the student exercises.

**Effort:** Small, a few hours.

### 8. Preserve NULL distinctions in exported SQL results

- [ ] Define and document an export representation that distinguishes SQL NULL, literal `NULL`, empty strings and any escape marker.
- [ ] Update the Lab 02, 03 and 06 workspace CSV exports and add checks for NULL, literal text, empty values, commas, quotes and newlines.

**Why:** The current CSV encoders convert both SQL NULL and the literal string `NULL` to the same quoted text. This can make exported evidence ambiguous, especially in Lab 03's missing-value exercises. This finding is based on source inspection and encoder reproduction, not a live database test.

**Starting points:** `labs/02-partitioning-replication/workspace/app.js`, `labs/03-dwh-etl/workspace/app.js`, `labs/06-tfidf/workspace/app.js`.

**Acceptance:** Exported values remain distinguishable under the documented interpretation, existing result metadata and truncation warnings are preserved, and regression checks pass for the affected workspaces. Verify a real database example when available.

**Effort:** Medium, approximately 0.5–1 day.

### 10. Make the Lab 02 replica demonstration repeatable

- [ ] Replace the fixed demonstration identifier with a fresh, traceable marker and explain how to check that specific new row on the Replica.
- [ ] Preserve existing data and document any optional cleanup without deleting student work; check that the README and SQL example agree.

**Why:** The README and replication SQL insert `sale_id=99999999`, and `sales_regular` has no uniqueness constraint. Repeating the demonstration can add duplicates; the Replica query may find an older row instead of proving the latest insert replicated. This conclusion follows from the SQL source and has not been tested against a live database.

**Starting points:** `labs/02-partitioning-replication/README.md`, `labs/02-partitioning-replication/sql/03_replication_checks.sql`, `labs/02-partitioning-replication/sql/01_schema.sql`.

**Acceptance:** Consecutive demonstrations use distinct markers, query the corresponding new rows and preserve other data. Test repeat runs and replication behavior in a fresh database when available.

**Effort:** Small–medium, approximately 0.5–1 day.

### 11. Make shortened SQL result cells visible

- [ ] Track and communicate when an individual result cell was shortened, separately from row-count truncation.
- [ ] Show the warning in affected workspace results and their CSV exports; document that shortened values are not full evidence.
- [ ] Test long text, text exactly at the limit, and values naturally ending in an ellipsis.

**Why:** Labs 01–03 and 06 shorten long text cells at 2,000 characters, while the existing SQL result `truncated` flag reports only whether rows were omitted. The CSV downloads in Labs 02, 03 and 06 can therefore contain shortened cell values while their row-truncation metadata says `No`. This was reproduced against the cell-conversion function; a live database was not tested.

**Starting points:** `labs/01-relational-sql/workspace/server.py`, `labs/02-partitioning-replication/workspace/server.py`, `labs/03-dwh-etl/workspace/server.py`, `labs/06-tfidf/workspace/server.py` and their workspace result displays and exporters.

**Acceptance:** Students can distinguish cell shortening from row truncation in the UI and relevant exports, including when text naturally ends in an ellipsis. Checks cover each affected workspace; validate a live SQL result when available.

**Effort:** Medium, approximately 1–2 days.

### 12. Avoid partial currency amounts in the Lab 06 demonstration

- [ ] Define the supported numeric formats and boundaries for the demonstration, and document how unsupported or malformed continuations are handled.
- [ ] Prevent silently returning a shorter amount from an unsupported numeric token; add tests for valid punctuation and malformed or comma-formatted amounts.

**Why:** The reference extractor returns `120` for `USD 120.500` and `1` for `USD 1,200.50`, rather than indicating that the longer amount was not fully captured. The supplied `USD 120.50` example works. This is a local function reproduction; no live Codespaces test was performed.

**Starting points:** `labs/06-tfidf/tfidf_demo.py`, `labs/06-tfidf/tests/test_demo.py`, `labs/06-tfidf/STUDENT_ASSIGNMENT.md`.

**Acceptance:** Supported cases are documented and tested, unsupported or malformed continuations cannot silently produce misleading partial amounts, and the intended student exercises remain unchanged.

**Effort:** Small–medium, approximately 0.5–1 day.

## Verification before closing the backlog

- [ ] Build the site and check internal links and anchors, including any lab-visibility configurations affected by the edits.
- [ ] In a fresh Codespace, follow at least Lab 01's complete journey and one Python lab's two paths: setup, exercise, check, error recovery, save, download and submission preparation. Confirm other lab-specific commands and exports.
- [ ] Check keyboard access, mobile layout and screen-reader announcements for affected pages and controls. Record the environments tested and any remaining gaps.
- [ ] Keep source review, static checks and live Codespaces results distinct in the completion report. Tests and practice checks must not be described as official grades.

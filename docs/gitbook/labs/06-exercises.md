# Lab 06 — Regex & TF-IDF exercises

[← Lab 06 overview](06-tfidf.md) · [Interactive practice](../activities/lab06-learning-pack.md) · [Interview questions →](06-interview.md)

Complete the 13 tasks below; the [full assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/06-tfidf/STUDENT_ASSIGNMENT.md) provides point weights and submission requirements. Preserve function signatures and explain your reasoning in a report.

## Your browser draft

Write Python, SQL and notes in the browser editor below. It does not execute Python or SQL. Download your work and use a Codespace to run it. Browser drafts are saved on this device and do not sync with Codespace drafts.

<div id="lab06-browser-workspace"></div>

<noscript>The browser draft editor needs JavaScript. Use the Codespace editor or guided workspace below to write and run your work.</noscript>

## Choose where to work

Python-only exploration needs no database. **The full 100-point assignment requires PostgreSQL for questions 8 and 9.** From the repository root run `make lab-tfidf`; for the SQL questions also run `make lab-tfidf-sql`.

<details markdown="1">
<summary>Guided Codespace workspace</summary>

From the repository root run `make lab-tfidf-workspace`. Keep that terminal open and open private port **8770** from the Codespace Ports tab. Use the Python editor, example runner, **Run demo tests** and **Run all tests** for the guided draft. To run Q8 and Q9, start `make lab-tfidf-sql` in another terminal; use **Run Q8 reference**, enter your Q9 answer, then use **Run selected SQL**.

To continue a browser draft, copy and paste your Python, SQL and any notes into the corresponding fields in the guided workspace. They are not imported automatically. Python runs as your Codespace user in a temporary copy, not a security sandbox.

Choose **Save work** regularly; the guided workspace does not autosave. Download Python, SQL, notes and test output, and back them up outside the Codespace. Its `.workspace-data/` draft is Git-ignored. The guided Python download is named `lab06_student_tasks.py`; if required for submission, rename a separate copy to `student_tasks.py`.
</details>

<details markdown="1">
<summary>Codespace editor and terminal</summary>

Open `labs/06-tfidf/student_tasks.py` and keep your Q9 SQL in a separate file or report. To continue a browser draft, download and upload the Python and SQL files or copy and paste them into the editor. Back up existing files before replacing them. From the repository root:

```bash
make lab-tfidf
make lab-tfidf-sql
cd labs/06-tfidf
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U student -d tfidf_lab < sql/02_reference_query.sql
python tfidf_demo.py
python -m unittest tests.test_demo -v
python -m unittest discover -s tests -v
```

The full test suite checks the file in the lab folder, not the guided workspace draft. Run your Q9 query separately and compare the Q8 reference with Python. Preserve your code, SQL, test output and report outside the Codespace.
</details>

The browser draft, guided workspace drafts and Codespace files are separate copies. Student tests initially fail until you implement the functions. Tests are feedback, not a grade; do not edit them merely to make them pass.

## A. Regex and text normalization

1. Extract valid ticket IDs using `TKT-` followed by 4–6 digits. Test invalid short and partial IDs.
2. Capture currency and amount from `refund USD 120.50 requested`.
3. Normalize `Printer JAM!!! Ticket=TKT-1042` into stable tokens. Explain punctuation, case and identifier tradeoffs.

<details><summary>1–3: Extract and normalize</summary><p>Test valid and invalid boundaries, capture the currency and numeric amount separately, and decide how case and punctuation affect tokens.</p></details>

## B. Four MapReduce jobs

4. Implement MR1 `count_terms`; emit and aggregate counts keyed by `(term, doc)`.
5. Implement MR2 `attach_doc_lengths`; count tokens per document for normalized TF.
6. Implement MR3 `document_frequencies`; count **distinct documents**, not term occurrences.
7. Implement MR4 `tfidf_scores`; calculate TF × IDF for every present term/document pair.

Use the lecture's D1–D4 corpus. Reproduce `tfidf(data,D1)=0.1116` with **natural log**, and explain why the lecture's earlier table gives a different number.

<details><summary>4–7: Four MapReduce stages</summary><p>Track the keys at each stage. TF uses the document length, while DF counts distinct documents. Keep the logarithm convention consistent.</p></details>

## C. SQL and distributed design

8. Run `sql/02_reference_query.sql` in PostgreSQL and compare numerical scores with Python.
9. Write a SQL query selecting the highest-TF-IDF term in each document, with deterministic ties.
10. Draw MR1 → MR2 → MR3 → MR4, showing which shuffles group by `(term, doc)`, document and term. Explain why multiple phases are needed.

<details><summary>8–10: Compare SQL and draw the pipeline</summary><p>Compare the same corpus and formula in both implementations. Choose a deterministic tie-break for the top term and identify which key each shuffle groups.</p></details>

## D. Operational reasoning

11. Explain how a new document changes global DF/IDF and why previously computed scores may need refresh.
12. Discuss how regex rules, repeated document IDs and empty documents affect the pipeline.
13. Explain what a single-host simulator measures versus an actual distributed cluster; propose a benchmark including input size, shuffle volume and correctness.

<details><summary>11–13: Operational reasoning</summary><p>Consider how new documents change N and DF, how empty or repeated IDs affect the input contract, and which costs a single-host simulation cannot measure.</p></details>

## Check and submit

Keep your completed `student_tasks.py`, SQL answer for Q9, test output and concise report, including the SQL/Python comparison and requested explanations. Back up your files outside the Codespace; downloading or saving does not submit them. Follow the instructor's submission instructions and deadline.

<details markdown="1">
<summary>Optional performance challenge</summary>

From the lab directory, compare local sequential and multiprocessing runs:

```bash
python benchmark.py --documents 100 1000 --workers 2 4 --trials 3
```

The benchmark merges global document frequencies and scores centrally and checks results against the sequential calculation. Process startup and communication can outweigh the benefit for small inputs. This is a one-machine experiment, not a Hadoop or network-shuffle benchmark. See the [performance assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/06-tfidf/PERFORMANCE_ASSIGNMENT.md) for details.
</details>

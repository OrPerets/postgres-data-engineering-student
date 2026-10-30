# Lab 06 — Regex & TF-IDF

> **Your mission:** Turn messy tickets and short documents into searchable numerical features using Regex and four MapReduce-style stages.

**You will practice:** Field extraction, tokenization, term frequency, document frequency, TF-IDF and performance analysis.

!!! info "Choose how to work"

    Choose **one** path below. The guided workspace uses separate Python and SQL drafts; the Codespace editor and terminal commands use files in the lab folder. Changes do not automatically sync between them.

    **Option A — Guided workspace**

    1. From the repository root, run `make lab-tfidf-workspace`. Keep that terminal open. In the Codespace **Ports** tab, open private port **8770** in a browser.
    2. Edit the Python draft and add task notes. Use **Run example**, **Run demo tests** and **Run all tests** to explore and check the code currently in the workspace editor; the full suite does not test the separate file in Explorer.
    3. For the full assignment's PostgreSQL questions 8–9, run `make lab-tfidf-sql` from the repository root in another terminal. In the workspace, use **Run Q8 reference**, write the Q9 SQL answer and use **Run selected SQL**. Python-only exploration does not complete the SQL questions.
    4. Select **Save work** to save the drafts in the Codespace; edits are not autosaved. Use **Download Python**, **Download SQL** for the Q9 answer, **Download notes** and the test **Download output** button to keep copies outside the Codespace. Add any remaining required report material separately. Workspace drafts live in the Git-ignored `.workspace-data/` folder, so committing and pushing a fork does not back up those drafts.

       **Download Python** produces `lab06_student_tasks.py`. The assignment names `student_tasks.py`: keep the downloaded file as a backup and, if needed for submission, rename a separate copy to `student_tasks.py` according to your instructor's instructions. Terminal tests import the lab folder's `student_tasks.py`, not the downloaded file; use **Run all tests** for the workspace draft. If you later move a downloaded copy into the lab folder for terminal testing, first back up the existing file so it is not accidentally overwritten.

    **Option B — Codespace editor**

    1. In Explorer, open `labs → 06-tfidf → student_tasks.py`, implement the Python exercises and save the file (**Ctrl+S** on Windows/Linux or **⌘S** on Mac). Save your SQL answer for question 9 in a file or report of your own.
    2. From the repository root, run `make lab-tfidf` for the Python demo. The full assignment also requires PostgreSQL for questions 8–9: run `make lab-tfidf-sql`, then enter the lab folder to run the SQL reference and Python checks:

       ```bash
       cd labs/06-tfidf
       docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U student -d tfidf_lab < sql/02_reference_query.sql
       python -m unittest tests.test_demo -v
       python -m unittest discover -s tests -v
       ```

       The full test suite checks the `student_tasks.py` file in that folder, not the guided draft. Run your Q9 query separately and compare the outputs as required by the assignment.
    3. Keep the test output with your report: for example, rerun `python -m unittest discover -s tests -v > test-output.txt 2>&1` from the lab folder to capture it in a file. This replaces any existing `test-output.txt`; choose another filename or back up the old file if you need it. Download your edited `student_tasks.py`, Q9 SQL answer, output and report from Explorer, or commit and push those files to your own fork, to keep copies outside the Codespace.

    **Both paths — submission checklist:** Keep your completed `student_tasks.py`, SQL answer for Q9, test output and concise report. Downloaded notes help prepare the report but may not contain every required item. Compare SQL and Python using the same corpus and formula. Student tests initially fail until you implement the functions; passing tests provide feedback, not an official grade of your SQL answer or report. Follow the [assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/06-tfidf/STUDENT_ASSIGNMENT.md) and your instructor's submission instructions and deadline. Saving or downloading does not submit your work.

## 1. Get ready

From the repository root:

```bash
make lab-tfidf
```

[Student code](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/06-tfidf/student_tasks.py) · [Full assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/06-tfidf/STUDENT_ASSIGNMENT.md)

## 2. Start with messy text

```text
Printer JAM!!! Ticket=TKT-1042
refund USD 120.50 requested
```

**Predict:** Which ticket IDs are valid if the pattern requires 4–6 digits? Should `TKT-12` match?

[Try the interactive TF-IDF explorer and practice quiz](../activities/lab06-learning-pack.md).

## 3. Explore the transformation pipeline

```text
Raw text → Regex extraction → Normalize → Tokenize
         → (term, document) counts → TF → DF/IDF → TF-IDF
```

```bash
cd labs/06-tfidf
python tfidf_demo.py
```

**Checkpoint:** What happens to case, punctuation and duplicate terms in a document?

## 4. Build the four computational stages

1. Count occurrences by `(term, document)`.
2. Calculate normalized term frequency from counts and document length.
3. Calculate document frequency as the number of **distinct documents** containing a term.
4. Multiply TF by IDF.

This lab uses natural logarithm:

```text
TF = term_count / document_length
IDF = ln((N+1)/(df+1))
TF-IDF = TF * IDF
```

**Hint:** Counting how many times a term appears across the entire corpus is *not* document frequency.

## 5. Implement, test and compare to SQL

Complete your Python draft or `student_tasks.py` file. In the guided workspace, use **Run demo tests** to check the reference example and **Run all tests** to check the draft. For the Codespace editor path, run these commands from `labs/06-tfidf` to check the file there:

```bash
python -m unittest tests.test_demo -v
python -m unittest discover -s tests -v
```

For the PostgreSQL comparison required by the full 100-point assignment, run `make lab-tfidf-sql` from the repository root, then follow the SQL commands in the Lab 06 README to run `sql/02_reference_query.sql`. The Python-only path is also available for exploration.

**Checkpoint:** For `data` in document D1, TF=2/4, DF=3, N=4. Under the lab's natural-log convention, TF-IDF is approximately 0.1116.

**Explore:** In the [TF-IDF practice](../activities/lab06-learning-pack.md), add an illustrative document with or without `data` and predict how the existing D1 score changes. The activity runs in your browser and does not modify your corpus.

### Optional assignment hints

Try the tasks first; these hints give directions without providing the assignment solutions.

<details><summary>1–3: Extract and normalize</summary><p>Test valid and invalid boundaries, capture the currency and numeric amount separately, and decide how case and punctuation affect tokens.</p></details>

<details><summary>4–7: Four MapReduce stages</summary><p>Track the keys at each stage. TF uses the document length, while DF counts distinct documents. Keep the logarithm convention consistent.</p></details>

<details><summary>8–10: Compare SQL and draw the pipeline</summary><p>Compare the same corpus and formula in both implementations. Choose a deterministic tie-break for the top term and identify which key each shuffle groups.</p></details>

<details><summary>11–13: Operational reasoning</summary><p>Consider how new documents change N and DF, how empty or repeated IDs affect the input contract, and which costs a single-host simulation cannot measure.</p></details>

## 6. Optional performance challenge

```bash
python benchmark.py --documents 100 1000 --workers 2 4 --trials 3
```

[Performance assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/06-tfidf/PERFORMANCE_ASSIGNMENT.md).

**Explain:** Why must DF be combined globally? Why can multiprocessing overhead outweigh the benefit for a small corpus?

The lecture also shows a base-2 logarithm convention, which produces different IDF numbers. Use one convention consistently.

## Job interview questions

Try answering aloud before revealing each suggested answer. Use an example from the lab to support your explanation.

<details><summary>1. What is the difference between term frequency and document frequency?</summary><p>Term frequency measures how often a term occurs within one document, here normalized by that document's token count. Document frequency counts how many distinct documents contain the term, regardless of how many times it appears in each one.</p></details>

<details><summary>2. Why does TF-IDF give less weight to terms that appear in many documents?</summary><p>A term appearing in many documents is often less useful for distinguishing one document from another. In this lab, <code>IDF = ln((N+1)/(df+1))</code>, so a term present in every document has IDF zero; other TF-IDF conventions may produce different values.</p></details>

<details><summary>3. How can tokenization affect a TF-IDF comparison?</summary><p>Case normalization, punctuation rules and token boundaries change document lengths and term counts. Compare implementations using the same corpus and preprocessing rules, as well as the same TF and IDF formulas.</p></details>

<details><summary>4. What happens to IDF when new documents are added to a corpus?</summary><p>The total number of documents and the document frequency of some terms can change. Consequently, existing IDF values and TF-IDF scores may need to be updated using the new global corpus statistics.</p></details>

**Finish:** Submit your code, tests, SQL comparison and interpretation as requested by your instructor.

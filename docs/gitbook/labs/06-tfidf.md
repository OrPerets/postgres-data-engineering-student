# Lab 06 — Regex & TF-IDF

> **Your mission:** Turn messy tickets and short documents into searchable numerical features using Regex and four MapReduce-style stages.

**You will practice:** Field extraction, tokenization, term frequency, document frequency, TF-IDF and performance analysis.

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

Complete `student_tasks.py`, then run:

```bash
python -m unittest tests.test_demo -v
python -m unittest discover -s tests -v
```

For the PostgreSQL comparison required by the full 100-point assignment, run `make lab-tfidf-sql` from the repository root, then follow the SQL commands in the Lab 06 README to run `sql/02_reference_query.sql`. The Python-only path is also available for exploration.

**Checkpoint:** For `data` in document D1, TF=2/4, DF=3, N=4. Under the lab's natural-log convention, TF-IDF is approximately 0.1116.

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

**Finish:** Submit your code, tests, SQL comparison and interpretation as requested by your instructor.

# Lab 06 — Regex, TF-IDF and Distributed Data Processing (100 points)

Based on the 28-slide lecture. Work in `student_tasks.py` and write a short report. The full 100-point assignment includes the PostgreSQL work in questions 8 and 9. You may explore the Python exercises without PostgreSQL, but that does not complete those graded questions.

## A. Regex and text normalization (20)
1. Extract valid ticket IDs using `TKT-` + 4–6 digits. Test invalid short/partial IDs. (8)
2. Capture currency and amount from `refund USD 120.50 requested`. (6)
3. Normalize `Printer JAM!!! Ticket=TKT-1042` into stable tokens. Explain punctuation, case and identifier tradeoffs. (6)

## B. Four MapReduce jobs (45)
4. MR1: write `count_terms`; emit and aggregate counts keyed by (term,doc). (10)
5. MR2: `attach_doc_lengths`; count tokens per document for normalized TF. (10)
6. MR3: `document_frequencies`; **count distinct documents**, not term occurrences. (10)
7. MR4: `tfidf_scores`; calculate TF × IDF for every present term/document pair. (15)

Use the lecture's D1–D4 corpus. Reproduce `tfidf(data,D1)=0.1116` when **natural log** is used; explain why the lecture's earlier table gives a different number.

## C. SQL and distributed design (20)
8. Run `sql/02_reference_query.sql` in PostgreSQL and compare numerical scores with Python. (8)
9. Write a SQL query selecting the highest-TF-IDF term in each document (deterministic ties). (6)
10. Draw MR1→MR2→MR3→MR4 showing which shuffles group by (term,doc), doc, and term. Explain why this needs multiple phases. (6)

## D. Operational reasoning (15)
11. Explain how a new document changes global DF/IDF and why previously computed scores may need refresh. (5)
12. Discuss how regex rules, repeated document IDs and empty documents affect the pipeline. (5)
13. Explain what is measured by a single-host simulator versus an actual distributed cluster; propose a benchmark including input size, shuffle volume and correctness. (5)

## Commands
From the **repository root**, initialize the Python lab and the PostgreSQL database for the full assignment:

```bash
make lab-tfidf
make lab-tfidf-sql
cd labs/06-tfidf
```

From the lab directory, run the SQL reference and Python checks:

```bash
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U student -d tfidf_lab < sql/02_reference_query.sql
python tfidf_demo.py
python -m unittest tests.test_demo -v
python -m unittest discover -s tests -v
```
Submit `student_tasks.py`, SQL answer for Q9, test output and a concise report. Do not edit the tests merely to make them pass.

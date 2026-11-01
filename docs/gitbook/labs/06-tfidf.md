# Lab 06 — Regex & TF-IDF

How can a search system turn messy text into terms that distinguish one document from another? In this lab, extract structured information, normalize text, and follow term weights through four MapReduce-style stages.

## Learning path

<ol class="lab01-timeline" markdown="1">
<li markdown="block">

### [Meet the text data](#the-labs-data)

See the ticket examples and four-document corpus used throughout the lab.

</li>
<li markdown="block">

<a id="2-start-with-messy-text"></a><a id="3-explore-the-transformation-pipeline"></a><a id="4-build-the-four-computational-stages"></a>
### [Explore the pipeline](../activities/lab06-learning-pack.md#follow-the-four-stages)

Follow a term from normalized text to a TF-IDF score, then explore regex boundaries and changing corpus statistics.

</li>
<li markdown="block">

<a id="5-implement-test-and-compare-to-sql"></a><a id="optional-assignment-hints"></a>
### [Complete the exercises](06-exercises.md)

Implement the Python functions, compare with PostgreSQL, and explain the pipeline and its operational limits.

</li>
<li markdown="block">

### [Practice and check your understanding](../activities/lab06-learning-pack.md)

Predict matches and scores before revealing results; use the self-check to revisit key ideas.

</li>
<li markdown="block">

<a id="job-interview-questions"></a>
### [Job interview questions](06-interview.md)

Explain term frequency, document frequency and consistent preprocessing.

</li>
</ol>

## The lab's data

A support system receives text such as `Printer JAM!!! Ticket=TKT-1042` and `refund USD 120.50 requested`. Regex extracts fields, while normalization turns text into tokens for analysis.

The supplied corpus contains four short documents:

- **D1:** `data science uses data.`
- **D2:** `data engineering builds pipelines.`
- **D3:** `science uses experiments.`
- **D4:** `engineering uses data pipelines.`

Each document has an ID and text. A term can occur several times in one document: term frequency uses occurrences within that document, while document frequency counts **distinct documents** containing the term.

The lab uses `TF = count / document length` and `IDF = ln((N + 1) / (df + 1))`; TF-IDF is their product. Its natural-log convention differs from the base-2 numbers in an earlier lecture table. Python and SQL must use the same corpus, preprocessing and convention when compared.

The Python demonstration is a **single-process logical simulation**; it does not run Hadoop or measure a network shuffle.

## Get ready {#1-get-ready}

The [visual practice](../activities/lab06-learning-pack.md) and draft editor run in the browser. To execute Python, use a Codespace with Python. The full 100-point assignment also requires PostgreSQL for questions 8 and 9; Python-only exploration does not complete those questions.

From the repository root:

```bash
make lab-tfidf
make lab-tfidf-sql
```

Use the [exercises page](06-exercises.md) for workspace, PostgreSQL and submission instructions. Browser drafts, guided workspace drafts and Codespace files are separate and do not sync.

<a id="6-optional-performance-challenge"></a>
[Optional performance assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/06-tfidf/PERFORMANCE_ASSIGNMENT.md) · [Lab files](https://github.com/OrPerets/postgres-data-engineering-student/tree/main/labs/06-tfidf) · [Full assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/06-tfidf/STUDENT_ASSIGNMENT.md)

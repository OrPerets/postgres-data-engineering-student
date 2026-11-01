# Lab 04 — MapReduce

How can a large counting task be broken into smaller pieces? In this lab you will follow records through Map, Shuffle and Reduce, then build Python functions that can combine partial results safely.

## Learning path

<ol class="lab01-timeline" markdown="1">
<li markdown="block">

### [Meet the data and the task](#the-labs-data)

See how a small collection of text records becomes a count for each character.

</li>
<li markdown="block">

<a id="2-predict-the-first-output"></a>
<a id="3-understand-the-three-stages"></a>
<a id="visual-walkthrough-follow-the-keys"></a>
<a id="trace-table"></a>
<a id="guided-exercise-map-shuffle-reduce-by-hand"></a>
<a id="step-1-map"></a><a id="step-2-shuffle"></a><a id="step-3-reduce"></a>
<a id="combiner-investigation"></a><a id="combiner-investigation-saving-work-safely"></a>
<a id="checkpoint-number-of-reducers"></a><a id="try-the-interactive-simulator-preview"></a>
<a id="mini-challenge-your-own-mapreduce-input"></a><a id="practice-with-an-interactive-trace"></a>
### [Explore the flow](../activities/lab04-learning-pack.md#trace-map-shuffle-reduce)

Step through mapping, grouping and reduction. Experiment with a combiner and predict what changes.

</li>
<li markdown="block">

<a id="4-build-your-own-functions"></a><a id="5-validate-your-work"></a>
<a id="optional-assignment-hints"></a><a id="if-your-result-is-wrong"></a>
### [Complete the exercises](04-exercises.md)

Trace the pipeline, implement mappers and mergeable aggregates, then reason about distribution and performance.

</li>
<li markdown="block">

<a id="mini-challenge-why-not-average-averages"></a><a id="explore-mergeable-population-variance"></a>
### [Practice and check your understanding](../activities/lab04-learning-pack.md)

Explore mean and population variance, then try the self-check.

</li>
<li markdown="block">

<a id="6-think-like-a-distributed-engineer"></a><a id="job-interview-questions"></a>
### [Job interview questions](04-interview.md)

Explain partitioning, combiners and skew using examples from the lab.

</li>
</ol>

## The lab's data

The starting dataset has three short text records: `ABR`, `CCR`, and `ACB`. The goal is to count **every occurrence of each character** across all three records. Repeated characters count each time they appear.

1. **Map:** turn each character into a key-value pair, such as `(A, 1)`.
2. **Shuffle:** route and group the pairs with the same key.
3. **Reduce:** sum the values for each key.

Each input record is a string, the key is a character and its value is a count. Later exercises use words, sales-like records, and numerical observations to explore filtering and aggregation.

This is a **single-process logical simulation**. Its shuffle-pair counts help compare intermediate records; they do not measure network bytes, runtime or real cluster performance. Changing the reducer count may change where keys are assigned, but correctly grouped keys produce the same final counts.

## Get ready {#1-get-ready}

The [interactive practice](../activities/lab04-learning-pack.md) and a Python draft editor are available in the browser. To execute Python and run the assignment tests, use a Codespace with Python; no PostgreSQL, Docker or Hadoop cluster is required. From the repository root:

```bash
make lab-mapreduce
```

Choose a draft editor and follow the execution instructions on the [exercises page](04-exercises.md). Browser and Codespace drafts are separate and do not sync.

[Open lab files](https://github.com/OrPerets/postgres-data-engineering-student/tree/main/labs/04-mapreduce) · [Full assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/04-mapreduce/STUDENT_ASSIGNMENT.md)

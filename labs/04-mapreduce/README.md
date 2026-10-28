# Lab 04 — MapReduce: Map, Shuffle, Reduce

Hands-on companion to **MapReduce Algorithm (24-slide lecture)**. Runs directly in GitHub Codespaces using Python's standard library. **No additional Docker Compose or Hadoop cluster is needed.**

## Run
From the repository root:
```bash
cd labs/04-mapreduce
python mapreduce_demo.py
python -m unittest tests.test_demo -v
python -m unittest discover -s tests -v
```
The student tests initially fail with `NotImplementedError` until exercises are completed. That is intentional.

## Lecture's letter-count example
Input: `ABR`, `CCR`, `ACB`. Map emits `(character, 1)`; shuffle groups identical keys; reduce sums values. Expected `A:2, B:2, C:3, R:2`. `mapreduce_demo.py` shows intermediate counts with/without an optional combiner and varying numbers of reducers.

## Assignments
Read [STUDENT_ASSIGNMENT.md](STUDENT_ASSIGNMENT.md) and complete [student_tasks.py](student_tasks.py). Tests are in `tests/`. Do not change the tests to make a failing implementation pass.

## What is simulated?
The runner models **logical splitting, map, local combination, stable key partitioning, shuffle grouping and reduce**. It does **not** actually distribute work across machines, communicate on a network, implement retries/fault tolerance, or measure production performance. Shuffle-pair counts are a proxy for potential data movement, not measured bytes or runtime.

## Teaching extensions
Discuss when a combiner is safe (sum/count; mean using sum and count), when it is wrong (naively averaging averages or taking median of medians), hash partition balance, hot keys, and logical equivalence to SQL `WHERE` / `GROUP BY`. An actual Hadoop Streaming cluster can be added as an optional later lab.

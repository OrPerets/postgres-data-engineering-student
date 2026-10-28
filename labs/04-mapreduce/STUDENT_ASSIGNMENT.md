# Lab 04 — MapReduce (100 points)

Based on the supplied **MapReduce Algorithm** lecture, including its worked examples and final exercises. Do all coding in `student_tasks.py`; preserve function signatures. Submit your file plus a short report.

## A. Trace the pipeline (20 pts)
1. By hand, trace `ABR / CCR / ACB`: mapper output, key grouping and reducer results (8).
2. Run `mapreduce_demo.py` with 1, 2, and 3 reducers. Explain what changes and what remains identical (6).
3. Compare shuffle-pair counts with combiner on/off on repeated-letter input. Why can a combiner help but not change the answer? (6).

## B. Write the map functions (20 pts)
4. Implement `word_mapper` and explain how repeated words affect multiplicity (10).
5. Implement `filter_mapper`, interpreting a SQL predicate `status = 'completed' AND amount >= :threshold`. Compare Map filtering to SQL WHERE (10).

## C. Safe distributed aggregation (30 pts)
6. Implement `mean_mapper`, `mean_combiner` and `mean_reducer` using (sum, count). Demonstrate why averaging mapper means is wrong when split sizes differ (15).
7. Implement `variance_mapper`, `variance_combiner`, and `variance_reducer` using (count, sum, sum of squares) for **population variance**. Explain empty input and numeric stability (15).

## D. Distribution and performance reasoning (30 pts)
8. Explain why built-in Python `hash()` is unsuitable for reproducible partition tests and how `stable_partition` works (5).
9. Design a skewed-key example where most records go to one reducer; propose a mitigation and describe the cost (10).
10. Give two examples of **unsafe** combiners. Explain the algebraic property that a safe partial aggregate must satisfy (7).
11. Explain shuffle cost vs mapper CPU cost, and contrast this simulation with actual distributed Hadoop MapReduce (8).

## Run tests
```bash
python -m unittest tests.test_demo -v
python -m unittest discover -s tests -v
```
Before your implementations, the 4 student tests are expected to fail. Include your passing test output and a 200–300 word discussion. Report actual results rather than invented timing/throughput claims.

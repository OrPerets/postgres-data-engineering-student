# How to work through a lab

Each tutorial is organized into a consistent learning journey.

## 1 — Understand
Read the goal, diagram or small example. Identify the input, expected output and underlying concept.

## 2 — Predict
Before executing code, answer: **what should happen, and why?** Small predictions make unexpected results much easier to understand.

## 3 — Implement
Work in the student SQL/Python file. Avoid editing setup scripts, test files or the instructor's reference code.

## 4 — Validate
Use the provided tests or SQL comparisons. When two queries should be equivalent, compare **all rows**, not only the first ten. When timing code, verify correctness first.

## 5 — Explain
Write a short interpretation: not simply "query B was faster", but **which repeated operations were avoided** and whether a different index, data size or cache could change the result.

## 6 — Extend
Try one optional challenge, such as changing a partition key, increasing the graph size or increasing the number of worker processes.

> **Important distinction:** The Python MapReduce, PageRank and TF-IDF implementations simulate logical operations or use multiple processes on one host. They do not constitute a multi-machine Hadoop/Spark cluster.

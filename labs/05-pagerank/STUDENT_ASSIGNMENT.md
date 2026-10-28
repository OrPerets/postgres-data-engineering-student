# Lab 05 — PageRank (100 points)

Continue from Lab 04 MapReduce. Based on the instructor's PageRank lecture, students implement iterative rank flow on a directed graph and explain the engineering trade-offs.

## Part A: Directed graphs & two basic iterations (20 pts)
1. For V={A,B,C} and A→B,C; B→C; C→A, write each node's inlinks, outlinks, in-degree and out-degree (5).
2. Start each rank at 1/3; manually calculate PR1 and PR2 with **no damping** (10).
3. Explain why ranking by in-degree alone differs from PageRank (5).

## Part B: Implement one iteration in MapReduce style (30 pts)
4. Implement `out_degree` and `contributions` (10).
5. Implement `group_contributions`, describing shuffle-by-destination (5).
6. Implement `dangling_mass` (5).
7. Implement `pagerank_step` with damping d=.85 and *damped* dangling redistribution (10).
Use G={A:[B,C],B:[C],C:[A],D:[]} with uniform initial ranks 0.25. Predict results **before** running the tests.

## Part C: Iteration & correctness (25 pts)
8. Implement `pagerank_until_convergence` with L1 difference and iteration cap (10).
9. Show the first five iterations and final ranking for the four-page graph. Verify rank sum≈1 (5).
10. Repeat with damping .50 and .95. Compare convergence speed and rank ordering; explain why the values change (10).

## Part D: Scale and engineering (25 pts)
11. Explain how the mapper must emit *both* rank contributions and adjacency structure to support another iteration (8).
12. Explain a safe combiner (sum contributions, preserve structure) and why a dangling counter or extra pass is needed (7).
13. Given one very popular destination page, discuss key skew, shuffle traffic and a two-stage aggregation solution (5).
14. Describe at least two limitations of this single-process simulator versus actual multi-node MapReduce (5).

## Submit
- Completed `student_tasks.py`.
- A short report with hand calculations, screenshots/test output, convergence observations, discussion.
- Do not modify test assertions to hide incorrect answers.

## Run
```bash
python -m unittest tests.test_demo -v
python -m unittest discover -s tests -v
```
Tests for `student_tasks.py` intentionally fail until the students implement the functions.

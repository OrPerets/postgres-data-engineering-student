# Lab 05 — PageRank after MapReduce

Hands-on Python standard-library lab grounded in the **PageRank Algorithm** lecture. No Docker or Hadoop installation is needed; run inside the existing GitHub Codespace.

## Quick start
```bash
cd labs/05-pagerank
python pagerank_demo.py
python -m unittest tests.test_demo -v
python -m unittest discover -s tests -v
```
The demo tests should pass; student tests intentionally raise `NotImplementedError` until the assignment is completed.

## Covered concepts
- Directed graph and inlinks/outlinks
- Simple update with initial rank 1/N
- Two manual iterations using A→B,C; B→C; C→A
- Damping, teleportation, dangling node D and total mass conservation
- Convergence via L1 rank change
- Map/shuffle/reduce contribution aggregation, structure preservation, combiner safety and hot-key skew

## Important formula
The correct mass-conserving update is:
```text
new_PR(p) = (1-d)/N + d*(sum_incoming_contributions(p) + dangling_mass/N)
```
The factor `d` applies to **both** linked contributions and redistributed dangling-node mass. The four-page slide's rounded first-iteration output (A=.3031, B=.1969, C=.4094, D=.0906) matches this formula. Some earlier rendering of the lecture's formula may visually place `dangling_mass/N` outside `d`; do not implement that interpretation, because it makes total rank exceed 1.

## Expectations
Three-page first iteration: A=1/3, B=1/6, C=1/2. Second: A=1/2, B=1/6, C=1/3.
Four-page first damped iteration: A=.303125, B=.196875, C=.409375, D=.090625, and sum=1.

This is a **deterministic single-process logical simulator**, not a distributed Hadoop implementation. Do not claim physical parallelism, network shuffle, recovery, or distributed benchmark results.

See [student assignment](STUDENT_ASSIGNMENT.md) and [student template](student_tasks.py).

## Performance extension: sequential vs multi-process PageRank

Run a controlled timing experiment after finishing the PageRank exercises:

```bash
python benchmark.py --nodes 1000 10000 --workers 2 4 --iterations 12 --trials 3
python -m unittest tests.test_benchmark -v
```

Output is written to `results.csv` (do not commit benchmark results without contextual hardware metadata). Interpret measured **runtime, speedup and parallel efficiency** using the [performance assignment](PERFORMANCE_ASSIGNMENT.md).

**Terminology:** This version performs real parallel map work in separate OS processes, but on **one host**. It is not a distributed cluster: no network shuffle, storage distribution, or fault-tolerant runtime. The work submitted to child processes is serialized on each iteration, and rank aggregation remains centralized; small graphs can be substantially slower with multiprocessing. The comparison uses an equal number of PageRank iterations, identical graph topology/damping, and verifies output agreement.

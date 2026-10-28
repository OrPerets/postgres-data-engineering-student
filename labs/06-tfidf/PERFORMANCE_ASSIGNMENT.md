# Bonus — TF-IDF Sequential vs Parallel Performance (20 points)

This experiment compares **single-process** TF-IDF to **multi-process** computation with Python workers on **one host**. It is NOT Hadoop/Spark nor a multi-node distributed benchmark. Workers tokenize documents and count terms independently; the parent process performs global document-frequency aggregation and TF-IDF scoring, revealing a central aggregation bottleneck.

## Run

```bash
python benchmark.py --documents 100 1000 5000 --workers 2 4 --trials 3
python -m unittest tests.test_benchmark -v
```

`results.csv` contains median runtime, speedup, parallel efficiency, corpus statistics and detected logical CPU count.

## Questions

1. Plot median runtime versus number of documents for serial, two workers and four workers.
2. Calculate speedup `T_serial / T_parallel` and efficiency `speedup / P`. Identify slowdown conditions.
3. Change `--words-per-doc` and `--vocab-size` separately. Explain how they affect nonzero score count, input and intermediate volume.
4. Why must **document frequency** be counted over distinct documents *globally*, rather than averaged across worker partitions?
5. Which stages can be mapped locally and which require combining or shuffling global statistics?
6. Explain process startup, serialization/pickling, data copying, and centralized score computation.
7. Explain why more workers may not help on a small Codespace.
8. Propose a real distributed design with MapReduce jobs for (term,doc) counts, doc lengths, global DF, and final TF-IDF join, identifying shuffle keys.
9. Compare this with the PageRank benchmark: which algorithm is iterative with repeated barriers and which can be expressed as a series of aggregation jobs?

## Experimental protocol

Use identical seeded corpora and the same natural-log IDF formula for each method. The benchmark excludes corpus generation, includes worker startup and IPC, runs multiple repetitions, validates exact DF and numerical equivalence (max error <= 1e-12), and reports median time. Record Codespaces CPU and RAM resources. The benchmark only measures **one host**, not network transfer or cluster-level fault tolerance.

**Submission:** results.csv, a runtime plot and a 250–400 word explanation. Large corpora consume RAM and may exceed Codespaces quotas; start small.

# Performance experiment — Serial vs Multi-process PageRank (20 bonus points)

Compare **sequential PageRank** against a **multi-process simulation on the SAME Codespace machine**. The latter executes mapping chunks in separate operating-system processes, but aggregates/reduces centrally; it is not a cluster, and is not a benchmark of Hadoop, Spark or distributed network traffic.

## Procedure

1. Run `python benchmark.py --nodes 1000 10000 30000 --workers 2 4 --iterations 12 --trials 3`.
2. Record the output CSV and your Codespaces machine size (vCPUs and RAM).
3. Plot median runtime vs graph size for each method using a spreadsheet or Python.
4. Compute **speedup = T_serial / T_parallel** and **efficiency = speedup / workers**; identify cases where speedup is below 1.
5. Why does the parallel implementation sometimes lose? Discuss process setup, pickling/IPC, per-iteration barriers, local reduction, graph size and CPU limits.
6. How does changing the number of edges per node affect map output volume and potential shuffle cost?
7. Predict when a **real cluster** might gain an advantage even if this local experiment does not.
8. Explain what it would take to implement *actual* distributed PageRank (graph partitioning, data locality, network shuffle, shared rank frontier, fault tolerance, checkpoints).

## Fair comparison rules

- Both versions must use identical generated graph, damping factor, fixed iteration count and initial ranks.
- Check L1 difference of results and mass conservation, not only time.
- Run >=3 trials; use median. Avoid unrelated workloads during measurement.
- Graph generation is **excluded** from timing; executor startup, IPC and process serialization are included.
- Use a fixed number of iterations, **not separate convergence thresholds** that cause the algorithms to stop at different times.
- Do not claim multi-process automatically means faster or that this measures a distributed data center.
- Optional: compare small graph (100 nodes) to large graph (100,000 nodes) to show overhead/benefits. Larger graph sizes may exceed Codespaces quotas.

**Submission:** benchmark.csv, runtime plot, and 250–400 word engineering interpretation. If you report a speedup, state the hardware and experimental setup.

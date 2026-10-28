"""PageRank performance experiment: sequential vs actual multi-PROCESS execution.

Run from labs/05-pagerank:
    python benchmark.py --nodes 1000 10000 --workers 2 4 --iterations 12 --trials 3

No Hadoop cluster or network shuffle: multiprocessing processes share one host.
Each trial includes IPC/pickling and ProcessPoolExecutor startup, but excludes
synthetic graph generation. Each variant runs a fixed number of iterations.
"""
from __future__ import annotations

import argparse
import csv
from concurrent.futures import ProcessPoolExecutor
import math
import os
import random
import statistics
import time

def make_graph(n: int, out_degree: int = 8, seed: int = 42, dangling_fraction: float = .05):
    if n <= 0 or out_degree < 0 or not 0 <= dangling_fraction < 1:
        raise ValueError("invalid graph parameters")
    rng = random.Random(seed)
    graph = []
    for i in range(n):
        if rng.random() < dangling_fraction:
            graph.append(())
        else:
            k = min(n, out_degree)
            graph.append(tuple(rng.sample(range(n), k)))
    return graph

def _map_chunk(task):
    """Worker computes sparse destination contributions and local dangling mass."""
    graph_chunk, ranks_chunk = task
    bucket = {}
    dangling = 0.0
    for links, rank in zip(graph_chunk, ranks_chunk):
        if not links:
            dangling += rank
        else:
            share = rank / len(links)
            for dest in links:
                bucket[dest] = bucket.get(dest, 0.0) + share
    return bucket, dangling

def _reduce_parts(parts, n, damping):
    incoming = [0.0] * n
    dangling = 0.0
    for bucket, mass in parts:
        dangling += mass
        for dest, contribution in bucket.items():
            incoming[dest] += contribution
    base = (1.0 - damping) / n + damping * dangling / n
    return [base + damping * c for c in incoming]

def _chunks(graph, ranks, workers):
    n = len(graph)
    chunk = max(1, math.ceil(n / workers))
    return [(graph[i:i+chunk], ranks[i:i+chunk]) for i in range(0, n, chunk)]

def pagerank_serial(graph, iterations=12, damping=.85):
    n = len(graph)
    if n == 0:
        raise ValueError("graph is empty")
    ranks = [1.0 / n] * n
    for _ in range(iterations):
        ranks = _reduce_parts([_map_chunk((graph, ranks))], n, damping)
    return ranks

def pagerank_parallel(graph, workers=2, iterations=12, damping=.85):
    if workers < 1 or not graph:
        raise ValueError("workers must be positive and graph nonempty")
    n = len(graph)
    ranks = [1.0/n] * n
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for _ in range(iterations):
            parts = list(pool.map(_map_chunk, _chunks(graph, ranks, workers)))
            ranks = _reduce_parts(parts, n, damping)
    return ranks

def run_benchmarks(sizes, workers, iterations=12, trials=3, degree=8, seed=42):
    if iterations <= 0 or trials <= 0:
        raise ValueError("iterations/trials must be positive")
    rows = []
    for n in sizes:
        graph = make_graph(n, degree, seed)
        baseline = pagerank_serial(graph, iterations)
        if not math.isclose(sum(baseline), 1.0, abs_tol=1e-8):
            raise AssertionError("PageRank mass not conserved")
        configs = [("serial", 1)] + [("multiprocessing", k) for k in workers]
        timings = {}
        for method, k in configs:
            func = (lambda: pagerank_serial(graph, iterations)) if method == "serial" else (lambda: pagerank_parallel(graph, k, iterations))
            samples = []
            for _ in range(trials):
                start = time.perf_counter()
                answer = func()
                samples.append(time.perf_counter() - start)
                error = sum(abs(x - y) for x, y in zip(answer, baseline))
                if error > 1e-8:
                    raise AssertionError(f"Wrong ranks: {method}/{k} L1 error={error}")
            timings[(method, k)] = statistics.median(samples)
        reference = timings[("serial", 1)]
        for method, k in configs:
            elapsed = timings[(method, k)]
            speedup = reference / elapsed
            rows.append(dict(nodes=n, edges=sum(map(len, graph)),
                             method=method, workers=k, iterations=iterations,
                             trials=trials, median_seconds=round(elapsed, 6),
                             speedup=round(speedup, 4),
                             efficiency=round(speedup/k, 4),
                             host_cpus=os.cpu_count() or 1))
    return rows

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--nodes", type=int, nargs="+", default=[1000, 10000])
    ap.add_argument("--workers", type=int, nargs="+", default=[2, 4])
    ap.add_argument("--iterations", type=int, default=12)
    ap.add_argument("--trials", type=int, default=3)
    ap.add_argument("--degree", type=int, default=8)
    ap.add_argument("--csv", default="results.csv")
    args = ap.parse_args()
    if any(n < 1 for n in args.nodes) or any(k < 1 for k in args.workers) or args.degree < 0:
        ap.error("nodes and workers must be positive, degree nonnegative")
    rows = run_benchmarks(args.nodes, args.workers, args.iterations, args.trials, args.degree)
    with open(args.csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    for r in rows:
        print(f"{r['nodes']:>7} nodes | {r['method']:<15} {r['workers']} workers | "
              f"{r['median_seconds']:>9.4f}s | speedup={r['speedup']:>6.2f}x | "
              f"efficiency={r['efficiency']:.2%}")
    print("Saved", args.csv)
    print("Note: one machine with OS processes, not a multi-node Hadoop/Spark cluster.")

if __name__ == "__main__":
    main()

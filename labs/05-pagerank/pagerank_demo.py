"""Single-process PageRank reference walkthrough corresponding to lecture examples.
Python standard library only; this is a simulation, not distributed Hadoop.
"""
from collections import defaultdict

THREE_PAGE = {"A": ("B", "C"), "B": ("C",), "C": ("A",)}
FOUR_PAGE = {**THREE_PAGE, "D": ()}

def step(graph, ranks, damping=0.85):
    """PageRank with uniform teleportation and correctly damped dangling redistribution."""
    if not graph:
        raise ValueError("graph must not be empty")
    if not 0 <= damping < 1:
        raise ValueError("damping must be between 0 and 1 (exclusive)")
    nodes = set(graph)
    if set(ranks) != nodes or any(v < 0 for v in ranks.values()):
        raise ValueError("ranks and graph must contain the same nodes and nonnegative mass")
    if abs(sum(ranks.values()) - 1) > 1e-9:
        raise ValueError("input ranks must sum to one")
    if any(q not in nodes for links in graph.values() for q in links):
        raise ValueError("every linked page must exist in the graph")
    if any(len(set(links)) != len(links) for links in graph.values()):
        raise ValueError("duplicate links are not supported")
    n = len(nodes)
    dangling = sum(ranks[p] for p, links in graph.items() if not links)
    result = {p: (1-damping)/n + damping*dangling/n for p in graph}
    for source, outlinks in graph.items():
        if outlinks:
            contribution = damping*ranks[source]/len(outlinks)
            for dest in outlinks:
                result[dest] += contribution
    return result

def iterate(graph, damping=0.85, tolerance=1e-12, max_iterations=1000):
    if not graph:
        raise ValueError("empty graph")
    ranks = {p: 1/len(graph) for p in graph}
    history = [ranks]
    for _ in range(max_iterations):
        next_ranks = step(graph, ranks, damping)
        history.append(next_ranks)
        delta = sum(abs(next_ranks[p] - ranks[p]) for p in graph)
        ranks = next_ranks
        if delta < tolerance:
            break
    return ranks, history

def lecture_basic_step(graph, ranks):
    """No damping: valid for examples where every node has at least one outlink."""
    if any(not v for v in graph.values()):
        raise ValueError("basic example assumes no dangling nodes")
    result = {node:0.0 for node in graph}
    for src, targets in graph.items():
        for dst in targets:
            result[dst] += ranks[src]/len(targets)
    return result

if __name__ == "__main__":
    print("Lecture A/B/C graph, without damping:")
    r0 = {p:1/3 for p in THREE_PAGE}
    r1 = lecture_basic_step(THREE_PAGE, r0)
    r2 = lecture_basic_step(THREE_PAGE, r1)
    print("iteration 0", r0)
    print("iteration 1", r1)
    print("iteration 2", r2)
    print("Lecture A/B/C/D graph with damping 0.85 and dangling D:")
    r0 = {p:0.25 for p in FOUR_PAGE}
    print("iteration 1", step(FOUR_PAGE,r0))
    converged, history = iterate(FOUR_PAGE)
    print("converged", converged, "iterations", len(history)-1)

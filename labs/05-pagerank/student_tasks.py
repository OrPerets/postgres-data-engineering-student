"""Implement PageRank exercises without looking at instructor solutions.
Functions deliberately raise NotImplementedError at first.
"""
def out_degree(graph: dict[str, tuple[str, ...]], page: str) -> int:
    """Number of outgoing neighbors (assume links are distinct)."""
    raise NotImplementedError("Task 1")

def contributions(graph: dict[str, tuple[str, ...]], ranks: dict[str, float]) -> list[tuple[str, float]]:
    """Map: emit (destination, rank(source)/out_degree(source)) for every edge.
    Dangling nodes emit nothing here; process their mass separately.
    """
    raise NotImplementedError("Task 2")

def group_contributions(pairs: list[tuple[str, float]]) -> dict[str, list[float]]:
    """Shuffle: group numeric values by destination. Include only keys emitted."""
    raise NotImplementedError("Task 3")

def dangling_mass(graph: dict[str, tuple[str, ...]], ranks: dict[str, float]) -> float:
    """Return total rank of nodes with no outgoing links."""
    raise NotImplementedError("Task 4")

def pagerank_step(graph: dict[str, tuple[str, ...]], ranks: dict[str, float], damping: float=0.85) -> dict[str, float]:
    """Reduce: for every node return (1-d)/N + d*(sum_in + dangling_mass/N).
    Preserve nodes that receive no incoming contributions; do not round results.
    """
    raise NotImplementedError("Task 5")

def pagerank_until_convergence(graph: dict[str, tuple[str, ...]], damping: float=0.85, tol: float=1e-10, max_iterations: int=1000):
    """Start uniform. Return (ranks, iterations); stop when sum(abs(new-old)) < tol.
    Reuse pagerank_step. Include a max-iteration safety bound.
    """
    raise NotImplementedError("Task 6")

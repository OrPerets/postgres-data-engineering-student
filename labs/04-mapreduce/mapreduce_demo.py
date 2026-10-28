"""A deterministic single-process *simulation* of Map / Shuffle / Reduce.
This is NOT Hadoop, a network benchmark, or parallel execution.
Usage: python mapreduce_demo.py
"""
from collections import defaultdict
from typing import Iterable
import hashlib

def split_input(records, chunk_size=2):
    if chunk_size < 1:
        raise ValueError("chunk_size must be positive")
    return [records[i:i + chunk_size] for i in range(0, len(records), chunk_size)]

def mapper(record: str):
    """Each character yields (character, 1), including repeated characters."""
    return [(c, 1) for c in record]

def stable_partition(key: str, reducers: int) -> int:
    """Deterministic demo hash; unlike Python hash(), stable across runs."""
    if reducers < 1:
        raise ValueError("reducers must be positive")
    return int.from_bytes(hashlib.sha256(key.encode()).digest()[:8], "big") % reducers

def shuffle(mapped_pairs: Iterable[tuple[str, int]], reducers=2):
    buckets = [defaultdict(list) for _ in range(reducers)]
    for key, val in mapped_pairs:
        buckets[stable_partition(key, reducers)][key].append(val)
    return buckets

def reducer(key, values):
    return key, sum(values)

def run_char_count(records, chunk_size=2, reducers=2, combiner=False):
    partitions = split_input(records, chunk_size)
    shuffled_input = []
    mapped_count = 0
    for part in partitions:
        pairs = [pair for row in part for pair in mapper(row)]
        mapped_count += len(pairs)
        if combiner:
            local = defaultdict(int)
            for k, v in pairs:
                local[k] += v
            pairs = list(local.items())  # safe because addition is associative
        shuffled_input.extend(pairs)
    buckets = shuffle(shuffled_input, reducers)
    output = {}
    for bucket in buckets:
        for key, values in bucket.items():
            k, v = reducer(key, values)
            output[k] = v
    return dict(sorted(output.items())), {
        "input_records": len(records),
        "mapper_outputs": mapped_count,
        "shuffle_pairs": len(shuffled_input),
        "reducers": reducers,
        "input_splits": len(partitions),
    }

if __name__ == "__main__":
    for combine in (False, True):
        result, metrics = run_char_count(["ABR", "CCR", "ACB"], chunk_size=1, reducers=3, combiner=combine)
        print("With combiner" if combine else "Without combiner", result, metrics)
    assert result == {"A": 2, "B": 2, "C": 3, "R": 2}
    print("Correct: A=2, B=2, C=3, R=2")

"""Complete the functions and run: python -m unittest discover -s tests -v
No third-party packages needed.
"""
from typing import Iterable

def word_mapper(line: str):
    """Yield (normalized_word, 1). Split on whitespace; lowercase words.
    Example: 'A b A' -> [('a', 1), ('b', 1), ('a', 1)].
    """
    raise NotImplementedError("Task 4: word_mapper")

def filter_mapper(row: dict, min_amount: float):
    """Represent a SQL WHERE on each input record.
    Emit (row['region'], row['amount']) only if amount >= min_amount
    AND row['status'] == 'completed'. Else emit nothing.
    """
    raise NotImplementedError("Task 5: filter_mapper")

def mean_mapper(numbers: Iterable[float]):
    """Safe partial aggregate; return (sum, count), not a mean."""
    raise NotImplementedError("Task 6: mean_mapper")

def mean_combiner(a: tuple, b: tuple):
    """Merge two partial (sum, count) states."""
    raise NotImplementedError("Task 6: mean_combiner")

def mean_reducer(state: tuple):
    """Return mean, or None when count is zero."""
    raise NotImplementedError("Task 6: mean_reducer")

def variance_mapper(numbers: Iterable[float]):
    """Return (count, sum, sum_of_squares) for POPULATION variance."""
    raise NotImplementedError("Task 7: variance_mapper")

def variance_combiner(a: tuple, b: tuple):
    """Merge two (count, sum, sum_of_squares) states."""
    raise NotImplementedError("Task 7: variance_combiner")

def variance_reducer(state: tuple):
    """Return population variance or None for an empty input.
    This introductory method can have floating-point cancellation; discuss it.
    """
    raise NotImplementedError("Task 7: variance_reducer")

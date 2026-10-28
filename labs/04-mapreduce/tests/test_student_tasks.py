import unittest
from student_tasks import (
    word_mapper, filter_mapper, mean_mapper, mean_combiner, mean_reducer,
    variance_mapper, variance_combiner, variance_reducer,
)

class MapReduceStudentTests(unittest.TestCase):
    def test_word_mapper(self):
        self.assertEqual(list(word_mapper("A b A")), [("a", 1), ("b", 1), ("a", 1)])
    def test_filter_mapper(self):
        row = {"region": "north", "amount": 100, "status": "completed"}
        self.assertEqual(list(filter_mapper(row, 50)), [("north", 100)])
        self.assertEqual(list(filter_mapper(row, 101)), [])
        self.assertEqual(list(filter_mapper({**row, "status": "cancelled"}, 50)), [])
    def test_mean(self):
        left = mean_mapper([1, 2])
        right = mean_mapper([3, 4])
        self.assertAlmostEqual(mean_reducer(mean_combiner(left, right)), 2.5)
        self.assertIsNone(mean_reducer(mean_mapper([])))
    def test_variance(self):
        left = variance_mapper([1, 2])
        right = variance_mapper([3, 4])
        self.assertAlmostEqual(variance_reducer(variance_combiner(left, right)), 1.25)
        self.assertIsNone(variance_reducer(variance_mapper([])))

if __name__ == "__main__":
    unittest.main()

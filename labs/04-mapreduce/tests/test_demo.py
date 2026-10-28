import unittest
from mapreduce_demo import run_char_count, stable_partition

class MapReduceDemoTests(unittest.TestCase):
    def test_lecture_example(self):
        expected = {"A":2,"B":2,"C":3,"R":2}
        for reducers in (1, 2, 3, 5):
            for combiner in (False, True):
                counts, _ = run_char_count(["ABR","CCR","ACB"],1,reducers,combiner)
                self.assertEqual(counts, expected)
    def test_combiner_reduces_records(self):
        lines = ["AAAA","AAAA","BBBB"]
        a, m1 = run_char_count(lines,1,2,False)
        b, m2 = run_char_count(lines,1,2,True)
        self.assertEqual(a,b)
        self.assertLess(m2["shuffle_pairs"], m1["shuffle_pairs"])
    def test_stable(self):
        self.assertEqual(stable_partition("abc", 4), stable_partition("abc",4))

if __name__ == "__main__":
    unittest.main()

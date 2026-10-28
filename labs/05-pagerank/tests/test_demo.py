import unittest
from pagerank_demo import THREE_PAGE, FOUR_PAGE, step, lecture_basic_step, iterate

class DemoTests(unittest.TestCase):
    def test_lecture_basic(self):
        r1=lecture_basic_step(THREE_PAGE, {p:1/3 for p in THREE_PAGE})
        self.assertAlmostEqual(r1["A"], 1/3)
        self.assertAlmostEqual(r1["B"], 1/6)
        self.assertAlmostEqual(r1["C"], 1/2)
        r2=lecture_basic_step(THREE_PAGE,r1)
        self.assertAlmostEqual(r2["A"], 1/2)
        self.assertAlmostEqual(r2["B"], 1/6)
        self.assertAlmostEqual(r2["C"], 1/3)
    def test_damped_dangling(self):
        result=step(FOUR_PAGE,{p:.25 for p in FOUR_PAGE})
        for p,v in zip("ABCD", (.303125,.196875,.409375,.090625)):
            self.assertAlmostEqual(result[p],v)
        self.assertAlmostEqual(sum(result.values()),1.0)
    def test_convergence(self):
        result, history=iterate(FOUR_PAGE)
        self.assertLess(len(history),1001)
        self.assertAlmostEqual(sum(result.values()),1)
        next_result=step(FOUR_PAGE,result)
        self.assertLess(sum(abs(next_result[p]-result[p]) for p in result),1e-10)

if __name__=="__main__": unittest.main()

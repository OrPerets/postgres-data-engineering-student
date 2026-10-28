import unittest
from benchmark import make_graph, pagerank_serial, pagerank_parallel, run_benchmarks

class BenchmarkTests(unittest.TestCase):
    def test_equal_results(self):
        for n in (7, 32, 101):
            graph=make_graph(n, out_degree=3, dangling_fraction=.2)
            a=pagerank_serial(graph, iterations=5)
            b=pagerank_parallel(graph, workers=2, iterations=5)
            self.assertLess(sum(abs(x-y) for x,y in zip(a,b)),1e-10)
            self.assertAlmostEqual(sum(a),1.0)
            self.assertAlmostEqual(sum(b),1.0)
    def test_all_dangling(self):
        graph=[(),(),()]
        a=pagerank_serial(graph,iterations=4)
        b=pagerank_parallel(graph,workers=2,iterations=4)
        for v in a+b: self.assertAlmostEqual(v,1/3)
    def test_result_structure(self):
        rows=run_benchmarks([12],[2],iterations=2,trials=1,degree=2)
        self.assertEqual(len(rows),2)
        self.assertEqual(rows[0]["method"],"serial")
        self.assertEqual(rows[1]["workers"],2)

if __name__=="__main__": unittest.main()

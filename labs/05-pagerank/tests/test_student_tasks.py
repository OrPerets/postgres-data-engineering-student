import unittest
from student_tasks import (out_degree, contributions, group_contributions, dangling_mass,
                           pagerank_step, pagerank_until_convergence)

G={"A":("B","C"),"B":("C",),"C":("A",),"D":()}
R={p:0.25 for p in G}

class StudentTests(unittest.TestCase):
    def test_degree(self):
        self.assertEqual(out_degree(G,"A"),2)
        self.assertEqual(out_degree(G,"D"),0)
    def test_mapper(self):
        self.assertCountEqual(contributions(G,R), [("B",.125),("C",.125),("C",.25),("A",.25)])
    def test_shuffle(self):
        g=group_contributions([("C",.125),("B",.125),("C",.25)])
        self.assertCountEqual(g["C"],[.125,.25])
        self.assertEqual(g["B"],[.125])
    def test_dangling(self):
        self.assertAlmostEqual(dangling_mass(G,R),.25)
    def test_step(self):
        out=pagerank_step(G,R,.85)
        self.assertEqual(set(out),set(G))
        for k,expected in zip("ABCD",(.303125,.196875,.409375,.090625)):
            self.assertAlmostEqual(out[k],expected)
        self.assertAlmostEqual(sum(out.values()),1.0)
    def test_convergence(self):
        ranks,it=pagerank_until_convergence(G,.85,1e-10,1000)
        self.assertLessEqual(it,1000)
        self.assertGreater(it,0)
        self.assertAlmostEqual(sum(ranks.values()),1.0)
        nxt=pagerank_step(G,ranks,.85)
        self.assertLess(sum(abs(nxt[k]-ranks[k]) for k in G),1e-9)

if __name__=="__main__": unittest.main()

import unittest
from benchmark import generate_corpus,serial_tfidf,parallel_tfidf,benchmark

class BenchmarkTests(unittest.TestCase):
    def test_equivalence(self):
        for n in (1,7,40):
            corpus=generate_corpus(n,words_per_doc=12,vocab_size=7)
            expected,df=serial_tfidf(corpus)
            actual,df2=parallel_tfidf(corpus,2)
            self.assertEqual(df,df2)
            self.assertEqual(expected.keys(),actual.keys())
            for key in expected:
                self.assertAlmostEqual(expected[key],actual[key])
    def test_global_df(self):
        scores,df=serial_tfidf(["data data science","data engineering"])
        self.assertEqual(df["data"],2)
        self.assertEqual(df["science"],1)
        self.assertAlmostEqual(scores[(0,"data")],0.0)
    def test_empty_documents(self):
        serial,df=serial_tfidf(["","abc"])
        parallel,df2=parallel_tfidf(["","abc"],2)
        self.assertEqual(serial,parallel)
        self.assertEqual(df,df2)
    def test_report(self):
        rows=benchmark([5],[2],trials=1,words_per_doc=4,vocab_size=4)
        self.assertEqual(len(rows),2)
        self.assertEqual(rows[0]["method"],"serial")

if __name__=="__main__":unittest.main()

import math
import unittest
from tfidf_demo import CORPUS, compute, extract_ticket_id, extract_currency_amount, tokenize

class DemoTests(unittest.TestCase):
    def test_corpus_and_scores(self):
        r = compute(CORPUS)
        self.assertEqual(r["counts"][("data","D1")],2)
        self.assertEqual(r["df"]["data"],3)
        self.assertEqual(r["df"]["builds"],1)
        self.assertAlmostEqual(r["scores"][("data","D1")],.5*math.log(5/4))
        self.assertAlmostEqual(r["scores"][("experiments","D3")],math.log(5/2)/3)
    def test_regex(self):
        self.assertEqual(extract_ticket_id("Ticket=TKT-1042"),"TKT-1042")
        self.assertIsNone(extract_ticket_id("TKT-12"))
        self.assertIsNone(extract_ticket_id("TKT-1042A"))
        self.assertEqual(extract_currency_amount("refund USD 120.50 requested"),("USD","120.50"))
        self.assertEqual(tokenize("Printer JAM!!! Ticket=TKT-1042"),["printer","jam","ticket","tkt","1042"])
if __name__ == "__main__": unittest.main()

import math
import unittest
from student_tasks import (extract_ticket_id, extract_amount, normalize_tokens,
                           count_terms, attach_doc_lengths, document_frequencies, tfidf_scores)
from tfidf_demo import CORPUS

class StudentTests(unittest.TestCase):
    def test_regex(self):
        self.assertEqual(extract_ticket_id("TKT-1042"),"TKT-1042")
        self.assertIsNone(extract_ticket_id("TKT-1042A"))
        self.assertIsNone(extract_ticket_id("TKT-12"))
        self.assertEqual(extract_amount("refund USD 120.50 requested"),("USD","120.50"))
    def test_tokens(self):
        self.assertEqual(normalize_tokens("Printer JAM!!! Ticket=TKT-1042"),["printer","jam","ticket","tkt","1042"])
    def test_counts(self):
        counts=count_terms(CORPUS)
        self.assertEqual(counts[("data","D1")],2)
        self.assertEqual(counts[("science","D3")],1)
    def test_lengths(self):
        lengths=attach_doc_lengths(count_terms(CORPUS))
        self.assertEqual(lengths[("data","D1")],(2,4))
        self.assertEqual(lengths[("experiments","D3")],(1,3))
    def test_df(self):
        df=document_frequencies(count_terms(CORPUS))
        self.assertEqual(df["data"],3)
        self.assertEqual(df["builds"],1)
    def test_tfidf(self):
        counts=count_terms(CORPUS)
        scores=tfidf_scores(attach_doc_lengths(counts),document_frequencies(counts),4)
        self.assertAlmostEqual(scores[("data","D1")],.5*math.log(5/4))
        self.assertAlmostEqual(scores[("builds","D2")],.25*math.log(5/2))
if __name__=="__main__":unittest.main()

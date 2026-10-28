"""Implement each function. Do NOT import tfidf_demo.compute as your solution."""
def extract_ticket_id(text: str):
    """Find uppercase TKT- followed by exactly 4..6 digits, with boundaries.
    Return the matched ID (str) or None. Reject TKT-1042A as a partial match.
    """
    raise NotImplementedError("Exercise 1")

def extract_amount(text: str):
    """Extract (currency_code, decimal_string) e.g. ('USD','120.50'),
    currencies USD / EUR / ILS. Return None if absent.
    """
    raise NotImplementedError("Exercise 2")

def normalize_tokens(text: str):
    """Lowercase, remove punctuation into separators, retain a-z and 0-9.
    Example 'Printer JAM!!!' => ['printer','jam'].
    """
    raise NotImplementedError("Exercise 3")

def count_terms(corpus: dict[str,str]):
    """MR1: return {(term, doc_id): count} from normalized tokens."""
    raise NotImplementedError("Exercise 4")

def attach_doc_lengths(counts: dict):
    """MR2: return {(term,doc_id): (term_count, doc_length)}."""
    raise NotImplementedError("Exercise 5")

def document_frequencies(counts: dict):
    """MR3: return {term: number of DISTINCT document IDs containing term}."""
    raise NotImplementedError("Exercise 6")

def tfidf_scores(counts: dict, df: dict, n_documents: int):
    """MR4: return {(term,doc): score} using normalized TF=count/doc_len
    and natural-log IDF=ln((N+1)/(df+1)). Input counts is MR2 output.
    """
    raise NotImplementedError("Exercise 7")

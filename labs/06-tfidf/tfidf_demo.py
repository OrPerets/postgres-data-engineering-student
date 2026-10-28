"""Reference demonstration: four MapReduce-style stages for TF-IDF.

Simulates MapReduce grouping in one process. Uses natural-log smoothed IDF,
ln((N+1)/(df+1)), as in lecture's page-26 worked example.
"""
from collections import Counter, defaultdict
import math
import re

CORPUS = {
    "D1": "data science uses data.",
    "D2": "data engineering builds pipelines.",
    "D3": "science uses experiments.",
    "D4": "engineering uses data pipelines.",
}
TICKETS = [
    "Printer JAM!!! Ticket=TKT-1042",
    "refund USD 120.50 requested for TKT-998877",
    "Malformed ID TKT-12",
]

def extract_ticket_id(text):
    # Right boundary alone would match TKT-1042 in TKT-1042A? No: A is a word
    # character; the boundary forbids that accidental partial ID.
    match = re.search(r"\bTKT-[0-9]{4,6}\b", text, flags=re.IGNORECASE)
    return match.group(0).upper() if match else None

def extract_currency_amount(text):
    match = re.search(r"\b(USD|ILS|EUR)\s?([0-9]+(?:\.[0-9]{1,2})?)\b", text, flags=re.IGNORECASE)
    return (match.group(1).upper(), match.group(2)) if match else None

def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())

def map_shuffle_reduce(pairs, combine):
    grouped = defaultdict(list)
    for key, value in pairs:
        grouped[key].append(value)
    return {key: combine(values) for key, values in grouped.items()}

def compute(corpus):
    if not corpus:
        raise ValueError("Corpus must contain at least one document")
    tokens = {doc: tokenize(text) for doc, text in corpus.items()}
    # MR1: ((term, doc),1) -> count
    mapped1 = [((term,doc),1) for doc, words in tokens.items() for term in words]
    counts = map_shuffle_reduce(mapped1, sum)
    # MR2: (doc,(term,count)) -> ((term,doc),(count,length))
    by_doc = defaultdict(list)
    for (term,doc), count in counts.items():
        by_doc[doc].append((term,count))
    term_doc_len = {}
    for doc, rows in by_doc.items():
        length = sum(count for _, count in rows)
        for term, count in rows:
            term_doc_len[(term,doc)] = (count,length)
    # MR3: term -> document frequency
    by_term = defaultdict(list)
    for term,doc in term_doc_len:
        by_term[term].append(doc)
    df = {term:len(set(docs)) for term,docs in by_term.items()}
    n = len(corpus)
    # MR4: score and identity reducer
    scores = {}
    for (term,doc), (count,length) in term_doc_len.items():
        scores[(term,doc)] = (count/length) * math.log((n+1)/(df[term]+1))
    return {"tokens":tokens,"counts":counts,"df":df,"scores":scores}

if __name__ == "__main__":
    print("REGEX EXTRACTION")
    for line in TICKETS:
        print(repr(line), "ticket:",extract_ticket_id(line),"amount:",extract_currency_amount(line))
    data = compute(CORPUS)
    print("\nDOCUMENT FREQUENCY:",dict(sorted(data["df"].items())))
    print("\nTF-IDF (natural logarithm):")
    for (term,doc),value in sorted(data["scores"].items(),key=lambda x:(x[0][1],x[0][0])):
        print(doc, term, f"{value:.4f}")
    assert abs(data["scores"][("data","D1")] - (0.5*math.log(5/4))) < 1e-12

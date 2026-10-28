"""Controlled sequential versus multiprocessing TF-IDF benchmark.

One host, separate processes; NOT a Hadoop/Spark cluster. Corpus generation is
excluded from timed sections. Each process returns local (term, document)
counts and document lengths; global DF merge and TF-IDF scoring are centralized.
"""
import argparse
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
import csv
import math
import os
import random
import statistics
import time
import re

VOCAB = tuple(f"word{i}" for i in range(5000))

def generate_corpus(n, words_per_doc=100, vocab_size=1000, seed=42):
    if n < 1 or words_per_doc < 1 or not 1 <= vocab_size <= len(VOCAB):
        raise ValueError("invalid corpus dimensions")
    rng = random.Random(seed)
    vocabulary = VOCAB[:vocab_size]
    return [(" ".join(rng.choices(vocabulary, k=words_per_doc))) for _ in range(n)]

def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())

def map_chunk(chunk):
    """Input pairs (doc_id,text). Output counts and length per document."""
    results = []
    for doc_id, text in chunk:
        tokens = tokenize(text)
        results.append((doc_id, Counter(tokens), len(tokens)))
    return results

def aggregate(mapped, n):
    """Global DF and score phase. Count every term at most once per document."""
    df = Counter()
    for doc_id, counts, length in mapped:
        df.update(counts.keys())
    # Sparse matrix represented as {(document,term):score}; no zero entries.
    scores = {}
    for doc_id, counts, length in mapped:
        if not length:
            continue
        for term, count in counts.items():
            scores[(doc_id, term)] = count/length * math.log((n+1)/(df[term]+1))
    return scores, df

def serial_tfidf(corpus):
    mapped = map_chunk(list(enumerate(corpus)))
    return aggregate(mapped, len(corpus))

def parallel_tfidf(corpus, workers=2):
    if workers < 1:
        raise ValueError("workers must be positive")
    chunksize = max(1, math.ceil(len(corpus)/workers))
    records = list(enumerate(corpus))
    chunks = [records[i:i+chunksize] for i in range(0,len(records),chunksize)]
    with ProcessPoolExecutor(max_workers=workers) as pool:
        parts = list(pool.map(map_chunk, chunks))
    mapped = [record for part in parts for record in part]
    return aggregate(mapped, len(corpus))

def benchmark(sizes, workers, trials=3, words_per_doc=100, vocab_size=1000):
    if trials < 1:
        raise ValueError("trials must be positive")
    output = []
    for n in sizes:
        corpus = generate_corpus(n, words_per_doc, vocab_size)
        reference, reference_df = serial_tfidf(corpus)
        timings = {}
        for method, worker_count in [("serial",1)] + [("multiprocessing",p) for p in workers]:
            durations = []
            for _ in range(trials):
                t0 = time.perf_counter()
                scores, df = serial_tfidf(corpus) if method=="serial" else parallel_tfidf(corpus, worker_count)
                durations.append(time.perf_counter()-t0)
                if df != reference_df or scores.keys() != reference.keys():
                    raise AssertionError("Incorrect parallel document frequencies or score keys")
                max_error = max((abs(scores[k]-reference[k]) for k in reference),default=0.0)
                if max_error > 1e-12:
                    raise AssertionError(f"TF-IDF mismatch {max_error}")
            timings[(method,worker_count)] = statistics.median(durations)
        baseline = timings[("serial",1)]
        for method,p in [("serial",1)] + [("multiprocessing",p) for p in workers]:
            seconds = timings[(method,p)]
            speedup = baseline / seconds
            output.append(dict(documents=n, words_per_doc=words_per_doc, vocab_size=vocab_size,
                unique_terms=len(reference_df), nonzero_scores=len(reference),
                method=method, workers=p, trials=trials, median_seconds=round(seconds,6),
                speedup=round(speedup,4), efficiency=round(speedup/p,4),
                host_cpus=os.cpu_count() or 1))
    return output

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--documents",type=int,nargs="+",default=[100,1000,5000])
    parser.add_argument("--workers",type=int,nargs="+",default=[2,4])
    parser.add_argument("--words-per-doc",type=int,default=100)
    parser.add_argument("--vocab-size",type=int,default=1000)
    parser.add_argument("--trials",type=int,default=3)
    parser.add_argument("--csv",default="results.csv")
    args=parser.parse_args()
    if any(n<1 for n in args.documents) or any(w<1 for w in args.workers):
        parser.error("documents and workers must be positive")
    rows=benchmark(args.documents,args.workers,args.trials,args.words_per_doc,args.vocab_size)
    with open(args.csv,"w",newline="",encoding="utf-8") as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    for row in rows:
        print(f"{row['documents']:>6} docs | {row['method']:<15} {row['workers']} workers | "
              f"{row['median_seconds']:.4f}s | speedup {row['speedup']:.2f}x")
    print("Saved",args.csv)
    print("Single host with multiprocessing, NOT multi-node distributed processing.")

if __name__=="__main__":
    main()

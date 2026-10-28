"""Compare query timings after warm-up (median of 7 runs)."""
import os
import statistics
import time
import psycopg

dsn = os.getenv("PRIMARY_DSN", "postgresql://lab:labpass@localhost:5432/engineering")
query = """SELECT SUM(amount) FROM {} WHERE sale_date >= DATE '2025-01-01'
AND sale_date < DATE '2025-04-01'"""
with psycopg.connect(dsn) as conn:
    for table in ("sales_regular", "sales_partitioned"):
        sql = query.format(table)
        for _ in range(2):
            conn.execute(sql).fetchone()
        runs = []
        for _ in range(7):
            start = time.perf_counter()
            conn.execute(sql).fetchone()
            runs.append((time.perf_counter() - start) * 1000)
        print(f"{table}: median={statistics.median(runs):.2f} ms; runs={[round(x,2) for x in runs]}")
print("Inspect EXPLAIN BUFFERS before attributing performance to partitioning.")

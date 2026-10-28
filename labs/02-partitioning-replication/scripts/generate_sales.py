"""Load deterministic synthetic sales into regular and partitioned tables."""
import argparse
import os
import random
from datetime import date, timedelta
import psycopg

parser = argparse.ArgumentParser()
parser.add_argument("--rows", type=int, default=200000)
parser.add_argument("--batch", type=int, default=10000)
args = parser.parse_args()
if not (0 < args.rows <= 10000000 and args.batch > 0):
    parser.error("rows must be 1..10000000 and batch positive")
rng = random.Random(42)
base = date(2024, 1, 1)
dsn = os.getenv("PRIMARY_DSN", "postgresql://lab:labpass@localhost:5432/engineering")
with psycopg.connect(dsn) as conn:
    for start in range(1, args.rows + 1, args.batch):
        end = min(start + args.batch, args.rows + 1)
        records = [(i, base + timedelta(days=rng.randrange(1096)),
                    rng.randint(1, 10000), round(rng.uniform(1, 1000), 2))
                   for i in range(start, end)]
        for table in ("sales_regular", "sales_partitioned"):
            with conn.cursor() as cur:
                with cur.copy(f"COPY {table} (sale_id,sale_date,customer_id,amount) FROM STDIN") as copy:
                    for record in records:
                        copy.write_row(record)
        conn.commit()
        print(f"Loaded {end-1:,}/{args.rows:,}", flush=True)
    conn.execute("ANALYZE sales_regular")
    conn.execute("ANALYZE sales_partitioned")
    conn.commit()

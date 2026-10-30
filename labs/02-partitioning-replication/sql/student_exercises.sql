-- STUDENT WORKSPACE: fill in your own SQL answers.
-- Run selected statements on the intended server; do not run this mixed file
-- in full against either server, even after you have written valid statements.
-- Use Primary for DDL and writes; use Replica for the requested reads/checks.
-- B5 is a separate intentional write attempt on Replica: first confirm
-- pg_is_in_recovery() is true, run it in a transaction, capture the expected
-- standby error, then ROLLBACK. Do not retry that write on Primary.
-- A1: list partition names and bounds

-- A2: yearly count and revenue

-- A3: same quarterly aggregation on regular and partitioned, with EXPLAIN ANALYZE BUFFERS

-- A4: create monthly partitioned table and 12 partitions for 2025, load, verify

-- A5: pruning with month / year predicates

-- A6: 2027 partition and insert

-- B1: server recovery status

-- B2: insert on primary + read on replica

-- B3: pg_stat_replication and WAL byte difference

-- B4: WAL receiver and replay timestamp

-- B5: attempted write on read-only standby (run separately)

-- C1: customer running total

-- C2: top three transactions per customer (ROW_NUMBER)

-- C3: monthly sales and prior month using LAG

-- C4: elapsed days between customer's transactions

-- C5: monthly customer ranking, top five with ties in Jan 2025

-- C6: moving 3-month average with explicit ROWS frame

-- C7: explain two distinct meanings of PARTITION BY in report

-- D1: pruning + window query; inspect plans on both servers

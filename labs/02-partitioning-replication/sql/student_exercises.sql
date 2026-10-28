-- STUDENT WORKSPACE: fill in your own SQL answers.
-- WARNING: use Primary for DDL/INSERT; use Replica only for SELECT and attempted write demonstration.
-- Do not run the entire file until you have written valid statements.
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

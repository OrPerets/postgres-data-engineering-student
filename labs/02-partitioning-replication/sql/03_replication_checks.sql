-- Run the queries on Primary and Replica as instructed in README.
SELECT pg_is_in_recovery();
SELECT application_name, state, sync_state, sent_lsn, replay_lsn,
       pg_wal_lsn_diff(sent_lsn, replay_lsn) AS pending_replay_bytes
FROM pg_stat_replication;
-- On Replica: SELECT status, received_lsn, latest_end_lsn FROM pg_stat_wal_receiver;
-- Insert on Primary; read on Replica:
INSERT INTO sales_regular VALUES (99999999, '2026-10-26', 100, 500);

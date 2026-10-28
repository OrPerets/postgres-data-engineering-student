#!/bin/bash
set -euo pipefail
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v repl_password="$REPLICATION_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD %L', :'repl_password') \gexec
SQL
# Classroom only. Do not use this CIDR / hard-coded credentials in production.
echo 'host replication replicator 0.0.0.0/0 scram-sha-256' >> "$PGDATA/pg_hba.conf"

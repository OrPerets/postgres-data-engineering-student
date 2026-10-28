#!/bin/bash
set -euo pipefail
mkdir -p "$PGDATA"
chmod 700 "$PGDATA"
printf 'primary:5432:replication:replicator:%s\n' "$REPLICATION_PASSWORD" > "$HOME/.pgpass"
chmod 600 "$HOME/.pgpass"
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "Bootstrapping replica via pg_basebackup"
  until PGPASSFILE="$HOME/.pgpass" pg_basebackup -h primary -p 5432 -U replicator -D "$PGDATA" -Fp -Xs -P -R; do
    echo "Waiting for primary..."; sleep 3
  done
fi
exec docker-entrypoint.sh postgres -c hot_standby=on

#!/usr/bin/env bash
set -euo pipefail
LAB="${1:?Lab ID required}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "$LAB" == 06-tfidf-sql ]]; then cd "$ROOT/labs/06-tfidf"; else cd "$ROOT/labs/$LAB"; fi
say() { printf '\n==> %s\n' "$*"; }
fail() { echo "ERROR: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null || fail "Missing $1. In Codespaces, check the container creation log."; }
psqlq() { docker compose exec -T "$1" psql -X -qAt -v ON_ERROR_STOP=1 -U "$2" -d "$3" -c "$4"; }
loadsql() { docker compose exec -T "$1" psql -X -v ON_ERROR_STOP=1 -U "$2" -d "$3" < "$4"; }
object_count() {
  local service="$1" user="$2" database="$3"; shift 3
  local names="" name
  for name in "$@"; do names+="('$name'),"; done
  names="${names%,}"
  psqlq "$service" "$user" "$database" "SELECT count(*) FROM (VALUES $names) AS objects(name) WHERE to_regclass(name) IS NOT NULL"
}
check_partial() {
  local count="$1" total="$2" label="$3"
  if (( count > 0 && count < total )); then
    fail "$label is partially initialized ($count of $total objects). Existing work was preserved. Inspect the database and back up your work before repairing it or using the confirmed reset."
  fi
}

# A durable marker is written only after all setup SQL and data loads succeed.
# Existing unmarked databases may predate these markers or contain an interrupted
# load; never guess or overwrite them. Explicit adoption follows manual review.
marker_exists() {
  local service="$1" user="$2" database="$3" key="$4"
  local table_exists complete
  table_exists=$(psqlq "$service" "$user" "$database" "SELECT to_regclass('_lab_setup.completed') IS NOT NULL") || fail "Could not inspect the setup marker; database state was not changed."
  if [[ "$table_exists" == t ]]; then
    complete=$(psqlq "$service" "$user" "$database" "SELECT EXISTS (SELECT 1 FROM _lab_setup.completed WHERE lab = '$key')") || fail "Could not read the setup marker; database state was not changed."
    if [[ "$complete" == t ]]; then return 0; fi
    if [[ "$complete" == f ]]; then return 1; fi
    fail "Unexpected setup marker value; database state was not changed."
  elif [[ "$table_exists" == f ]]; then
    return 1
  else
    fail "Unexpected setup marker response; database state was not changed."
  fi
}
write_marker() {
  local service="$1" user="$2" database="$3" key="$4"
  psqlq "$service" "$user" "$database" "CREATE SCHEMA IF NOT EXISTS _lab_setup; CREATE TABLE IF NOT EXISTS _lab_setup.completed (lab text PRIMARY KEY, completed_at timestamptz NOT NULL DEFAULT now()); INSERT INTO _lab_setup.completed (lab) VALUES ('$key') ON CONFLICT (lab) DO NOTHING" >/dev/null
}
check_existing_marker() {
  local service="$1" user="$2" database="$3" key="$4" inspect="$5" start="$6"
  if marker_exists "$service" "$user" "$database" "$key"; then return; fi
  if [[ "${LAB_ADOPT_EXISTING:-}" != YES ]]; then
    echo "No completed setup marker was found. This database may predate markers or have an interrupted load. Nothing was changed." >&2
    echo "Inspect from the lab directory: $inspect" >&2
    echo "Check the output and back up your work. If you confirm the data is complete, from the repository root run: LAB_ADOPT_EXISTING=YES $start" >&2
    echo "Otherwise, repair it manually or use the separately confirmed reset after backing up." >&2
    exit 1
  fi
  say "Adopting the existing database as complete, as explicitly requested."
  write_marker "$service" "$user" "$database" "$key"
}
check_absent_marker() {
  local service="$1" user="$2" database="$3" key="$4"
  if marker_exists "$service" "$user" "$database" "$key"; then
    fail "A completed setup marker exists but the expected lab tables are missing. Existing state was preserved; inspect and back up the database before repair or confirmed reset."
  fi
}

say "Initializing $LAB (existing student database rows will be preserved)"
case "$LAB" in
  01-relational-sql)
    need docker
    docker compose up -d --wait
    count=$(object_count postgres student query_lab public.customers public.orders public.order_items)
    check_partial "$count" 3 "SQL lab"
    if (( count == 3 )); then
      check_existing_marker postgres student query_lab sql "docker compose exec -T postgres psql -U student -d query_lab < sql/03_check_data.sql" "make lab-sql"
      say "SQL tables already exist — skipping destructive schema/seed scripts."
    else
      check_absent_marker postgres student query_lab sql
      say "Creating schema and sample orders"
      loadsql postgres student query_lab sql/01_schema.sql
      loadsql postgres student query_lab sql/02_seed.sql
      write_marker postgres student query_lab sql
    fi
    say "SQL lab verification"
    loadsql postgres student query_lab sql/03_check_data.sql
    echo "READY: SQL lab. Edit labs/01-relational-sql/sql/student_answers.sql"
    ;;
  02-partitioning-replication)
    need docker; need python
    python -c 'import psycopg' >/dev/null 2>&1 || { say "Installing Python requirements"; python -m pip install -r requirements.txt; }
    docker compose up -d --wait
    count=$(object_count primary lab engineering public.sales_regular public.sales_partitioned public.sales_2024 public.sales_2025 public.sales_2026)
    check_partial "$count" 5 "Partitioning lab"
    if (( count == 5 )); then
      check_existing_marker primary lab engineering partitions "docker compose exec primary psql -U lab -d engineering -c 'SELECT (SELECT count(*) FROM sales_regular) AS regular, (SELECT count(*) FROM sales_partitioned) AS partitioned;'" "make lab-partitions"
      say "Sales tables exist — preserving previous data."
    else
      check_absent_marker primary lab engineering partitions
      loadsql primary lab engineering sql/01_schema.sql
      python scripts/generate_sales.py --rows 200000
      write_marker primary lab engineering partitions
    fi
    [[ "$(psqlq replica lab engineering 'SELECT pg_is_in_recovery()')" == t ]] || fail "Replica is not in recovery mode"
    echo "READY: Partitioning and replication lab."
    ;;
  03-dwh-etl)
    need docker
    docker compose up -d --wait
    stage_count=$(object_count postgres student dwh_etl_lab src_schema.snowflake_raw src_schema.dataiku_raw stage_schema.snowflake_clean stage_schema.dataiku_clean stage_schema.usage)
    dwh_count=$(object_count postgres student dwh_etl_lab dwh_schema.reporting_scope dwh_schema.dim_source dwh_schema.dim_date dwh_schema.dim_user dwh_schema.dim_entity dwh_schema.dim_model dwh_schema.fact_usage)
    check_partial "$stage_count" 5 "DWH source and staging"
    check_partial "$dwh_count" 7 "DWH warehouse"
    if (( stage_count == 0 && dwh_count == 0 )); then
      check_absent_marker postgres student dwh_etl_lab dwh
      loadsql postgres student dwh_etl_lab sql/01_stage.sql
      loadsql postgres student dwh_etl_lab sql/02_dwh.sql
      loadsql postgres student dwh_etl_lab sql/03_verify.sql
      write_marker postgres student dwh_etl_lab dwh
    elif (( stage_count == 5 && dwh_count == 7 )); then
      check_existing_marker postgres student dwh_etl_lab dwh "docker compose exec -T postgres psql -U student -d dwh_etl_lab < sql/03_verify.sql" "make lab-dwh"
      say "Existing warehouse state will be preserved."
      loadsql postgres student dwh_etl_lab sql/03_verify.sql
    else
      fail "DWH source/staging and warehouse objects are incomplete. Existing work was preserved. Inspect and back up the database before repair or confirmed reset."
    fi
    echo "READY: DWH and ETL lab."
    ;;
  04-mapreduce|05-pagerank|06-tfidf)
    need python
    demo=mapreduce_demo.py
    [[ "$LAB" == 05-pagerank ]] && demo=pagerank_demo.py
    [[ "$LAB" == 06-tfidf ]] && demo=tfidf_demo.py
    say "Running reference demo ($demo)"
    python "$demo"
    echo "READY: Python lab. Complete student_tasks.py and run the tests when ready."
    ;;
  06-tfidf-sql)
    # This database is independent of the Python starter and required for the full assignment.
    cd "$ROOT/labs/06-tfidf"
    need docker
    docker compose up -d --wait
    if [[ "$(psqlq postgres student tfidf_lab "SELECT to_regclass('public.documents') IS NOT NULL")" == t ]]; then
      check_existing_marker postgres student tfidf_lab tfidf "docker compose exec postgres psql -U student -d tfidf_lab -c 'SELECT doc_id, raw_text FROM documents ORDER BY doc_id;'" "make lab-tfidf-sql"
      say "TF-IDF document table already exists — preserving data."
    else
      check_absent_marker postgres student tfidf_lab tfidf
      loadsql postgres student tfidf_lab sql/01_setup.sql
      write_marker postgres student tfidf_lab tfidf
    fi
    echo "READY: TF-IDF SQL database."
    ;;
  *) fail "Unknown lab: $LAB" ;;
esac

#!/usr/bin/env bash
set -euo pipefail
LAB="${1:?Provide lab name}"
ACTION="${2:?Provide action}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/labs/$LAB"
need() { command -v "$1" >/dev/null || { echo "Missing $1. See docs/GETTING_STARTED.md"; exit 1; }; }
psql_file() { docker compose exec -T "$1" psql -v ON_ERROR_STOP=1 -U "$2" -d "$3" < "$4"; }
assert_sql() {
  local service="$1" user="$2" database="$3" query="$4" message="$5" result
  result=$(docker compose exec -T "$service" psql -X -qAt -v ON_ERROR_STOP=1 -U "$user" -d "$database" -c "$query")
  if [[ "$result" != t ]]; then
    echo "Check failed: $message. Inspect the lab data and services; preserve your work before repair or reset." >&2
    return 1
  fi
}
case "$ACTION" in
 setup)
   bash "$ROOT/scripts/student-init.sh" "$LAB" ;;
 demo)
   case "$LAB" in
     01-relational-sql) need docker; docker compose exec -T postgres psql -U student -d query_lab < sql/03_check_data.sql;;
     02-partitioning-replication) need python; python scripts/benchmark.py;;
     03-dwh-etl) need docker; psql_file postgres student dwh_etl_lab sql/03_verify.sql;;
     04-mapreduce) python mapreduce_demo.py;;
     05-pagerank) python pagerank_demo.py;;
     06-tfidf) python tfidf_demo.py;;
   esac ;;
 test)
   if [[ "$LAB" == 0[123]* ]]; then
     echo "Checking basic data and services; this does not grade student SQL answers."
   else
     echo "Running reference and student tests; unfinished student exercises are expected to fail."
   fi
   case "$LAB" in
     01-relational-sql)
       need docker; psql_file postgres student query_lab sql/03_check_data.sql
       assert_sql postgres student query_lab "SELECT EXISTS (SELECT 1 FROM customers) AND EXISTS (SELECT 1 FROM orders) AND EXISTS (SELECT 1 FROM order_items)" "one or more SQL sample tables are empty";;
     02-partitioning-replication)
       need docker
       assert_sql primary lab engineering "SELECT EXISTS (SELECT 1 FROM sales_regular) AND EXISTS (SELECT 1 FROM sales_partitioned)" "one or more sales tables are empty"
       assert_sql primary lab engineering "SELECT NOT pg_is_in_recovery()" "primary is in recovery"
       assert_sql replica lab engineering "SELECT pg_is_in_recovery()" "replica is not in recovery"
       echo "Sales tables are nonempty; primary and replica report the expected roles.";;
     03-dwh-etl)
       need docker; psql_file postgres student dwh_etl_lab sql/03_verify.sql
       assert_sql postgres student dwh_etl_lab "SELECT EXISTS (SELECT 1 FROM src_schema.snowflake_raw) AND EXISTS (SELECT 1 FROM src_schema.dataiku_raw) AND EXISTS (SELECT 1 FROM dwh_schema.fact_usage)" "one or more source tables or the fact table are empty";;
     *) need python; python -m unittest discover -s tests -v;;
   esac ;;
 benchmark)
   case "$LAB" in
     02-partitioning-replication) python scripts/benchmark.py;;
     05-pagerank) python benchmark.py --nodes 1000 10000 --workers 2 --iterations 8 --trials 3;;
     06-tfidf) python benchmark.py --documents 100 1000 --workers 2 --trials 3;;
     *) echo "No benchmark configured for $LAB"; exit 2;;
   esac ;;
 health)
   echo "Lab: $LAB"; need python; python --version
   if [[ -f docker-compose.yml && "$LAB" != 06-tfidf ]]; then
     need docker
     docker compose ps
     case "$LAB" in
       01-relational-sql) services=(postgres); user=student; database=query_lab ;;
       02-partitioning-replication) services=(primary replica); user=lab; database=engineering ;;
       03-dwh-etl) services=(postgres); user=student; database=dwh_etl_lab ;;
     esac
     for service in "${services[@]}"; do
       if ! docker compose exec -T "$service" pg_isready -U "$user" -d "$database"; then
         echo "Health check failed: $service is not ready. Run the lab initializer or inspect docker compose logs." >&2
         exit 1
       fi
     done
   else echo "Docker is not required for the main lab."; fi ;;
 reset)
   echo "WARNING: reset deletes work and/or database state for $LAB."
   if [[ "${CONFIRM_RESET:-}" != "YES" ]]; then
     echo "To confirm: CONFIRM_RESET=YES make reset LAB=$LAB"; exit 2
   fi
   if [[ -f docker-compose.yml ]]; then need docker; docker compose down -v; else echo "No managed database to reset."; fi ;;
 *) echo "Unknown action: $ACTION"; exit 2 ;;
esac

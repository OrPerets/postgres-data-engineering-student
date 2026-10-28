"""Regression checks for student startup without requiring a Docker daemon."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InitializerTests(unittest.TestCase):
    def run_lab(self, lab, count, *, marker=False, adopt=False, fail_seed=False,
                fail_generator=False, dwh_count=None, documents=False):
        with tempfile.TemporaryDirectory() as tmp:
            docker = Path(tmp) / "docker"
            docker.write_text(
                '#!/bin/sh\n'
                'printf "%s\\n" "$*" >> "$MOCK_LOG"\n'
                'case "$*" in\n'
                '  *"SELECT count(*) FROM (VALUES"*"dwh_schema.reporting_scope"*) echo "$MOCK_DWH_COUNT";;\n'
                '  *"SELECT count(*) FROM (VALUES"*) echo "$MOCK_COUNT";;\n'
                '  *"to_regclass(\x27public.documents\x27)"*) echo "$MOCK_DOCUMENTS";;\n'
                '  *"to_regclass(\x27_lab_setup.completed\x27)"*) echo "$MOCK_MARKER";;\n'
                '  *"SELECT EXISTS (SELECT 1 FROM _lab_setup.completed"*) echo "$MOCK_MARKER";;\n'
                '  *"SELECT pg_is_in_recovery()"*) echo t;;\n'
                '  *"-d query_lab"*) if [ "$MOCK_FAIL_SEED" = 1 ] && [ "$#" -eq 12 ]; then\n'
                '    input=$(cat); case "$input" in *"Synthetic teaching dataset"*) exit 1;; esac; fi;;\n'
                'esac\n'
            )
            docker.chmod(0o755)
            python = Path(tmp) / "python"
            python.write_text(
                '#!/bin/sh\n'
                'printf "python %s\\n" "$*" >> "$MOCK_LOG"\n'
                'case "$*" in *"generate_sales.py"*) [ "$MOCK_FAIL_GENERATOR" != 1 ] || exit 1;; esac\n'
                'exit 0\n'
            )
            python.chmod(0o755)
            log = Path(tmp) / "calls"
            env = dict(os.environ, PATH=f"{tmp}:{os.environ['PATH']}",
                       MOCK_COUNT=str(count), MOCK_DWH_COUNT=str(count if dwh_count is None else dwh_count),
                       MOCK_DOCUMENTS='t' if documents else 'f', MOCK_LOG=str(log),
                       MOCK_MARKER='t' if marker else 'f',
                       MOCK_FAIL_SEED='1' if fail_seed else '0',
                       MOCK_FAIL_GENERATOR='1' if fail_generator else '0')
            if adopt:
                env['LAB_ADOPT_EXISTING'] = 'YES'
            else:
                env.pop('LAB_ADOPT_EXISTING', None)
            result = subprocess.run(["bash", "scripts/student-init.sh", lab], cwd=ROOT,
                                    env=env, text=True, capture_output=True)
            return result, log.read_text() if log.exists() else ""

    def test_partial_sql_schema_stops_before_loading(self):
        result, calls = self.run_lab("01-relational-sql", 1)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("partially initialized", result.stderr)
        self.assertNotIn("INSERT INTO _lab_setup.completed", calls)
        self.assertNotIn("-v ON_ERROR_STOP=1 -U student -d query_lab\n", calls)

    def test_fresh_sql_initialization_records_completion(self):
        result, calls = self.run_lab("01-relational-sql", 0)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(calls.count("-v ON_ERROR_STOP=1 -U student -d query_lab\n"), 3)
        self.assertIn("INSERT INTO _lab_setup.completed", calls)

    def test_unmarked_existing_sql_is_never_overwritten(self):
        result, calls = self.run_lab("01-relational-sql", 3)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("may predate markers or have an interrupted load", result.stderr)
        self.assertIn("LAB_ADOPT_EXISTING=YES make lab-sql", result.stderr)
        self.assertNotIn("INSERT INTO _lab_setup.completed", calls)
        self.assertNotIn("-v ON_ERROR_STOP=1 -U student -d query_lab\n", calls)

    def test_inspected_legacy_sql_can_be_adopted_without_reloading(self):
        result, calls = self.run_lab("01-relational-sql", 3, adopt=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("INSERT INTO _lab_setup.completed", calls)
        self.assertEqual(calls.count("-v ON_ERROR_STOP=1 -U student -d query_lab\n"), 1)

    def test_completed_existing_sql_is_preserved(self):
        result, calls = self.run_lab("01-relational-sql", 3, marker=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("INSERT INTO _lab_setup.completed", calls)
        self.assertEqual(calls.count("-v ON_ERROR_STOP=1 -U student -d query_lab\n"), 1)

    def test_marker_with_missing_tables_does_not_recreate_database(self):
        result, calls = self.run_lab("01-relational-sql", 0, marker=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("tables are missing", result.stderr)
        self.assertNotIn("-v ON_ERROR_STOP=1 -U student -d query_lab\n", calls)

    def test_failed_sql_seed_never_records_completion(self):
        result, calls = self.run_lab("01-relational-sql", 0, fail_seed=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("INSERT INTO _lab_setup.completed", calls)

    def test_interrupted_sales_load_never_records_completion(self):
        result, calls = self.run_lab("02-partitioning-replication", 0, fail_generator=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("generate_sales.py", calls)
        self.assertNotIn("INSERT INTO _lab_setup.completed", calls)

    def test_unmarked_existing_sales_stops_with_inspection_instructions(self):
        result, calls = self.run_lab("02-partitioning-replication", 5)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("SELECT count(*) FROM sales_regular", result.stderr)
        self.assertIn("LAB_ADOPT_EXISTING=YES make lab-partitions", result.stderr)
        self.assertNotIn("generate_sales.py", calls)

    def test_interrupted_dwh_load_is_not_continued_implicitly(self):
        result, calls = self.run_lab("03-dwh-etl", 5, dwh_count=0)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("objects are incomplete", result.stderr)
        self.assertNotIn("INSERT INTO _lab_setup.completed", calls)

    def test_unmarked_tfidf_table_requires_inspection(self):
        result, calls = self.run_lab("06-tfidf-sql", 0, documents=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("LAB_ADOPT_EXISTING=YES make lab-tfidf-sql", result.stderr)
        self.assertNotIn("INSERT INTO _lab_setup.completed", calls)

    def test_tfidf_python_starter_does_not_call_docker(self):
        result, calls = self.run_lab("06-tfidf", 0)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("compose", calls)


if __name__ == "__main__":
    unittest.main()

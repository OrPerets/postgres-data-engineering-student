"""Exercise the lab check exit statuses without a Docker daemon."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class LabCheckTests(unittest.TestCase):
    def run_check(self, lab, action, *, sql_result="t", ready=True):
        with tempfile.TemporaryDirectory() as tmp:
            docker = Path(tmp) / "docker"
            docker.write_text(
                '#!/bin/sh\n'
                'case "$*" in\n'
                '  *pg_isready*) [ "$MOCK_READY" = yes ] || exit 1 ;;\n'
                '  *" -c "*) printf "%s\\n" "$MOCK_SQL_RESULT" ;;\n'
                'esac\n'
            )
            docker.chmod(0o755)
            env = dict(os.environ, PATH=f"{tmp}:{os.environ['PATH']}",
                       MOCK_SQL_RESULT=sql_result, MOCK_READY="yes" if ready else "no")
            return subprocess.run(["bash", "scripts/lab.sh", lab, action], cwd=ROOT,
                                  env=env, text=True, capture_output=True)

    def test_sql_checks_fail_on_unsatisfied_invariant(self):
        for lab in ("01-relational-sql", "02-partitioning-replication", "03-dwh-etl"):
            with self.subTest(lab=lab):
                self.assertEqual(self.run_check(lab, "test").returncode, 0)
                result = self.run_check(lab, "test", sql_result="f")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Check failed", result.stderr)

    def test_health_fails_when_service_is_not_ready(self):
        self.assertEqual(self.run_check("02-partitioning-replication", "health").returncode, 0)
        result = self.run_check("02-partitioning-replication", "health", ready=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("not ready", result.stderr)


if __name__ == "__main__":
    unittest.main()

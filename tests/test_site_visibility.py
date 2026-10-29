"""Test published-site visibility, not access to the public source repository."""
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
STARTERS = {"01": "lab-sql", "02": "lab-partitions", "03": "lab-dwh",
            "04": "lab-mapreduce", "05": "lab-pagerank", "06": "lab-tfidf"}
SOURCE_PATHS = {"01": "01-relational-sql", "02": "02-partitioning-replication", "03": "03-dwh-etl",
                "04": "04-mapreduce", "05": "05-pagerank", "06": "06-tfidf"}
PAGES = {
    "01": "01-relational-sql",
    "02": "02-partitions-replicas",
    "03": "03-dwh-etl",
    "04": "04-mapreduce",
    "05": "05-pagerank",
    "06": "06-tfidf",
}


@unittest.skipUnless(importlib.util.find_spec("mkdocs") and importlib.util.find_spec("yaml"),
                     "Install requirements-docs.txt to run website build tests")
class SiteVisibilityTests(unittest.TestCase):
    def build(self, active):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            settings = path / "visibility.yml"
            settings.write_text("labs:\n" + "".join(f"  '{n}': {'true' if n in active else 'false'}\n" for n in PAGES))
            out = path / "site"
            result = subprocess.run([sys.executable, str(ROOT / "scripts/build_site.py"), "--settings", str(settings), "--site-dir", str(out)], cwd=ROOT, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            index = (out / "index.html").read_text()
            search = (out / "search/search_index.json").read_text()
            getting = (out / "getting-started/index.html").read_text()
            all_pages = "\n".join(p.read_text() for p in out.rglob("*.html")) + search
            practice_page = out / "activities" / "lab01-learning-pack" / "index.html"
            self.assertEqual(practice_page.exists(), "01" in active)
            if "01" not in active:
                self.assertNotIn("activities/lab01-learning-pack/", all_pages)
                self.assertFalse((out / "javascripts" / "lab01-quiz.js").exists())
            second_pack = out / "activities" / "lab02-learning-pack" / "index.html"
            self.assertEqual(second_pack.exists(), "02" in active)
            if "02" not in active:
                self.assertNotIn("activities/lab02-learning-pack/", all_pages)
                self.assertFalse((out / "javascripts" / "lab02-quiz.js").exists())
            for number, slug in PAGES.items():
                with self.subTest(number=number, active=active):
                    self.assertEqual((out / "labs" / slug / "index.html").exists(), number in active)
                    if number in active:
                        self.assertIn(f"labs/{slug}/", index)
                        self.assertIn(f"labs/{slug}/", search)
                    else:
                        self.assertNotIn(f"labs/{slug}/", all_pages)
                        self.assertNotIn(f"labs/{slug}.md", all_pages)
                        self.assertNotIn(f"labs/{SOURCE_PATHS[number]}", all_pages)
                        self.assertNotIn(f"make {STARTERS[number]}", getting)
            return index

    def test_only_first_workshop(self):
        index = self.build({"01"})
        self.assertIn("Lab 01", index)
        self.assertNotIn("Lab 02", index)

    def test_only_second_workshop(self):
        self.build({"02"})

    def test_all_workshops(self):
        self.build(set(PAGES))

    def test_non_adjacent_workshops(self):
        self.build({"02", "04"})

    def test_no_workshops(self):
        index = self.build(set())
        self.assertIn("No workshops are currently available", index)

    def test_invalid_settings_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            settings = Path(tmp) / "invalid.yml"
            settings.write_text("labs:\n  '01': true\n")
            result = subprocess.run([sys.executable, str(ROOT / "scripts/build_site.py"), "--settings", str(settings), "--site-dir", str(Path(tmp) / "site")], cwd=ROOT, text=True, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("quoted lab keys", result.stderr)


if __name__ == "__main__":
    unittest.main()

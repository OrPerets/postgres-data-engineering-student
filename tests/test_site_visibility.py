"""Test published-site visibility, not access to the public source repository."""
import importlib.util
from pathlib import Path
import re
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
            self.assertEqual((out / "start-lab01" / "index.html").exists(), "01" in active)
            self.assertEqual((out / "labs" / "01-window-functions" / "index.html").exists(), "01" in active)
            for chapter in ("01-tutorial-practice", "01-interview", "01-test-yourself"):
                self.assertEqual((out / "labs" / chapter / "index.html").exists(), "01" in active, chapter)
                if "01" not in active:
                    self.assertNotIn(f"labs/{chapter}/", all_pages)
            if "01" in active:
                lesson = (out / "labs" / "01-window-functions" / "index.html").read_text()
                quiz = (out / "labs" / "01-test-yourself" / "index.html").read_text()
                tutorial = (out / "labs" / "01-tutorial-practice" / "index.html").read_text()
                self.assertIn('id="lab01-practice"', tutorial)
                self.assertEqual(re.findall(r'<section\b[^>]*\bdata-question="(\d+)"', tutorial), [str(n) for n in range(1, 16)])
                self.assertEqual(len(re.findall(r'<textarea\b[^>]*\bdata-sql(?:\s|=|>)', tutorial)), 15)
                self.assertEqual(len(re.findall(r'<button\b[^>]*\bdata-run(?:\s|=|>)', tutorial)), 15)
                self.assertIn('id="lab01-practice-quiz"', quiz)
                for mount in ("lab01-window-ranking", "lab01-window-lag", "lab01-window-frame"):
                    self.assertIn(f'id="{mount}"', lesson)
                for family in ("aggregate", "ranking", "offsets", "values", "distribution"):
                    self.assertIn(f'data-window-family="{family}"', lesson)
                self.assertIn('class="mkdocs-h5p"', lesson)
                self.assertIn('../../assets/h5p-player/main.bundle.js', lesson)
                self.assertTrue((out / "assets/h5p/lab01-window-partitions.h5p").is_file())
                self.assertTrue(list((out / "assets/h5p-content").glob("lab01-window-partitions-*/h5p.json")))
                self.assertTrue((out / "assets" / "h5p-player" / "main.bundle.js").is_file())
                frame_style = out / "assets/h5p-player/styles/h5p.css"
                self.assertIn("course-theme.css", frame_style.read_text())
                self.assertTrue((frame_style.parent / "course-theme.css").is_file())
            else:
                self.assertFalse((out / "assets/h5p/lab01-window-partitions.h5p").exists())
                self.assertFalse(list((out / "assets/h5p-content").glob("lab01-window-partitions-*")))
                self.assertFalse((out / "assets/lab01-practice").exists())
            for asset in ("javascripts/lab01-window-frame.js", "javascripts/lab01-window-rank-lag.js",
                          "javascripts/lab01-family-aggregate.js", "javascripts/lab01-family-ranking.js",
                          "javascripts/lab01-family-navigation.js", "javascripts/lab01-function-explorer.js",
                          "javascripts/lab01-practice.js", "javascripts/lab01-practice-worker.js",
                          "stylesheets/lab01-window-frame.css", "stylesheets/lab01-window-rank-lag.css",
                          "stylesheets/lab01-practice.css", "assets/lab01-practice/schema.sql", "assets/lab01-practice/seed.sql"):
                self.assertEqual((out / asset).exists(), "01" in active, asset)
                if "01" not in active:
                    self.assertNotIn(asset, all_pages)
            if "01" not in active:
                self.assertNotIn("start-lab01/", all_pages)
                self.assertNotIn("labs/01-window-functions/", all_pages)
                self.assertFalse((out / "images" / "setup" / "01-github-codespaces.png").exists())
            practice_page = out / "activities" / "lab01-learning-pack" / "index.html"
            self.assertEqual(practice_page.exists(), "01" in active)
            for asset in ("javascripts/lab01-null.js", "stylesheets/lab01-null.css"):
                self.assertEqual((out / asset).exists(), "01" in active, asset)
                if "01" not in active:
                    self.assertNotIn(asset, all_pages)
            if "01" in active:
                self.assertIn('id="lab01-null-explorer"', practice_page.read_text())
            if "01" not in active:
                self.assertNotIn("activities/lab01-learning-pack/", all_pages)
                self.assertFalse((out / "javascripts" / "lab01-quiz.js").exists())
            second_pack = out / "activities" / "lab02-learning-pack" / "index.html"
            self.assertEqual(second_pack.exists(), "02" in active)
            for asset in ("javascripts/lab02-months.js", "stylesheets/lab02-months.css"):
                self.assertEqual((out / asset).exists(), "02" in active, asset)
                if "02" not in active:
                    self.assertNotIn(asset, all_pages)
            if "02" in active:
                self.assertIn('id="lab02-months-explorer"', second_pack.read_text())
            if "02" not in active:
                self.assertNotIn("activities/lab02-learning-pack/", all_pages)
                self.assertFalse((out / "javascripts" / "lab02-quiz.js").exists())
            for number in ("03", "04", "05", "06"):
                practice = out / "activities" / f"lab{number}-learning-pack" / "index.html"
                self.assertEqual(practice.exists(), number in active)
                if number not in active:
                    self.assertNotIn(f"activities/lab{number}-learning-pack/", all_pages)
                    self.assertFalse((out / "javascripts" / f"lab{number}-pack.js").exists())
            for asset in ("javascripts/lab04-mean.js", "stylesheets/lab04-mean.css",
                          "javascripts/lab04-variance.js", "stylesheets/lab04-variance.css"):
                self.assertEqual((out / asset).exists(), "04" in active, asset)
                if "04" not in active:
                    self.assertNotIn(asset, all_pages)
            if "04" in active:
                self.assertIn('id="lab04-variance-explorer"', (out / "labs" / "04-mapreduce" / "index.html").read_text())
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
        for number in ("02", "03", "04", "05", "06"):
            self.assertIn(f"Lab {number}", index)
        self.assertEqual(index.count('class="course-lab-status"'), 5)
        self.assertEqual(index.count('class="course-lab-disabled"'), 5)

    def test_browser_practice_uses_lab_schema_and_seed(self):
        lab = ROOT / "labs/01-relational-sql/sql"
        browser = ROOT / "docs/gitbook/assets/lab01-practice"
        for source, copy in (("01_schema.sql", "schema.sql"), ("02_seed.sql", "seed.sql")):
            self.assertEqual((lab / source).read_bytes(), (browser / copy).read_bytes(), copy)

    def test_only_second_workshop(self):
        self.build({"02"})

    def test_only_sixth_workshop(self):
        self.build({"06"})

    def test_each_middle_workshop_by_itself(self):
        for number in ("03", "04", "05"):
            with self.subTest(number=number):
                self.build({number})

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

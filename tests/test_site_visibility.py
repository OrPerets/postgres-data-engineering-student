"""Test published-site visibility, not access to the public source repository."""
import importlib.util
import html
import hashlib
from html.parser import HTMLParser
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


class PracticeStructure(HTMLParser):
    """Inspect actual HTML nesting so a successful build cannot hide broken UI."""

    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
            'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.active = False
        self.stack = []
        self.errors = []
        self.tables = []
        self.questions = []
        self.controls = {}

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        classes = attrs.get('class', '').split()
        if not self.active:
            if 'lab01-practice-layout' not in classes:
                return
            self.active = True
        ancestors = [item[1] for item in self.stack]
        if 'data-reference-table' in attrs:
            table = attrs['data-reference-table']
            self.tables.append(table)
            if not any('lab01-reference' in item.get('class', '').split() for item in ancestors):
                self.errors.append(f'{table} is outside its sidebar')
            self.controls[table] = set()
        if 'data-question' in attrs:
            self.questions.append(attrs['data-question'])
            if not any('lab01-practice-questions' in item.get('class', '').split() for item in ancestors):
                self.errors.append(f"Question {attrs['data-question']} is outside the practice layout")
        if any(key in attrs for key in ('data-sample', 'data-view-all', 'data-reference-status', 'data-reference-result')):
            table = next((item['data-reference-table'] for item in reversed(ancestors) if 'data-reference-table' in item), None)
            if table is None:
                self.errors.append('Reference control is outside its table')
            else:
                self.controls[table].update(key for key in ('data-sample', 'data-view-all', 'data-reference-status', 'data-reference-result') if key in attrs)
        if tag not in self.VOID:
            self.stack.append((tag, attrs))

    def handle_startendtag(self, tag, attributes):
        self.handle_starttag(tag, attributes)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.active:
            return
        if not self.stack or self.stack[-1][0] != tag:
            self.errors.append(f'Unexpected closing {tag}')
            return
        self.stack.pop()
        if not self.stack:
            self.active = False

    def handle_data(self, data):
        if self.active and any(marker in data for marker in ('<div data-reference', '<p data-reference', '<section data-question')):
            self.errors.append('Reference HTML was displayed as text')


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
                docs = ROOT / "docs/gitbook"
                script_digest = hashlib.sha256(
                    (docs / "javascripts/lab01-practice.js").read_bytes()
                    + (docs / "javascripts/lab01-practice-worker.js").read_bytes()
                ).hexdigest()[:12]
                style_digest = hashlib.sha256((docs / "stylesheets/lab01-practice.css").read_bytes()).hexdigest()[:12]
                self.assertIn(f'javascripts/lab01-practice.js?v={script_digest}', tutorial)
                self.assertIn(f'stylesheets/lab01-practice.css?v={style_digest}', tutorial)
                self.assertIn('id="lab01-practice"', tutorial)
                self.assertEqual(re.findall(r'<section\b[^>]*\bdata-question="(\d+)"', tutorial), [str(n) for n in range(1, 16)])
                self.assertEqual(len(re.findall(r'<textarea\b[^>]*\bdata-sql(?:\s|=|>)', tutorial)), 15)
                self.assertEqual(len(re.findall(r'<button\b[^>]*\bdata-run(?:\s|=|>)', tutorial)), 15)
                structure = PracticeStructure()
                structure.feed(tutorial)
                self.assertEqual(structure.errors, [])
                self.assertEqual(structure.tables, ['customers', 'orders', 'order_items'])
                self.assertEqual(structure.questions, [str(n) for n in range(1, 16)])
                for table in structure.tables:
                    self.assertEqual(structure.controls[table], {'data-sample', 'data-view-all', 'data-reference-status', 'data-reference-result'}, table)
                # Students can find each table's schema and explicitly choose
                # a sample or full table; the static schema remains useful
                # when JavaScript is unavailable.
                references = dict(re.findall(r'<details\s+data-reference-table="([^"]+)"[^>]*>(.*?)</details>', tutorial, re.DOTALL))
                self.assertEqual(set(references), {'customers', 'orders', 'order_items'})
                columns = {
                    'customers': [('customer_id', 'integer · PK · required'), ('full_name', 'varchar(120) · required'), ('city', 'varchar(80) · nullable')],
                    'orders': [('order_id', 'integer · PK · required'), ('customer_id', 'integer · FK → customers.customer_id · required'), ('order_date', 'date · required'), ('status', 'varchar(20) · required')],
                    'order_items': [('order_id', 'integer · PK, FK → orders.order_id · required'), ('line_no', 'integer · PK · required'), ('product_name', 'text · required'), ('category', 'text · required'), ('quantity', 'integer · required'), ('unit_price', 'numeric(12,2) · required'), ('discount_pct', 'numeric(5,2) · nullable')],
                }
                for table, content in references.items():
                    actual = [(html.unescape(name), html.unescape(info)) for name, info in re.findall(r'<li>\s*<code>([^<]+)</code>\s*<span>([^<]+)</span>\s*</li>', content)]
                    self.assertEqual(actual, columns[table], table)
                    self.assertIn(f'data-sample="{table}"', content)
                    self.assertIn(f'data-view-all="{table}"', content)
                    self.assertIn('data-reference-result', content)
                    self.assertRegex(content, r'data-reference-status[^>]+role="status"')
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

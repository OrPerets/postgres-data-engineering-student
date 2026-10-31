"""Check the teaching model and dependencies in the static H5P activity."""
import json
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / 'docs/gitbook/assets/h5p/lab01-window-partitions.h5p'
CONTENT = ROOT / 'labs/01-relational-sql/windows/h5p/content.json'


class WindowActivityTests(unittest.TestCase):
    def test_frame_answer_matches_order_positions_and_source(self):
        with zipfile.ZipFile(PACKAGE) as package:
            content = json.loads(package.read('content/content.json'))
            self.assertEqual(content, json.loads(CONTENT.read_text(encoding='utf-8')))
            orders = [101, 102, 103, 104, 134]
            current = orders.index(104)
            expected = {f'<div>Order {order}</div>' for order in orders[max(0, current - 2):current + 1]}
            actual = {answer['text'] for answer in content['answers'] if answer['correct']}
            self.assertEqual(actual, expected)

    def test_runtime_dependencies_are_packaged(self):
        with zipfile.ZipFile(PACKAGE) as package:
            manifest = json.loads(package.read('h5p.json'))
            for dep in manifest['preloadedDependencies']:
                library = f"{dep['machineName']}-{dep['majorVersion']}.{dep['minorVersion']}/library.json"
                self.assertIn(library, package.namelist())


if __name__ == '__main__':
    unittest.main()

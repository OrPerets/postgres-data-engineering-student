"""Contract and persistence checks; these tests do not need Docker or PostgreSQL."""
import importlib.util
import json
import sys
import tempfile
import threading
import types
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

FILE = Path(__file__).resolve().parents[1] / 'server.py'
spec = importlib.util.spec_from_file_location('lab01_workspace_server', FILE)
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class WorkspaceTests(unittest.TestCase):
    def test_schema_maps_each_foreign_key_to_its_own_column(self):
        recorded = {}
        rows = [
            (b'customers', b'customer_id', b'integer', False, True, None, None, None),
            (b'customers', b'city', b'character varying(80)', True, False, None, None, None),
            (b'orders', b'customer_id', b'integer', False, False, b'public', b'customers', b'customer_id'),
            (b'order_items', b'order_id', b'integer', False, True, b'public', b'orders', b'order_id'),
            (b'order_items', b'line_no', b'integer', False, True, None, None, None),
            (b'order_items', b'discount_pct', b'numeric(5,2)', True, False, None, None, None),
        ]
        class Cursor:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def execute(self, query, params): recorded['query'] = query; recorded['params'] = params
            def fetchall(self): return rows
        class Connection:
            read_only = None
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def cursor(self): return Cursor()
            def rollback(self): recorded['rollback'] = True
        connection = Connection()
        def connect(**kwargs): recorded['connect'] = kwargs; return connection
        fake = types.SimpleNamespace(connect=connect, OperationalError=type('OperationalError',(Exception,),{}), Error=type('Error',(Exception,),{}))
        with patch.dict(sys.modules, {'psycopg': fake}):
            result = server.load_schema()
        self.assertTrue(connection.read_only)
        self.assertIn('statement_timeout=7000', recorded['connect']['options'])
        self.assertEqual(recorded['params'], (list(server.SCHEMA_TABLES), list(server.SCHEMA_TABLES)))
        self.assertIn('unnest(fk.conkey, fk.confkey)', recorded['query'])
        self.assertTrue(recorded['rollback'])
        tables = {table['name']: {col['name']: col for col in table['columns']} for table in result['tables']}
        self.assertTrue(tables['customers']['city']['nullable'])
        self.assertEqual(tables['customers']['city']['type'], 'character varying(80)')
        self.assertEqual(tables['orders']['customer_id']['references'], [{'schema':'public','table':'customers','column':'customer_id'}])
        self.assertTrue(tables['order_items']['order_id']['primary_key'])
        self.assertEqual(tables['order_items']['order_id']['references'][0]['column'], 'order_id')
        self.assertTrue(tables['order_items']['line_no']['primary_key'])
        self.assertEqual(tables['order_items']['line_no']['references'], [])
        self.assertEqual(tables['order_items']['discount_pct']['type'], 'numeric(5,2)')

    def test_questions_come_from_source_and_include_supplied_sql(self):
        questions = server.questions_from_worksheet()
        self.assertEqual([item['id'] for item in questions], list(range(1, 16)))
        self.assertIn('Display up to five orders from January 2026', questions[0]['question'])
        self.assertIn('SELECT c.customer_id, COUNT(*) AS completed_orders,', questions[5]['question'])
        self.assertIn('LEFT JOIN order_items', questions[5]['question'])
        self.assertIn('WHERE city NOT IN (', questions[6]['question'])
        self.assertIn('WHERE filter', questions[5]['hint'])
        self.assertTrue(all(question['hint'] for question in questions))

    def test_save_load_unicode_and_corrupt_file_protection(self):
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / 'data' / 'answers.json'
            server.save_answers({'1': "SELECT 'שלום';"}, destination)
            self.assertEqual(server.load_answers(destination), {'1': "SELECT 'שלום';"})
            destination.write_text('{broken', encoding='utf-8')
            with self.assertRaises(RuntimeError):
                server.load_answers(destination)
            self.assertEqual(destination.read_text(encoding='utf-8'), '{broken')

    def test_invalid_answers_rejected(self):
        for data in ({'answers': {'0': 'SELECT 1'}}, {'answers': {'1': 1}},
                     {'answers': {'1': 'a' * (server.MAX_SQL + 1)}}, {'answers': {}, 'extra': 1}):
            with self.subTest(data=str(data)[:50]), self.assertRaises(ValueError):
                server.validate_answers(data)

    def test_query_uses_readonly_transaction_single_statement_protocol_and_row_cap(self):
        recorded = {}
        class Cursor:
            description = [types.SimpleNamespace(name='value')]
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def execute(self, *args, **kwargs): recorded['execute'] = (args, kwargs)
            def fetchmany(self, count):
                recorded['fetchmany'] = count
                return [(i,) for i in range(count)]
        class Connection:
            read_only = None
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def cursor(self): return Cursor()
            def rollback(self): recorded['rollback'] = True
        connection = Connection()
        def connect(**kwargs): recorded['connect'] = kwargs; return connection
        fake = types.SimpleNamespace(connect=connect, OperationalError=type('OperationalError',(Exception,),{}), Error=type('Error',(Exception,),{}))
        with patch.dict(sys.modules, {'psycopg': fake}):
            result = server.query_database('EXPLAIN SELECT 1')
        self.assertTrue(connection.read_only)
        self.assertIn('statement_timeout=7000', recorded['connect']['options'])
        self.assertEqual(recorded['execute'], (('EXPLAIN SELECT 1', ()), {'prepare': False, 'binary': True}))
        self.assertTrue(recorded['rollback'])
        self.assertEqual(len(result['rows']), server.MAX_ROWS)
        self.assertTrue(result['truncated'])

        with patch.dict(sys.modules, {'psycopg': fake}):
            server.query_database("SELECT 5 % 2, 'x' LIKE '%x%'")
        self.assertEqual(recorded['execute'][0][0], "SELECT 5 %% 2, 'x' LIKE '%%x%%'")
        self.assertEqual(server._cell(float('nan')), 'nan')
        self.assertEqual(server._cell(float('inf')), 'inf')
        self.assertEqual(server._cell(b'Haifa'), 'Haifa')
        self.assertEqual(server._cell('שלום'.encode('utf-8')), 'שלום')
        self.assertEqual(server._cell(b'\xff'), '\\xff')


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http = ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.thread.join()
        cls.http.server_close()

    def request(self, method, path, body=None, headers=None):
        conn = HTTPConnection('127.0.0.1', self.http.server_port, timeout=3)
        conn.request(method, path, body=body, headers=headers or {})
        response = conn.getresponse()
        data = response.read()
        status = response.status
        conn.close()
        return status, data

    def test_questions_endpoint_and_unknown_file(self):
        status, payload = self.request('GET', '/api/questions')
        self.assertEqual(status, 200)
        self.assertEqual(len(json.loads(payload)['questions']), 15)
        self.assertEqual(self.request('GET', '/server.py')[0], 404)
        self.assertEqual(self.request('GET', '/../sql/student_answers.sql')[0], 404)

    def test_form_requests_cannot_write_or_execute(self):
        for method, route in [('PUT', '/api/answers'), ('POST', '/api/query')]:
            status, body = self.request(method, route, b'{}', {'Content-Type': 'text/plain'})
            self.assertEqual(status, 400)
            self.assertIn('application/json', json.loads(body)['error'])

    def test_errors_are_json_for_friendly_display(self):
        with patch.object(server, 'query_database', side_effect=RuntimeError('Database is offline.')):
            status, body = self.request('POST', '/api/query', json.dumps({'sql':'SELECT 1'}),
                                        {'Content-Type': 'application/json'})
        self.assertEqual(status, 503)
        self.assertEqual(json.loads(body)['error'], 'Database is offline.')

    def test_schema_endpoint_returns_data_and_graceful_offline_error(self):
        payload = {'tables': [{'name': 'customers', 'columns': []}]}
        with patch.object(server, 'load_schema', return_value=payload):
            status, body = self.request('GET', '/api/schema')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), payload)
        with patch.object(server, 'load_schema', side_effect=RuntimeError('Database is offline.')):
            status, body = self.request('GET', '/api/schema')
        self.assertEqual(status, 503)
        self.assertEqual(json.loads(body)['error'], 'Database is offline.')

    def test_stale_tab_cannot_overwrite_new_answers(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'answers.json'
            # Store originals before patching; wrappers call these directly.
            original_load, original_save = server.load_answers, server.save_answers
            with patch.object(server, 'load_answers', side_effect=lambda: original_load(path)), \
                 patch.object(server, 'save_answers', side_effect=lambda answers: original_save(answers, path)):
                status, payload = self.request('GET', '/api/answers')
                revision = json.loads(payload)['revision']
                request = lambda answers: self.request('PUT', '/api/answers',
                    json.dumps({'answers': answers, 'revision': revision}),
                    {'Content-Type': 'application/json'})
                self.assertEqual(request({'1': 'SELECT 1;'})[0], 200)
                status, body = request({'1': 'SELECT 2;'})
                self.assertEqual(status, 409)
                self.assertIn('not overwritten', json.loads(body)['error'])
                self.assertEqual(original_load(path), {'1': 'SELECT 1;'})

if __name__ == '__main__':
    unittest.main()

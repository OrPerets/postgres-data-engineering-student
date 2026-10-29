"""Lab 02 workspace contracts: no external database or Codespace required."""
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
spec = importlib.util.spec_from_file_location('lab02_workspace_server', FILE)
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class Cursor:
    def __init__(self, conn):
        self.conn = conn
        self.description = [types.SimpleNamespace(name='value')]
        self.rowcount = 1
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def execute(self, sql, *args, **kwargs):
        self.conn.executed.append((sql, args, kwargs))
        if sql == 'DELETE FROM forbidden': raise FakeError('read-only standby')
    def fetchone(self): return (self.conn.recovery,)
    def fetchmany(self, count): return [(i,) for i in range(count)]

class Connection:
    def __init__(self, recovery):
        self.recovery = recovery
        self.read_only = 'unset'
        self.executed = []
        self.commits = 0
        self.rollbacks = 0
        self.closed = False
    def cursor(self): return Cursor(self)
    def __enter__(self): return self
    def __exit__(self, *args): self.closed = True
    def close(self): self.closed = True
    def commit(self): self.commits += 1
    def rollback(self): self.rollbacks += 1

class FakeError(Exception): pass
class FakeOperationalError(FakeError): pass

class WorkspaceTests(unittest.TestCase):
    def test_questions_use_full_assignment_and_hints(self):
        questions = server.questions_from_assignment()
        self.assertEqual([q['id'] for q in questions], list(server.QUESTION_IDS))
        self.assertEqual(len(questions), 20)
        self.assertTrue(all(q['hint'] for q in questions))
        self.assertIn('12 partitions', next(q['question'] for q in questions if q['id'] == 'A4'))
        self.assertIn('architecture', questions[-1]['question'])

    def test_validate_and_preserve_answers(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'answers.json'
            server.save_answers({'A1': 'SELECT 1;', 'D2': '-- explanation'}, path)
            self.assertEqual(server.load_answers(path), {'A1': 'SELECT 1;', 'D2': '-- explanation'})
            path.write_text('{broken')
            with self.assertRaises(RuntimeError): server.load_answers(path)
            self.assertEqual(path.read_text(), '{broken')
        for answers in ({'A0': 'x'}, {'C8': 'x'}, {'A1': 7}):
            with self.assertRaises(ValueError): server.validate_answers({'answers': answers})

    def test_target_role_is_verified_before_any_user_sql(self):
        conn = Connection(True)
        fake = types.SimpleNamespace(connect=lambda **kwargs: conn, Error=FakeError, OperationalError=FakeOperationalError)
        with patch.dict(sys.modules, {'psycopg': fake}):
            with self.assertRaisesRegex(RuntimeError, 'unexpected server role'):
                server._connect('primary', readonly=True)
        self.assertTrue(conn.closed)
        self.assertEqual([sql for sql, _, _ in conn.executed], ['SELECT pg_is_in_recovery()'])

    def test_read_commit_and_replica_modes(self):
        for target, mode, recovery, readonly, committed in [
            ('primary', 'read', False, True, False),
            ('primary', 'commit', False, False, True),
            ('replica', 'read', True, None, False),
        ]:
            with self.subTest(target=target, mode=mode):
                conn = Connection(recovery)
                seen = {}
                def connect(**kwargs): seen.update(kwargs); return conn
                fake = types.SimpleNamespace(connect=connect, Error=FakeError, OperationalError=FakeOperationalError)
                with patch.dict(sys.modules, {'psycopg': fake}):
                    result = server.query_database("SELECT 5 % 2", target, mode)
                self.assertEqual(seen['port'], server.TARGETS[target])
                self.assertEqual(conn.read_only, readonly)
                self.assertEqual(conn.executed[-1], ('SELECT 5 %% 2', ((),), {'prepare': False, 'binary': True}))
                self.assertEqual(conn.commits, int(committed))
                self.assertEqual(conn.rollbacks, int(not committed))
                self.assertEqual(result['committed'], committed)
                self.assertEqual(result['target'], target)
                self.assertEqual(len(result['rows']), 200)
                self.assertTrue(result['truncated'])

    def test_replica_write_reaches_actual_server_error(self):
        conn = Connection(True)
        fake = types.SimpleNamespace(connect=lambda **kwargs: conn, Error=FakeError, OperationalError=FakeOperationalError)
        with patch.dict(sys.modules, {'psycopg': fake}):
            with self.assertRaisesRegex(ValueError, 'read-only standby'):
                server.query_database('DELETE FROM forbidden', 'replica', 'read')
        self.assertIsNone(conn.read_only)
        self.assertTrue(conn.closed)
        with self.assertRaisesRegex(ValueError, 'Replica'):
            server.query_database('SELECT 1', 'replica', 'commit')
        with self.assertRaises(ValueError): server.query_database('SELECT 1', [], 'read')

class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http = ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown(); cls.thread.join(); cls.http.server_close()
    def request(self, method, path, body=None, headers=None):
        conn = HTTPConnection('127.0.0.1', self.http.server_port, timeout=3)
        conn.request(method, path, body=body, headers=headers or {})
        response = conn.getresponse(); data = response.read(); status = response.status; conn.close()
        return status, data
    def test_http_contract_and_json_requirement(self):
        self.assertEqual(len(json.loads(self.request('GET','/api/questions')[1])['questions']), 20)
        self.assertEqual(self.request('GET','/server.py')[0], 404)
        self.assertEqual(self.request('GET','/api/schema?target=other')[0], 400)
        self.assertEqual(self.request('POST','/api/query', b'{}', {'Content-Type':'text/plain'})[0], 400)
        with patch.object(server, 'query_database', side_effect=RuntimeError('Primary offline')):
            status, body = self.request('POST','/api/query', json.dumps({'sql':'select 1','target':'primary','mode':'read'}), {'Content-Type':'application/json'})
        self.assertEqual(status, 503); self.assertEqual(json.loads(body)['error'], 'Primary offline')
    def test_stale_tab_never_overwrites(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'answers.json'
            original_load, original_save = server.load_answers, server.save_answers
            with patch.object(server, 'load_answers', side_effect=lambda: original_load(path)), patch.object(server, 'save_answers', side_effect=lambda answers: original_save(answers,path)):
                rev = json.loads(self.request('GET','/api/answers')[1])['revision']
                def put(value): return self.request('PUT','/api/answers',json.dumps({'answers':{'A1':value},'revision':rev}),{'Content-Type':'application/json'})
                self.assertEqual(put('SELECT 1;')[0], 200)
                self.assertEqual(put('SELECT 2;')[0], 409)
                self.assertEqual(original_load(path), {'A1':'SELECT 1;'})

if __name__ == '__main__': unittest.main()

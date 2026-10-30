"""Workspaces preserve student files and run real course checks on a temporary copy."""
import importlib.util, json, shutil, subprocess, tempfile, threading, types, unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

FILE = Path(__file__).resolve().parents[1] / 'server.py'
spec = importlib.util.spec_from_file_location('python_workspace', FILE)
server = importlib.util.module_from_spec(spec); spec.loader.exec_module(server)

class WorkspaceTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node.js is required for browser CSV export checks')
    def test_sql_csv_download_handler(self):
        result = subprocess.run(['node', '--test', str(Path(__file__).with_name('test_csv_export.cjs'))],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
    def test_assignment_and_hints(self):
        tasks = server.task_list()
        expected = 14 if server.NUMBER == '05' else 13
        self.assertEqual([t['id'] for t in tasks], list(range(1, expected+1)))
        self.assertTrue(all(t['hint'] for t in tasks))
        if server.NUMBER == '06':
            self.assertIn('PostgreSQL', tasks[7]['question'])
            self.assertIn('D1–D4 corpus', tasks[6]['question'])
            self.assertIn('natural log', tasks[6]['question'])
        else:
            self.assertIn('G={A:[B,C],B:[C],C:[A],D:[]}', tasks[6]['question'])
            self.assertIn('Predict results', tasks[6]['question'])
    def test_initial_file_and_separate_atomic_draft(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/'student_tasks.py'; source.write_text('my existing work', encoding='utf-8')
            draft=Path(tmp)/'data'/'answers.json'
            with patch.object(server,'STARTER',source):
                self.assertEqual(server.load_draft(draft)['source'], 'my existing work')
                state={'source':'edited Python', 'sql':'SELECT 1;', 'notes':{'1':'my reasoning'}, 'scratch':'print(42)'}
                server.save_draft(state,draft)
                self.assertEqual(server.load_draft(draft), state)
                self.assertEqual(source.read_text(), 'my existing work')
                draft.write_text('{invalid')
                with self.assertRaises(RuntimeError): server.load_draft(draft)
                self.assertEqual(draft.read_text(), '{invalid')
    def test_demo_runs_and_student_tests_use_unsaved_editor_copy(self):
        original = server.STARTER.read_bytes()
        reference = server.run_tests(original.decode(), 'demo')
        self.assertEqual(reference['exit_code'], 0, reference['output'])
        source = 'raise RuntimeError("WORKSPACE_PROBE")\n' + original.decode()
        result = server.run_tests(source, 'all')
        self.assertNotEqual(result['exit_code'], 0)
        self.assertIn('WORKSPACE_PROBE', result['output'])
        self.assertEqual(server.STARTER.read_bytes(), original)
    def test_scratchpad_uses_current_edited_source_without_overwriting(self):
        original = server.STARTER.read_bytes()
        source = original.decode() + '\n\ndef workspace_probe(): return 42\n'
        module = 'pagerank_demo' if server.NUMBER == '05' else 'tfidf_demo'
        scratch = 'import ' + module + '\nfrom student_tasks import workspace_probe\nprint("VALUE", workspace_probe())\n'
        result = server.run_example(source, scratch)
        self.assertEqual(result['exit_code'], 0, result['output'])
        self.assertIn('VALUE 42', result['output'])
        self.assertEqual(server.STARTER.read_bytes(), original)
        with self.assertRaises(ValueError): server.run_example(source, '   ')
    def test_nonterminating_student_code_is_stopped(self):
        with patch.object(server, 'TEST_TIMEOUT', 0.5):
            result = server.run_tests('while True: pass\n', 'all')
        self.assertTrue(result['timed_out'])
        self.assertNotEqual(result['exit_code'], 0)
    def test_validation_rejects_invalid_input(self):
        with self.assertRaises(ValueError): server.validate({'source': 'ok'})
        with self.assertRaises(ValueError): server.run_tests('pass', 'other')
        with self.assertRaises(ValueError): server.validate({'source':'', 'sql':'', 'notes':{'999':'wrong task'}})
        self.assertEqual(server.validate({'source':'old draft', 'sql':''})['notes'], {})
        self.assertEqual(server.validate({'source':'old draft', 'sql':''})['scratch'], '')
    def test_sql_cells_and_scope(self):
        self.assertEqual(server._cell('שלום'.encode()), 'שלום')
        self.assertEqual(server._cell(float('nan')), 'nan')
        if server.NUMBER=='05':
            with self.assertRaises(ValueError): server.run_sql('SELECT 1')

class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http=ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls): cls.http.shutdown(); cls.thread.join(); cls.http.server_close()
    def call(self,method,path,body=None,headers=None):
        c=HTTPConnection('127.0.0.1',self.http.server_port,timeout=3);c.request(method,path,body,headers or {});r=c.getresponse();data=r.read();status=r.status;c.close();return status,data
    def test_stale_save_never_overwrites(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(server,'DRAFT',Path(tmp)/'draft.json'):
                status,raw=self.call('GET','/api/state');self.assertEqual(status,200);first=json.loads(raw);rev=first['revision']
                def save(value):return self.call('PUT','/api/state',json.dumps({'state':{'source':value,'sql':''},'revision':rev}),{'Content-Type':'application/json'})
                self.assertEqual(save('first')[0],200);self.assertEqual(save('second')[0],409)
                self.assertEqual(server.load_draft()['source'],'first')
    def test_json_required_and_no_private_file_access(self):
        self.assertEqual(self.call('POST','/api/test',b'{}',{'Content-Type':'text/plain'})[0],400)
        self.assertEqual(self.call('GET','/server.py')[0],404)
if __name__=='__main__': unittest.main()

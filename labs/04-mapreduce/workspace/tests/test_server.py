"""Workspace persistence and test execution; uses only isolated temporary files."""
import importlib.util
import json
import tempfile
import threading
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

FILE = Path(__file__).resolve().parents[1] / 'server.py'
spec = importlib.util.spec_from_file_location('lab04_workspace', FILE)
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class WorkspaceTests(unittest.TestCase):
    def test_assignment_questions_and_hints(self):
        q = server.questions()
        self.assertEqual([x['id'] for x in q], list(range(1, 12)))
        self.assertTrue(all(x['hint'] for x in q))
        self.assertIn('word_mapper', q[3]['question'])

    def test_original_code_loaded_when_no_workspace_draft(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/'student_tasks.py'; source.write_text('MY_EXISTING_ANSWER = 17\n')
            with patch.object(server,'SOURCE',source), patch.object(server,'DRAFT',Path(tmp)/'draft.json'):
                self.assertEqual(server.load()['code'], 'MY_EXISTING_ANSWER = 17\n')

    def test_run_uses_draft_and_does_not_overwrite_original(self):
        with tempfile.TemporaryDirectory() as tmp:
            lab=Path(tmp); (lab/'tests').mkdir(); (lab/'student_tasks.py').write_text('value = "original"\n')
            (lab/'mapreduce_demo.py').write_text('# demo\n'); (lab/'tests/test_own.py').write_text('import unittest\nimport student_tasks\nclass T(unittest.TestCase):\n def test_value(self): self.assertEqual(student_tasks.value, "draft")\n')
            with patch.object(server,'LAB',lab): result=server.run_tests('value = "draft"\n')
            self.assertEqual(result['exit_code'],0); self.assertIn('OK',result['output']); self.assertFalse(result['timed_out'])
            self.assertEqual((lab/'student_tasks.py').read_text(), 'value = "original"\n')

    def test_scratch_runs_against_draft_and_demo_without_touching_original(self):
        with tempfile.TemporaryDirectory() as tmp:
            lab=Path(tmp); (lab/'tests').mkdir(); (lab/'student_tasks.py').write_text('value = "original"\n')
            (lab/'mapreduce_demo.py').write_text('def reducers(n): return n * 2\n')
            with patch.object(server,'LAB',lab):
                result=server.run_example('value = "draft"\n', 'from student_tasks import value\nfrom mapreduce_demo import reducers\nprint(value, reducers(3))\n')
            self.assertEqual(result['exit_code'], 0); self.assertEqual(result['output'].strip(), 'draft 6')
            self.assertEqual((lab/'student_tasks.py').read_text(), 'value = "original"\n')

    def test_old_draft_loads_with_empty_scratch_and_scratch_roundtrips(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest=Path(tmp)/'answers.json'; dest.write_text(json.dumps({'code':'value = 1', 'notes':{'1':'trace'}}))
            with patch.object(server,'DRAFT',dest):
                draft=server.load(); self.assertEqual(draft['scratch'], '')
                draft['scratch']='print(1)'; server.save(draft)
                self.assertEqual(server.load()['scratch'], 'print(1)')

    def test_timeout_stops_execution(self):
        with tempfile.TemporaryDirectory() as tmp:
            lab=Path(tmp); (lab/'tests').mkdir(); (lab/'mapreduce_demo.py').write_text(''); (lab/'tests/test_own.py').write_text('import student_tasks\n')
            with patch.object(server,'LAB',lab), patch.object(server,'TIMEOUT',.3): result=server.run_tests('while True: pass\n')
            self.assertTrue(result['timed_out']); self.assertNotEqual(result['exit_code'],0)

    def test_output_is_bounded(self):
        with tempfile.TemporaryDirectory() as tmp:
            lab=Path(tmp); (lab/'tests').mkdir(); (lab/'mapreduce_demo.py').write_text(''); (lab/'tests/test_own.py').write_text('import student_tasks\n')
            with patch.object(server,'LAB',lab), patch.object(server,'MAX_OUTPUT',1000): result=server.run_tests('print("x" * 4000)\n')
            self.assertTrue(result['truncated']); self.assertLessEqual(len(result['output'].encode()), 1000)

class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http=ThreadingHTTPServer(('127.0.0.1',0),server.Handler); cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls): cls.http.shutdown();cls.thread.join();cls.http.server_close()
    def request(self,method,path,body=None,headers=None):
        c=HTTPConnection('127.0.0.1',self.http.server_port,timeout=3);c.request(method,path,body,headers or {});r=c.getresponse();status=r.status;data=r.read();c.close();return status,data
    def test_save_rejects_stale_revision_and_form(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/'student_tasks.py'; source.write_text('original\n'); dest=Path(tmp)/'draft.json'
            with patch.object(server,'SOURCE',source),patch.object(server,'DRAFT',dest):
                _,payload=self.request('GET','/api/draft'); version=json.loads(payload)['revision']
                def put(code): return self.request('PUT','/api/draft',json.dumps({'draft':{'code':code,'notes':{}},'revision':version}),{'Content-Type':'application/json'})
                self.assertEqual(put('first')[0],200);self.assertEqual(put('second')[0],409)
                self.assertEqual(server.load()['code'],'first');self.assertEqual(source.read_text(),'original\n')
                self.assertEqual(self.request('POST','/api/tests',b'{}',{'Content-Type':'text/plain'})[0],400)

if __name__ == '__main__': unittest.main()

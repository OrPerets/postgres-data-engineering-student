"""Lab 03 workspace contracts; no database or Codespace required."""
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
spec = importlib.util.spec_from_file_location('lab03_workspace_server', FILE)
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class FakeError(Exception): pass
class FakeOperationalError(FakeError): pass

class Cursor:
    description = [types.SimpleNamespace(name='value')]
    rowcount = 1
    def __init__(self, conn): self.conn = conn
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def execute(self, sql, *args, **kwargs): self.conn.executed.append((sql, args, kwargs))
    def fetchmany(self, count): return [(i,) for i in range(count)]
    def fetchall(self):
        return [('src_schema.snowflake_raw','r','batch_id','text',False,True,None,None,None),
                ('stage_schema.usage','v','cost','numeric',True,False,None,None,None),
                ('dwh_schema.fact_usage','r','user_key','bigint',False,False,'dwh_schema','dim_user','user_key')]

class Connection:
    read_only = None
    def __init__(self): self.executed=[]; self.commits=0; self.rollbacks=0; self.closed=False
    def __enter__(self): return self
    def __exit__(self, *args): self.closed=True
    def cursor(self): return Cursor(self)
    def close(self): self.closed=True
    def commit(self): self.commits+=1
    def rollback(self): self.rollbacks+=1

class WorkspaceTests(unittest.TestCase):
    def test_questions_use_full_assignment_and_hints(self):
        q=server.questions_from_assignment()
        self.assertEqual([x['id'] for x in q],list(server.QUESTION_IDS))
        self.assertEqual(len(q),18)
        self.assertTrue(all(x['hint'] for x in q))
        self.assertIn('UNION ALL', q[3]['question'])
        self.assertIn('fact row counts', q[9]['question'])

    def test_validation_and_corrupt_saved_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'answers.json'
            server.save_answers({'1':'SELECT 1;', '18':'-- reasoning'},path)
            self.assertEqual(server.load_answers(path)['18'],'-- reasoning')
            path.write_text('{broken')
            with self.assertRaises(RuntimeError): server.load_answers(path)
            self.assertEqual(path.read_text(),'{broken')
        for answers in ({'0':'x'}, {'19':'x'}, {'1':1}):
            with self.assertRaises(ValueError): server.validate_answers({'answers':answers})

    def test_read_and_explicit_commit(self):
        for mode, readonly, committed in [('read',True,False),('commit',False,True)]:
            conn=Connection(); seen={}
            def connect(**kwargs): seen.update(kwargs); return conn
            fake=types.SimpleNamespace(connect=connect,Error=FakeError,OperationalError=FakeOperationalError)
            with patch.dict(sys.modules,{'psycopg':fake}): result=server.query_database('SELECT 5 % 2','warehouse',mode)
            self.assertEqual(seen['port'],55433)
            self.assertEqual(seen['dbname'],'dwh_etl_lab')
            self.assertEqual(conn.read_only,readonly)
            self.assertEqual(conn.commits,int(committed))
            self.assertEqual(conn.rollbacks,int(not committed))
            self.assertEqual(result['committed'],committed)
            self.assertTrue(result['truncated'])
            self.assertEqual(conn.executed[-1],('SELECT 5 %% 2',((),),{'prepare':False,'binary':True}))
        with self.assertRaises(ValueError): server.query_database('SELECT 1','other','read')

    def test_schema_includes_views_and_qualified_foreign_keys(self):
        conn=Connection(); fake=types.SimpleNamespace(connect=lambda **kw:conn,Error=FakeError,OperationalError=FakeOperationalError)
        with patch.dict(sys.modules,{'psycopg':fake}): result=server.load_schema('warehouse')
        self.assertEqual([x['name'] for x in result['tables']],['src_schema.snowflake_raw','stage_schema.usage','dwh_schema.fact_usage'])
        self.assertEqual(result['tables'][1]['kind'],'view')
        self.assertIsNone(result['tables'][1]['columns'][0]['nullable'])
        self.assertEqual(result['tables'][2]['columns'][0]['references'][0],{'schema':'dwh_schema','table':'dim_user','column':'user_key'})

class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http=ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True); cls.thread.start()
    @classmethod
    def tearDownClass(cls): cls.http.shutdown(); cls.thread.join(); cls.http.server_close()
    def request(self,method,path,body=None,headers=None):
        conn=HTTPConnection('127.0.0.1',self.http.server_port,timeout=3)
        conn.request(method,path,body=body,headers=headers or {})
        response=conn.getresponse(); body=response.read(); status=response.status; conn.close(); return status,body
    def test_contract_and_json_requirement(self):
        self.assertEqual(len(json.loads(self.request('GET','/api/questions')[1])['questions']),18)
        self.assertEqual(self.request('GET','/server.py')[0],404)
        self.assertEqual(self.request('GET','/api/schema?target=other')[0],400)
        self.assertEqual(self.request('POST','/api/query',b'{}',{'Content-Type':'text/plain'})[0],400)
        with patch.object(server,'query_database',side_effect=RuntimeError('Warehouse offline')):
            status,body=self.request('POST','/api/query',json.dumps({'sql':'select 1','target':'warehouse','mode':'read'}),{'Content-Type':'application/json'})
        self.assertEqual(status,503); self.assertEqual(json.loads(body)['error'],'Warehouse offline')
    def test_stale_tab_never_overwrites(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'answers.json'; original_load,original_save=server.load_answers,server.save_answers
            with patch.object(server,'load_answers',side_effect=lambda:original_load(path)),patch.object(server,'save_answers',side_effect=lambda answers:original_save(answers,path)):
                rev=json.loads(self.request('GET','/api/answers')[1])['revision']
                def put(value): return self.request('PUT','/api/answers',json.dumps({'answers':{'1':value},'revision':rev}),{'Content-Type':'application/json'})
                self.assertEqual(put('SELECT 1;')[0],200)
                self.assertEqual(put('SELECT 2;')[0],409)
                self.assertEqual(original_load(path),{'1':'SELECT 1;'})

if __name__ == '__main__': unittest.main()

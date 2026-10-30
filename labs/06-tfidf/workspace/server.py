#!/usr/bin/env python3
"""Guided Python workspace. Student code runs as the Codespace user, not in a sandbox."""
from __future__ import annotations
import hashlib, html, json, math, os, re, shutil, signal, subprocess, sys, tempfile, threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
LAB = ROOT.parent
NUMBER = '05' if LAB.name == '05-pagerank' else '06'
PORT = 8769 if NUMBER == '05' else 8770
ASSIGNMENT = LAB / 'STUDENT_ASSIGNMENT.md'
STARTER = LAB / 'student_tasks.py'
HINTS = LAB.parents[1] / 'docs' / 'gitbook' / 'labs' / ('05-pagerank.md' if NUMBER == '05' else '06-tfidf.md')
DRAFT = LAB / '.workspace-data' / 'answers.json'
MAX_BODY = 512 * 1024
MAX_SOURCE = 200_000
MAX_SQL = 50_000
MAX_OUTPUT = 60_000
MAX_ROWS = 200
TEST_TIMEOUT = 30
LOCK = threading.Lock()


def task_list():
    source = ASSIGNMENT.read_text(encoding='utf-8')
    hints = {}
    try:
        for label, text in re.findall(r'<details>\s*<summary>([^<]+)</summary>\s*<p>(.*?)</p>\s*</details>', HINTS.read_text(encoding='utf-8'), re.S):
            match = re.match(r'(\d+)(?:[–-](\d+))?\s*[:—]', label)
            if match:
                first, last = int(match.group(1)), int(match.group(2) or match.group(1))
                for i in range(first, last + 1): hints[i] = html.unescape(re.sub(r'<[^>]*>', '', text)).strip()
    except OSError: pass
    tasks = [{'id': int(n), 'question': re.sub(r'\*\*|`', '', text).strip(), 'hint': hints.get(int(n), '')}
             for n, text in re.findall(r'^(\d+)\.\s+(.+)$', source, re.M)]
    # The assignment's graph/corpus paragraph follows task 7, outside the
    # numbered line. Include it verbatim so the exercise remains actionable.
    context_pattern = r'^Use G=.+$' if NUMBER == '05' else r"^Use the lecture's D1–D4 corpus\..+$"
    context = re.search(context_pattern, source, re.M)
    if context:
        for task in tasks:
            if task['id'] == 7:
                task['question'] += '\n\n' + re.sub(r'\*\*|`', '', context.group(0)).strip()
                break
    expected = 14 if NUMBER == '05' else 13
    if [t['id'] for t in tasks] != list(range(1, expected + 1)):
        raise ValueError('Could not load the complete assignment.')
    return tasks


def validate(value):
    if not isinstance(value, dict) or (not {'source','sql'}.issubset(value) or not set(value).issubset({'source','sql','notes','scratch'})) or not isinstance(value.get('source'), str) or not isinstance(value.get('sql'), str) or len(value['source']) > MAX_SOURCE or len(value['sql']) > MAX_SQL:
        raise ValueError('Invalid draft or draft is too large.')
    scratch = value.get('scratch', '')
    if not isinstance(scratch, str) or len(scratch) > MAX_SOURCE:
        raise ValueError('Invalid scratchpad or scratchpad is too large.')
    notes = value.get('notes', {})
    expected = 14 if NUMBER == '05' else 13
    if not isinstance(notes, dict) or any(not isinstance(k, str) or k not in {str(i) for i in range(1, expected + 1)} or not isinstance(v, str) or len(v) > 10000 for k, v in notes.items()):
        raise ValueError('Invalid task notes or notes are too large.')
    return {'source': value['source'], 'sql': value['sql'], 'notes': notes, 'scratch': scratch}


def load_draft(path=None):
    path = path or DRAFT
    if not path.exists():
        return {'source': STARTER.read_text(encoding='utf-8'), 'sql': '', 'notes': {}, 'scratch': ''}
    try: return validate(json.loads(path.read_text(encoding='utf-8')))
    except (OSError, ValueError) as exc: raise RuntimeError('Could not read the saved draft. Your existing file was not changed.') from exc


def revision(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def save_draft(value, path=None):
    path = path or DRAFT
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False, prefix='.draft-') as f:
            temporary = Path(f.name)
            json.dump(value, f, ensure_ascii=False, indent=2); f.write('\n'); f.flush(); os.fsync(f.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists(): temporary.unlink()


def _run_python(source, suite, scratch=None):
    if not isinstance(source, str) or len(source) > MAX_SOURCE or suite not in ('demo','all','example'):
        raise ValueError('Choose a valid run mode and Python file.')
    if suite == 'example' and (not isinstance(scratch, str) or not scratch.strip() or len(scratch) > MAX_SOURCE):
        raise ValueError('Enter a Python example in the scratchpad.')
    with tempfile.TemporaryDirectory(prefix='course-tests-') as folder:
        target = Path(folder)
        for name in (('pagerank_demo.py' if NUMBER == '05' else 'tfidf_demo.py'), 'benchmark.py'):
            shutil.copy2(LAB / name, target / name)
        shutil.copytree(LAB / 'tests', target / 'tests', ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        (target / 'student_tasks.py').write_text(source, encoding='utf-8')
        if suite == 'example':
            (target / 'scratch.py').write_text(scratch, encoding='utf-8')
            command = [sys.executable, 'scratch.py']
        else:
            command = [sys.executable, '-m', 'unittest'] + (['tests.test_demo', '-v'] if suite == 'demo' else ['discover', '-s', 'tests', '-v'])
        environment = os.environ.copy()
        environment.pop('PYTHONPATH', None)
        environment['PYTHONDONTWRITEBYTECODE'] = '1'
        p = subprocess.Popen(command, cwd=target, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True, env=environment)
        chunks, total = [], [0]
        def drain():
            while True:
                block = p.stdout.read(8192)
                if not block: break
                space = max(0, MAX_OUTPUT - total[0])
                if space: chunks.append(block[:space])
                total[0] += len(block)
        reader = threading.Thread(target=drain, daemon=True); reader.start()
        timed_out = False
        try: p.wait(timeout=TEST_TIMEOUT)
        except subprocess.TimeoutExpired:
            timed_out = True
            try: os.killpg(p.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            p.wait()
        # Stop any children left behind by a completed or timed-out test run.
        try: os.killpg(p.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError): pass
        reader.join(timeout=1)
        if not reader.is_alive(): p.stdout.close()
        size = total[0]
        text = b''.join(chunks).decode('utf-8', errors='replace')
        return {'exit_code': p.returncode, 'output': text, 'timed_out': timed_out, 'truncated': size > MAX_OUTPUT, 'suite': suite}


def run_tests(source, suite):
    if suite not in ('demo', 'all'): raise ValueError('Choose a valid test suite.')
    return _run_python(source, suite)


def run_example(source, scratch):
    return _run_python(source, 'example', scratch)


def run_sql(sql):
    if NUMBER != '06': raise ValueError('SQL is available in Lab 06.')
    if not isinstance(sql, str) or not sql.strip() or len(sql) > MAX_SQL: raise ValueError('Enter one SQL statement.')
    try: import psycopg
    except ImportError as exc: raise RuntimeError('The SQL driver is missing. Run python -m pip install -r labs/02-partitioning-replication/requirements.txt.') from exc
    try:
        with psycopg.connect(host='127.0.0.1', port=55434, dbname='tfidf_lab', user='student', password='studentpass', connect_timeout=5, options='-c default_transaction_read_only=on -c statement_timeout=7000') as conn:
            conn.read_only = True
            with conn.cursor() as cur:
                cur.execute(sql.replace('%','%%'), (), prepare=False, binary=True)
                if not cur.description: result = {'columns':[], 'rows':[], 'truncated':False}
                else:
                    vals = cur.fetchmany(MAX_ROWS + 1)
                    result = {'columns':[x.name for x in cur.description], 'rows':[[_cell(x) for x in row] for row in vals[:MAX_ROWS]], 'truncated':len(vals) > MAX_ROWS}
            conn.rollback()
            return result
    except psycopg.OperationalError as exc:
        if getattr(exc, 'sqlstate', None) == '57014': raise ValueError('The query exceeded 7 seconds.') from exc
        raise RuntimeError('Cannot connect to the TF-IDF database. Run make lab-tfidf-sql from the repository root and wait for READY.') from exc
    except psycopg.Error as exc: raise ValueError(str(exc).strip()) from exc


def _cell(value):
    if isinstance(value, float) and not math.isfinite(value): return str(value)
    if value is None or isinstance(value, (bool, int, float)): return value
    if isinstance(value, (bytes, bytearray, memoryview)):
        try: text = bytes(value).decode('utf-8')
        except UnicodeDecodeError: text = '\\x' + bytes(value).hex()
    else: text = str(value)
    return text[:2000] + ('…' if len(text) > 2000 else '')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): return
    def send_json(self, status, body):
        raw = json.dumps(body, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length', str(len(raw))); self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(raw)
    def body(self):
        if self.headers.get_content_type() != 'application/json': raise ValueError('Requests must use application/json.')
        length = self.headers.get('Content-Length','')
        if not length.isdigit() or int(length) > MAX_BODY: raise ValueError('Invalid request size.')
        try: return json.loads(self.rfile.read(int(length)).decode('utf-8'))
        except (ValueError, UnicodeDecodeError) as exc: raise ValueError('Invalid JSON request.') from exc
    def do_GET(self):
        path = urlsplit(self.path).path
        try:
            if path == '/api/tasks': self.send_json(200, {'lab':NUMBER, 'tasks':task_list()})
            elif path == '/api/state':
                with LOCK:
                    value = load_draft(); self.send_json(200, {'state':value, 'revision':revision(value), 'saved':DRAFT.exists()})
            elif path == '/api/reference' and NUMBER == '06': self.send_json(200, {'sql':(LAB / 'sql' / '02_reference_query.sql').read_text(encoding='utf-8')})
            elif path in ('/','/index.html','/app.js','/style.css'):
                name = 'index.html' if path == '/' else path[1:]; raw = (ROOT / name).read_bytes()
                typ = {'index.html':'text/html','app.js':'text/javascript','style.css':'text/css'}[name]
                self.send_response(200); self.send_header('Content-Type', typ+'; charset=utf-8'); self.send_header('Content-Length',str(len(raw))); self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(raw)
            else: self.send_error(404)
        except (OSError, ValueError, RuntimeError) as exc: self.send_json(500, {'error':str(exc)})
    def do_PUT(self):
        if urlsplit(self.path).path != '/api/state': self.send_error(404); return
        try:
            body = self.body()
            if not isinstance(body,dict) or set(body) != {'state','revision'} or not isinstance(body['revision'],str): raise ValueError('Invalid save request.')
            value = validate(body['state'])
            with LOCK:
                existing = load_draft()
                if body['revision'] != revision(existing): self.send_json(409, {'error':'Saved work changed in another tab. Download your current work before reloading; it was not overwritten.'}); return
                save_draft(value)
            self.send_json(200, {'revision':revision(value)})
        except ValueError as exc: self.send_json(400, {'error':str(exc)})
        except (OSError, RuntimeError): self.send_json(500, {'error':'Could not save your work. Your existing draft was not changed.'})
    def do_POST(self):
        path = urlsplit(self.path).path
        try:
            body = self.body()
            if path == '/api/test':
                if not isinstance(body,dict) or set(body) != {'source','suite'}: raise ValueError('Invalid test request.')
                self.send_json(200, run_tests(body['source'], body['suite']))
            elif path == '/api/example':
                if not isinstance(body,dict) or set(body) != {'source','scratch'}: raise ValueError('Invalid example request.')
                self.send_json(200, run_example(body['source'], body['scratch']))
            elif path == '/api/sql' and NUMBER == '06':
                if not isinstance(body,dict) or set(body) != {'sql'}: raise ValueError('Invalid SQL request.')
                self.send_json(200, run_sql(body['sql']))
            else: self.send_error(404)
        except ValueError as exc: self.send_json(400, {'error':str(exc)})
        except RuntimeError as exc: self.send_json(503, {'error':str(exc)})
        except OSError: self.send_json(500, {'error':'Unable to run tests. Check the lab files and try again.'})


def main():
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Lab {NUMBER} workspace ready at http://127.0.0.1:{PORT} (open the private forwarded port in Codespaces).', flush=True)
    try: srv.serve_forever()
    except KeyboardInterrupt: pass
    finally: srv.server_close()
if __name__ == '__main__': main()

#!/usr/bin/env python3
"""Guided MapReduce workspace. Test runs execute student code as the current user."""
from __future__ import annotations
import hashlib
import html
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

WORKSPACE = Path(__file__).resolve().parent
LAB = WORKSPACE.parent
ROOT = LAB.parents[1]
ASSIGNMENT = LAB / 'STUDENT_ASSIGNMENT.md'
HINTS = ROOT / 'docs/gitbook/labs/04-mapreduce.md'
SOURCE = LAB / 'student_tasks.py'
DRAFT = LAB / '.workspace-data/answers.json'
MAX_CODE = 200_000
MAX_NOTE = 20_000
MAX_BODY = 512_000
MAX_OUTPUT = 60_000
TIMEOUT = 20
LOCK = threading.Lock()


def questions():
    source = ASSIGNMENT.read_text(encoding='utf-8')
    matches = re.findall(r'^(\d+)\.\s+(.+)$', source, re.M)
    if [int(n) for n, _ in matches] != list(range(1, 12)):
        raise ValueError('Lab 04 assignment tasks could not be loaded.')
    hints = {}
    try:
        data = HINTS.read_text(encoding='utf-8')
        matches_hint = re.findall(r'<details>\s*<summary>(\d+)\s+—.*?</summary>\s*<p>(.*?)</p>\s*</details>', data, re.S)
        hints = {int(n): html.unescape(re.sub(r'<[^>]+>', '', text)).strip() for n, text in matches_hint}
    except OSError:
        pass
    return [{'id': int(n), 'question': re.sub(r'\*\*|`', '', text), 'hint': hints.get(int(n), '')} for n, text in matches]


def validate(value):
    if not isinstance(value, dict) or set(value) not in ({'code', 'notes'}, {'code', 'notes', 'scratch'}):
        raise ValueError('Expected code, notes and an optional example.')
    code, notes, scratch = value['code'], value['notes'], value.get('scratch', '')
    if not isinstance(code, str) or len(code) > MAX_CODE or not isinstance(notes, dict) or not isinstance(scratch, str) or len(scratch) > MAX_CODE:
        raise ValueError('Invalid code or notes; each code file can be at most 200,000 characters.')
    if any(k not in {str(i) for i in range(1, 12)} or not isinstance(v, str) or len(v) > MAX_NOTE for k, v in notes.items()):
        raise ValueError('Invalid task note.')
    return {'code': code, 'notes': notes, 'scratch': scratch}


def load():
    if not DRAFT.exists():
        return validate({'code': SOURCE.read_text(encoding='utf-8'), 'notes': {}})
    try:
        return validate(json.loads(DRAFT.read_text(encoding='utf-8')))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise RuntimeError('Saved draft could not be read; it has not been changed.') from exc


def revision(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def save(value):
    DRAFT.parent.mkdir(parents=True, exist_ok=True)
    tmp = None
    try:
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=DRAFT.parent, prefix='.draft-', delete=False) as stream:
            tmp = Path(stream.name)
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write('\n'); stream.flush(); os.fsync(stream.fileno())
        os.replace(tmp, DRAFT)
    finally:
        if tmp is not None and tmp.exists(): tmp.unlink()


def run_isolated(code, scratch=None):
    if not isinstance(code, str) or len(code) > MAX_CODE:
        raise ValueError('Invalid Python code.')
    if scratch is not None and (not isinstance(scratch, str) or not scratch.strip() or len(scratch) > MAX_CODE):
        raise ValueError('Enter a Python example of at most 200,000 characters.')
    with tempfile.TemporaryDirectory(prefix='lab04-test-') as tmp:
        directory = Path(tmp)
        shutil.copy2(LAB / 'mapreduce_demo.py', directory / 'mapreduce_demo.py')
        shutil.copytree(LAB / 'tests', directory / 'tests', ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        (directory / 'student_tasks.py').write_text(code, encoding='utf-8')
        if scratch is not None:
            (directory / 'scratch.py').write_text(scratch, encoding='utf-8')
        env = os.environ.copy()
        env.pop('PYTHONPATH', None); env['PYTHONDONTWRITEBYTECODE'] = '1'
        command = [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'] if scratch is None else [sys.executable, 'scratch.py']
        proc = subprocess.Popen(command, cwd=directory,
                                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                start_new_session=True, env=env)
        chunks = []; count = 0; truncated = False
        def consume():
            nonlocal count, truncated
            while True:
                block = proc.stdout.read(8192)
                if not block: break
                if count < MAX_OUTPUT:
                    piece = block[:MAX_OUTPUT-count]; chunks.append(piece); count += len(piece)
                if count >= MAX_OUTPUT: truncated = True
        reader = threading.Thread(target=consume, daemon=True); reader.start()
        timed_out = False
        try:
            proc.wait(timeout=TIMEOUT)
        except subprocess.TimeoutExpired:
            timed_out = True
            try: os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            proc.wait()
        finally:
            # Stop subprocesses left in the test process group, including children
            # still holding the output pipe after their parent exited.
            try: os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            reader.join(timeout=2)
            if not reader.is_alive():
                proc.stdout.close()
        return {'output': b''.join(chunks).decode('utf-8', errors='replace'), 'exit_code': proc.returncode,
                'timed_out': timed_out, 'truncated': truncated}


def run_tests(code):
    return run_isolated(code)


def run_example(code, scratch):
    return run_isolated(code, scratch)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass
    def respond(self, status, value):
        data = json.dumps(value, ensure_ascii=False).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(data)
    def body(self):
        if self.headers.get_content_type() != 'application/json': raise ValueError('Requests must use application/json.')
        n = self.headers.get('Content-Length','')
        if not n.isdigit() or int(n) > MAX_BODY: raise ValueError('Invalid request size.')
        try: return json.loads(self.rfile.read(int(n)).decode('utf-8'))
        except (UnicodeError, json.JSONDecodeError) as exc: raise ValueError('Invalid JSON.') from exc
    def do_GET(self):
        path = urlsplit(self.path).path
        try:
            if path == '/api/questions': self.respond(200, {'questions': questions()})
            elif path == '/api/draft':
                with LOCK:
                    data = load(); self.respond(200, {'draft': data, 'revision': revision(data), 'from_original': not DRAFT.exists()})
            elif path in ('/', '/index.html', '/app.js', '/style.css'):
                target = WORKSPACE / ('index.html' if path == '/' else path[1:]); raw = target.read_bytes()
                content = {'html':'text/html', 'js':'text/javascript', 'css':'text/css'}[target.suffix[1:]]
                self.send_response(200); self.send_header('Content-Type',content+'; charset=utf-8'); self.send_header('Content-Length',str(len(raw))); self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(raw)
            else: self.send_error(404)
        except (OSError, ValueError, RuntimeError) as exc: self.respond(500, {'error': str(exc)})
    def do_PUT(self):
        if urlsplit(self.path).path != '/api/draft': self.send_error(404); return
        try:
            data = self.body()
            if not isinstance(data,dict) or set(data) != {'draft','revision'} or not isinstance(data['revision'],str): raise ValueError('Expected draft and revision.')
            draft = validate(data['draft'])
            with LOCK:
                if data['revision'] != revision(load()): self.respond(409, {'error':'The draft changed in another tab or the original file changed. Download your current work before reloading; nothing was overwritten.'}); return
                save(draft)
            self.respond(200, {'draft':draft,'revision':revision(draft)})
        except ValueError as exc: self.respond(400, {'error':str(exc)})
        except (OSError, RuntimeError): self.respond(500, {'error':'Could not save; the existing draft was not changed.'})
    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in ('/api/tests', '/api/example'): self.send_error(404); return
        try:
            data = self.body()
            if path == '/api/tests':
                if not isinstance(data,dict) or set(data) != {'code'}: raise ValueError('Expected Python code.')
                self.respond(200, run_tests(data['code']))
            else:
                if not isinstance(data,dict) or set(data) != {'code', 'scratch'}: raise ValueError('Expected Python code and an example.')
                self.respond(200, run_example(data['code'], data['scratch']))
        except ValueError as exc: self.respond(400, {'error':str(exc)})
        except OSError: self.respond(500, {'error':'Could not run tests; check the lab files and Python environment.'})


def main():
    server=ThreadingHTTPServer(('127.0.0.1',8768), Handler)
    print('Lab 04 workspace ready at http://127.0.0.1:8768; open port 8768 in Codespaces.', flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__ == '__main__': main()

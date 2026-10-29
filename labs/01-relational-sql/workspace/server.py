#!/usr/bin/env python3
"""Local Lab 01 SQL workspace. Run inside the student's Codespace."""
from __future__ import annotations

import hashlib
import html
import json
import math
import mimetypes
import os
from pathlib import Path
import re
import tempfile
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

WORKSPACE_DIR = Path(__file__).resolve().parent
LAB_DIR = WORKSPACE_DIR.parent
WORKSHEET = LAB_DIR / "sql" / "student_answers.sql"
HINTS_FILE = LAB_DIR.parents[1] / "docs" / "gitbook" / "labs" / "01-relational-sql.md"
ANSWERS_FILE = LAB_DIR / ".workspace-data" / "answers.json"
MAX_BODY = 512 * 1024
MAX_SQL = 50_000
MAX_ROWS = 200
MAX_CELL = 2000
QUESTION_COUNT = 15
LOCK = threading.Lock()


def questions_from_worksheet(path: Path = WORKSHEET, hints_path: Path = HINTS_FILE) -> list[dict]:
    """Read the exact question text, including supplied SQL, from the starter."""
    source = path.read_text(encoding="utf-8")
    pattern = re.compile(r"^-- QUESTION (\d+)\s*\n(.*?)^-- ={5,}\s*$", re.M | re.S)
    questions = []
    hints = {}
    try:
        hint_source = hints_path.read_text(encoding="utf-8")
        pattern_hint = re.compile(r"<details>\s*<summary>Question\s+(\d+)\b.*?</summary>\s*<p>(.*?)</p>\s*</details>", re.S)
        for number, content in pattern_hint.findall(hint_source):
            hints[int(number)] = html.unescape(re.sub(r"<[^>]*>", "", content)).strip()
    except OSError:
        # Hints are optional; the worksheet remains the source of truth.
        pass
    for number, body in pattern.findall(source):
        lines = []
        for line in body.splitlines():
            if line == "--":
                lines.append("")
            elif line.startswith("-- "):
                lines.append(line[3:])
            else:
                raise ValueError(f"Unexpected line in question {number}.")
        questions.append({"id": int(number), "question": "\n".join(lines).strip(), "hint": hints.get(int(number), "")})
    if [q["id"] for q in questions] != list(range(1, QUESTION_COUNT + 1)):
        raise ValueError("The worksheet must contain questions 1 through 15 in order.")
    return questions


def validate_answers(data: object) -> dict[str, str]:
    if not isinstance(data, dict) or set(data) != {"answers"} or not isinstance(data["answers"], dict):
        raise ValueError("Expected an answers object.")
    answers = data["answers"]
    if any(not isinstance(k, str) or k not in {str(i) for i in range(1, QUESTION_COUNT + 1)}
           or not isinstance(v, str) or len(v) > MAX_SQL for k, v in answers.items()):
        raise ValueError("Invalid answer number or answer text is too long.")
    return answers


def load_answers(path: Path = ANSWERS_FILE) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        return validate_answers(json.loads(path.read_text(encoding="utf-8")))
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Could not read saved answers. Your existing file was not changed.") from exc


def answers_revision(answers: dict[str, str]) -> str:
    canonical = json.dumps(answers, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def save_answers(answers: dict[str, str], path: Path = ANSWERS_FILE) -> None:
    # Write in the destination directory so rename is atomic. Never touch the SQL worksheet.
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent,
                                         prefix=".answers-", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            json.dump({"answers": answers}, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def query_database(sql: str) -> dict:
    if not isinstance(sql, str) or not sql.strip() or len(sql) > MAX_SQL:
        raise ValueError("Enter one SQL statement (up to 50,000 characters).")
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("The SQL driver is missing. From the repository root, run: python -m pip install -r labs/02-partitioning-replication/requirements.txt") from exc
    try:
        with psycopg.connect(host="127.0.0.1", port=55432, dbname="query_lab", user="student",
                             password="studentpass", connect_timeout=5,
                             options="-c default_transaction_read_only=on -c statement_timeout=7000") as conn:
            conn.read_only = True
            with conn.cursor() as cur:
                # binary=True forces the extended protocol even with no parameters;
                # PostgreSQL rejects multiple statements in one extended query.
                # Escape percent for psycopg's placeholder parser, preserving the
                # SQL sent to PostgreSQL. prepare=False allows EXPLAIN.
                cur.execute(sql.replace("%", "%%"), (), prepare=False, binary=True)
                if cur.description is None:
                    result = {"columns": [], "rows": [], "truncated": False}
                else:
                    columns = [item.name for item in cur.description]
                    values = cur.fetchmany(MAX_ROWS + 1)
                    truncated = len(values) > MAX_ROWS
                    rows = [[_cell(value) for value in row] for row in values[:MAX_ROWS]]
                    result = {"columns": columns, "rows": rows, "truncated": truncated}
            conn.rollback()
            return result
    except psycopg.OperationalError as exc:
        if getattr(exc, "sqlstate", None) == "57014":
            raise ValueError("The query took longer than 7 seconds and was stopped. Try a smaller query.") from exc
        raise RuntimeError("Cannot connect to the Lab 01 database. From the repository root, run make lab-sql and wait for READY.") from exc
    except psycopg.Error as exc:
        raise ValueError(str(exc).strip()) from exc


def _cell(value):
    if isinstance(value, float) and not math.isfinite(value):
        return str(value)
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, (bytes, bytearray, memoryview)):
        raw = bytes(value)
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            text = "\\x" + raw.hex()
    else:
        text = str(value)
    return text if len(text) <= MAX_CELL else text[:MAX_CELL] + "…"


class Handler(BaseHTTPRequestHandler):
    server_version = "LabWorkspace/1.0"

    def log_message(self, format, *args):
        # Avoid logging SQL, answer content, and URL query strings.
        return

    def _json(self, status: int, value: dict) -> None:
        raw = json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(raw)

    def _body(self):
        if self.headers.get_content_type() != "application/json":
            raise ValueError("Requests must use application/json.")
        length_header = self.headers.get("Content-Length")
        if not length_header or not length_header.isdigit():
            raise ValueError("A valid content length is required.")
        length = int(length_header)
        if length > MAX_BODY:
            raise ValueError("The request is too large.")
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise ValueError("The request is not valid JSON.") from exc

    def do_GET(self):
        path = urlsplit(self.path).path
        try:
            if path == "/api/questions":
                self._json(HTTPStatus.OK, {"questions": questions_from_worksheet()})
            elif path == "/api/answers":
                with LOCK:
                    answers = load_answers()
                    self._json(HTTPStatus.OK, {"answers": answers, "revision": answers_revision(answers)})
            elif path in {"/", "/index.html", "/app.js", "/style.css"}:
                filename = "index.html" if path == "/" else path.lstrip("/")
                target = WORKSPACE_DIR / filename
                if not target.is_file():
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                raw = target.read_bytes()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", mimetypes.guess_type(filename)[0] or "application/octet-stream")
                self.send_header("Content-Length", str(len(raw)))
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.end_headers()
                self.wfile.write(raw)
            else:
                self.send_error(HTTPStatus.NOT_FOUND)
        except (OSError, ValueError, RuntimeError) as exc:
            self._json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})

    def do_PUT(self):
        if urlsplit(self.path).path != "/api/answers":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            body = self._body()
            if not isinstance(body, dict) or set(body) != {"answers", "revision"} or not isinstance(body["revision"], str):
                raise ValueError("Expected answers and the revision returned by the workspace.")
            answers = validate_answers({"answers": body["answers"]})
            with LOCK:
                # Do not replace corrupt or inaccessible existing data silently.
                existing = load_answers()
                if body["revision"] != answers_revision(existing):
                    self._json(HTTPStatus.CONFLICT, {"error": "Answers changed in another tab. Download your edits before reloading; the saved answers were not overwritten."})
                    return
                save_answers(answers)
            self._json(HTTPStatus.OK, {"answers": answers, "revision": answers_revision(answers)})
        except ValueError as exc:
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except (OSError, RuntimeError):
            self._json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Could not save answers. Your existing file was not changed."})

    def do_POST(self):
        if urlsplit(self.path).path != "/api/query":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            body = self._body()
            if not isinstance(body, dict) or set(body) != {"sql"}:
                raise ValueError("Expected one SQL statement.")
            self._json(HTTPStatus.OK, query_database(body["sql"]))
        except ValueError as exc:
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except RuntimeError as exc:
            self._json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(exc)})


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("SQL workspace ready at http://127.0.0.1:8765 (open forwarded port 8765 in Codespaces).", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

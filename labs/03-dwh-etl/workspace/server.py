#!/usr/bin/env python3
"""Local Lab 03 SQL workspace. Run inside the student's Codespace."""
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
from urllib.parse import urlsplit, parse_qs

WORKSPACE_DIR = Path(__file__).resolve().parent
LAB_DIR = WORKSPACE_DIR.parent
ASSIGNMENT = LAB_DIR / "STUDENT_ASSIGNMENT.md"
HINTS_FILE = LAB_DIR.parents[1] / "docs" / "gitbook" / "labs" / "03-dwh-etl.md"
ANSWERS_FILE = LAB_DIR / ".workspace-data" / "answers.json"
MAX_BODY = 512 * 1024
MAX_SQL = 50_000
MAX_ROWS = 200
MAX_CELL = 2000
QUESTION_IDS = tuple(str(i) for i in range(1, 19))
TARGETS = {"warehouse": 55433}
MAX_TABLES = 50
LOCK = threading.Lock()


def questions_from_assignment(path: Path = ASSIGNMENT, hints_path: Path = HINTS_FILE) -> list[dict]:
    """Extract full exercise text and optional hints from the existing course sources."""
    source = path.read_text(encoding="utf-8")
    pattern = re.compile(r"^(\d{1,2})\.\s+(.+)$", re.M)
    questions = []
    hints = {}
    try:
        hint_source = hints_path.read_text(encoding="utf-8")
        hint_pattern = re.compile(r"<details>\s*<summary>Question\s+(\d{1,2})\b.*?</summary>\s*<p>(.*?)</p>\s*</details>", re.S)
        for number, content in hint_pattern.findall(hint_source):
            hints[number] = html.unescape(re.sub(r"<[^>]*>", "", content)).strip()
    except OSError:
        pass
    for number, body in pattern.findall(source):
        # Markdown emphasis and code markers are visual markup; the UI uses plain text.
        text = body.replace("**", "").replace("`", "").strip()
        questions.append({"id": number, "question": text, "hint": hints.get(number, "")})
    if [q["id"] for q in questions] != list(QUESTION_IDS):
        raise ValueError("The Lab 03 assignment must contain questions 1 through 18 in order.")
    return questions


def validate_answers(data: object) -> dict[str, str]:
    if not isinstance(data, dict) or set(data) != {"answers"} or not isinstance(data["answers"], dict):
        raise ValueError("Expected an answers object.")
    answers = data["answers"]
    if any(not isinstance(k, str) or k not in set(QUESTION_IDS)
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


def _connect(target: str, *, readonly: bool | None):
    """Connect to the Lab 03 warehouse."""
    if not isinstance(target, str) or target not in TARGETS:
        raise ValueError("Use the warehouse database.")
    conn = None
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("The SQL driver is missing. From the repository root, run: python -m pip install -r labs/02-partitioning-replication/requirements.txt") from exc
    options = "-c statement_timeout=7000"
    if readonly:
        options += " -c default_transaction_read_only=on"
    try:
        conn = psycopg.connect(host="127.0.0.1", port=TARGETS[target], dbname="dwh_etl_lab", user="student",
                               password="studentpass", connect_timeout=5, options=options)
        conn.read_only = readonly
        return conn
    except psycopg.OperationalError as exc:
        if conn is not None:
            conn.close()
        if getattr(exc, "sqlstate", None) == "57014":
            raise ValueError("The query took longer than 7 seconds and was stopped.") from exc
        raise RuntimeError(f"Cannot connect to the Lab 03 {target}. From the repository root, run make lab-dwh and wait for READY.") from exc
    except psycopg.Error as exc:
        if conn is not None:
            conn.close()
        raise RuntimeError("Cannot connect to the Lab 03 warehouse. Check the lab services.") from exc


def query_database(sql: str, target: str, mode: str) -> dict:
    if not isinstance(sql, str) or not sql.strip() or len(sql) > MAX_SQL:
        raise ValueError("Enter one SQL statement (up to 50,000 characters).")
    if not isinstance(target, str) or target not in TARGETS or not isinstance(mode, str) or mode not in ("read", "commit"):
        raise ValueError("Choose a valid server and run mode.")
    # Each request is a separate transaction; apply commits one statement.
    conn = _connect(target, readonly=(mode == "read"))
    import psycopg
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql.replace("%", "%%"), (), prepare=False, binary=True)
                affected = cur.rowcount
                if cur.description is None:
                    result = {"columns": [], "rows": [], "truncated": False}
                else:
                    result = {"columns": [item.name for item in cur.description]}
                    values = cur.fetchmany(MAX_ROWS + 1)
                    result["truncated"] = len(values) > MAX_ROWS
                    result["rows"] = [[_cell(value) for value in row] for row in values[:MAX_ROWS]]
            committed = target == "warehouse" and mode == "commit"
            if committed:
                conn.commit()
            else:
                conn.rollback()
            result.update({"target": target, "mode": mode, "committed": committed, "affected": affected})
            return result
    except psycopg.OperationalError as exc:
        if getattr(exc, "sqlstate", None) == "57014":
            raise ValueError("The query took longer than 7 seconds and was stopped. Try a smaller query.") from exc
        if target == "warehouse" and mode == "commit":
            raise RuntimeError("The warehouse connection was lost. The statement may have committed; inspect the database before retrying.") from exc
        raise RuntimeError(f"The connection to {target} was lost. Check the lab services before retrying.") from exc
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


def load_schema(target: str) -> dict:
    """Read live source, staging and warehouse table and view metadata."""
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("The SQL driver is missing. From the repository root, run: python -m pip install -r labs/02-partitioning-replication/requirements.txt") from exc
    # Align each local FK attribute with the referenced attribute by position;
    # matching names or joining the two arrays independently breaks composite FKs.
    sql = """
        SELECT ns.nspname || '.' || rel.relname, rel.relkind, attr.attname,
               pg_catalog.format_type(attr.atttypid, attr.atttypmod),
               NOT attr.attnotnull,
               EXISTS (
                   SELECT 1 FROM pg_catalog.pg_constraint pk
                   WHERE pk.conrelid = rel.oid AND pk.contype = 'p'
                     AND attr.attnum = ANY(pk.conkey)
               ), refs.schema_name, refs.table_name, refs.column_name
        FROM pg_catalog.pg_class rel
        JOIN pg_catalog.pg_namespace ns ON ns.oid = rel.relnamespace
        JOIN pg_catalog.pg_attribute attr ON attr.attrelid = rel.oid
        LEFT JOIN LATERAL (
            SELECT remote_ns.nspname AS schema_name, remote.relname AS table_name,
                   remote_attr.attname AS column_name
            FROM pg_catalog.pg_constraint fk
            JOIN LATERAL unnest(fk.conkey, fk.confkey)
                AS pair(local_num, remote_num) ON true
            JOIN pg_catalog.pg_class remote ON remote.oid = fk.confrelid
            JOIN pg_catalog.pg_namespace remote_ns ON remote_ns.oid = remote.relnamespace
            JOIN pg_catalog.pg_attribute remote_attr
                ON remote_attr.attrelid = remote.oid AND remote_attr.attnum = pair.remote_num
            WHERE fk.contype = 'f' AND fk.conrelid = rel.oid AND pair.local_num = attr.attnum
        ) refs ON true
        WHERE ns.nspname IN ('src_schema', 'stage_schema', 'dwh_schema') AND rel.relkind IN ('r', 'p', 'v', 'm')
          AND rel.oid IN (SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname IN ('src_schema', 'stage_schema', 'dwh_schema') AND c.relkind IN ('r','p','v','m') ORDER BY n.nspname, c.relname LIMIT 51) AND attr.attnum > 0 AND NOT attr.attisdropped
        ORDER BY CASE ns.nspname WHEN 'src_schema' THEN 1 WHEN 'stage_schema' THEN 2 ELSE 3 END, rel.relname, attr.attnum,
                 refs.schema_name, refs.table_name, refs.column_name
    """
    try:
        with _connect(target, readonly=True) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchall()
            conn.rollback()
    except psycopg.OperationalError as exc:
        raise RuntimeError("Cannot connect to the Lab 03 database. From the repository root, run make lab-dwh and wait for READY.") from exc
    except psycopg.Error as exc:
        raise RuntimeError("Could not load the database schema. Check that the Lab 03 database is ready.") from exc

    tables = []
    by_name = {}
    for table, kind, name, typ, nullable, primary_key, ref_schema, ref_table, ref_column in rows:
        table, kind, name, typ = _cell(table), _cell(kind), _cell(name), _cell(typ)
        if table not in by_name:
            by_name[table] = {"name": table, "kind": "view" if kind in ("v", "m") else "table", "columns": [], "_columns": {}}
            tables.append(by_name[table])
        entry = by_name[table]
        if name not in entry["_columns"]:
            # View metadata does not provide a reliable NOT NULL guarantee.
            column = {"name": name, "type": typ, "nullable": None if kind in ("v", "m") else nullable,
                      "primary_key": primary_key, "references": []}
            entry["_columns"][name] = column
            entry["columns"].append(column)
        if ref_table is not None:
            entry["_columns"][name]["references"].append({
                "schema": _cell(ref_schema), "table": _cell(ref_table), "column": _cell(ref_column)
            })
    for table in tables:
        del table["_columns"]
    truncated = len(tables) > MAX_TABLES
    return {"target": target, "tables": tables[:MAX_TABLES], "truncated": truncated}


class Handler(BaseHTTPRequestHandler):
    server_version = "Lab03Workspace/1.0"

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
                self._json(HTTPStatus.OK, {"questions": questions_from_assignment()})
            elif path == "/api/schema":
                try:
                    target = parse_qs(urlsplit(self.path).query).get("target", [""])
                    if len(target) != 1 or target[0] not in TARGETS:
                        raise ValueError("Use the warehouse database.")
                    self._json(HTTPStatus.OK, load_schema(target[0]))
                except ValueError as exc:
                    self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                except RuntimeError as exc:
                    self._json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(exc)})
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
            if not isinstance(body, dict) or set(body) != {"sql", "target", "mode"}:
                raise ValueError("Expected one SQL statement.")
            self._json(HTTPStatus.OK, query_database(body["sql"], body["target"], body["mode"]))
        except ValueError as exc:
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except RuntimeError as exc:
            self._json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(exc)})


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 8767), Handler)
    print("SQL workspace ready at http://127.0.0.1:8767 (open forwarded port 8767 in Codespaces).", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

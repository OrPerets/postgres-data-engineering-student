#!/usr/bin/env python3
"""Preview the filtered course website locally, rebuilding after edits."""
from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
WATCHED_FILES = (
    ROOT / "mkdocs.yml",
    ROOT / "scripts" / "build_site.py",
    ROOT / "labs" / "02-partitioning-replication" / "assignments" / "STUDENT_ASSIGNMENT.md",
    ROOT / "labs" / "02-partitioning-replication" / "workspace" / "server.py",
    ROOT / "labs" / "03-dwh-etl" / "STUDENT_ASSIGNMENT.md",
    ROOT / "labs" / "03-dwh-etl" / "workspace" / "server.py",
    ROOT / "labs" / "03-dwh-etl" / "sql" / "01_stage.sql",
    ROOT / "labs" / "03-dwh-etl" / "sql" / "02_dwh.sql",
    ROOT / "labs" / "04-mapreduce" / "STUDENT_ASSIGNMENT.md",
    ROOT / "labs" / "04-mapreduce" / "student_tasks.py",
    ROOT / "labs" / "04-mapreduce" / "workspace" / "server.py",
    *(ROOT / "labs" / lab / name for lab in ("05-pagerank", "06-tfidf")
      for name in ("STUDENT_ASSIGNMENT.md", "student_tasks.py", "workspace/server.py")),
)
DOCS = ROOT / "docs" / "gitbook"


def snapshot(settings: Path) -> dict[str, tuple[int, int]]:
    """Notice additions, removals, and changes without extra dependencies."""
    result = {}
    for path in (*WATCHED_FILES, settings, *DOCS.rglob("*")):
        try:
            if path.is_file():
                stat = path.stat()
                result[str(path)] = (stat.st_mtime_ns, stat.st_size)
        except FileNotFoundError:
            # An editor may replace a file while it is being scanned.
            continue
    return result


def add_reload_script(site: Path, version: int) -> None:
    script = f"""<script>
(() => {{
  const version = {json.dumps(str(version))};
  setInterval(async () => {{
    try {{
      const response = await fetch('/__local_preview_version', {{cache: 'no-store'}});
      if (response.ok && await response.text() !== version) location.reload();
    }} catch (_) {{ /* The preview can be restarted without disturbing this page. */ }}
  }}, 1000);
}})();
</script>"""
    for page in site.rglob("*.html"):
        html = page.read_text(encoding="utf-8")
        if "</body>" in html:
            page.write_text(html.replace("</body>", script + "\n</body>", 1), encoding="utf-8")


class Preview:
    def __init__(self, directory: Path, settings: Path):
        self.directory = directory
        self.settings = settings
        self.version = 0
        self.current: Path | None = None
        self.lock = threading.Lock()
        self.stop = threading.Event()
        self.build_number = 0
        self.successful: list[Path] = []

    def build(self) -> bool:
        self.build_number += 1
        target = self.directory / f"build-{self.build_number}"
        print("Building filtered preview...", flush=True)
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "build_site.py"), "--settings", str(self.settings), "--site-dir", str(target)],
            cwd=ROOT,
        )
        if result.returncode:
            shutil.rmtree(target, ignore_errors=True)
            print("Preview build failed; keeping the last successful version. Save a fix to retry.", file=sys.stderr, flush=True)
            return False
        version = self.version + 1
        add_reload_script(target, version)
        with self.lock:
            self.current = target
            self.version = version
        self.successful.append(target)
        # Keep the preceding version available while in-flight requests finish.
        if len(self.successful) > 2:
            shutil.rmtree(self.successful.pop(0), ignore_errors=True)
        print("Preview ready; browser pages will refresh.", flush=True)
        return True

    def watch(self, previous: dict[str, tuple[int, int]]) -> None:
        while not self.stop.wait(1):
            current = snapshot(self.settings)
            if current != previous:
                # Debounce editors that write a file in several steps.
                if self.stop.wait(0.35):
                    return
                current = snapshot(self.settings)
                self.build()
                previous = current


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, preview: Preview, **kwargs):
        self.preview = preview
        with preview.lock:
            directory = preview.current
        super().__init__(*args, directory=str(directory), **kwargs)

    def do_GET(self) -> None:
        if urlsplit(self.path).path == "/__local_preview_version":
            with self.preview.lock:
                body = str(self.preview.version).encode("ascii")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, format: str, *args) -> None:
        # The version endpoint is polled every second; keep the terminal useful.
        if urlsplit(self.path).path != "/__local_preview_version":
            super().log_message(format, *args)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000, help="local port (default: 8000)")
    parser.add_argument("--settings", type=Path, default=ROOT / "lab-visibility.yml",
                        help="visibility settings file (default: lab-visibility.yml)")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="course-preview-") as tmp:
        preview = Preview(Path(tmp), args.settings.resolve())
        previous = snapshot(preview.settings)
        if not preview.build():
            return 1
        try:
            server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, preview=preview))
        except OSError as exc:
            print(f"Could not start preview: {exc}. Try --port 8001.", file=sys.stderr)
            return 1
        watcher = threading.Thread(target=preview.watch, args=(previous,), daemon=True)
        watcher.start()
        print(f"Local preview: http://127.0.0.1:{server.server_port}/ (Ctrl+C to stop)", flush=True)
        try:
            server.serve_forever(poll_interval=0.25)
        except KeyboardInterrupt:
            print("\nStopping preview.", flush=True)
        finally:
            preview.stop.set()
            server.server_close()
            watcher.join()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

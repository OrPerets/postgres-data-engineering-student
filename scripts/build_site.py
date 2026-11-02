#!/usr/bin/env python3
"""Build a filtered course website without changing the source documents.

The GitHub repository is public: hiding a lab here is not an access control.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

import yaml

ROOT = Path(__file__).resolve().parents[1]
LABS = {
    "01": ("01-relational-sql.md", "01-relational-sql", "lab-sql", "SQL"),
    "02": ("02-partitions-replicas.md", "02-partitioning-replication", "lab-partitions", "Partitions / Replication"),
    "03": ("03-dwh-etl.md", "03-dwh-etl", "lab-dwh", "DWH & ETL"),
    "04": ("04-mapreduce.md", "04-mapreduce", "lab-mapreduce", "MapReduce"),
    "05": ("05-pagerank.md", "05-pagerank", "lab-pagerank", "PageRank"),
    "06": ("06-tfidf.md", "06-tfidf", "lab-tfidf", "TF-IDF"),
}


def read_settings(path: Path) -> dict[str, bool]:
    with path.open(encoding="utf-8") as handle:
        config = yaml.safe_load(handle)
    if not isinstance(config, dict) or set(config) != {"labs"} or not isinstance(config["labs"], dict):
        raise ValueError("Settings must contain only a labs mapping.")
    labs = config["labs"]
    if set(labs) != set(LABS) or any(type(value) is not bool for value in labs.values()):
        raise ValueError("Use quoted lab keys '01' through '06', each with true or false.")
    return labs


def require_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise ValueError(f"Cannot find expected {label} in course content; review release filtering.")
    return text.replace(old, new)


def prepare_lab02_browser(directory: Path) -> None:
    """Build the browser workspace from the authoritative assignment and hints."""
    assets = directory / "assets" / "lab02-browser"
    assets.mkdir(parents=True, exist_ok=True)
    # Copy from the source tree before Lab 01 filtering removes its separate
    # browser assets from the site. Lab 02 must work even when Lab 01 is hidden.
    shutil.copytree(ROOT / "docs" / "gitbook" / "assets" / "lab01-practice" / "pglite",
                    assets / "pglite", dirs_exist_ok=True)
    workspace = ROOT / "labs" / "02-partitioning-replication" / "workspace" / "server.py"
    spec = importlib.util.spec_from_file_location("_lab02_workspace", workspace)
    if spec is None or spec.loader is None:
        raise ValueError("Could not load the Lab 02 assignment parser.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assignment = ROOT / "labs" / "02-partitioning-replication" / "assignments" / "STUDENT_ASSIGNMENT.md"
    questions = module.questions_from_assignment(
        assignment,
        ROOT / "docs" / "gitbook" / "labs" / "02-exercises.md",
    )
    if len(questions) != 20 or any(not q.get("question") or not q.get("hint") for q in questions):
        raise ValueError("The Lab 02 browser workspace requires all 20 assignment questions and hints.")
    point_pairs = re.findall(r"^([ABCD][1-9])\s+\((\d+)\)\s+.+$",
                             assignment.read_text(encoding="utf-8"), re.MULTILINE)
    points = {key: int(value) for key, value in point_pairs}
    if len(point_pairs) != len(questions) or set(points) != {q["id"] for q in questions}:
        raise ValueError("The Lab 02 assignment points do not match the exercises.")
    for question in questions:
        question["points"] = points[question["id"]]
    (assets / "questions.json").write_text(json.dumps(questions, ensure_ascii=False), encoding="utf-8")


def prepare_lab03_browser(directory: Path) -> None:
    """Bundle the real sample setup and authoritative Lab 03 questions."""
    assets = directory / "assets" / "lab03-browser"
    assets.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ROOT / "docs" / "gitbook" / "assets" / "lab01-practice" / "pglite",
                    assets / "pglite", dirs_exist_ok=True)
    lab = ROOT / "labs" / "03-dwh-etl"
    for name in ("01_stage.sql", "02_dwh.sql"):
        shutil.copy2(lab / "sql" / name, assets / name)
    workspace = lab / "workspace" / "server.py"
    spec = importlib.util.spec_from_file_location("_lab03_workspace", workspace)
    if spec is None or spec.loader is None:
        raise ValueError("Could not load the Lab 03 assignment parser.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    questions = module.questions_from_assignment(
        lab / "STUDENT_ASSIGNMENT.md", ROOT / "docs/gitbook/labs/03-exercises.md"
    )
    if len(questions) != 18 or any(not q.get("question") or not q.get("hint") for q in questions):
        raise ValueError("The Lab 03 browser workspace requires all 18 assignment questions and hints.")
    (assets / "questions.json").write_text(json.dumps(questions, ensure_ascii=False), encoding="utf-8")


def prepare_lab04_browser(directory: Path) -> None:
    """Bundle the assignment and starter code for the local browser draft."""
    lab = ROOT / "labs" / "04-mapreduce"
    spec = importlib.util.spec_from_file_location("_lab04_workspace", lab / "workspace" / "server.py")
    if spec is None or spec.loader is None:
        raise ValueError("Could not load the Lab 04 assignment parser.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    questions = module.questions()
    if len(questions) != 11 or any(not q.get("question") or not q.get("hint") for q in questions):
        raise ValueError("The Lab 04 browser draft requires all 11 assignment questions and hints.")
    assets = directory / "assets" / "lab04-browser"
    assets.mkdir(parents=True, exist_ok=True)
    materials = {"questions": questions, "starter": (lab / "student_tasks.py").read_text(encoding="utf-8")}
    (assets / "materials.json").write_text(json.dumps(materials, ensure_ascii=False), encoding="utf-8")


def prepare_python_draft(directory: Path, number: str) -> None:
    """Bundle the authoritative assignment and starter for a browser draft."""
    lab = ROOT / "labs" / LABS[number][1]
    spec = importlib.util.spec_from_file_location(f"_lab{number}_workspace", lab / "workspace" / "server.py")
    if spec is None or spec.loader is None:
        raise ValueError(f"Could not load the Lab {number} assignment parser.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    questions = module.task_list()
    expected = 14 if number == "05" else 13
    if len(questions) != expected or any(not q.get("question") or not q.get("hint") for q in questions):
        raise ValueError(f"The Lab {number} browser draft requires all {expected} questions and hints.")
    assets = directory / "assets" / f"lab{number}-browser"
    assets.mkdir(parents=True, exist_ok=True)
    data = {"questions": questions, "starter": (lab / "student_tasks.py").read_text(encoding="utf-8")}
    (assets / "materials.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def filter_docs(directory: Path, enabled: dict[str, bool]) -> None:
    hidden = {number for number, is_enabled in enabled.items() if not is_enabled}
    for number in hidden:
        (directory / "labs" / LABS[number][0]).unlink()
    if "01" in hidden:
        (directory / "labs" / "01-window-functions.md").unlink()
        for page in ("01-sql-views.md", "01-useful-sql.md", "01-tutorial-practice.md", "01-interview.md", "01-test-yourself.md"):
            (directory / "labs" / page).unlink()
        (directory / "assets" / "h5p" / "lab01-window-partitions.h5p").unlink()
        (directory / "start-lab01.md").unlink()
        (directory / "images" / "setup" / "01-github-codespaces.png").unlink()
        shutil.rmtree(directory / "assets" / "lab01-practice")
        shutil.rmtree(directory / "assets" / "lab01-journey")
        for asset in ("javascripts/lab01-join.js", "javascripts/lab01-quiz.js", "javascripts/lab01-null.js",
                      "javascripts/lab01-window-frame.js", "javascripts/lab01-window-rank-lag.js",
                      "javascripts/lab01-family-aggregate.js", "javascripts/lab01-family-ranking.js",
                      "javascripts/lab01-family-navigation.js", "javascripts/lab01-function-explorer.js",
                      "javascripts/lab01-practice.js", "javascripts/lab01-practice-worker.js",
                      "javascripts/lab01-performance.js", "javascripts/lab01-performance-worker.js", "javascripts/lab01-useful-sql.js", "javascripts/lab01-views-worker.js",
                      "javascripts/lab01-order-journey.js",
                      "stylesheets/lab01-join.css", "stylesheets/lab01-quiz.css", "stylesheets/lab01-null.css",
                      "stylesheets/lab01-window-frame.css", "stylesheets/lab01-window-rank-lag.css",
                      "stylesheets/lab01-practice.css", "stylesheets/lab01-order-journey.css"):
            (directory / asset).unlink()
    if "02" in hidden:
        for page in ("02-exercises.md", "02-interview.md"):
            (directory / "labs" / page).unlink()
        (directory / "activities" / "lab02-learning-pack.md").unlink()
        shutil.rmtree(directory / "assets" / "lab02-browser")
        (directory / "javascripts" / "lab02-browser-worker.js").unlink()
        for asset in ("javascripts/lab02-browser.js", "stylesheets/lab02-browser.css",
                      "javascripts/lab02-explorer.js", "javascripts/lab02-quiz.js", "javascripts/lab02-months.js",
                      "stylesheets/lab02-explorer.css", "stylesheets/lab02-quiz.css", "stylesheets/lab02-months.css"):
            (directory / asset).unlink()

    if "03" in hidden:
        for page in ("03-exercises.md", "03-interview.md"):
            (directory / "labs" / page).unlink()
        shutil.rmtree(directory / "assets" / "lab03-browser", ignore_errors=True)
        for asset in ("javascripts/lab03-browser.js", "javascripts/lab03-browser-worker.js",
                      "stylesheets/lab03-browser.css"):
            (directory / asset).unlink()

    for number in ("03", "04", "05", "06"):
        if number in hidden:
            (directory / "activities" / f"lab{number}-learning-pack.md").unlink()
            for asset in (f"javascripts/lab{number}-pack.js", f"stylesheets/lab{number}-pack.css"):
                (directory / asset).unlink()

    if "04" in hidden:
        for page in ("04-exercises.md", "04-interview.md"):
            (directory / "labs" / page).unlink()
        shutil.rmtree(directory / "assets" / "lab04-browser", ignore_errors=True)
        for asset in ("javascripts/lab04-browser.js", "stylesheets/lab04-browser.css"):
            (directory / asset).unlink()
        for asset in ("javascripts/lab04-mean.js", "stylesheets/lab04-mean.css",
                      "javascripts/lab04-variance.js", "stylesheets/lab04-variance.css"):
            (directory / asset).unlink()

    for number in ("05", "06"):
        if number in hidden:
            for suffix in ("exercises", "interview"):
                (directory / "labs" / f"{number}-{suffix}.md").unlink()
            shutil.rmtree(directory / "assets" / f"lab{number}-browser", ignore_errors=True)
    if "05" in hidden and "06" in hidden:
        for asset in ("javascripts/python-draft.js", "stylesheets/python-draft.css"):
            (directory / asset).unlink()

    # Filter any Markdown line containing a direct link to a hidden lab page.
    # The remaining references to the public source repository are deliberate:
    # this feature controls the website, not access to repository contents.
    hidden_patterns = [re.compile(re.escape(LABS[n][0])) for n in hidden]
    if "01" in hidden:
        hidden_patterns.append(re.compile(re.escape("01-window-functions.md")))
        hidden_patterns.extend(re.compile(re.escape(page)) for page in ("01-sql-views.md", "01-useful-sql.md", "01-tutorial-practice.md", "01-interview.md", "01-test-yourself.md"))
    if "02" in hidden:
        hidden_patterns.extend(re.compile(re.escape(page)) for page in ("02-exercises.md", "02-interview.md"))
    if "03" in hidden:
        hidden_patterns.extend(re.compile(re.escape(page)) for page in ("03-exercises.md", "03-interview.md"))
    if "04" in hidden:
        hidden_patterns.extend(re.compile(re.escape(page)) for page in ("04-exercises.md", "04-interview.md"))
    for number in ("05", "06"):
        if number in hidden:
            hidden_patterns.extend(re.compile(re.escape(f"{number}-{suffix}.md")) for suffix in ("exercises", "interview"))
    for page in directory.rglob("*.md"):
        text = page.read_text(encoding="utf-8")
        if page == directory / "README.md":
            # Keep the course roadmap visible without linking to unreleased lessons.
            # Generate this from the source links so changing visibility restores
            # the normal link automatically.
            for number in hidden:
                pattern = re.compile(r"^- \[([^\]]+)\]\(labs/" + re.escape(LABS[number][0]) + r"\)([^\n]*)$", re.MULTILINE)
                text, count = pattern.subn(r'- <span class="course-lab-disabled"><span class="course-lab-unavailable">\1</span> <span class="course-lab-status">Coming soon</span>\2</span>', text)
                if count != 1:
                    raise ValueError(f"Expected one homepage entry for Lab {number}; found {count}.")
        lines = text.splitlines(keepends=True)
        text = "".join(line for line in lines if not any(p.search(line) for p in hidden_patterns))
        page.write_text(text, encoding="utf-8")

    if not hidden:
        return

    home = directory / "README.md"
    text = home.read_text(encoding="utf-8")
    # Drop empty visual sections so an all-hidden subject group has no empty heading.
    section = re.compile(r'<div class="course-section" markdown="1">\s*\n\s*### [^\n]+\n\s*</div>\s*', re.MULTILINE)
    text = section.sub("", text)
    if not any(enabled.values()):
        text = require_replace(text, '<div class="course-sections" markdown="1">',
                               'No workshops are currently available. Please check back later.\n\n<div class="course-sections" markdown="1">', "home course section")
    home.write_text(text, encoding="utf-8")

    getting = directory / "getting-started.md"
    text = getting.read_text(encoding="utf-8")
    if "01" in hidden:
        text = require_replace(text, "For a step-by-step first SQL workshop, follow [Start here: your first SQL lab](start-lab01.md).\n\n", "", "Lab 01 walkthrough link")
    for number in hidden:
        line = f"| {LABS[number][3]} | `make {LABS[number][2]}` |\n"
        text = require_replace(text, line, "", f"Lab {number} starter")
    text = text.replace("Lab 06 can be explored in Python alone, but its full 100-point assignment includes SQL: run `make lab-tfidf-sql` separately for that part.", "" if "06" in hidden else "Lab 06 can be explored in Python alone, but its full 100-point assignment includes SQL: run `make lab-tfidf-sql` separately for that part.")
    text = re.sub(r"For example, `make demo LAB=04-mapreduce` runs the demonstration.*?does not grade your SQL answers\.",
                  "Use the demonstration and test commands shown in each available workshop. Tests for unfinished Python exercises may fail until you implement them, and SQL checks do not grade your answers.", text, flags=re.DOTALL)
    if not any(enabled.values()):
        text = require_replace(text, "Run one command from the root:", "No workshops are available yet. The instructor will announce when the first one opens.", "starter heading")
        text = text.replace("| Lab | Command |\n|---|---|\n", "")
    getting.write_text(text, encoding="utf-8")

    course_map = directory / "course-map.md"
    text = course_map.read_text(encoding="utf-8")
    if not any(enabled[n] for n in ("01", "02", "03")):
        text = re.sub(r"^- For Labs 01–03,.*\n", "", text, flags=re.MULTILINE)
    else:
        text = text.replace("For Labs 01–03, review basic SQL:", "For the relational workshops, review basic SQL:")
    if not any(enabled[n] for n in ("04", "05", "06")):
        text = re.sub(r"^- For Labs 04–06,.*\n", "", text, flags=re.MULTILINE)
    else:
        text = text.replace("For Labs 04–06, you will write Python functions.", "For the distributed-computing workshops, you will write Python functions.")
        text = text.replace("Review these topics before Lab 04 if they are new to you;", "Review these topics if they are new to you;")
    if "06" in hidden:
        text = text.replace(" Lab 06's full 100-point assignment includes its PostgreSQL comparison and SQL query; its Python-only path is available for exploration.", "")
    course_map.write_text(text, encoding="utf-8")

    trouble = directory / "troubleshooting.md"
    text = trouble.read_text(encoding="utf-8")
    text = re.sub(r"For an unchanged initial sample, expect 15 customers.*?Student changes can legitimately change counts\.",
                  "Compare the data with the initial sample described in the available workshop. Student changes can legitimately alter counts.", text)
    if "01" in hidden:
        text = re.sub(r"## `service \"postgres\" is not running`\n.*?(?=## )",
                      "## A database service is not running\n\nRun the initializer shown in the available workshop and inspect the Docker Compose logs if it fails.\n\n", text, flags=re.DOTALL)
        text = re.sub(r"## `No rule to make target lab-sql`\n.*?(?=## )",
                      "## `No rule to make target`\n\nCheck that you are at the repository root and that your checkout is current.\n\n", text, flags=re.DOTALL)
        text = re.sub(r"## `EXPLAIN ANALYZE` output is too long\n.*?(?=## )", "", text, flags=re.DOTALL)
    trouble.write_text(text, encoding="utf-8")


def filtered_config(text: str, enabled: dict[str, bool]) -> str:
    text = require_replace(text, "docs_dir: docs/gitbook", "docs_dir: docs", "MkDocs docs_dir")
    # Refresh shared styling when its content changes, including in local previews.
    stylesheet = "stylesheets/extra.css"
    version = hashlib.sha256((ROOT / "docs/gitbook" / stylesheet).read_bytes()).hexdigest()[:12]
    text = require_replace(text, f"  - {stylesheet}\n", f"  - {stylesheet}?v={version}\n", "Shared course stylesheet")
    for number, is_enabled in enabled.items():
        if not is_enabled:
            text, count = re.subn(r"^\s{6}- Lab " + number + r"[^\n]*\n", "", text, flags=re.MULTILINE)
            if count != 1:
                raise ValueError(f"Expected one navigation entry for Lab {number}; found {count}.")
    if not enabled["01"]:
        text = require_replace(text, "      - Window functions: labs/01-window-functions.md\n", "", "Lab 01 window lesson nav")
        for label, page in (("SQL Views", "01-sql-views.md"), ("Useful SQL patterns", "01-useful-sql.md"), ("Tutorial & practice", "01-tutorial-practice.md"),
                            ("Job interview questions", "01-interview.md"),
                            ("Test yourself", "01-test-yourself.md")):
            text = require_replace(text, f"      - {label}: labs/{page}\n", "", f"Lab 01 {label} nav")
        for asset in ("stylesheets/lab01-join.css", "stylesheets/lab01-quiz.css", "stylesheets/lab01-null.css",
                      "stylesheets/lab01-window-frame.css", "stylesheets/lab01-window-rank-lag.css", "stylesheets/lab01-practice.css",
                      "stylesheets/lab01-order-journey.css",
                      "javascripts/lab01-join.js", "javascripts/lab01-quiz.js", "javascripts/lab01-null.js",
                      "javascripts/lab01-window-frame.js", "javascripts/lab01-window-rank-lag.js",
                      "javascripts/lab01-family-aggregate.js", "javascripts/lab01-family-ranking.js",
                      "javascripts/lab01-family-navigation.js", "javascripts/lab01-function-explorer.js", "javascripts/lab01-practice.js",
                      "javascripts/lab01-performance.js", "javascripts/lab01-useful-sql.js",
                      "javascripts/lab01-order-journey.js"):
            text = require_replace(text, f"  - {asset}\n", "", f"Lab 01 asset {asset}")
    else:
        # GitHub Pages/CDNs can retain old assets after deployment. Use content
        # fingerprints in the generated URLs, including the worker in the JS
        # version so a worker-only change also forces a fresh download.
        for asset, inputs in (
            ("stylesheets/lab01-practice.css", ("stylesheets/lab01-practice.css",)),
            ("javascripts/lab01-practice.js", ("javascripts/lab01-practice.js", "javascripts/lab01-practice-worker.js")),
            ("javascripts/lab01-performance.js", ("javascripts/lab01-performance.js", "javascripts/lab01-performance-worker.js")),
            ("javascripts/lab01-useful-sql.js", ("javascripts/lab01-useful-sql.js", "javascripts/lab01-practice-worker.js", "javascripts/lab01-views-worker.js")),
            ("stylesheets/lab01-window-frame.css", ("stylesheets/lab01-window-frame.css",)),
            ("stylesheets/lab01-order-journey.css", ("stylesheets/lab01-order-journey.css",)),
            ("javascripts/lab01-order-journey.js", ("javascripts/lab01-order-journey.js",)),
        ):
            digest = hashlib.sha256()
            for filename in inputs:
                digest.update((ROOT / "docs" / "gitbook" / filename).read_bytes())
            text = require_replace(text, f"  - {asset}\n", f"  - {asset}?v={digest.hexdigest()[:12]}\n", f"Lab 01 asset {asset}")
    if not enabled["02"]:
        for label, page in (("SQL exercises (Lab 02)", "02-exercises.md"), ("Interview questions (Lab 02)", "02-interview.md")):
            text = require_replace(text, f"      - {label}: labs/{page}\n", "", f"Lab 02 {label} nav")
        text = require_replace(text, "      - Partitioning practice & quiz: activities/lab02-learning-pack.md\n", "", "Lab 02 practice nav")
        for asset in ("stylesheets/lab02-explorer.css", "stylesheets/lab02-quiz.css", "stylesheets/lab02-months.css",
                      "stylesheets/lab02-browser.css", "javascripts/lab02-browser.js",
                      "javascripts/lab02-explorer.js", "javascripts/lab02-quiz.js", "javascripts/lab02-months.js"):
            text = require_replace(text, f"  - {asset}\n", "", f"Lab 02 asset {asset}")
    else:
        # Include the worker, data and assignment in the app version so CDN
        # caches cannot mix a new interface with stale practice materials.
        for asset, inputs in (
            ("stylesheets/lab02-browser.css", (ROOT / "docs/gitbook/stylesheets/lab02-browser.css",)),
            ("javascripts/lab02-browser.js", (
                ROOT / "docs/gitbook/javascripts/lab02-browser.js",
                ROOT / "docs/gitbook/javascripts/lab02-browser-worker.js",
                ROOT / "docs/gitbook/assets/lab02-browser/seed.sql",
                ROOT / "labs/02-partitioning-replication/assignments/STUDENT_ASSIGNMENT.md",
                ROOT / "docs/gitbook/labs/02-exercises.md",
            )),
        ):
            digest = hashlib.sha256()
            for path in inputs:
                digest.update(path.read_bytes())
            text = require_replace(text, f"  - {asset}\n", f"  - {asset}?v={digest.hexdigest()[:12]}\n", f"Lab 02 asset {asset}")
    for number, label in (("03", "Warehouse"), ("04", "MapReduce"),
                          ("05", "PageRank"), ("06", "TF-IDF")):
        if not enabled[number]:
            text = require_replace(text, f"      - {label} practice & quiz: activities/lab{number}-learning-pack.md\n", "", f"Lab {number} practice nav")
            for asset in (f"stylesheets/lab{number}-pack.css", f"javascripts/lab{number}-pack.js"):
                text = require_replace(text, f"  - {asset}\n", "", f"Lab {number} asset {asset}")
    if not enabled["03"]:
        for label, page in (("SQL exercises (Lab 03)", "03-exercises.md"), ("Interview questions (Lab 03)", "03-interview.md")):
            text = require_replace(text, f"      - {label}: labs/{page}\n", "", f"Lab 03 {label} nav")
        for asset in ("stylesheets/lab03-browser.css", "javascripts/lab03-browser.js"):
            text = require_replace(text, f"  - {asset}\n", "", f"Lab 03 asset {asset}")
    else:
        for asset, inputs in (
            ("stylesheets/lab03-browser.css", (ROOT / "docs/gitbook/stylesheets/lab03-browser.css",)),
            ("javascripts/lab03-browser.js", (
                ROOT / "docs/gitbook/javascripts/lab03-browser.js",
                ROOT / "docs/gitbook/javascripts/lab03-browser-worker.js",
                ROOT / "labs/03-dwh-etl/sql/01_stage.sql",
                ROOT / "labs/03-dwh-etl/sql/02_dwh.sql",
                ROOT / "labs/03-dwh-etl/STUDENT_ASSIGNMENT.md",
                ROOT / "docs/gitbook/labs/03-exercises.md",
            )),
        ):
            digest = hashlib.sha256()
            for path in inputs:
                digest.update(path.read_bytes())
            text = require_replace(text, f"  - {asset}\n", f"  - {asset}?v={digest.hexdigest()[:12]}\n", f"Lab 03 asset {asset}")
    if not enabled["04"]:
        for label, page in (("Exercises (Lab 04)", "04-exercises.md"), ("Interview questions (Lab 04)", "04-interview.md")):
            text = require_replace(text, f"      - {label}: labs/{page}\n", "", f"Lab 04 {label} nav")
        for asset in ("javascripts/lab04-mean.js", "stylesheets/lab04-mean.css",
                      "javascripts/lab04-variance.js", "stylesheets/lab04-variance.css",
                      "javascripts/lab04-browser.js", "stylesheets/lab04-browser.css"):
            text = require_replace(text, f"  - {asset}\n", "", f"Lab 04 asset {asset}")
    else:
        for asset, inputs in (
            ("stylesheets/lab04-browser.css", (ROOT / "docs/gitbook/stylesheets/lab04-browser.css",)),
            ("javascripts/lab04-browser.js", (ROOT / "docs/gitbook/javascripts/lab04-browser.js",
                 ROOT / "labs/04-mapreduce/STUDENT_ASSIGNMENT.md", ROOT / "labs/04-mapreduce/student_tasks.py",
                 ROOT / "docs/gitbook/labs/04-exercises.md")),
        ):
            digest = hashlib.sha256()
            for path in inputs:
                digest.update(path.read_bytes())
            text = require_replace(text, f"  - {asset}\n", f"  - {asset}?v={digest.hexdigest()[:12]}\n", f"Lab 04 asset {asset}")
    for number in ("05", "06"):
        if not enabled[number]:
            for label, suffix in (("Exercises", "exercises"), ("Interview questions", "interview")):
                text = require_replace(text, f"      - {label} (Lab {number}): labs/{number}-{suffix}.md\n", "", f"Lab {number} {label} nav")
    if not enabled["05"] and not enabled["06"]:
        for asset in ("javascripts/python-draft.js", "stylesheets/python-draft.css"):
            text = require_replace(text, f"  - {asset}\n", "", f"Python draft asset {asset}")
    else:
        # Fingerprint the editor and all enabled assignment inputs together.
        inputs = [ROOT / "docs/gitbook/javascripts/python-draft.js"]
        for number in ("05", "06"):
            if enabled[number]:
                lab = ROOT / "labs" / LABS[number][1]
                inputs.extend((lab / "STUDENT_ASSIGNMENT.md", lab / "student_tasks.py", ROOT / f"docs/gitbook/labs/{number}-exercises.md"))
        for asset, files in (("javascripts/python-draft.js", inputs), ("stylesheets/python-draft.css", [ROOT / "docs/gitbook/stylesheets/python-draft.css"])):
            digest = hashlib.sha256()
            for path in files:
                digest.update(path.read_bytes())
            text = require_replace(text, f"  - {asset}\n", f"  - {asset}?v={digest.hexdigest()[:12]}\n", f"Python draft asset {asset}")
    if not any(enabled.values()):
        text = require_replace(text, "extra_javascript:\n\n", "extra_javascript: []\n\n", "empty JavaScript list")
    for label, nums in (("Relational Data Engineering", ("01", "02", "03")),
                        ("Distributed Data Processing", ("04", "05", "06"))):
        if not any(enabled[n] for n in nums):
            text = require_replace(text, f"  - {label}:\n", "", f"{label} nav group")
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--settings", type=Path, default=ROOT / "lab-visibility.yml")
    parser.add_argument("--site-dir", type=Path, default=ROOT / "site")
    args = parser.parse_args()
    try:
        enabled = read_settings(args.settings)
        with tempfile.TemporaryDirectory(prefix="course-site-") as tmp:
            tmp_path = Path(tmp)
            docs = tmp_path / "docs"
            shutil.copytree(ROOT / "docs" / "gitbook", docs)
            if enabled["02"]:
                prepare_lab02_browser(docs)
            if enabled["03"]:
                prepare_lab03_browser(docs)
            if enabled["04"]:
                prepare_lab04_browser(docs)
            for number in ("05", "06"):
                if enabled[number]:
                    prepare_python_draft(docs, number)
            filter_docs(docs, enabled)
            config = tmp_path / "mkdocs.yml"
            config.write_text(filtered_config((ROOT / "mkdocs.yml").read_text(encoding="utf-8"), enabled), encoding="utf-8")
            subprocess.run([sys.executable, "-m", "mkdocs", "build", "--strict", "--config-file", str(config), "--site-dir", str(args.site_dir.resolve())], check=True)
    except (OSError, ValueError, yaml.YAMLError, subprocess.CalledProcessError) as exc:
        print(f"Course website build failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

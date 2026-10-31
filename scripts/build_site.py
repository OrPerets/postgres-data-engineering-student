#!/usr/bin/env python3
"""Build a filtered course website without changing the source documents.

The GitHub repository is public: hiding a lab here is not an access control.
"""
from __future__ import annotations

import argparse
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


def filter_docs(directory: Path, enabled: dict[str, bool]) -> None:
    hidden = {number for number, is_enabled in enabled.items() if not is_enabled}
    for number in hidden:
        (directory / "labs" / LABS[number][0]).unlink()
    if "01" in hidden:
        (directory / "labs" / "01-window-functions.md").unlink()
        (directory / "activities" / "lab01-learning-pack.md").unlink()
        (directory / "assets" / "h5p" / "lab01-window-partitions.h5p").unlink()
        (directory / "start-lab01.md").unlink()
        (directory / "images" / "setup" / "01-github-codespaces.png").unlink()
        for asset in ("javascripts/lab01-join.js", "javascripts/lab01-quiz.js", "javascripts/lab01-null.js",
                      "javascripts/lab01-window-frame.js", "javascripts/lab01-window-rank-lag.js",
                      "stylesheets/lab01-join.css", "stylesheets/lab01-quiz.css", "stylesheets/lab01-null.css",
                      "stylesheets/lab01-window-frame.css", "stylesheets/lab01-window-rank-lag.css"):
            (directory / asset).unlink()
    if "02" in hidden:
        (directory / "activities" / "lab02-learning-pack.md").unlink()
        for asset in ("javascripts/lab02-explorer.js", "javascripts/lab02-quiz.js", "javascripts/lab02-months.js",
                      "stylesheets/lab02-explorer.css", "stylesheets/lab02-quiz.css", "stylesheets/lab02-months.css"):
            (directory / asset).unlink()

    for number in ("03", "04", "05", "06"):
        if number in hidden:
            (directory / "activities" / f"lab{number}-learning-pack.md").unlink()
            for asset in (f"javascripts/lab{number}-pack.js", f"stylesheets/lab{number}-pack.css"):
                (directory / asset).unlink()

    if "04" in hidden:
        for asset in ("javascripts/lab04-mean.js", "stylesheets/lab04-mean.css",
                      "javascripts/lab04-variance.js", "stylesheets/lab04-variance.css"):
            (directory / asset).unlink()

    # Filter any Markdown line containing a direct link to a hidden lab page.
    # The remaining references to the public source repository are deliberate:
    # this feature controls the website, not access to repository contents.
    hidden_patterns = [re.compile(re.escape(LABS[n][0])) for n in hidden]
    if "01" in hidden:
        hidden_patterns.append(re.compile(re.escape("01-window-functions.md")))
    for page in directory.rglob("*.md"):
        text = page.read_text(encoding="utf-8")
        lines = text.splitlines(keepends=True)
        text = "".join(line for line in lines if not any(p.search(line) for p in hidden_patterns))
        page.write_text(text, encoding="utf-8")

    if not hidden:
        return

    home = directory / "README.md"
    text = home.read_text(encoding="utf-8")
    text = require_replace(text, "Six workshops follow a path from SQL fundamentals to distributed algorithms.",
                           "The workshops follow a path from SQL fundamentals to distributed algorithms.", "home introduction")
    text = require_replace(text, "## One workflow, six labs", "## One workflow for every lab", "home workflow")
    # Drop empty visual sections so an all-hidden subject group has no empty heading.
    section = re.compile(r'<div class="course-section" markdown="1">\s*\n\s*### [^\n]+\n\s*</div>\s*', re.MULTILINE)
    text = section.sub("", text)
    if not any(enabled.values()):
        text = require_replace(text, '<div class="course-sections" markdown="1">',
                               'No workshops are currently available. Please check back later.\n\n<div class="course-sections" markdown="1">', "home course section")
    if not enabled["01"]:
        start = re.compile(r"### Ready to begin\?\n.*?(?=For help, see )", re.DOTALL)
        replacement = "### Ready to begin?\n\nChoose an available workshop above and follow its setup instructions.\n\n" if any(enabled.values()) else "### Ready to begin?\n\nWorkshop materials will appear here when they are available.\n\n"
        text, count = start.subn(replacement, text, count=1)
        if count != 1:
            raise ValueError("Cannot find homepage getting-started section.")
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
    for number, is_enabled in enabled.items():
        if not is_enabled:
            text, count = re.subn(r"^\s{6}- Lab " + number + r"[^\n]*\n", "", text, flags=re.MULTILINE)
            if count != 1:
                raise ValueError(f"Expected one navigation entry for Lab {number}; found {count}.")
    if not enabled["01"]:
        text = require_replace(text, "      - First SQL lab: start-lab01.md\n", "", "Lab 01 walkthrough nav")
        text = require_replace(text, "      - Window functions: labs/01-window-functions.md\n", "", "Lab 01 window lesson nav")
        text = require_replace(text, "      - SQL practice & quiz: activities/lab01-learning-pack.md\n", "", "Lab 01 practice nav")
        for asset in ("stylesheets/lab01-join.css", "stylesheets/lab01-quiz.css", "stylesheets/lab01-null.css",
                      "stylesheets/lab01-window-frame.css", "stylesheets/lab01-window-rank-lag.css",
                      "javascripts/lab01-join.js", "javascripts/lab01-quiz.js", "javascripts/lab01-null.js",
                      "javascripts/lab01-window-frame.js", "javascripts/lab01-window-rank-lag.js"):
            text = require_replace(text, f"  - {asset}\n", "", f"Lab 01 asset {asset}")
    if not enabled["02"]:
        text = require_replace(text, "      - Partitioning practice & quiz: activities/lab02-learning-pack.md\n", "", "Lab 02 practice nav")
        for asset in ("stylesheets/lab02-explorer.css", "stylesheets/lab02-quiz.css", "stylesheets/lab02-months.css",
                      "javascripts/lab02-explorer.js", "javascripts/lab02-quiz.js", "javascripts/lab02-months.js"):
            text = require_replace(text, f"  - {asset}\n", "", f"Lab 02 asset {asset}")
    for number, label in (("03", "Warehouse"), ("04", "MapReduce"),
                          ("05", "PageRank"), ("06", "TF-IDF")):
        if not enabled[number]:
            text = require_replace(text, f"      - {label} practice & quiz: activities/lab{number}-learning-pack.md\n", "", f"Lab {number} practice nav")
            for asset in (f"stylesheets/lab{number}-pack.css", f"javascripts/lab{number}-pack.js"):
                text = require_replace(text, f"  - {asset}\n", "", f"Lab {number} asset {asset}")
    if not enabled["04"]:
        for asset in ("javascripts/lab04-mean.js", "stylesheets/lab04-mean.css",
                      "javascripts/lab04-variance.js", "stylesheets/lab04-variance.css"):
            text = require_replace(text, f"  - {asset}\n", "", f"Lab 04 asset {asset}")
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

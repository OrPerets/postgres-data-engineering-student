# Data Engineering — Hands-on Labs

Practice SQL, PostgreSQL, data warehousing and distributed data processing with six workshops. Start with the [course website](https://orperets.github.io/postgres-data-engineering-student/) and the [getting-started guide](docs/GETTING_STARTED.md).

From the repository root, run `make help` to see the available lab starters. SQL labs use PostgreSQL containers; Labs 04–06 can be explored in Python. The full TF-IDF assignment includes a PostgreSQL exercise. Demo checks do not grade student SQL, and unfinished Python exercises are expected to fail their student tests.

The supplied data and credentials are for classroom use only. Back up your work before repairing or resetting a lab. Codespaces quotas and availability depend on your account.

To preview the course site locally, run these commands from the repository root:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-docs.txt
.venv/bin/python scripts/serve_site.py
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/). Edit the files under `docs/gitbook` and save; the preview rebuilds and refreshes automatically. It uses the same `lab-visibility.yml` filtering as the published site. If a build fails, the terminal shows the error and the last successful preview stays available; save a fix to try again. Press **Ctrl+C** in the terminal to stop. If port 8000 is in use, pass `--port 8001` and open that port instead. Local edits are not published automatically.

To preview different workshop visibility without changing the publication settings, copy `lab-visibility.yml` to a file outside the repository, edit that copy, and pass it to the preview with `--settings /path/to/your-copy.yml`. Changes to that file will also refresh the preview.

## Managing workshop visibility

Edit [`lab-visibility.yml`](lab-visibility.yml) to choose which workshop pages appear on the course website. See [course administration](COURSE_ADMIN.md) for the steps and the limitations of a public repository.

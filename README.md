# Data Engineering — Hands-on Labs

Practice SQL, PostgreSQL, data warehousing and distributed data processing with six workshops. Start with the [course website](https://orperets.github.io/postgres-data-engineering-student/) and the [getting-started guide](docs/GETTING_STARTED.md).

From the repository root, run `make help` to see the available lab starters. SQL labs use PostgreSQL containers; Labs 04–06 can be explored in Python. The full TF-IDF assignment includes a PostgreSQL exercise. Demo checks do not grade student SQL, and unfinished Python exercises are expected to fail their student tests.

The supplied data and credentials are for classroom use only. Back up your work before repairing or resetting a lab. Codespaces quotas and availability depend on your account.

To preview the course site locally:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-docs.txt
.venv/bin/mkdocs serve
```

## Managing workshop visibility

Edit [`lab-visibility.yml`](lab-visibility.yml) to choose which workshop pages appear on the course website. See [course administration](COURSE_ADMIN.md) for the steps and the limitations of a public repository.

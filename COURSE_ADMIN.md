# Manage course website visibility

The course website publishes only the workshops enabled in [`lab-visibility.yml`](lab-visibility.yml). Changes to this file on `main` automatically trigger a GitHub Actions build and redeployment.

## Show or hide a workshop

1. Open [lab-visibility.yml on GitHub](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/lab-visibility.yml) while signed in to an account with write access.
2. Select the pencil icon to edit the file.
3. Change the workshop's value to `true` to show it or `false` to hide it. Keep the other values unchanged. For example, to add Lab 02, set `'02': true`.
4. Select **Commit changes** and commit to `main`. The [Pages workflow](https://github.com/OrPerets/postgres-data-engineering-student/actions/workflows/pages.yml) will rebuild the site. Refresh the site after the run succeeds.

The release setting affects the built website, including navigation, page links and search. This is **not access control**: the student repository is public, so workshop source files, Git history and previously saved copies remain accessible even when a workshop is hidden from the website. Keep confidential materials and instructor answers outside public repositories.

## Local release build

Install `requirements-docs.txt` and run `python scripts/build_site.py --site-dir site` with the virtual environment active. The build validates the visibility file and fails rather than deploying an invalid configuration. The regular `mkdocs serve` preview reads the unfiltered source pages, so use the release build to check the published view.

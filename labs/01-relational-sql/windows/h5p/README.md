# Lab 01 H5P activity

The site embeds `docs/gitbook/assets/h5p/lab01-window-partitions.h5p`. Its
question text and answer feedback are in `content.json` here, for review and
maintenance. The `.h5p` archive contains that content, its H5P manifest and
runtime libraries; it can be rendered on the static site without a server.
It is a text-only multiple-selection activity: for order 104 the two preceding
rows and current row are orders 102, 103 and 104. It runs locally and does not
execute SQL or submit answers.

After editing `content.json`, update the package from the repository root:

```bash
python labs/01-relational-sql/windows/h5p/update_package.py
python -m unittest discover -s tests -p 'test_lab01_h5p.py' -v
python scripts/build_site.py --site-dir site
```

The package contains original activity text and redistributable H5P runtime
libraries from the official H5P Multiple Choice sample; the sample's question
and image were removed. Third-party license notices and the locally hosted
player's license are in `docs/gitbook/assets/h5p-player/`. The package includes
runtime libraries, not the optional H5P editor libraries; test import before
assuming a particular graphical H5P editor can edit it.

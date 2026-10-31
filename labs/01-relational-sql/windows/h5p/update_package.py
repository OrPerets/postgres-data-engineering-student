"""Update the H5P package's authored content while retaining its libraries."""
from pathlib import Path
import json
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[4]
PACKAGE = ROOT / 'docs/gitbook/assets/h5p/lab01-window-partitions.h5p'
CONTENT = Path(__file__).with_name('content.json')


def main():
    # Validate before touching the existing archive.
    json.loads(CONTENT.read_text(encoding='utf-8'))
    with tempfile.NamedTemporaryFile(dir=PACKAGE.parent, suffix='.h5p', delete=False) as tmp:
        target = Path(tmp.name)
    try:
        with zipfile.ZipFile(PACKAGE) as source, zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as result:
            for info in source.infolist():
                data = CONTENT.read_bytes() if info.filename == 'content/content.json' else source.read(info.filename)
                result.writestr(info, data)
        target.replace(PACKAGE)
    finally:
        target.unlink(missing_ok=True)


if __name__ == '__main__':
    main()

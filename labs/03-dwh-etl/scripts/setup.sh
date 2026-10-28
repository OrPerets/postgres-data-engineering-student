#!/usr/bin/env bash
# Keep the legacy entry point consistent with the preserving root initializer.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec bash "$ROOT/scripts/student-init.sh" 03-dwh-etl

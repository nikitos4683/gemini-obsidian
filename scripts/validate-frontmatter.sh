#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"

set +e
node "$PLUGIN_ROOT/dist/index.js" validate_frontmatter --hook </dev/stdin >/dev/null
status=$?
set -e

if [ "$status" -eq 0 ]; then
  printf '{}\n'
  exit 0
fi

exit "$status"

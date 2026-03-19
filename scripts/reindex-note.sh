#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"

if ! node "$PLUGIN_ROOT/dist/index.js" obsidian_rag_index --hook </dev/stdin >/dev/null; then
  printf '{}\n'
  exit 0
fi

printf '{}\n'

#!/usr/bin/env bash
# Runs `npm run build` and fails if it prints any warning (#210). Vite, Rollup and Svelte print warnings on stderr and
# a clean build prints nothing there, so any stderr output counts. Used by test.yml and deploy.yml.
set -euo pipefail

log="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/build-stderr.txt"

npm run build 2> "$log" || { cat "$log" >&2; exit 1; }
if [ -s "$log" ]; then
  cat "$log" >&2
  echo "::error title=Build warnings::npm run build printed warnings (above). Fix them before merging or deploying."
  exit 1
fi

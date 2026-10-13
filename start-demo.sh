#!/bin/sh
# Starts a local copy of the platform with demo data (macOS / Linux).
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install version 22 or newer from https://nodejs.org and run this again."
  exit 1
fi
exec node --disable-warning=ExperimentalWarning scripts/demo.js "$@"

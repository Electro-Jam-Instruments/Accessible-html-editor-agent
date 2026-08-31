#!/usr/bin/env bash
# Headless Chromium with NO X server at all, bridged to AT-SPI.
#   ./run-headless-nox.sh [outdir]
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-/tmp/atspi-out-nox}"
exec dbus-run-session -- "$HERE/stack-nox.sh" "$HERE/_inner.sh" headless "$OUT"

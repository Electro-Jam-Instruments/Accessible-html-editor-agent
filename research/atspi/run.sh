#!/usr/bin/env bash
# Full probe: stand up AT-SPI, start the recorder, run the pillar driver.
#   ./run.sh [x11|headless] [outdir]
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-x11}"
OUT="${2:-/tmp/atspi-out-$MODE}"
mkdir -p "$OUT"
exec dbus-run-session -- "$HERE/stack.sh" "$HERE/_inner.sh" "$MODE" "$OUT"

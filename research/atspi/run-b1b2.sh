#!/usr/bin/env bash
# B1 (editable vs read-only list) + B2 (blockquote crossing) captures,
# headless with no X server. Usage: ./run-b1b2.sh [outdir]
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-/tmp/atspi-b1b2}"
exec dbus-run-session -- "$HERE/stack-nox.sh" "$HERE/_inner-b1b2.sh" "$OUT"

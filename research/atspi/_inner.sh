#!/usr/bin/env bash
# Runs inside the AT-SPI stack. Not meant to be called directly.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="$1"; OUT="$2"
mkdir -p "$OUT"
EVENTS="$OUT/events-$MODE.jsonl"
: > "$EVENTS"

# Raw wire tap: proves whether any observed reordering is on the D-Bus wire or
# introduced by libatspi's client-side dispatch.
if command -v dbus-monitor >/dev/null; then
  dbus-monitor --address "$AT_SPI_BUS_ADDRESS" --profile >"$OUT/wire-$MODE.tsv" 2>/dev/null &
  WIRE=$!
fi

/usr/bin/python3.12 "$HERE/recorder.py" "$EVENTS" >"$OUT/recorder-$MODE.log" 2>&1 &
REC=$!
# wait for the recorder to have actually registered its listeners
for _ in $(seq 1 200); do grep -q '"meta": "registered"' "$EVENTS" && break; sleep 0.05; done
grep -q '"meta": "registered"' "$EVENTS" || { echo "recorder failed to register"; cat "$OUT/recorder-$MODE.log"; exit 1; }
echo "[inner] recorder registered (pid $REC)"

set +e
node "$HERE/driver.mjs" "$MODE" "$EVENTS" 2>&1 | tee "$OUT/driver-$MODE.log"
RC=${PIPESTATUS[0]}
set -e
kill -TERM $REC ${WIRE:-} 2>/dev/null || true
wait $REC 2>/dev/null || true
echo "[inner] driver rc=$RC; events -> $EVENTS ($(wc -l < "$EVENTS") lines)"
exit $RC

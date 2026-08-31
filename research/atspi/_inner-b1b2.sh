#!/usr/bin/env bash
# Runs inside the AT-SPI stack (stack-nox.sh). Not meant to be called directly.
# Runs the B1 and B2 captures back to back, each with its own recorder + files.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$1"
mkdir -p "$OUT"

run_one() {
  local scen="$1"
  local events="$OUT/events-$scen.jsonl"
  local tree="$OUT/tree-$scen.json"
  : > "$events"
  rm -f "${events%.jsonl}-notes.jsonl"

  /usr/bin/python3.12 "$HERE/recorder-b1b2.py" "$events" >"$OUT/recorder-$scen.log" 2>&1 &
  local rec=$!
  for _ in $(seq 1 200); do grep -q '"meta": "registered"' "$events" && break; sleep 0.05; done
  grep -q '"meta": "registered"' "$events" || { echo "recorder failed to register"; cat "$OUT/recorder-$scen.log"; exit 1; }
  echo "[inner-b1b2] $scen: recorder registered (pid $rec)"

  set +e
  node "$HERE/driver-b1b2.mjs" "$scen" "$events" "$tree" 2>&1 | tee "$OUT/driver-$scen.log"
  local rc=${PIPESTATUS[0]}
  set -e
  kill -TERM $rec 2>/dev/null || true
  wait $rec 2>/dev/null || true
  echo "[inner-b1b2] $scen: driver rc=$rc; events -> $events ($(wc -l < "$events") lines)"
  return $rc
}

run_one b1
run_one b2

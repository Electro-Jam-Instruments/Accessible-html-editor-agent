#!/usr/bin/env bash
# Negative controls for AtkUtilAuraLinux::ShouldEnableAccessibility().
# Runs the driver three extra ways and reports how many AT-SPI events each yields.
# Must run inside stack.sh / stack-nox.sh.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="$1"; OUT="$2"; mkdir -p "$OUT"

probe() {
  local label="$1"; shift
  local ev="$OUT/gate-$label.jsonl"; : > "$ev"
  /usr/bin/python3.12 "$HERE/recorder.py" "$ev" >/dev/null 2>&1 &
  local rec=$!
  for _ in $(seq 1 200); do grep -q '"meta": "registered"' "$ev" && break; sleep 0.05; done
  ( env "$@" node "$HERE/driver.mjs" "$MODE" "$ev" ) >"$OUT/gate-$label-driver.log" 2>&1
  local rc=$?
  kill -TERM $rec 2>/dev/null; wait $rec 2>/dev/null
  local n; n=$(grep -c '"type"' "$ev")
  local markers; markers=$(grep -c '"marker"' "$ev")
  echo "GATE $label: driver_rc=$rc atspi_events=$n markers_observed=$markers  [$*]"
}

probe "baseline"        ACCESSIBILITY_ENABLED=1
probe "chrome_headless" ACCESSIBILITY_ENABLED=1 CHROME_HEADLESS=1
probe "no_env_flag"     ACCESSIBILITY_ENABLED= GNOME_ACCESSIBILITY= QT_ACCESSIBILITY=
probe "no_atspi_bus"    ACCESSIBILITY_ENABLED=1 AT_SPI_BUS_ADDRESS=

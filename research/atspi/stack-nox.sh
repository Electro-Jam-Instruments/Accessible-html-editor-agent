#!/usr/bin/env bash
# Same as stack.sh but with NO X server at all: a11y bus + registry only.
# Used to answer "does Chromium's ATK bridge work under --headless=new with no display?"
set -euo pipefail
RUN_DIR="${RUN_DIR:-$(mktemp -d /tmp/atspi-nox.XXXXXX)}"
log() { echo "[stack-nox] $*" >&2; }
[[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ]] || { echo "run under dbus-run-session"; exit 1; }
unset DISPLAY || true
/usr/libexec/at-spi-bus-launcher --launch-immediately --a11y=1 --screen-reader=0 >"$RUN_DIR/bus.log" 2>&1 &
BUS_PID=$!
A11Y_ADDR=""
for _ in $(seq 1 200); do
  A11Y_ADDR=$(gdbus call --session --dest org.a11y.Bus --object-path /org/a11y/bus \
      --method org.a11y.Bus.GetAddress 2>/dev/null | sed -E "s/^\('(.*)',\)$/\1/") || A11Y_ADDR=""
  [[ -n "$A11Y_ADDR" ]] && break; sleep 0.05
done
[[ -n "$A11Y_ADDR" ]] || { log "FATAL: no a11y bus"; cat "$RUN_DIR/bus.log" >&2; exit 1; }
export AT_SPI_BUS_ADDRESS="$A11Y_ADDR"
log "a11y bus: $AT_SPI_BUS_ADDRESS (no DISPLAY)"
/usr/libexec/at-spi2-registryd >"$RUN_DIR/registryd.log" 2>&1 &
REG_PID=$!
for _ in $(seq 1 200); do
  gdbus call --address "$AT_SPI_BUS_ADDRESS" --dest org.freedesktop.DBus --object-path /org/freedesktop/DBus \
    --method org.freedesktop.DBus.NameHasOwner org.a11y.atspi.Registry 2>/dev/null | grep -q true && break
  sleep 0.05
done
log "registryd up"
trap 'kill $REG_PID $BUS_PID 2>/dev/null || true' EXIT
export ACCESSIBILITY_ENABLED=1 GNOME_ACCESSIBILITY=1
unset CHROME_HEADLESS
"$@"

#!/usr/bin/env bash
# Stand up an AT-SPI2 stack (private D-Bus session + Xvfb + a11y bus + registry),
# then exec "$@" inside it.
#
# Must be invoked under `dbus-run-session --`, e.g.:
#   dbus-run-session -- ./stack.sh ./run-something.sh
#
# Exports for the child: DISPLAY, AT_SPI_BUS_ADDRESS, ACCESSIBILITY_ENABLED,
# GTK_MODULES, and NOT CHROME_HEADLESS (explicitly unset -- Chromium's
# AtkUtilAuraLinux::ShouldEnableAccessibility() returns false when it is set).
set -euo pipefail

RUN_DIR="${RUN_DIR:-$(mktemp -d /tmp/atspi-stack.XXXXXX)}"
DISPLAY_NUM="${DISPLAY_NUM:-99}"
export RUN_DIR
log() { echo "[stack] $*" >&2; }

if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]]; then
  echo "[stack] FATAL: no DBUS_SESSION_BUS_ADDRESS; run me under dbus-run-session" >&2
  exit 1
fi
log "session bus: $DBUS_SESSION_BUS_ADDRESS"
log "run dir:     $RUN_DIR"

# --- Xvfb ------------------------------------------------------------------
Xvfb ":${DISPLAY_NUM}" -screen 0 1024x768x24 -nolisten tcp >"$RUN_DIR/xvfb.log" 2>&1 &
XVFB_PID=$!
export DISPLAY=":${DISPLAY_NUM}"
# Wait for the X socket to actually exist rather than sleeping.
for _ in $(seq 1 200); do
  [[ -S "/tmp/.X11-unix/X${DISPLAY_NUM}" ]] && break
  kill -0 "$XVFB_PID" 2>/dev/null || { log "FATAL: Xvfb died"; cat "$RUN_DIR/xvfb.log" >&2; exit 1; }
  sleep 0.05
done
[[ -S "/tmp/.X11-unix/X${DISPLAY_NUM}" ]] || { log "FATAL: X socket never appeared"; exit 1; }
log "Xvfb up on $DISPLAY (pid $XVFB_PID)"

dbus-update-activation-environment --systemd DISPLAY="$DISPLAY" 2>/dev/null \
  || dbus-update-activation-environment DISPLAY="$DISPLAY" 2>/dev/null \
  || log "warn: dbus-update-activation-environment failed (harmless without systemd)"

# --- a11y bus --------------------------------------------------------------
/usr/libexec/at-spi-bus-launcher --launch-immediately --a11y=1 --screen-reader=0 \
  >"$RUN_DIR/bus-launcher.log" 2>&1 &
BUS_PID=$!

A11Y_ADDR=""
for _ in $(seq 1 200); do
  A11Y_ADDR=$(gdbus call --session --dest org.a11y.Bus --object-path /org/a11y/bus \
      --method org.a11y.Bus.GetAddress 2>/dev/null \
      | sed -E "s/^\('(.*)',\)$/\1/") || A11Y_ADDR=""
  [[ -n "$A11Y_ADDR" ]] && break
  sleep 0.05
done
[[ -n "$A11Y_ADDR" ]] || { log "FATAL: could not resolve org.a11y.Bus address"; cat "$RUN_DIR/bus-launcher.log" >&2; exit 1; }
export AT_SPI_BUS_ADDRESS="$A11Y_ADDR"
log "a11y bus:    $AT_SPI_BUS_ADDRESS"

# --- registry --------------------------------------------------------------
/usr/libexec/at-spi2-registryd --use-gnome-session >"$RUN_DIR/registryd.log" 2>&1 &
REG_PID=$!
for _ in $(seq 1 200); do
  if gdbus call --address "$AT_SPI_BUS_ADDRESS" --dest org.freedesktop.DBus \
       --object-path /org/freedesktop/DBus --method org.freedesktop.DBus.NameHasOwner \
       org.a11y.atspi.Registry 2>/dev/null | grep -q true; then
    break
  fi
  sleep 0.05
done
gdbus call --address "$AT_SPI_BUS_ADDRESS" --dest org.freedesktop.DBus \
  --object-path /org/freedesktop/DBus --method org.freedesktop.DBus.NameHasOwner \
  org.a11y.atspi.Registry 2>/dev/null | grep -q true \
  || { log "FATAL: at-spi2-registryd never owned org.a11y.atspi.Registry"; cat "$RUN_DIR/registryd.log" >&2; exit 1; }
log "registryd:   owns org.a11y.atspi.Registry (pid $REG_PID)"

cleanup() { kill "$REG_PID" "$BUS_PID" "$XVFB_PID" 2>/dev/null || true; }
trap cleanup EXIT

# Chromium's ATK bridge gating
export ACCESSIBILITY_ENABLED=1
export GNOME_ACCESSIBILITY=1
export QT_ACCESSIBILITY=1
unset CHROME_HEADLESS

log "stack ready; exec: $*"
"$@"

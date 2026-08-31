#!/usr/bin/env bash
# Install everything the AT-SPI2 spike needs on a Debian/Ubuntu box, and report
# what was already present. Idempotent. Needs root (or sudo).
set -uo pipefail

NEED_BIN=(dbus-daemon dbus-run-session dbus-update-activation-environment gdbus Xvfb node)
NEED_FILE=(
  /usr/libexec/at-spi-bus-launcher
  /usr/libexec/at-spi2-registryd
  /usr/lib/x86_64-linux-gnu/libatspi.so.0
  /usr/lib/x86_64-linux-gnu/girepository-1.0/Atspi-2.0.typelib
)
PKGS=(at-spi2-core gir1.2-atspi-2.0 python3-gi xvfb dbus)

report() {
  echo "--- present/missing ---"
  for b in "${NEED_BIN[@]}"; do printf '%-40s %s\n' "$b" "$(command -v "$b" || echo MISSING)"; done
  for f in "${NEED_FILE[@]}"; do printf '%-40s %s\n' "$(basename "$f")" "$([[ -e $f ]] && echo "$f" || echo MISSING)"; done
  # The Atspi typelib is only usable from the python that owns /usr/lib/python3/dist-packages.
  for py in python3.12 python3.11 python3.13 python3; do
    command -v "$py" >/dev/null || continue
    if "$py" -c 'import gi;gi.require_version("Atspi","2.0");from gi.repository import Atspi' 2>/dev/null; then
      printf '%-40s %s\n' "python with working gi+Atspi" "$(command -v "$py")"
      return
    fi
  done
  printf '%-40s %s\n' "python with working gi+Atspi" "MISSING"
}

report
missing=0
for f in "${NEED_FILE[@]}"; do [[ -e $f ]] || missing=1; done
for b in "${NEED_BIN[@]}"; do command -v "$b" >/dev/null || { [[ $b == node ]] || missing=1; }; done

if [[ $missing -eq 1 ]]; then
  echo "--- installing: ${PKGS[*]} ---"
  apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y "${PKGS[@]}" || {
    echo "INSTALL FAILED -- no apt access in this environment?"; exit 1; }
  report
fi
echo "--- versions ---"
for p in "${PKGS[@]}"; do printf '%-24s %s\n' "$p" "$(dpkg -s "$p" 2>/dev/null | awk '/^Version/{print $2}')"; done
echo "node                     $(node -v 2>/dev/null || echo MISSING)  (>= 21 required: global WebSocket)"

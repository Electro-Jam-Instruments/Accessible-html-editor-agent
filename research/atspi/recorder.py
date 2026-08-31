#!/usr/bin/env python3.12
"""AT-SPI2 event recorder -> JSONL.

Registers for the typed AT-SPI event classes we care about and writes one JSON
object per event, flushed immediately so another process can tail it.

Usage:  recorder.py <out.jsonl>       (requires AT_SPI_BUS_ADDRESS in env)

Synchronisation contract with the driver: the test page carries a marker
control whose accessible name the driver sets to "STEP-<n>". When that name
lands here we emit a record with {"marker": "STEP-<n>"} -- the driver watches
for that line before moving on. This is an observed completion signal, not a
delay.
"""
import json
import os
import signal
import sys
import time

import gi

gi.require_version("Atspi", "2.0")
from gi.repository import Atspi, GLib  # noqa: E402

EVENT_CLASSES = [
    "focus:",
    "object:state-changed",
    "object:text-caret-moved",
    "object:text-changed",
    "object:text-selection-changed",
    "object:children-changed",
    "object:property-change",
    "object:selection-changed",
    "object:active-descendant-changed",
    "object:announcement",
    "object:attributes-changed",
    "object:value-changed",
    "document:load-complete",
    "window:activate",
]

out = open(sys.argv[1], "w", buffering=1)
T0 = time.time()


def safe(fn, default=None):
    try:
        return fn()
    except Exception as exc:  # noqa: BLE001
        return f"<err:{type(exc).__name__}:{exc}>" if default is None else default


def describe(acc):
    if acc is None:
        return None
    d = {
        "role": safe(lambda: acc.get_role_name()),
        "name": safe(lambda: acc.get_name()),
    }
    try:
        attrs = acc.get_attributes() or {}
    except Exception:  # noqa: BLE001
        attrs = {}
    # keep the attributes that identify the node and carry live-region metadata
    for k in ("id", "tag", "xml-roles", "container-live", "live", "atomic",
              "relevant", "container-atomic", "container-relevant", "busy",
              "display", "class"):
        if k in attrs:
            d[k] = attrs[k]
    return d


def on_event(e):
    rec = {
        "t": round(time.time() - T0, 4),
        "type": e.type,
        "detail1": e.detail1,
        "detail2": e.detail2,
    }
    try:
        v = e.any_data
        if v is not None:
            if isinstance(v, Atspi.Accessible):
                rec["any_data"] = describe(v)
            else:
                rec["any_data"] = str(v)
    except Exception as exc:  # noqa: BLE001
        rec["any_data"] = f"<err:{exc}>"

    src = safe(lambda: e.source, default=None)
    rec["source"] = describe(e.source) if e.source else None

    # extra context for text events
    if e.type.startswith("object:text-caret-moved") and e.source:
        rec["caret"] = safe(lambda: Atspi.Text.get_caret_offset(e.source))
        rec["text_len"] = safe(lambda: Atspi.Text.get_character_count(e.source))
        rec["text"] = safe(
            lambda: Atspi.Text.get_text(e.source, 0, Atspi.Text.get_character_count(e.source))
        )

    out.write(json.dumps(rec, ensure_ascii=False) + "\n")

    nm = rec.get("source", {}).get("name") if rec.get("source") else None
    for cand in (nm, rec.get("any_data") if isinstance(rec.get("any_data"), str) else None):
        if isinstance(cand, str) and cand.startswith("STEP-"):
            out.write(json.dumps({"t": round(time.time() - T0, 4), "marker": cand}) + "\n")
            break


listener = Atspi.EventListener.new(on_event)
Atspi.init()
registered = {}
for cls in EVENT_CLASSES:
    registered[cls] = listener.register(cls)
out.write(json.dumps({"t": 0.0, "meta": "registered", "classes": registered}) + "\n")


def stop(*_a):
    out.write(json.dumps({"t": round(time.time() - T0, 4), "meta": "stopping"}) + "\n")
    Atspi.event_quit()


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGTERM, lambda *_: (stop(), False)[1])
Atspi.event_main()
out.write(json.dumps({"t": round(time.time() - T0, 4), "meta": "exited"}) + "\n")
out.close()

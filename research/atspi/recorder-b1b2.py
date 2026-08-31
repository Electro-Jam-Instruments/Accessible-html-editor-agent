#!/usr/bin/env python3.12
"""AT-SPI2 event recorder -> JSONL, B1/B2 variant.

Same as recorder.py (same sync contract: the driver renames the marker control
to STEP-<n>, we emit {"marker": "STEP-<n>"} when the name-change event lands),
plus, for object:text-caret-moved events, the source's ANCESTOR CHAIN (role,
id, tag up to the document) and its state set. B1/B2 are about containment,
so every caret event must say what it is contained IN as the bridge sees it.
"""
import json
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


def state_names(acc):
    try:
        names = []
        for s in acc.get_state_set().get_states():
            try:
                names.append(s.value_nick)
            except Exception:  # noqa: BLE001
                names.append(str(int(s)))
        return sorted(names)
    except Exception as exc:  # noqa: BLE001
        return [f"<err:{exc}>"]


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
    for k in ("id", "tag", "xml-roles", "container-live", "live", "atomic",
              "relevant", "container-atomic", "container-relevant", "busy",
              "display", "class"):
        if k in attrs:
            d[k] = attrs[k]
    return d


def ancestry(acc, limit=12):
    """role#id chain from the source's parent up to (and including) the
    document frame / application. What containment does the bridge expose?"""
    chain = []
    try:
        cur = acc.get_parent()
        while cur is not None and len(chain) < limit:
            e = describe(cur)
            chain.append(e)
            if e and e.get("role") in ("document web", "application", "desktop frame"):
                break
            cur = cur.get_parent()
    except Exception as exc:  # noqa: BLE001
        chain.append({"err": str(exc)})
    return chain


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

    rec["source"] = describe(e.source) if e.source else None

    if e.type.startswith("object:text-caret-moved") and e.source:
        rec["caret"] = safe(lambda: Atspi.Text.get_caret_offset(e.source))
        rec["text_len"] = safe(lambda: Atspi.Text.get_character_count(e.source))
        rec["text"] = safe(
            lambda: Atspi.Text.get_text(e.source, 0, Atspi.Text.get_character_count(e.source))
        )
        rec["src_states"] = state_names(e.source)
        rec["ancestors"] = ancestry(e.source)

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

#!/usr/bin/env python3.12
"""Dump the accessible tree of a Chromium document via AT-SPI2 -> JSON.

Usage: dump-tree.py <out.json> <doc-title-substring> [line-iter-id ...]

Finds the application whose document-web frame's name contains the given
substring, dumps its whole subtree (role, name, id/tag attributes, states,
interfaces, child count, and flat Text content where the node implements
Text), and — for each element id given as a further argument — walks that
node's Text line by line with get_string_at_offset(LINE), which is the same
Text-interface walk a Linux screen reader's reading cursor performs.

The wait for the document to appear is a bounded poll on an external process's
tree (Chromium registers with the a11y bus on its own schedule; there is no
push signal for "my document frame is now in the desktop tree" short of
document:load-complete, which the RECORDER captures — this script can start
after that and still have to re-walk to find the node). Same class of wait as
the stack scripts' NameHasOwner polls.
"""
import json
import sys
import time

import gi

gi.require_version("Atspi", "2.0")
from gi.repository import Atspi  # noqa: E402

OUT, TITLE = sys.argv[1], sys.argv[2]
LINE_ITER_IDS = sys.argv[3:]

Atspi.init()


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


def node(acc, depth=0, max_depth=25):
    d = {
        "role": safe(lambda: acc.get_role_name()),
        "name": safe(lambda: acc.get_name()),
        "child_count": safe(lambda: acc.get_child_count()),
        "states": state_names(acc),
        "interfaces": safe(lambda: list(acc.get_interfaces()), default=[]),
    }
    try:
        attrs = acc.get_attributes() or {}
    except Exception:  # noqa: BLE001
        attrs = {}
    for k in ("id", "tag", "xml-roles", "display", "class", "level",
              "posinset", "setsize", "container-live", "live"):
        if k in attrs:
            d[k] = attrs[k]
    ifaces = d["interfaces"] if isinstance(d["interfaces"], list) else []
    if "Text" in ifaces:
        d["text"] = safe(
            lambda: Atspi.Text.get_text(acc, 0, Atspi.Text.get_character_count(acc))
        )
    if depth < max_depth and isinstance(d["child_count"], int) and d["child_count"] > 0:
        d["children"] = []
        for i in range(d["child_count"]):
            child = safe(lambda: acc.get_child_at_index(i), default=None)
            if child is None or isinstance(child, str):
                d["children"].append({"err": child})
            else:
                d["children"].append(node(child, depth + 1, max_depth))
    return d


def find_doc():
    desktop = Atspi.get_desktop(0)
    for i in range(desktop.get_child_count()):
        app = safe(lambda: desktop.get_child_at_index(i), default=None)
        if app is None or isinstance(app, str):
            continue
        stack = [app]
        while stack:
            cur = stack.pop()
            role = safe(lambda: cur.get_role_name())
            nm = safe(lambda: cur.get_name()) or ""
            if role == "document web" and TITLE in nm:
                return cur
            cc = safe(lambda: cur.get_child_count(), default=0)
            if isinstance(cc, int):
                for j in range(min(cc, 50)):
                    ch = safe(lambda: cur.get_child_at_index(j), default=None)
                    if ch is not None and not isinstance(ch, str):
                        stack.append(ch)
    return None


doc = None
for _ in range(200):  # bounded poll: external process, no push signal here
    doc = find_doc()
    if doc is not None:
        break
    time.sleep(0.05)

result = {"found": doc is not None, "title_query": TITLE}
if doc is not None:
    result["tree"] = node(doc)

    def by_id(acc, want):
        try:
            attrs = acc.get_attributes() or {}
        except Exception:  # noqa: BLE001
            attrs = {}
        if attrs.get("id") == want:
            return acc
        for i in range(safe(lambda: acc.get_child_count(), default=0) or 0):
            ch = safe(lambda: acc.get_child_at_index(i), default=None)
            if ch is None or isinstance(ch, str):
                continue
            r = by_id(ch, want)
            if r is not None:
                return r
        return None

    result["line_iterations"] = {}
    for want in LINE_ITER_IDS:
        target = by_id(doc, want)
        if target is None:
            result["line_iterations"][want] = "<not found>"
            continue
        lines, off = [], 0
        total = safe(lambda: Atspi.Text.get_character_count(target), default=0)
        if not isinstance(total, int):
            result["line_iterations"][want] = f"<no Text: {total}>"
            continue
        while off < total and len(lines) < 100:
            ts = safe(lambda: Atspi.Text.get_string_at_offset(
                target, off, Atspi.TextGranularity.LINE))
            if ts is None or isinstance(ts, str):
                lines.append({"err": ts, "at": off})
                break
            lines.append({"start": ts.start_offset, "end": ts.end_offset,
                          "content": ts.content})
            if ts.end_offset <= off:
                break
            off = ts.end_offset
        result["line_iterations"][want] = lines

with open(OUT, "w") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
print(f"[dump-tree] wrote {OUT} (found={result['found']})")

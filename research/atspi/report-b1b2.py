#!/usr/bin/env python3.12
"""Render a recorder-b1b2 JSONL as a per-step, human-readable event log.

Like report.py, but also prints the src_states and ancestor chain that
recorder-b1b2.py attaches to object:text-caret-moved events (B1/B2 are about
containment, so every caret event shows what it is contained in).
Filters state-changed:defunct (browser-teardown noise).

Usage: report-b1b2.py <events.jsonl>   (notes read from <events>-notes.jsonl)
"""
import json
import os
import sys

path = sys.argv[1]
notes_path = path[:-6] + "-notes.jsonl" if path.endswith(".jsonl") else path + "-notes.jsonl"
notes = {}
if os.path.exists(notes_path):
    for line in open(notes_path):
        r = json.loads(line)
        notes[r["afterStep"] + 1] = r["note"]


def fmt(r):
    s = r.get("source") or {}
    parts = [f"{r['t']:>8.4f}", f"{r['type']:<40}", f"d1={r['detail1']:<3} d2={r['detail2']:<3}"]
    ad = r.get("any_data")
    if ad not in (None, ""):
        parts.append(f"any={ad!r}")
    ident = f"#{s['id']}" if s.get("id") else f"{s.get('role')}({s.get('name')!r})"
    parts.append(f"src={ident}")
    out = "  ".join(parts)
    if "caret" in r:
        out += f"\n         CARET={r['caret']} len={r['text_len']} text={r['text']!r}"
        out += f"\n         src role={s.get('role')} states={','.join(r.get('src_states', []))}"
        anc = r.get("ancestors") or []
        chain = " > ".join((f"#{a['id']}" if a.get("id") else f"{a.get('role')}") for a in anc)
        out += f"\n         ancestors: {chain}"
    return out


buf = []
for line in open(path):
    r = json.loads(line)
    if r.get("marker"):
        n = int(r["marker"].split("-")[1])
        print(f"\n### step {n}: {notes.get(n, '(boot)')}")
        for b in buf:
            print("   ", b)
        print(f"     [boundary {r['marker']} observed]")
        buf = []
        continue
    if r.get("meta") or not r.get("type"):
        continue
    if r["type"].startswith("object:state-changed:defunct"):
        continue
    buf.append(fmt(r))
if buf:
    print("\n### after last boundary (teardown)")
    for b in buf[:6]:
        print("   ", b)
    if len(buf) > 6:
        print(f"    ... {len(buf)} non-defunct events total")

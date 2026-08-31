#!/usr/bin/env python3.12
"""Render a recorder JSONL as a per-step, human-readable event log.

Segments are delimited by the STEP-<n> marker events that the driver plants and
the recorder observes. driver notes live in <events>-notes.jsonl, keyed by the
step number they precede.
"""
import json, os, sys

path = sys.argv[1]
notes_path = path[:-6] + "-notes.jsonl" if path.endswith(".jsonl") else path + "-notes.jsonl"
notes = {}
if os.path.exists(notes_path):
    for line in open(notes_path):
        r = json.loads(line)
        notes[r["afterStep"] + 1] = r["note"]

def fmt(r):
    s = r.get("source") or {}
    parts = [f"{r['t']:>8.4f}", f"{r['type']:<44}", f"d1={r['detail1']:<4} d2={r['detail2']:<4}"]
    ad = r.get("any_data")
    if isinstance(ad, dict) and ad.get("id"):
        ad = {**ad, "id": "#" + ad["id"]}
    if ad not in (None, ""):
        parts.append(f"any={ad!r}")
    if "caret" in r:
        parts.append(f"CARET={r['caret']} len={r['text_len']} text={r['text']!r}")
    ident = f"#{s['id']}" if s.get("id") else f"{s.get('role')}({s.get('name')!r})"
    parts.append(f"src={ident}")
    return "  ".join(parts)

buf, step = [], 0
for line in open(path):
    r = json.loads(line)
    if r.get("marker"):
        n = int(r["marker"].split("-")[1])
        print(f"\n### step {n}: {notes.get(n, '(boot)')}")
        for b in buf:
            print("   ", b)
        print(f"     [boundary {r['marker']} observed]")
        buf, step = [], n
        continue
    if r.get("meta") or not r.get("type"):
        continue
    buf.append(fmt(r))
if buf:
    print(f"\n### after last boundary (teardown)")
    for b in buf[:6]:
        print("   ", b)
    print(f"    ... {len(buf)} events (mostly state-changed:defunct from browser shutdown)")

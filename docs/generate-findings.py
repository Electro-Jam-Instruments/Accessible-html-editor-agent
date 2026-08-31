#!/usr/bin/env python3
"""Regenerate findings.md's measured matrix from the suite's example report.

The matrix between the GENERATED markers is never hand-edited: run this after a
harness run. Curated commentary outside the markers is untouched.
"""
import json, collections, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(HERE, '..', 'suite', 'examples', 'report-2026-08.json')))
subs = [s['id'] for s in d['subjects']]
SHORT = {'contenteditable':'CE','textarea-markdown':'TM','textarea-markdown-fixed':'TM+',
         'uiw-react-md-editor':'uiw','open-notebook-fixed':'ON+','lexical-stock':'LEXs',
         'lexical-next':'LEXn','lexical-next-max':'LEXmax','tiptap':'TT'}
SYM = {'announced':'✅','discoverable':'🟡','told-only':'📢','absent':'—'}

lines = []
W = lines.append
W(f"## The measured matrix — {len(d['outcomes'])} operations × {len(subs)} subjects")
W("")
W(f"Run of `{d['generatedAt'][:10]}`, Chromium `{d['chrome']}`: "
  f"**{d['summary']['total']} assertions, {d['summary']['passes']} pass, "
  f"{d['summary']['mustFailures']} MUST failures** — "
  f"{sum(len(v) for v in d['outcomes'].values())} outcome cells.")
W("")
c = collections.Counter(v for by in d['outcomes'].values() for v in by.values())
W("| outcome | cells | meaning |")
W("|---|---:|---|")
W(f"| ✅ announced | {c['announced']} | told at the moment, and reviewable |")
W(f"| 🟡 discoverable | {c['discoverable']} | correct semantics; found on navigation, silent at the moment |")
W(f"| 📢 told-only | {c['told-only']} | heard once; no structure to return to |")
W(f"| — absent | {c['absent']} | neither |")
W("")
W("Legend: " + " · ".join(f"**{SHORT[s]}** {s}" for s in subs))
W("")
W("| operation | " + " | ".join(SHORT[s] for s in subs) + " |")
W("|---|" + "---|" * len(subs))
for op in d['outcomes']:
    W(f"| `{op}` | " + " | ".join(SYM[d['outcomes'][op][s]] for s in subs) + " |")
W("")
W("Per-subject totals (✅/🟡/📢/—): " + " · ".join(
    f"**{SHORT[s]}** {sum(1 for by in d['outcomes'].values() if by[s]=='announced')}"
    f"/{sum(1 for by in d['outcomes'].values() if by[s]=='discoverable')}"
    f"/{sum(1 for by in d['outcomes'].values() if by[s]=='told-only')}"
    f"/{sum(1 for by in d['outcomes'].values() if by[s]=='absent')}"
    for s in subs))

p = os.path.join(HERE, 'findings.md')
s = open(p).read()
s = re.sub(r"<!-- BEGIN GENERATED MATRIX -->.*?<!-- END GENERATED MATRIX -->",
           "<!-- BEGIN GENERATED MATRIX -->\n" + "\n".join(lines) + "\n<!-- END GENERATED MATRIX -->",
           s, flags=re.S)
open(p, 'w').write(s)
print(f"matrix regenerated: {len(d['outcomes'])} ops × {len(subs)} subjects")

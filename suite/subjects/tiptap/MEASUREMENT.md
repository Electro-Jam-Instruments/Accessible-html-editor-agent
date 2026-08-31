# Tiptap subject — full contract run, measured

**Subject:** `tiptap` — stock `@tiptap/starter-kit@3.30.5`, the getting-started
configuration ([README.md](README.md)). **Run:** all 8 contracts, all 9 subjects,
2026-08-30, Chromium `chromium-1194` via the CDP driver. Run twice; the two reports
are byte-identical except the `generatedAt` timestamp (verified with a scripted
diff, including every detail string). Results were written to a scratch path per
protocol (`--contract`-style isolation; the shared `results.json` untouched) and are
not committed — this note carries the outcomes.

**Headline: the inventory's zero-announcement prediction held exactly.** Across all
24 operations, in both runs, the tiptap column recorded **zero live-region
announcements** and **zero live regions in existence** — no announcement layer, as
[../../../scenarios/tiptap.md](../../../corpus/inventories/tiptap.md) §7 predicted from
source. Every structural MUST the configuration can reach passed; every
announcement MUST failed. Nothing in the run is a finding about the harness.

## Outcome per operation

| Operation | tiptap | For contrast: lexical-stock |
|---|---|---|
| bulleted-list.create | discoverable | discoverable |
| bulleted-list.enter | discoverable | discoverable |
| heading.create | discoverable | discoverable |
| history.undo | discoverable | discoverable |
| history.redo | discoverable | discoverable |
| blockquote.create | discoverable | discoverable |
| blockquote.enter | discoverable | discoverable |
| blockquote.exit | discoverable | discoverable |
| blockquote.destroy | absent | absent |
| list.exit | discoverable | discoverable |
| **list.nest** | **discoverable** | **absent** (Tab does not nest in stock Lexical) |
| **list.outdent** | **discoverable** | **absent** |
| list.ordered | discoverable | discoverable |
| codeblock.create | discoverable | discoverable |
| codeblock.enter | discoverable | discoverable |
| codeblock.exit | discoverable | discoverable |
| codeblock.language | discoverable | discoverable |
| entry-parity.blockquote | discoverable | discoverable |
| entry-parity.codeblock | discoverable | discoverable |
| entry-parity.list | discoverable | discoverable |
| checklist.create | absent | absent |
| checklist.continue | absent | absent |
| checklist.toggle | absent | absent |
| checklist.exit | absent | absent |

`blockquote.destroy` is `absent` by the destructive-operation rule: the structure
that would have made it discoverable is precisely what stopped existing, and
nothing was announced. The four checklist rows are `absent` because StarterKit has
no TaskList — the clauses reported **"precondition not reached"** honestly (the
`- [ ] ` trigger produced an ordinary bullet whose text starts with literal
`"[ ] "`), never a silent-announcer failure and never a crash, exactly as the
inventory's `n/a ≠ silent` discipline requires.

**Tiptap's profile is the purest in the corpus:** structure green wherever the
operation exists, announcements red everywhere, `n/a` honest. It is also the only
rich subject in the run whose `list.nest`/`list.outdent` structure passes — Tab
sinks to a genuinely nested `<ul>` whose `listitem` reports hierarchical level 2 in
the AX tree, where stock Lexical's Tab produces no indentation at all.

## Prediction vs measured, per overlapping inventory row

| Inventory row | Predicted | Measured | Verdict |
|---|---|---|---|
| §7 (all rows) — no announcement mechanism | zero announcements on every operation | zero, in 24/24 operations, both runs; zero live regions ever present | **hit** |
| TT-B1-003 / TT-CB-025 — `- ` starts a list | real `<ul><li>`, silent | AX `list > listitem`, no announcement | hit |
| TT-B1-001 — `# ` heading | real `<h1>`, silent | AX `heading` (level not exposed by Chromium in this capture — same for Lexical), silent | hit |
| TT-B1-005 / TT-CB-001 — `> ` quotation | real `<blockquote>`, silent | AX `blockquote`, caret stack `blockquote › p`, silent | hit |
| TT-B1-006 / TT-CB-015 — ``` fence | real `<pre><code>`, silent | DOM `pre › code`; AX `generic > code` (see below), silent | hit (with an AX refinement) |
| TT-B1-007 — language is a CSS class only | invisible at every accessible layer | measured: `dom-only[languageClass="js"] accessible[none]` — nothing reaches name, description or any AX property | **hit** |
| TT-B2-014 / TT-CB-031 — Enter at end of item | new `<li>`, silent | 2 listitems, silent | hit |
| TT-B2-015 / TT-CB-032 — Enter on empty top-level item exits ("exact endpoint needs measurement") | lift out; endpoint inferred | **measured:** the empty item is consumed (2→1 items), the caret lands in a `<p>` outside the list, list intact — one press from the empty item, no split in this shape | hit; open question closed |
| TT-B2-017/019 / TT-CB-034 — Tab/Shift-Tab depth | genuine nested lists | nested `<ul>` real; `listitem` level 2 computed by Chromium with no `aria-level` in markup; silent both directions | hit |
| TT-B2-036/037 — undo/redo silent | works (bundled UndoRedo), announces nothing | undo reverts fully, redo reapplies fully — **structure half passes** — announcement half fails; contrast `lexical-next` strict defaults where Ctrl+Z is inert | **hit** — the predicted split, measured |
| TT-CB-005 / TT-B2-034 — Backspace below a quote merges in | silent container entry | entry-parity E5: `p → blockquote › p`, text `"samplebelow"`, silent | hit |
| TT-CB-009/010 — quote Enter contract is the opposite of Lexical's; "how many Enters needs measurement" | Enter stays inside; exit via empty paragraph | **measured: 2 Enters** (Enter №1 splits inside the quote — Lexical is out after 1 — Enter №2 lifts the empty paragraph out; quotation survives holding its text) | **hit; open question closed** |
| TT-B2-025 / TT-CB-018 — code block triple-Enter exit | two trailing newlines + Enter | **measured: 3 Enters** (#1 inside, #2 inside, #3 out), block survives — same count as Lexical | hit |
| TT-B2-047 — nameless `role="textbox"`, no `aria-multiline` | AT may present a nameless single-line field (INFERRED) | AX root: `role=textbox`, **name=""** (nameless: confirmed) — but Chromium computes `multiline: true` and `editable: richtext` from contenteditable with no `aria-multiline` present | **hit on namelessness; the single-line half needs refining** (see corrections) |
| TT-CB-017 — does `<pre><code>` give a better AX story than Lexical's bare `<code>`? | INFERRED better ("a real `<pre>`, which is more than Lexical emits") | **No — equivalent in Chromium.** See below | **miss (informative)** |
| B3 rows / checklist — no such surface | `n/a`, never `silent` | "precondition not reached" reported in those words | hit |

### The `<pre><code>` answer (TT-CB-017)

**Chromium gives Tiptap's `<pre><code>` no better an AX story than Lexical's bare
`<code>`.** Measured AX subtrees for `codeblock.create`:

```
lexical-stock   textbox > code > StaticText
tiptap          textbox > generic > code > StaticText
```

The `<pre>` maps to **`generic`** — it contributes no role, no name, nothing an AT
can voice. The container's entire AX identity is the single `code` role node, which
Lexical's bare `<code>` produces identically. The real `<pre>` still matters at the
DOM/text layer (white-space, copy fidelity), but the inventory's "more than Lexical
emits" (§1.3, §6.2, §9), read as an accessibility advantage, does not survive
measurement in Chromium: **both editors' code containers are equally discoverable
and equally silent.** If anything the extra `generic` wrapper is one more ignored
node. Whether any AT voices "code" from the `code` role remains AT-side
(platform-rescue territory), but the input both editors hand the platform is now
measured to be the same shape.

## Corpus corrections (flagged — tiptap.md and canonical.md NOT edited)

1. **tiptap.md §1.3, §6.2 preamble, §9 "real `<pre><code>` … more than Lexical
   emits", and TT-CB-017's "contrast Lexical's bare `<code>` with no `<pre>`":**
   add the measured fact — in Chromium's AX tree `<pre>` is `generic` and the code
   container's exposure is one `code` role node for both editors; the DOM advantage
   does not become an AX advantage. TT-CB-017's measurement question ("does any AT
   voice code from the real `<pre><code>` where Lexical says nothing") should be
   rephrased: the two subjects hand the AT the same role, so an AT that voices one
   will voice both.
2. **TT-B2-047 "no `aria-multiline` … AT may present it as a single-line field
   (INFERRED)":** Chromium computes `multiline: true` (and `editable: richtext`)
   for the contenteditable root without the attribute, so at the Chromium AX layer
   the single-line presentation is not supported. The nameless half is confirmed
   (name=""). The INFERRED single-line risk should be narrowed to non-Chromium
   AAMs / AT heuristics, pending an NVDA pass.
3. **TT-CB-010 "how many Enters a nested quote takes needs measurement":** for a
   top-level quote, measured at 2 (split, then lift). Nested-quote depth still
   unmeasured (the contract exercises depth 1).
4. **TT-B2-015 "exact endpoint — one lift vs. out-of-list — needs measurement":**
   measured — from an empty second top-level item, one Enter consumes the item and
   lands the caret in a paragraph outside the list (no split in this shape; the
   split case with following items remains unmeasured).
5. **§1.3 lists, "no `aria-level` emitted (none needed if AT computes nesting)":**
   confirmed for Chromium — a nested `listitem` reports hierarchical level 2 with
   no `aria-level` in the markup. Also measured: `<ol>` exposes no `posInSet`; the
   ordinal reaches the tree only as ListMarker text (`"2. "`), so the number is
   readable but "2 of N" is not stated by anything.

## Determinism

Two full runs, ~2.5 minutes each. Byte-identical after removing the single
`generatedAt` line — including every assertion detail string, every AX role dump
and every announcement journal (all empty for tiptap).

## Effort against the plan (the "editor N+1 costs less" test, data point 2)

MASTER-PLAN §7 W5 estimates **1 session** for "Tiptap subject + full run".
Actual: **well under one session** — roughly 25 minutes of wall clock end to end:
subject dir (package.json + build.mjs patterned on `subjects/lexical/`) ~10
minutes including an install and a CDP probe of the stock render; two full-suite
runs ~5 minutes; the rest analysis and this note. Nothing needed a new harness
capability: the adaptive escape-gesture clauses absorbed Tiptap's
opposite-of-Lexical quote contract without modification, and the checklist clauses
absorbed a subject with no checklist. Combined with the inventory's 1-session
actual against a 2–3 session estimate, the second data point **supports the
hypothesis**: the marginal cost of editor N+1 is falling.

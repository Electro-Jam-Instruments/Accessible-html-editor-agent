# Engineering findings — what is and is not working

**The engineering companion to the [README](../README.md).** The README argues;
this file itemises. One section per editor measured, with the mechanism behind every
working and broken cell; then the platform layer; then the instrument's own limits.

Two kinds of content, kept visibly apart:

- **The matrix** between the `GENERATED` markers is produced by
  [`generate-findings.py`](generate-findings.py) from
  [`suite/examples/report-2026-08.json`](../suite/examples/report-2026-08.json). Never hand-edit it — re-run the
  generator after a harness run.
- Everything else is curated engineering commentary, each claim cited to
  [`evidence.md`](evidence.md) or a file:line.

**How to read an outcome** (the 2×2, from correction C8): **announced** = told at the
moment, and reviewable afterwards · **discoverable** = correct semantics, silent at the
moment; found on navigation · **told-only** = heard once, no structure to return to ·
**absent** = neither.

<!-- BEGIN GENERATED MATRIX -->
## The measured matrix — 24 operations × 9 subjects

Run of `2026-08-30`, Chromium `chromium-1194`: **900 assertions, 291 pass, 346 MUST failures** — 216 outcome cells.

| outcome | cells | meaning |
|---|---:|---|
| ✅ announced | 4 | told at the moment, and reviewable |
| 🟡 discoverable | 74 | correct semantics; found on navigation, silent at the moment |
| 📢 told-only | 9 | heard once; no structure to return to |
| — absent | 129 | neither |

Legend: **CE** contenteditable · **TM** textarea-markdown · **TM+** textarea-markdown-fixed · **uiw** uiw-react-md-editor · **ON+** open-notebook-fixed · **LEXs** lexical-stock · **LEXn** lexical-next · **LEXmax** lexical-next-max · **TT** tiptap

| operation | CE | TM | TM+ | uiw | ON+ | LEXs | LEXn | LEXmax | TT |
|---|---|---|---|---|---|---|---|---|---|
| `bulleted-list.create` | — | — | 📢 | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `bulleted-list.enter` | — | — | 📢 | — | 📢 | 🟡 | 🟡 | 🟡 | 🟡 |
| `heading.create` | — | — | — | — | — | 🟡 | ✅ | ✅ | 🟡 |
| `history.undo` | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | — | ✅ | 🟡 |
| `history.redo` | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | — | ✅ | 🟡 |
| `blockquote.create` | — | — | — | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `blockquote.enter` | — | — | — | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `blockquote.exit` | — | — | — | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `blockquote.destroy` | — | — | — | — | — | — | — | — | — |
| `list.exit` | — | — | — | — | 📢 | 🟡 | 🟡 | 🟡 | 🟡 |
| `list.nest` | — | — | — | — | 📢 | — | — | — | 🟡 |
| `list.outdent` | — | — | — | — | 📢 | — | — | — | 🟡 |
| `list.ordered` | — | — | 📢 | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `codeblock.create` | — | — | — | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `codeblock.enter` | — | — | — | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `codeblock.exit` | — | — | — | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `codeblock.language` | — | — | — | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `entry-parity.blockquote` | — | — | — | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `entry-parity.codeblock` | — | — | — | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `entry-parity.list` | — | — | — | — | — | 🟡 | 🟡 | 🟡 | 🟡 |
| `checklist.create` | — | — | — | — | — | — | — | — | — |
| `checklist.continue` | — | — | — | — | 📢 | — | — | — | — |
| `checklist.toggle` | — | — | — | — | — | — | — | — | — |
| `checklist.exit` | — | — | — | — | 📢 | — | — | — | — |

Per-subject totals (✅/🟡/📢/—): **CE** 0/2/0/22 · **TM** 0/2/0/22 · **TM+** 0/2/3/19 · **uiw** 0/2/0/22 · **ON+** 0/2/6/16 · **LEXs** 0/17/0/7 · **LEXn** 1/14/0/9 · **LEXmax** 3/14/0/7 · **TT** 0/19/0/5
<!-- END GENERATED MATRIX -->

---

## What is working, editor by editor

### Lexical — extension API (`lexical-next`, `lexical-next-max`)

**Working:**
- **Heading announcement, by default.** `# ` → `[polite] "Heading level 1"`.
  `HeadingAnnounceExtension` ships inside `@lexical/rich-text` and
  `RichTextExtension.dependencies` pulls it in — the integrator opts *out*, not in
  (`LexicalRichText.dev.mjs:311`; E3.12/E3.13). The corpus's only default-on
  moment-of-change announcement.
- **Undo/redo announcement — but only opted in** (`lexical-next-max`):
  `[polite] "Undone"` / `"Redone"`. `HistoryAnnounceExtension` is reachable from
  *neither* direction by default: `RichTextExtension` does not depend on it, and
  `@lexical/history` never imports `@lexical/a11y` (E3.15-adjacent; A3 report).
- **Structure is real everywhere it exists**: `<h1>`, `<blockquote>`, `<ul><li>`,
  `<code>` all land in the AX tree as themselves (PASS, not textual equivalent).
- **On the open PR #9070** (measured at `7737554bbc0`): quote create/exit/destroy go
  `announced` — destroy from `absent`, the largest single improvement measured on any
  subject — and `QuoteAnnounceExtension` is wired as a default dependency.

**Not working:**
- **Undo/redo is inert on the strict default build.** Core maps Ctrl+Z to
  `UNDO_COMMAND`; with no `HistoryExtension` nothing listens. The keys do nothing
  (A3: `"unchanged by Ctrl+Z"`).
- **No list announcer exists at all** — not opt-in, nonexistent. `lexical-next-max`
  with every reachable announcer enabled still says nothing for list create, exit,
  nest, outdent or ordered continuation (E3.15).
- **No indent gesture.** Neither Tab nor Ctrl+] nests a list item at any depth —
  `TabIndentationPlugin` is not in the documented config, so nest/outdent fail on
  *result state*, not merely announcement (E3.16).
- **Check lists are unreachable behind two independent opt-ins** (`CHECK_LIST` not in
  `TRANSFORMERS`; `ListExtension` does not depend on `CheckListExtension`). Typing
  `- [ ] x` produces literal `[ ] x` inside a plain `<li>` — structurally worse than
  a markdown textarea, which at least keeps valid GFM (E3.20/E3.21).
- **Arrow-entry into any container is silent** — and `blockquote.enter` mutates
  nothing (byte-identical text, only the ancestor chain changes), so any announcer
  hooked on mutation is structurally unable to see it (E3.18 context; the #9070
  extension gates on same-update creation and leaves this vector to the screen
  reader by explicit design).
- **`HistoryAnnounceExtension` fires on command dispatch, not on a completed
  transaction** (`COMMAND_PRIORITY_LOW`, returns `false`): with the announcer present
  and history absent it says "Undone" while the document does not change —
  `told-only`, and the reason every clause has two halves (A3 bonus finding).

### Lexical — legacy React plugins (`lexical-stock`, what most apps ship)

Everything above minus the two `announced` rows: structure identical, announcements
**zero**. The live region itself never mounts. The stock→next gap *is* the
accessibility-by-default programme, measured: today it is exactly one construct
(headings) plus opt-in undo.

### Tiptap / ProseMirror (`tiptap`, StarterKit 3.30.5)

**Working:**
- The **broadest correct structure** in the corpus: 19 of 24 operations
  `discoverable`, the most of any subject.
- **The only rich editor whose Tab actually nests a list** — real nested `<ul>`,
  computed level 2 (E1.14).
- StarterKit bundles undo/redo, so history *works* (structure half passes) where
  strict Lexical is inert.
- `undoInputRule`: universal Backspace-reverts-any-autoformat — the best B1 recovery
  shape measured anywhere. Unannounced, like everything else.

**Not working:**
- **Zero announcements, zero live regions, across all 24 operations** — not unwired
  announcers; *no announcement layer exists*. The only ARIA in the subject is a
  hardcoded nameless `role="textbox"` with no `aria-multiline` (E1.12).
- `<pre><code>` earns **no AX advantage** over Lexical's bare `<code>`: `<pre>` maps
  to `generic`, both editors hand the platform one `code` role (E1.15).
- No TaskList in StarterKit → all four checklist operations `absent`.
- Divergence, measured: blockquote exit takes **2 Enters** (Lexical: 1); code block
  3 (same as Lexical). Same keys, different contracts, nothing announced either way.

### Open Notebook — our fork (`open-notebook-fixed` vs `uiw-react-md-editor`)

**Working (all fixes measured against the raw library as the before):**
- List continuation, list exit, indent/outdent are **announced** — `told-only`
  outcomes, the honest ceiling of a textarea: true at the moment, nothing to return
  to.
- The Tab trap is gone (two-way, WCAG 2.1.2 — the raw library still has it), the
  triple-read AX tree is silenced, the editor textarea is named, focus survives save.

**Not working:**
- **Our own announcer violates C-3** — the sharpest self-finding in the corpus:
  `textarea-markdown-fixed` announces list creation on typing `- ` and is silent when
  the caret arrows into the same list, because it hooks the `input` event and
  arrow-entry mutates nothing (E3.18). `open-notebook-fixed` doesn't even reach the
  violation: its announcer only fires on Enter-continuation.
- The withdrawn tick: ordered continuation announces `"New list item, number 2"` — an
  ordinal without naming the construct, judged insufficient (the walk-through records
  the withdrawal).
- On creating a *task* item it announces "bulleted list" — fires on the `- `, four
  keystrokes before the line becomes a task, and never corrects itself (A6).
- 46 of 63 corpus rows remain **structural**: a textarea holding `- milk` contains
  characters, not a list. No announcement repairs that (Tier B / ADR-012).

### Bare `contenteditable` (control)

22 of 24 `absent` — the calibration floor. The two `discoverable` rows are history
(the browser's native undo works and content is re-readable).

---

## The platform layer — when correct markup is, and is not, enough

From [`platform-rescue.md`](platform-rescue.md), all chains cited link-by-link:

| Construct | Verdict (NVDA) |
|---|---|
| Heading | **rescued** — role, level, quick-nav, default-on |
| Table | **rescued** — the richest default (counts, coordinates, headers) |
| Link | **rescued iff `href`** — an anchor without one maps to `generic`: no construct at all (E4.21) |
| List | **rescued for reading; demoted while editing** — entry survives, item count and line-exit are lost (`PRESCAT_SINGLELINE`; B1, measured + source) |
| Blockquote | **rescued by default** (`reportBlockQuotes=true`); focus-mode should announce per source — the owner's observed Windows silence is an open discrepancy (B2) |
| **Code block** | **not rescued** — NVDA has no code role anywhere in its enum; `PRESCAT_LAYOUT`; only the *text* is discoverable, never the code-ness (C13/E4.19) |

Consequences for editors: a code-block announcement is the **only channel that
exists**, not a courtesy; an editable list's "with N items" must come from the editor
because NVDA withholds it there; and `discoverable` in the matrix is a *bounded* claim
— per-construct, per-AT, browse-mode-verified only.

---

## The instrument — what the suite can and cannot see

**Can:** the real Chromium AX tree and live-region writes, headless, deterministically
(byte-identical repeat runs are the norm and are checked); an unmerged PR branch;
per-subject regression baselines gated in CI on the byte-identical Chromium build the
baselines were measured on.

**Structure**: ~20 invariant predicates ([`suite/invariants.mjs`](../suite/invariants.mjs)) ×
a versioned announcement vocabulary ([`suite/vocabulary.mjs`](../suite/vocabulary.mjs)) ×
nine subject adapters with measured capability declarations
([`suite/adapters/`](../suite/adapters)) — a new editor is one adapter plus a build
recipe; a new scenario is data. The vocabulary accepted PR #9070's strings without
modification, on rules written before that branch was run — the fairness design's
first external test.

**Cannot:** hear a screen reader (browser-told, not user-heard — the standing limit);
observe focus-mode NVDA behaviour (source-read only); see JAWS/VoiceOver at all;
distinguish "told on one vector of two" in the outcome word (a C-3 violation and plain
silence both summarise `absent`/`told-only` — the assertion detail carries the split);
measure the M-family (menus) — no contract exercises it yet.

**Known warts, on the record:** `history.redo.reapplied-fully` passes trivially on the
history-less build (nothing was undone, so "restoring" succeeds) — left probed rather
than gated because the refactor's diff rule forbids flipping a measured pass; and the
Tiptap IME compositionend path contains a `setTimeout` (their code, flagged as a
live-bug candidate under this repo's no-timers review rule).

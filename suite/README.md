# Editor accessibility contract harness

Measures an HTML editing surface against a **behavioural** accessibility
contract: for a given user operation, what result state did the editor produce,
and what did it announce? See [`../contract/rationale.md`](../contract/rationale.md)
for the proposal this implements and
[`../docs/observing-chromium.md`](../docs/observing-chromium.md) for what is and
is not observable from Chromium.

## The loop this closes

The point of the harness is not a table. It is that the whole cycle — **specify, measure,
tick, keep it ticked** — runs without a human in it.

```
contract clause  ──declares──▶  canonical scenario id (CAN-CB-044)
      │
      ▼
  node run.mjs   ──measures──▶  results.json { scenarios: { CAN-CB-044: { subject: true } } }
      │                                    │
      │                                    └──▶ generate-scenarios.py
      │                                           marks the row ✅ measured
      │                                           (nobody types the tick)
      ▼
node run.mjs --check  ──gates──▶  baselines/<subject>.json, exit 1 on any backward step
```

**`run` reports; `--check` gates.** They are different jobs and conflating them is why the
old exit code was wrong. A run measures every subject and most subjects are red *on
purpose* — that is the finding, not a regression, so a run must never fail a build.
`--check` compares **one** subject against its committed baseline in
`baselines/<subject>.json` and fails only when something that used to pass stops passing.
A `--check` run measures only that subject and does **not** write `results.json` (a
one-subject report would delete every other column; pass `--out=<path>` if you want the
report). On a first check of a subject with no baseline, the file is written from that run.

```bash
node run.mjs                      # the comparison table, all subjects → results.json
node run.mjs --check --subject=X  # gate one subject against baselines/X.json
node run.mjs --check --subject=X --accept   # after a real fix, move the baseline forward
```

Baselines exist here for the subjects this repository's CI can rebuild
deterministically: `lexical-stock`, `lexical-next`, `lexical-next-max` and `tiptap`
(exact-pinned local installs; `.github/workflows/suite.yml` rebuilds each from its pins
and runs its `--check` on every PR). The `open-notebook-fixed` baseline lives in
[the application's own repository](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y),
which builds its subject from its own source and gates it in its own CI — the same
relationship any project using this suite will have. The three hand-written subjects
(`contenteditable`, `textarea-markdown`, `textarea-markdown-fixed`) carry no baseline:
they are fixtures — controls the contracts are calibrated against — not editors under
watch.

The tick in [`../corpus/scenarios.md`](../corpus/scenarios.md) is **generated from
`results.json`**, never typed. A scenario shows `✅ measured` only when every MUST
assertion of every clause declaring it passed in a real browser. Scenarios fixed in the
app but not yet covered by a clause show `🔧 fixed` instead — a weaker, honest claim. That
separation is the point: it is what stops the checklist quietly becoming a wish list.

### Subjects

Every real-editor subject is generated and deliberately not checked in — build it with
its recipe (`subjects/lexical/build.mjs`, `subjects/lexical-next/build.mjs`,
`subjects/tiptap/build.mjs`, `subjects/build-uiw-md-editor.mjs`). `open-notebook-fixed`
is built by the application's own repository from its own source. An unbuilt optional
subject is skipped with a hint, so a fresh clone still runs.

## Run it

```sh
node suite/run.mjs             # table + results.json
node suite/run.mjs --verbose   # + per-assertion detail and observed state
node suite/run.mjs --allow-failures   # always exit 0
```

Plain Node ESM, no dependencies, no build step, no network. Node 22 supplies the
global `WebSocket` and `fetch`. Chromium defaults to
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; override with
`HARNESS_CHROME`. A full run is about 4 seconds.

**Exit code 1 is the expected outcome.** The announcement clauses are MUST-level
and almost every real editor fails them. That failure *is* the finding. Use
`--allow-failures` when running this as a report rather than as a gate.

## Layout

| File | What it is |
|---|---|
| `driver.mjs` | Chromium + CDP. `navigate` / `focusEditor` / `type` / `press` / `capture`. |
| `contract.mjs` | The assertion format — operations, assertions, priorities, AX helpers. |
| `contracts/bulleted-list.mjs` | The first two clauses: create a bullet, continue it with Enter. |
| `subjects/*.html` | Self-contained editing surfaces under test. |
| `subjects/build-uiw-md-editor.mjs` | Regenerates the real-editor subject. Not needed to run the harness. |
| `run.mjs` | Runs contracts × subjects, prints the table, writes `results.json`. |

## The snapshot

`driver.capture()` returns everything a clause may assert on, at one sync point:

```js
{
  axTree:       { root, nodes: [{ depth, role, name, value, ignored, properties }] },  // pruned to the editor subtree
  domText,      // textarea.value, or innerText for a contenteditable
  caret:        { start, end },
  liveRegions:  [{ politeness, role, atomic, text }],   // current content
  announcements:[{ seq, politeness, container, text }], // cumulative journal
  focused, shape, anchorPath, domHtml
}
```

`liveRegions` is a snapshot; `announcements` is a journal. The journal matters:
a message that is appended and then cleared would be invisible to a snapshot,
and an announcer that reuses one node would lose the earlier message to
overwrite. A `MutationObserver` installed via
`Page.addScriptToEvaluateOnNewDocument` — before any subject script runs —
records every text ever added to any `aria-live` / `role=status` / `role=alert` /
`role=log` / `<output>` container, each with its own sequence number.

## Synchronisation — no timers

Per the no-timers rule in [`AGENTS.md`](../AGENTS.md), nothing here waits on a clock. After
each driven action the driver sequences three real signals:

1. **The CDP ack.** `Input.dispatchKeyEvent` does not resolve until the renderer
   has dispatched and processed the event, so every synchronous keydown/input
   handler on the page has already run.
2. **Two animation frames**, awaited inside the page. One lets anything
   scheduled on the render lifecycle run (a React commit, a microtask flush, a
   `MutationObserver` callback); the second proves the first completed.
3. **A settle predicate.** A digest of exactly the state the contract asserts on
   — editor text, caret, announcement journal, and the roles of the pruned AX
   subtree — is re-read, each read gated on a fresh pair of frames, until it is
   byte-identical twice running. If it never settles the driver **throws**; it
   never proceeds on the assumption that things are probably fine.

Waiting for a subject to mount uses the same shape: poll for the editor element
to exist, frame-gated, and throw if it never appears. Chromium launch waits for
its own `DevTools listening` line on stderr. Navigation waits for
`Page.loadEventFired` plus `document.readyState`.

Every one of those is an observable event or condition. If you find yourself
reaching for a delay to make a subject pass, the subject is racing and the
harness is right to say so.

## The contract format

Borrowed from W3C ARIA-AT V2, so results are legible to that field. An operation
carries `id`, `precondition`, `setup`, `actions`, and two lists of assertions:

- **resultState** — assertable from the AX tree, DOM and caret.
- **announcement** — assertable from live-region content.

The split is the diagnostic. An editor can build a perfect list and say nothing
about it (the common case), or announce something it did not do.

Each assertion has an `assertionId`, an `assertionStatement`
("A bulleted list structure containing one item is conveyed."), an
`assertionPhrase`, and a `MUST` / `SHOULD` / `MAY` priority.

Setup runs *before* the announcement journal is cleared, so setup keystrokes are
never credited to (or held against) the operation. Setup is expressed as typed
keystrokes, not injected values, so every subject reaches the precondition the
way a user would — and so a subject cannot expose a hook that makes it look
better than it is.

### `PASS` vs `PASS~`

A plain-markdown `<textarea>` exposes exactly one accessible node: a textbox
with a string value. It **cannot** express a list structurally — there is
nowhere to put the structure. So a clause states its intent once ("a list
structure is conveyed") and checks it subject-appropriately: structurally for a
rich editor, and by the textual equivalent (text is `"- "`, caret at 2) for a
plaintext one. A pass by the textual equivalent is reported as **`PASS~`**, and
the recorded detail says plainly that nothing in the accessibility tree says
"list" — no list to enter, no item count, no level. It is a pass on intent, and
the table never lets it masquerade as a structural one.

## Subjects

| Subject | What it is |
|---|---|
| `contenteditable` | A bare `<div contenteditable>`. The control condition: no autoformatting, no announcements. |
| `textarea-markdown` | A hand-written reproduction of `@uiw/react-md-editor` v4.0.8's `handleKeyDown` list continuation, with no announcement. **This is what Open Notebook ships today.** |
| `textarea-markdown-fixed` | Identical editing behaviour plus a correct append-only polite live region. The target behaviour, and the proof the harness detects the difference. |
| `uiw-react-md-editor` | The **real** editor Open Notebook ships, bundled offline by its recipe (`subjects/build-uiw-md-editor.mjs`) from exact pins npm installs on your machine. Generated file. |

The real editor is included because a reproduction can be wrong. It is not: it
produces byte-identical text, caret and AX output to the hand-written subject on
both clauses. Its preview pane is disabled — the preview renders real
`<ul>`/`<li>`, which would put list roles in the page that the *editing* surface
never exposes, and the user editing a note is in the textarea, not the preview.

Lexical (three configurations) and Tiptap have recipe-built subjects of their own —
see `subjects/lexical*/` and `subjects/tiptap/`, and the full measured matrix in
[`../docs/findings.md`](../docs/findings.md). CKEditor 5, TinyMCE, ProseMirror and
Quill are not yet built; adding one is a recipe plus a self-contained HTML page in
`subjects/` and one line in `SUBJECTS` in `run.mjs`.

## Results, 2026-08

Chromium 1194, headless, Linux, no screen reader. What follows illustrates the two
original bulleted-list clauses across the four founding subjects; the full current
corpus — 8 contracts, 24 operations × 9 subjects — is in
[`examples/report-2026-08.json`](examples/report-2026-08.json) and rendered in
[`../docs/findings.md`](../docs/findings.md).

### `bulleted-list.create` — at the start of an empty line, type `-` then space

| assertion | pri | contenteditable | textarea-markdown | textarea-markdown-fixed | uiw-react-md-editor |
|---|---|---|---|---|---|
| **result state** ||||||
| `create.structure` | MUST | FAIL | PASS~ | PASS~ | PASS~ |
| `create.caret` | SHOULD | FAIL | PASS~ | PASS~ | PASS~ |
| **announcement** ||||||
| `create.announcement` | MUST | FAIL | **FAIL** | PASS | **FAIL** |
| `create.announcement-once` | SHOULD | FAIL | FAIL | PASS | FAIL |
| `create.announcement-politeness` | SHOULD | FAIL | FAIL | PASS | FAIL |

### `bulleted-list.enter` — Enter at the end of a non-empty list item

| assertion | pri | contenteditable | textarea-markdown | textarea-markdown-fixed | uiw-react-md-editor |
|---|---|---|---|---|---|
| **result state** ||||||
| `enter.structure` | MUST | FAIL | PASS~ | PASS~ | PASS~ |
| `enter.caret` | SHOULD | FAIL | PASS~ | PASS~ | PASS~ |
| **announcement** ||||||
| `enter.announcement` | MUST | FAIL | **FAIL** | PASS | **FAIL** |
| `enter.announcement-position` | SHOULD | FAIL | FAIL | PASS | FAIL |

17/36 assertions pass; 8 MUST failures. Identical across three consecutive runs.

Observed state after `bulleted-list.enter`:

| subject | text | caret | AX roles in the editor subtree | announcements |
|---|---|---|---|---|
| `contenteditable` | `"- alpha\n\n"` | 7 | textbox › StaticText › InlineTextBox › generic › LineBreak | — |
| `textarea-markdown` | `"- alpha\n- "` | 10 | textbox › generic › StaticText › … | — |
| `textarea-markdown-fixed` | `"- alpha\n- "` | 10 | textbox › generic › StaticText › … | `[polite] "bulleted list item 2"` |
| `uiw-react-md-editor` | `"- alpha\n- "` | 10 | textbox › generic › StaticText › … | — |

### What this says

- **Not one shipping subject announces anything.** Pressing Enter in our editor
  inserts `\n- ` on the user's behalf — one keystroke, three characters — and
  says nothing. A screen-reader user hears silence and does not know a marker
  was supplied. That is the exact failure `editor-contract.md` predicts, now
  measured.
- **The AX tree of a markdown textarea contains no list, ever.** Every markdown
  subject reports one `textbox` whose value happens to start with a hyphen. All
  the structure lives in a preview the editing user never focuses. `PASS~` on
  the result-state clauses is the most generous honest reading available.
- **A bare `contenteditable` is worse than it looks.** Enter produces a `<div>`
  break with no list structure at all, so it fails the result-state clauses that
  the markdown subjects pass by equivalence.
- **The fix is small and the harness sees it.** `textarea-markdown-fixed`
  differs from `textarea-markdown` by one live region and two `announce()` calls
  and flips every announcement cell. This is the control that proves the
  announcement assertions are not simply always-red.

## What this proves — and what it does not

**Proves.** That real keystrokes, dispatched through Chromium's input pipeline,
produced a particular DOM, a particular caret position, a particular
accessibility subtree, and particular content in the page's live regions — at a
sync point reached by observing the platform, deterministically, repeatably, on
Linux with no display and no screen reader.

**Does not prove.** *What a user heard.* There is no screen reader in this loop.
The harness attests **what the browser was told**, not what NVDA, JAWS,
VoiceOver or Orca said, or whether it said it at a useful moment. Specifically:

- **Announcement ≠ speech.** Text in an `aria-live` region is a *request*. The
  AT decides whether to speak it, whether to interrupt, and whether to re-read
  the whole region or only the delta — from `aria-atomic`, its own virtual-buffer
  diff, and its own queue. Chromium's emission is identical for a pure insertion
  and for a remove-plus-insert, so a re-announcement defect of that shape is
  invisible here by construction (see `chromium-ax-observation.md`).
- **NVDA drops events under load** (`MAX_WINEVENTS_PER_THREAD = 10` per cycle,
  with de-duplication). A burst this harness records in full may not be spoken
  in full.
- **No ordering guarantees.** The journal records the order announcements were
  *written to the DOM*. CDP cannot attest the order Chromium emitted events in:
  `Accessibility.nodesUpdated` erases the event type and coalesces on a 250 ms
  throttle, so it is never used here as a stream.
- **Caret is DOM-level, not AX-level.** A real `ArrowRight` produces no CDP
  accessibility event at all, so the caret is read via `Runtime.evaluate` —
  `selectionStart` for a field, and for a `contenteditable` the length of the
  range text from the start of the editor to the selection endpoint. That last
  measure **flattens block boundaries**: a `Range`'s string form contains no
  newline for a `<div>` break, so a contenteditable caret offset means
  "characters of visible text before the caret", not an index into `innerText`.
  Compare it across subjects with care.
- **Nothing about latency or interruption.** Whether an announcement arrives
  before the user's next keystroke, and what that does to the speech queue, is
  outside what any snapshot can say.
- **Headless, one platform, one browser.** No Firefox, no WebKit, no
  platform-bridge translation (IA2 / UIA / NSAccessibility / AT-SPI2).

The intended sequel, per `editor-contract.md`, is to validate a subset of the
contract against NVDA via Guidepup on a Windows runner — confirming that passing
the contract predicts a good experience. Until that exists, read every result
here as *the editor's semantics*, never as *the user's experience*.

## Adding to the corpus

A new operation is a `operation({ id, precondition, operationText, setup,
actions, resultState, announcement })` in a contract module. A new subject is a
self-contained HTML file exposing:

```js
window.__a11ySubject = {
  id, label,
  editorSelector: '#editor',
  kind: 'rich' | 'plaintext',
  notes: '…',
}
```

and one line in `SUBJECTS` in `run.mjs`. Subjects report only their identity —
text, caret, structure and announcements are all read generically by the driver,
so a subject cannot self-report a pass.

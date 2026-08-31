# A behavioural contract for HTML editing surfaces

**Status: proposal + spike results, 2026-08.**

## The problem

Rich text editors on the web are, almost without exception, poor screen-reader
experiences — Lexical, CKEditor 5, TinyMCE, ProseMirror, Quill, Slate, and the
markdown editors like the one this project uses. Each invents its own behaviour for the
same operations, and none of them agree. A screen-reader user therefore cannot build a
transferable mental model: what `- ` does in one editor is silent in another and
announces something different in a third.

The gap is not that editors fail a rule checker. It is that **there is no specification
of what an editing surface should announce, in what order, for a given operation.**
WCAG does not say. ARIA-APG specifies widgets, not editors. W3C ARIA-AT specifies
expected AT behaviour for APG patterns, requires real screen readers, and covers no
editors.

## The proposal

Define a **normative, ordered, observable contract** per editing operation, and a
harness that measures any editor against it.

The contract for one operation looks like:

> **Operation:** at the start of an empty line, type `-` then space.
> **Expected result state:** a list structure exists with one item; the caret is inside
> that item at offset 0; the accessible tree exposes `list` → `listitem`.
> **Expected announcement:** "bulleted list, item 1" (or equivalent), announced once,
> politely.

Then: run every editor through the corpus, publish the comparison, and the resulting
table is both an indictment and a specification. Once editors converge, screen-reader
users get consistency — and screen readers themselves can begin to rely on it.

## The key insight that makes this tractable

**A programmatic text insertion is silent.** When an editor inserts `- ` after you type
a hyphen and a space, the screen reader announces nothing — the user typed two
characters and got a bullet prefix they were never told about. This is true of a
`<textarea>` and of `contenteditable` alike.

Therefore the announcement *must* come from the editor, explicitly, via a live region
(or `ariaNotify` where available). It is not something the browser can be expected to
infer. That is precisely why every editor is bad at this, and it is good news for
testing: **what must be asserted is the editor's own explicit announcement, which is
observable in the DOM and the accessibility tree.**

So the contract is largely expressible at a layer we have already proven we can reach.

## Spike results — what we can and cannot observe

### ✅ Works today (Linux, headless, no screen reader)

- **The accessibility tree** via CDP `Accessibility.getFullAXTree` — roles, names,
  descriptions, values, and the full state vocabulary (`focused`, `disabled`,
  `pressed`, `checked`, `expanded`, `level`, `live`, `atomic`, `relevant`, `busy`,
  relations). This gives the *result state* half of every contract clause.
- **Focus behaviour**, including the focus-black-hole case: disabling a focused control
  yields a tree in which no node reports `focused`.
- **Control state transitions** (`aria-pressed` etc.), asserted at sync points.
- **Real keystrokes** via `Input.dispatchKeyEvent` — so operations are driven exactly as
  a user would, not simulated with `execCommand` or synthetic events.
- **Caret position and text content** via `Runtime.evaluate` — `selectionStart` for a
  textarea, `getSelection()` anchor/focus + offsets for `contenteditable`. This is
  DOM-level rather than AX-level, but it is sufficient to assert where the caret ended
  up after an operation.
- **Live region content**, by reading the region's subtree at a sync point — which is
  exactly what the announcement half of a contract clause needs.

### ❌ Does not work / ruled out

- **`chrome.automation`** — the ideal path (the full 81-value `AXEventGenerator` stream,
  platform-independent, above the platform split; ChromeVox is built entirely on it).
  **Tested and blocked.** With MV3 `"permissions": ["automation"]` and with MV2
  `"permissions": [{"automation": {"desktop": true}}]`, loaded via `--load-extension`
  with a matching `--allowlisted-extension-id`, the extension loads and the manifest
  retains the permission, but `chrome.automation` is `undefined` in both cases.
  `automationInternal` is present in the binary and the flag is recognised, so the API
  is compiled in but gated further — most likely ChromeOS-only in `_api_features.json`,
  or requiring genuine component-extension status. **Not pursued further.**
- **CDP as an event stream.** `Accessibility.nodesUpdated` erases the event type,
  requires a tree walk to subscribe (`getFullAXTree` does not subscribe), and coalesces
  on a 250 ms throttle — so it cannot attest ordering. Use CDP **pull-based at scripted
  sync points**, never as a stream.
- **Caret movement as an AX event.** A real `ArrowRight` produces no CDP accessibility
  event at all.

### Fallback if event ordering becomes essential

AT-SPI2 over D-Bus (`at-spi-bus-launcher` + `at-spi2-registryd`; **no X server, no
`--force-renderer-accessibility` and no environment flags are actually required** —
those were premises from source reading that did not reproduce, see
[`spikes/atspi/FINDINGS.md`](../research/atspi/FINDINGS.md))
gives a typed, ordered stream including `object:text-caret-moved` with offsets and
`object:text-changed:insert` with offset/length/text. Note it is *lossier* than the
generator layer for live regions — AuraLinux drops all three live-region events — so it
complements rather than replaces the tree-snapshot approach.

## The corpus — operations to specify

Grouped by what a user is doing. Each becomes one or more contract clauses.

**Structure creation**
- `- ` / `* ` at line start → bulleted list
- `1. ` at line start → numbered list
- `# `…`###### ` → heading levels
- `> ` → blockquote
- ` ``` ` → code block entry, and how the caret exits it
- `[] ` / `- [ ] ` → task list item

**List editing** (the richest source of divergence)
- Enter at end of a non-empty item → new item; what is announced, and is the number
- Enter on an empty item → exit the list; announcement of leaving
- Tab / Shift+Tab inside an item → nest / outdent; announce the new level
- Backspace at item start → lift out of the list
- Reordering (Alt+Up/Down where supported)

**Inline formatting**
- Ctrl+B/I/U with a selection → announce applied/removed and to what
- Ctrl+B with no selection (caret style) → announce the pending state
- Toolbar button `aria-pressed` reflecting caret context

**Caret navigation and reading context**
- Arrow across a bold/italic boundary → is the style change conveyed
- Arrow into and out of a link → "link" announced on entry and exit
- Arrow across an embedded object (image, mention chip, footnote)
- Arrow across a block boundary (paragraph → heading → list)
- Home/End/Ctrl+Home; word-wise movement

**Editing state**
- Undo/redo → what is announced about what changed
- Selection extension (Shift+arrow) → announce the selected text and extent
- Find/replace where present

**Failure modes to assert against**
- The programmatic-insertion silence described above
- Focus loss when a toolbar control disables mid-edit
- Tab trapping inside the editor (our own editor had exactly this)
- A live region created in the same update as its content — emits nothing (see
  `chromium-ax-observation.md`)

## Assertion format

Borrow ARIA-AT V2's shape, which is battle-tested and legible to the field: one
`assertionId` per observable behaviour, an `assertionStatement`
("Role 'listitem' is conveyed"), an `assertionPhrase` ("convey role 'listitem'"), and a
MUST/SHOULD/MAY priority. Split each clause into **result state** (assertable from the
AX tree) and **announcement** (assertable from live-region content), because an editor
can pass one and fail the other, and the distinction is the diagnostic.

## Next steps

1. **Harness skeleton** — drive real keystrokes, capture `{ AX tree, DOM text, caret
   offset, live-region content }` at sync points, diff against expected. Linux,
   headless, no screen reader.
2. **Specify one operation end to end** — `- ` + space → bulleted list. Get the clause
   format right on a single case before scaling.
3. **Run it against a baseline set** — plain `contenteditable`, our
   `@uiw/react-md-editor` textarea, and two or three of Lexical / CKEditor 5 /
   ProseMirror / Quill / TinyMCE. The comparison table is the contribution.
4. **Validate the contract against real screen readers** — NVDA via Guidepup on a
   Windows runner, for a subset. This confirms that passing the contract predicts a good
   experience, which is the claim that makes the whole thing credible.
5. **Publish** — the corpus, the harness, and the comparison. Propose the contract to
   the editor maintainers and to ARIA-AT as an editor-focused extension.

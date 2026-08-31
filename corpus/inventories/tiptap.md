# Tiptap / ProseMirror — editing-scenario corpus

**Subject:** `@tiptap/starter-kit@3.30.5` — the configuration from Tiptap's own
getting-started guide (`new Editor({ extensions: [StarterKit] })`), the analogue of the
lexical-stock choice. Read from the shipped npm packages on **2026-08-30**; the packages
ship their TypeScript source under `src/`, so paths below are package-relative source
paths inside the pinned package (e.g. `@tiptap/core/src/Editor.ts`).

**Pins (resolved by `npm install @tiptap/core @tiptap/starter-kit @tiptap/pm`, 2026-08-30):**

| Package | Version |
|---|---|
| `@tiptap/core` | 3.30.5 |
| `@tiptap/starter-kit` | 3.30.5 |
| `@tiptap/pm` (meta-package) | 3.30.5 |
| every `@tiptap/extension-*` pulled by StarterKit | 3.30.5 |
| `prosemirror-commands` | 1.7.2 |
| `prosemirror-history` | 1.5.0 |
| `prosemirror-keymap` | 1.2.3 |
| `prosemirror-inputrules` | 1.5.1 — **shipped but unused**; see §1.2 |
| `prosemirror-model` | 1.25.11 |
| `prosemirror-state` | 1.4.4 |
| `prosemirror-view` | 1.42.3 |
| `prosemirror-schema-list` | 1.5.1 |
| `prosemirror-gapcursor` | 1.4.1 |
| `prosemirror-dropcursor` | 1.8.3 |
| `prosemirror-tables` | 1.8.5 — shipped in `@tiptap/pm`, **not used by StarterKit** |

Per [`../editor-landscape.md`](../../docs/editor-landscape.md): ProseMirror's canonical repository
left GitHub in 2026-04 for a self-hosted Forgejo instance. Everything here is therefore
pinned **by npm version only**; no GitHub commit hashes, no GitHub star counts.

**Purpose:** the Tiptap/ProseMirror row-set for the corpus defined in
[`../layered-gap-analysis.md`](../../docs/the-gap.md), matching the shape and column
discipline of [lexical.md](lexical.md). Buckets:

- **B1 — automated conversion.** The user typed ordinary characters; the editor changed
  the document unasked.
- **B2 — user-initiated change.** The user pressed a command and needs the resulting *state*.
- **B3 — menus and popups.**
- **CB — container boundaries** (own ID range, same schema; each row carries the bucket
  of its trigger).

`currentSR` is what a screen reader user gets **today**. Derived-from-source claims are
stated plainly; claims that depend on browser/AT behaviour not measured here are marked
`INFERRED`. Per [canonical.md](../canonical.md)'s vocabulary: **`n/a` (not implemented) is
never conflated with silence** — a row Tiptap does not implement says so explicitly and
is not a failure.

**The one-line finding, up front:** StarterKit implements 111 of the 123 operations
enumerated below and **announces zero of them**. There is no live region, no announcer,
no announcement utility, and no `aria-*` state attribute anywhere in the shipped Tiptap +
ProseMirror code that StarterKit loads (§7). The only ARIA in the whole subject is a
single hardcoded `role="textbox"` on the editor root — with no `aria-multiline`, and no
accessible name unless the integrator supplies one. Everything that reaches a screen
reader user reaches them through the real HTML the reconciler emits (which is generally
good) and the platform's own reading of it. Lexical at least ships four announcers;
CKEditor announces some widgets. Tiptap's editor-originated announcement count is **0**.

---


> **MEASURED 2026-08-30** (harness subject `tiptap`, two byte-identical runs — see
> [`../harness/subjects/tiptap/MEASUREMENT.md`](../../suite/subjects/tiptap/MEASUREMENT.md)):
> the headline prediction held exactly — **zero announcements and zero live regions across
> all 24 measured operations**. Five corrections from measurement: (1) `<pre>` maps to
> `generic` in Chromium's AX tree, so "more structure than Lexical emits" is DOM-only —
> both editors hand the platform the same single `code` role (TT-CB-017); (2) Chromium
> computes `multiline:true` for the nameless textbox, narrowing TT-B2-047's single-line
> risk to non-Chromium mappings; (3) blockquote exit takes **2 Enters** measured
> (TT-CB-010, top-level); (4) empty top-level list item: one Enter, item consumed, caret
> in a `<p>` outside (TT-B2-015); (5) list nesting is real — nested `<ul>` with computed
> level 2 and no `aria-level`; no `posInSet` on `<ol>` items. Tiptap is the only rich
> subject passing `list.nest`/`list.outdent` structure.

## 1. What counts as "the configuration"

### 1.1 The StarterKit extension inventory

`@tiptap/starter-kit/src/starter-kit.ts` (lines 177–273) registers, all default-on:

| # | Extension | Kind | Buckets touched |
|---|---|---|---|
| 1 | `Bold` (`@tiptap/extension-bold`) | mark | B1 + B2 |
| 2 | `Blockquote` (`@tiptap/extension-blockquote`) | node | B1 + B2 + CB |
| 3 | `BulletList` (`@tiptap/extension-list`, re-exported via `@tiptap/extension-bullet-list`) | node | B1 + B2 + CB |
| 4 | `Code` (`@tiptap/extension-code`) | mark | B1 + B2 |
| 5 | `CodeBlock` (`@tiptap/extension-code-block`) | node | B1 + B2 + CB |
| 6 | `Document` (`@tiptap/extension-document`) | node | — |
| 7 | `Dropcursor` (`@tiptap/extensions`, wraps `prosemirror-dropcursor@1.8.3`) | plugin | visual only |
| 8 | `Gapcursor` (`@tiptap/extensions`, wraps `prosemirror-gapcursor@1.4.1`) | plugin | B2 + CB |
| 9 | `HardBreak` (`@tiptap/extension-hard-break`) | node | B2 |
| 10 | `Heading` (`@tiptap/extension-heading`) | node | B1 + B2 |
| 11 | `UndoRedo` (`@tiptap/extensions`, wraps `prosemirror-history@1.5.0`) | plugin | B2 |
| 12 | `HorizontalRule` (`@tiptap/extension-horizontal-rule`) | node | B1 + B2 |
| 13 | `Italic` (`@tiptap/extension-italic`) | mark | B1 + B2 |
| 14 | `ListItem` (`@tiptap/extension-list`) | node | B2 + CB |
| 15 | `ListKeymap` (`@tiptap/extension-list`) | extension | B2 + CB |
| 16 | `Link` (`@tiptap/extension-link`) | mark | B1 + B2 |
| 17 | `OrderedList` (`@tiptap/extension-list`) | node | B1 + B2 + CB |
| 18 | `Paragraph` (`@tiptap/extension-paragraph`) | node | B2 |
| 19 | `Strike` (`@tiptap/extension-strike`) | mark | B1 + B2 |
| 20 | `Text` (`@tiptap/extension-text`) | node | — |
| 21 | `Underline` (`@tiptap/extension-underline`) | mark | B2 |
| 22 | `TrailingNode` (`@tiptap/extensions`) | plugin | B1 |

Plus the **core extensions** every Tiptap editor loads
(`@tiptap/core/src/Editor.ts` lines 461–490): `Editable`, `ClipboardTextSerializer`,
`Commands`, `FocusEvents`, `Keymap` (the Enter/Backspace/Delete chains — §4.1),
`Tabindex` (`tabindex="0"` when editable), `Drop`, `Paste`, `Delete`, `TextDirection`.

**Not in StarterKit** (and therefore `n/a` rows here, never `silent`): `TaskList` /
`TaskItem` (in `@tiptap/extension-list` but only registered by `ListKit`, not
StarterKit — `@tiptap/extension-list/src/kit/index.ts`), tables
(`prosemirror-tables` ships in `@tiptap/pm` but no table extension is registered),
highlight, subscript, superscript, text-align, images, mentions, emoji, any menu UI
(BubbleMenu/FloatingMenu are separate packages), any toolbar, any dialog, find/replace,
and the `@tiptap/markdown` document-level markdown parser (the `parseMarkdown` /
`renderMarkdown` specs visible on every extension are consumed only by that separate
package; StarterKit itself does **not** convert pasted markdown documents — only the
per-mark paste rules of §3 apply).

### 1.2 Which layer owns which behaviour — read before citing

- **Autoformat is Tiptap's own engine, not ProseMirror's.** `prosemirror-inputrules@1.5.1`
  is shipped inside `@tiptap/pm` but **nothing in any `@tiptap/*` package imports it**
  (grep over all `@tiptap/*/src`: zero hits). All input rules run through
  `@tiptap/core/src/InputRule.ts`: a plugin whose triggers are `handleTextInput` (fires on
  the trigger character itself), a `handleKeyDown` branch for Enter (`text: '\n'`,
  lines 290–308), and a `compositionend` DOM handler that re-runs rules **inside a
  `setTimeout`** (lines 267–286). Paste rules are `@tiptap/core/src/PasteRule.ts`.
- **Keyboard shortcuts** are per-extension maps compiled into `prosemirror-keymap@1.2.3`
  plugins by `@tiptap/core/src/ExtensionManager.ts` (line 146). The Enter/Backspace/Delete
  fallback chains are Tiptap's own `Keymap` core extension
  (`@tiptap/core/src/extensions/keymap.ts`), which replaces `prosemirror-commands`'
  `baseKeymap` but delegates the individual steps (`joinBackward`, `liftEmptyBlock`,
  `newlineInCode`, `exitCode`, …) to `prosemirror-commands@1.7.2`.
- **Undo/redo** is `prosemirror-history@1.5.0` verbatim, wrapped by
  `@tiptap/extensions/src/undo-redo/undo-redo.ts`.
- **List depth commands** (`sinkListItem`, `liftListItem`) wrap
  `prosemirror-schema-list@1.5.1`; `splitListItem` is Tiptap's own reimplementation
  (`@tiptap/core/src/commands/splitListItem.ts`).
- **Selection rendering** (NodeSelection, gap cursor, hidden selections) is
  `prosemirror-view@1.42.3` (`src/selection.ts`, `src/capturekeys.ts`).

### 1.3 Node and mark catalogue — DOM produced and accessible exposure

| Node / mark | DOM produced | Accessible exposure |
|---|---|---|
| `Paragraph` | `<p>` | correct |
| `Heading` | `<h1>`–`<h6>` (`heading.ts` renderHTML) | correct heading + level — AT-native |
| `Blockquote` | `<blockquote>` | correct |
| `CodeBlock` | **`<pre><code class="language-x">`** (`code-block.ts:147–161`) | `<pre>` is generic; `<code>` maps to the `code` role in modern browser AAMs (INFERRED for what ATs voice). Language is a **CSS class only** — no visible chip, no data attribute, no name |
| `BulletList`/`OrderedList`/`ListItem` | `<ul>` / `<ol start type>` / `<li>`, real nesting (`<li>` content is `paragraph block*`, so nested lists are true descendants) | correct list semantics; no `aria-level` emitted (none needed if AT computes nesting) |
| `Link` mark | `<a href target="_blank" rel="noopener noreferrer nofollow">` (`link.ts:263–266` defaults) | correct link; `target="_blank"` is on **every** link by default |
| `Bold`/`Italic`/`Strike`/`Underline`/`Code` marks | `<strong>` / `<em>` / `<s>` / `<u>` / `<code>` | real elements; formatting boundaries exist in the DOM for platform text APIs |
| `HorizontalRule` | `<hr>` | `separator` role — AT-native as content; as a *caret stop* see TT-B2-042 |
| `HardBreak` | `<br>` (`selectable: false`) | AT-native line break |
| editor root | `<div class="ProseMirror" contenteditable="true" tabindex="0" role="textbox">` | **`role="textbox"` hardcoded** (`@tiptap/core/src/Editor.ts:598–601`); **no `aria-multiline`** (grep: zero hits in the whole install), so AT may present it as a single-line field (INFERRED); **no accessible name** unless the integrator passes `editorProps.attributes` |

Contrast with Lexical worth keeping: Tiptap's code block is a real `<pre><code>` where
Lexical emits a bare `<code>`; Tiptap has no checklist in the default config, so it has
no equivalent of Lexical's `role="checkbox"`-destroys-`listitem` defect (the TaskItem
that *would* introduce a comparable shape is not in StarterKit).

---

## 2. The command surface

Every StarterKit operation is an editor command (`editor.commands.*`) declared per
extension: `setBold/toggleBold/unsetBold` and equivalents for italic, strike, underline,
code (`extension-*/src/*.ts` `addCommands()`); `setBlockquote/toggleBlockquote/unsetBlockquote`;
`setHeading/toggleHeading`; `setParagraph`; `toggleBulletList`; `toggleOrderedList`;
`setCodeBlock/toggleCodeBlock`; `setHorizontalRule`; `setHardBreak`;
`setLink/toggleLink/unsetLink`; `undo/redo`; plus the ~60 generic commands in
`@tiptap/core/src/commands/` (`splitListItem`, `sinkListItem`, `liftListItem`,
`toggleList`, `clearNodes`, `selectAll`, `undoInputRule`, `exitCode`, …).

**None of these commands emits any announcement, with no exceptions.** There is no
announcement mechanism for a command to call (§7). This differs from Lexical, where
`UNDO_COMMAND`/`REDO_COMMAND` are hooked by `HistoryAnnounceExtension`: in Tiptap, undo
and redo are exactly as silent as everything else.

---

## 3. B1 — Automated conversion

Firing rules, verified in `@tiptap/core/src/InputRule.ts`:

- rules fire from `handleTextInput` — the trigger character never lands in the document;
  the rule's transaction replaces it (so `---` fires on the **third dash**, no
  confirming keystroke);
- an Enter keydown re-runs rules with `text: '\n'` (lines 290–308) — this is how the
  code fence fires on Enter;
- `compositionend` re-runs rules in a `setTimeout` (lines 267–286);
- every rule's transaction stores an undo record (`tr.setMeta(plugin, {transform, from,
  to, text})`, lines 183–190) consumed by `undoInputRule`
  (`@tiptap/core/src/commands/undoInputRule.ts`) — Backspace immediately after any
  conversion restores the literal typed text (TT-B1-018).

Mark input rules require the match to be preceded by start-of-block or whitespace
(`(?:^|\s)` in every regex), so intraword `*`/`_`/`~` does not convert.

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| TT-B1-001 | B1 | `# ` (`heading.ts` `addInputRules`, `^(#{1,1})\s$` for level 1) | document structure | yes — `<h1>` | marker vanishes; large bold line | **nothing.** No announcer exists anywhere in the product | this line became a heading, level 1; the `#` was consumed | transition | high |
| TT-B1-002 | B1 | `## ` … `###### ` (per-level rules, `^(#{1,N})\s$`) | document structure | yes — `<h2>`–`<h6>` | as above | nothing | the level, exactly | transition | high |
| TT-B1-003 | B1 | `- ` / `* ` / `+ ` (`bullet-list.ts:49` `bulletListInputRegex = /^\s*([-+*])\s$/`, via `wrappingInputRule`) | document structure | yes — `<ul><li><p>` | bullet appears | nothing | a bulleted list started; you are in item 1 | transition | high |
| TT-B1-004 | B1 | `1. ` / `N. ` (`ordered-list.ts:61` `/^(\d+)\.\s$/`; `start` attr set to N; **`joinPredicate` silently merges into a preceding ordered list when N continues its sequence**, `ordered-list.ts:336–350`) | document structure | yes — `<ol start=N><li>` | number appears; may visually fuse with the list above | nothing — including the merge, which changes item count and numbering of an existing list | an ordered list started at N — or **your item was appended to the existing list above** | transition | high |
| TT-B1-005 | B1 | `> ` (`blockquote.tsx:35` `inputRegex = /^\s*>\s$/`) | document structure | yes — `<blockquote>` | rule + indent appear | nothing | you are now inside a quotation | transition | medium |
| TT-B1-006 | B1 | ```` ``` ```` or `~~~` + space **or Enter** (`code-block.ts:73,78` `backtickInputRegex = /^```([a-z]+)?[\s\n]$/`, `tildeInputRegex`; Enter path via `InputRule.ts` `handleKeyDown`) | document structure | yes — `<pre><code>` | monospace block | nothing | you are in a code block; marks/spellcheck semantics changed | transition | medium |
| TT-B1-007 | B1 | ```` ```ts ```` — the info string sets the `language` attribute (`code-block.ts:110–136`) | document structure | attribute only — a `language-ts` **class** on the `<code>`; `rendered: false` for the attr itself | syntax colours only if the integrator adds a highlighter (StarterKit ships none) | nothing; the language exists **only as a CSS class** — no name, no data attribute, nothing queryable | the code block's language is TypeScript | **both** | medium |
| TT-B1-008 | B1 | `---` — fires on the **third dash, no confirming keystroke** (`horizontal-rule.ts:131` `/^(?:---\|—-\|___\s\|\*\*\*\s)$/` via `nodeInputRule`; the `—-` variant catches OS em-dash autocorrect) | document structure | yes — `<hr>` | a rule appears mid-typing | nothing | a horizontal rule replaced what you typed; where the caret went (**caret landing needs measurement**) | transition | low |
| TT-B1-009 | B1 | `**x**` (`bold.tsx:34` `starInputRegex`) | inline formatting | yes — `<strong>` | asterisks vanish, text bolds | nothing | that run is now bold; delimiters consumed | transition | high |
| TT-B1-010 | B1 | `__x__` (`bold.tsx:44` `underscoreInputRegex`) | inline formatting | yes — `<strong>` | as above | nothing | as above | transition | medium |
| TT-B1-011 | B1 | `*x*` (`italic.ts:37`) | inline formatting | yes — `<em>` | markers vanish | nothing | that run is now italic | transition | high |
| TT-B1-012 | B1 | `_x_` (`italic.ts:47`) | inline formatting | yes — `<em>` | as above | nothing | as above | transition | medium |
| TT-B1-013 | B1 | `~~x~~` (`strike.ts:37`) | inline formatting | yes — `<s>` | strike line | nothing | that run is struck through | transition | medium |
| TT-B1-014 | B1 | `` `x` `` (`code.ts:51–73` function-based finder) | inline formatting | yes — `<code>` mark; `excludes: '_'` silently strips other marks | monospace pill | nothing | that run is inline code | transition | medium |
| TT-B1-015 | B1 | typing a URL, then **space or Enter** — the `autolink` plugin links the last word only after trailing whitespace confirms it (`extension-link/src/helpers/autolink.ts:99–121` whitespace test; linkifyjs `tokenize`; refuses IPs, `localhost`, `user:pass@` forms via `shouldAutoLink`, `link.ts:270–293`) | document structure | yes — `<a href target="_blank">` | text turns into a link one keystroke after you finished it | **nothing** — contrast Lexical, which announces `"Link"` here; note a refused URL (IP, no TLD) is just as silent as a successful link | what you typed is now a link, and to what target | transition | high |
| TT-B1-016 | B1 | editing a link so it no longer matches → automatic unlink | — | — | — | **n/a — not implemented.** The autolink plugin only ever adds marks (no `removeMark` in `autolink.ts`; grep: zero hits). A broken URL keeps its stale `href`. Recorded for contrast: Lexical implements *and announces* auto-unlink | — | n/a | n/a |
| TT-B1-017 | B1 | `[text](url)` markdown-link typing conversion | — | — | — | **n/a by default** — implemented behind `markdownLinks: false` (`link.ts:259`, "TODO (major) — default to true on next major version"); the getting-started config never fires it | — | n/a (config-gated) | n/a |
| TT-B1-018 | B1 | **Backspace immediately after any input rule** → `undoInputRule` reverts the conversion and restores the literal text (`@tiptap/core/src/commands/undoInputRule.ts`; first entry in the core Backspace chain, `extensions/keymap.ts:16`, and in `ListKeymap`'s) | document structure | yes — the structure is destroyed, the typed characters return | the heading/list/quote pops back to plain text | nothing — the one genuine B1 recovery affordance in the product, itself undiscoverable and unannounced | the conversion was undone; your literal text is back | transition | medium |
| TT-B1-019 | B1 | **pasting plain text containing `**x**` / `*x*` / `~~x~~` / `` `x` `` ** — mark paste rules transform the pasted content and consume the delimiters (`bold.tsx:39,49` `starPasteRegex`/`underscorePasteRegex`; `italic.ts:42,52`; `strike.ts:42`; `code.ts:75–99`; engine `@tiptap/core/src/PasteRule.ts`) | document structure | yes — marks applied to pasted text | pasted text arrives formatted, delimiters gone | nothing. **No Lexical/CKEditor analogue** — their markdown transformers do not run on paste; a Tiptap paste can differ from the clipboard text in ways the user never sees | the pasted text was transformed; delimiters were consumed | transition | medium |
| TT-B1-020 | B1 | pasting text containing a bare URL → link mark applied (`link.ts` `addPasteRules` `findPlainUrls`, linkifyjs `find`) | document structure | yes — `<a href>` inside the paste | links appear in pasted text | nothing | the paste contains N links now | transition | medium |
| TT-B1-021 | B1 | pasting a URL **over a text selection** → the selection becomes a link with that URL as `href`; the URL text itself is not inserted (`helpers/pasteHandler.ts`; `linkOnPaste: true` default) | document structure | yes — link mark on existing text | the selected words turn into a link | nothing — the paste inserted no text at all, which is not what paste normally does | your selection became a link to the pasted URL; the URL text was not inserted | transition | medium |
| TT-B1-022 | B1 | pasting code copied from VS Code → the whole paste becomes a **code block** with the language taken from clipboard metadata (`code-block.ts:457–513`, `vscode-editor-data`) | document structure | yes — `<pre><code class="language-x">` | a monospace block appears instead of inline text | nothing — a whole-block conversion decided by invisible clipboard metadata | your paste became a code block, language X | transition | low |
| TT-B1-023 | B1 | ending the document with a non-paragraph block → `TrailingNode` auto-inserts an empty trailing paragraph (`@tiptap/extensions/src/trailing-node/trailing-node.ts`) | document structure | yes — an empty `<p>` appended | an extra blank line exists below | nothing; the user never typed it. Mostly benign, but arrow-down lands in a paragraph the user did not create | (low-stakes) an empty paragraph exists after your block | transition | low |
| TT-B1-024 | B1 | any of the above committed through an IME — `compositionend` re-runs all rules **inside a `setTimeout`** (`InputRule.ts:267–286`) | document structure | yes | identical | identical silence; note for the harness: the timer means the conversion lands a tick after the composition event (a race by this project's own standards — measure, don't assume ordering) | the same transition, mid-composition | transition | low |
| TT-B1-025 | B1 | smart quotes, em-dashes, `==highlight==`, autocorrect | — | — | — | **n/a — not implemented.** StarterKit registers no `textInputRule` and no highlight/typographic transformer. Recorded so the corpus stays comparable (Lexical implements `==x==`; CKEditor implements typographic substitution) | — | n/a | n/a |

---

## 4. B2 — User-initiated change

### 4.1 The keyboard map, complete

Per-extension `addKeyboardShortcuts()` (all compiled into `prosemirror-keymap` plugins):

`Mod-b`/`Mod-B` bold · `Mod-i`/`Mod-I` italic · `Mod-u`/`Mod-U` underline ·
`Mod-Shift-s` strike · `Mod-e` inline code · `Mod-Shift-b` blockquote ·
`Mod-Alt-1`…`Mod-Alt-6` heading (`heading.ts:128–135`) · `Mod-Alt-0` paragraph ·
`Mod-Shift-8` bullet list · `Mod-Shift-7` ordered list · `Mod-Alt-c` code block ·
`Enter`/`Tab`/`Shift-Tab` in list items (`list-item.ts:198–204`) ·
`Backspace`/`Delete`/`Mod-Backspace`/`Mod-Delete`/`Tab` list restructuring
(`ListKeymap`, `keymap/list-keymap.ts`) · `Shift-Enter`/`Mod-Enter` hard break
(`hard-break.ts:115–119`) · `Mod-z` undo, `Shift-Mod-z`/`Mod-y` redo, plus Russian-layout
`Mod-я` variants (`undo-redo.ts:74–82`) · Blockquote `Backspace` restructuring
(`blockquote.tsx` + `handleBackspace.ts`) · CodeBlock `Backspace`/`Tab`/`Shift-Tab`/
`Enter`/`ArrowUp`/`ArrowDown` (`code-block.ts:210–435`).

Core `Keymap` chains (`@tiptap/core/src/extensions/keymap.ts:61–78`):
**Enter** → `newlineInCode` → `createParagraphNear` → `liftEmptyBlock` → `splitBlock`;
**Backspace** → `undoInputRule` → clear-first-textblock → `deleteSelection` →
`joinBackward` → `selectNodeBackward`; **Delete** → `deleteSelection` →
`deleteCurrentNode` → `joinForward` → `selectNodeForward`; `Mod-a` select-all;
macOS extras (`Ctrl-h/d`, `Alt-Backspace`, `Ctrl-a`/`Ctrl-e`).

**There is no link shortcut** (`link.ts` has no `addKeyboardShortcuts`), no Escape
handler, no toolbar, and no Alt+F10 analogue — StarterKit ships zero chrome.

### 4.2 Where the pending-format state lives — the same crux as Lexical, one layer down

1. `Mod-b` → `toggleBold` → `toggleMark` (`@tiptap/core/src/commands/toggleMark.ts`) →
   `setMark`/`unsetMark`.
2. With a **collapsed caret**, `setMark` calls `tr.addStoredMark(...)`
   (`@tiptap/core/src/commands/setMark.ts:81`); the underlying ProseMirror primitive is
   `EditorState.storedMarks` (`prosemirror-commands/src/commands.ts:636–639` shows the
   canonical `addStoredMark` path).
3. `storedMarks` is a field on the **editor state object**. It produces no DOM node, no
   attribute, no class, and is cleared by any selection movement. With no toolbar in
   StarterKit, there is not even a visual cue: **the pending state is invisible to
   sighted users too.**
4. With a **range selection**, the mark is applied to the text and real `<strong>`/`<em>`
   elements appear — recoverable by re-reading, never announced at the moment.

This is bit-for-bit the LEX-B2-002 failure (there it is `RangeSelection.format`; here it
is `EditorState.storedMarks` — ProseMirror is where that design pattern originates). No
transition event, no queryable state, nothing to point an announcement at.

### 4.3 B2 scenarios

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| TT-B2-001 | B2 | Mod-b with a **range** selection | inline formatting | yes — `<strong>` around the selection | text bolds | nothing at the moment of the command; recoverable only by re-reading the run | bold was **applied** (vs removed), and to how much | transition | high |
| TT-B2-002 | B2 | Mod-b with a **collapsed** caret | **pending style** | **no — nothing exists in the DOM** (§4.2) | **none — StarterKit has no toolbar, so even sighted users get nothing** | nothing, and nothing inspectable | bold is now on for what you type next | transition, no state anchor | high |
| TT-B2-003 | B2 | Mod-b again (untoggle), either mode | inline / pending | same mechanism | none | nothing — "on" and "off" indistinguishable | the **direction** of the toggle | transition | high |
| TT-B2-004 | B2 | Mod-i, Mod-u, Mod-Shift-s, Mod-e — the other four marks | inline / pending | as 001/002 | none | the same silence for all five StarterKit marks | which format toggled, to which value | transition | high |
| TT-B2-005 | B2 | moving the caret while a stored mark is pending → the pending format is **dropped** (ProseMirror clears `storedMarks` on selection change, `prosemirror-state@1.4.4` semantics) | pending style | no | none | nothing — the LEX-B2-063 failure, arriving on every caret move | the format you toggled is no longer in effect | transition | medium |
| TT-B2-006 | B2 | **ArrowRight at the end of a block while inside an inline-code mark** → `Mark.handleExit` removes the stored mark **and inserts a space character** (`@tiptap/core/src/Mark.ts:176–199`; bound because `Code` sets `exitable: true`, `code.ts:113`) | document content + pending style | yes — a real space is added by an arrow key | the caret moves and a space appears | nothing — **a caret key that edits the document** | ArrowRight inserted a space and turned code formatting off | transition | medium |
| TT-B2-007 | B2 | Mod-b (or any mark) inside a code block → refused by schema (`code-block.ts:102` `marks: ''`) | *nothing* | n/a | nothing moves | nothing; the refusal is indistinguishable from success | the command did **not** apply; marks are impossible here | transition | medium |
| TT-B2-008 | B2 | Mod-Alt-1…6 → `toggleHeading` | document structure | yes — `<hN>` | line restyles | nothing (contrast Lexical: "Heading level N") | this block is a heading at level N — or stopped being one | transition | high |
| TT-B2-009 | B2 | Mod-Alt-0 → `setParagraph` | document structure | yes | styling drops | nothing | this block is now a plain paragraph | transition | medium |
| TT-B2-010 | B2 | Mod-Shift-b → `toggleBlockquote` (`toggleWrap`) | document structure | yes — `<blockquote>` | rule appears/vanishes | nothing | you are now in / out of a quotation | transition | medium |
| TT-B2-011 | B2 | Mod-Shift-8 → `toggleBulletList` | document structure | yes | bullets appear on selected blocks | nothing | a list was created (N items) — or removed | transition | high |
| TT-B2-012 | B2 | Mod-Shift-7 → `toggleOrderedList` | document structure | yes | numbers appear | nothing | an ordered list; item N of M | transition | high |
| TT-B2-013 | B2 | Mod-Alt-c → `toggleCodeBlock` | document structure | yes — `<pre><code>` | monospace block | nothing | you are in a code block; marks and spellcheck semantics changed | transition | medium |
| TT-B2-014 | B2 | Enter at the end of a list item → `splitListItem` (`list-item.ts:200`) | document structure | yes — a new `<li><p>` | new marker | nothing from the editor; the new item may be spoken from platform semantics (INFERRED) | a new item; its ordinal if ordered | transition | high |
| TT-B2-015 | B2 | Enter on an **empty top-level** item — `splitListItem` bails ("let next command handle lifting", `splitListItem.ts:49–59`) → core Enter chain → `liftEmptyBlock` (`prosemirror-commands@1.7.2`) lifts the paragraph out of the list | container exit | yes — bullet disappears, caret un-indents, the list **splits in two** if items follow | the caret leaves the list | **nothing.** The classic escape hatch, unannounced (**exact endpoint — one lift vs. out-of-list — needs measurement**) | you left the list; the list may have split | transition | high |
| TT-B2-016 | B2 | Enter on an empty **nested** last item → `splitListItem`'s empty-block branch splits the wrapping item — the caret drops **one level and stays in the list** (`splitListItem.ts:60–115`) | depth change | yes | one un-indent step, marker kept | nothing — and the identical keystroke has a different outcome than TT-B2-015 | you dropped to level N−1 and are still in the list | transition | medium |
| TT-B2-017 | B2 | Tab in a list item → `sinkListItem` (`list-item.ts:201`, wraps `prosemirror-schema-list@1.5.1`) | depth change | yes — a genuine nested `<ul>`/`<ol>` | one indent step | nothing | your nesting level increased to N | transition | high |
| TT-B2-018 | B2 | Tab in the **first** item (or wherever sink is impossible) — `sinkListItem` returns false, `ListKeymap`'s Tab returns false, **the keydown is unhandled and browser Tab moves focus out of the editor** | focus | n/a | focus ring leaves the editor | AT announces the newly focused element (platform), but nothing explains that the *same key* indents in one position and ejects you in another | Tab did not indent; you left the editor | transition | medium — **needs measurement** |
| TT-B2-019 | B2 | Shift-Tab → `liftListItem` (`list-item.ts:202`) | depth change | yes | one step out | nothing | your level decreased to N | transition | high |
| TT-B2-020 | B2 | Backspace at the start of a list item's first block → `ListKeymap.handleBackspace` → `liftListItem` (`keymap/listHelpers/handleBackspace.ts:50–69`) | container exit / depth change | yes | bullet vanishes | nothing — one keystroke, outcome depends on depth | you left the list / dropped a level | transition | high |
| TT-B2-021 | B2 | Backspace at the start of a paragraph **directly after a list** → the paragraph's content is pulled **into the last list item** (`handleBackspace.ts:22–48` `hasListBefore` branch: cut + `joinForward`) | container entry + merge | yes | the text joins the last bullet | **nothing.** The user pressed delete and their paragraph silently became part of a list item | your paragraph was merged into the last list item | transition | medium |
| TT-B2-022 | B2 | **Tab at the start of a paragraph directly after a list** → the whole paragraph is **moved inside the list's last item** (`keymap/listHelpers/handleTab.ts` — delete block, re-insert inside the last `<li>`) | container entry + move | yes | the paragraph indents into the list | **nothing** — Tab as a block-relocating key, with no announcement and no visible logic for a blind user | your paragraph is now inside the list, in item M | transition | low |
| TT-B2-023 | B2 | Delete at the end of a list item → joins the next item in (`handleDelete.ts`: `joinItemForward` / lift-then-join when depths differ); a following **branching nested sublist is hoisted** by a priority-101 keymap (`helpers/createBranchingListDeleteKeymap.ts`) | document structure | yes — items merge; sublists re-parent | text joins; markers shift | nothing — a single Delete can restructure several levels | the items merged; what happened to the sublist | transition | medium |
| TT-B2-024 | B2 | Enter inside a code block → `newlineInCode` (first in the core Enter chain) | document content | yes — `\n` in the block | new code line | nothing — correctly the non-event (invariant C-2) | ideally nothing | none | high |
| TT-B2-025 | B2 | **Enter at the end of a code block whose text ends with two newlines** → the two blank lines are deleted and `exitCode` inserts a paragraph after (`code-block.ts:340–369`, `exitOnTripleEnter: true` default) | container exit | yes | the caret drops out; two blank lines vanish | **nothing.** The escape hatch is undiscoverable and unannounced — same triple-Enter contract as Lexical's code block | you left the code block; the blank lines were consumed | transition | medium |
| TT-B2-026 | B2 | ArrowDown at the end of a code block: with a node after, caret moves to it (`Selection.near`); with **no** node after, `exitCode` **creates a paragraph** (`code-block.ts:399–434`, `exitOnArrowDown: true`) | container exit (+ possible structure creation) | yes | caret leaves; a new empty line may appear | nothing — an arrow key that can create a block | you left the code block; a paragraph may have been created | transition | high |
| TT-B2-027 | B2 | ArrowUp at the very start of a code block that is the first document node → `insertDefaultBlock` before it (`code-block.ts:372–396`) | structure creation | yes — a paragraph above | a blank line appears above | nothing | a paragraph was created above the code block | transition | low |
| TT-B2-028 | B2 | Backspace in a code block when empty or at document start → `clearNodes()` — **the whole block becomes a paragraph** (`code-block.ts:215–228`) | container destroyed | yes | monospace styling vanishes | nothing — one keystroke dissolves the container | the code block was dissolved, not one character deleted | transition | medium |
| TT-B2-029 | B2 | Tab inside a code block — `enableTabIndentation: false` **by default** (`code-block.ts:94`), the handler returns false, **focus leaves the editor** | focus | n/a | focus ring leaves | platform announces the next control; nothing says the editor was exited by a key that does something else in lists | Tab left the editor (indentation is not enabled) | transition | medium |
| TT-B2-030 | B2 | Shift-Enter / Mod-Enter → `setHardBreak` (`hard-break.ts:115–119`; the command tries `exitCode` first, then inserts `<br>`) | document structure | yes — `<br>` | line drops without a new block | nothing distinguishes it from Enter | this is a soft break inside the same block | transition | medium |
| TT-B2-031 | B2 | Mod-Enter while inside a code block → `exitCode` (first branch of `setHardBreak`) — leaves the block instead of inserting a break | container exit | yes | the caret drops out | nothing — the same keystroke means "line break" outside code and "exit" inside it | you left the code block | transition | low |
| TT-B2-032 | B2 | Backspace at the very start of the document in an empty non-paragraph block (e.g. an empty heading) → `clearNodes` converts it to a paragraph (core keymap step 2, `extensions/keymap.ts:18–46`) | container destroyed | yes | styling vanishes | nothing | the heading was dissolved into a paragraph | transition | low |
| TT-B2-033 | B2 | Backspace at the start of a **non-first child of a blockquote** → the child is lifted out, **splitting the quote in two** (`extension-blockquote/src/handleBackspace.ts` case 1) | container exit + split | yes | the block leaves the quote; two quotes remain | **nothing** — one keystroke turns one quotation into two with the caret outside both | your block left the quotation; the quote was split | transition | medium |
| TT-B2-034 | B2 | Backspace at the start of a paragraph **directly after a blockquote** → the paragraph's inline content merges **into the quote's last textblock** (`handleBackspace.ts` case 2) | container entry + merge | yes | text joins the quoted block | **nothing.** The user pressed delete and silently became a quote author — the same failure as LEX-CB-005 | your text was moved into the quotation | transition | medium |
| TT-B2-035 | B2 | Delete at the end of the paragraph above a blockquote → core `joinForward` pulls the quote's first textblock **out** into the paragraph | container exit (content) | yes | quoted text loses its rule | nothing | text was pulled out of the quotation | transition | medium |
| TT-B2-036 | B2 | Mod-z → `undo` (`prosemirror-history@1.5.0` via `undo-redo.ts`) | document structure (arbitrary) | yes | the document snaps back | **nothing — not even a constant string.** Contrast Lexical's "Undone". Tiptap has no announcement channel to say it through | what was undone; where the caret landed | transition | high |
| TT-B2-037 | B2 | Shift-Mod-z / Mod-y → `redo` | document structure | yes | change returns | nothing | what was redone | transition | medium |
| TT-B2-038 | B2 | undo granularity: events within 500 ms group into one step (`newGroupDelay: 500`, `undo-redo.ts:53`; depth 100) | — | — | — | nothing exposes the grouping; one Mod-z reverts an unknowable amount | how much a single undo will revert | transition | low |
| TT-B2-039 | B2 | Mod-a → `selectAll` | selection | n/a | everything highlights | AT-native (INFERRED) | the extent of the selection | transition | medium |
| TT-B2-040 | B2 | select-all then type/delete → the `clearDocument` appendTransaction additionally converts the residual block to a paragraph (`extensions/keymap.ts:103–163`) | document structure | yes | e.g. a heading style silently disappears with the content | nothing — a second, invisible transform appended to the user's edit | the replacement landed in a plain paragraph, not the old block type | transition | low |
| TT-B2-041 | B2 | Mod-v paste of rich content (core `Paste` extension emits an event for integrators, `extensions/paste.ts`; PM inserts the slice) | document structure | yes | a block of content lands | nothing — no feedback of what landed or how much; plus the silent transformations of TT-B1-019…022 | what landed, and how much | transition | high |
| TT-B2-042 | B2 | Arrow onto an `<hr>` → **`NodeSelection`** (`prosemirror-view/src/capturekeys.ts:38–39`). Unlike Lexical, PM **does set a DOM selection spanning the node** — but hides it: `NodeSelection.prototype.visible = false` (`prosemirror-state/src/selection.ts:378`) adds `ProseMirror-hideselection`, whose CSS makes the selection and caret transparent (`@tiptap/core/src/style.ts:57–67`) | selection/caret | a real but **visually hidden** DOM range | the node gets a `.ProseMirror-selectednode` outline | nothing from the editor. Whether AT reports the hidden DOM selection change is unknown — **the sharpest measurement target in this inventory** (INFERRED both ways) | you are on an object; what it is; you are not in text | **both** | medium |
| TT-B2-043 | B2 | Backspace/Delete on a `NodeSelection` → the node is removed | document structure | yes | the rule vanishes | nothing | the object was deleted | transition | medium |
| TT-B2-044 | B2 | Arrow into a position with no text block (before/after an `<hr>` at a document edge, between two leaf blocks) → **gap cursor** (`prosemirror-gapcursor@1.4.1`; `GapCursor.prototype.visible = false`, `src/gapcursor.ts:88`; drawn as a `.ProseMirror-gapcursor` widget) | selection/caret | **no visible DOM caret** — a decoration widget fakes one | a thin blinking line between blocks | nothing; the caret position likely does not exist for the platform text API (INFERRED) | you are between blocks; typing here creates a new paragraph | **both** | low |
| TT-B2-045 | B2 | clicking a link → **`window.open(href, '_blank')`** (`helpers/clickHandler.ts:60–66`; `openOnClick: true` default) — in an *editable* editor | focus / context | n/a | a new tab opens | the tab switch is platform-announced, but nothing warned that click-in-editor navigates; there is **no keyboard equivalent** to open a link at all | activating this link leaves the app; keyboard users cannot do it | **both** | medium |
| TT-B2-046 | B2 | creating/editing a link — `setLink`/`toggleLink`/`unsetLink` commands (`link.ts:379–429`) | — | — | — | **n/a as a user-facing operation** — the commands exist but StarterKit binds no shortcut and ships no UI; only autolink (TT-B1-015) and paste (TT-B1-021) create links | — | n/a | n/a |
| TT-B2-047 | B2 | Tab into the editor (root has `tabindex="0"`, `extensions/tabindex.ts`) | focus | n/a | focus ring on the editor | AT reads the hardcoded `role="textbox"` (`Editor.ts:600`) — with **no `aria-multiline`** (likely presented as a single-line field, INFERRED) and **no accessible name** unless the integrator adds one | you entered a multiline rich-text editor, named X | **both** | high |
| TT-B2-048 | B2 | `editor.setEditable(false)` (`extensions/editable.ts`; `Tabindex` then omits `tabindex`) | editor mode | contenteditable off; element leaves the tab order | the caret disappears | nothing (contrast Lexical: "Editor is read-only"); the surface also silently drops out of the tab order | the editor is no longer editable | transition | low |
| TT-B2-049 | B2 | Shift+Arrow — selection extension | selection | n/a | highlight grows | AT-native (INFERRED); Tiptap adds nothing | what is selected | transition | high |

---

## 5. B3 — Menus and popups

**StarterKit implements no B3 surface at all.** No toolbar, no floating/bubble menu, no
slash menu, no typeahead, no dialog, no find/replace, no context menu. Tiptap's menu
machinery lives in separate packages (`@tiptap/extension-bubble-menu`,
`@tiptap/extension-floating-menu`, the commercial UI templates) that the getting-started
configuration does not install. Every row below is therefore **`n/a` — not implemented — 
and must not be read as `silent`**: Tiptap in this configuration cannot fail at menus
because it has none. (It also means every affordance beyond the keyboard map is missing:
there is no discoverable UI whatsoever — formatting is reachable only by knowing the
shortcuts.)

| id | bucket | surface | status |
|---|---|---|---|
| TT-B3-001 | B3 | slash / command menu | **n/a** — not implemented in StarterKit |
| TT-B3-002 | B3 | mention typeahead | **n/a** (`@tiptap/extension-mention` not included) |
| TT-B3-003 | B3 | emoji picker | **n/a** |
| TT-B3-004 | B3 | selection-triggered floating toolbar | **n/a** (`@tiptap/extension-bubble-menu` not included) |
| TT-B3-005 | B3 | fixed toolbar | **n/a** — Tiptap is headless; no toolbar exists to evaluate |
| TT-B3-006 | B3 | link editing balloon / dialog | **n/a** |
| TT-B3-007 | B3 | find / replace | **n/a** |
| TT-B3-008 | B3 | table menus | **n/a** (no table extension registered; `prosemirror-tables@1.8.5` ships unused in `@tiptap/pm`) |

---

## 6. CB — Container boundary state transitions

StarterKit has three containers — blockquote, code block, list — plus two boundary
*states* (`NodeSelection`, gap cursor). No table, no collapsible, no layout, no nested
editors: the corpus's remaining container types are `n/a` for this subject.

**The escape-hatch contract, container by container** (compare Lexical §6's table —
note the quote contract is the **opposite** of Lexical's):

| Container | "I want out" gesture | Announced? |
|---|---|---|
| Blockquote | **Enter on an empty paragraph** (`liftEmptyBlock`) — plain Enter **stays inside** | no |
| Code block | two trailing newlines, then Enter (`exitOnTripleEnter`); or ArrowDown/Up at the edges; or Mod-Enter | no |
| List (top level) | Enter on one empty item | no |
| List (nested) | Enter on one empty item → drops one level, stays in the list | no |

### 6.1 Blockquote — `@tiptap/extension-blockquote@3.30.5`

DOM: `<blockquote>` wrapping block children. Structure correct; every transition silent.

| id | bucket | trigger (vector) | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| TT-CB-001 | B1 | **entry:** `> ` + space (TT-B1-005) | container entry | yes | rule + indent | nothing | you are now inside a quotation | transition | medium |
| TT-CB-002 | B2 | **entry:** Mod-Shift-b (`toggleWrap`) | container entry | yes | as above | nothing | as above | transition | medium |
| TT-CB-003 | B2 | **entry:** ↓ from the paragraph above | container entry | n/a | caret lands inside the rule | AT-native block-boundary reading may say "quote" (INFERRED, browser-dependent); the editor adds nothing | you entered a quotation | transition | high |
| TT-CB-004 | B2 | **entry:** ↑ from the paragraph below | container entry | n/a | as above | as above | as above | transition | high |
| TT-CB-005 | B2 | **entry:** Backspace at the start of the paragraph below → merged into the quote's last textblock (TT-B2-034) | container entry + merge | yes | text joins the quote | **nothing** | your text was moved **into** the quotation | transition | medium |
| TT-CB-006 | B2 | **exit (content):** Delete at the end of the paragraph above → the quote's first textblock is pulled out (TT-B2-035) | content leaves container | yes | quoted text loses the rule | nothing | text was pulled **out of** the quotation | transition | medium |
| TT-CB-007 | B2 | **entry:** paste landing inside a quote | container entry | yes | pasted content indented | nothing | what you pasted is inside a quotation | transition | low |
| TT-CB-008 | B2 | **entry:** undo/redo restoring a quote around the caret | container entry | yes | the rule reappears | **nothing at all** — not even Lexical's "Undone" | you are inside a quotation again | transition | medium |
| TT-CB-009 | B2 | **non-exit:** Enter anywhere in the quote → `splitBlock` — the caret **stays inside**, in a new paragraph within the quote | *no* transition | yes — new `<p>` inside `<blockquote>` | new line inside the rule | nothing (correctly — but note this is the **opposite contract from Lexical**, where any Enter exits; a user moving between the two editors has no cue for either) | you are still in the quotation | none (contract-divergence recorded) | high |
| TT-CB-010 | B2 | **exit:** Enter on an **empty paragraph** inside the quote → `liftEmptyBlock` lifts it out (core Enter chain) | container exit | yes | the caret un-indents past the rule | **nothing** (**how many Enters a nested quote takes needs measurement** — `liftEmptyBlock` lifts one level per press) | you left the quotation | transition | high |
| TT-CB-011 | B2 | **exit:** ↑ past the first line / ↓ past the last line | container exit | n/a | caret leaves the rule | AT-native (INFERRED); editor adds nothing | you left the quotation | transition | high |
| TT-CB-012 | B2 | **exit:** Backspace at the start of the quote's **first** child (the extension's handler requires `index !== 0` and bails, `handleBackspace.ts:37`; core `joinBackward` decides) | container exit or merge | yes | block leaves the quote or merges upward | nothing (**resulting structure needs measurement**) | your text left the quotation | transition | medium |
| TT-CB-013 | B2 | **exit:** Mod-Shift-b on a quoted block (`toggleWrap` → lift) | container exit | yes | the rule vanishes | nothing | this block is no longer a quotation | transition | medium |
| TT-CB-014 | B1 | **nesting:** `> ` at the start of a paragraph already inside a quote → nested `<blockquote>` | depth change | yes — real nesting | second indent step | nothing; no depth information at any layer | you are at quotation depth 2 | transition | low |

### 6.2 Code block — `@tiptap/extension-code-block@3.30.5`

DOM: `<pre><code class="language-x">` — a real `<pre>`, which is more than Lexical
emits; the container may be voiced as "code" by ATs that honour the `code` AAM role
(INFERRED, needs measurement). The language is invisible at every layer.

| id | bucket | trigger (vector) | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| TT-CB-015 | B1 | **entry:** ```` ``` ```` / `~~~` (+ language) + space/Enter | container entry | yes | monospace block | nothing | you are in a code block; language; semantics changed | transition | medium |
| TT-CB-016 | B2 | **entry:** Mod-Alt-c | container entry | yes | as above | nothing | as above | transition | medium |
| TT-CB-017 | B2 | **entry:** arrowing in from above/below | container entry | yes — `<pre><code>` exists to arrive at | caret enters monospace text | the editor adds nothing; whether the AT reports "code" from the `<code>` element role is browser/AT-dependent (INFERRED — measure; contrast Lexical's bare `<code>` with no `<pre>`) | you entered code | transition | high |
| TT-CB-018 | B2 | **exit:** two trailing newlines + Enter (TT-B2-025) | container exit | yes | caret drops out; blank lines consumed | **nothing** | you left the code block | transition | medium |
| TT-CB-019 | B2 | **exit:** ArrowDown at the end, no following node → paragraph created (TT-B2-026) | container exit + creation | yes | caret out; new blank line | nothing | you left; a paragraph was created | transition | high |
| TT-CB-020 | B2 | **exit:** ArrowDown at the end, following node exists → caret moves into it | container exit | n/a | caret leaves | AT-native for the destination (INFERRED); nothing marks the exit | you left the code block | transition | high |
| TT-CB-021 | B2 | **exit:** Backspace when empty / at document start → `clearNodes` dissolves the block (TT-B2-028) | container destroyed | yes | monospace vanishes | nothing | the code block was dissolved | transition | medium |
| TT-CB-022 | B2 | **exit:** Mod-Alt-c on an existing block → paragraph | container exit | yes | as above | nothing | this is no longer code | transition | medium |
| TT-CB-023 | B2 | **inside:** any mark command → schema-refused no-op (TT-B2-007) | *nothing* | n/a | nothing | nothing; refusal identical to success | formatting is impossible here | transition | medium |
| TT-CB-024 | B2 | **inside:** Tab → focus leaves the editor (TT-B2-029; indentation off by default) | focus | n/a | focus ring leaves | platform announces the next control only | Tab exits the editor from inside code | transition | medium |

### 6.3 List — `@tiptap/extension-list@3.30.5` (+ `prosemirror-schema-list@1.5.1`)

The best-handled container: real nested `<ul>`/`<ol>`/`<li>`, a real escape hatch, a
real outdent-on-Backspace — and, uniquely in this corpus, **two keystrokes (Backspace,
Tab) that pull content *into* a list from outside it**. Every transition silent.

| id | bucket | trigger (vector) | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| TT-CB-025 | B1 | **entry:** `- ` / `* ` / `+ ` / `N. ` + space | container entry | yes | marker appears | nothing | a list started; you are in item 1 | transition | high |
| TT-CB-026 | B2 | **entry:** Mod-Shift-7/8 | container entry | yes | markers on selected blocks | nothing | a list of N items; you are in item M | transition | high |
| TT-CB-027 | B2 | **entry:** ↑/↓ into a list from an adjacent paragraph | container entry | yes | caret lands on an item | AT-native list reading should say "list, N items" (INFERRED) — the one entry vector the platform may cover | you entered a list; size; position | transition | high |
| TT-CB-028 | B2 | **entry:** Backspace at the start of the paragraph below → content pulled into the last item (TT-B2-021) | container entry + merge | yes | text joins the last bullet | **nothing** | your paragraph became part of the last item | transition | medium |
| TT-CB-029 | B2 | **entry:** Tab at the start of the paragraph below → the block is **moved inside** the list (TT-B2-022) | container entry + move | yes | the paragraph indents into the list | **nothing** | your paragraph is now inside the list | transition | low |
| TT-CB-030 | B2 | **entry:** paste of list HTML | container entry | yes | bullets appear | nothing | N list items were pasted | transition | medium |
| TT-CB-031 | B2 | **sibling:** Enter at the end of an item → new item (TT-B2-014) | *no* container change | yes | new marker | nothing | a new item; its ordinal | transition | high |
| TT-CB-032 | B2 | **exit:** Enter on an empty top-level item (TT-B2-015) | container exit | yes | bullet gone; caret un-indented; list may split | **nothing** | you left the list | transition | high |
| TT-CB-033 | B2 | **depth:** Enter on an empty nested item → one level out, still in the list (TT-B2-016) | depth change | yes | one un-indent, marker kept | nothing — different outcome, identical keystroke | you dropped to level N−1 | transition | medium |
| TT-CB-034 | B2 | **depth:** Tab → sink / Shift-Tab → lift (TT-B2-017/019) | depth change | yes — genuine nested lists | one step in/out | nothing | your level is now N | transition | high |
| TT-CB-035 | B2 | **exit:** Backspace at item start → lift (TT-B2-020) | container exit / depth change | yes | bullet vanishes | nothing | you left the list / dropped a level | transition | high |
| TT-CB-036 | B2 | **exit:** ↑/↓ past the list's edges | container exit | yes | caret leaves the markers | AT-native (INFERRED) | you left the list | transition | high |
| TT-CB-037 | B2 | **exit:** Mod-Shift-7/8 on a list (toggle off, `toggleList`) | container exit | yes | markers disappear | nothing | N items stopped being a list | transition | medium |
| TT-CB-038 | B2 | **merge:** Delete at the end of an item — join forward; a following branching sublist is hoisted (TT-B2-023) | items merge; depth re-parented | yes | text joins; markers shift | nothing | the items merged; the sublist moved | transition | medium |
| TT-CB-039 | B1 | **join-on-create:** typing `2. ` in the paragraph after a 1-item ordered list → the new item **joins the existing list** (`ordered-list.ts:336–350` `joinPredicate`); typing `5. ` there starts a separate list at 5 | two lists become one (or not) | yes | the lists visually fuse (or don't) | nothing — the decision is invisible and depends on arithmetic the user cannot see | your item joined the list above (item 2 of 2) — or started a new list | transition | low |

### 6.4 Boundary states with no text position

| id | bucket | trigger (vector) | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| TT-CB-040 | B2 | **gap cursor** — arrowing to a position between/before/after leaf blocks (TT-B2-044) | a caret state that is not in any container | no DOM caret — a drawn widget | thin blinking line | nothing; position likely invisible to the platform (INFERRED) | you are between blocks; typing creates a paragraph | **both** | low |
| TT-CB-041 | B2 | **`NodeSelection` on `<hr>`** (TT-B2-042) — the "on an object" state | object-selected state | hidden-but-real DOM range | node outline | nothing from the editor; platform behaviour unknown — measure | you are on a separator object | **both** | medium |

---

## 7. Accessibility infrastructure — the recorded search

Run 2026-08-30 over the complete installed tree (`node_modules/@tiptap/*` and every
`node_modules/prosemirror-*` at the §pinned versions), source and dist:

| Search | Command (from the install root) | Result |
|---|---|---|
| Live regions | `grep -rn "aria-live" node_modules/@tiptap node_modules/prosemirror-*` | **0 hits** |
| Roles | `grep -rn 'role=\|"role"\|role:' node_modules/@tiptap/*/src node_modules/prosemirror-*/src` (test files excluded) | **1 hit**: `@tiptap/core/src/Editor.ts:600` — `role: 'textbox'` on the editor root |
| Any `aria-*` attribute | `grep -rno "aria-[a-z]*"` over the whole tree (`.map`/`.d.ts` excluded) | **`aria-label` only, 8 occurrences, all one source line**: `@tiptap/extension-list/src/task-item/task-item.ts:228` (TaskItem checkbox — **not registered by StarterKit**) plus its dist copies |
| Announcement machinery | `grep -rni "arianotify\|announc\|live.region\|role=.status\|role=.alert\|sr-only\|visually.hidden\|screen.reader"` over all `src` | **1 hit, a comment** (`task-item.ts:55`, describing the aria-label option). No `ariaNotify`, no `role="status"`, no `role="alert"`, no visually-hidden region, no announcement utility of any kind |
| `prosemirror-view` specifically | same greps scoped to `prosemirror-view` (src + dist) | **0 ARIA of any kind.** The view layer manages `contenteditable` and DOM selection only |
| `aria-multiline` | `grep -rn "aria-multiline\|ariaMultiline"` over the whole tree | **0 hits** — the hardcoded `role="textbox"` is never paired with it |

Interpretation, stated carefully: **Tiptap does not have a smaller version of Lexical's
announcement layer; it has no announcement layer.** There is no equivalent of
`AriaLiveRegionExtension`, no per-feature announcer to be "one dependency away", and no
string for the harness to capture on any operation in §§3–6. A conformance run against
this subject is expected to score every announcement MUST as failed and every
correctly-silent clause (e.g. TT-B2-024) as passed; anything else is a finding about the
harness.

The single deliberate accessibility feature in the wider `@tiptap/extension-list`
package — TaskItem's labelled real `<input type="checkbox">` (`task-item.ts:225–231`),
which is architecturally sounder than Lexical's `role="checkbox"` on the `<li>` — is not
part of StarterKit and is recorded here only so the later Tiptap-subject session knows
it exists.

---

## 8. Counts

| Section | rows |
|---|---|
| B1 — automated conversion | 25 (22 live + 3 `n/a`) |
| B2 — user-initiated change | 49 (48 live + 1 `n/a`) |
| B3 — menus and popups | 8 (**all `n/a` — no B3 surface exists**) |
| CB — container boundary transitions | 41 (5 B1 triggers, 36 B2) |
| **total** | **123** |

| Bucket, across all sections | rows |
|---|---|
| B1 | 30 |
| B2 | 85 |
| B3 | 8 |

**Announced today, by any editor-originated mechanism: 0 of the 111 implemented rows.**
(12 rows are `n/a`: TT-B1-016/017/025, TT-B2-046, TT-B3-001…008.) Rows where the
*platform* may carry the state from Tiptap's correct markup on arrival: the arrow-entry
rows for list/quote (TT-CB-003/004/011/027/036), select-all/selection-extension
(TT-B2-039/049), and possibly code-block entry via the `<pre><code>` role
(TT-CB-017) — all marked INFERRED and all reading **state on arrival**, never the
transition.

For comparison at the same layer: Lexical's inventory found 10 of 201 rows announced
(~5%, via four purpose-built announcers); CKEditor's found a larger announced set.
Tiptap's is **0 of 111 (0%)** — the first editor in the corpus whose editor-originated
announcement count is exactly zero.

---

## 9. What Tiptap/ProseMirror does well

**Structure, everywhere it implements anything.** Real `<h1>`–`<h6>`, genuinely nested
`<ul>`/`<ol>`/`<li>`, `<blockquote>`, `<a href>`, `<strong>`/`<em>`/`<s>`/`<u>`, and —
better than Lexical — a real **`<pre><code>`** for code blocks. On the layered analysis
it passes layer 1 for essentially its whole (small) surface and fails layer 3 for all of
it: the purest instance of the classic rich-editor profile in the corpus, with none of
Lexical's structural defects (no `role` destruction, no `<div open="">`, no unlabeled
decorators — because there are no decorators).

**No keyboard trap, and no unreachable content.** There is no UI to trap focus in; Tab
leaves the editor (except inside list items — see TT-B2-018 for the flip side); every
document position is caret-reachable, gap cursor covering the positions between leaf
blocks.

**`NodeSelection` keeps a real DOM selection.** Where Lexical's `NodeSelection` has no
DOM range at all, ProseMirror sets one spanning the node and merely hides it visually
(`prosemirror-view/src/selection.ts:92–98`) — so there is at least *something* at the
platform layer for an AT to find. Whether anything is actually spoken is the top
measurement question (TT-B2-042).

**A universal, uniform B1 undo affordance.** `undoInputRule` makes Backspace revert
*any* autoformat conversion and restore the literal text — every rule records its own
undo data (`InputRule.ts:183–190`). Lexical has nothing this uniform. It is also
undiscoverable and unannounced, but as a *mechanism* it is the right shape for "the
editor changed my text and I want it back".

**Sane input-rule guards.** Every mark regex requires a preceding boundary (no intraword
conversions); autolink waits for whitespace confirmation and refuses IPs/`localhost`/
userinfo forms; the ordered-list `joinPredicate` only merges genuinely continuing
sequences.

**TaskItem (outside StarterKit) uses a real checkbox.** A labelled `<input
type="checkbox">` inside the `<li>` rather than a role override on the `<li>` itself —
the architecturally correct answer to the exact defect Lexical has (LEX-B1-006).

## 10. What Tiptap/ProseMirror does badly

**Zero announcements, zero infrastructure, zero precedent.** Lexical's problem is
coverage on top of a well-designed announcement layer; Tiptap's problem is that the
layer does not exist. There is no live region to attach a message to and no in-house
pattern to copy — a `ListAnnounceExtension`-style upstream fix for Tiptap would have to
introduce the entire mechanism, not add a 40-line announcer.

**The editor root is mislabelled by default.** A hardcoded `role="textbox"` with no
`aria-multiline` and no name (`Editor.ts:598–601`) describes a nameless single-line
field. Every Tiptap deployment that does not manually override `editorProps.attributes`
ships this.

**Headless means the state is not even visually available.** Lexical's toolbar computes
the containment state and at least renders it (the gap is the last hop to AT). In
StarterKit there is no toolbar: the pending-format state (§4.2), the current block type,
and the list depth exist only inside `EditorState`. Nothing queryable exists for *any*
user, and `storedMarks` — the original of Lexical's pending-format bitfield — remains
the corpus's hardest case, now with no visual fallback either.

**Keys that change the document while claiming to do something else.** ArrowRight at a
code-mark boundary inserts a space (TT-B2-006). ArrowDown at the end of a code block
creates a paragraph (TT-B2-026). Tab moves a paragraph into the preceding list
(TT-B2-022). Backspace merges the user's paragraph into a list item or a blockquote
(TT-B2-021/034). None of these is announced; none is visible except by watching the
caret.

**Tab's meaning depends on invisible position.** In a list item it indents; in the first
item it silently throws focus out of the editor; in a code block it also leaves (by
default). The same physical key: three outcomes, no cue (TT-B2-018/029).

**Silent refusals throughout.** Marks refused inside code blocks (`marks: ''`), sink
refused in first items, autolink refusing an invalid URL — in every case the failure is
byte-identical to success.

**Link defaults are hostile.** Every link gets `target="_blank"`; clicking a link inside
the editable editor navigates (`openOnClick: true`); there is no keyboard route to
follow a link at all; and a link whose text is edited keeps its stale `href` forever
(no auto-unlink, TT-B1-016).

**A timer in the IME path.** `compositionend` re-runs input rules inside a
`setTimeout(…)` (`InputRule.ts:267`) — under this project's own no-timers rule, a
conversion that can land after the AT has already processed the composition. Recorded as
a live bug candidate for measurement, per CLAUDE.md's instruction to treat found timers
as bugs, not precedent.

**The escape-hatch contracts contradict the other editors'.** Quote: Enter *stays* in
Tiptap, *exits* in Lexical. Code: both need trailing blank lines, but Tiptap's arrows
also exit and can create blocks. Lists: same one-empty-item rule as Lexical, but with a
possible silent list split. A user who learned any other editor has the wrong model, and
no channel will ever tell them.

## 11. The five rows most worth measuring first

1. **TT-B2-042 — `NodeSelection` on `<hr>`.** The one place Tiptap's mechanism is
   *better* than Lexical's on paper (a real DOM selection exists, merely hidden). Whether
   Chromium exposes the hidden selection change and whether an AT says anything is
   unknown, and the answer generalises to every PM-based editor. Highest
   information-per-measurement in this inventory.
2. **TT-B2-047 — Tab into the editor.** Nameless `role="textbox"` with no
   `aria-multiline`: does the AT present a multi-paragraph document as a blank
   single-line edit field? A confirmed yes is a defect affecting every Tiptap deployment
   at first contact, before any editing happens.
3. **TT-CB-017 — arrow into `<pre><code>`.** Does any AT voice "code" from Tiptap's real
   `<pre><code>` where Lexical's bare `<code>` says nothing? If yes, it is the corpus's
   cleanest demonstration that correct markup alone rescues container *state* (though
   never the transition); if no, it strengthens the editor-must-announce argument.
4. **TT-B2-015 / TT-CB-032 — Enter on an empty list item.** The exit chain is
   read-from-source (`splitListItem` bails → `liftEmptyBlock`), but the endpoint — out
   of the list in one press vs. one lift per press, and whether the list splits — is
   inferred. The measurement also fixes TT-CB-010 (quote exit) which rides the same
   command.
5. **TT-B2-018 — Tab in the first list item ejecting focus.** Confirm the focus loss and
   capture what the AT says. If confirmed, it is a WCAG 2.1.2-adjacent surprise (focus
   leaves mid-edit with no warning) that no other editor in the corpus exhibits.

**Honourable mention — TT-B1-008 (`---` fires on the third dash).** The only conversion
in the corpus with *no confirming keystroke of any kind* other than Lexical's `:)` emoji
transform; worth one measurement to record what, if anything, interrupts the typing
stream.

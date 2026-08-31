# Scenario inventory — Open Notebook

**Status: inventory, 2026-08. No fixes proposed. Feeds `../editor-contract.md` and
`../layered-gap-analysis.md`.**

Every editing/interaction scenario in the app, classified into the three buckets of the
layered gap analysis:

- **B1 — Automated conversion.** The user typed ordinary characters and the app changed
  the document without being asked. Unrequested *and* silent. Highest priority.
- **B2 — User-initiated change.** The user pressed a command key and needs the
  *resulting state*.
- **B3 — Menus/popups.** Autocomplete, slash commands, pickers, command palettes.

Sources read: `frontend/node_modules/@uiw/react-md-editor/src/` (v4.0.8 — every file in
`commands/`, `components/TextArea/handleKeyDown.tsx`, `components/TextArea/shortcuts.ts`,
`components/TextArea/Textarea.tsx`, `components/TextArea/Markdown.tsx`,
`components/Toolbar/`, `components/DragBar/`, `utils/markdownUtils.ts`,
`utils/InsertTextAtPosition.ts`, `Editor.tsx`);
`frontend/node_modules/@uiw/react-markdown-preview/src/plugins/useCopied.tsx`;
`frontend/node_modules/cmdk/dist/index.mjs`; and the app's own
`markdown-editor.tsx`, `markdown-renderer.tsx`, `InlineEdit.tsx`, `ChatPanel.tsx`,
`NoteEditorDialog.tsx`, `TransformationEditorDialog.tsx`, `CommandPalette.tsx`,
`command.tsx`, `LiveAnnouncer.tsx`.

**The `currentSR` column is almost entirely "nothing", and that is a verified finding,
not an assumption.** The app *does* own a live-region announcer
(`components/common/LiveAnnouncer.tsx` + `lib/hooks/use-announce.ts`), but a repo-wide
search for its consumers returns exactly two call sites — `StreamingResponse.tsx` and
`ConnectionErrorOverlay.tsx`. **No editing surface in the application calls
`useAnnounce()`, and `@uiw/react-md-editor` contains no `aria-live` of any kind.**

## Classification note

`handleKeyDown` mutations driven by a modifier (Ctrl+D, Alt+Up/Down) are filed under
**B1** rather than B2, per the corpus brief. The rationale holds independently: unlike
the command registry (B2), these are undeclared — they appear in no toolbar, no menu,
no help text, and no `aria-keyshortcuts`. A user can trigger them without knowing they
exist (Ctrl+D is the browser's bookmark shortcut; Alt+Arrow is caret movement in some
ATs), so the mutation arrives unrequested in exactly the B1 sense.

---

## B1 — Automated conversion

| id | bucket | surface | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|---|
| ON-B1-001 | B1 | MDEditor textarea (`handleKeyDown`) | `Enter` on a line matching `/^- \s*/` | document structure (2 chars inserted: `\n- `) | no | new line already carries a bullet glyph; text reflows | nothing — `execCommand('insertText')` into a `<textarea>` emits no AX event, and no live region exists | a new list item was created and you are in it; the marker was inserted for you | both | high |
| ON-B1-002 | B1 | MDEditor textarea | `Enter` on a line starting `* ` | document structure (`\n* `) | no | asterisk bullet appears | nothing | same as ON-B1-001 | both | medium |
| ON-B1-003 | B1 | MDEditor textarea | `Enter` on a line matching `/^\d+.\s/` | document structure (`\n{parseInt(line)+1}. `) | no | next number appears pre-typed | nothing | a new ordered item was created; its number is N, chosen for you | both | high |
| ON-B1-004 | B1 | MDEditor textarea | `Enter` on a line starting `- [ ] ` | document structure (`\n- [ ] `) | no | new unchecked box glyph | nothing | a new checkable item was created, unchecked | both | medium |
| ON-B1-005 | B1 | MDEditor textarea | `Enter` on a line starting `- [x] ` / `- [X] ` | document structure (`\n- [ ] `) | no | new box is *empty* though the source line was ticked | nothing | the new item is unchecked — the checked state was deliberately not carried over | both | medium |
| ON-B1-006 | B1 | MDEditor textarea | `Enter` on an **empty** list item (`- ` with nothing after) | document structure (another `\n- `) | no | an endless column of empty bullets | nothing | *there is nothing to tell them* — the editor has no exit-list branch at all; the canonical "Enter on empty item leaves the list" affordance does not exist | both | high |
| ON-B1-007 | B1 | MDEditor textarea | `Enter` with the caret mid-item | document structure + selection/caret | no | line splits and the tail acquires a bullet | nothing | the item was split in two and the second half became its own item | both | medium |
| ON-B1-008 | B1 | MDEditor textarea | `Enter` to confirm an IME candidate while on a list line | document structure (`\n- ` injected into composition) | no | candidate commits *and* a stray bullet line appears | nothing | `handleKeyDown` has no `isComposing` guard, so composition-confirm is indistinguishable from newline; the text was corrupted | both | medium (high for CJK/IME users) |
| ON-B1-009 | B1 | MDEditor textarea | `Enter` on an *indented* list item (`  - x`) | nothing — regex is `^`-anchored | no | no bullet appears where one appeared on the unindented line | nothing | continuation silently *did not* happen; the behaviour is positional and unpredictable | transition | medium |
| ON-B1-010 | B1 | MDEditor textarea | `Tab`, collapsed caret | document structure (4 spaces) + focus is consumed | no | caret jumps right; focus ring stays in the editor | nothing | four literal spaces were inserted, **and focus did not leave the field** (see cross-cutting finding 1) | both | high |
| ON-B1-011 | B1 | MDEditor textarea | `Shift+Tab`, collapsed caret | document structure (4 spaces) | no | caret jumps right — the opposite of the expected outdent | nothing | Shift+Tab *indents*; there is no outdent and no backwards focus escape | both | medium |
| ON-B1-012 | B1 | MDEditor textarea | `Tab` with a multi-line selection | document structure (4 spaces per line) + selection recomputed | no | block shifts right, selection redrawn | nothing | N lines were indented one level; the selection now covers a different range | both | medium |
| ON-B1-013 | B1 | MDEditor textarea | `Shift+Tab` with a multi-line selection | document structure (one 4-space level stripped per line) | no | block shifts left | nothing | N lines were outdented; lines without the leading level were left untouched | both | medium |
| ON-B1-014 | B1 | MDEditor textarea | `Ctrl+D` | document structure (whole line duplicated below) | no | a second identical line appears | nothing | the current line was duplicated below; the caret stayed on the original | both | medium |
| ON-B1-015 | B1 | MDEditor textarea | `Alt+ArrowUp` | document structure (line swapped with predecessor) + selection follows | no | line visibly jumps up one row | nothing | the line moved up one position; what it swapped with; where it now sits | both | low |
| ON-B1-016 | B1 | MDEditor textarea | `Alt+ArrowDown` | document structure (line swapped with successor) + selection follows | no | line visibly jumps down one row | nothing | as ON-B1-015, downward | both | low |
| ON-B1-017 | B1 | MDEditor textarea | `Alt+ArrowUp` on line 1 / `Alt+ArrowDown` on the last line | nothing — early `return` | no | nothing moves | nothing | the move was refused because you are at the boundary | transition | low |
| ON-B1-018 | B1 | MDEditor textarea (`markdownUtils`) | any list/quote/hr/table command near existing text | document structure — up to two `\n` injected *before* and *after* the inserted block | no | vertical gap opens around the block | nothing | blank lines were added around your block that you did not type | both | medium |
| ON-B1-019 | B1 | MDEditor textarea (`selectWord`) | any inline command (`Ctrl+B`, `Ctrl+I`, `Ctrl+J`…) with a **collapsed caret** | inline formatting applied to a range the user never selected | no | the word under the caret visibly gains markers | nothing | the editor expanded the caret to the surrounding word and formatted *that*; the affected text is "<word>" | both | high |
| ON-B1-020 | B1 | `InlineEdit` (notebook name/description, note title, source title) | commit by `Enter` or blur | document text — `onSave(editValue.trim())` | n/a (plain text field) | leading/trailing spaces vanish | nothing | your value was trimmed before saving | transition | medium |
| ON-B1-021 | B1 | `ChatPanel` composer | `Ctrl/Cmd+Enter` send | message text — `input.trim()` | n/a | whitespace vanishes from the sent bubble | nothing | the message was trimmed before sending | transition | low |
| ON-B1-022 | B1 | MDEditor textarea (negative control) | typing `"`, `--`, `http://…`, `...` | **nothing** — the textarea sets `autoCorrect=off`, `autoCapitalize=off`, `spellCheck=false`, and the library has no character-level rules | no | no smart quotes, no em-dash, no auto-link, **and no red squiggles** | nothing | there is no autoformat *and* no spelling assistance; the AT cannot report misspellings because the field opts out of spellcheck | structural | high |
| ON-B1-023 | B1 | MDEditor highlight overlay (`TextArea/Markdown.tsx`) | **every** character typed | a second, non-`aria-hidden` `<pre><code>` copy of the entire source is re-rendered behind the textarea | no (static text) | invisible — the overlay is only a syntax-colour layer with `pointer-events:none` | the whole note appears **twice** in the AX tree (and a third time in the live preview), all silently rewritten on every keystroke | that this text is decorative and is not the document | structural | high |

## B2 — User-initiated change

The decisive fact for this whole bucket: **the editing surface is a native
`<textarea>` holding markdown source.** `Ctrl+B` does not toggle a style — it calls
`document.execCommand('insertText')` to put two literal `*` characters on each side of a
range. Consequences that hold for every row below:

- **There is no "bold on/off" state anywhere.** No `aria-pressed`, no computed style, no
  caret-context state, nothing in the AX tree, nothing in the DOM but characters. There
  is no object to inspect and therefore nothing to disclose *as state* — only as text.
- **The toolbar never reflects the caret.** `ToolbarItems` computes `activeBtn` solely
  from `fullscreen` and `preview`; the formatting buttons have no active concept at all
  and carry no `aria-pressed`. Scenario C3 of the gap analysis is not merely unannounced
  here — it is unimplemented.
- **Toggle-off is a string test, not a state test.** `executeCommand` removes the
  wrapper only if `selectedText.startsWith(prefix) && endsWith(suffix)`, so whether
  `Ctrl+B` bolds or unbolds depends on where `selectWord` happened to land.
- **`Ctrl+B` with a collapsed caret is not a pending style** (gap-analysis C2). It
  expands to the surrounding word and mutates it immediately — see ON-B1-019.

| id | bucket | surface | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|---|
| ON-B2-001 | B2 | MDEditor toolbar + textarea | `Ctrl/Cmd+B`, or "Add bold text" button | inline formatting — `**` inserted or stripped around the range | no | the range gains/loses `**` and the preview pane re-renders bold | nothing | whether bold was **applied or removed**, and to what text; there is no persistent state to query afterwards | both | high |
| ON-B2-002 | B2 | MDEditor | `Ctrl/Cmd+I` / "Add italic text" | inline formatting — `*` | no | as above, italic | nothing | applied vs removed, and to what | both | high |
| ON-B2-003 | B2 | MDEditor | `Ctrl+Shift+X` / "Add strikethrough text" | inline formatting — `~~` | no | as above | nothing | applied vs removed, and to what | both | low |
| ON-B2-004 | B2 | MDEditor | `Ctrl/Cmd+H` / "Insert HR" | document structure — `\n\n---\n` | no | a rule appears in the preview | nothing | a thematic break was inserted here (or removed) | both | low |
| ON-B2-005 | B2 | MDEditor | `Ctrl/Cmd+1` / "Insert Heading 1" | document structure — `# ` on the whole line, toggled | no | line grows large in the preview | nothing | this line is now a level-1 heading — or ceased to be one | both | medium |
| ON-B2-006 | B2 | MDEditor | `Ctrl/Cmd+2` / "Insert Heading 2" | document structure — `## ` | no | as above at level 2 | nothing | new heading level, or removal | both | medium |
| ON-B2-007 | B2 | MDEditor | `Ctrl/Cmd+3` / "Insert Heading 3" | document structure — `### ` | no | as above | nothing | new heading level, or removal | both | low |
| ON-B2-008 | B2 | MDEditor | `Ctrl/Cmd+4` / "Insert Heading 4" | document structure — `#### ` | no | as above | nothing | new heading level, or removal | both | low |
| ON-B2-009 | B2 | MDEditor | `Ctrl/Cmd+5` / "Insert Heading 5" | document structure — `##### ` | no | as above | nothing | new heading level, or removal | both | low |
| ON-B2-010 | B2 | MDEditor | `Ctrl/Cmd+6` / "Insert Heading 6" | document structure — `###### ` | no | as above | nothing | new heading level, or removal | both | low |
| ON-B2-011 | B2 | MDEditor | `Ctrl/Cmd+L` / "Add a link" | document structure + selection — three different branches: selection containing `http`/`www` → `[](sel)`; empty selection → `[title](url)`; other → `[sel](url)` | no | link syntax appears; caret lands in a different place per branch | nothing | which branch fired, what placeholder text was inserted for you, and where the caret now is inside it | both | medium |
| ON-B2-012 | B2 | MDEditor | `Ctrl/Cmd+Q` / "Insert a quote" | document structure — `> ` per line + blank-line padding | no | indented quote bar in the preview | nothing | N lines became a quotation; the range is now selected | both | low |
| ON-B2-013 | B2 | MDEditor | `Ctrl/Cmd+J` / "Insert code" | inline formatting — one backtick, **unless the selection contains `\n`, in which case it silently delegates to `codeBlock`** | no | inline code vs a fenced block — visually very different outcomes from one key | nothing | which of the two happened; that code semantics now apply | both | medium |
| ON-B2-014 | B2 | MDEditor | `Ctrl/Cmd+Shift+J` / "Insert Code Block" | document structure — ` ``` ` fences, with newline padding chosen from surrounding context | no | fenced block in the preview | nothing | you are inside a code block; a fence was opened and closed for you | both | medium |
| ON-B2-015 | B2 | MDEditor | `Ctrl/Cmd+/` / "Insert comment" | document structure — `<!-- … -->` | no | text greys out / vanishes from the preview | nothing | this text is now a comment and **will not appear in the rendered note** | both | low |
| ON-B2-016 | B2 | MDEditor | `Ctrl/Cmd+K` / "Add image" | document structure — `![image](url)` or `![](sel)` | no | image syntax appears | nothing | an image reference with placeholder alt text `image` was inserted — the placeholder is itself an a11y defect being authored into the note | both | low |
| ON-B2-017 | B2 | MDEditor toolbar only (no shortcut) | "Add table" button | document structure — a 2×4 pipe table skeleton | no | table appears in the preview | nothing | a table with 2 columns and 3 body rows was inserted; the caret position within it | both | low |
| ON-B2-018 | B2 | MDEditor | `Ctrl+Shift+U` / "Add unordered list" | document structure — `- ` per line, toggled, plus padding | no | bullets appear | nothing | a bulleted list with N items was created — or the markers were stripped | both | medium |
| ON-B2-019 | B2 | MDEditor | `Ctrl+Shift+O` / "Add ordered list" | document structure — `1.`, `2.`, … per line | no | numbers appear | nothing | an ordered list of N items was created; numbering was assigned | both | medium |
| ON-B2-020 | B2 | MDEditor | `Ctrl+Shift+C` / "Add checked list" | document structure — `- [ ] ` per line | no | checkboxes appear | nothing | N checkable items were created, all unchecked | both | low |
| ON-B2-021 | B2 | MDEditor | re-issuing any of the above on already-marked text | inline formatting / document structure — the **removal** branch of `executeCommand` | no | markers disappear | nothing | that this was a *removal*, not an application — the same keystroke does both and nothing distinguishes them | both | high |
| ON-B2-022 | B2 | MDEditor extra toolbar | `Ctrl/Cmd+7` / "Edit code" | popup state — preview pane unmounts, editor goes full width | n/a | layout changes; button gets an `active` **class only** | nothing — no `aria-pressed`, no live region | the view mode changed to source-only, and it is now the selected mode | both | low |
| ON-B2-023 | B2 | MDEditor extra toolbar | `Ctrl/Cmd+8` / "Live code" | popup state — split view restored | n/a | layout changes; class-only active state | nothing | mode is now split | both | low |
| ON-B2-024 | B2 | MDEditor extra toolbar | `Ctrl/Cmd+9` / "Preview code" **while typing** | selection/caret — `Editor.tsx` renders `<TextArea>` only when `/(edit\|live)/` matches, so the **focused textarea is unmounted**; `codePreview.execute` calls `api.textArea.focus()` immediately before dispatching | n/a | editing pane disappears | nothing; and focus lands on `<body>` | that the editing field is gone, where focus went, and how to return | both | medium |
| ON-B2-025 | B2 | MDEditor extra toolbar | `Ctrl/Cmd+0` / "Toggle fullscreen" | popup state — a full-viewport overlay; `document.body.style.overflow='hidden'` | n/a | editor fills the screen | nothing; the overlay has no `role="dialog"`, no `aria-modal`, no focus containment, and no Escape handler | that a full-screen mode was entered, that the rest of the page is inert, and how to leave it | both | low |
| ON-B2-026 | B2 | MDEditor toolbar | "Open help" button | *navigation* — `window.open('markdownguide.org', '_blank')` | n/a | a new browser tab | nothing — no warning that activation leaves the app | that this control opens an external site in a new tab (WCAG 3.2.5 change-on-request) | transition | low |
| ON-B2-027 | B2 | MDEditor toolbar | activating **any** format button (mouse or keyboard) | selection/caret — `TextAreaTextApi.setSelectionRange` calls `this.textArea.focus()` | n/a | caret returns to the text | nothing | focus was moved out of the toolbar back into the editor, and where the caret landed | transition | high |
| ON-B2-028 | B2 | MDEditor textarea | `Ctrl+Z` / `Ctrl+Y` | document structure — native textarea undo. `insertTextAtPosition` prefers `execCommand('insertText')`, which **does** join the native undo stack; the `setRangeText`/`value=` fallback path does **not** | no | text reverts | nothing | what was undone (gap-analysis E1); and that on the fallback path a whole multi-line mutation may be un-undoable | both | medium |
| ON-B2-029 | B2 | MDEditor `DragBar` | — | editor height | n/a | a grab handle with a drag cursor | nothing at all | **no accessible affordance exists**: a bare `<div>` with only `mousedown`/`touchstart` listeners, no `role`, no `tabindex`, no name, no keyboard path. Unreachable and unannounced | structural | low |
| ON-B2-030 | B2 | `InlineEdit` display state | `Enter`/`Space` on the title button | popup state — `<button>` is replaced by `<input>`; an effect focuses it and calls `select()` | n/a | the heading turns into a focused, fully selected text box | the button's accessible name is **only the current title text** — nothing conveys that it is editable; after the swap the AT re-announces a textbox with no name (no `<label>`, no `aria-label`; the accessible name falls back to `placeholder`, which several call sites, e.g. `SourceDetailContent`, do supply but `NoteEditorDialog`'s does not label the *content* field) | that this control edits the title; and after activation, what field you are in and that its whole value is selected | both | high |
| ON-B2-031 | B2 | `InlineEdit` (single-line) | `Enter` | commits — `handleSave()` | n/a | the input reverts to a button showing the new value | nothing | that the value was saved | transition | high |
| ON-B2-032 | B2 | `InlineEdit` | `Escape` | reverts — `handleCancel()` | n/a | the input reverts showing the *old* value | nothing | that the edit was discarded and the previous value restored | transition | medium |
| ON-B2-033 | B2 | `InlineEdit` | blur (Tab away, click away) | commits if changed, otherwise exits edit mode | n/a | input reverts to a button | nothing | that leaving the field saved it — an unexpected commit-on-blur with no undo | transition | high |
| ON-B2-034 | B2 | `InlineEdit` while saving | the commit itself | the focused `<input>` gets `disabled={isSaving}` | n/a | field greys out for the round trip | nothing; and this is gap-analysis **F2** exactly — disabling a focused control yields an AX tree in which no node reports `focused` | that a save is in flight, and where focus went | both | high |
| ON-B2-035 | B2 | `InlineEdit` on save failure | `onSave` rejects | `catch { setEditValue(value) }` — value silently reverts, `isEditing` stays true | n/a | the text snaps back to the old value | nothing — no toast, no error text, no announcement | that the save failed and why (gap-analysis E5) | both | medium |
| ON-B2-036 | B2 | `InlineEdit` `multiline` (notebook description) | `Enter` | inserts a newline; the `!multiline` guard means Enter never commits | n/a | the box grows | nothing | that Enter does *not* save here and the only commit path is blurring the field | transition | medium |
| ON-B2-037 | B2 | `ChatPanel` composer | `Ctrl/Cmd+Enter` | message sent; `disabled={isStreaming}` is applied to the **currently focused** textarea | n/a | field greys out, spinner replaces the send glyph | nothing; focus is destroyed — F2 again | that the message was sent, that the field is temporarily unavailable, and where focus is | both | high |
| ON-B2-038 | B2 | `ChatPanel` transcript | assistant reply streams in | document structure — message nodes appended | yes (real `<p>`/list markup via `MarkdownRenderer`) | bubbles appear, `scrollIntoView` runs | nothing — the transcript declares no `aria-live` and no `role="log"` (ADR-010 reserves `role="log"` for it, but it is not applied) | that a reply arrived, and when it is complete | transition | high |
| ON-B2-039 | B2 | `NoteEditorDialog` | `Escape` | the whole dialog closes via Radix; `handleClose` calls `reset()` | n/a | dialog vanishes | Radix restores focus to the trigger, but nothing states that **unsaved note content was discarded without confirmation** | that closing destroys the draft | transition | high |
| ON-B2-040 | B2 | `NoteEditorDialog` | Save/Create button | mutation + `onOpenChange(false)` | n/a | dialog closes, the note list updates | Radix focus return only; the success itself is unannounced (gap-analysis E5) | that the note saved, and that the list behind it changed | transition | high |
| ON-B2-041 | B2 | `NoteEditorDialog` | Submit with empty content | zod rejects; `errors.content.message` renders as a bare `<p className="text-sm text-destructive">` | n/a | red text under the editor | nothing — the `<p>` has no `id`, the textarea has no `aria-describedby`/`aria-invalid`, and there is no live region | that submission failed and which field is at fault | both | medium |
| ON-B2-042 | B2 | `NoteEditorDialog` ↔ MDEditor | `Ctrl/Cmd+0` inside the dialog | dialog geometry — a `MutationObserver` on `document.body` watches for `.w-md-editor-fullscreen` and re-styles `DialogContent` to full screen | n/a | the dialog expands to the viewport | nothing | that the dialog resized as a side effect of an editor command | transition | low |
| ON-B2-043 | B2 | MDEditor toolbar | entering preview mode (ON-B2-024) | control state — `disabled` becomes true for all 16 format buttons (`!/(preview\|fullscreen)/.test(keyCommand)`) | n/a | buttons grey out | nothing; if focus was on one of them, F2 fires | that the formatting controls became unavailable, and why | both | low |
| ON-B2-044 | B2 | MDEditor live preview (`useCopied`) | clicking the code-block copy affordance | clipboard write | n/a | a copy glyph swaps to a tick for 2s | nothing at all — the affordance is a `<div class="copied" data-code>` with a `click` listener: no `role`, no `tabindex`, no accessible name, and the success state is a CSS class | **no accessible affordance at all**; and the "copied" confirmation is invisible to AT | structural | medium |

## B3 — Menus and popups

| id | bucket | surface | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|---|
| ON-B3-001 | B3 | MDEditor toolbar heading group | activating the "Insert title" button | popup state — `barPopup[groupName]=true`, which only adds an `active` class; `Child.less` flips `display:none`→`block` | no | a 6-item dropdown of Heading 1–6 appears below the button | nothing — the trigger has no `aria-haspopup`, no `aria-expanded`, no `aria-controls`, and the panel has no `role="menu"`/`listbox` | that a menu opened, how many items it holds, and how to get into it | both | medium |
| ON-B3-002 | B3 | MDEditor heading group | `Tab` after opening | selection/caret — the six heading buttons are simply the next elements in DOM order | no | focus ring walks the menu | the buttons are real `<button>`s with `aria-label`s, so each *is* named; but nothing frames them as a menu, there is no roving tabindex, and no item is "active" | that you have entered the menu and are on item N of 6 | both | medium |
| ON-B3-003 | B3 | MDEditor heading group | `Escape` | **nothing** — `shortcuts.ts` pushes `'escape'` but no command registers it, so the event falls through | no | menu stays open | inside `NoteEditorDialog` the fall-through reaches Radix and **closes the entire dialog, discarding the note** | that Escape does not dismiss this menu and will instead destroy your draft | both | medium |
| ON-B3-004 | B3 | MDEditor heading group | clicking anywhere in the editor | popup state — `containerClick` sets every `barPopup` key false | no | menu disappears | nothing | that the menu closed | transition | medium |
| ON-B3-005 | B3 | `CommandPalette` | `Ctrl/Cmd+K` | popup state — a Radix dialog containing a cmdk combobox | yes — cmdk emits `role="combobox"` + `role="listbox"` + `role="option"` with `aria-activedescendant`; the dialog has an `sr-only` `DialogTitle`/`DialogDescription` | modal overlay with a search field | **this is the one surface in the app that mostly works**: role, name, and option count are computed by the browser | how many options are available at open | transition | high |
| ON-B3-006 | B3 | `CommandPalette` | typing into the input | popup state — the option set is refiltered on every keystroke | yes (options remain real `option` nodes) | the list visibly shrinks | nothing announces the new count — **cmdk 1.1.1 emits no `aria-live` anywhere** (verified: the only ARIA attributes in `dist/index.mjs` are `activedescendant`, `autocomplete`, `controls`, `disabled`, `expanded`, `hidden`, `label`, `labelledby`, `selected`, `value*`) | how many results now match | transition | high |
| ON-B3-007 | B3 | `CommandPalette` | `ArrowDown`/`ArrowUp` | popup state — `aria-activedescendant` moves | yes | highlight moves | the option is read via activedescendant — this works | position in set | transition | high |
| ON-B3-008 | B3 | `CommandPalette` | a query matching nothing | the listbox renders **empty** — `CommandPalette` never renders `<CommandEmpty>`, though `command.tsx` exports it | yes (an empty listbox is well-formed) | a blank panel | nothing — no "no results" text exists to read, and no live region | that the search returned nothing | both | medium |
| ON-B3-009 | B3 | `CommandPalette` | `useNotebooks` resolving while the user types | popup state — a whole "Notebooks" group of options appears under the caret | yes | more rows appear | nothing; the loading placeholder is a `disabled` CommandItem reading "Loading" with a spinner, and its replacement is silent | that results finished loading and N notebooks were added | transition | medium |
| ON-B3-010 | B3 | `CommandPalette` | a query with no command match | popup state — the "Search and Ask" group **relocates from the bottom of the list to the top** (`showSearchFirst`) | yes | the two search rows jump to the top | nothing; the active option can change identity under a stationary caret | that the option order changed, and what is now first | transition | medium |
| ON-B3-011 | B3 | `CommandPalette` | `Enter` on an option | popup closes, then `setTimeout(callback, 0)` performs the navigation/dialog-open | n/a | palette closes, a route or dialog appears | nothing; the deferral means Radix's focus restore and the destination's focus claim race — a timer standing in for a synchronisation point (a live violation of the repo's own `CLAUDE.md` rule) | where focus went, and that a route change occurred | transition | high |
| ON-B3-012 | B3 | `CommandPalette` | `Escape` | Radix closes the dialog; an effect clears the query | n/a | palette disappears | Radix restores focus to the previously focused element | that the palette closed | transition | medium |
| ON-B3-013 | B3 | `CommandPalette` global listener | `Ctrl/Cmd+K` **while focus is in any `INPUT`/`TEXTAREA`/`SELECT`/`contenteditable`** | nothing — the handler returns early | n/a | nothing happens | nothing | that the shortcut is suppressed here. Combined with the Tab trap (ON-B1-010/011), once focus enters the note editor the palette is unreachable by any key | transition | medium |
| ON-B3-014 | B3 | note editor (absence) | typing `/`, `@`, `:`, `[[` | **nothing** | n/a | nothing | nothing | recorded as a negative control: Open Notebook has **no slash-command menu, no mention picker, no emoji picker, and no inline autocomplete** in any editing surface. The B3 class is genuinely thin here, so the corpus's B3 weight rests on the palette and the heading dropdown | n/a | n/a |
| ON-B3-015 | B3 | `ChatPanel` | "Sessions" button | popup state — a Radix `Dialog` with an `sr-only` title | yes | a session list modal | Radix announces the dialog | which session is current | transition | low |
| ON-B3-016 | B3 | `ChatPanel` | model selector | popup state — a select/combobox in the composer | yes | dropdown | depends on the shared `ModelSelector`; `disabled={isStreaming}` toggles under the user | that the control became unavailable during streaming | transition | low |

---

## Notable findings

### 1. The editor is a keyboard trap, in both directions

`handleKeyDown` runs with `defaultTabEnable` at its default `false` (no call site in
`frontend/src/` overrides it), so `Tab` is `preventDefault`ed and inserts four spaces.
The `e.shiftKey` branch only applies to a *ranged* selection; with a collapsed caret
`Shift+Tab` falls through to the same `insertTextAtPosition(target, space)`. There is
therefore **no `Tab` and no `Shift+Tab` escape from the note editor**. The remaining
exits all destroy something: `Escape` closes the dialog and discards the draft
(ON-B3-003), `Ctrl+9` unmounts the field out from under focus (ON-B2-024). `Ctrl+K`
cannot summon the palette from inside a textarea (ON-B3-013). This is failure mode F3
from the contract, and it is still live.

### 2. Layer-1 failure is total — the document has no semantics at any moment

Every B1 and nearly every B2 row scores `structural: no`. The note is a string in a
`<textarea>`; `role=list`, `aria-level`, `listitem`, `heading` do not exist at any point
during authoring. This is not "the transition was unannounced" — the *result* is
unreviewable. A screen-reader user who creates a five-level nested checklist cannot
afterwards navigate it, query its levels, or hear a single item boundary; they can only
re-read a flat run of characters including the literal `- [ ]` glyphs. The contrast is
sharp and useful for the corpus: the *reading* surface (`markdown-renderer.tsx`,
`react-markdown` + `remark-gfm`) produces genuinely correct `<ul>`/`<h2>`/`<table>`
structure. Open Notebook has good document semantics everywhere except where the
document is being written.

### 3. Three copies of the note in the accessibility tree

In the default `preview: 'live'` mode the same content is present three times:
`TextArea/Markdown.tsx`'s syntax-highlight `<pre><code>` overlay (static text, **not**
`aria-hidden`, only `pointer-events: none`), the `<textarea>` value itself, and the
rendered `MarkdownPreview` pane. All three are rewritten on every keystroke. Browse-mode
review of a note therefore encounters the whole document three times over, in two
different representations.

### 4. There is an announcer, and no editing surface uses it

`components/common/LiveAnnouncer.tsx` is a carefully built, well-documented,
append-only two-channel live region mounted in the root layout, with a `useAnnounce()`
hook. Its only consumers are `StreamingResponse.tsx` and `ConnectionErrorOverlay.tsx`.
Not one of the ~80 scenarios above calls it. The infrastructure for the layer-3
compensation exists and is unwired — which makes Open Notebook an unusually clean
subject: the gap here is not "no plumbing", it is that nobody knew what to say.

### 5. Surfaces with no accessible affordance whatsoever

- **`DragBar`** (ON-B2-029) — the editor resize handle is a `<div>` with only pointer
  listeners: no role, no name, no tabindex, no keyboard path.
- **The code-block copy button** in the live preview (ON-B2-044) — a
  `<div class="copied" data-code="…">` with a `click` listener; its "copied"
  confirmation is a CSS class on a 2-second timer.
- **The ChatPanel send button** — icon-only with no `aria-label`; `lucide-react` sets
  `aria-hidden="true"` on its `<svg>` when no a11y prop is passed, so the button's
  accessible name computes to **empty**.
- **Toolbar dividers** — `<li>` elements with no `role="separator"` and no
  `aria-hidden`, so the toolbar reads as a list containing three blank items.
- **The toolbar itself** — a bare `<ul>`/`<li>` with no `role="toolbar"` and no roving
  tabindex, so its ~20 buttons are 20 separate tab stops that must all be traversed
  before reaching the text (and, per finding 1, cannot be traversed back out of).
- **`NoteEditorDialog`'s content field** — passes `textareaId="note-content"` but
  renders no `<label htmlFor>`, so the note body is an unnamed textbox whose accessible
  name falls back to placeholder text. `TransformationEditorDialog`, using the same
  component, *does* render a `<Label htmlFor>`; the two surfaces disagree.

### 6. Two distinct kinds of "no state to disclose"

Worth keeping separate in the contract. Gap-analysis C2 (`Ctrl+B` with no selection →
pending style) posits a transition with no state anchor. In this editor C2 **does not
occur at all**: `selectWord` expands the collapsed caret to the surrounding word and
mutates it immediately (ON-B1-019). So there is never a pending style — but there is
also never an applied style, only characters. A rich editor fails C2 because ARIA cannot
describe a future; this editor fails it because the concept does not exist. Both end in
silence, and a conformance contract that only tests announcements would score them
identically. It should not.

### 7. `Enter` is overloaded four ways with no isComposing guard

The single `Enter` keystroke is, depending on invisible line context: a newline, a
bullet continuation, a number increment, or a task-item continuation — and, because
`handleKeyDown` never checks `event.isComposing`, also an IME candidate confirmation
that injects a list marker into the composition (ON-B1-008). The dispatch is driven by
`target.value.substr(0, selectionStart).split('\n').pop()`, i.e. only the text *before*
the caret on the current line, and is `^`-anchored, so indented items behave differently
from flush ones (ON-B1-009). There is no exit-list branch of any kind (ON-B1-006).

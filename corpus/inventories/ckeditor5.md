# CKEditor 5 — editing-scenario corpus

**Subject:** CKEditor 5, open-source packages, `v48.4.0` (`ckeditor/ckeditor5@8bb12a1`, 2026-08-28),
plus premium features where documented.
**Method:** read from source (shallow clone of `github.com/ckeditor/ckeditor5`, `packages/**/src`)
and cross-checked against ckeditor.com docs. Rows marked **INFERRED** are ones where the source
tells us what the editor *does* but not what a screen reader *says*; those need the harness or a
real AT run to settle.
**Slots into:** [`../layered-gap-analysis.md`](../../docs/the-gap.md) — bucket B1 ≈ groups A + E2,
B2 ≈ groups B + C + E, B3 is the menus/popups group the framework does not yet have a letter for.

## Why CKEditor is the right control case

CKEditor 5 is the only editor in this survey that ships a first-class live-region abstraction
(`AriaLiveAnnouncer`), a keystroke-registry accessibility help dialog, and a documented
WCAG 2.2 AA / Section 508 conformance claim. It is therefore the ceiling: whatever CKEditor
does *not* announce is, empirically, what the state of the art does not announce. The short
version of the finding is below; the long version is after the tables.

> **`AriaLiveAnnouncer` exists and is excellent. Exactly three features call it.**
> Code block enter/leave, to-do list enter/leave, and image upload start/complete/error.
> That is the entire announcement surface of CKEditor 5 — **seven call sites**
> (nine if you count the deprecated legacy to-do list duplicate) across 61 packages
> and ~125 registered commands.

## Counts

| Bucket | Rows | Live-region announced | Carried by ARIA state / the platform | Nothing reaches the user |
|---|---|---|---|---|
| **B1** — automated conversion | 45 | 5 | 0 | 40 |
| **B2** — user-initiated change | 119 | 5 | 8 | 106 |
| **B3** — menus / popups | 38 | 0 | 17 | 21 |
| **BC** — container boundary transitions | 100 | 21 | 7 | 72 |
| **Total** | **302** | **26** | **32** | **244** |

**BC** is a cross-cutting section added after the first pass: every block container is a state
the caret is inside or outside of, and each container has ten to twenty distinct entry and exit
vectors. It reuses the B1/B2/B3 buckets in its `bucket` column and has its own ID range. It is
where the sharpest evidence in this report lives — see [BC](#bc--container-boundary-state-transitions).

- *Live-region announced* = an `editor.ui.ariaLiveAnnouncer.announce()` call is reached on
  that path. Nine rows, produced by seven call sites.
- *Carried by ARIA state / the platform* = no announcement, but the user does get the
  information — because it lives on a focusable control (`aria-pressed` on a toolbar button),
  because the browser reports it (caret entering a `<td>`, arrowing over `<strong>`), or
  because CKEditor routes it through the DOM selection (the widget fake-selection trick,
  CKE-B2-067).
- Rows where the *result state* is correctly in the DOM but nothing fires at the moment of the
  change count as **nothing reaches the user** — that is precisely the transition failure the
  framework is about, and it is 81% of the corpus.

---

## B1 — Automated conversion

The user typed ordinary characters; the editor rewrote the document without being asked.
Sources: `packages/ckeditor5-autoformat/src/autoformat.ts`,
`packages/ckeditor5-autoformat/src/blockautoformatediting.ts`,
`packages/ckeditor5-autoformat/src/inlineautoformatediting.ts`,
`packages/ckeditor5-typing/src/texttransformation.ts`,
`packages/ckeditor5-link/src/autolink.ts`,
`packages/ckeditor5-image/src/autoimage.ts`,
`packages/ckeditor5-media-embed/src/automediaembed.ts`.

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-B1-001 | B1 | `*` then Space at block start | document structure | yes | The `* ` vanishes; a bullet appears; text indents | Silent. `blockAutoformatEditing(editor, this, /^[*-]\s$/, 'bulletedList')` executes the command inside `model.change()`; no `announce()` on this path | a bulleted list started; you are in item 1 of 1 | transition | high |
| CKE-B1-002 | B1 | `-` then Space at block start | document structure | yes | Same as above | Silent (same regex, `autoformat.ts:_addListAutoformats`) | a bulleted list started; you are in item 1 of 1 | transition | high |
| CKE-B1-003 | B1 | `<digits>.` then Space | document structure | yes | `1. ` vanishes; a rendered number appears | Silent. `/^(\d+)[.\|)]\s$/` → `numberedList`; if `ListProperties` is loaded the typed number becomes `listStart` | an ordered list started; you are in item N; the list starts at N | transition | high |
| CKE-B1-004 | B1 | `<digits>)` then Space | document structure | yes | Same as above | Silent (same regex) | as above | transition | medium |
| CKE-B1-005 | B1 | `[]` or `[ ]` then Space | document structure | yes | Brackets vanish; an unchecked checkbox appears before the text | **Announced** — "Entering a to-do list" (`todolistediting.ts:400`), because the selection lands in a new to-do item and `_initAriaAnnouncements` fires on `change:range`. The *checkbox* and its unchecked state are not mentioned | a checkable item was created, unchecked, item 1 | transition (partial) | medium |
| CKE-B1-006 | B1 | `[x]` or `[ x ]` then Space | document structure | yes | Brackets vanish; a **checked** checkbox appears | **Announced** — "Entering a to-do list" only. That the item is *checked* is never spoken | a checkable item was created, **checked** | transition (partial) | low |
| CKE-B1-007 | B1 | `#` then Space | document structure | yes | `# ` vanishes; text becomes large/bold | Silent. Note the naming trap: `heading1` downcasts to `<h2>` by default (`headingediting.ts:49`), so the AX tree says *level 2* while the UI calls it *Heading 1* | this line is now a heading, level 2 (labelled "Heading 1") | transition | high |
| CKE-B1-008 | B1 | `##` then Space | document structure | yes | As above, smaller | Silent; `heading2` → `<h3>` | heading, level 3 | transition | high |
| CKE-B1-009 | B1 | `###` then Space | document structure | yes | As above | Silent; `heading3` → `<h4>` | heading, level 4 | transition | medium |
| CKE-B1-010 | B1 | `####` then Space | document structure | yes | As above | Silent. Only fires if `heading4` is in `config.heading.options`; not in the default 3-level config | heading, level N | transition | low |
| CKE-B1-011 | B1 | `#####` then Space | document structure | yes | As above | Silent; config-dependent | heading, level N | transition | low |
| CKE-B1-012 | B1 | `######` then Space | document structure | yes | As above | Silent; config-dependent | heading, level N | transition | low |
| CKE-B1-013 | B1 | `>` then Space | document structure | yes | `> ` vanishes; a left border and indent appear | Silent. `blockAutoformatEditing(..., /^>\s$/, 'blockQuote')`. The view is a real `<blockquote>` so the AX role exists — only the transition is lost | you are now inside a quotation | transition | medium |
| CKE-B1-014 | B1 | ` ``` ` (three backticks) | document structure | yes | Backticks vanish; monospace block with a language label | **Announced** — "Entering code snippet" or "Entering %0 code snippet" with the language name (`codeblockediting.ts:337`, `utils.ts:286` `getCodeBlockAriaAnnouncement`). The best announcement in the product | you are in a code block, language X; spellcheck and autoformat are now off | — (passes) | medium |
| CKE-B1-015 | B1 | `---` at block start | document structure | yes | Line replaced by a horizontal rule; caret moves to a new paragraph after it | Silent. `horizontalLine` inserts a widget (`<div class="ck-horizontal-line"><hr></div>`, `label: 'Horizontal line'`). Because the widget is inserted and the selection is placed *after* it, no fake selection is set, so even the widget label is not read | a horizontal rule was inserted; you are now in a new paragraph after it | transition | low |
| CKE-B1-016 | B1 | `**text**` | inline formatting + text deletion | no | The `**` markers disappear; the enclosed run turns bold | Silent. `inlineAutoformatEditing(..., /(?:^\|\s)(\*\*)([^*]+)(\*\*)$/g, boldCallback)`. Four characters the user typed are deleted | the text "…" is now bold; the markers were removed | transition | high |
| CKE-B1-017 | B1 | `__text__` | inline formatting + text deletion | no | As above | Silent (same callback) | as above | transition | medium |
| CKE-B1-018 | B1 | `*text*` | inline formatting + text deletion | no | `*` markers vanish; run turns italic | Silent | the text "…" is now italic | transition | high |
| CKE-B1-019 | B1 | `_text_` | inline formatting + text deletion | no | As above | Silent | as above | transition | medium |
| CKE-B1-020 | B1 | `` `text` `` | inline formatting + text deletion | no | Backticks vanish; run becomes monospace `<code>` | Silent. Also silently disables `TextTransformation` inside the run (`texttransformation.ts:118`) | the text "…" is now code; smart quotes are now off here | transition | medium |
| CKE-B1-021 | B1 | `~~text~~` | inline formatting + text deletion | no | `~~` vanish; run gets a strike-through | Silent | the text "…" is now struck through | transition | low |
| CKE-B1-022 | B1 | Backspace immediately after any autoformat | document structure (reversal) | yes | The structure disappears; the literal characters come back | Silent. The keystroke *is* registered in the help dialog — "Revert autoformatting action / Backspace" (`autoformat.ts:61`) — so it is discoverable, but pressing it announces nothing | the autoformat was reverted; your literal text is back | transition | medium |
| CKE-B1-023 | B1 | `(c)` | text substitution | no | `(c)` becomes `©` | Silent. `TRANSFORMATIONS.copyright` (`texttransformation.ts:23`). This is the canonical E2 case | your text was changed: "(c)" became "©" | transition | medium |
| CKE-B1-024 | B1 | `(r)` | text substitution | no | `(r)` becomes `®` | Silent | as above | transition | low |
| CKE-B1-025 | B1 | `(tm)` | text substitution | no | `(tm)` becomes `™` | Silent | as above | transition | low |
| CKE-B1-026 | B1 | `1/2`, `1/3`, `2/3`, `1/4`, `3/4` bounded by non-alphanumerics | text substitution | no | Three characters collapse into one glyph (`½`) | Silent. Five separate transformations. Braille output changes shape entirely | your text was changed: "1/2" became "½" | transition | low |
| CKE-B1-027 | B1 | `<=`, `>=`, `!=` | text substitution | no | Two characters become `≤` `≥` `≠` | Silent | as above | transition | low |
| CKE-B1-028 | B1 | `<-`, `->` | text substitution | no | Two characters become `←` `→` | Silent | as above | transition | low |
| CKE-B1-029 | B1 | `...` | text substitution | no | Three periods become one `…` | Silent. High-frequency, and the character count changed under the user | your text was changed: "..." became an ellipsis | transition | high |
| CKE-B1-030 | B1 | Space `--` Space | text substitution | no | `--` becomes `–` | Silent. `/(^\| )(--)( )$/` | your text was changed: "--" became an en dash | transition | medium |
| CKE-B1-031 | B1 | Space `---` Space | text substitution | no | `---` becomes `—` | Silent. Distinct from CKE-B1-015: the horizontal-rule pattern is `/^---$/` (whole block), this one needs surrounding spaces | your text was changed: "---" became an em dash | transition | medium |
| CKE-B1-032 | B1 | `"` opening then `"` closing | text substitution | no | Straight quotes become `“ ”` | Silent. Locale-dependent (`quotesPrimary`, `quotesPrimaryEnGb`, `quotesPrimaryPl`) — the *same keystroke* yields different characters per language | your quote mark was replaced with a typographic one | transition | high |
| CKE-B1-033 | B1 | `'` opening then `'` closing | text substitution | no | Straight apostrophes become `‘ ’` | Silent; locale-dependent | as above | transition | high |
| CKE-B1-034 | B1 | Type a URL then Space | inline formatting | no | The URL turns blue and underlined | Silent. `AutoLink._enableTypingHandling` (`autolink.ts:204`); trailing punctuation is stripped from the href, so the *link target differs from the visible text* and nothing says so | that text became a link to `https://…` | transition | high |
| CKE-B1-035 | B1 | Type a URL then Enter / Shift+Enter | inline formatting | no | As above, then a new line | Silent (`_enableEnterHandling`, `_enableShiftEnterHandling`) | as above | transition | medium |
| CKE-B1-036 | B1 | Paste a URL over a text selection | inline formatting | no | The selected words become a link | Silent (`_enablePasteLinking`). Note this is a *different* result from pasting with no selection | your selection became a link to `https://…` | transition | medium |
| CKE-B1-037 | B1 | Paste a bare image URL on an empty line | document structure | yes | The URL is replaced by a rendered image widget | Silent. `AutoImage` — a paragraph of text becomes a non-text object with no alt attribute | an image was inserted, with no alternative text | both | medium |
| CKE-B1-038 | B1 | Paste a bare YouTube/Vimeo URL on an empty line | document structure | yes | The URL is replaced by a media preview widget | Silent. `AutoMediaEmbed`; widget label is "media widget" but no fake selection is set on insert | a media embed was inserted | both | low |
| CKE-B1-039 | B1 | Enter at the end of a heading | document structure | yes | The new line renders as body text, not a heading | Silent. Expected behaviour, but it is still the editor changing the block type the user did not ask about | you left the heading; you are now in a paragraph | transition | high |
| CKE-B1-040 | B1 | Enter twice at the end of a code block | document structure | yes | The caret leaves the block; a paragraph appears after it | **Announced** — "Leaving code snippet" / "Leaving %0 code snippet" (`codeblockediting.ts:333`) | you left the code block; you are in a paragraph | — (passes) | medium |
| CKE-B1-041 | B1 | Enter at the very start of a code block whose first line is empty | document structure | yes | A paragraph appears *above* the block and the caret moves into it | **Announced** — `leaveBlockStartOnEnter` (`codeblockediting.ts:404-440`) renames the cloned block to a paragraph and calls `writer.setSelection(newBlock, 'in')`, so the selection genuinely leaves `codeBlock` and "Leaving %0 code snippet" fires. Note the precondition (`isSoftBreakNode(nodeAfter)`): if the first line is *not* empty this does nothing and there is no way to get above the block | you left the code block upwards; you are in a new paragraph | — (passes) | low |
| CKE-B1-042 | B1 | Typing anywhere inside a code block or an inline `code` run | behaviour, not content | no | Nothing visible | Silent, and this is the interesting case: `TextTransformation.isEnabled` is set false (`texttransformation.ts:118-124`) and `blockAutoformatEditing` bails on `codeBlock`. The *same keystrokes now do something different* and only the code-block enter announcement hints at it | autocorrect and autoformat are off in this context | transition | medium |
| CKE-B1-043 | B1 | Continuing to type immediately after an inline autoformat | pending style | no | Nothing visible; the next character is *not* bold | Silent. `getCallbackFunctionForInlineAutoformat` calls `writer.removeSelectionAttribute(attributeKey)` (`autoformat.ts:246`) so the pending style is deliberately cleared. There is no state anchor at all for this — framework case C2 | bold is now **off** for what you type next | transition | high |
| CKE-B1-044 | B1 | Ctrl+V of Word/Google Docs content | document structure | yes | Content appears with fonts and structure normalised | Silent. `PasteFromOffice` rewrites lists, tables and styles during upcast. What landed is not what was on the clipboard | N blocks were pasted; the structure was normalised | transition | medium |
| CKE-B1-045 | B1 | Any of the above while a collaborator is also typing | document structure | yes | Content shifts under the caret | Silent. `blockAutoformatEditing` guards on `!batch.isLocal` for *its own* firing, but remote operations that reflow the document around the caret are never announced | the document changed around you | transition | low |

---

## B2 — User-initiated change

The user pressed a command and needs the resulting **state**. Every feature exposes a
`Command` with observable `value` and `isEnabled` (`packages/ckeditor5-core/src/command.ts:55,68`).
The full registered command inventory is in the appendix.

**The central finding for this bucket:** `command.value` reaches assistive technology through
exactly one route — `view.bind('isOn').to(command, 'value')` in the UI layer
(`packages/ckeditor5-basic-styles/src/utils.ts:41`), which `ButtonView` maps to `aria-pressed`
for toolbar buttons and `aria-checked` for `role="menuitemcheckbox"` menu items
(`packages/ckeditor5-ui/src/button/buttonview.ts:268-315`). That state is only readable if the
user *goes to the button*. While the caret is in the editing area — which is where the user is
when they press Ctrl+B — `command.value` has no AT-visible representation whatsoever.

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-B2-001 | B2 | Ctrl+B with a range selection | inline formatting | no | Selected text thickens; toolbar Bold button gets an active background | Silent at the caret. `AttributeCommand.execute` wraps the range; `command.value` flips to `true`; the toolbar button's `aria-pressed` changes but the button is not focused, so nothing is spoken | bold applied to the N selected characters | transition | high |
| CKE-B2-002 | B2 | Ctrl+B with a collapsed caret | pending style | no | Toolbar Bold button turns active; nothing in the document changes | Silent, and **there is nothing to inspect** — the state lives on `ModelDocumentSelection`'s attribute set, not on any DOM node. The framework's C2 case, in its purest form | bold is now on for what you type next | transition | high |
| CKE-B2-003 | B2 | Ctrl+B on an already-bold selection | inline formatting | no | Text thins; button deactivates | Silent. `execute()` branches on `this.value` | bold removed from the selection | transition | high |
| CKE-B2-004 | B2 | Ctrl+I with a range selection | inline formatting | no | Text slants | Silent (same `AttributeCommand` path) | italic applied to the selection | transition | high |
| CKE-B2-005 | B2 | Ctrl+I with a collapsed caret | pending style | no | Button turns active | Silent; no state anchor | italic is on for the next typing | transition | high |
| CKE-B2-006 | B2 | Ctrl+U | inline formatting / pending style | no | Underline appears / button activates | Silent | underline on/off | transition | medium |
| CKE-B2-007 | B2 | Ctrl+Shift+X | inline formatting / pending style | no | Strike-through appears | Silent | strikethrough on/off | transition | low |
| CKE-B2-008 | B2 | Inline `code` toggle (toolbar) | inline formatting / pending style | no | Run becomes monospace | Silent. Also silently changes autocorrect behaviour (see CKE-B1-042) | code style on; autocorrect off here | transition | low |
| CKE-B2-009 | B2 | Subscript / Superscript toggle | inline formatting | no | Baseline shifts | Silent. Baseline shift is a purely visual channel — there is no text equivalent at all | subscript/superscript applied | both | low |
| CKE-B2-010 | B2 | Arrow-arrow at the edge of an inline `code`/link run (TwoStepCaretMovement) | selection/caret | no | The caret "sticks" at the boundary for one press, then leaves | Silent. Registered in the help dialog as "Move out of an inline code style" (`codeediting.ts:75`) but the two caret positions are indistinguishable to AT | you are at the boundary; the next character will/won't be code | transition | medium |
| CKE-B2-011 | B2 | Arrow across a bold/italic boundary | selection/caret | no | Nothing | **The browser handles this**, not CKEditor: the editing view contains real `<strong>`/`<em>` so Chromium computes text attributes and NVDA/JAWS can report font changes if configured. Framework group D — the one group that works | formatting changed at this position | — (passes, platform) | high |
| CKE-B2-012 | B2 | Caret moved into bold text | pending style | no | The Bold toolbar button lights up | Command `refresh()` recomputes `value` from the selection; `aria-pressed` on the (unfocused) button updates. Nothing reaches the user unless they leave the editor and go read the toolbar. Framework case C3 | the caret is now inside bold text | transition | high |
| CKE-B2-013 | B2 | Choose "Heading 2" from the heading dropdown | document structure | yes | Block re-renders larger; dropdown label changes | Silent in the content. `HeadingCommand.value` is the model element name; the dropdown button label is bound to it, so the state *is* readable — on the dropdown | this block is now a heading, level N | transition | high |
| CKE-B2-014 | B2 | Choose "Paragraph" | document structure | yes | Block shrinks to body text | Silent | this block is now a paragraph | transition | medium |
| CKE-B2-015 | B2 | Block quote toggle **on** | document structure | yes | Indent and left border appear | Silent. `BlockQuoteCommand.value` is boolean | you are now inside a quotation | transition | medium |
| CKE-B2-016 | B2 | Block quote toggle **off** | document structure | yes | Border disappears | Silent | you left the quotation | transition | medium |
| CKE-B2-017 | B2 | Code block toggle on (toolbar) | document structure | yes | Monospace block | **Announced** — the selection moves into `codeBlock`, so `_initAriaAnnouncements` fires "Entering %0 code snippet" | you are in a code block, language X | — (passes) | medium |
| CKE-B2-018 | B2 | Change code block language from the dropdown | document structure (attribute) | no | The language label under the block changes | Silent — the selection does not change parents, so `change:range` does not fire and the announcer is not reached, even though the announcement string is language-aware | the code block language is now X | transition | low |
| CKE-B2-019 | B2 | Bulleted list toggle **on** | document structure | yes | Bullets appear | Silent. `ListCommand.value` is boolean | a bulleted list started; item 1 of N | transition | high |
| CKE-B2-020 | B2 | Bulleted list toggle **off** | document structure | yes | Bullets vanish; blocks become paragraphs | Silent | you left the list; N paragraphs now | transition | high |
| CKE-B2-021 | B2 | Numbered list toggle on | document structure | yes | Numbers appear | Silent | an ordered list started; item 1 of N | transition | high |
| CKE-B2-022 | B2 | To-do list toggle on | document structure | yes | Checkboxes appear | **Announced** — "Entering a to-do list" (`todolistediting.ts:400`) | a to-do list started; item 1, unchecked | transition (partial) | medium |
| CKE-B2-023 | B2 | Ctrl+Enter on a to-do item | document structure (attribute) | no | The checkbox fills in / empties | Silent. `CheckTodoListCommand` sets `todoListChecked`; the downcast recreates an `<input type="checkbox" tabindex="-1">` inside a `contenteditable="false"` span (`todolistediting.ts:157-178`). The caret is in the text, not on the input, so the checked-state change generates no focus or value event the AT will voice. **Also: this keystroke is not registered in the accessibility help dialog** — the list package registers only Tab/Shift+Tab (`listediting.ts:702`) | this item is now checked / unchecked | transition | medium |
| CKE-B2-024 | B2 | Enter at the end of a list item | document structure | yes | A new bullet/number appears | Silent. `<li>` boundaries are real, so a screen reader re-reading the line may say "list item" depending on verbosity, but the ordinal is not offered | new item; item N of M | transition | high |
| CKE-B2-025 | B2 | Enter on an **empty** list item | document structure | yes | The bullet disappears; the caret snaps left to body level | Silent. The user has silently exited a structure. If the list was nested, they drop one level instead of exiting | you left the list; you are in a paragraph (or: level decreased to N) | transition | high |
| CKE-B2-026 | B2 | Tab inside a list item | document structure (nesting) | yes | The item indents; the bullet glyph changes | Silent. The result state *is* expressible — nested `<ul>` gives `aria-level` for free — but nothing marks the change. Framework case B3 | indent level increased to N | transition | high |
| CKE-B2-027 | B2 | Shift+Tab inside a list item | document structure (nesting) | yes | The item outdents | Silent. Framework case B4 | indent level decreased to N | transition | high |
| CKE-B2-028 | B2 | Backspace at the start of a list item | document structure | yes | The item merges into the previous one, or is lifted out of the list | Silent. Two very different outcomes from one keystroke (`mergeListItemBackward` vs. outdent) and no way to tell which happened | you left the list / your item merged into the one above | transition | high |
| CKE-B2-029 | B2 | Change list style (disc / circle / decimal / lower-roman …) | document structure (attribute) | no | Bullet or numeral glyph changes | Silent. `listStyle` sets `list-style-type`; **CSS-only, so the AX tree does not change at all** — a screen reader cannot discover the new style even by navigating | the list marker style is now X | **structural** | low |
| CKE-B2-030 | B2 | Set list start index | document structure (attribute) | no | Numbering restarts at N | Silent, but the state survives: `writer.setAttribute('start', listStart, element)` (`listpropertiesediting.ts:421`) puts a real `start` attribute on the `<ol>` | this list now starts at N | transition | low |
| CKE-B2-031 | B2 | Toggle reversed list order | document structure (attribute) | no | Numbers count down | Silent; `reversed` attribute is set on the `<ol>` | this list is now reversed | transition | low |
| CKE-B2-032 | B2 | Tab / Shift+Tab outside a list (IndentBlock) | document structure (attribute) | no | The block shifts right/left | Silent. `indentBlock` writes a `margin-left` style — **presentation only**, nothing in the AX tree | indent level changed to N | **structural** | medium |
| CKE-B2-033 | B2 | Tab inside a code block | document content | no | Two spaces are inserted | Silent (`indentCodeBlock`). Whitespace insertion is invisible to speech | indentation increased | transition | low |
| CKE-B2-034 | B2 | Change alignment (left/center/right/justify) | document structure (attribute) | no | Text re-flows | Silent. `AlignmentCommand.value` is the alignment name; the DOM gets `text-align`, which is presentational | this block is now centred | **structural** | medium |
| CKE-B2-035 | B2 | Change font size / family / colour / background colour | inline formatting | no | Visual only | Silent. Colour and size are, for a screen-reader user, entirely non-existent unless they query text attributes explicitly | the selected text is now 18px / red / … | **structural** | medium |
| CKE-B2-036 | B2 | Apply / remove Highlight | inline formatting | no | A coloured band appears behind the text | Silent. Downcast is `<mark class="marker-yellow">`, so `<mark>` *is* in the AX tree — the colour is not | the selection is highlighted | transition | low |
| CKE-B2-037 | B2 | Apply a custom Style (`style` command) | inline or block class | no | The block/inline run restyles | Silent. `StyleCommand.value` is an array of active style names; the DOM only gains a class | style "Info box" applied | **structural** | low |
| CKE-B2-038 | B2 | Set text part language | inline formatting | no | A faint outline in the editing view | Silent — but this one *works structurally*: `lang` and `dir` are set on a `<span>`, which is exactly what makes a screen reader switch voices. The best "state expressible in the platform" case in the product | this run is now marked as French | transition | low |
| CKE-B2-039 | B2 | Ctrl+K then Enter — apply a link | inline formatting | no | Text turns blue; a balloon toolbar appears | Silent for the document change. Focus does move to the balloon form on open (B3-015), which is announced as a form field | the selection is now a link to `https://…` | transition | high |
| CKE-B2-040 | B2 | Unlink | inline formatting | no | Text returns to body colour; balloon closes | Silent | the link was removed | transition | medium |
| CKE-B2-041 | B2 | Toggle a link decorator ("Open in a new tab") | inline formatting (attribute) | no | A switch in the balloon flips | The switch itself is a labelled `SwitchButtonView` with `aria-checked`, so this is one of the few B2 states that *is* readable — because it lives on a focusable control, not in the document | this link opens in a new tab | — (passes, by accident of UI placement) | low |
| CKE-B2-042 | B2 | Insert table 3×4 | document structure | yes | A grid appears; caret lands in the first cell | Silent. The `<table>`/`<td>` roles are real, and table cells now correctly keep their native role — `toWidgetEditable(..., { withAriaRole: false })` (`table/converters/downcast.ts:177`) stops CKEditor overriding `<td>` with `role="textbox"`. But nothing says a table was created or how big it is | a 3-column, 4-row table was inserted; you are in row 1, column 1 | transition | medium |
| CKE-B2-043 | B2 | Tab inside a table cell | selection/caret | no | The caret jumps to the next cell | Silent from CKEditor; the browser fires a selection change into a new `<td>`, so most screen readers *will* read the new cell's content and often its coordinates. Registered in the help dialog (`tablekeyboard.ts:89`) | you are in row R, column C | — (mostly passes, platform) | high |
| CKE-B2-044 | B2 | Tab in the **last** cell of a table | document structure | yes | A whole new row appears | Silent. A structural insertion disguised as a navigation keystroke — the user pressed "move to next cell" and got "create a row" | a new row was added; you are in row R+1, column 1 | transition | medium |
| CKE-B2-045 | B2 | Insert row above / below | document structure | yes | A row appears | Silent | a row was inserted above/below; the table is now R×C | transition | medium |
| CKE-B2-046 | B2 | Insert column left / right | document structure | yes | A column appears | Silent | a column was inserted; the table is now R×C | transition | medium |
| CKE-B2-047 | B2 | Delete row / column | document structure | yes | Content disappears; the caret relocates | Silent. Destructive and silent — the worst combination | a row was deleted; you are now in row R, column C | transition | medium |
| CKE-B2-048 | B2 | Merge cells (or merge up/down/left/right) | document structure | yes | Cell borders vanish; text joins | Silent. `colspan`/`rowspan` are real attributes, so the *result* is navigable | cells merged; this cell now spans N columns | transition | low |
| CKE-B2-049 | B2 | Split cell vertically / horizontally | document structure | yes | A new border appears | Silent | the cell was split; the table is now R×C | transition | low |
| CKE-B2-050 | B2 | Toggle header row / header column | document structure | yes | The first row/column goes bold and shaded | Silent — but structurally excellent: `<td>` is re-downcast as `<th>` (`table/converters/downcast.ts:140`), which is precisely the thing that makes a data table navigable. The single highest-value state change in the table feature, and it is silent | this row is now a header row | transition | medium |
| CKE-B2-051 | B2 | Toggle table caption | document structure | yes | An editable caption field appears above/below | Silent. `toWidgetEditable(captionElement, writer)` is called **with no `label` option** (`tablecaptionediting.ts:126`), so the caption editable gets `role="textbox"` and *no* accessible name — unlike the image caption, which does get one | a caption was added; you are in it | both | low |
| CKE-B2-052 | B2 | Select table row / column | selection | no | Cells highlight | Silent. Multi-cell selection has no DOM selection equivalent — it is a set of CSS classes plus a model marker | N cells selected, row R | **structural** | low |
| CKE-B2-053 | B2 | Change table or cell properties (border, background, width, alignment, padding) | attributes | no | Visual only | Silent; presentational attributes only | — | **structural** | low |
| CKE-B2-054 | B2 | Esc inside a table cell | selection | no | The whole table gets a blue outline | Silent, and this is a concrete bug: `toTableWidget()` calls `toWidget()` **with no label** (`table/converters/downcast.ts:249`), so `getLabel()` returns `''` and the fake-selection container falls back to ` ` (`renderer.ts:1062`). Selecting a table announces a **non-breaking space** | the whole table is selected, R rows by C columns | **structural** | medium |
| CKE-B2-055 | B2 | Insert image (from toolbar / file dialog) | document structure | yes | An image widget appears | Silent for the insert itself | an image was inserted with no alternative text | both | high |
| CKE-B2-056 | B2 | Image upload starts | operation status | no | A progress bar overlays the image | **Announced** — "Uploading image" (`imageuploadediting.ts:407`) | the upload started | — (passes) | high |
| CKE-B2-057 | B2 | Image upload completes | operation status | no | The progress bar disappears | **Announced** — "Image upload complete" (`imageuploadediting.ts:458`) | the upload finished | — (passes) | high |
| CKE-B2-058 | B2 | Image upload fails | operation status | no | The image disappears; a notification balloon shows | **Announced** — "Error during image upload" (`imageuploadediting.ts:469`). Separately `Notification.showWarning` falls back to `window.alert()` when no UI handles the event (`notification.ts:43`) | the upload failed, and why | — (passes) | medium |
| CKE-B2-059 | B2 | Set image alternative text | attribute | no | The balloon closes | Silent, but structurally correct: `alt` is written to the `<img>` and the widget label becomes `"<alt> image widget"` (`imageutils.ts:258-268`), so a later selection of the widget reads the alt text | alternative text saved: "…" | transition | medium |
| CKE-B2-060 | B2 | Toggle image caption | document structure | yes | An editable caption box appears under the image | Silent for the transition, but the caption editable is properly named — `toWidgetEditable(figcaption, writer, { label: 'Caption for image: <alt>' })` (`imagecaptionediting.ts:140-142`), giving `role="textbox"` + `aria-label`. Contrast CKE-B2-051 | a caption was added; you are editing it | transition | medium |
| CKE-B2-061 | B2 | Change image style (inline / block / side / align) | document structure or attribute | varies | The image moves and/or re-wraps | Silent. Inline↔block actually changes the model element (`imageInline` ↔ `imageBlock`), a genuine structural change | the image is now a block image, centred | transition | medium |
| CKE-B2-062 | B2 | Resize image (handle drag or dropdown) | attribute | no | The image changes size | Silent. Handle drag is mouse-only; the dropdown path is keyboard-reachable | the image is now 50% wide | **structural** | low |
| CKE-B2-063 | B2 | Insert media embed | document structure | yes | A preview box appears | Silent. Widget label is "media widget" (`mediaembedediting.ts:238`) but no fake selection is set at insert time | a media embed was inserted | transition | low |
| CKE-B2-064 | B2 | Insert horizontal line / page break | document structure | yes | A rule / page-break marker appears | Silent. Page break renders a `<span>` with literal text "Page break" (`pagebreakediting.ts:91`), so it is at least readable afterwards; the horizontal line is an `<hr>` in a widget wrapper | a horizontal rule / page break was inserted | transition | low |
| CKE-B2-065 | B2 | Insert / update bookmark | document structure | yes | A small anchor icon appears inline | Silent. `bookmarkediting.ts:177` gives the widget a label creator, so selecting it later reads the bookmark id | a bookmark named "X" was inserted | transition | low |
| CKE-B2-066 | B2 | Insert HTML embed; toggle its edit/preview mode | document structure | yes | A source textarea ↔ rendered preview | Silent. Widget label "HTML snippet" (`htmlembedediting.ts:256`) | you are in the raw HTML editor / the preview | transition | low |
| CKE-B2-067 | B2 | Click or arrow onto a widget so it becomes selected | selection | no | A blue outline surrounds the widget | **Partially handled by a clever mechanism.** `Widget` sets a *fake* view selection carrying the widget label (`widget.ts:149`); the renderer creates an off-screen `div.ck-fake-selection-container`, writes the label into it, and moves the **real DOM selection** onto that text (`renderer.ts:1042-1076`). A screen reader reporting the selection therefore says "image widget" — with no live region at all. This is the single most interesting a11y mechanism in CKEditor 5 | an image widget is selected, alt text "…" | — (passes, for labelled widgets) | high |
| CKE-B2-068 | B2 | Same, on a **table** widget | selection | no | Blue outline round the table | Fails — see CKE-B2-054; the label is empty so the fake selection contains only ` ` | a table is selected, R×C | **structural** | medium |
| CKE-B2-069 | B2 | Arrow up/down at a widget boundary (WidgetTypeAround) | selection/caret (pending insertion point) | no | A thin blinking "fake caret" bar appears above or below the widget | **Silent, and unrecoverable.** The state is a model selection attribute rendered as the CSS class `ck-widget_type-around_show-fake-caret_before\|after`; the clickable arrows are explicitly `aria-hidden="true"` (`widgettypearound.ts:929`). There is no DOM node, no role, no attribute an AT can read. The user is in a mode they cannot detect | you are positioned before/after the image; typing here creates a new paragraph | **structural** | medium |
| CKE-B2-070 | B2 | Enter while the type-around caret is active | document structure | yes | A new empty paragraph appears above/below the widget | Silent | a paragraph was inserted before/after the image; you are in it | transition | medium |
| CKE-B2-071 | B2 | Delete / Backspace on a selected widget | document structure | yes | The widget disappears | Silent. Destructive, silent, and the caret relocates unpredictably | the image was deleted; you are now in … | transition | medium |
| CKE-B2-072 | B2 | Ctrl+Z undo | document structure | yes | The document snaps back; the selection is restored | Silent. `UndoCommand` restores the selection ranges from the batch, so the user is *moved* as well as having content changed, with no signal for either | what was undone, and where you now are | transition | high |
| CKE-B2-073 | B2 | Ctrl+Y / Ctrl+Shift+Z redo | document structure | yes | The change comes back | Silent | what was redone | transition | medium |
| CKE-B2-074 | B2 | Ctrl+V paste | document structure | yes | Content appears; the caret lands after it | Silent. Framework case E3 — no count, no description of what landed | N blocks / N characters pasted | transition | high |
| CKE-B2-075 | B2 | Ctrl+Shift+V paste as plain text | document structure | yes | Unformatted content appears | Silent, and indistinguishable from CKE-B2-074 | plain text pasted, formatting stripped | transition | medium |
| CKE-B2-076 | B2 | Ctrl+A select all | selection | no | Everything highlights | Silent; progressive (selects the nearest limit element, then the root) so pressing it twice does different things | the whole document is selected, N words | transition | medium |
| CKE-B2-077 | B2 | Enter (plain) | document structure | yes | A new paragraph | Silent; the browser's own caret-move reporting usually covers this | new paragraph | — (mostly passes) | high |
| CKE-B2-078 | B2 | Shift+Enter | document structure | no | A line break within the block | Silent. Visually identical to Enter, semantically different (`<br>` vs. new block) — the user cannot tell which they produced | a soft line break, still the same paragraph | transition | medium |
| CKE-B2-079 | B2 | Backspace joining two blocks | document structure | yes | Two paragraphs become one; possibly a list item merges into a paragraph | Silent; several different outcomes from one key | the blocks merged / you left the list | transition | high |
| CKE-B2-080 | B2 | Ctrl+F, then type a query | popup state + match set | no | Matches highlight in the document; a "3 of 50" counter appears inside the find field | **Silent — and this is a clean, verifiable failure.** The counter is a plain `<span class="ck-results-counter">` bound to `_resultsCounterText` with **no `aria-live`, no `role="status"`, and no `aria-describedby` on the input** (`ui/findandreplaceformview.ts:481-506`). Grepping the whole repo for `aria-live` outside `arialiveannouncer.ts` returns nothing | N matches found | transition | high |
| CKE-B2-081 | B2 | F3 / Shift+F3 — next / previous match | selection + counter | no | The highlight moves; the counter increments; the view scrolls | Silent for the counter. The document selection does move to the match, so a screen reader will read the surrounding text — but never "4 of 50" | match 4 of 50, in "<context>" | transition | high |
| CKE-B2-082 | B2 | Replace | document content | no | One match is swapped | Silent | replaced; N matches remain | transition | medium |
| CKE-B2-083 | B2 | Replace all | document content | yes | Many matches swap at once | Silent. A bulk mutation of the whole document with zero feedback | N occurrences replaced | transition | medium |
| CKE-B2-084 | B2 | Toggle source editing | editing mode | yes | The rich view is replaced by a raw-HTML textarea | Silent, but the textarea *is* named — `aria-label: 'Source code editing area'` (`sourceediting.ts:246`). Two defects: the string is **hard-coded English, not routed through `t()`**, so it never localises; and the whole editing surface is swapped under the user with no announcement | you are now editing raw HTML | transition | low |
| CKE-B2-085 | B2 | Ctrl+Shift+F toggle fullscreen | UI layout | no | The editor fills the viewport; toolbars re-parent | Silent. DOM is re-parented under the caret — a large AX-tree churn with no explanation | the editor is now fullscreen | transition | low |
| CKE-B2-086 | B2 | Toggle "Show blocks" | UI overlay | no | Dotted outlines and element names appear around every block | Silent. Purely visual — and ironically it renders exactly the structural information a screen-reader user needs, as a picture | block outlines shown | **structural** | low |
| CKE-B2-087 | B2 | Editor becomes read-only (or a command loses `isEnabled`) while its toolbar button has focus | control state | no | The focused button greys out | `ButtonView` binds `isEnabled` to the `disabled` DOM state; a disabled button loses focus in most browsers. Framework failure F2. `Command` disables via `set:isEnabled` interception (`command.ts:133-153`) | this control is now unavailable; focus went to … | transition | low |
| CKE-B2-088 | B2 | Tab / Shift+Tab in restricted-editing mode | selection/caret | no | The caret jumps to the next editable region | Silent. `goToNextRestrictedEditingException`; the non-editable spans are `contenteditable="false"` so they are at least distinguishable | you are in editable region N of M | transition | low |
| CKE-B2-089 | B2 | Word count updates as you type | status display | no | "Words: 231 Characters: 1489" ticks over | Silent. The word-count container carries no ARIA at all (grep of `ckeditor5-word-count/src` for `aria` returns nothing). Correct choice — announcing it would be a storm (framework F5) — but it means the number is unreachable at any time | — (should be queryable, not announced) | **structural** | low |
| CKE-B2-090 | B2 | Drag and drop content within the document | document structure | yes | Content moves; a drop marker follows the pointer | Silent. Keyboard drag-and-drop is not supported at all, so this scenario is mouse-only | content moved to … | both | low |
| CKE-B2-091 | B2 | Autosave / pending action in flight | operation status | no | The "Powered by" area or a host-supplied indicator changes | Silent. `PendingActions` exposes observable state but no announcement; unsaved-work protection is `beforeunload` only | saving… / saved / save failed | transition | medium |

---

## B3 — Menus and popups

Autocomplete, mentions, slash commands, emoji, balloons, dialogs. The rule of thumb from the
source: **anything CKEditor builds as a focusable UI view is well-marked-up; anything that
floats next to a caret which stays in the document is invisible.**

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-B3-001 | B3 | Type `@` followed by 2+ characters | popup state | no | A list of matching people appears next to the caret; the first is highlighted | **Nothing at all.** The `ckeditor5-mention` package contains **zero** `aria*` or `role` references (verified: `grep -rn "aria\\|role" packages/ckeditor5-mention/src` → no matches). No `aria-expanded`, no `aria-controls`, no `aria-activedescendant`, no combobox role on the editable, and no live region. Focus stays in the document | a list of N suggestions opened; item 1 is "Barney Bartle" | **structural** | high |
| CKE-B3-002 | B3 | Arrow Down / Up in the mention panel | popup state | no | The highlight moves down the list | **Nothing.** `MentionsView.select()` calls `item.highlight()`, which only sets `isOn` on a `MentionDomWrapperView`, which only toggles the CSS classes `ck-on`/`ck-off` (`ui/domwrapperview.ts:50-58`). No focus move, no `aria-activedescendant`, no announcement | now on "Bartleby Bartle", 2 of 6 | **structural** | high |
| CKE-B3-003 | B3 | Keep typing to narrow the feed | popup state | no | The list shrinks; the highlighted item changes | **Nothing.** The result count is never exposed | 2 suggestions now match | **structural** | high |
| CKE-B3-004 | B3 | Enter or Tab to commit a mention | document structure | yes | The typed `@bar` is replaced by a styled mention chip | Silent for the substitution. The chip downcasts to `<span class="mention" data-mention="@Barney">` — an inline element with no role, so it reads as ordinary text afterwards | "@bar" was replaced by a mention of Barney Bartle | both | high |
| CKE-B3-005 | B3 | Esc to dismiss the mention panel | popup state | no | The list disappears | Nothing | the suggestion list closed | **structural** | high |
| CKE-B3-006 | B3 | The panel auto-closes (no matches, caret moved, blur) | popup state | no | The list disappears without user action | Nothing. The user does not know the panel was ever there, nor that it is gone — so Enter now does something completely different | the suggestion list closed | **structural** | high |
| CKE-B3-007 | B3 | Type `:` plus 2 characters (EmojiMention) | popup state | no | A list of emoji with names appears | **Nothing** — `EmojiMention` registers a feed on the `Mention` UI with marker `:` (`emojimention.ts:122`), so it inherits every gap in CKE-B3-001..006 | a list of N emoji opened; item 1 is "grinning face" | **structural** | medium |
| CKE-B3-008 | B3 | Choose the "Show all emoji…" item | dialog opens | no | A full emoji picker dialog opens and takes focus | Announced by the platform, because it is a real `DialogView` — `role="dialog"` + `aria-label` bound to the title (`ui/dialog/dialogview.ts:287-288, 394`) and focus is moved into it | an "Emoji" dialog opened | — (passes) | low |
| CKE-B3-009 | B3 | Type in the emoji picker search field | grid contents | no | The grid repopulates | Silent. The grid is `role="grid"` inside `role="tabpanel"` (`ui/emojigridview.ts:104,114`), so the *result* is navigable, but the count change is not announced | N emoji match | transition | low |
| CKE-B3-010 | B3 | Move between emoji category tabs | tab selection | no | The active tab underlines; the grid swaps | Handled — `role="tablist"` / `role="tab"` with `aria-selected` bound to `isOn` (`ui/emojicategoriesview.ts:70,177,187`) | tab "Food & Drink" selected | — (passes) | low |
| CKE-B3-011 | B3 | Arrow around the emoji grid | selection/caret | no | The focused emoji outlines | Each cell is a button with `ariaLabel` set to the emoji name (`emojigridview.ts:268`) | "grinning face" | — (passes) | low |
| CKE-B3-012 | B3 | Open the skin-tone dropdown | menu state | no | A small menu of hand icons opens | Handled — `role="menu"` with `role="menuitemradio"` children and per-item `ariaLabel` (`ui/emojitoneview.ts:65-93`) | skin tone menu, "Medium" selected | — (passes) | low |
| CKE-B3-013 | B3 | Type `/` at the start of a block (Slash Commands, premium) | popup state | no | A panel of commands appears; typing filters it | **INFERRED — no source access (premium package).** The docs describe it as built on the mention UI and it is packaged as a mention feed, so it almost certainly inherits CKE-B3-001..006 exactly. Needs harness verification against a licensed build | a command palette opened, N commands, item 1 is "Bulleted list" | **structural** | high |
| CKE-B3-014 | B3 | Move the caret into an existing link | popup appears, no focus change | no | A balloon with the URL and Edit/Unlink buttons pops up next to the link | Nothing about the balloon. The `<a href>` itself *is* in the AX tree, so a screen reader arrowing across says "link" and can read the target — that part is the platform doing its job (framework D2). The balloon's own appearance is unannounced, and `BalloonPanelView` carries **no `role` and no `aria-label`** (verified: no `aria` in `ui/panel/balloon/balloonpanelview.ts`) | you are in a link to `https://…`; a link toolbar is available | **structural** | high |
| CKE-B3-015 | B3 | Ctrl+K | dialog-ish popup + focus move | no | A balloon form opens; focus lands in the URL input | Reasonable: focus genuinely moves to a `LabeledFieldView` text input, so the field's label is announced. But the *container* is an unlabelled `<div>`, so there is no "Link dialog" context around it | a link form opened; URL field | transition | high |
| CKE-B3-016 | B3 | Esc from the link form | focus move | no | The balloon closes; the caret returns to the document | Focus return is implemented correctly (`linkui.ts:1043`, `editor.editing.view.focus()`). The return is not announced but the AT will report re-entering the editable | the form closed; you are back in the document | — (mostly passes) | high |
| CKE-B3-017 | B3 | The link balloon switches from form to toolbar after Save | popup content swap | no | The URL input is replaced by a row of icon buttons | Silent content swap inside an unlabelled container; the balloon's `ToolbarView` keeps the default `ariaLabel` "Editor toolbar" (`toolbarview.ts:209`), i.e. it does not identify itself as the *link* toolbar | link toolbar: Edit, Unlink, Open in new tab | **structural** | medium |
| CKE-B3-018 | B3 | Open the link "Displayed text" / properties sub-view | nested popup | no | The balloon content is replaced by another form | Silent swap; back-navigation is a "Back" button | link properties form | **structural** | low |
| CKE-B3-019 | B3 | Open the link providers list (bookmarks / predefined links) | nested popup | no | A list of link targets replaces the form | Silent swap | a list of N link targets | **structural** | low |
| CKE-B3-020 | B3 | Select an image widget | balloon toolbar appears | no | A floating toolbar appears above the image | The *widget selection* is announced via the fake-selection mechanism (CKE-B2-067) — but that the toolbar appeared, and that Alt+F10 will reach it, is not | an image toolbar is available (Alt+F10) | **structural** | high |
| CKE-B3-021 | B3 | "Change image text alternative" from the image toolbar | popup + focus move | no | A balloon with a labelled input opens; focus moves in | The input is a `LabeledFieldView`, so its label is announced on focus. The existing `alt` is pre-filled | text alternative field, current value "…" | — (mostly passes) | medium |
| CKE-B3-022 | B3 | Put the caret in a table cell | balloon toolbar appears | no | A floating table toolbar appears | Silent. Same unlabelled `BalloonPanelView`; the user is not told a contextual toolbar exists | a table toolbar is available (Alt+F10) | **structural** | medium |
| CKE-B3-023 | B3 | Scroll or move the selection while a balloon is open | popup position | no | The balloon repositions or hides | Silent. Harmless, but it means a balloon can vanish between the moment a user is told about it and the moment they press Alt+F10 | — | — | medium |
| CKE-B3-024 | B3 | Ctrl+F | popup + focus move | no | The find & replace panel opens; focus lands in "Find in text…" | The input is labelled, so focus arrival is announced. The panel is a dropdown/dialog with `aria-haspopup`/`aria-expanded` on its button (`ui/dropdown/button/dropdownbuttonview.ts:52-53`) | find panel opened; find field | — (mostly passes) | high |
| CKE-B3-025 | B3 | The "N of M" results counter changes | popup state | no | The counter text inside the find field updates | **Silent** — see CKE-B2-080. This is the clearest single ARIA gap in the product: a live, changing, purely-visual count sitting inside a focused text input, with no `aria-describedby` linking them | 3 of 50 matches | transition | high |
| CKE-B3-026 | B3 | "Text to find must not be empty" / "Invalid start index value" validation errors | error state | no | Red text appears under the field | Handled — `InputBase` wires the error text with `aria-describedby` ("it helps screen readers read the error text", `ui/input/inputbase.ts:80`) | the field is invalid: … | — (passes) | low |
| CKE-B3-027 | B3 | Open the special characters dialog | dialog | no | A dialog with a category menu and a character grid | `role="dialog"` + label; the category selector is `role="menu"` / `role="menuitemradio"` (`specialcharacterscategoriesview.ts:90,126-127`) | special characters dialog | — (passes) | low |
| CKE-B3-028 | B3 | Alt+0 — accessibility help dialog | dialog | no | A dialog listing every registered keystroke, grouped | The best-engineered piece of a11y in the product. Content comes from a first-class registry: `editor.accessibility.addKeystrokeInfoCategory/Group/Infos` (`core/src/accessibility.ts`), which plugins populate — Autoformat, Bold, Italic, Underline, Strikethrough, Code, Clipboard, Enter, ShiftEnter, SelectAll, Link, Find&Replace, Fullscreen, List, Table | every keystroke, grouped and localised | — (passes) | low |
| CKE-B3-029 | B3 | Alt+F10 — move focus to the toolbar | focus move | no | A toolbar button gets a focus ring | Handled — `role="toolbar"` + `aria-label` "Editor toolbar" (`toolbarview.ts:209,264`), roving-tabindex arrow navigation | editor toolbar, Bold button, not pressed | — (passes) | medium |
| CKE-B3-030 | B3 | Focus a toggle button (Bold) in the toolbar | control state read | no | The button shows an active background | **This is the only place `command.value` is exposed to AT.** `isOn` → `aria-pressed` for toolbar buttons, `aria-checked` for `role="menuitemcheckbox"` menu-bar items (`buttonview.ts:268-269, 294-315`) | Bold button, pressed | — (passes) | medium |
| CKE-B3-031 | B3 | Open the toolbar's "Show more items" grouped dropdown | menu state | no | Overflowed buttons drop down | `aria-haspopup` + `aria-expanded` on the dropdown button. Which buttons got grouped changes with viewport width, so the toolbar's contents differ between sessions | N more items | — (mostly passes) | medium |
| CKE-B3-032 | B3 | Alt+F9 — move focus to the menu bar | focus move | no | The menu bar activates | Handled; menu items use `role="menuitemcheckbox"` where they mirror a command value | menu bar, Format menu | — (passes) | low |
| CKE-B3-033 | B3 | Open the heading dropdown | menu state + current value | no | A list of heading levels with the current one marked | Handled by placement: the dropdown button's label is bound to `HeadingCommand.value`, so focusing it reads the current block format | current format: Heading 2 | — (passes) | medium |
| CKE-B3-034 | B3 | Open the list-properties dropdown | menu state | no | A grid of marker styles, a "Start at" number field, a "Reversed order" switch | The number field and switch are labelled controls; the **style grid** is a set of icon buttons whose meaning is the glyph. `listStyle` has no text equivalent in the document either (CKE-B2-029) | list style: decimal | **structural** | low |
| CKE-B3-035 | B3 | Open the Styles panel | menu state | no | A grid of named style previews | Handled deliberately: the preview string "AaBbCcDdEeFfGgHhIiJj" is excluded from the accessible name — "should not be read by screen readers because it is purely presentational" (`style/ui/stylegridbuttonview.ts:74`) | style "Info box", not applied | — (passes) | low |
| CKE-B3-036 | B3 | Open the insert-table size picker | menu state | no | A 10×10 grid of boxes; hovering sizes the selection | The grid boxes are `aria-hidden="true"` (`table/ui/inserttableview.ts:96`) and the size is conveyed by a label view. Keyboard-operable, but the size feedback is a visual label with no live region | 3 × 4 | transition | medium |
| CKE-B3-037 | B3 | A feature raises a warning (e.g. upload failure) | notification | no | Depends on the integration | With no host handler, `Notification.showWarning` falls back to `window.alert()` (`ui/notification/notification.ts:43`) — which *is* announced, but is a modal browser dialog, not editor UI | the operation failed, and why | — (passes, crudely) | low |
| CKE-B3-038 | B3 | Any balloon (link, table, image, mention, find) opens | popup state | no | A floating panel appears | **Systemic:** `BalloonPanelView` sets no `role` and no `aria-label`, and `ContextualBalloon` stacks views inside one panel with no announcement of the swap. Every contextual UI in the product inherits this | a "…" panel opened | **structural** | high |


### B2 (continued) — the rest of the feature catalogue

Rows CKE-B2-092 onward cover the features not reachable from the core editing scenarios above:
content-preservation layers, asset integrations, and the premium/collaboration suite. Premium
rows are marked **[premium]** and their `currentSR` values are **INFERRED** — those packages
are not in the open-source repository and the public documentation makes no ARIA or
screen-reader statements about them.

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-B2-092 | B2 | An element the schema does not model (e.g. `<details>`, `<iframe>`) survives load via General HTML Support | document structure | yes | A grey block labelled with the tag name | Silent. `htmlsupport/src/converters.ts:80-91` wraps it as a widget with `label: widgetLabel` and `data-html-object-embed-label`, so selecting it *is* announced by the fake-selection mechanism. But its inner content is not editable and not exposed as anything but an opaque object | an unsupported HTML object of type `<details>` | transition | low |
| CKE-B2-093 | B2 | GHS preserves arbitrary attributes/classes/styles on a supported element | attributes | no | Whatever the CSS does | Silent, by design. GHS is a data-fidelity layer, not an editing feature — **out of scope for a conformance corpus** except where it re-introduces unlabelled interactive markup (`<button>`, `<input>`) into the editable, which it can | — | — | low |
| CKE-B2-094 | B2 | Markdown GFM data processor is enabled | data format | no | Nothing — the editing view is unchanged | No editing-time behaviour at all: it swaps `editor.data.processor` so `getData()`/`setData()` speak Markdown. **Out of scope** — it changes serialisation, not the editing surface | — | — | low |
| CKE-B2-095 | B2 | Minimap is enabled | UI overlay | no | A scaled-down page preview beside the editor | Correctly handled: the minimap renders in an `<iframe>` marked `aria-hidden="true"` (`minimap/src/minimapiframeview.ts:58`), so the duplicate content is not double-read. A good example of the right call | — | — (passes) | low |
| CKE-B2-096 | B2 | Apply a link to a selected image (LinkImage) | attribute | no | The image gains a link indicator badge | Silent. Structurally the `<a>` wraps the `<img>`, so the AX tree has a link containing an image — correct. The widget label does **not** mention the link, so selecting the image afterwards announces "image widget" with no hint that it is now a link | this image links to `https://…` | transition | low |
| CKE-B2-097 | B2 | Open an asset manager (CKBox / CKFinder / Easy Image) | third-party dialog / iframe | no | A file browser opens | **INFERRED** — third-party or premium UI outside this repository. Any CKFinder/CKBox integration replaces the editor's own dialog stack, so `DialogView`'s `role="dialog"` guarantees do not apply | a file browser opened | **INFERRED** | low |
| CKE-B2-098 | B2 | **[premium]** Multi-level list — apply, indent, change legal numbering | document structure (depth) | yes | `1.1.1`-style numbering | **INFERRED.** Legal-style numbering is generated by CSS counters in every implementation of this pattern known to us, which would make the visible number invisible to AT even on re-read — the `<li>` has no text equivalent of "1.1.1". Needs harness verification against a licensed build; if confirmed it is a **structural** failure, strictly worse than a plain ordered list | list item 1.1.1, level 3 | **INFERRED (suspected structural)** | medium |
| CKE-B2-099 | B2 | **[premium]** Insert a Template | document structure | yes | A block of pre-authored content appears | **INFERRED.** Inserting N blocks at once with no announcement; the template picker is a CKEditor UI panel and so probably inherits the dialog/balloon behaviour above | a template of N blocks was inserted; you are at … | **INFERRED** | low |
| CKE-B2-100 | B2 | **[premium]** Document outline panel | navigation aid | no | A live heading tree beside the editor | **INFERRED.** Note this feature exists because sighted users need structural navigation — the same need a screen reader already serves natively via heading navigation. If the panel duplicates headings without `aria-hidden`, it doubles them | — | **INFERRED** | low |
| CKE-B2-101 | B2 | **[premium]** Table of contents field | document structure | yes | A generated, auto-updating TOC block | **INFERRED.** A live-updating region inside the editable is exactly the case where an unmanaged `aria-live` would cause storms; whether it is marked `aria-live="off"` is unknown | the table of contents updated | **INFERRED** | low |
| CKE-B2-102 | B2 | **[premium]** Format painter — copy then apply formatting | inline formatting | no | The cursor changes; formatting transfers | **INFERRED.** A modal-ish "armed" state — the same "you are now in a mode" class as CKE-B2-069, and the most likely place for the same failure | format painter is armed / applied | **INFERRED (suspected)** | low |
| CKE-B2-103 | B2 | **[premium]** Case change (UPPER / lower / Title) | text content | no | Letters change case | **INFERRED.** A bulk rewrite of the user's text — B1-shaped in effect, B2 in trigger | N words changed to Title Case | **INFERRED** | low |
| CKE-B2-104 | B2 | Paste from Google Docs, or paste Markdown text | document structure | yes | Structure and styles are reconstructed | Silent. Same class as CKE-B1-044 — what lands is not what was on the clipboard | N blocks pasted; structure normalised | transition | medium |
| CKE-B2-105 | B2 | Spelling & grammar check (WProofreader, third-party premium) | inline markers + popup | no | Squiggly underlines; a suggestion balloon on click | **INFERRED — third-party.** Two distinct gaps to test: whether the misspelling markers are exposed (a `<span>` with a class is not; the platform's own spellcheck is), and whether the suggestion popup is a real combobox. CKEditor's native `spellcheck` attribute path delegates to the browser, which *is* exposed in the AX tree — a rare case where the platform default beats the feature | this word is misspelled; N suggestions | **INFERRED (suspected structural)** | medium |
| CKE-B2-106 | B2 | **[premium]** Caret moves into a tracked-changes suggestion range | container-ish state | no | Coloured underline / strikethrough; the matching sidebar card highlights | **INFERRED.** The docs describe `<suggestion-start>`/`<suggestion-end>` markers and `data-suggestion-*` attributes with **no documented role or ARIA**. This is a container-boundary case (BC section) for a container whose whole purpose is to say "this text is provisional" — if it is not exposed, a reviewer using a screen reader cannot tell suggested text from accepted text | this text is a suggested insertion by Alice | **INFERRED (suspected structural)** | high |
| CKE-B2-107 | B2 | **[premium]** Accept / decline a suggestion | document structure | yes | Text becomes permanent or vanishes | **INFERRED.** Destructive, and it relocates the caret | the suggestion was accepted; N remain | **INFERRED** | medium |
| CKE-B2-108 | B2 | **[premium]** Toggle track-changes mode on / off | editing mode | no | A toolbar button activates; subsequent edits render as suggestions | **INFERRED.** A global mode change that alters what *every* subsequent keystroke does — the highest-stakes instance of the "you are now in a mode" class in the entire product | your edits are now recorded as suggestions | **INFERRED (suspected)** | medium |
| CKE-B2-109 | B2 | **[premium]** Add a comment to a selection | annotation | no | A highlight appears; a sidebar card opens with focus in its input | **INFERRED.** The comment editor is itself a CKEditor instance, so it inherits the `role="textbox"` + `aria-label` treatment | a comment thread was created | **INFERRED** | medium |
| CKE-B2-110 | B2 | **[premium]** Caret moves into commented text | container-ish state | no | The highlight band; the sidebar card activates | **INFERRED.** The natural expression is `aria-details` (which exists precisely for this) pointing from the commented range to the annotation. Whether CKEditor uses it is unverified and worth checking first of all the premium items | this text has 2 comments | **INFERRED (suspected structural)** | high |
| CKE-B2-111 | B2 | **[premium]** Navigate the annotations sidebar | focus move | no | Cards receive focus | **INFERRED.** The relationship between a sidebar card and the text it annotates is the load-bearing semantic; without `aria-details`/`aria-describedby` the sidebar is an orphan list | this card comments on "…" | **INFERRED** | medium |
| CKE-B2-112 | B2 | **[premium]** Open revision history / compare revisions | editing mode | yes | A read-only diff view replaces the editor | **INFERRED.** A diff rendered with colour and strike-through is the archetypal colour-only encoding | 12 insertions, 3 deletions since revision 4 | **INFERRED (suspected structural)** | low |
| CKE-B2-113 | B2 | **[premium]** A remote collaborator's caret or selection appears | remote presence | no | A coloured caret with a name label | **INFERRED.** Presence is inherently visual; announcing every remote caret move would be a storm (framework F5), so the right answer is a *queryable* state, not a live region — a good argument for the framework's layer-4 case | Alice is editing 2 paragraphs below | **INFERRED** | medium |
| CKE-B2-114 | B2 | **[premium]** A remote edit changes the document around your caret | document structure | yes | Text shifts | **INFERRED**, but note that CKEditor's own local logic already distinguishes remote batches — `blockAutoformatEditing` guards on `!batch.isLocal` (`blockautoformatediting.ts:105`) — so the signal to hook exists. The user is not told when the ground moves under them | the document changed above you | **INFERRED (suspected)** | medium |
| CKE-B2-115 | B2 | **[premium]** AI Assistant generates or rewrites a selection | document structure | yes | Text streams in and then replaces the selection | **INFERRED.** Streaming generated text into a contenteditable is the worst possible live-region case: high-rate, long, and the user must be able to tell generated from authored content afterwards | N paragraphs were generated and replaced your selection | **INFERRED (suspected)** | medium |
| CKE-B2-116 | B2 | **[premium]** Enhanced source editing | editing mode | yes | A syntax-highlighted source pane | **INFERRED.** The open-source `SourceEditing` textarea is at least named (`sourceediting.ts:246`); a CodeMirror-style pane is a different, usually worse, accessibility proposition | you are editing raw HTML | **INFERRED** | low |
| CKE-B2-117 | B2 | The editor crashes and Watchdog restarts it | whole editing surface | yes | A brief flicker; the editor is recreated | Silent. The DOM root is destroyed and rebuilt, so focus and the caret are lost. **Framework F2 at maximum scale** — worth a row precisely because it is the loudest possible unannounced event | the editor restarted; your caret is at … | transition | low |
| CKE-B2-118 | B2 | Multi-root, decoupled, balloon or inline editor build | editing surface topology | no | Several editable regions, or a toolbar detached from the content | Each root gets its own `role="textbox"` + `aria-label` (per-root labels supported, `inlineeditableuiview.ts:86`). In a **decoupled** build the toolbar can be anywhere in the DOM, so Alt+F10 is the only reliable route to it and `aria-controls`/`aria-owns` back to the editable is not set | which editable region you are in, and where its toolbar is | **structural** (decoupled) | low |
| CKE-B2-119 | B2 | Editor finishes initialising over a `<textarea>` | editing surface | yes | The textarea is replaced by the rich editor | Silent. If focus was in the original textarea it is lost. `AriaLiveAnnouncer` deliberately primes its regions at `editor.once('ready')` (`arialiveannouncer.ts:60-67`), so the machinery is live from this moment — nothing uses it to announce the moment itself | the rich text editor is ready | transition | low |

### Feature coverage map

Every feature in the official CKEditor 5 feature catalogue, with where it lands in this corpus.
"Out of scope" means the feature does not create an editing scenario a conformance corpus can
assert against — it is recorded here so the omission is explicit rather than silent.

| Feature | Rows | Note |
|---|---|---|
| Autoformat | CKE-B1-001..022 | The canonical B1 source; 21 silent patterns |
| Text transformation | CKE-B1-023..033 | All silent |
| Auto link | CKE-B1-034..036 | Silent; strips trailing punctuation from the href |
| Auto image / auto media embed | CKE-B1-037..038 | Silent; inserts a non-text object from typed text |
| Bold / Italic / Underline / Strikethrough / Code / Subscript / Superscript | CKE-B2-001..010 | `command.value` reaches AT only via toolbar `aria-pressed` |
| Remove format | CKE-B2-011 | Silent |
| Headings | CKE-B1-007..012, CKE-B2-013 | `heading1` → `<h2>`; UI name and AX level disagree |
| Paragraph | CKE-B2-014 | — |
| Block quote | CKE-B1-013, CKE-B2-015..016, **CKE-BC-001..021** | 0 of 21 boundary vectors announced |
| Code block (+ language selection) | CKE-B1-014, CKE-B2-017..018, **CKE-BC-022..037** | The reference implementation; 14 of 16 vectors announced |
| Lists (bulleted, numbered) | CKE-B2-019..021, **CKE-BC-038..061** | 0 of 24 vectors announced |
| List properties (style, start, reversed) | CKE-B2-029..031, CKE-B3-034 | `start`/`reversed` are real attributes; `listStyle` is CSS-only |
| To-do lists | CKE-B1-005..006, CKE-B2-022..023, **CKE-BC-062..069** | Announced as a binary; checked state never spoken |
| Multi-level lists **[premium]** | CKE-B2-098 | INFERRED; suspected CSS-counter structural failure |
| Indent / indent block | CKE-B2-032..033, CKE-BC-057..058 | `indentBlock` is a `margin-left`: structural failure |
| Alignment | CKE-B2-034 | `text-align`: structural failure |
| Font family / size / colour / background | CKE-B2-035 | Presentational; structural failure by nature |
| Highlight | CKE-B2-036 | `<mark>` is real; the colour is not |
| Style | CKE-B2-037, CKE-B3-035 | Class-only in the document; the picker is well built |
| Text part language | CKE-B2-038 | Real `lang`/`dir` — the best-expressed formatting feature |
| Links (+ decorators) | CKE-B2-039..041, CKE-B3-014..019 | Balloon is unlabelled; the `<a>` itself is fine |
| Link on image | CKE-B2-096 | Widget label does not mention the link |
| Bookmark | CKE-B2-065 | Labelled widget |
| Tables (+ rows, columns, merge, properties, caption) | CKE-B2-042..054, CKE-B3-022, CKE-B3-036, **CKE-BC-070..085** | `<th>` and cell roles correct; table widget unlabelled; no cell exit affordance; multi-cell selection structurally absent |
| Images (upload, resize, caption, alt text, styles) | CKE-B2-055..062, CKE-B3-020..021, CKE-BC-086..090 | Upload is the only fully announced flow in the product |
| Media embed | CKE-B2-063, CKE-B1-038 | Labelled widget, silent insert |
| HTML embed | CKE-B2-066, CKE-BC-093 | Labelled widget; inner textarea naming INFERRED |
| General HTML Support | CKE-B2-092..093 | Data fidelity, not editing; can reintroduce unlabelled interactive markup |
| Horizontal line / page break | CKE-B1-015, CKE-B2-064 | Silent insert; page break carries literal text |
| Special characters | CKE-B3-027 | Proper dialog |
| Emoji (picker and `:` autocomplete) | CKE-B3-007..012 | Picker excellent; autocomplete inherits the mention void |
| Mentions | CKE-B3-001..006 | **Zero ARIA in the package** |
| Slash commands **[premium]** | CKE-B3-013 | INFERRED; built on the mention UI |
| Find and replace | CKE-B2-080..083, CKE-B3-024..026 | The "N of M" counter has no `aria-live` and no `role="status"` |
| Select all | CKE-B2-076 | Progressive; two presses do different things |
| Undo / redo | CKE-B2-072..073 | Silent, and relocates the caret |
| Clipboard / paste / paste-from-Office / Google Docs | CKE-B1-044, CKE-B2-074..075, CKE-B2-104 | Silent; content is normalised |
| Drag and drop | CKE-B2-090 | Mouse-only; no keyboard equivalent exists |
| Word count | CKE-B2-089 | No ARIA — correct not to announce, but also unqueryable |
| Autosave | CKE-B2-091 | Silent |
| Source editing | CKE-B2-084 | Textarea named, but with an untranslated hard-coded string |
| Enhanced source editing **[premium]** | CKE-B2-116 | INFERRED |
| Show blocks | CKE-B2-086 | Renders the structural information as a picture |
| Full screen | CKE-B2-085 | Large unannounced DOM re-parent |
| Minimap | CKE-B2-095 | `aria-hidden` iframe — correct |
| Restricted editing | CKE-B2-088, **CKE-BC-094..097** | Editability is not expressed in the DOM at all |
| Accessibility help dialog (Alt+0) | CKE-B3-028 | Best-in-class; a directory, not a runtime signal |
| Widgets, type-around, nested editables | CKE-B2-067..071, CKE-BC-086..093 | The fake-selection trick; the type-around fake caret is invisible |
| Toolbar / menu bar / dropdowns / dialogs / balloons | CKE-B3-029..038 | Chrome is good; `BalloonPanelView` has no role or label |
| Template **[premium]** | CKE-B2-099 | INFERRED |
| Document outline **[premium]** | CKE-B2-100 | INFERRED |
| Table of contents **[premium]** | CKE-B2-101 | INFERRED |
| Format painter **[premium]** | CKE-B2-102 | INFERRED; "armed mode" class |
| Case change **[premium]** | CKE-B2-103 | INFERRED |
| Track changes **[premium]** | CKE-B2-106..108 | INFERRED; no documented ARIA for suggestion ranges |
| Comments **[premium]** | CKE-B2-109..111 | INFERRED; `aria-details` is the obvious mechanism — check first |
| Revision history **[premium]** | CKE-B2-112 | INFERRED; diff colour-encoding suspected |
| Real-time collaboration presence **[premium]** | CKE-B2-113..114 | INFERRED; the "queryable, not announced" case |
| AI Assistant **[premium]** | CKE-B2-115 | INFERRED; streaming into contenteditable |
| Spelling & grammar (WProofreader, third-party) | CKE-B2-105 | INFERRED; the browser's native spellcheck is better exposed |
| CKBox / CKFinder / Easy Image / Cloud Services | CKE-B2-097 | Third-party UI outside CKEditor's dialog guarantees |
| Markdown (GFM) data processor | CKE-B2-094 | **Out of scope** — serialisation only, no editing behaviour |
| Watchdog | CKE-B2-117 | Silent editor restart; focus lost |
| Editor types (classic / inline / balloon / decoupled / multi-root) | CKE-B2-118 | Per-root labels supported; decoupled toolbars have no `aria-controls` |
| Editor initialisation | CKE-B2-119 | Silent; focus can be lost from the replaced textarea |
| Word/character limits, Autosave adapters, Cloud Services config, Watchdog config | — | **Out of scope** — integration configuration, not editing behaviour |
| Export to PDF/Word, Import from Word **[premium]** | — | **Out of scope** — a server round-trip, not an editing scenario. Worth a separate note only if the resulting document loses the semantics the editor got right |
| Pagination **[premium]** | — | **Out of scope for editing**, but flagged: page boundaries inserted into a continuous document are a visual-only structure of exactly the CKE-B2-086 kind |
| Productivity pack / Merge fields **[premium]** | — | **Not covered** — merge fields are inline placeholder objects and would need their own widget-label row; INFERRED, unverified |

---

## BC — Container boundary state transitions

**This is the deepest section of the corpus and the one the framework most under-specifies.**

Every block container is a *state the caret is inside or outside of*. The user must know
which — continuously, not once. The failure mode is not "one missing announcement"; it is that
a container has **many entry and exit vectors**, and an editor can handle one vector while
silently failing the other eleven. CKEditor demonstrates this exactly: for the code block it
handles every *boundary* vector correctly, because it hooked the right signal
(`model.document.selection.on('change:range')`, comparing `focus.parent`), and for the block
quote it handles *none*, because it never hooked anything.

The canonical trace, in CKEditor 5, with what is actually announced:

> Type `> ` + Space — **silent**, you are now in a quotation.
> Type, Enter, type, Enter — **silent**, still inside.
> Enter on the blank line — **silent**, you are now *outside*. Nothing distinguishes this
> Enter from the previous two.
> Arrow Up — **silent**, you are back inside.
> Arrow Up again — **silent**, you are outside again.
> Backspace from the paragraph below — **silent**, you are now editing *inside* the quote.
>
> Five boundary crossings, five silences, and the two Enter keystrokes that mean opposite
> things are indistinguishable.

Now the same trace for a code block: ` ``` ` → *"Entering code snippet"*; Enter, Enter, Enter
→ silent (correct — no boundary crossed); Enter again on the empty last line →
*"Leaving code snippet"*; Arrow Up → *"Entering code snippet"*; Arrow Up → *"Leaving code
snippet"*; Backspace from below → *"Entering code snippet"*. **Five crossings, five correct
announcements, from twelve lines of code** (`codeblockediting.ts:312-342`).

The delta between those two traces is the whole argument of this report. It is not a hard
problem, it is not an unsolved problem, and CKEditor has already solved it — twice, for two
of its roughly nine containers, by hand, in feature-local code that does not generalise.

**Legend for `currentSR` in this section:** *"boundary announced"* means the
`change:range` → `focus.parent` announcer is reached. *"silent"* means no announcement of any
kind; the browser may still report the new line's content, but nothing conveys that a
*container boundary* was crossed.

### BC-A — Block quote (`<blockquote>`) — 0 of 21 vectors announced

Source: `packages/ckeditor5-block-quote/src/blockquoteediting.ts`.

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-BC-001 | B1 | **Entry:** `>` + Space at block start | document structure | yes | Indent and a left rule appear | Silent | you are now inside a quotation | transition | high |
| CKE-BC-002 | B2 | **Entry:** toolbar / menu "Block quote" with a collapsed caret | document structure | yes | Same | Silent. `BlockQuoteCommand.value` becomes `true`; the toolbar button's `aria-pressed` flips on a control nobody is focused on | you are now inside a quotation | transition | medium |
| CKE-BC-003 | B2 | **Entry:** Arrow Down from the block above | selection/caret | no | The caret appears indented inside the rule | Silent. The browser reports the new line's *text*; nothing reports that the line is inside a `<blockquote>` unless the user's verbosity settings happen to announce container entry — which most default profiles do for lists and tables but **not** for blockquote | you entered a quotation | transition | high |
| CKE-BC-004 | B2 | **Entry:** Arrow Up from the block below → lands in the quote's **last** paragraph | selection/caret | no | Same | Silent | you entered a quotation, at its end | transition | high |
| CKE-BC-005 | B2 | **Entry:** Backspace at the start of the paragraph *following* the quote | document structure | yes | The paragraph slides up and indents; the rule now covers it | Silent — and this is the nastiest entry vector: the user was outside, pressed a deletion key, and is now *inside a container* with their text reformatted. No editor in the survey announces this | your paragraph moved into the quotation above | transition | medium |
| CKE-BC-006 | B2 | **Entry:** Delete at the end of the paragraph *preceding* the quote | document structure | yes | The quote's first paragraph joins the paragraph above, or the paragraph is drawn into the quote | Silent. **INFERRED** which of the two happens — it falls through to `model.deleteContent()` heuristics; no blockquote-specific handler exists for forward delete (only `direction != 'backward'` is filtered out at `blockquoteediting.ts:138`) | which side won, and whether you are now in or out of the quote | transition | medium |
| CKE-BC-007 | B2 | **Entry:** Paste multi-block content with the caret inside the quote | document structure | yes | Several paragraphs appear, all indented | Silent; and nothing says the pasted blocks were absorbed *into* the quote rather than placed after it | N blocks were pasted inside the quotation | transition | medium |
| CKE-BC-008 | B2 | **Entry:** Ctrl+Z restoring a deleted quote | document structure | yes | The quote reappears; the caret is restored inside it | Silent. `UndoCommand` restores the selection ranges from the batch, so the user is *relocated into a container* by an undo | the quotation was restored; you are inside it | transition | medium |
| CKE-BC-009 | B2 | **Inside:** Enter at the end of a non-empty paragraph inside the quote | document structure | yes | A new indented line | Silent (correct — no boundary crossed), but indistinguishable from CKE-BC-011 below, which *does* cross one | still inside the quotation, new paragraph | — | high |
| CKE-BC-010 | B2 | **Entry:** click inside the quote | selection/caret | no | Caret appears | Silent | you are in a quotation | transition | medium |
| CKE-BC-011 | B2 | **Exit:** Enter on an **empty** paragraph inside the quote | document structure | yes | The line un-indents; the rule stops above it | Silent. The escape hatch **does exist** — `blockquoteediting.ts:119-133` executes the `blockQuote` command when `positionParent.isEmpty`, unwrapping (and splitting the quote if mid-way). It is the single most important keystroke in the feature and it is indistinguishable from CKE-BC-009 | you left the quotation | transition | high |
| CKE-BC-012 | B2 | **Exit:** Backspace in the quote's **first** block when that block is empty | document structure | yes | The quote breaks; the line un-indents | Silent. `blockquoteediting.ts:137-151`, guarded on `positionParent.isEmpty && !positionParent.previousSibling` | you left the quotation | transition | medium |
| CKE-BC-013 | B2 | **Exit (or not):** Backspace at the start of the quote's first block when it is **not** empty | document structure | yes | The quote merges with whatever is above | Silent. **INFERRED** — the blockquote handler bails (its guard requires `isEmpty`), so this falls through to default delete; whether the caret ends inside or outside the quote depends on `deleteContent` | in or out, and what merged into what | transition | medium |
| CKE-BC-014 | B2 | **Exit:** Arrow Up past the quote's first block | selection/caret | no | The caret leaves the indented region | Silent | you left the quotation | transition | high |
| CKE-BC-015 | B2 | **Exit:** Arrow Down past the quote's last block | selection/caret | no | Same | Silent | you left the quotation | transition | high |
| CKE-BC-016 | B2 | **Exit:** toolbar "Block quote" toggle off | document structure | yes | Indent and rule vanish for the selected blocks | Silent | the quotation was removed | transition | medium |
| CKE-BC-017 | B2 | **Exit:** Ctrl+Z undoing the quote's creation | document structure | yes | Indent vanishes | Silent | the quotation was undone | transition | medium |
| CKE-BC-018 | B2 | **No exit:** the quote is the first element in the document and its first block is non-empty | — | — | Nothing; the user simply cannot get above it | No affordance exists. Block quote is *not* a widget, so `WidgetTypeAround`'s before/after fake caret does not apply, and `blockquoteediting` only unwraps on an *empty* block. The documented escape (`Enter` on an empty line) requires first creating that empty line **inside** the quote | a way to place the caret before this container | **structural** | low |
| CKE-BC-019 | B2 | **Nesting:** apply "Block quote" while already inside one | document structure (depth) | yes | The indent doubles | Silent. Nested `<blockquote>` elements are real, so the depth *is* in the AX tree and a screen reader that reports blockquote nesting will get it right on re-read — but the change is not signalled, and there is no `aria-level` equivalent for quotes as there is for lists | quotation depth is now 2 | transition | low |
| CKE-BC-020 | B2 | **Nesting:** a list inside a block quote; Tab inside that list | document structure (two depths) | yes | Two independent indents, visually similar | Silent, and now **two orthogonal depth counters** (quote nesting, `listIndent`) are changing under the user with one visual channel (left offset) representing both | list level 2, inside quotation depth 1 | transition | low |
| CKE-BC-021 | B2 | **Spanning selection:** Shift+Down from the quote's last block into the block below | selection | no | The highlight crosses the rule | Silent. `BlockQuoteCommand.value` goes `false` (the command reports `true` only when *every* selected block is in a quote), so the toolbar button un-presses — again, on an unfocused control | your selection now spans in and out of the quotation | transition | medium |

### BC-B — Code block (`<pre><code>`) — 14 of 16 vectors announced

Source: `packages/ckeditor5-code-block/src/codeblockediting.ts:312-342`,
`packages/ckeditor5-code-block/src/utils.ts:286-310`. **This is the reference implementation.**

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-BC-022 | B1 | **Entry:** ` ``` ` autoformat | document structure | yes | Monospace block with a language label | **Boundary announced** — "Entering %0 code snippet" (language name interpolated) | you are in a code block, language X | — | medium |
| CKE-BC-023 | B2 | **Entry:** toolbar / menu "Code block" | document structure | yes | Same | **Boundary announced** | as above | — | medium |
| CKE-BC-024 | B2 | **Entry:** Arrow Down in from the block above | selection/caret | no | Caret enters the monospace area | **Boundary announced** — because the hook is on selection movement, not on the command | you are in a code block, language X | — | medium |
| CKE-BC-025 | B2 | **Entry:** Arrow Up in from the block below | selection/caret | no | Same | **Boundary announced** | as above | — | medium |
| CKE-BC-026 | B2 | **Entry:** Backspace at the start of the block *after* a code block | document structure | yes | The paragraph is absorbed into the code | **Boundary announced** — the exact vector CKE-BC-005 misses for quotes | your text moved into the code block | — | low |
| CKE-BC-027 | B2 | **Entry:** paste landing inside | document structure | yes | Code appears | **Boundary announced** if the caret was not already inside; correctly silent if it was | — | — | low |
| CKE-BC-028 | B2 | **Entry:** Ctrl+Z restoring a deleted code block | document structure | yes | The block reappears with the caret inside | **Boundary announced** — undo relocating the caret into a container is handled for free, because the hook is on the selection | — | — | low |
| CKE-BC-029 | B2 | **Inside:** Enter (once) inside the block | document content | no | A new code line, auto-indented to match the previous line | Correctly silent — no boundary crossed. Note the auto-indentation is itself an unannounced B1-class insertion of whitespace | still in the code block | transition (minor) | high |
| CKE-BC-030 | B2 | **Exit:** Enter on an empty last line (i.e. Enter twice at the end) | document structure | yes | The caret drops below the block into a paragraph | **Boundary announced** — "Leaving %0 code snippet". `leaveBlockEndOnEnter` (`codeblockediting.ts:460+`) also cleans up the trailing blank lines | you left the code block | — | medium |
| CKE-BC-031 | B2 | **Exit:** Enter at the very start when the first line is empty | document structure | yes | A paragraph appears *above*; the caret moves into it | **Boundary announced.** This is the "escape upwards" affordance and it is the *only* one — if the first line is not empty (`isSoftBreakNode(nodeAfter)` fails, `codeblockediting.ts:411-417`) there is no way to place the caret above a code block that starts the document | you left the code block upwards | — | low |
| CKE-BC-032 | B2 | **Exit:** Arrow Up past the first line | selection/caret | no | Caret leaves the block | **Boundary announced** | you left the code block | — | medium |
| CKE-BC-033 | B2 | **Exit:** Arrow Down past the last line | selection/caret | no | Same | **Boundary announced** | as above | — | medium |
| CKE-BC-034 | B2 | **Exit:** Backspace at the very start of the block | document structure | yes | The code merges into the block above | **Boundary announced** (the selection ends up in the previous element) | you left the code block; the content merged | — | low |
| CKE-BC-035 | B2 | **Exit:** toolbar "Code block" toggle off | document structure | yes | Monospace reverts to body text | **Boundary announced** — the model element changes from `codeBlock` to `paragraph`, so `focus.parent` changes | the code block was removed | — | medium |
| CKE-BC-036 | B2 | **Stale state:** change the language from the block's dropdown | attribute | no | The label under the block changes | **Silent — the one hole in an otherwise complete implementation.** `focus.parent` is unchanged, so `change:range` never fires. The user was told "Entering JavaScript code snippet" and the block is now Python | the code block language is now Python | transition | low |
| CKE-BC-037 | B2 | **Nesting:** a code block inside a list item | document structure (depth) | yes | Monospace block, indented at list level | **INFERRED.** Autoformat explicitly refuses (`_addCodeBlockAutoformats` returns `false` when the parent is a `listItem`), but the toolbar command path is not similarly guarded in the source read. If it succeeds, the enter/leave announcement fires normally and the *list* level is not mentioned | you are in a code block, inside list item level 2 | transition | low |

### BC-C — List and list item — 0 of 24 vectors announced

Source: `packages/ckeditor5-list/src/list/listediting.ts:243-420`. Note that `outdentList` is
overloaded: at `listIndent: 0` it converts the item to a paragraph (**leaves the list**); at
`listIndent ≥ 1` it decreases the level (**stays in the list**). The same keystroke, the same
absence of feedback, two opposite outcomes.

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-BC-038 | B1 | **Entry:** `- ` / `1. ` autoformat | document structure | yes | A marker appears | Silent | a list started; item 1 of 1, level 1 | transition | high |
| CKE-BC-039 | B2 | **Entry:** toolbar "Bulleted/Numbered list" | document structure | yes | Markers appear on all selected blocks | Silent | a list of N items was created; you are in item M | transition | high |
| CKE-BC-040 | B2 | **Entry:** Arrow Down from the block above into item 1 | selection/caret | no | Caret indents next to a bullet | Silent from CKEditor — but **the platform partly covers this one**: `<ul>`/`<li>` are real, and most screen readers announce "list, N items, bullet, item 1" on entering a list in a document. This is the strongest counter-example to "editors must announce everything": where ARIA *has* the vocabulary, the AT already does the job | list, N items; item 1 of N | — (mostly passes, platform) | high |
| CKE-BC-041 | B2 | **Entry:** Arrow Up from below into the last item | selection/caret | no | Same | As above — platform-covered | item N of N | — (mostly passes, platform) | high |
| CKE-BC-042 | B2 | **Entry:** Backspace at the start of the paragraph *after* a list | document structure | yes | The paragraph joins the last list item | Silent. `mergeListItemBackward` — the user was outside a list and is now inside one, with their paragraph now a second block of somebody else's item | your paragraph merged into list item N | transition | medium |
| CKE-BC-043 | B2 | **Entry:** Delete at the end of the last list item | document structure | yes | The following paragraph is absorbed as a second block of that item | Silent. The *item* now has two blocks — a distinction with real navigation consequences (Enter behaves differently, CKE-BC-049/050) and no representation at all | the following paragraph became part of item N | transition | medium |
| CKE-BC-044 | B2 | **Entry:** paste multi-block content inside an item | document structure | yes | Several bullets appear | Silent | N items were pasted | transition | medium |
| CKE-BC-045 | B2 | **Entry:** Ctrl+Z restoring a deleted list | document structure | yes | The list reappears, caret inside | Silent | the list was restored; you are in item M | transition | medium |
| CKE-BC-046 | B2 | **Inside:** Enter at the end of a non-empty item | document structure | yes | A new marker appears | Silent (the ordinal is never spoken). Indistinguishable from CKE-BC-047, which exits the list | new item, N of M | transition | high |
| CKE-BC-047 | B2 | **Exit:** Enter on an empty item at level 1 | document structure | yes | The marker vanishes; the line un-indents | Silent. `outdentList` (`listediting.ts:352-356`) | you left the list | transition | high |
| CKE-BC-048 | B2 | **Not an exit:** Enter on an empty item at level ≥ 2 | document structure (depth) | yes | The marker moves left one step but is still a marker | Silent — **and this is the row that proves the point.** The identical keystroke in an identical-looking situation either leaves the container or merely changes its depth, depending on a number the user has no way to know. A sighted user sees the bullet is still there; a blind user does not | still in the list, level decreased to 1 | transition | high |
| CKE-BC-049 | B2 | **Not an exit:** Enter on an empty **first** block of a multi-block item | document structure | yes | The item splits below the caret | Silent. `splitListItemAfter` (`listediting.ts:360-364`) | the item split; you are still in the list | transition | low |
| CKE-BC-050 | B2 | **Not an exit:** Enter on an empty **last** block of a multi-block item | document structure | yes | The item splits above the caret | Silent. `splitListItemBefore` (`listediting.ts:368-372`) | as above | transition | low |
| CKE-BC-051 | B2 | **Exit:** Backspace at the start of the first item at level 1 | document structure | yes | The marker vanishes | Silent. `listediting.ts:284-290` runs `splitListItemAfter` first if the item has more blocks, then `outdentList` — two structural operations from one Backspace | you left the list | transition | high |
| CKE-BC-052 | B2 | **Not an exit:** Backspace at the start of any later item | document structure | yes | The item merges into the one above | Silent. `mergeListItemBackward`. Same key, different outcome from CKE-BC-051 | your item merged into item N−1 | transition | high |
| CKE-BC-053 | B2 | **Exit:** Arrow Up past item 1 | selection/caret | no | Caret leaves the indented region | Silent from CKEditor; platform-covered on most AT ("out of list") | you left the list | — (mostly passes, platform) | high |
| CKE-BC-054 | B2 | **Exit:** Arrow Down past the last item | selection/caret | no | Same | As above | you left the list | — (mostly passes, platform) | high |
| CKE-BC-055 | B2 | **Exit:** toolbar list toggle off | document structure | yes | Markers vanish from all selected items | Silent | the list was removed; N paragraphs | transition | high |
| CKE-BC-056 | B2 | **Exit:** Ctrl+Z undoing list creation | document structure | yes | Markers vanish | Silent | — | transition | medium |
| CKE-BC-057 | B2 | **Nesting:** Tab | document structure (depth) | yes | The marker indents and its glyph changes | Silent. The result is a genuinely nested `<ul>`, so `aria-level` / "level 2" is available *on re-read*. The transition is not | level increased to 2 | transition | high |
| CKE-BC-058 | B2 | **Nesting:** Shift+Tab | document structure (depth) | yes | The marker outdents | Silent. At level 1 the `outdent` MultiCommand may instead fall through to `outdentBlock`, changing a `margin-left` — a completely different, presentation-only operation with the same keystroke and the same silence (`listediting.ts:209-212`) | level decreased to 1 / block indent decreased | transition | high |
| CKE-BC-059 | B2 | **Nesting:** a list inside a block quote, Tab | document structure (two depths) | yes | One visual indent, two model depths | Silent; see CKE-BC-020 | list level 2, inside a quotation | transition | low |
| CKE-BC-060 | B2 | **Nesting:** an ordered list nested inside a bulleted list | document structure | yes | Numbering restarts at 1 inside the bullets | Silent. The nested `<ol>` is real so the numbering is recoverable by navigation | ordered sub-list, item 1, level 2 | transition | low |
| CKE-BC-061 | B2 | **Spanning selection:** Shift+Down from the last item into the paragraph below | selection | no | The highlight crosses the list edge | Silent. `ListCommand.value` flips to `false` and the toolbar button un-presses | your selection now spans in and out of the list | transition | medium |

### BC-D — To-do list item — announced, but only as a binary

Source: `packages/ckeditor5-list/src/todolist/todolistediting.ts:380-405`. Same
`change:range` mechanism as the code block, applied to a boolean predicate
(`isTodoListItemElement`).

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-BC-062 | B2 | **Entry** by any vector (autoformat, toolbar, arrow in, Backspace merge, paste, undo) | document structure or caret | varies | A checkbox line | **Boundary announced** — "Entering a to-do list". All entry vectors are covered, because the hook is on the selection | you are in a to-do list, item N, unchecked | — (partial) | medium |
| CKE-BC-063 | B2 | **Exit** by any vector | document structure or caret | varies | Checkboxes end | **Boundary announced** — "Leaving a to-do list" | you left the to-do list | — (partial) | medium |
| CKE-BC-064 | B2 | Move between two to-do items | selection/caret | no | The caret moves down a line | Correctly silent (neither branch of the `if` matches) | item N of M, checked/unchecked | transition | high |
| CKE-BC-065 | B2 | Move from a to-do item into an adjacent **bulleted** list item | selection/caret | no | The checkbox is replaced by a bullet | **"Leaving a to-do list" and then nothing.** The predicate is binary — it knows what you left, never what you entered. You are told you left a container and not what container you are in now | you left the to-do list and entered a bulleted list | transition | low |
| CKE-BC-066 | B2 | Enter a to-do list whose first item is **checked** | selection/caret | no | A ticked checkbox | "Entering a to-do list" — the checked state is not part of the string, and the `<input type="checkbox">` is `tabindex="-1"` inside a `contenteditable="false"` span, so it is not focusable either | to-do list; item 1, checked | transition | medium |
| CKE-BC-067 | B2 | Enter on an empty to-do item | document structure | yes | The checkbox vanishes | `outdentList`; the announcement fires **only if** the resulting parent is not a to-do item, which is the correct behaviour and comes free from the predicate | you left the to-do list / level decreased | — (partial) | medium |
| CKE-BC-068 | B2 | Tab / Shift+Tab inside a to-do list | document structure (depth) | yes | The item indents | Correctly silent for the container, but therefore **the depth change is silent too** — the boundary announcer is the only signal this feature has, and depth is not a boundary | level increased to 2 | transition | medium |
| CKE-BC-069 | B2 | Any of the above | — | — | — | The announcement is a bare container name — no position, no count, no depth, no checked state. It is a *notification that a boundary was crossed*, not a description of where you are | the full arrival state | transition | medium |

### BC-E — Table and table cell — 0 of 16 vectors announced, and no exit affordance

Source: `packages/ckeditor5-table/src/tablekeyboard.ts:195-345`,
`packages/ckeditor5-widget/src/widget.ts:232-275`.

Note the structural oddity: **a table cell cannot be exited by Enter at all**, and arrowing
past the table's outer edge does not leave the table — it *selects the table widget*, an
intermediate state which (because `toTableWidget()` passes no label) announces a non-breaking
space.

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-BC-070 | B2 | **Entry:** `insertTable` | document structure | yes | A grid appears; caret blinks in cell 1 | Silent for the creation. The `<table>`/`<tr>`/`<td>` roles are real, so on re-read the AT reports the grid correctly | a 3×4 table was created; row 1, column 1 | transition | medium |
| CKE-BC-071 | B2 | **Entry, step 1:** Arrow Down from the block above a table | selection | no | The whole table gets a blue outline | Silent **and misleading**: the widget fake-selection container is filled with ` ` because the table has no label (`downcast.ts:249` → `renderer.ts:1062`). The user's Down arrow appears to have done nothing | the whole table is selected, 3 columns by 4 rows | **structural** | high |
| CKE-BC-072 | B2 | **Entry, step 2:** Arrow Down again | selection/caret | no | The caret appears in cell 1 | Silent from CKEditor; the browser reports entering a `<td>`, and most AT will announce "row 1, column 1" from the native table semantics | row 1, column 1 | — (mostly passes, platform) | high |
| CKE-BC-073 | B2 | **Entry:** Tab from the previous cell | selection/caret | no | Caret jumps a cell | Platform-covered (native `<td>` traversal). Registered in the help dialog (`tablekeyboard.ts:89`) | row R, column C | — (passes, platform) | high |
| CKE-BC-074 | B2 | **Entry:** click into a cell | selection/caret | no | Caret appears | Platform-covered | row R, column C | — (passes, platform) | medium |
| CKE-BC-075 | B2 | **Entry:** paste landing in a cell | document structure | yes | Content fills the cell | Silent; pasting a *table* into a cell nests one (CKE-BC-084) | N blocks pasted into row R, column C | transition | low |
| CKE-BC-076 | B2 | **Non-exit:** Enter inside a cell | document structure | yes | A second line inside the same cell | Silent. **There is no Enter-on-empty escape hatch for a table cell — at any depth, ever.** Every other container in CKEditor has one; the cell has none, because a cell is a `$block`-limit nested editable rather than a `$container` | still in row R, column C | transition | high |
| CKE-BC-077 | B2 | **Exit:** Esc | selection | no | The caret vanishes; the table outlines | Silent, lands on the unlabelled table widget. The keystroke *is* registered — "Move focus from an editable area back to the parent widget" (`widget.ts:249-256`) — so it is discoverable in the Alt+0 dialog and inaudible when used | you left the cell; the whole table is selected | **structural** | medium |
| CKE-BC-078 | B2 | **Exit attempt:** Arrow Up from a cell in row 1 | selection | no | The whole table outlines | Silent (nbsp). `_navigateFromCellInDirection` detects `isOutsideVertically` and does `writer.setSelection(writer.createRangeOn(table))` (`tablekeyboard.ts:329-336`) — it selects the table rather than exiting it | the whole table is selected; press Up again to leave | **structural** | high |
| CKE-BC-079 | B2 | **Exit attempt:** Arrow Down from a cell in the last row | selection | no | Same | Same — silent, selects the table | as above | **structural** | high |
| CKE-BC-080 | B2 | **Exit attempt:** Arrow Left from the first cell / Right from the last cell | selection | no | Same | Same (`isBeforeFirstCell` / `isAfterLastCell`) | as above | **structural** | medium |
| CKE-BC-081 | B2 | **Non-exit:** Tab in the last cell | document structure | yes | A brand-new row appears | Silent. The user pressed a *navigation* key and performed a *structural insertion*; there is no way to Tab out of a table | a new row was created; row R+1, column 1 | transition | high |
| CKE-BC-082 | B2 | **Non-exit:** Backspace at the start of the first paragraph in a cell | — | no | Nothing happens | Silent — a no-op is indistinguishable from a silent success, which is its own failure mode | nothing happened | transition | medium |
| CKE-BC-083 | B2 | **Forced exit:** delete the row or column containing the caret | document structure | yes | Content vanishes; the caret jumps to a neighbouring cell | Silent. Destructive relocation with no report of the new position | the row was deleted; you are now in row R, column C | transition | medium |
| CKE-BC-084 | B2 | **Nesting:** a table inside a table cell | document structure (depth) | yes | A grid inside a grid | Silent. Native `<table>` nesting means the AT can report it on re-read, but the depth change on entry is not signalled, and Esc now pops out one level at a time with no indication of which level you reached | nested table, depth 2 | transition | low |
| CKE-BC-085 | B2 | **Spanning selection:** Shift+Arrow across cells | selection | no | A block of cells shades blue | **Structurally absent.** CKEditor's multi-cell selection is a model marker plus CSS classes — there is *no DOM selection covering the cells*, so the browser reports the caret still sitting in one cell. The AT's own "selected" reporting is not merely silent, it is **wrong** | 6 cells selected, rows 1–2, columns 1–3 | **structural** | medium |

### BC-F — Nested editables: captions and embeds

Source: `packages/ckeditor5-widget/src/utils.ts:283-330`,
`packages/ckeditor5-image/src/imagecaption/imagecaptionediting.ts:126-145`,
`packages/ckeditor5-table/src/tablecaption/tablecaptionediting.ts:126`.

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-BC-086 | B2 | **Entry:** "Toggle caption" on a selected image | document structure | yes | A caption field appears under the image; the caret moves into it | Silent for the transition, but the target is properly named: `role="textbox"` + `aria-label="Caption for image: <alt>"`. On the *next* AT read the user is correctly oriented | you are in the image caption | transition | medium |
| CKE-BC-087 | B2 | **Entry:** Arrow Down from a selected image into its caption | selection/caret | no | The caret appears in the caption | Silent; the labelled `role="textbox"` is again the recovery path | you are in the image caption | transition | medium |
| CKE-BC-088 | B2 | **Exit:** Esc from an image caption | selection | no | The caption loses focus; the image outlines | Silent as a transition, but the destination *is* announced — the widget fake selection reads `"<alt> image widget"` (CKE-B2-067). **This is the only container exit in the whole product whose destination is spoken**, and it happens by the fake-selection accident rather than by design | you left the caption; the image is selected | — (passes, incidentally) | medium |
| CKE-BC-089 | B2 | **Exit:** Arrow Down past the end of a caption | selection/caret | no | Caret moves below the figure | Silent | you left the caption | transition | medium |
| CKE-BC-090 | B2 | **Non-exit:** Enter inside a caption | — | no | **INFERRED** — the caption is a `$block`-limit editable, so Enter is expected to be a no-op or a soft break rather than creating a paragraph | Silent either way; a no-op indistinguishable from a success | nothing happened / soft break | transition | low |
| CKE-BC-091 | B2 | **Entry:** "Toggle caption" on a table | document structure | yes | A caption field appears above the table | Silent, **and the destination is unnamed**: `toWidgetEditable(captionElement, writer)` is called with no `label` (`tablecaptionediting.ts:126`), producing `role="textbox"` with **no accessible name** — a bare WCAG 4.1.2 failure, and a direct inconsistency with the image caption two files away | you are in the table caption | **both** | low |
| CKE-BC-092 | B2 | **Exit:** Esc from a table caption | selection | no | The table outlines | Silent, and the destination announces a non-breaking space (CKE-BC-071) | you left the caption; the table is selected | **structural** | low |
| CKE-BC-093 | B2 | **Entry/exit:** the HTML embed raw-source editing area | editing mode inside a widget | yes | A textarea replaces the preview inside the widget | Silent. The widget label is "HTML snippet" (`htmlembedediting.ts:256`); the inner textarea's naming is **INFERRED** (not confirmed from the source read) | you are editing raw HTML inside an embed | transition | low |

### BC-G — Restricted editing regions (a container with no container)

Source: `packages/ckeditor5-restricted-editing/src/restrictededitingmodeediting.ts:278-350,
445-506`.

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-BC-094 | B2 | Tab / Shift+Tab → next / previous editable region | selection/caret | no | The caret jumps; the region has a dashed outline | Silent. The keystrokes are registered as "Next/Previous editable region" (`restrictededitingmodeui.ts:171-172`) | you are in editable region N of M | transition | low |
| CKE-BC-095 | B2 | Arrow the caret **out** of an exception region | permission state | no | The dashed outline is behind you | Silent, and the consequence is severe: `_disableCommands()` runs, so typing and every command silently stop working (`restrictededitingmodeediting.ts:466`). The user presses keys and nothing happens, with no explanation | this region is read-only | **structural** | low |
| CKE-BC-096 | B2 | Arrow the caret **into** an exception region | permission state | no | The outline surrounds the caret | Silent; `_enableCommands(marker)` restores typing | this region is editable | **structural** | low |
| CKE-BC-097 | B2 | Any caret motion in restricted mode | permission state | no | Dashed outlines mark the editable islands | **There is no DOM or ARIA distinction whatsoever** between editable and locked regions — the exceptions are `<span class="restricted-editing-exception">`, and the root stays uniformly `contenteditable="true"` with enforcement done by disabling commands. `aria-readonly` on the locked ranges, or `contenteditable="false"`, would express this natively | which parts of this document you may edit | **structural** | low |

### BC-H — Containers CKEditor 5 does not have

Recorded so the corpus is comparable against editors that do have them. Absence is not a
pass — for a conformance corpus it is a coverage note.

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| CKE-BC-098 | B2 | `<details>` / `<summary>` collapsible | — | — | — | **No feature exists** in the open-source packages or the documented premium set. General HTML Support lists `details`/`summary` in `schemadefinitions.ts`, so the markup round-trips, but it is carried either as a plain block or as an "HTML object" widget (`html-support/src/converters.ts:91`) with no expand/collapse affordance and no `aria-expanded`. The container-state problem does not arise because the container is not editable as one | n/a — feature absent | n/a | n/a |
| CKE-BC-099 | B2 | Callout / admonition / note box | — | — | — | **No feature exists.** The premium *Template* feature can insert arbitrary markup that *looks* like a callout, but it produces no container semantics, no role, and no boundary behaviour of its own. **INFERRED** — premium source not read | n/a — feature absent | n/a | n/a |
| CKE-BC-100 | B2 | Footnote / aside / sidenote | — | — | — | **No feature exists** in either set | n/a — feature absent | n/a | n/a |

### What the BC section shows

Across 100 boundary vectors on nine container kinds:

| Container | Vectors | Boundary announced | Notes |
|---|---|---|---|
| Code block | 16 | **14** | Reference implementation; the two misses are the language change and a nesting case |
| To-do list item | 8 | **6** | Same mechanism, binary predicate — knows what you left, not what you entered |
| Block quote | 21 | 0 | Escape hatch exists and is indistinguishable from the keystroke that does not use it |
| List / list item | 24 | 0 | Platform partly rescues arrow entry/exit; `outdentList`'s dual meaning is the sharpest case |
| Table / cell | 16 | 0 | No Enter escape at all; arrowing out selects an unlabelled widget; multi-cell selection is structurally invisible |
| Nested editables | 8 | 1 | Image-caption Esc, announced only by the fake-selection accident |
| Restricted editing | 4 | 0 | Editability itself is not expressed in the DOM |
| Absent containers | 3 | n/a | details / callout / footnote do not exist |

**Two of nine containers are done, and they are done by the same twelve lines of code**, copied
between two packages, hooked on `model.document.selection.on('change:range')` and comparing
`focus.parent` to the previous one. That listener is container-agnostic. Nothing about it is
specific to code blocks or to-do lists. Hoisting it into the engine — "on every selection
change, diff the ancestor chain and report the containers entered and left" — would cover all
nine containers and every one of the entry and exit vectors above, because every vector
ultimately moves the selection.

That CKEditor has not done this is the observation the framework needs: **the announcement is
cheap and the vocabulary is what is missing.** Even with the listener hoisted, the output is
still an English sentence squeezed through `announce(string)`. There is no way to say
*"entered: blockquote, depth 2"* as data — no typed event, no `aria-*` for a transition, no
per-user verbosity control, no braille-appropriate rendering, no way for the user to ask again
later. The delta between CKEditor's code block and CKEditor's block quote is an
implementation gap. The delta between CKEditor's code block and what a screen-reader user
actually needs is the **platform** gap.

---

## What CKEditor 5 already does — the precise account

This section is the point of the report. CKEditor is the strongest performer in the survey, so
what it does is the empirical definition of "good", and where it stops is the empirical
definition of the gap.

### 1. `AriaLiveAnnouncer` — a live-region abstraction done right

`packages/ckeditor5-ui/src/arialiveannouncer.ts` is a genuinely well-built piece of
infrastructure, and it solves several of the framework's own failure modes by construction:

- **F4 (region created in the same update as its content) is designed out.** The announcer
  subscribes to `editor.once('ready')` and immediately calls `announce('', politeness)` for
  every politeness level, so both regions exist and are being observed *before* any feature
  writes to them (`arialiveannouncer.ts:60-67`). The comment is explicit: *"Some screen readers
  only look at changes in the aria-live region. They might not read a region that already has
  content when it is added."*
- **F5 (announcement storms clobbering each other) is designed out**, and in exactly the way
  this project's own engineering rules prescribe: each announcement becomes its **own `<li>`**
  appended to a `<ul>` inside the region, with `aria-relevant="additions"`
  (`arialiveannouncer.ts:155-215`). Nothing races for one text slot, so nothing is lost to
  overwrite. Old entries are pruned by a 5-second interval — that is garbage collection, not
  synchronisation.
- **Two politeness levels** are supported (`polite`, `assertive`), and an `isUnsafeHTML` escape
  hatch routes through the editor's own sanitising DOM converter.

The API is one line for a feature author: `editor.ui.ariaLiveAnnouncer.announce('…')`.

**And almost nobody calls it.** The complete list of call sites in the open-source repo:

| Feature | Announcement | Source |
|---|---|---|
| Code block, caret enters | "Entering code snippet" / "Entering %0 code snippet" (language-aware) | `ckeditor5-code-block/src/codeblockediting.ts:337`, string built in `utils.ts:286` |
| Code block, caret leaves | "Leaving code snippet" / "Leaving %0 code snippet" | `codeblockediting.ts:333` |
| To-do list, caret enters | "Entering a to-do list" | `ckeditor5-list/src/todolist/todolistediting.ts:400` |
| To-do list, caret leaves | "Leaving a to-do list" | `todolistediting.ts:398` |
| (legacy to-do list, deprecated) | same two strings | `legacytodolistediting.ts:244,246` |
| Image upload starts | "Uploading image" | `ckeditor5-image/src/imageupload/imageuploadediting.ts:407` |
| Image upload succeeds | "Image upload complete" | `imageuploadediting.ts:458` |
| Image upload fails | "Error during image upload" | `imageuploadediting.ts:469` |

That is the entire set. `grep -rn "aria-live" packages/*/src` outside `arialiveannouncer.ts`
returns **nothing**.

Note the shape of the two content-level announcements: both are **boundary crossings driven by
`model.document.selection.on('change:range')`**, not by the command that caused them. That is a
smart design — it fires whether the user got there by typing ` ``` `, by clicking the toolbar
button, or by arrowing in from the paragraph above, and it fires exactly once per crossing
because of the `lastFocusedCodeBlock === focusParent` guard. It is, in miniature, a correct
implementation of *"you have entered a container of type X"* — the transition vocabulary ARIA
does not have. CKEditor built it twice, by hand, for two containers, and stopped.

### 2. The widget fake-selection trick — announcing without a live region

The most interesting mechanism in the codebase, and the one worth taking to the ARIA WG as
evidence, is how CKEditor makes a selected **widget** (image, media, page break, horizontal
rule, bookmark, HTML embed) audible:

1. `toWidget()` stores a `widgetLabel` custom property on the view element — *not* a DOM
   attribute (`ckeditor5-widget/src/utils.ts:136-139`).
2. When the model selection lands on a widget, `Widget` sets a **fake view selection** carrying
   that label (`ckeditor5-widget/src/widget.ts:149-151`).
3. The renderer materialises the fake selection as an off-screen
   `div.ck-fake-selection-container` (`position:fixed; left:-9999px`), writes the label into it
   as text, and then **moves the real DOM selection onto that text**
   (`ckeditor5-engine/src/view/renderer.ts:1042-1076, 1376-1393`).

The screen reader is not being *told* anything. It is reading a selection, as it always does —
CKEditor just arranged for the selection to contain a sentence. Selecting an image announces
`"<alt text> image widget"`, because the image label is a closure that prepends the current
`alt` (`ckeditor5-image/src/imageutils.ts:258-268`).

This is a workaround with real costs — the label is a hard-coded English-ish string funnelled
through `t()`, there is no role, no state, and no way for the user to ask for more — but it
demonstrates the shape of what is missing: **a typed "the selection now covers a non-text
object of kind K named N" event.** CKEditor had to smuggle that through the text channel.

Two widgets are missing labels and therefore break the trick:

- **Tables.** `toTableWidget()` calls `toWidget(viewElement, writer, { hasSelectionHandle: true })`
  with **no `label`** (`ckeditor5-table/src/converters/downcast.ts:249`). `getLabel()` returns
  `''`, so `renderer.ts:1062` falls back to `' '` and selecting a whole table announces a
  non-breaking space. (CKE-B2-054, CKE-B2-068.)
- **Table captions.** `toWidgetEditable(captionElement, writer)` is called with no `label`
  (`ckeditor5-table/src/tablecaption/tablecaptionediting.ts:126`), so the caption editable gets
  `role="textbox"` with no accessible name — whereas the *image* caption is correctly named
  `"Caption for image: <alt>"` (`ckeditor5-image/src/imagecaption/imagecaptionediting.ts:140-142`).

Both look like straightforward bugs rather than design decisions, and both are worth filing.

### 3. The keystroke registry and the accessibility help dialog

`packages/ckeditor5-core/src/accessibility.ts` is a first-class, structured, localisable
registry of keystrokes: `addKeystrokeInfoCategory`, `addKeystrokeInfoGroup`,
`addKeystrokeInfos`. Plugins populate it as they load, so the Alt+0 dialog reflects the
*actual configured plugin set*, not a static help page. Contributors: Autoformat ("Revert
autoformatting action / Backspace"), Bold, Italic, Underline, Strikethrough, Code ("Move out of
an inline code style", with the two-press arrow notation), Clipboard, Enter, ShiftEnter,
SelectAll, Link, Find&Replace, Fullscreen, List ("Increase/Decrease list item indent"), Table
(four cell-navigation entries).

This is the right pattern and no other editor in the survey has it. Its limit is that it is a
**directory, not a runtime signal**: it tells you Backspace reverts an autoformat, but pressing
Backspace still announces nothing. It answers *"what can I press?"*, never *"what just
happened?"*.

Gaps in the registry itself worth noting: **Ctrl+Enter to check a to-do item is not registered**
(the list package registers only Tab and Shift+Tab, `listediting.ts:702`), and neither is any
widget type-around keystroke.

### 4. Structural conversion — where CKEditor genuinely passes

CKEditor's editing view is real HTML, and the model→view downcast produces semantics rather
than divs-with-classes. The framework's "structural failure" column is therefore mostly clean:

- Headings are real `<h2>`–`<h6>`; lists are real nested `<ul>`/`<ol>`/`<li>` (so `aria-level`
  and set-size come free); quotes are `<blockquote>`; code is `<pre><code>`; highlight is
  `<mark>`; links are `<a href>`.
- Ordered-list properties survive into the DOM: `start` and `reversed` are set as real
  attributes on the `<ol>` (`listpropertiesediting.ts:387,419-421`).
- Table headers are re-downcast as `<th>` rather than styled `<td>`
  (`ckeditor5-table/src/converters/downcast.ts:140-166`).
- Table cells keep their native `cell` role: `toWidgetEditable(..., { withAriaRole: false })`
  (`downcast.ts:177`) suppresses the `role="textbox"` that CKEditor otherwise stamps on nested
  editables — a recent and correct fix.
- Text-part language writes real `lang`/`dir`, which is the one formatting feature whose state
  a screen reader acts on natively (voice switching).
- The editing root is `role="textbox"` with `aria-label` "Rich Text Editor. Editing area: %0",
  overridable per root (`ckeditor5-ui/src/editableui/inline/inlineeditableuiview.ts:50,67,86`).
- Nested editables (image captions) get `role="textbox"` plus `aria-label`
  (`ckeditor5-widget/src/utils.ts:283-310`).

The structural exceptions are the presentational features, where there is simply nothing to
express: list marker style, block indent (`margin-left`), alignment (`text-align`), font
size/family/colour, image resize percentage, and multi-cell table selection. These are marked
`failureClass: structural` in the tables. They are a different, older problem —
"presentation has no accessible equivalent" — and are not the transition gap.

### 5. UI chrome — good; contextual balloons — not

Anything CKEditor renders as a focusable UI view is properly marked up: `role="toolbar"` with a
label, roving tabindex, `aria-haspopup`/`aria-expanded` on every dropdown button
(`ui/dropdown/button/dropdownbuttonview.ts:52-53`), `role="dialog"` + `aria-label` on
`DialogView` (`ui/dialog/dialogview.ts:287-288`), `role="menu"`/`menuitemradio`/`menuitemcheckbox`
in menus, `aria-describedby` wiring for field error text (`ui/input/inputbase.ts:80`),
`role="tablist"`/`tab`/`tabpanel`/`grid` in the emoji picker, and a deliberate decision to hide
the purely decorative style-preview string from AT (`style/ui/stylegridbuttonview.ts:74`).

The exception is `BalloonPanelView`. It has **no `role` and no `aria-label`** — the whole
contextual-UI layer (link balloon, table toolbar, image toolbar, mention panel, find panel)
floats in an anonymous `<div>`. When `ContextualBalloon` swaps one view for another inside the
same panel, nothing marks the change.

---

## Where CKEditor stops

Five statements, each verifiable from the source above.

**1. Nothing that changes the *document* announces, except entering a code block or a to-do
list.** Not one of the 45 B1 rows for autoformat and text transformation reaches the announcer.
The plugin that is *specifically about the editor rewriting the user's text without being asked*
— `Autoformat` — has zero announcement calls, and the plugin that changes characters under the
caret — `TextTransformation` — has zero. Both were built years before `AriaLiveAnnouncer`
existed, and nobody went back.

**2. `command.value` has exactly one route to assistive technology, and it is the wrong end of
the app.** `view.bind('isOn').to(command, 'value')` → `aria-pressed` / `aria-checked` on a
button (`basic-styles/src/utils.ts:41`, `ui/button/buttonview.ts:268-269,294-315`). Nothing
maps `command.value` onto the editing region, the selection, or an announcement. So:

- Ctrl+B **with a selection**: the document changes, `value` flips, the unfocused toolbar
  button's `aria-pressed` changes, and the user — whose caret is in the document — hears
  nothing. (CKE-B2-001.)
- Ctrl+B **with a collapsed caret**: nothing in the document changes at all. The state lives on
  `ModelDocumentSelection`'s attribute set. There is no element, no attribute, no node — nothing
  for an AT to inspect even if the user went looking. (CKE-B2-002.) This is the framework's C2
  and it is the cleanest example in the whole survey of a state ARIA cannot express.
- Moving the caret into bold text refreshes `value` and silently re-paints a button the user
  cannot see. (CKE-B2-012.)

The asymmetry is the finding: **CKEditor knows the answer to "is bold on?" at all times, in an
observable, typed, localisable form, and the only way a screen-reader user can get it is to
leave the text they are editing and go press Alt+F10.**

**3. Search results are visual-only.** The "3 of 50" counter is a `<span>` with no `aria-live`,
no `role="status"`, and no `aria-describedby` from the input it sits inside
(`find-and-replace/src/ui/findandreplaceformview.ts:481-506`). Match count, current match index,
and "replaced N occurrences" are all unreachable.

**4. The mention/autocomplete panel is invisible to AT — completely.** `grep -rn "aria\|role"
packages/ckeditor5-mention/src` returns **no matches**. There is no combobox role on the
editable, no `aria-expanded`, no `aria-controls`, no `aria-activedescendant`; item highlight is
`classList.add('ck-on')` (`ui/domwrapperview.ts:50-58`); focus never leaves the document. A
screen-reader user typing `@ba` gets a panel they cannot perceive, arrow keys that appear to do
nothing, and an Enter key that has silently changed meaning. Emoji autocomplete (`:`) and,
almost certainly, premium Slash Commands (`/`) are the same UI and inherit all of it.

**5. There is no mechanism for "you are now in a mode".** The widget type-around fake caret
(CKE-B2-069) is the sharpest case: after one arrow press the user is in a state where typing
creates a new paragraph rather than editing the widget, and that state exists **only as a CSS
class**, with the visible affordances explicitly `aria-hidden="true"`
(`widgettypearound.ts:929`). Autoformat and autocorrect being silently disabled inside code
(CKE-B1-042) is the same shape.

**6. Container membership is announced for two containers out of nine, by the same twelve lines
copied twice.** See [BC](#bc--container-boundary-state-transitions) for all 100 vectors. The
short form: the code block announces every entry and exit vector correctly — autoformat,
toolbar, arrow in from above or below, Backspace merging you in, undo relocating you in, Enter
out, arrow out, Backspace out, toggle out — because it hooks
`model.document.selection.on('change:range')` and diffs `focus.parent`
(`codeblockediting.ts:312-342`). The to-do list does the same with a binary predicate. The block
quote, every list, every table cell, every nested editable and every restricted-editing region
do none of it. The listener is container-agnostic; nothing about it is specific to code. Hoisting
it into the engine would cover all nine containers and every vector, because every vector
ultimately moves the selection — and it would *still* leave the semantics problem untouched,
since `announce()` takes a `string`.

### The layer-3/layer-4 reading

Mapped onto the framework's layers, CKEditor's leftovers are unusually clean data, because it
has already built the layer-1 (DOM/ARIA) half properly. What remains at layer 3 is almost
purely **transition**, and it clusters into four types:

| Type | Instances | Example |
|---|---|---|
| *You entered / left a container* | ~100 rows (the whole BC section) | code block (solved), quote, list, cell, caption, restricted region |
| *The application rewrote your text* | ~32 B1 rows | `...` → `…`; `**x**` → bold |
| *A structural depth changed* | ~12 rows | Tab in a list; nested quote; nested table |
| *A pending style changed for future input* | ~8 rows | Ctrl+B on a collapsed caret |
| *A result set or progress count changed* | ~6 rows | "3 of 50"; upload progress (solved) |
| *You are now in a mode* | ~6 rows | type-around caret; track-changes mode; format painter |

CKEditor has hand-built two instances from type 1 (container enter/leave, for two of nine
container kinds) and one from type 5 (upload). All three are individually good and none
generalises, because there is nothing to generalise *into*: the announcer takes a `string`.
An editor with a first-class live-region abstraction, a first-class keystroke registry, a
first-class command model exposing `value`/`isEnabled`, and a rich typed model of its own
document still cannot express "you just entered a level-2 list item" as anything but English
prose — which is exactly the argument the gap analysis makes.

---

## The five worst scenarios

Ranked by (frequency × severity × how far the user is from recovering the information by other
means).

**1. CKE-BC-001..021 — every block-quote boundary vector, and the boundary class generally.**
Twenty-one entry and exit vectors, zero announced. The escape hatch exists (Enter on an empty
line, `blockquoteediting.ts:119-133`) and is **indistinguishable from the Enter that does not
use it**; `outdentList` in the list feature is worse still, since the identical keystroke on an
identical-looking empty item either leaves the list or merely decreases its depth depending on a
number the user cannot know (CKE-BC-047 vs. CKE-BC-048). This is number one not because a
blockquote matters more than a mention panel but because of what sits beside it in the same
repository: CKEditor solved this exact problem completely for the code block, in twelve lines
hooked on `selection.on('change:range')`, and that listener is entirely container-agnostic. The
capability is present, proven, and applied to two of nine containers.

**2. CKE-B3-001..006 — the mention / autocomplete panel (`@`, `:`, `/`).**
Zero ARIA in the entire package (`grep -rn "aria\|role" packages/ckeditor5-mention/src` → no
matches). Not a missing announcement — a missing *widget*. A sighted user sees a list, a
highlighted item and a shrinking result count; a screen-reader user gets no panel, no count, no
selection, no dismissal, and an Enter key whose meaning has silently changed. It is both a
structural and a transition failure, it is high-frequency, and it is the one pattern here for
which ARIA already has a complete standard answer (`combobox` + `aria-activedescendant`) — which
makes it the least excusable row in the corpus. Emoji autocomplete and premium Slash Commands
inherit it wholesale.

**3. CKE-B2-002 — Ctrl+B with a collapsed caret.**
The purest expression of the platform gap. The editor knows the answer — observable, typed and
localised in `command.value` — and there is no element in the accessibility tree to hang it on,
because the state is about *future input*. A live region cannot fix it well either: announcing
"bold on" on every toggle is a storm, and the user has no way to *query* it. Ctrl+B **with** a
selection (CKE-B2-001) fails for a different reason — the state exists on a node, but nothing
reports the transition. Together they are the cleanest B2 pair in the survey.

**4. CKE-BC-070..085 — the table cell, which cannot be left.**
There is **no Enter-on-empty escape from a table cell at any depth, ever** — every other
container in CKEditor has one. Arrowing past the table's outer edge does not exit the table; it
selects the table *widget* (`tablekeyboard.ts:329-336`), and because `toTableWidget()` passes no
label (`downcast.ts:249`) that selection announces a **non-breaking space**. Tab in the last
cell creates a row instead of leaving. Esc pops to the same unlabelled widget. And Shift+arrow
across cells produces a selection that has no DOM representation at all, so the AT's own
"selected" reporting is not silent but **wrong**. A one-word `label` argument fixes the worst of
it.

**5. CKE-B1-001..021 as a class — the whole `Autoformat` plugin — and CKE-B2-069, the widget
type-around caret.**
Twenty-one silent document rewrites triggered by ordinary typing, in the one plugin whose entire
purpose is changing the document without being asked: `- ` lands you inside a list; `**x**`
deletes four characters you typed; `# ` makes a heading announced as *level 2* while the UI calls
it *Heading 1*. This is the canonical layer-3 leftover and the direct analogue of platform
autocorrect (framework E2). Paired with it, the widget type-around fake caret: after one arrow
press the user is in a mode where typing creates a paragraph instead of editing the widget, and
that mode exists **only as a CSS class**, with its visible affordances deliberately
`aria-hidden="true"` (`widgettypearound.ts:929`). Unannounced *and* unqueryable *and*
undiscoverable — the complete set — reached by an ordinary arrow key.

**Honourable mentions.** CKE-B2-080 / CKE-B3-025, the find-and-replace "N of M" counter — the
*easiest* fix in the report and therefore the most damning: a changing number inside a focused
input, rendered as a bare `<span>`, in a product that ships a working live-region API and claims
WCAG 2.2 AA; `role="status"` on the existing element would do it. CKE-BC-091, the table caption
`role="textbox"` with no accessible name, two files away from an image caption that has one.
CKE-B2-023, Ctrl+Enter checking a to-do item silently *and* missing from the Alt+0 dialog.
CKE-B2-072, undo — silent, and it moves the caret as well as the text. CKE-B2-110, premium
comments — where `aria-details` is the obvious mechanism and is the single most valuable thing
to verify next against a licensed build.

---

## Appendix — registered commands (open-source packages, v48.4.0)

Extracted with `grep -rn "editor.commands.add(" packages/*/src`. Each exposes observable
`value` and `isEnabled` (`ckeditor5-core/src/command.ts:55,68`); each is the B2 state that must
be disclosed and, today, is disclosed only through a toolbar button's `aria-pressed`.

**Inline attributes** (`AttributeCommand`, `value: boolean`): `bold`, `italic`, `underline`,
`strikethrough`, `code`, `subscript`, `superscript`.

**Block format:** `paragraph`, `heading`, `blockQuote`, `codeBlock`, `alignment`,
`horizontalLine`, `pageBreak`, `style`, `removeFormat`, `highlight`, `textPartLanguage`,
`showBlocks`, `toggleFullscreen`.

**Font:** `fontFamily`, `fontSize`, `fontColor`, `fontBackgroundColor`.

**Lists:** `bulletedList`, `numberedList`, `todoList`, `checkTodoList`, `customBulletedList`,
`customNumberedList`, `listStyle`, `listStart`, `listReversed`, `indentList`, `outdentList`,
`indentBlockList`, `outdentBlockList`, `indentBlockListItem`, `outdentBlockListItem`,
`mergeListItemBackward`, `mergeListItemForward`, `splitListItemBefore`, `splitListItemAfter`.

**Indent:** `indent`, `outdent`, `indentBlock`, `outdentBlock`, `indentCodeBlock`,
`outdentCodeBlock`.

**Links & bookmarks:** `link`, `unlink`, `insertBookmark`, `updateBookmark`.

**Tables:** `insertTable`, `insertTableLayout`, `insertTableRowAbove`, `insertTableRowBelow`,
`insertTableColumnLeft`, `insertTableColumnRight`, `removeTableRow`, `removeTableColumn`,
`mergeTableCells`, `mergeTableCellUp`, `mergeTableCellDown`, `mergeTableCellLeft`,
`mergeTableCellRight`, `splitTableCellVertically`, `splitTableCellHorizontally`,
`setTableRowHeader`, `setTableColumnHeader`, `setTableFooterRow`, `selectTableRow`,
`selectTableColumn`, `toggleTableCaption`, `tableType`, `tableCellType`, `tableAlignment`,
`tableWidth`, `tableHeight`, `tableBorderColor`, `tableBorderStyle`, `tableBorderWidth`,
`tableCellWidth`, `tableCellHeight`, `tableCellPadding`, `tableCellBorderColor`,
`tableCellBorderStyle`, `tableCellBorderWidth`, `tableColumnWidth`, `resizeColumnWidths`,
`resizeTableWidth`.

**Images & media:** `insertImage`, `imageInsert`, `imageUpload`, `uploadImage`,
`imageTextAlternative`, `toggleImageCaption`, `imageStyle`, `imageResize`, `resizeImage`,
`imageTypeBlock`, `imageTypeInline`, `replaceImageSource`, `mediaEmbed`, `mediaStyle`,
`resizeMediaEmbed`, `htmlEmbed`, `ckbox`, `ckboxImageEdit`, `ckfinder`.

**Typing / editing core:** `input`, `insertText`, `delete`, `deleteForward`, `forwardDelete`,
`enter`, `shiftEnter`, `insertParagraph`, `selectAll`, `undo`, `redo`.

**Find & replace:** `find`, `findNext`, `findPrevious`, `replace`, `replaceAll`.

**Other:** `mention`, `emoji`, `restrictedEditingException`, `restrictedEditingExceptionAuto`,
`restrictedEditingExceptionBlock`.

Premium features (Slash Commands, Track Changes, Comments, Revision History, Real-time
Collaboration, AI Assistant, Accessibility Checker) add further commands not enumerable from
this repo. Their announcement behaviour is **unverified — INFERRED** throughout; the docs for
[Slash Commands](https://ckeditor.com/docs/ckeditor5/latest/features/slash-commands.html) and
[Track Changes](https://ckeditor.com/docs/ckeditor5/latest/features/collaboration/track-changes/track-changes.html)
document no ARIA or screen-reader behaviour at all. Track Changes in particular is a large
suspected gap: suggestions are marked with `<suggestion-start>`/`<suggestion-end>` and
`data-suggestion-*` attributes with no documented accessible role, and the annotations sidebar
is a parallel UI whose relationship to the marked text has no documented ARIA association.

## Sources

- Repository: <https://github.com/ckeditor/ckeditor5> — `v48.4.0`, commit `8bb12a1`, read from
  `packages/**/src`. All file paths in this document are relative to that repository root.
- Autoformat feature guide: <https://ckeditor.com/docs/ckeditor5/latest/features/autoformat.html>
- Text transformation: <https://ckeditor.com/docs/ckeditor5/latest/features/text-transformation.html>
- Accessibility support: <https://ckeditor.com/docs/ckeditor5/latest/features/accessibility.html>
  — claims "compliant with Web Content Accessibility Guidelines 2.2 (WCAG) 2.2 levels A and AA
  and Section 508 of the Rehabilitation Act"; recommends Chrome+NVDA or Safari+VoiceOver;
  documents Alt+0. Makes **no statement** about which state changes are announced.
- Mentions: <https://ckeditor.com/docs/ckeditor5/latest/features/mentions.html>
- Slash commands (premium): <https://ckeditor.com/docs/ckeditor5/latest/features/slash-commands.html>
- Track changes (premium): <https://ckeditor.com/docs/ckeditor5/latest/features/collaboration/track-changes/track-changes.html>

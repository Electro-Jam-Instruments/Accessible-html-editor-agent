# The scenarios, in plain language

**Every distinct thing a person can do in an editor, grouped by the kind of content they
are doing it to.** 218 scenarios, merged from three editors, named the way a user would
name them.

This is the walk-through version of [`canonical.md`](canonical.md) — the same rows and the
same ids, with the analytical columns stripped out. Read this one to *talk through* the
problem; read that one to argue about it.

## How to read it

Each row is one thing a user did, and what they should hear at the moment they do it. Then
what each of the three editors actually does today.

| | Meaning |
|---|---|
| ✅ heard | The user is told, at the moment it happens |
| ⬜ silent | The editor does this correctly and says nothing about it |
| ❌ broken | The result carries no real structure — **no announcement can repair it** |
| – n/a | The editor does not have this feature. Not a failure. |
| ✅ **measured** | Fixed **and proven by the harness** in a real browser — the strongest claim here |
| ⬜ measured, not conveyed | The harness ran this scenario against our editor and the information does not (fully) reach the user — silence, or an announcement judged insufficient by the contract |
| 🔧 fixed | Fixed in the app with unit tests, but no contract clause measures it yet |
| 🔧 part | Partly fixed — some of the ways this happens are closed, others are not; the row says which |

**`– n/a` is not `⬜ silent`.** An editor with fewer features is not a more accessible one,
and conflating the two would invert the whole comparison.

The checkboxes are the plan. A scenario is ticked when a screen-reader user can complete it
in Open Notebook — we work down the list content type by content type, and the tick is the
same claim the conformance suite makes automatically.

## What is ticked so far

The rows below are the worked example: each was found by reading source, is named in the
corpus, and is fixed in code and tested. One earlier tick (CAN-CB-044) was **withdrawn**
when a stricter contract measured the scenario and judged its announcement insufficient —
the loop taking a green mark back is the loop working.
The full write-up is [`worked-example.md`](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/a11y/worked-example.md).

| Scenario | What changed |
|---|---|
| [Enter at the end of an item creates the next item](canonical.md#can-cb-044) | The library already inserted the next marker silently. It is now announced - "new list item", or "new task, not checked" - **but the tick was withdrawn**: for an ordered list the announcement gives the number without naming the construct, and the stricter list contract judged that insufficient. |
| [Enter on an empty item leaves the list](canonical.md#can-cb-046) | There was **no way out**: Enter on `- ` produced `- ` forever. An empty item now removes the marker and announces "list ended". |
| [Tab nests the list item one level deeper](canonical.md#can-cb-052) | **The keystroke changed.** Tab used to insert spaces and never move focus, trapping keyboard users inside a modal (WCAG 2.1.2). Tab now leaves the field; indenting moved to `Ctrl+]` and is announced. |
| [Shift+Tab outdents the list item](canonical.md#can-cb-053) | The same trap in reverse, and it was worse than the catalogue recorded - the trap is two-way, so the modal had no keyboard exit at all. Outdenting moved to `Ctrl+[`. |
| [The document appears more than once in the accessibility tree](canonical.md#can-b1-029) | The syntax-highlight overlay is a full second copy of the note, rewritten on every keystroke and hidden from nobody. Now `aria-hidden`, so the note is read once rather than three times. |
| [A focused control is disabled mid-edit](canonical.md#can-b2-025) | **Partly.** `disabled` became `readOnly` + `aria-busy` in the inline title editor and the chat composer, so focus survives a save. The editor toolbar greying out in preview mode is still unfixed. |

The keystroke change in rows 3 and 4 is a real trade: Tab no longer does what a sighted
user's muscle memory expects. It is the right trade - a two-way keyboard trap in a modal is
a hard failure, and the shortcut is announced in the field's help text - but it is a trade,
and it should be argued with rather than assumed.


## Contents

| Content type | Scenarios | Heard in Open Notebook today |
|---|---:|---:|
| [Lists](#lists) | 29 | 4 of 12 implemented |
| [Blockquotes](#blockquotes) | 17 | 0 of 2 implemented |
| [Code blocks](#code-blocks) | 18 | 0 of 1 implemented |
| [Headings](#headings) | 3 | 0 of 2 implemented |
| [Tables](#tables) | 20 | 0 of 1 implemented |
| [Text formatting](#text-formatting) | 13 | 0 of 1 implemented |
| [Links](#links) | 8 | 0 of 1 implemented |
| [Images, media and embeds](#images-media-and-embeds) | 8 | 0 of 2 implemented |
| [Math](#math) | 1 | 0 of 0 implemented |
| [Footnotes](#footnotes) | 1 | 0 of 0 implemented |
| [Collapsible and callout sections](#collapsible-and-callout-sections) | 9 | 0 of 0 implemented |
| [Containers inside containers](#containers-inside-containers) | 2 | 0 of 0 implemented |
| [Any container](#any-container) | 4 | 0 of 1 implemented |
| [Menus, autocomplete and suggestions](#menus-autocomplete-and-suggestions) | 25 | 3 of 12 implemented |
| [Selection, caret, undo and paste](#selection-caret-undo-and-paste) | 12 | 1 of 4 implemented |
| [Getting into and out of the editor](#getting-into-and-out-of-the-editor) | 9 | 0 of 7 implemented |
| [Saving, status and errors](#saving-status-and-errors) | 7 | 0 of 5 implemented |
| [The document as a whole](#the-document-as-a-whole) | 32 | 1 of 12 implemented |


---

## Lists

### Getting in

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [`- ` + space becomes a bulleted list](canonical.md#can-cb-036) | direction:entered · container:list · position:1of1 | ⬜ measured, not conveyed | ⬜ silent | ⬜ silent |
| [ ] | [`1. ` + space becomes an ordered list](canonical.md#can-cb-037) | direction:entered · container:orderedlist · position:1of1 · start:N | ⬜ measured, not conveyed | ⬜ silent | ⬜ silent |
| [ ] | [Toolbar / shortcut turns blocks into a list](canonical.md#can-cb-039) | direction:entered · container:list · position:MofN | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [Backspace/Delete merges the caret into a list](canonical.md#can-cb-041) | direction:entered · container:list · structure:merged | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Enter at the end of an item creates the next item](canonical.md#can-cb-044) | direction:unchanged · container:list · position:MofN | ⬜ measured, not conveyed | ⬜ silent | ⬜ silent |
| [ ] | [`[ ] ` becomes a checkable item](canonical.md#can-cb-055) | direction:entered · container:tasklist · state:unchecked · position:1of1 | ⬜ measured, not conveyed | ❌ broken | ✅ heard |
| [ ] | [Leading whitespace starts the list already nested](canonical.md#can-cb-038) | direction:entered · container:list · depth:2 | ❌ broken | ⬜ silent | – n/a |
| [ ] | [Arrow into a list from an adjacent block](canonical.md#can-cb-040) | direction:entered · container:list · position:MofN · count:N | ⬜ measured, not conveyed | ✅ heard | ✅ heard |
| [ ] | [Paste list content](canonical.md#can-cb-042) | direction:entered · container:list · count:N | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Undo restores a list around the caret](canonical.md#can-cb-043) | direction:entered · container:list · op:undone | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [A command creates a to-do list](canonical.md#can-cb-056) | direction:entered · container:tasklist · state:unchecked | ❌ broken | ❌ broken | ✅ heard |
| [ ] | [Entering a to-do list whose item is already checked](canonical.md#can-cb-060) | direction:entered · container:tasklist · state:checked | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Enter mid-item splits the item](canonical.md#can-cb-045) | container:list · structure:split | ❌ broken | ⬜ silent | ⬜ silent |

### Working inside

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [x] | [Tab nests the list item one level deeper](canonical.md#can-cb-052) | depth:increased · container:list | ✅ **measured** | ⬜ silent | ⬜ silent |
| [x] | [Shift+Tab outdents the list item](canonical.md#can-cb-053) | depth:decreased · container:list | ✅ **measured** | ⬜ silent | ⬜ silent |
| [ ] | [Toggling a checkbox in a task item](canonical.md#can-cb-057) | container:tasklist · state:checked | ⬜ measured, not conveyed | ⬜ silent | ⬜ silent |
| [ ] | [An ordered sub-list restarts its numbering inside a bulleted list](canonical.md#can-cb-054) | container:orderedlist · depth:2 · position:1ofN | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [The to-do announcer knows what you left, never what you entered](canonical.md#can-cb-059) | direction:left · container:tasklist · direction:entered · container:list | – n/a | – n/a | ✅ heard |
| [ ] | [Tab changes depth inside a to-do list](canonical.md#can-cb-061) | depth:increased · container:tasklist | – n/a | ⬜ silent | ⬜ silent |

### Getting out

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [x] | [Enter on an empty item leaves the list](canonical.md#can-cb-046) | direction:left · container:list | ✅ **measured** | ⬜ silent | ⬜ silent |
| [ ] | [Enter on an empty NESTED item drops a level instead of leaving](canonical.md#can-cb-047) | direction:unchanged · container:list · depth:decreased | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Backspace at an item's start lifts out, merges, or splits the list](canonical.md#can-cb-049) | direction:left · container:list · structure:split | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Arrow out of the top or bottom of a list](canonical.md#can-cb-048) | direction:left · container:list | – n/a | ✅ heard | ✅ heard |
| [ ] | [A command removes the list](canonical.md#can-cb-050) | direction:removed · container:list · count:N | ❌ broken | ⬜ silent | ⬜ silent |
| [x] | [Leaving a to-do list](canonical.md#can-cb-058) | direction:left · container:tasklist | ✅ **measured** | ⬜ silent | ✅ heard |
| [ ] | [Undo removes the list](canonical.md#can-cb-051) | direction:removed · container:list · op:undone | – n/a | ⬜ silent | ⬜ silent |

### When you ask for a change

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Indent a block that is not in a list](canonical.md#can-b2-011) | indent:N | – n/a | ❌ broken | ❌ broken |
| [ ] | [Multi-level (legal) list numbering](canonical.md#can-b2-060) | position:1.1.1 · depth:3 | – n/a | – n/a | ❌ broken |
| [ ] | [List properties: marker style, start number, reversed order](canonical.md#can-b2-065) | list:style · start:N · order:reversed | – n/a | ⬜ silent | ❌ broken |


---

## Blockquotes

### Getting in

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [`> ` + space becomes a blockquote](canonical.md#can-cb-001) | direction:entered · container:blockquote | ⬜ measured, not conveyed | ⬜ silent | ⬜ silent |
| [ ] | [Toolbar / shortcut turns the block into a blockquote](canonical.md#can-cb-002) | direction:entered · container:blockquote | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [Arrow down into a blockquote from the block above](canonical.md#can-cb-003) | direction:entered · container:blockquote | ⬜ measured, not conveyed | ⬜ silent | ⬜ silent |
| [ ] | [Arrow up into a blockquote from the block below](canonical.md#can-cb-004) | direction:entered · container:blockquote · position:last | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Backspace/Delete merges the caret into a blockquote](canonical.md#can-cb-005) | direction:entered · container:blockquote · structure:merged | ⬜ measured, not conveyed | ⬜ silent | ⬜ silent |
| [ ] | [Paste lands inside a blockquote](canonical.md#can-cb-006) | direction:entered · container:blockquote · extent:N | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Undo/redo restores a blockquote around the caret](canonical.md#can-cb-007) | direction:entered · container:blockquote · op:undone | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Enter creates a new sibling paragraph still inside the quote](canonical.md#can-cb-008) | direction:unchanged · container:blockquote | – n/a | ⬜ silent | ⬜ silent |

### Working inside

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [A blockquote nested inside a blockquote](canonical.md#can-cb-016) | depth:2 · container:blockquote | – n/a | ⬜ silent | ⬜ silent |

### Getting out

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Enter leaves the blockquote](canonical.md#can-cb-009) | direction:left · container:blockquote | ⬜ measured, not conveyed | ⬜ silent | ⬜ silent |
| [ ] | [Arrow up out of the top of a blockquote](canonical.md#can-cb-010) | direction:left · container:blockquote | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Arrow down out of the bottom of a blockquote](canonical.md#can-cb-011) | direction:left · container:blockquote | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Backspace at the start dissolves or merges the blockquote](canonical.md#can-cb-012) | direction:removed · container:blockquote · structure:destroyed | ⬜ measured, not conveyed | ⬜ silent | ⬜ silent |
| [ ] | [A command removes the blockquote](canonical.md#can-cb-013) | direction:removed · container:blockquote | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [Undo/redo removes the blockquote around the caret](canonical.md#can-cb-014) | direction:removed · container:blockquote · op:undone | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [There is no dedicated escape from a blockquote](canonical.md#can-cb-015) | affordance:absent · container:blockquote | – n/a | ❌ broken | ❌ broken |

### The editor changes your text as you type

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Quotes, dashes and ellipses are silently retypographed](canonical.md#can-b1-017) | substitution:from→to · count:changed | – n/a | – n/a | ⬜ silent |


---

## Code blocks

### Getting in

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [A fence of three backticks becomes a code block](canonical.md#can-cb-018) | direction:entered · container:codeblock · language:X | ⬜ measured, not conveyed | ❌ broken | ✅ heard |
| [ ] | [Toolbar / shortcut creates a code block](canonical.md#can-cb-019) | direction:entered · container:codeblock · language:X | ❌ broken | ❌ broken | ✅ heard |
| [ ] | [Arrow down into a code block from above](canonical.md#can-cb-020) | direction:entered · container:codeblock | ⬜ measured, not conveyed | ❌ broken | ✅ heard |
| [ ] | [Arrow up into a code block from below](canonical.md#can-cb-021) | direction:entered · container:codeblock · position:last | – n/a | ❌ broken | ✅ heard |
| [ ] | [Backspace merges the caret into a code block](canonical.md#can-cb-022) | direction:entered · container:codeblock · structure:merged | ⬜ measured, not conveyed | ❌ broken | ✅ heard |
| [ ] | [Enter inside a code block stays inside](canonical.md#can-cb-025) | direction:unchanged · container:codeblock | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Paste lands inside a code block](canonical.md#can-cb-023) | direction:entered · container:codeblock | – n/a | ❌ broken | ✅ heard |
| [ ] | [Undo restores a code block around the caret](canonical.md#can-cb-024) | direction:entered · container:codeblock · op:undone | – n/a | ❌ broken | ✅ heard |

### Working inside

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Keystroke semantics change inside a code block](canonical.md#can-cb-034) | container:codeblock · mode:autoformat-off · mode:spellcheck-off | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [The code block's language is set or changed](canonical.md#can-cb-032) | container:codeblock · language:X | – n/a | ❌ broken | ⬜ silent |
| [ ] | [Tab inside a code block inserts a character instead of indenting or leaving](canonical.md#can-cb-033) | container:codeblock · result:literal-tab | – n/a | ⬜ silent | ⬜ silent |

### Getting out

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Enter on blank line(s) leaves the code block](canonical.md#can-cb-026) | direction:left · container:codeblock | ⬜ measured, not conveyed | ⬜ silent | ✅ heard |
| [ ] | [Arrow up out of the top of a code block](canonical.md#can-cb-028) | direction:left · container:codeblock | – n/a | ❌ broken | ✅ heard |
| [ ] | [Arrow down out of the bottom of a code block](canonical.md#can-cb-029) | direction:left · container:codeblock | – n/a | ❌ broken | ✅ heard |
| [ ] | [Backspace at the start dissolves the code block](canonical.md#can-cb-030) | direction:removed · container:codeblock · structure:destroyed | – n/a | ⬜ silent | ✅ heard |
| [ ] | [A command removes the code block](canonical.md#can-cb-031) | direction:removed · container:codeblock | – n/a | ⬜ silent | ✅ heard |
| [ ] | [Enter at the very start escapes upwards](canonical.md#can-cb-027) | direction:left · container:codeblock · position:before | – n/a | – n/a | ✅ heard |

### The editor changes your text as you type

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [`` `x` `` becomes inline code](canonical.md#can-b1-006) | substitution:markers-consumed · format:code · mode:autocorrect-off | – n/a | ⬜ silent | ⬜ silent |


---

## Headings

### The editor changes your text as you type

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [`# ` becomes a heading](canonical.md#can-b1-007) | structure:created · role:heading · level:N | – n/a | ✅ heard | ⬜ silent |
| [ ] | [Enter at the end of a heading produces a paragraph](canonical.md#can-b1-032) | direction:left · role:heading · structure:changed | ❌ broken | ⬜ silent | ⬜ silent |

### When you ask for a change

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [A command sets the heading level](canonical.md#can-b2-009) | role:heading · level:N · direction:entered\|removed | ❌ broken | ✅ heard | ⬜ silent |


---

## Tables

### Getting in

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [A command inserts a table](canonical.md#can-cb-063) | direction:entered · container:table · size:RxC · position:r1c1 | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [Arrow or click into a table cell](canonical.md#can-cb-064) | direction:entered · container:cell · position:rRcC · header:X | – n/a | ✅ heard | ✅ heard |
| [ ] | [Arrowing at the table's edge selects the table widget, which announces a non-breaking space](canonical.md#can-cb-065) | container:table · selection:widget · name:empty | – n/a | – n/a | ❌ broken |
| [ ] | [Entering an image-caption sub-editor](canonical.md#can-cb-077) | direction:entered · container:caption · name:X | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [A typed markdown table row becomes a table](canonical.md#can-cb-062) | direction:entered · container:table · position:r1c1 · size:RxC | – n/a | ⬜ silent | – n/a |
| [ ] | [Paste lands in a cell](canonical.md#can-cb-068) | direction:entered · container:cell · extent:N | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Entering and leaving a table caption](canonical.md#can-cb-076) | direction:entered · container:caption · name:absent | – n/a | – n/a | ❌ broken |
| [ ] | [Entering a multi-column layout](canonical.md#can-cb-085) | direction:entered · container:column · position:1of3 | – n/a | ❌ broken | – n/a |

### Working inside

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Tab moves between cells](canonical.md#can-cb-066) | container:cell · position:rRcC | – n/a | ✅ heard | ✅ heard |
| [ ] | [Tab in the last cell creates a new row](canonical.md#can-cb-067) | container:table · structure:created · position:rR+1c1 | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Table structure edits reshape the grid around the caret](canonical.md#can-cb-073) | container:table · size:RxC · position:rRcC | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [A rectangular multi-cell selection has no DOM selection](canonical.md#can-cb-074) | selection:RxC · container:table | – n/a | ❌ broken | ❌ broken |
| [ ] | [Deletion is clamped at a cell boundary](canonical.md#can-cb-072) | result:refused · container:cell | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Nested tables, and the 'am I in a table' flag](canonical.md#can-cb-075) | container:table · depth:2 | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Moving between columns](canonical.md#can-cb-086) | container:column · position:2of3 | – n/a | ❌ broken | – n/a |

### Getting out

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [There is no Enter escape from a table cell](canonical.md#can-cb-069) | affordance:absent · container:cell | – n/a | ❌ broken | ❌ broken |
| [ ] | [Arrowing past the table's outer edge](canonical.md#can-cb-070) | direction:left · container:table | – n/a | ✅ heard | ❌ broken |
| [ ] | [Escape from a cell pops to the parent widget](canonical.md#can-cb-071) | direction:left · container:cell · selection:widget | – n/a | – n/a | ❌ broken |
| [ ] | [Leaving a caption](canonical.md#can-cb-078) | direction:left · container:caption · selection:widget | – n/a | ⬜ silent | ✅ heard |

### When you ask for a change

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Several editable regions, or a detached toolbar](canonical.md#can-b2-052) | region:NofM · toolbar:detached | – n/a | – n/a | ❌ broken |


---

## Text formatting

### The editor changes your text as you type

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [`**x**` becomes bold and the markers vanish](canonical.md#can-b1-001) | substitution:markers-consumed · format:bold · target:run | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [`*x*` becomes italic](canonical.md#can-b1-002) | substitution:markers-consumed · format:italic · target:run | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [`~~x~~` becomes strikethrough](canonical.md#can-b1-004) | substitution:markers-consumed · format:strikethrough | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [`:smile:` or `:)` becomes an emoji glyph](canonical.md#can-b1-015) | substitution:text→glyph · name:X | – n/a | ⬜ silent | – n/a |
| [ ] | [A typed symbol sequence collapses into one glyph](canonical.md#can-b1-018) | substitution:from→to · count:changed | – n/a | – n/a | ⬜ silent |
| [ ] | [`==x==` becomes highlighted](canonical.md#can-b1-005) | substitution:markers-consumed · format:highlight | – n/a | ⬜ silent | – n/a |
| [ ] | [Syntax highlighting re-tokenises the text under the caret](canonical.md#can-b1-028) | structure:unchanged · churn:high | – n/a | ⬜ silent | ⬜ silent |

### When you ask for a change

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [The same shortcut applies and removes, with identical feedback](canonical.md#can-b2-003) | format:bold · state:off · direction:toggle | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [Change the block's alignment](canonical.md#can-b2-010) | align:X | – n/a | ❌ broken | ❌ broken |
| [ ] | [Change font size, family or colour](canonical.md#can-b2-012) | font:X · size:N · colour:X | – n/a | ❌ broken | ❌ broken |
| [ ] | [Apply or remove a highlight](canonical.md#can-b2-013) | format:highlight · state:on | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Apply a named style](canonical.md#can-b2-014) | style:X | – n/a | – n/a | ❌ broken |
| [ ] | [Mark a run as being in another language](canonical.md#can-b2-015) | lang:X | – n/a | – n/a | ✅ heard |


---

## Links

### The editor changes your text as you type

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [A typed URL turns into a link](canonical.md#can-b1-009) | structure:created · role:link · target:URL | – n/a | ✅ heard | ⬜ silent |
| [ ] | [`[text](url)` becomes a link](canonical.md#can-b1-011) | structure:created · role:link · target:URL | – n/a | ⬜ silent | – n/a |
| [ ] | [A typed or pasted URL is replaced by an embedded object](canonical.md#can-b1-013) | substitution:URL→object · object:image\|media\|tweet · alt:absent | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Editing a URL so it stops being a link](canonical.md#can-b1-010) | structure:destroyed · role:link | – n/a | ✅ heard | ⬜ silent |
| [ ] | [`[foo]` becomes a token](canonical.md#can-b1-031) | substitution:text→token | – n/a | ⬜ silent | – n/a |

### When you ask for a change

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Create or remove a link by command](canonical.md#can-b2-016) | role:link · target:URL · state:on\|off | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [Toggle a link decorator such as 'open in a new tab'](canonical.md#can-b2-017) | link:decorator · state:on | – n/a | – n/a | ✅ heard |
| [ ] | [An image becomes a link](canonical.md#can-b2-062) | object:image · role:link · target:URL | – n/a | – n/a | ⬜ silent |


---

## Images, media and embeds

### Getting in

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [An embedded editing surface inside a widget](canonical.md#can-cb-080) | direction:entered · container:embed · mode:changed | – n/a | ⬜ silent | ⬜ silent |

### The editor changes your text as you type

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [`![alt](src)` becomes an image](canonical.md#can-b1-012) | structure:created · object:image · alt:X | – n/a | ⬜ silent | – n/a |

### When you ask for a change

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [The caret lands on an embedded object](canonical.md#can-b2-032) | selection:object · object:X · name:X · text:no | – n/a | ❌ broken | ✅ heard |
| [ ] | [Insert an image](canonical.md#can-b2-018) | object:image · alt:absent | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [An image upload starts, finishes or fails](canonical.md#can-b2-020) | op:upload · status:started\|complete\|failed | – n/a | – n/a | ✅ heard |
| [ ] | [Set or read an image's alternative text](canonical.md#can-b2-019) | alt:X · object:image | – n/a | ⬜ silent | ✅ heard |
| [ ] | [Change an image's style or size](canonical.md#can-b2-021) | object:image · size:N · style:X | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Insert a rule, page break, media embed or bookmark](canonical.md#can-b2-022) | object:X · name:X · position:after | ❌ broken | ⬜ silent | ⬜ silent |


---

## Math

### The editor changes your text as you type

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [`$...$` becomes a rendered equation](canonical.md#can-b1-016) | substitution:source→object · role:math · name:X | – n/a | ⬜ silent | – n/a |


---

## Footnotes

### Working inside

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [A footnote / aside container](canonical.md#can-cb-091) | container:footnote | – n/a | – n/a | – n/a |


---

## Collapsible and callout sections

### Getting in

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Inserting or entering a collapsible section](canonical.md#can-cb-081) | direction:entered · container:collapsible · state:expanded | – n/a | ❌ broken | – n/a |

### Working inside

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Expanding or collapsing a disclosure](canonical.md#can-cb-082) | container:collapsible · state:expanded | – n/a | ❌ broken | – n/a |
| [ ] | [A slot-based block container where Enter is a silent no-op](canonical.md#can-cb-079) | container:slot · result:refused | – n/a | ❌ broken | – n/a |
| [ ] | [Enter in a collapsible title expands it AND moves the caret](canonical.md#can-cb-083) | container:collapsible · state:expanded · direction:entered | – n/a | ❌ broken | – n/a |
| [ ] | [A container the caret cannot reach at all](canonical.md#can-cb-087) | container:isolated · reachable:no | – n/a | ❌ broken | – n/a |
| [ ] | [Moving between restricted editable regions](canonical.md#can-cb-088) | container:region · position:NofM | – n/a | – n/a | ⬜ silent |
| [ ] | [Crossing into or out of a read-only region](canonical.md#can-cb-089) | container:region · permission:readonly | – n/a | – n/a | ❌ broken |
| [ ] | [A callout / admonition container](canonical.md#can-cb-090) | container:callout | – n/a | – n/a | – n/a |

### Getting out

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Leaving a collapsible section](canonical.md#can-cb-084) | direction:left · container:collapsible | – n/a | ❌ broken | – n/a |


---

## Containers inside containers

### Working inside

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [A list inside a blockquote — two depth counters at once](canonical.md#can-cb-017) | depth:changed · container:list · container:blockquote | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [A code block nested inside a list item](canonical.md#can-cb-035) | container:codeblock · container:list · depth:N | – n/a | ⬜ silent | ⬜ silent |


---

## Any container

### Working inside

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [The containment stack is computed continuously and spent on a toolbar label](canonical.md#can-cb-095) | container:stack · depth:N | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [A selection that spans a container boundary](canonical.md#can-cb-092) | selection:spans-boundary · container:X | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [A command applied to a boundary-spanning selection reshapes several containers](canonical.md#can-cb-093) | structure:changed · count:N | – n/a | ⬜ silent | ⬜ silent |

### Getting out

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Undo/redo of a container transition reports only the history operation](canonical.md#can-cb-094) | op:undone · direction:? · container:? | – n/a | ✅ heard | ⬜ silent |


---

## Menus, autocomplete and suggestions

### Menus

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [A caret-anchored menu opens](canonical.md#can-b3-001) | menu:open · count:N · option:1ofN | ✅ heard | ❌ broken | ❌ broken |
| [ ] | [Typing filters the list](canonical.md#can-b3-002) | count:N · option:1ofN | ⬜ silent | ❌ broken | ❌ broken |
| [ ] | [Arrow navigation between options](canonical.md#can-b3-003) | option:MofN · label:X | ✅ heard | ❌ broken | ❌ broken |
| [ ] | [Committing an option](canonical.md#can-b3-005) | commit:X · menu:closed | ⬜ silent | ⬜ silent | ⬜ silent |
| [ ] | [The menu is dismissed, and Enter now means something else](canonical.md#can-b3-007) | menu:closed · focus:X | ⬜ silent | ⬜ silent | ❌ broken |
| [ ] | [A contextual balloon or floating toolbar appears](canonical.md#can-b3-009) | popup:open · name:X · reach:Alt+F10 | – n/a | ❌ broken | ❌ broken |
| [ ] | [Escape inside an editor popup destroys the surrounding draft](canonical.md#can-b3-015) | menu:closed · draft:destroyed | ❌ broken | – n/a | – n/a |
| [ ] | [The toolbar's exposed pressed state](canonical.md#can-b3-016) | control:pressed · format:X | ❌ broken | ❌ broken | ✅ heard |
| [ ] | [Filtering down to zero results](canonical.md#can-b3-004) | count:0 | ❌ broken | ❌ broken | ❌ broken |
| [ ] | [The inserted glyph's name need not match what you searched for](canonical.md#can-b3-006) | commit:glyph · name:unicode | – n/a | ⬜ silent | – n/a |
| [ ] | [The inserted mention reads as ordinary text afterwards](canonical.md#can-b3-008) | token:indivisible · name:X | – n/a | ❌ broken | ❌ broken |
| [ ] | [A link-edit form opens and takes focus](canonical.md#can-b3-010) | form:open · field:URL · focus:moved | – n/a | ⬜ silent | ✅ heard |
| [ ] | [A popup swaps its content in place](canonical.md#can-b3-011) | popup:content-changed · name:X | – n/a | – n/a | ❌ broken |
| [ ] | [A modal dialog opens](canonical.md#can-b3-012) | dialog:open · name:X · focus:trapped | ✅ heard | ✅ heard | ✅ heard |
| [ ] | [The option set changes under a stationary caret](canonical.md#can-b3-013) | count:N · option:reordered | ⬜ silent | ⬜ silent | ⬜ silent |
| [ ] | [A toolbar dropdown opens](canonical.md#can-b3-014) | popup:open · count:N · current:X | ❌ broken | ❌ broken | ✅ heard |
| [ ] | [The emoji picker dialog](canonical.md#can-b3-017) | grid:open · category:X · name:X | – n/a | ❌ broken | ✅ heard |
| [ ] | [The find & replace panel opens](canonical.md#can-b3-018) | dialog:open · field:query | – n/a | ✅ heard | ✅ heard |
| [ ] | [A warning falls back to a browser alert](canonical.md#can-b3-019) | status:failed · reason:X | – n/a | – n/a | ✅ heard |
| [ ] | [Inline ghost-text autocomplete](canonical.md#can-b3-020) | suggestion:X · key:Tab | – n/a | ❌ broken | – n/a |
| [ ] | [Mouse-only hover affordances](canonical.md#can-b3-021) | control:pointer-only | – n/a | ❌ broken | ❌ broken |
| [ ] | [A per-cell action dropdown inside the content](canonical.md#can-b3-022) | popup:open · count:N | – n/a | ❌ broken | ❌ broken |
| [ ] | [A comment thread panel](canonical.md#can-b3-023) | panel:open · count:N · anchor:X | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [No caret-anchored menus exist at all](canonical.md#can-b3-024) | menu:absent | – n/a | – n/a | – n/a |
| [ ] | [A secondary control becomes unavailable while an operation runs](canonical.md#can-b3-025) | control:disabled · reason:X | ⬜ silent | – n/a | ⬜ silent |


---

## Selection, caret, undo and paste

### The editor changes your text as you type

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Pasted content is silently normalised or restructured](canonical.md#can-b1-023) | structure:changed · count:N · source:clipboard | – n/a | ✅ heard | ⬜ silent |
| [ ] | [A collapsed caret is silently expanded to the surrounding word](canonical.md#can-b1-025) | target:word · extent:expanded | ❌ broken | – n/a | – n/a |

### When you ask for a change

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Undo and redo](canonical.md#can-b2-023) | op:undone · target:? · position:? | ⬜ measured, not conveyed | ✅ heard | ⬜ silent |
| [ ] | [Paste — what landed and how much](canonical.md#can-b2-026) | op:paste · extent:N · structure:X | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Cut or delete removes content](canonical.md#can-b2-027) | structure:destroyed · extent:N | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Enter versus Shift+Enter](canonical.md#can-b2-030) | structure:paragraph\|linebreak | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [Find — how many matches and which one am I on](canonical.md#can-b2-034) | count:N · position:MofN · context:X | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [A mixed selection collapses to a single state](canonical.md#can-b2-005) | format:bold · state:mixed→on | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Undo or redo becomes unavailable](canonical.md#can-b2-024) | op:unavailable | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Select all](canonical.md#can-b2-028) | selection:all · extent:N | – n/a | ✅ heard | ⬜ silent |
| [ ] | [Shift+arrow extends the selection](canonical.md#can-b2-029) | selection:extended · extent:N | ✅ heard | ✅ heard | ✅ heard |
| [ ] | [Replace, or replace all](canonical.md#can-b2-035) | op:replace · count:N | – n/a | ⬜ silent | ⬜ silent |


---

## Getting into and out of the editor

### When you ask for a change

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Leaving the editing surface by keyboard](canonical.md#can-b2-049) | focus:left · exit:available | ❌ broken | ✅ heard | ✅ heard |
| [~] | [A focused control is disabled mid-edit](canonical.md#can-b2-025) | control:disabled · focus:lost | 🔧 part | ⬜ silent | ⬜ silent |
| [ ] | [The editor's mode changes](canonical.md#can-b2-038) | mode:X · editable:no | – n/a | ✅ heard | ⬜ silent |
| [ ] | [Entering an inline edit mode](canonical.md#can-b2-047) | mode:editing · field:X · selection:all | ⬜ silent | – n/a | – n/a |
| [ ] | [The keyboard route into and out of the toolbar](canonical.md#can-b2-048) | focus:toolbar · control:X · selection:restored | ❌ broken | ✅ heard | ✅ heard |
| [ ] | [Switching view mode unmounts the focused field](canonical.md#can-b2-050) | mode:X · focus:lost | ❌ broken | – n/a | ⬜ silent |
| [ ] | [A fullscreen or overlay mode with no dialog semantics](canonical.md#can-b2-051) | mode:fullscreen · modal:yes | ❌ broken | – n/a | ⬜ silent |
| [ ] | [The editor is created or restarted under the user](canonical.md#can-b2-053) | editor:ready · focus:? | – n/a | – n/a | ⬜ silent |
| [ ] | [Activating a control leaves the application](canonical.md#can-b2-055) | nav:external · target:new-tab | ⬜ silent | – n/a | – n/a |


---

## Saving, status and errors

### When you ask for a change

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [A save or commit succeeded](canonical.md#can-b2-044) | op:save · status:ok | ⬜ silent | – n/a | ⬜ silent |
| [ ] | [A save failed, or a field is invalid](canonical.md#can-b2-045) | op:save · status:failed · reason:X · field:X | ⬜ silent | – n/a | ✅ heard |
| [ ] | [An edit was discarded](canonical.md#can-b2-046) | op:cancel · value:restored | ⬜ silent | – n/a | – n/a |
| [ ] | [Streaming assistant content arrives in a transcript](canonical.md#can-b2-056) | op:stream · status:complete | ⬜ silent | – n/a | ⬜ silent |
| [ ] | [A command rewrites a large span of the document at once](canonical.md#can-b2-064) | structure:changed · extent:N · position:? | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [A command that did nothing is indistinguishable from one that worked](canonical.md#can-b2-066) | result:refused · limit:reached | ⬜ silent | ⬜ silent | ⬜ silent |
| [ ] | [The word/character count changes](canonical.md#can-b2-043) | count:words · count:chars | – n/a | ⬜ silent | ❌ broken |


---

## The document as a whole

### The editor changes your text as you type

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [`***x***` applies two formats at once](canonical.md#can-b1-003) | substitution:markers-consumed · format:bold · format:italic | ⬜ measured, not conveyed | ⬜ silent | – n/a |
| [ ] | [The pending inline format is cleared after an inline autoformat](canonical.md#can-b1-020) | format:bold · state:off · state:pending | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [An IME composition collides with the editor's own rewriting](canonical.md#can-b1-021) | substitution:corrupted · mode:composition | ❌ broken | ⬜ silent | – n/a |
| [x] | [The document appears more than once in the accessibility tree](canonical.md#can-b1-029) | duplicate:N · decorative:yes | 🔧 fixed | – n/a | ⬜ silent |
| [ ] | [`---` becomes a horizontal rule](canonical.md#can-b1-008) | structure:created · object:separator · position:after | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [The editor offers to convert what you typed](canonical.md#can-b1-014) | menu:open · offer:embed | – n/a | ⬜ silent | – n/a |
| [ ] | [Backspace immediately after an autoformat reverts it](canonical.md#can-b1-019) | op:reverted · structure:destroyed | – n/a | – n/a | ⬜ silent |
| [ ] | [Input is silently discarded at a length limit](canonical.md#can-b1-022) | result:refused · limit:reached | – n/a | ⬜ silent | – n/a |
| [ ] | [Blank lines are injected around an inserted block](canonical.md#can-b1-024) | structure:changed · whitespace:added | ❌ broken | – n/a | – n/a |
| [ ] | [The value is silently trimmed on commit](canonical.md#can-b1-026) | substitution:trimmed | ⬜ silent | – n/a | – n/a |
| [ ] | [An undeclared shortcut duplicates or moves a line](canonical.md#can-b1-027) | structure:moved · position:changed | ❌ broken | ⬜ silent | – n/a |
| [ ] | [The document changes around you because someone else edited it](canonical.md#can-b1-030) | structure:changed · origin:remote | – n/a | ⬜ silent | ⬜ silent |

### When you ask for a change

| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |
|---|---|---|---|---|---|
| [ ] | [Ctrl+B with a range selection](canonical.md#can-b2-001) | format:bold · state:on · target:selection · extent:N | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [Ctrl+B with a collapsed caret — a pending style with no anchor](canonical.md#can-b2-002) | format:bold · state:on · state:pending | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Moving the caret into or out of a formatted run](canonical.md#can-b2-007) | format:bold · state:on · position:caret | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [The other inline formats](canonical.md#can-b2-004) | format:X · state:on\|off | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [Arrowing across a formatting boundary in the text](canonical.md#can-b2-008) | format:changed · position:boundary | ❌ broken | ✅ heard | ✅ heard |
| [ ] | [Backspace joins two blocks](canonical.md#can-b2-031) | structure:merged · container:? | ❌ broken | ⬜ silent | ⬜ silent |
| [ ] | [The widget 'type-around' pending insertion mode](canonical.md#can-b2-033) | mode:type-around · position:before\|after | – n/a | – n/a | ❌ broken |
| [ ] | [An affordance with no accessible representation at all](canonical.md#can-b2-054) | control:absent · name:absent · keyboard:no | ❌ broken | ❌ broken | ❌ broken |
| [ ] | [Clear all formatting](canonical.md#can-b2-006) | format:all · state:off | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Attach or read a comment on a passage](canonical.md#can-b2-036) | annotation:comment · count:N · anchor:X | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Track changes: suggestion ranges and their acceptance](canonical.md#can-b2-037) | annotation:suggestion · author:X · state:pending | – n/a | – n/a | ❌ broken |
| [ ] | [Clear the document](canonical.md#can-b2-039) | structure:destroyed · extent:all | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Toggle dictation](canonical.md#can-b2-040) | mode:dictation · state:on | – n/a | ⬜ silent | – n/a |
| [ ] | [A navigation aid duplicating the document's structure](canonical.md#can-b2-041) | nav:outline · target:X | – n/a | ⬜ silent | ⬜ silent |
| [ ] | [Show blocks / non-printing characters](canonical.md#can-b2-042) | mode:showblocks | – n/a | ❌ broken | ❌ broken |
| [ ] | [Content is hidden from the rendered output](canonical.md#can-b2-057) | visibility:hidden-on-render | ❌ broken | – n/a | – n/a |
| [ ] | [Spelling and grammar markers](canonical.md#can-b2-058) | spelling:error · count:N | ❌ broken | – n/a | ❌ broken |
| [ ] | [A third-party asset manager opens](canonical.md#can-b2-059) | dialog:external | – n/a | – n/a | ⬜ silent |
| [ ] | [A 'format painter' armed mode](canonical.md#can-b2-061) | mode:armed | – n/a | – n/a | ❌ broken |
| [ ] | [Data-fidelity layers change what round-trips, not what you edit](canonical.md#can-b2-063) | structure:preserved · object:opaque | – n/a | – n/a | ⬜ silent |


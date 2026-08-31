# Editing surfaces: a layered gap analysis

**Status: framework + scenario list, 2026-08. Layer 4 verified — see
[platform-api-mapping.md](platform-apis.md).**

## The premise

**A live region is an admission of failure in the platform.**

If an author must reach for `aria-live` to convey something, it means ARIA has no
declarative way to express it. The author is reduced to synthesising an English
sentence and pushing it through an untyped string channel — losing the semantics, the
localisation, the user's verbosity preferences, and any chance the AT could present it
differently for braille, or suppress it, or let the user query it later.

So: **every live region in an editor is a marker pointing at a specific gap in the web
standards.** Enumerate them, and you have enumerated what ARIA is missing for editing.

That reframes the work. Rather than "make this editor accessible", the question becomes:
*where must an author compensate for the platform, and could the platform carry it
instead?*

## The layers

For each editing scenario, walk it down through five layers:

| Layer | Question |
|---|---|
| **0. Scenario** | What did the user do, and what do they need to know? |
| **1. DOM / ARIA** | What is expressible *declaratively*? What ends up in the markup? |
| **2. Chromium AX** | What does the browser compute — tree state and generated events? |
| **3. Live region** | What is left over, that the author must synthesise as a string? **This is the gap.** |
| **4. Platform API** | Is there a native concept on UIA / AT-SPI2 / NSAccessibility that could carry the layer-3 leftover properly? **Answered in [platform-api-mapping.md](platform-apis.md).** |

Layer 3 is the diagnosis. Layer 4 decides the prescription:

- **Mechanism exists on ≥2 platforms, absent on the web** → the plumbing is already
  there; only the web-facing expression is missing. **Strongest standards proposal.**
- **Mechanism exists on one platform only** → propose to the others first, then the web.
- **Mechanism exists nowhere** → a genuinely new concept, hardest to land.

## The core distinction: state vs transition

ARIA is overwhelmingly a vocabulary for **state**. It can say *this is a list, this item
is at level 2, this item is 3 of 7, this control is pressed*. A screen reader reads that
state when the user arrives somewhere.

What ARIA almost entirely lacks is a vocabulary for **transition** — *you have just
entered a list; your text was just changed for you; your indent level just increased*.
Live regions exist to paper over exactly this, and they do it by degrading a semantic
event into a sentence.

Editing is transition-dense. That is why editors are the worst accessibility surfaces on
the web, and why this gap shows up there first and worst.

## Scenario list

Each row is a contract clause candidate (see `editor-contract.md`) *and* a gap-analysis
row. Marked with what the user needs to know at the moment it happens.

### A. Structure creation (autoformat)
| # | Scenario | User needs to know |
|---|---|---|
| A1 | `- ` at line start → bulleted list | a list started; you are in item 1 |
| A2 | `1. ` at line start → numbered list | an ordered list started; item 1 |
| A3 | `# ` … → heading | this line became a heading, at level N |
| A4 | `> ` → blockquote | you are now in a quotation |
| A5 | ` ``` ` → code block | you are in code; autocorrect/spellcheck semantics change |
| A6 | `- [ ] ` → task item | a checkable item was created, unchecked |

**Common shape:** the user typed literal characters and the editor *silently replaced
them with structure*. The resulting state is expressible in ARIA (`role="list"`,
`aria-level`). **The substitution event is not.**

### B. List editing
| # | Scenario | User needs to know |
|---|---|---|
| B1 | Enter at end of item → new item | new item; its number if ordered |
| B2 | Enter on empty item → exit list | you left the list; what you are now in |
| B3 | Tab in item → nest | level increased to N |
| B4 | Shift+Tab → outdent | level decreased to N |
| B5 | Backspace at item start → lift out | you left the list structure |
| B6 | Alt+Up/Down → move item | item moved; new position |

**B3/B4 are notable:** the *state* (`aria-level`) is expressible, and a screen reader
will read it if the user navigates. But nothing tells them it changed as a result of the
keypress they just made.

### C. Inline formatting
| # | Scenario | User needs to know |
|---|---|---|
| C1 | Ctrl+B with selection → bold applied | bold applied to "the selected words" |
| C2 | Ctrl+B with no selection → pending style | bold is now on for what you type next |
| C3 | Toolbar state reflects caret context | moving the caret into bold text updates the toolbar |

**C2 is a pure transition with no state anchor at all** — there is no element to inspect;
the change is about future input. ARIA has nothing for it.

### D. Caret navigation and reading context
| # | Scenario | User needs to know |
|---|---|---|
| D1 | Arrow across a bold/italic boundary | formatting changed here |
| D2 | Arrow into / out of a link | you entered/left a link, and its target |
| D3 | Arrow across an embedded object (image, mention, footnote) | what the object is |
| D4 | Arrow across a block boundary | you left the heading / entered a list |
| D5 | Shift+arrow selection extension | what is now selected, and how much |

**This is the one group screen readers largely handle themselves**, from the platform
text APIs — provided the editor exposes real text semantics rather than a synthetic
caret. Our editor is a native `<textarea>`, so D1–D4 degrade to plain text with no
formatting boundaries at all.

### E. Editing state and operations
| # | Scenario | User needs to know |
|---|---|---|
| E1 | Undo / redo | what was undone |
| E2 | Autocorrect / autocomplete substitution | your text was changed, from X to Y |
| E3 | Paste | what landed, how much |
| E4 | Find/replace | matches found; current match position |
| E5 | Save / operation completed | it succeeded, or failed and why |

**E2 is the crux case.** It is *identical in shape* to A1–A6: the application changed the
user's text without being asked. If a platform has a typed mechanism for autocorrect, it
is the right home for autoformat too.

### B3 note — menus are an implementation gap, not a standards gap

B1 and B2 are **standards gaps**: ARIA cannot express them, so even a perfect
implementation must synthesise a string. B3 is different — the combobox/listbox
pattern with `aria-activedescendant` already exists and is well specified. Editors
simply implement it inconsistently.

That changes what conformance means here. There is essentially **one menu shape that
works well**, and conformance is about more than wiring the roles: it is the *shape* of
the menu and *how information is filled in* as the user filters. A B3 clause must
therefore assert the whole interaction, not just the attributes:

- what owns focus (the input keeps it; the list never takes it)
- how the combobox↔listbox↔option relationship is wired
- what is announced **on open** (that a menu appeared, and how many options)
- what is announced **on each filter keystroke** — the result count, and the active
  option; this is the part most implementations drop
- what is announced **on arrow navigation** between options
- what is announced **on commit**, and what the document now contains
- what is announced **on dismissal**, and where focus lands

Because the pattern exists, this is testable as a single reusable clause set applied to
every menu, rather than a per-editor bespoke spec.

**Emoji pickers are a known-hard sub-case, deliberately deferred.** The characters typed
(`:smi`) bear no relation to the inserted glyph (😊), whose accessible name is a Unicode
name that may not match what the user searched for. So the filter text, the visible
result, and the announced name can all diverge. Real problem, low priority — record it,
do not try to solve it in the first pass.

### G. Container boundary crossings — see
[containment-state-machine.md](../contract/containment.md)

The highest-volume transition class, specified separately because of its depth. The
caret sits in a **containment stack** (`document › blockquote › list › listItem`) that a
sighted user reads off the screen continuously and a screen-reader user must hold in
their head. Inside an editor the AT is in focus mode and does **not** announce
boundaries, so the editor owns it — and almost none accept it.

The trap is that a container has **many independent entry and exit vectors** — autoformat,
command, arrow in from above, arrow in from below, backspace-merge, paste, undo, and
symmetrically for exit — implemented in different code paths and failing independently.
An editor that announces autoformat entry but not arrow entry has taught the user to
trust an unreliable signal, which is worse than silence.

### F. Failure modes to specify against
| # | Failure |
|---|---|
| F1 | Programmatic insertion is silent (the default outcome of A and B) |
| F2 | Focus lost when a toolbar control disables mid-edit |
| F3 | Tab trapped inside the editor |
| F4 | A live region created in the same update as its content — announces nothing |
| F5 | Announcement storms under fast typing (AT event throttling drops them) |

## Worked example — A1, `- ` + space

| Layer | What happens |
|---|---|
| **0. Scenario** | User types `-` then space at the start of an empty line. |
| **1. DOM / ARIA** | *Rich editor:* `<ul><li>` appears; `role=list`/`listitem` implicit; caret inside the item. *Markdown textarea:* nothing — the text is literally `- `; there is no list at any layer. |
| **2. Chromium AX** | *Rich:* tree gains `list` → `listitem`; `children-changed`; caret position moves. *Textarea:* the value changed; no structural change whatsoever. |
| **3. Live region** | Everything the user needs *at that moment* — "bulleted list, item 1" — must be synthesised by the author as a string. Nothing in layers 1–2 conveys that a transition occurred. |
| **4. Platform API** | *(pending verification)* Windows UIA appears to have a typed mechanism for application-initiated text substitution; macOS appears to have an analogue; AT-SPI2 appears to have only untyped text-change events. If two of three carry it, the web is the odd one out. |

Note the markdown-textarea row: it fails at **layer 1**. No amount of announcement fixes
the fact that the resulting document has no list semantics for a screen reader to
navigate. That is a different and more severe class of failure than "the transition was
not announced", and the analysis should keep them distinct:

- **Structural failure** — the result is not expressible/expressed. The user cannot
  navigate or review it afterwards.
- **Transition failure** — the result is fine, but the user was not told it happened.

Most rich editors pass structure and fail transition. Plain-markdown editors fail both.

## What this produces

1. A **scenario corpus** that doubles as the editor conformance contract.
2. A **gap register**: for each scenario, the specific thing ARIA cannot express.
3. A **platform mapping** showing where the plumbing already exists below.
4. A **proposal set**, ranked by how much of the stack already supports them.

The output is intended for the ARIA WG, the AT vendors, and the editor maintainers —
each of whom currently sees only their own layer.

## Layer 4 result (summary — full detail in platform-api-mapping.md)

**Every user agent, on every platform, hardcodes the notification type to "action
completed" when conveying an author announcement — because Core-AAM mandates it.** The
typing channel exists, is plumbed end to end, and is deliberately unused. UIA has a
two-axis model (`NotificationKind` = what happened × `NotificationProcessing` = how to
pace it); ARIA only ever addresses the second axis.

Consequence worth stating plainly: **"operation failed" is currently unreachable from
the web**, because Core-AAM writes `NotificationKind_ActionCompleted` in as a constant
while UIA has `ActionAborted` sitting right there.

The autocorrect twin is real on two platforms and fired by nobody: UIA's
`TextEditChangeType_AutoCorrect` (carrying the substituted string) is never raised by
Chromium and never consumed by NVDA; macOS's `AutocorrectionOccurredNotification` is
fired by WebKit but dead in Chromium since 2014.

And three implementers have independently worked around the untyped string — WebKit
inventing `AXAnnouncementIsLiveRegionKey` so VoiceOver can tell an `ariaNotify` from a
live region, Chromium smuggling its experimental `type` through UIA's `activityId`, and
NVDA filtering Word announcements on `activityId`. That last one is the argument:
**ATs discriminate on notification identity when given one, and guess when not.**

## Open questions

- Does `ariaNotify` close any of this, or is it just a better-plumbed live region? It
  carries a *string*, so it likely improves delivery (priority, no DOM hack, maps to
  native notification channels) without adding *semantics*. If so, the gap for typed
  editing transitions remains open even after `ariaNotify` ships.
- Should typed editing transitions be an ARIA vocabulary, or an editor-specific API
  surface (something like a typed counterpart to `ariaNotify`)?
- What does an AT do with a typed event it does not recognise? Any proposal needs a
  graceful degradation story to a spoken string.

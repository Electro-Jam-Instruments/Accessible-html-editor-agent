# Container boundaries: the containment state machine

**Status: specification, 2026-08.** The deepest-detail part of the editor contract.

## The problem, stated precisely

At any moment the caret sits inside a **containment stack** — say
`document › blockquote › list › listItem`. A sighted user reads that stack off the
screen continuously and for free: the quote bar, the indent, the bullet. A screen-reader
user has **no continuous channel for it**. They must build and maintain the stack
mentally, and the only way they can is if **every change to it is announced at the moment
it changes**.

In browse mode over static content, screen readers announce container boundaries
themselves. **Inside an editor they do not** — the AT is in focus/forms mode, reading
text as the caret moves. So the containment stack is the editor's responsibility, and
almost no editor accepts it.

## Why this is worse than it looks

The failure is not one missing announcement. **A container has many independent entry
and exit vectors**, and an editor may handle one while silently failing the rest. An
editor that announces "blockquote" on autoformat entry, and nothing on arrow entry, has
*taught the user to trust a signal that is not reliable* — which is worse than silence,
because now they believe they are outside the quote when they are inside it.

The worked example (the owner's, in Lexical):

| Step | Caret ends up | Told? |
|---|---|---|
| Type `> ` + space | inside blockquote | sometimes |
| Type, Enter, type | still inside | n/a |
| Enter on a blank line | **outside** | **no** |
| Up-arrow | **back inside** | **no** |
| Up-arrow past the top | **outside** | **no** |
| Backspace from just below | **inside, editing it** | **no** |

Four unannounced state changes in one ordinary editing sequence. The user's mental model
and the document have silently diverged, and every subsequent keystroke compounds it.

## The vectors

Each is a distinct scenario and a distinct contract clause. **The same container must be
tested against every vector**, because they are implemented in different code paths and
fail independently.

### Entry vectors

| # | Vector | Notes |
|---|---|---|
| E1 | **Autoformat while typing** (`> `+space, ` ``` `, `- `) | the only one editors commonly notice |
| E2 | **Toolbar or keyboard command** | user asked, so state disclosure is the B2 problem |
| E3 | **Arrow-navigating in from above** | caret lands at the container's *first* position |
| E4 | **Arrow-navigating in from below** | caret lands at its *last* position — a different code path from E3 |
| E5 | **Backspace/Delete merging the caret in** | user was deleting, not navigating; least expected |
| E6 | **Paste landing inside** | |
| E7 | **Undo/redo restoring the container** | caret may be relocated too |
| E8 | **Enter creating a new sibling still inside** | *not* an entry — but must not be mistaken for an exit |

### Exit vectors

| # | Vector | Notes |
|---|---|---|
| X1 | **Enter on an empty last line/item** | the canonical escape hatch. **First question: does it exist at all?** Our own editor has no such branch — the regex matches the marker regardless of content, so the list is unbounded |
| X2 | **Arrow out past the top edge** | |
| X3 | **Arrow out past the bottom edge** | different code path from X2 |
| X4 | **Backspace at the very start** | removes the container or its marker — the *structure* changed, not just position |
| X5 | **Delete at the very end** | merges the following block in |
| X6 | **Toolbar/command removing the container** | |
| X7 | **Undo/redo** | |
| X8 | **Dedicated escape affordance** | Escape, Ctrl+Enter, arrow-past-widget; varies per editor |

Note X4 and X6 are categorically different from X2/X3: the caret did not move out of a
container, **the container ceased to exist around it**. Both need announcing, and they
need announcing *differently* — "left blockquote" versus "blockquote removed".

### Nesting

Depth is part of the state, not a separate concern. Quote inside quote, list inside
quote, code inside list. When depth changes without the container type changing —
Tab to nest, Shift+Tab to outdent — the **level** must be conveyed. `aria-level` carries
the state; nothing carries the change (see [layered-gap-analysis.md](../docs/the-gap.md)).

### Boundary-spanning selection

Shift+arrow across a container edge. The selection now spans two containment contexts,
which most editors represent internally but never convey.

## What must be announced

For a crossing, the minimum useful payload is:

1. **Direction** — entered or left.
2. **What** — the container type, localised ("blockquote", "code block", "list").
3. **Depth**, when nested or when depth changed.
4. **Position within**, where it is cheap and meaningful ("item 3 of 7").
5. **Whether the structure itself changed** — "left blockquote" (caret moved) is a
   different fact from "blockquote removed" (document changed). Conflating them is a bug.

And a rule that follows from the AT event-throttling findings: **announce crossings, not
positions.** Arrowing down ten lines inside one blockquote is one containment state and
must produce zero announcements. Only the transition speaks.

## Why this is a standards gap, not just an implementation gap

Everything above is **transition** information. ARIA can express the resulting state —
`role="blockquote"`, `aria-level` — and a screen reader will read it *if the user
navigates to it in browse mode*. Nothing in ARIA expresses "you just crossed a boundary",
so every editor that gets this right does so by synthesising an English sentence into a
live region.

This is the same shape as the rest of the gap analysis, and it is the highest-volume
instance of it: containment crossings happen constantly during ordinary editing, far more
often than autoformat conversions.

Worth noting for the platform mapping: Chromium *does* compute
`HIERARCHICAL_LEVEL_CHANGED` cross-platform, and drops it on Mac and Linux
(see [platform-api-mapping.md](../docs/platform-apis.md)). For the depth-change case
specifically, the browser has already done the work.

## Testing this

Each cell of vector × container × editor is one contract clause. That is a large matrix —
roughly 16 vectors × 6 container types × N editors — but it is mechanical, and the
harness already captures what is needed: caret position, the AX ancestry at the caret,
and live-region content at sync points.

The assertion shape:

> **Given** the caret is at `<position>` with containment stack `<stack-before>`,
> **when** `<vector>`, **then** the containment stack is `<stack-after>` **and** a
> crossing announcement conveying `<direction, container, depth>` was made exactly once.

Two derived assertions worth making explicit, because they catch the common failures:

- **No announcement when the stack is unchanged** (arrowing within one container).
- **An announcement on every stack change**, including the ones caused by deletion rather
  than navigation — E5, X4, X5 — which are the least-handled in practice.

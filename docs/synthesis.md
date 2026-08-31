# Cross-editor synthesis: what 586 scenarios show

**Status: synthesis, 2026-08.** Merges
[open-notebook.md](../corpus/inventories/open-notebook.md) (83),
[lexical.md](../corpus/inventories/lexical.md) (201) and
[ckeditor5.md](../corpus/inventories/ckeditor5.md) (302). All three read from source, not docs.

## The numbers

| Editor | Scenarios | Reaches the user | Container vectors | Of those, announced |
|---|---|---|---|---|
| **CKEditor 5** v48.4.0 | 302 | 58 (19%) — 26 announced, 32 via ARIA/platform | 100 | **21** (all one container) |
| **Lexical** v0.49.0 | 201 | 10 (5%) in source; **≈0% as deployed** | 70 | **0** |
| **Open Notebook** (@uiw md-editor) | 83 | ~0 | — | **0** |

CKEditor is the **best** performer surveyed. 81% of its scenarios still deliver nothing.

Lexical's figure needs the asterisk: `@lexical/a11y` (new in 0.49.0) is genuinely
well-built, but **every announcer is an opt-in extension**, and the legacy React API most
applications actually use (`RichTextPlugin`, `AutoLinkPlugin`) calls `registerRichText` /
`registerAutoLink` directly and receives **zero** announcements.

## Seven patterns that hold across all three

### P1 — Every editor already computes the answer, and shows it only to sighted users

- CKEditor's code block hooks `selection.on('change:range')` and diffs `focus.parent`.
- Lexical computes `blockType` / `rootType` on **every** selection change and renders it
  as a toolbar label.

Both know the containment stack continuously. Both spend it on a visual affordance.
**The missing piece is one hop to the accessibility layer** — not a computation, not an
architecture, one hop.

### P2 — Every editor has announcer infrastructure wired to almost nothing

| Editor | Infrastructure | Call sites |
|---|---|---|
| CKEditor | `AriaLiveAnnouncer` — regions primed at `ready`, one `<li>` per message, `aria-relevant="additions"` | **7**, across ~125 commands |
| Lexical | `@lexical/a11y` — correctly-lifecycled region, focus trap, roving tabindex | 4 announcers, **all opt-in** |
| Open Notebook | `LiveAnnouncer` (built in phase 0b) | **2**, neither an editing surface |

The plumbing is not the problem. Nobody calls it.

Worth noting: CKEditor's announcer independently arrived at **the same design this
project adopted** — region pre-existing, own DOM node per message, append-only. Two teams
converging separately is decent evidence the design is correct.

### P3 — Container boundaries are ~0% solved, and the fix is proven cheap

170 container vectors surveyed across two editors. **21 announced — all of them code
block, in CKEditor, one container out of nine.**

That one implementation is the existence proof: **twelve container-agnostic lines** cover
every entry and exit vector correctly. Blockquote (21 vectors) and lists (24) sit silent
in the same repository, next to working code that would fix them.

So the ask to editor maintainers is not "do a large amount of work". It is **"you already
did this correctly once — apply it to the other containers."**

### P4 — Pending format state is not merely unannounced, it is unqueryable

The Ctrl+B collapsed-caret case. There is **no node to inspect** in any editor:

- CKEditor: state lives on `ModelDocumentSelection`; reaches AT only as `aria-pressed` on
  a toolbar button the user is not focused on.
- Lexical: a bitfield on `RangeSelection`, rendered as a **CSS class only** — no
  `aria-pressed` on any of ~14 format buttons, though two other extensions in the same
  codebase do use it.
- Open Notebook: no bold state exists at all; Ctrl+B inserts literal `**` characters.

This is the hardest standards gap in the corpus — the state concerns text that does not
yet exist.

### P5 — Menus are broken everywhere, but differently

- CKEditor's mention package: `grep -rn "aria\|role"` returns **no matches**. Highlight
  is a CSS class. Emoji and Slash Commands inherit it.
- Lexical's typeahead: option ids are positional and each filter keystroke calls
  `setHighlightedIndex(0)` rather than `updateSelectedIndex(0)`, so
  **`aria-activedescendant` never changes while the user types**. No result count.

This is the **implementation** gap: the combobox pattern is well specified. Nobody
follows it.

### P6 — Editors disagree with each other, and internally, on the same operation

Lexical alone ships **three incompatible Enter contracts**:

| Container | Enter behaviour |
|---|---|
| Blockquote | **any** Enter exits, dragging trailing text out — no empty-line rule at all |
| Code block | requires **two** blank lines |
| List | requires **one** empty item; nested drops a level instead of leaving |

Three containers, one editor, three rules, none announced. A user cannot learn this by
exploration, and what they learn in one editor is wrong in the next. **This is the
argument for a standard**, stated more sharply than any single failure.

### P7 — Some failures are structural, and no announcement can fix them

- Lexical's `CollapsibleContainerNode` renders `<div open="">` on Chrome and Firefox —
  no disclosure semantics, orphaned `<summary>`.
- Open Notebook's markdown textarea produces **no list at all** — just the characters
  `- `. Nothing to navigate afterwards.
- CKEditor's multi-cell table selection has **no DOM selection**, so AT reporting is
  *wrong*, not merely absent.

Keep these in a separate column. An editor that is silent about correct structure is a
different (and better) failure than one whose structure is a lie.

## Priority

Your ordering — automated conversion, then toggle state, then menus — holds. One
refinement from the data:

**Containment is not a fourth item competing with the first.** `> ` + space is
*simultaneously* a B1 automated conversion and a container entry vector. Specifying A1–A6
properly means specifying containment entry anyway. They are the same work.

| Rank | Class | Why | Gap type |
|---|---|---|---|
| **1** | **B1 + container entry/exit** | Highest volume; ~0% solved; unrequested *and* silent; CKEditor proves the fix is ~12 lines | Standards |
| **2** | **B2 state disclosure** | High frequency; collapsed-caret case has no DOM anchor at all — the hardest and most novel gap | Standards |
| **3** | **B3 menus** | Most fixable (pattern exists), least novel; conformance tests and bug reports rather than proposals | Implementation |
| **4** | Structural (P7) | Prerequisite for the others where it bites, but editor-specific bugs rather than a class | Implementation |
| later | Emoji pickers; full custom canvas | Deferred by explicit decision | — |

## What to do next

1. **Merge to canonical scenario IDs.** `> ` → blockquote is *one* scenario with three
   implementations. Cross-reference the three inventories into a single table keyed by
   canonical id, with a column per editor. This is the publishable comparison.
2. **Instantiate the invariants** from
   [conformance-suite-design.md](../contract/invariants.md) against the merged data —
   the eight containment invariants first, since they cover 170 of the surveyed vectors.
3. **Build the editor adapters** (Lexical, CKEditor, our own) so the existing harness runs
   the same suite against all three.
4. **Fix our own editor against the contract.** We have the worst result of the three and
   an unwired announcer. Doing it against a written contract rather than ad hoc is both
   better work and a better story.
5. **Write the vocabulary module** — the semantic tokens announcements must convey. This
   is also the input the standards proposal needs.
6. **Take the strongest proposal forward**: a `kind` enum on `ariaNotify`, argued from the
   NVDA `activityId` precedent (see [platform-api-mapping.md](platform-apis.md)).

## The one-paragraph version

Three editors, 586 editing scenarios, read from source. The best of them leaves 81% of
them silent; the most-deployed leaves ~100%. Every one of them already computes the
information a screen-reader user needs — for the toolbar — and none of them send it to the
accessibility layer. Every one has working announcement infrastructure connected to
almost nothing. Container boundaries, the highest-volume class, are ~0% solved despite one
editor demonstrating the complete fix in twelve lines. And where editors do act, they
disagree: one editor ships three different Enter contracts for three containers. The
failure is not effort or capability. It is that **nothing tells anyone what the target
is**, which is precisely what a contract, a conformance suite, and an ARIA proposal exist
to supply.

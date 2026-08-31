# Conformance suite design: how the matrix reduces to patterns

**Status: design, 2026-08.** The goal: **one suite that runs against any HTML editor**,
where adding an editor is a single adapter file and adding a scenario is data, not code.

## The problem with the matrix

Stated naively the containment corpus alone is ~16 vectors × ~6 container types × N
editors — hundreds of cells. Hand-writing an assertion per cell would produce a suite
nobody maintains, that drifts, and that cannot be pointed at a new editor.

**It reduces.** The cells are not independent facts; they are instances of a small number
of invariants. Write the invariants once, parameterise them over declarative data, and
the matrix is *generated*.

## The three layers

```
INVARIANTS          ~20 parameterised assertions. Written once. Editor-agnostic.
      ↓ instantiated over
SCENARIO DATA       containers × vectors × operations. Declarative. No code.
      ↓ executed against
EDITOR ADAPTERS     one file per editor: how to mount it, how to perform an
                    operation, what it claims to support. The only per-editor code.
```

A new editor costs **one adapter**. A new scenario costs **one data row**. Neither costs
a new assertion.

## The invariants

### Containment (replaces the 16 × 6 matrix)

| # | Invariant | Parameterised over |
|---|---|---|
| C-1 | A vector that **changes** the containment stack announces the crossing exactly once, conveying direction + container type | container × vector |
| C-2 | A movement that **does not** change the stack announces **nothing** | container × movement |
| C-3 | Entering a container announces the same container identity **regardless of which entry vector** was used | container × {E1…E8} |
| C-4 | Leaving announces the same identity regardless of exit vector | container × {X1…X8} |
| C-5 | A vector that **destroys** the container announces *removal*, distinctly from a vector that merely **leaves** it | container × {X4, X6} vs {X2, X3} |
| C-6 | A depth change with no container-type change conveys the **new depth** | nestable containers × {Tab, Shift+Tab} |
| C-7 | Every container has **at least one keyboard exit that destroys no content** | container |
| C-8 | The containment stack reported by the AX tree **matches** the stack the announcements imply | container × any vector |

Eight invariants cover the whole containment corpus. C-3 and C-4 are the ones that catch
the real-world failure — an editor that announces autoformat entry but not arrow entry
fails C-3 while passing C-1 for its favoured vector.

C-8 is the cross-check that stops an editor passing by announcing things that aren't
true.

### Automated conversion (B1)

| # | Invariant |
|---|---|
| A-1 | A typed sequence the editor transforms announces **what it became** |
| A-2 | The transformed result is **structurally real** in the AX tree (not just visually) |
| A-3 | The transformation is **undoable**, and the undo is announced |
| A-4 | Typing that is *not* transformed announces **nothing** (no false positives) |

### Toggle / state disclosure (B2)

| # | Invariant |
|---|---|
| T-1 | A toggle command announces the **resulting state**, not the action ("bold on", never "bold pressed") |
| T-2 | With a selection, the announcement conveys **what the change applied to** |
| T-3 | With a collapsed caret, the announcement conveys that the state is **pending for subsequent input** |
| T-4 | Moving the caret into or out of a formatted run **updates the reported state** |
| T-5 | The toolbar's exposed pressed-state **agrees** with the announced state |

T-3 is the case with no DOM anchor at all, and T-5 is the cheap cross-check.

### Menus (B3)

| # | Invariant |
|---|---|
| M-1 | Focus **remains on the input**; the list never takes focus |
| M-2 | Opening announces that a menu appeared **and how many options** |
| M-3 | Each filter keystroke announces the **updated count** and the **active option** |
| M-4 | Arrow navigation announces the newly active option **and its position in set** |
| M-5 | Commit announces **what was inserted** |
| M-6 | Dismissal announces the dismissal and **focus is where the user expects** |
| M-7 | The combobox↔listbox↔option relationships are wired per the ARIA pattern |

## Editor adapters — the only per-editor code

```js
export default {
  id: 'lexical',
  label: 'Lexical (playground config)',

  // Mounting
  mount: 'subjects/lexical.html',
  editorSelector: '[contenteditable="true"]',

  // Capability declaration — drives N/A vs FAIL
  supports: ['blockquote', 'codeblock', 'bulletList', 'orderedList',
             'checkList', 'table', 'nesting', 'inlineFormat', 'typeahead'],

  // How to perform operations this editor claims to support.
  // Prefer real keystrokes; a command hook is a documented fallback.
  operations: {
    enterBlockquote: { type: '> ' },
    enterCodeBlock:  { type: '``` ' },
    toggleBold:      { press: 'Control+b' },
    nest:            { press: 'Tab' },
  },

  // How to recognise containment in THIS editor's DOM, when the AX tree
  // is not sufficient on its own.
  detect: {
    blockquote: (ax, dom) => /* ... */,
  },
}
```

**Capability declaration is what makes the comparison fair.** An editor that does not
implement blockquote scores `N/A`, not `FAIL`. Without this, a minimal editor looks worse
than a feature-rich one that handles its features badly — which would invert the finding.

## The hard part: matching announcements semantically

Announcements are free text, so a regex per clause makes editors pass or fail on wording
accidents. That does not scale to a public conformance suite.

The design, borrowed from ARIA-AT V2:

- Each invariant declares a **semantic expectation**, not a string:
  `{ conveys: ['direction:entered', 'container:blockquote'] }`.
- A shared, versioned **vocabulary module** maps each semantic token to accepted surface
  forms, per locale (`container:blockquote` → `/blockquote|block quote|quote|quotation/i`).
- The vocabulary is **suite-owned and public**, so an editor can be tested against it,
  argue with it, and contribute to it — rather than each clause encoding one author's
  phrasing.
- Assertions record **which token failed**, so a report says "did not convey the
  container type", not "regex did not match".

This also produces a useful artefact in its own right: **a documented vocabulary of what
editing transitions must convey**, which is precisely the input a standards proposal
needs.

## What "fully automated across any editor" requires

1. **Invariants implemented once** as parameterised predicates (~20 above).
2. **Scenario data** as declarative tables — containers, vectors, operations.
3. **An adapter per editor**, with capability declaration.
4. **A vocabulary module**, versioned and public.
5. **Offline subjects** — each editor vendored as a self-contained page, no network.
6. **A report format** with per-invariant, per-editor, per-capability results, plus
   `N/A` handling, and a stable machine-readable form for tracking over time.

Items 1, 5 and part of 6 exist today in `harness/`. Items 2, 3 and 4 are the refactor the
harness agent identified: lift the inline `kind: 'rich' | 'plaintext'` branching into
predicates, and lift per-clause regexes into the vocabulary.

## Why this is the valuable artefact

A study says "these five editors are bad". A suite says **"here is the contract, here is
how you measure yourself against it, and here is your score"** — and it keeps saying it
after we stop looking. It is also the natural vehicle for the standards work: every
invariant that can only be satisfied by synthesising a string is, by construction, a
documented gap in ARIA (see [layered-gap-analysis.md](../docs/the-gap.md)).

The precedent is ARIA-AT, which does exactly this for APG widgets against real screen
readers. This is the editor-shaped counterpart, and — because it measures what the
browser was told rather than what an AT said — it runs headless on Linux in CI, which
ARIA-AT cannot.

# Lexical work plan — proving the system on a real editor

**Status: plan, ready to execute. 2026-08-28.**

Lexical is the first editor from [METHOD.md](method.md)'s roster. This is the ordered
programme: which shapes, in what order, and what the tooling does for each.

---

## 1 · What Lexical's maintainers have already decided

This matters more than anything we would have proposed, because it means we are **joining
a direction rather than arguing for one**.

From the review of [#8908](https://github.com/facebook/lexical/pull/8908) (merged
2026-08-13), maintainer `etrepum`:

> **"Announcers live with their node."**
> **"Accessibility is the default."**

The contributor had put `HeadingAnnounceExtension` in `@lexical/a11y`, where an integrator
would have to opt in. The maintainer required it moved into `@lexical/rich-text` beside
`HeadingNode`, with the dependency **inverted** so `@lexical/rich-text` depends on
`@lexical/a11y` — and `RichTextExtension` now pulls the announcer in automatically. An
integrator turns it *off* with a `disabled` signal rather than turning it *on*.

Verified in the shipped nightly, `LexicalRichText.dev.mjs:311`:

```js
RichTextExtension.dependencies = [HeadingAnnounceExtension, DragonExtension, …]
```

**This is the architecture we would have asked for, already adopted.** Our contribution is
not the idea — it is the **measurement**: which shapes are covered, which are not, and
whether the ones claimed to work actually reach a screen reader.

There is a second maintainer principle worth recording, from
[#8929](https://github.com/facebook/lexical/pull/8929):

> *"Commands are a terrible way to represent state because their initial state can't be
> observed and propagation isn't guaranteed."*

Signals over commands for anything a later reader must be able to query. That is the same
instinct as our own no-timers rule: **observe state, do not hope an event arrived.**

---

## 2 · The two subjects, and why both are needed

| Subject | What it is | Why |
|---|---|---|
| `lexical-stock` | `lexical@0.49.0` stable, legacy React plugins (`LexicalComposer` + `RichTextPlugin` + …) | **What most applications ship today.** The documented React getting-started path. |
| `lexical-next` | `0.49.1-nightly`, extension API (`buildEditorFromExtensions([RichTextExtension, …])`) | **Where accessibility-by-default lives.** Nothing opts in; the announcer arrives as a dependency. |

The gap between these two columns is the most useful number this project can give Lexical:
**how much of the new work reaches a real integration, and how much is stranded behind an
API migration most teams have not made.**

Measured, first result:

| | `lexical-stock` | `lexical-next` |
|---|---|---|
| `heading.create.structure` | PASS | PASS |
| `heading.create.announcement` | **FAIL** — silent | **PASS** — `[polite] "Heading level 1"` |
| `heading.create.announcement-level` | FAIL | PASS |

**#8908 works.** Independently verified from outside the project, in a real browser, by
reading Chromium's accessibility tree — not by trusting the test suite that shipped with
it. That is the first thing this system has proved about somebody else's code.

---

## 3 · Announcer coverage today

Grepped from the nightly:

| Announcer | Package | Ships by default? |
|---|---|---|
| `AriaLiveRegionExtension` | `@lexical/a11y` | via `RichTextExtension` |
| `HeadingAnnounceExtension` | `@lexical/rich-text` | **yes** |
| `AutoLinkAnnounceExtension` | `@lexical/link` | with `AutoLinkExtension` |
| `HistoryAnnounceExtension` | `@lexical/a11y` | opt-in |
| `EditorModeAnnounceExtension` | `@lexical/a11y` | opt-in |

**Four announcers.** The corpus holds **174 Lexical scenarios**. That ratio is the work.

---

## 4 · The order of shapes

The owner's ordering — take one *shape* at a time, prove it, move on — with upstream state
against each.

| # | Shape | Upstream | Our job |
|---|---|---|---|
| **S1** | `# ` → heading | **merged** #8908 | ✅ clause written, **verified passing**. Lock it with a baseline so a regression is caught. |
| **S2** | URL → link | **merged** #9071 (`AutoLinkAnnounceExtension`) | Write the clause. Confirm it fires in a default integration, not only when `AutoLinkExtension` is added. |
| **S3** | `> ` → quote | **open** #9070 | Write the clause **now**, against the unmerged branch. A failing clause on `main` plus a passing one on the PR branch is review evidence the maintainers do not currently have. |
| **S4** | Typeahead menus | **open** #8929 | Clause for M-1…M-7. The open architectural question (table/menu coupling) is exactly the kind a measurement settles. |
| **S5** | `- ` / `1. ` → **list** | **nothing** | The highest-volume container in the corpus, and there is no announcer. Measured FAIL on both subjects. **This is the biggest single gap.** |
| **S6** | ` ``` ` → code block | nothing | Container entry/exit; CKEditor's twelve-line pattern applies directly. |
| **S7** | `- [ ] ` → checklist | nothing | Adds state (checked/unchecked) on top of containment. |
| **S8** | Container **entry and exit** by arrow, backspace, undo, paste | nothing | The C-3/C-4 invariants: same identity regardless of vector. This is where the containment-stack diff earns its keep. |
| **S9** | `Ctrl+B` pending format at a collapsed caret | nothing | The hardest gap in the corpus — no DOM node to inspect. Expect to reach a standards limit, not a fix. |

**Do S5 next**, after locking S1. Lists are the highest-frequency structure in real
documents, the announcer does not exist, and the fix has an exact template in
`HeadingAnnounceExtension` sitting in the neighbouring package.

---

## 5 · The unit of work, per shape

Identical to [SCENARIO-TASKS.md](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/a11y/SCENARIO-TASKS.md)'s loop, pointed at someone else's repo.

1. **Write the clause first.** It must FAIL on both subjects. A clause that passes before
   the work is measuring the wrong thing.
2. **Measure both subjects.** The stock/next split tells us whether the gap is *missing
   work* or *stranded work*, and those need different upstream conversations.
3. **Implement** as an extension beside its node, following `HeadingAnnounceExtension`
   exactly — announcer with its node, depends on `AriaLiveRegionExtension`, added to the
   owning extension's `dependencies`, `disabled` signal to turn off. **Do not invent an
   architecture; theirs is already decided.**
4. **Re-measure.** Clause flips on `lexical-next`. `results.json` records it; the corpus
   ticks itself.
5. **Baseline it** so a later change cannot silently undo it.
6. **Upstream it** — PR with the clause output as evidence: here is the assertion, here is
   the before, here is the after, reproducible with `node run.mjs`.

### What we contribute that a normal PR does not

A Lexical PR today says *"this announces headings now"* and the reviewer takes it on trust
or reads the unit tests. Ours can say: **here is the same claim, measured from outside the
library, in a real browser, against a written contract that every other editor is also
measured against.** That is a different kind of evidence, and it is the whole argument for
the system.

---

## 6 · Constraints

- **MIT** — Lexical is MIT and so are we. No licence friction, unlike CKEditor.
- **Their conventions win.** Signals over commands. Announcers beside nodes. Default on,
  `disabled` to opt out. Where their taste and ours differ, theirs decides — we are guests.
- **No timers**, per the no-timers rule in [AGENTS.md](../AGENTS.md), and it applies with more force here:
  a dropped announcement in a measurement harness is a **false PASS**.
- **Nightly is a moving target.** Pin the exact nightly in the subject's `package.json` and
  record it with every result, or the numbers are not reproducible.
- **We do not speak for Lexical.** Findings are measurements offered to maintainers, not
  verdicts on their project — and the plan says so because three of these shapes are
  already being fixed by the people we would be reporting them to.

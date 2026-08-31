# The method — the system, and how it meets each editor

**Status: strategy, 2026-08.** The per-editor fixes are demonstrations. **The system is
the product.** This file says what the system is, how it is applied to an editor, and how
the licence of that editor changes what we do rather than whether we do it.

---

## 0 · The goal that governs the rest

> **The system must be portable and usable by any company, anywhere, without us.**

Not "open source" in the sense of a repository someone can read — open source in the sense
that **an editor team can point their own agents at their own codebase and get the same
result we get, without asking us for anything.** That is the difference between publishing
a study and publishing a capability.

Concretely, it must hold that:

- **No step requires us.** The detector is a written prompt, not a service. The contract is
  a file. The suite is `node` and a Chromium. Nothing phones home, nothing is hosted, no
  account is needed.
- **The agent instructions are artefacts, not folklore.** The pass that produced the 586
  findings must be a checked-in, versioned prompt anyone can run and criticise — not a
  description of what we once did in a chat window.
- **It works on a codebase we have never seen.** If it only works on the four editors we
  happened to look at, it is a study wearing a system's clothes.
- **Disagreement is settled by re-running it, not by asking us.** A maintainer who thinks a
  row is wrong should be able to prove it themselves.
- **A vendor can run it privately.** Some teams will want their score before anyone else
  has it. That must be possible and unremarkable — it is how they end up trusting it.

This is why the licence posture matters so much: a system that a company cannot adopt
because of its licence is not portable, whatever its README says. And it is why a GPL
editor is still fully served by this work even though we will not patch it — **they can
run the whole system themselves**, on their own code, under their own terms.

Everything below is in service of this. Where a decision trades convenience for
portability, portability wins.

---

## 1 · The system

Six parts. Each is reusable; none is about a particular editor.

| # | Part | What it does | Where it lives |
|---|---|---|---|
| 1 | **Detector** | An agent pass over an editor's source that enumerates every operation changing the document, moving the caret, or opening a menu — and what, if anything, reaches the user | `corpus/inventories/` |
| 2 | **Corpus** | Those findings merged on **user intent**, so `> ` + space is one scenario with N implementations | `corpus/canonical.md` |
| 3 | **Contract** | ~20 parameterised invariants the scenarios instantiate | `contract/` |
| 4 | **Suite** | Headless measurement in a real browser: adapters, subjects, baseline, `--check` | `suite/` |
| 5 | **Fix patterns** | The reusable shapes — diff the containment stack, one app-owned announcer, announce transitions not positions | `docs/patterns.md` *(to write)* |
| 5b | **Agent prompts** | The detector pass, the fix pass and the review pass, as versioned files anyone can run against their own codebase | `agents/` *(to write — required by §0)* |
| 6 | **The loop** | Clause must FAIL → fix → clause PASSes → corpus ticks itself → baseline locks it | `suite/README.md` |

### The test of whether it is really a system

> **Editor N+1 must cost less than editor N.**

If adding Tiptap costs what adding Lexical cost, we have three studies, not a method. Each
editor should push work *down* into the shared parts: a new surface form goes into the
vocabulary, a new failure shape becomes an invariant, a new mounting quirk becomes adapter
config. **Track this explicitly** — hours per editor, and how many of its scenarios needed
new invariants versus reusing existing ones. It is the honest measure of the claim.

---

## 2 · The roster

Verified 2026-08-28 from the npm registry — downloads for week ending 2026-08-27, release
counts for calendar 2026.

| Editor | Licence | Weekly dl | 2026 releases | Verdict |
|---|---|---:|---:|---|
| **ProseMirror** | MIT | 19.6M | 9 | **Fix** — largest deployment |
| **Tiptap** | MIT | 18.4M | 48 | **Fix** — ProseMirror's dominant front end |
| **Lexical** | MIT | 5.0M | **167** | **Fix first** — see §4 |
| **Slate** | MIT | 3.2M | 14 | **Fix** — smaller, and openly admits its gap |
| Quill | BSD-3 | 8.0M | **0** | **Exclude — dormant.** Last release 2024-11-30 |
| CKEditor 5 | GPL-or-commercial | 1.3M | 463 | **Measure only** — §3 |
| TinyMCE | GPL-or-commercial | 1.2M | 11 | **Measure only** — §3 |
| Draft.js | MIT | — | 0 | **Exclude — dead.** Last release 2020-08-17 |

Two findings worth carrying into the summary:

- **Quill has 8.0M weekly downloads and has not shipped since November 2024.** A large
  install base on an unmaintained editor is its own accessibility story: nobody is going to
  fix it, so every application on it inherits whatever it does today. Measuring it is
  cheap and the result is permanent.
- **The two editors with real accessibility programmes are the two we cannot patch.**
  CKEditor and TinyMCE publish VPATs and state WCAG levels; every permissively-licensed
  option documents nothing or admits a gap. That inverse correlation is not a coincidence —
  accessibility programmes cost money, and these are the two with revenue.

---

## 3 · What GPL actually restricts, and what it does not

**Not legal advice.** An engineering reading, to be confirmed before anything is
contributed.

The instinct to keep our code MIT-only is right, but the *reason* matters, because being
wrong about it in either direction is costly:

| Activity | Restricted? |
|---|---|
| Reading GPL source and writing analysis about it | **No.** Our inventories and quotes are commentary, not derivative works. |
| Running our MIT suite against a GPL editor's build | **No.** Measurement is not linking, and we distribute nothing of theirs. |
| Shipping our suite with their build vendored inside it | **Yes — avoid.** This is the one that actually bites, and it is why the vendored bundle is being deleted. |
| Copying GPL code into our repo | **Yes — avoid.** |
| Writing a patch to their code and sending it upstream | **No, and this is the misconception worth naming.** A patch to GPL code is governed by *their* licence. It does not reach back and infect our separate suite. |

So "we cannot fix CKEditor because GPL" is **not accurate**. What is accurate:

1. **A dual-licensed project needs a contributor agreement.** CKEditor and TinyMCE sell
   commercial licences, so they need rights assignment to relicense contributions. That is
   a paperwork and policy question — *verify the exact terms before contributing* — and it
   is a much better reason to hold back than a licence-contamination fear.
2. **Effort is better spent where the leverage is.** CKEditor is already the best performer
   in the corpus at 21% and has a funded accessibility team. Lexical at 11%, with its
   announcers opt-in so the default React setup gets nothing, is where the same hours move
   more users.

**Do we need a separate repo to do GPL work?** No — not for measurement, and not for
patches. If we ever patch CKEditor, the workspace is a fork of *their* repository under
*their* licence, which is ordinary open-source practice and never touches ours. A separate
repo would be solving a problem we do not have.

### The engagement model for the two we do not patch

Measure them, publish the result, and **bring them the system rather than a complaint**:
here is the contract, here is the suite, here is your score, here is the agent pass that
produced it — run it yourselves. For a vendor with a real accessibility programme and
customers who ask for VPATs, a reproducible score against a public contract is a *useful
artefact*, not an attack. That is a better opening than a bug report, and it is the same
offer we would make to anyone.

---

## 4 · Order of work

**Lexical first**, and the reasons are additive rather than any one being decisive:

- It is the **worst performer** of the MIT set at 11%, and its announcers are opt-in, so
  the standard React integration most applications ship announces nothing at all.
- It is **the most actively developed thing on the list** — 167 releases in 2026 — so fixes
  land in a moving project rather than a frozen one.
- **Meta's own properties run on it**, so upstream fixes reach a very large number of
  people who never chose the editor.
- We already hold **174 Lexical scenarios** read from source. The map is drawn.
- The owner uses it in other projects, which is a legitimate input: the person carrying
  the work should get something back from it.

Then, in order: **Tiptap** (the largest real-world surface, and its ProseMirror core makes
it two editors for slightly more than one), **ProseMirror** directly (a library, not an
editor — its behaviour is whatever each integrator built, which is itself a finding),
**Slate** (smaller, and its maintainers already concede the gap, so the conversation starts
further along), then **Quill and CKEditor and TinyMCE as measure-only**.

**Open Notebook's role.** It is not on this list, because a bespoke markdown textarea is
not an editor anyone else ships. It is the **proving ground**: the place we run the whole
loop end to end before pointing it at somebody else's project. Under
[ADR-012](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/decisions/ADR-012-wysiwyg-worked-example.md) it becomes a Lexical integration,
at which point fixing it *is* the first Lexical demonstration rather than a detour from it.

---

## 5 · What to build next, in order

1. **Adapters** (`P0.5`) — until the suite can mount an arbitrary editor, everything above
   is a plan rather than a capability.
2. **Tiptap/ProseMirror inventory** (`P0.4c`) — the corpus's largest omission.
3. **`docs/patterns.md`** — part 5 of the system is the only one not yet written down, and
   it is the part an editor maintainer would most want.
4. **Contribution-terms check** for CKEditor and TinyMCE, so §3.1 is settled fact rather
   than a caveat.

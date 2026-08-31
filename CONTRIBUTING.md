# Contributing

One governing principle: **evidence beats assertion, and disputes are settled by
re-running rather than by arguing.** A maintainer's source reading carries no more weight
than yours; when two readings disagree, the tiebreak is a harness run, which is the
entire reason the harness exists. That principle is what lets a single maintainer run
this project without becoming a bottleneck or an arbiter of taste — so every
contribution, and every dispute, comes with the command that reproduces it:

```bash
cd suite
node run.mjs          # the comparison table, all subjects
```

A dispute without a reproduction command is an opinion. Include the command, the commit
it ran at, and the output.

There are three kinds of contribution, plus a fourth that is the most valuable thing
anyone can send.

## 1 · Add an editor adapter

The headline path, small enough to do in an evening.

- **One file**, `suite/adapters/<editor>.mjs`: `id`, `label`, `mount`, `editorSelector`,
  a `supports` capability list, and an `operations` map.
- If the editor needs a build, **one recipe** — a `suite/subjects/<editor>/build.mjs`
  like the Lexical and Tiptap ones — that installs the editor from npm at exact pins on
  the contributor's machine and emits a gitignored page into `suite/subjects/`. **No vendored build** — a PR adding a `.html` bundle to `subjects/` is
  closed with a pointer to the licensing analysis (see
  [ATTRIBUTION.md](ATTRIBUTION.md) and the repo proposal's §4.1 reasoning): a committed
  bundle is redistribution of every package inside it, and carries notice obligations we
  refuse to take on. If that policy ever changes, a generated `THIRD-PARTY.md`
  enumerating every bundled package's copyright and licence text becomes **mandatory,
  not optional** — which is the long way of saying it will not change.
- Attach the report the adapter produces (`--md` renders it for pasting).

Merge criteria:

1. It runs on CI (Linux, Node 22, Chromium) without network access at run time.
2. **The capability declaration is honest.** This is the only way to game the suite —
   declaring `supports` you do not implement converts `FAIL` into `N/A` — so say plainly:
   `supports` is a claim, invariant C-8 and the preflight cross-check part of it, and an
   adapter found overstating capability is corrected in place with a note in
   `corpus/CHANGELOG.md`.
3. Operations use **real keystrokes** wherever the editor supports them. A command-hook
   fallback is allowed and must be documented in the adapter, because it measures
   something weaker.

**If you work on one of the editors measured here and think a score is wrong about your
editor: an adapter is the fastest correction, and we will publish your score at your
commit.** An adapter from an editor's own engineers is the best possible outcome for this
project.

## 2 · Propose a vocabulary term

The vocabulary maps semantic tokens (`container:blockquote`) to accepted surface forms
per locale. It exists so editors are not failed on wording accidents, and it is the
artefact a standards proposal will need.

- A PR against the vocabulary — [`suite/vocabulary.mjs`](suite/vocabulary.mjs) today;
  extracting it to per-locale `contract/vocabulary/*.yaml` data files is on the
  [ROADMAP](ROADMAP.md).
- **A new surface form** is accepted if a real shipping editor produces it and a
  competent screen-reader user would understand it. Cite the editor. This is a low bar on
  purpose: the point is not to police phrasing.
- **A new token** requires naming at least one canonical scenario that cannot be
  expressed with existing tokens. This is a higher bar, because tokens are what the
  contract is written in.

## 3 · Contest a canonical scenario

Anyone may say a row is wrong. File the issue with the `CAN-…` id, the editor, the claim
being contested, and the evidence — a `project@commit path:line`, or a harness report.

- A maintainer's source reading carries **no more weight** than a vendor's. If the two
  disagree, the tiebreak is a harness run.
- Outcomes: the row is corrected · the row is split (two editors were doing genuinely
  different things) · a status changes (`silent` → `announced`, or the important one,
  `silent` → `n/a`) · the contest is rejected with a stated reason.
- **Every accepted change is recorded in `corpus/CHANGELOG.md` against a corpus
  version.** A citation to `CAN-CB-012` at corpus v1.2 must keep meaning what it meant,
  so rows are versioned and never silently edited.

## 4 · A measured result that contradicts a source-read prediction

The most valuable thing anyone can send. The project's central methodological bet is
that reading the source predicts what the editor actually does; `docs/evidence.md`
separates `source` from `measured` and flags unmeasured predictions as the known
weakness. A contradiction arriving from outside is the cheapest possible way to find
out. Use the contest-scenario route above with the "measured" checkbox, attach the run,
and the outcome is recorded in `corpus/CHANGELOG.md` **whichever way it lands** —
including when the source reading was right, because a confirmed prediction is evidence
too.

## Review: what gets a suite PR rejected

**Never use a timer to solve a race condition.** `setTimeout`, `sleep`, "wait 150 ms and
hope" is a guess, not synchronization, and it is an automatic rejection in review — no
exceptions, no "just for now". The full statement and the alternatives (observe the
actual event: CDP events, `MutationObserver`, promise resolution, the platform's
ordering guarantees) are in [AGENTS.md](AGENTS.md); read it before touching `suite/`.
The reason it is absolute *here*, of all places: the suite exists to observe
accessibility events, and **a dropped event is a false PASS** — we would tell an editor
maintainer their surface is accessible because our harness missed the evidence that it
is not. A flaky green is worse than a red. If a delay's justification is "so X happens
before Y", the review response is the name of the signal you should have observed
instead.

Also rejected on sight: a vendored editor build (see kind 1); a claim without a pinned
`project@commit path:line` citation; code copied from a GPL or LGPL project
([ATTRIBUTION.md](ATTRIBUTION.md) names the specific temptations); hand-edits to
generated files (`corpus/scenarios.md` is generated — ticks are never typed).

## Versioning duty

**Changing the contract or the vocabulary is a versioned act.** A new accepted surface
form, a new token, a renamed or removed token, a tightened invariant — each rescores
every editor that has ever been measured, and someone has cited those scores. So the
change itself carries the bump:

- Adding a surface form or a token is a **minor** bump.
- Removing or renaming a token, or tightening an invariant, is a **major** bump.
- Every bump is recorded in `contract/CHANGELOG.md` (corpus row changes in
  `corpus/CHANGELOG.md`), saying what it changes for existing scores.
- Every published report records the vocabulary and contract version it ran against; a
  score without one is not comparable.

If your PR changes a file under `contract/` and does not bump a version and add a
changelog entry, it is incomplete.

## Process, kept deliberately thin

- **DCO sign-off** (`Signed-off-by:` — `git commit -s`), not a CLA. One line in a
  commit, standard, no paperwork from your employer — which matters here precisely
  because adapters may come from employees of the vendors being measured.
- **No RFC process, no working group, no meetings.** Issues and pull requests.
- **Measurements are dated and pinned.** Nothing in the corpus is ever presented as the
  current state of an editor; it is what that editor did at that commit on that date.

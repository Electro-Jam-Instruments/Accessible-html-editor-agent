# Editing Surface Contract — agent rules

This repository is a **behavioural accessibility contract for HTML editing surfaces**,
plus the corpus of scenarios it is derived from and a suite that measures any editor
against it. It is evidence, a specification, and a test runner. It is not an application.

Read [`README.md`](README.md) first — it is the whole argument, and it is the same document
every human reader gets.

## The five directories, and what each demands of you

| Directory | Contains | The bar |
|---|---|---|
| `docs/` | The argument. Prose. | No normative claims. If you find yourself writing MUST, it belongs in `contract/`. |
| `contract/` | What an editor is measured against. | Normative. Every clause needs an invariant and a rationale. Changing one **rescores every editor** — see versioning below. |
| `corpus/` | The evidence. One row = one thing a user did. | Every row cites a source inventory row. Rows are collapsed on **user intent**, never implementation. |
| `suite/` | The runnable measurement. | Zero runtime dependencies. Node + Chromium, nothing else. |
| `research/` | Provenance. Spikes, raw logs. | Append-only in spirit. Do not tidy a finding into agreement with a later one — correct it in place and date it. |

## Hard rules

### Never use a timer to solve a race condition

`setTimeout`, `sleep`, "wait 150 ms and hope" is not synchronization. It is a guess. Using
one to paper over a race is an automatic rejection in review — no exceptions, no "just for
now".

A timed delay is wrong in both directions at once: too short and the thing you waited for
still has not happened; too long and you have added latency and *still* have the race,
because you fixed nothing — you only made the failure rarer and harder to reproduce.

This matters more here than almost anywhere. The suite exists to observe accessibility
events, and **a dropped event is a false PASS**: we would tell an editor maintainer their
surface is accessible because our harness missed the evidence that it is not. A flaky
green is worse than a red.

Instead: observe the actual event (CDP events, `MutationObserver`, promise resolution,
framework lifecycle); give each unit of work its own identity so nothing races for one
slot; use the platform's ordering guarantees. **If you genuinely cannot observe
completion, the design is wrong** — fix the design or expose a signal.

Fine, and not what this rule is about: debouncing user input, animation durations,
human-perceptible delays, polling an external system that offers no push mechanism.

### `n/a` is never `silent`

An editor that does not implement blockquote scores `n/a` on blockquote rows. An editor
that ships blockquote and says nothing scores `silent`. Conflating them makes the most
minimal editor look like the most accessible one, which inverts the entire comparison.
This is the single most important correctness property of the corpus. Any code, table or
summary that merges the two is broken.

### Measured and claimed are different words

- **measured** — the suite ran it and the browser produced the evidence. `results.json`
  is the artefact.
- **source** — read from an implementation at a pinned version. Predicts behaviour; does
  not observe it.
- **inferred** — reasoned from the above. Must be labelled wherever it appears.

Never promote one to the next. [`docs/evidence.md`](docs/evidence.md) is the register, and
a claim not in it should not be in the README.

### Ticks are generated, never typed

`corpus/scenarios.md` is generated from `corpus/canonical.md` plus one or more
`results.json`. Do not hand-edit it. A checklist a human maintains is a checklist that
eventually describes what we believe rather than what happened.

### Ship no third-party build

Editor subjects are **recipes that build on the user's machine**, never artefacts checked
in here. CKEditor 5 is GPL-or-commercial; Lexical is MIT; both are read as source and
quoted as analysis, never vendored. See [`ATTRIBUTION.md`](ATTRIBUTION.md).

### Changing the contract or the vocabulary is a versioned act

A new accepted surface form, a renamed semantic token, a tightened invariant — each
rescores every editor that has ever been measured. Bump the version, record it in
`contract/CHANGELOG.md`, and say what it changes for existing scores. Someone has cited
this.

## Commands

```bash
cd suite
node run.mjs                    # the comparison table, all subjects
node run.mjs --check                  # gate one subject against its baseline
node run.mjs --check --accept     # after a real fix, move the baseline
```

`run` reports; `--check` gates. Keep them distinct. Most subjects are red **on purpose** —
that is the finding, not a regression — so a plain run must never fail a build.

## What we do not claim

Say this plainly whenever it is relevant, including in commit messages and issue replies:

- **Browser-told, not user-heard.** The suite observes what the browser was told. It does
  not observe what a screen reader said.
- **No screen reader has been validated against.** Tasks needing one are
  `awaiting-human`, never `done`.
- **No user testing.** None of this substitutes for blind users using these editors.

Overstating any of these is the fastest way to lose the argument with the audience that
matters.

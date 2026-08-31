# Roadmap

Open work, in rough priority order. Statuses are honest: nothing here is claimed done
until it is measured or shipped. Items marked **🧑 human** need a person — usually a
screen-reader session — and are never closed by automation.

## Measurement (the corpus's known weakness first)

- **Measure CKEditor 5.** The corpus's CKEditor column is source-read, not measured.
  Build a recipe subject (`suite/subjects/ckeditor5/build.mjs` — GPL editor, so the
  recipe installs it on the user's machine and nothing is redistributed; see
  [ATTRIBUTION.md](ATTRIBUTION.md)) and an adapter. Prediction placed on record before
  measuring: code-block *entry* announces, but the language name is told-only.
- **Measure Quill** (measure-only subject; no fixes planned).
- **Merge the Tiptap column into the canonical set.** The inventory
  ([corpus/inventories/tiptap.md](corpus/inventories/tiptap.md)) is measured but its 123
  rows are not yet merged into [corpus/canonical.md](corpus/canonical.md).
- **Unify vocabulary variants** `container:codeblock` vs `container:code-block` and the
  `position:2` forms — with a zero-diff proof that no subject's score changes.
- **Make redo-reapply conditional on undo having moved** — the one known corpus wart:
  today the trivial redo passes vacuously when undo did nothing.

## Suite ergonomics (what makes it usable by strangers)

- **Browser discovery.** `driver.mjs` honours `$HARNESS_CHROME` but its default is a
  machine-local path. Replace with an ordered, dependency-free probe: `--chrome` flag →
  env var → an existing Playwright/Puppeteer cache → platform install paths → a clear
  failure naming the install command. Record the full browser version string in every
  report.
- **CLI shape.** Split `run` (reports, exits 0) from `check` (gates, exits non-zero),
  add `explain <CAN-…>`, `--md` report output for pasting into an upstream issue, and a
  `package.json` `bin` so `npx` works. Today the suite is `node suite/run.mjs` with
  flags — fully functional, but the newcomer's first run should not look like a crash
  when red is the expected finding.
- **Extract the vocabulary to data.** `suite/vocabulary.mjs` → per-locale
  `contract/vocabulary/*.yaml`, semver-versioned (a token change rescores every editor).
- **Machine-readable corpus.** `corpus/canonical.yaml` alongside the rendered
  `canonical.md`, diffable and citable.
- **Issue templates** for the three contribution kinds in
  [CONTRIBUTING.md](CONTRIBUTING.md) (adapter · vocabulary term · contest a scenario,
  with a "measured" checkbox).

## Upstream (fixes flow to editors, not to this repo)

- **Lexical list announcer.** No configuration of Lexical we measured announces list
  creation/exit/destruction — exactly the extension point the maintainers' own
  announcer-per-node direction calls for. Blocked behind the open upstream PRs
  (facebook/lexical#9070 quotes, #8929 typeahead); design sketch: announce from a
  stack-diff on selection change, with the entry-parity clause as acceptance.
- **Upstream bug reports** from the corpus: CKEditor's five concrete defects; Lexical's
  `CollapsibleContainerNode` and typeahead `aria-activedescendant`.
- **Standards proposal:** a `kind` enum on `ariaNotify`, argued from the NVDA
  `activityId` precedent (see [docs/platform-apis.md](docs/platform-apis.md)).

## Validation (🧑 human)

- **NVDA validation** that contract-passing predicts a good experience. The suite
  measures browser-told, not user-heard; this is the bridge, and no automated task may
  claim it.
- **Windows UIA verification:** does Chromium map `<blockquote>` → `StyleId_Quote` and
  `<ul>`/`<ol>` → the list styles? Needs a real UIA inspector on Windows.
- **User testing with blind users.** Nothing in this repository substitutes for it.

## Publication mechanics

- npm publish of the suite (convenience only; `git clone` + `node suite/run.mjs` stays
  the equal path).
- Zenodo archive of a tagged release for a citable DOI.
- Full custom-canvas editing surface as a future subject (a partial project exists to
  link).

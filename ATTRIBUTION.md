# Attribution

This project reads other people's source code and says what it does. That is the whole
method: the corpus, the contract and the harness are built on close readings of shipping
editors, browsers and screen readers, cited by path, symbol, line number and pinned
version. This file records every third-party project whose source was read, the licence
each is under, and the posture that keeps the practice defensible.

This file applies to this repository as it stands, and travels with the work if it is
extracted into a standalone repository (see [MIGRATION.md](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/a11y/MIGRATION.md) step 7 —
in the extracted repo this file lives at the root as `ATTRIBUTION.md`).

## The posture, stated plainly

- **Short excerpts, quoted as analysis and commentary.** Where a project's code is
  reproduced at all, it is a signature, a constant, a condition, or a few lines that
  carry the point — quoted at a pinned version, for the purpose of technical analysis
  and criticism, in the same form a security advisory, a bug report or a code review
  takes. Most of the corpus is not quotation at all: it is our own tabulation of facts
  about behaviour (which call sites exist, what a handler does, how many announcements a
  package makes), and facts are not copyrightable.
- **Nothing is vendored or redistributed.** No third-party build, bundle or source file
  is checked into this repository. Harness subjects that wrap a real editor are built on
  the user's own machine, from the user's own installed `node_modules`, by a recipe
  script we wrote (`harness/subjects/build-*.mjs`, `harness/subjects/*/build.mjs`).
  Running the suite against an editor on your machine is *use*; licence obligations
  attach to *conveying copies*, and the suite is designed so that we never convey a copy
  of anything. The reasoning is worked through in
  [REPO-PROPOSAL.md](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/a11y/REPO-PROPOSAL.md) §4.
- **Trademarks.** All trademarks and product names — including CKEditor, Lexical, NVDA,
  JAWS, VoiceOver, Orca, Chromium, WebKit — belong to their respective owners. Naming a
  product here is nominative: it identifies what was measured. It is not endorsement of
  this work by any project named, and no project listed here is affiliated with or has
  endorsed this work.

## Projects read and quoted

Each row names the licence file or field actually read to verify the licence claim, and
where in this repository the project's source is quoted or its behaviour tabulated.

| Project | Licence | Read at | What we take | Quoted / tabulated in |
|---|---|---|---|---|
| [Chromium](https://chromium.googlesource.com/chromium/src) | BSD-3-Clause (root `LICENSE` at tag `141.0.7390.37`; the tree also carries other licences under `third_party/`) | 141.0.7390.37, plus cited files | Behaviour of the CDP accessibility agent, the Blink AX tree, AuraLinux/AT-SPI event emission; readiness-gating flags | [chromium-ax-observation.md](docs/observing-chromium.md), [platform-api-mapping.md](docs/platform-apis.md), [platform-rescue.md](docs/platform-rescue.md), [EVIDENCE.md](docs/evidence.md) |
| [WebKit](https://github.com/WebKit/WebKit) | Per-file BSD-style headers (read on `Source/WebCore/editing/Editor.cpp`); parts of WebCore under LGPL-2.1 (`Source/WebCore/LICENSE-LGPL-2.1`) | cited files (see caveat below) | `Editor.cpp` autocorrection notification (`markAndReplaceFor`); the ATSPI backend collapsing `AXTextEditType`; the four non-Core-AAM macOS userInfo keys | [platform-api-mapping.md](docs/platform-apis.md), [layered-gap-analysis.md](docs/the-gap.md) |
| [NVDA](https://github.com/nvaccess/nvda) | GPL-2.0-or-later with two stated exceptions (`copying.txt`, read at `master`, 2026-08-30) | cited files (see caveat below) | The Word-module `activityId` denylist precedent; the blockquote role/braille/quick-nav chain and its `configSpec.py` defaults; event-handling behaviour | [platform-api-mapping.md](docs/platform-apis.md), [platform-rescue.md](docs/platform-rescue.md), [EVIDENCE.md](docs/evidence.md) |
| [Orca](https://gitlab.gnome.org/GNOME/orca) | LGPL-2.1 (`COPYING`, read at `main`, 2026-08-30) | `main` | The log-only speech backend (`ORCA_TEST_SPEECH_SERVER_FACTORY`) and its regression tests as prior art for screen-reader-free measurement | [chromium-ax-observation.md](docs/observing-chromium.md), [harness/README.md](suite/README.md) |
| [CKEditor 5](https://github.com/ckeditor/ckeditor5) | Dual: GPL-2.0-or-later **or** commercial from CKSource (`packages/ckeditor5/LICENSE.md` at `8bb12a1`) | `8bb12a1`, v48.4.0 (2026-08-28) | `AriaLiveAnnouncer` and its seven call sites; containment and command handling; the keystroke-registry help dialog — the ceiling case for the whole corpus | [scenarios/ckeditor5.md](corpus/inventories/ckeditor5.md), [editor-contract.md](contract/rationale.md), [summary-rationale.md](docs/summary-rationale.md), [EVIDENCE.md](docs/evidence.md) |
| [Lexical](https://github.com/facebook/lexical) | MIT (`LICENSE` in the `lexical@0.49.0` npm package: "Copyright (c) Meta Platforms, Inc. and affiliates") | `ad5904e`, v0.49.0 (2026-08-27) | Announcer extensions, Enter contracts, typeahead, node classes and the 50-command surface; the subject the harness builds via `harness/subjects/lexical*/build.mjs` | [scenarios/lexical.md](corpus/inventories/lexical.md), [LEXICAL-PLAN.md](docs/lexical-plan.md), [LEXICAL-PROGRAMME.md](docs/lexical-programme.md), [containment-state-machine.md](contract/containment.md), [editor-contract.md](contract/rationale.md) |
| [@uiw/react-md-editor](https://github.com/uiwjs/react-md-editor) | MIT (`"license": "MIT"` in the npm package's `package.json`; full text in the GitHub repo's `LICENSE` at tag `v4.0.8` — the npm tarball ships no licence file) | v4.0.8 | `handleKeyDown` list-continuation behaviour, reproduced behaviourally (not copied) in `harness/subjects/textarea-markdown.html`; the editor Open Notebook ships, built locally as a subject by `harness/subjects/build-uiw-md-editor.mjs` | [scenarios/open-notebook.md](corpus/inventories/open-notebook.md), [worked-example.md](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/a11y/worked-example.md), [editor-contract.md](contract/rationale.md), [harness/README.md](suite/README.md) |
| [at-spi2-core](https://gitlab.gnome.org/GNOME/at-spi2-core) | LGPL-2.1 (`COPYING`, read at `main`, 2026-08-30) | installed 2.52.0-1build1 | Used rather than quoted: the installed daemons and `libatspi` are what the AT-SPI capture spike drives; its D-Bus interfaces and event stream are observed and described | [spikes/atspi/FINDINGS.md](research/atspi/FINDINGS.md), [chromium-ax-observation.md](docs/observing-chromium.md), [EVIDENCE.md](docs/evidence.md) |

**Verification caveats — recorded rather than hidden.** Licence texts for NVDA, Orca and
at-spi2-core were read at each repository's current default branch on 2026-08-30, not at
a pinned commit, because the docs cite those projects by file path without recording a
commit pin (a known gap — new citations must pin, see the rules below). WebKit has no
single top-level licence; the claim above is from the `Editor.cpp` per-file header plus
the presence of `Source/WebCore/LICENSE-LGPL-2.1`, both read at `main`, and other cited
WebKit files may carry different headers. Chromium's root `LICENSE` was read at the exact
tag the docs pin (141.0.7390.37). CKEditor 5, Lexical and `@uiw/react-md-editor` licences
were read at the exact commits/versions the docs pin.

## Rules that keep this posture intact

These bind contributors as well as maintainers; the contribution process is in
[CONTRIBUTING.new-repo.md](CONTRIBUTING.md) (staged; becomes `CONTRIBUTING.md`
on extraction).

1. **Cite `project@commit path:line`.** A claim without a pinned citation does not merge.
2. **Prefer paraphrase to quotation.** Quote only what carries the point — a signature, a
   constant, a condition — never a whole function.
3. **Never copy code from a GPL or LGPL project into the suite.** The specific
   temptations are worth naming: NVDA's `activityId` denylist and its coalescer key, and
   Orca's log-only speech backend. Read them, cite them, describe what they establish —
   and write our own.
4. **Never restate a project's code as suite code.** An adapter drives an editor; it does
   not embed it. A subject that wraps a real editor is built by a recipe on the user's
   machine, never committed as a bundle.

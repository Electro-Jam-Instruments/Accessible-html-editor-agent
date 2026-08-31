# Evidence register

**Status: publication prerequisite (P0.2), 2026-08.**

Every material claim this body of work makes, and how it was established. The summary is
written for readers who will push back; this file is what they push back *against*. If a
claim is not in this table, it should not be in the summary.

## How to read the `Basis` column

| Basis | Meaning | Weight |
|---|---|---|
| **measured** | We ran it on this machine and kept the artefact. Reproducible from this repo. | Strongest |
| **source** | Read from the actual implementation at a pinned version. Not from docs, not from behaviour. | Strong — but predicts behaviour, does not observe it |
| **doc** | Primary vendor/standards documentation (Microsoft Learn, W3C, GNOME, Chromium design docs). | Strong for interfaces, weak for what ships |
| **inferred** | Reasoned from the above. Explicitly not observed. | Must be labelled as such wherever it appears |

The distinction that matters most for this project: **`source` is not `measured`.** The
three editor inventories are `source`. The harness runs are `measured`. Where the summary
gives a percentage, it is a `source` number, and it says so.

---

## 1. Claims about the corpus (the numbers in the summary)

| # | Claim | Basis | Artefact | Confidence |
|---|---|---|---|---|
| E1.1 | 586 editing scenarios enumerated across three editors | source | [`scenarios/open-notebook.md`](../corpus/inventories/open-notebook.md) (83), [`lexical.md`](../corpus/inventories/lexical.md) (201), [`ckeditor5.md`](../corpus/inventories/ckeditor5.md) (302) | high |
| E1.2 | Those 586 collapse to **218 canonical operations**, as a partition — every source id in exactly one canonical row, none dropped, none double-counted | source + machine-checked | [`scenarios/canonical.md`](../corpus/canonical.md), reconciliation section | high |
| E1.3 | CKEditor 5 v48.4.0: 183 operations implemented, **21%** reach the user | source | canonical.md, per-editor columns | medium-high — see E1.7 |
| E1.4 | Lexical v0.49.0: 174 implemented, **11%** reach the user | source | canonical.md | medium-high |
| E1.5 | Open Notebook (`@uiw/react-md-editor` v4.0.8): 63 implemented, **6%** reach the user | source + measured | canonical.md; corroborated by the harness run (E3.2) | high |
| E1.6 | Denominators exclude `n/a`, so each editor is scored only on what it implements | method | canonical.md preamble | n/a — definitional |
| E1.7 | `announced` credits the platform as well as the editor. Counting only *editor-originated* announcements drops CKEditor to ~17% and Lexical to ~7% | source | canonical.md provenance column | medium — the split depends on a judgement per row |
| E1.8 | Lexical's deployed figure is materially worse than its source figure: `@lexical/a11y` announcers are opt-in extensions, and the legacy React API (`RichTextPlugin`, `AutoLinkPlugin`) registers no announcer at all | source | [`scenarios/lexical.md`](../corpus/inventories/lexical.md); `registerRichText` / `registerAutoLink` call sites | high |
| E1.9 | Of ~170 container entry/exit vectors surveyed across CKEditor and Lexical, **21 are announced — all of them CKEditor's code block** | source | [`synthesis.md`](synthesis.md) §P3 | high |
| E1.10 | Lexical ships three mutually incompatible Enter contracts (blockquote: any Enter exits; code block: two blank lines; list: one empty item) | source | [`scenarios/lexical.md`](../corpus/inventories/lexical.md); synthesis §P6 | high |
| E1.11 | Open Notebook's failures are disproportionately `structural-fail` (46 of 63 implemented rows) rather than `silent` | source | canonical.md | high |

**P0.4 partially closed for Lexical (2026-08-28).** E3.10 and E3.11 measure a stock Lexical
build and confirm the source reading's central prediction: correct structure, zero
announcement. CKEditor remains source-read only.

**Known weakness (P0.4).** E1.3 and E1.4 are read, not run. The harness has only measured
our own editor. Until a handful of canonical rows are measured against vendored Lexical
and CKEditor subjects, an expert is entitled to ask whether source reading predicts
behaviour. Stated in the summary as a limitation, not hidden.

---

## 2. Claims about the layers (where information is lost)

| # | Claim | Basis | Artefact | Confidence |
|---|---|---|---|---|
| E2.1 | Chromium's Blink AX tree is observable externally over CDP (`Accessibility.*`), including live-region and text-change events | measured | [`spikes/probe.mjs`](../research/cdp/probe.mjs), [`pillars*.mjs`](../research/cdp/) | high |
| E2.2 | **Subscription trap:** `getFullAXTree` does not subscribe to node updates; you must walk with `getRootAXNode` + `getChildAXNodes` to receive `nodesUpdated` | measured | [`chromium-ax-observation.md`](observing-chromium.md); reproduced in `harness/driver.mjs` | high |
| E2.3 | AT-SPI2 can be stood up **headless with no X server at all** and captures Chromium's ordered event stream | measured | [`spikes/atspi/FINDINGS.md`](../research/atspi/FINDINGS.md), `run-headless-nox.sh`, `logs/events-headless-nox.jsonl` | high |
| E2.4 | AT-SPI2 delivers `object:text-caret-moved` with real offsets — richer for caret than the CDP layer | measured | FINDINGS.md §Pillar 4, log excerpts | high |
| E2.5 | AT-SPI2 (AuraLinux) emits **no live-region event of any kind** — no `object:announcement`, no live-region equivalent, for any of four live-region shapes tested | measured | FINDINGS.md §Pillar 3 | high |
| E2.6 | `object:announcement` *does* work for `ariaNotify`, so the channel exists and is simply not used for live regions | measured | FINDINGS.md §Bonus | high |
| E2.7 | Three gating premises taken from source reading **did not reproduce** against Chromium 141: `CHROME_HEADLESS=1` did not disable the bridge; `--force-renderer-accessibility` was not required; no env flags were required. The actual enabler is a registered AT-SPI client | measured | FINDINGS.md gating-probe table (142/136/136 events) | high — **this is a correction; see §5** |
| E2.8 | `chrome.automation` is unavailable to us: `undefined` under both MV3 and MV2 | measured | [`spikes/automation-probe.mjs`](../research/cdp/automation-probe.mjs), `spikes/automation-ext/` | high |
| E2.9 | Chromium's `FireLiveRegionEvents()` emits both node and root events unconditionally, so a remove+insert produces output *identical* to pure insertion — the double-read is an **AT-side** decision, not a bridge-side one | source | Chromium `ax_event_generator` / `browser_accessibility_manager`; recorded in chromium-ax-observation.md | high — **this is a correction; see §5** |

---

## 3. Claims established by running the harness

| # | Claim | Basis | Artefact | Confidence |
|---|---|---|---|---|
| E3.1 | A behavioural contract for one operation (bulleted list creation) can be expressed declaratively and evaluated headless against four editor subjects | measured | [`harness/`](../suite/), `contracts/bulleted-list.mjs` | high |
| E3.2 | Run of 2026-08-28, Chromium 141 (`chromium-1194`): **36 assertions, 17 pass, 8 MUST failures** across four subjects | measured | [`suite/examples/report-2026-08.json`](../suite/examples/report-2026-08.json) | high |
| E3.3 | Our editor as it ships today fails `create.structure` **and** `create.announcement`: no list exists in the AX tree, and nothing is announced | measured | results.json, subject `uiw-react-md-editor` (the real `@uiw/react-md-editor` build) and `textarea-markdown` | high |
| E3.4 | The fix is measurable: the `textarea-markdown-fixed` subject passes `create.announcement` with the same structural substrate | measured | results.json | high |
| E3.6 | **Our own fixes are measured, not just unit-tested.** A subject built from Open Notebook's own `MarkdownEditor` wrapper passes `enter.announcement` (observed: `[polite] "New list item"`, read from Chromium's AX tree) where the raw-library subject emits no live-region content at all | measured | `harness/subjects/build-open-notebook.mjs`, `harness/results.json` subject `open-notebook-fixed` | high |
| E3.7 | The same subject still **fails** `create.announcement` (typing `- ` is not announced — only Enter-continuation was fixed) and `enter.announcement-position` (we say "New list item", not "item 2") | measured | results.json | high |
| E3.8 | **Open Notebook's note dialog does contain a real `<ul><li>milk</li><li>eggs</li></ul>`** — in the live preview pane, in the page's accessibility tree, with **no `aria-hidden`**. The structure exists and is exposed; it has no `role`, no `aria-label`, no `tabindex`, so nothing names it or routes to it | measured | CDP probe against a `preview:'live'` build of our wrapper, 2026-08 | high |
| E3.9 | The editor's toolbar is itself a `<ul>` of ~20 `<li>`, so list navigation in the dialog meets the toolbar before the content | measured | same probe | high |
| E3.10 | **The source reading predicted real behaviour — measured.** A stock Lexical 0.49.0 React integration (`LexicalComposer` + `RichTextPlugin` + `History` + `List` + `MarkdownShortcut`, the documented path) **passes both structure assertions outright** and **fails every announcement assertion**: `(no live-region content emitted)` for both list creation and Enter-continuation | measured | `harness/subjects/lexical/build.mjs`, `harness/results.json` subject `lexical-stock` | high |
| E3.11 | Lexical's structural passes are `PASS`, not `PASS~` — a real `list → listitem` in the AX tree, not a textual equivalent. It builds correct structure and says nothing about it, which is precisely what [`scenarios/lexical.md`](../corpus/inventories/lexical.md) predicted from source | measured | results.json | high |
| E3.12 | **Lexical's accessibility-by-default work is real and reaches the browser.** On a `0.49.1-nightly` built through the extension API, `# ` + space announces `[polite] "Heading level 1"`; the same operation on stock 0.49.0 React plugins emits no live-region content at all | measured | `harness/contracts/heading.mjs`, `harness/subjects/lexical-next/`, `results.json` | high |
| E3.13 | `RichTextExtension.dependencies` includes `HeadingAnnounceExtension` in the nightly, so the announcer arrives without the integrator opting in | source | `@lexical/rich-text` `LexicalRichText.dev.mjs:311` | high |
| E3.14 | Lexical ships **four** announcers today — heading (`@lexical/rich-text`), auto-link (`@lexical/link`), history and editor-mode (`@lexical/a11y`) — against 174 catalogued scenarios. **No list announcer exists**, measured FAIL on both subjects | source + measured | package `.d.ts` grep; `results.json` | high |
| E3.15 | **No `ListAnnounceExtension` exists in Lexical at all.** `lexical-next-max` — every announcer a well-informed integrator can opt into — announces nothing for list exit, nest, outdent or ordered continuation | measured | `harness/contracts/list.mjs`, `results.json` | high |
| E3.16 | **Stock and extension-API Lexical have no indent gesture at all.** Neither Tab nor Ctrl+] nests a list item at any level; `TabIndentationPlugin` is not part of the documented getting-started config, so `list.nest`/`list.outdent` fail on **result state**, not merely on announcement | measured | results.json, subjects `lexical-stock` / `lexical-next` | high |
| E3.17 | Chromium computes a hierarchical `level` on every listitem from ancestry, and exposes an `<ol>`'s CSS `::marker` as a `ListMarker` AX node named `"1. "` — so ordinals *are* re-readable. The real gap is narrower: no listitem carries `posInSet`, so the number is text beside the item, never a stated position, and nothing supplies "of N" | measured | results.json; corrects a corpus claim | high |
| E4.13 | **Chromium maps `<code>` to AX role `code`, and `<pre>` to `generic`.** Measured across `<code>`, `<pre>`, `<pre><code>` and `role="code"`. So a code block's *code-ness* survives into the AX tree while its *preformatted-ness* does not, in any editor | measured | CDP probe, 2026-08 | high |
| E4.14 | **A code block's language is unreachable by assistive technology in every editor measured.** It lives in `data-language` (Lexical) or `class="language-*"` (CKEditor) with no `aria-label`, `aria-roledescription`, `title` or AX name. Consequence: CKEditor's best-in-corpus "Entering %0 code snippet" would score **`told-only`**, not `announced` — heard once, with nothing to return to | measured | `harness/contracts/codeblock.mjs` | high |
| E3.18 | **The only editor in the corpus with a working container announcer is also the only one that violates C-3.** `textarea-markdown-fixed` announces `[polite] "bulleted list, item 1"` when a list is created by typing `- `, and is **silent** when the caret arrives in the same list by arrow. Its announcer is bound to the `input` event — a mutation hook — and arrow-entry mutates nothing, so it is structurally incapable of firing | measured | `harness/contracts/entry-parity.mjs` | high |
| E3.19 | **Backspace-merge entry (E5) is silent in every subject, for both blockquote and code block.** One Backspace joins the block below into the container and moves the caret inside it with no announcement — a deletion key silently makes the user a quote author | measured | `harness/contracts/entry-parity.mjs` | high |
| E3.20 | **No Lexical subject registers check lists at all, and it is behind two independent opt-ins.** `CHECK_LIST` is exported by `@lexical/markdown` but is not in `ELEMENT_TRANSFORMERS`, so not in `TRANSFORMERS`; and `CheckListExtension` exists in `@lexical/list` but `ListExtension` does not depend on it. Typing `- [ ] alpha` fires `UNORDERED_LIST` on the `- ` and leaves `[ ] alpha` as literal text in a plain `<li>` — **structurally worse than the plaintext subjects**, which at least keep valid GFM | measured + source | `harness/contracts/checklist.mjs` | high |
| E3.21 | **`aria-checked` is present on no subject at any point.** Lexical does stamp `role="checkbox"` + `aria-checked` in `updateListItemChecked`, but no subject reaches a check list, so it is never emitted. No toggle gesture works on any subject: marker click, Home/ArrowLeft/Space, and Ctrl+Enter were all tried uniformly | measured | `harness/contracts/checklist.mjs` | high |
| E1.12 | **Tiptap StarterKit (3.30.5, the getting-started config) announces 0 of 111 implemented operations, and has no announcement layer at all** — zero `aria-live` hits across the entire install including `prosemirror-view`; the only ARIA in the subject is a hardcoded nameless `role="textbox"` with no `aria-multiline` (`@tiptap/core` Editor) | source | [`scenarios/tiptap.md`](../corpus/inventories/tiptap.md), 123 rows, pinned 2026-08-30 | high — source-read; harness measurement pending |
| E1.13 | Tiptap's blockquote Enter contract is the **opposite** of Lexical's (Enter stays inside; empty-paragraph Enter exits), and its `undoInputRule` gives universal Backspace-reverts-any-autoformat — a better B1 recovery shape than anything in Lexical, itself unannounced | source | scenarios/tiptap.md | high |
| E1.14 | **Tiptap StarterKit measured: the prediction held exactly** — zero announcements and zero live regions across all 24 operations; 19 `discoverable`, 5 `absent`; the only rich subject whose Tab genuinely nests a list | measured | `harness/subjects/tiptap/MEASUREMENT.md`, two byte-identical runs | high |
| E1.15 | Tiptap's `<pre><code>` gives **no AX advantage over Lexical's bare `<code>`** — `<pre>` maps to `generic`, so both hand the platform one `code` role node; blockquote exit measured at **2 Enters** vs Lexical's 1 | measured | same | high |
| E3.5 | The suite is not always-red — a bare `contenteditable` control condition and the fixed subject produce different, expected results | measured | results.json, subject `contenteditable` | high |

---

## 4. Claims about the platform layer (what could change underneath)

| # | Claim | Basis | Artefact | Confidence |
|---|---|---|---|---|
| E4.7 | **Chromium maps `<blockquote>`, `<blockquote cite>` and `role="blockquote"` all to AX role `blockquote`.** A visually identical styled `<div>` gets no role at all | measured | CDP `getFullAXTree` probe; [platform-rescue.md](platform-rescue.md) | high |
| E4.8 | Core-AAM maps the `blockquote` role to `IA2_ROLE_BLOCK_QUOTE`, UIA `Group` + localized "blockquote", ATK `ROLE_BLOCK_QUOTE`, and macOS `AXGroup` with **no subrole** — macOS loses that it is a quotation | doc | Core-AAM 1.2 §3.4.3.6 | high |
| E4.9 | **NVDA reports blockquote by default.** `Role.BLOCKQUOTE` spoken as "block quote", braille `bqt`, quick-nav `q`; gated on `reportBlockQuotes`, which `configSpec.py` sets to `boolean(default=true)` — the same default as `reportHeadings` and `reportLists` | source | `nvaccess/nvda`: `controlTypes/role.py`, `textInfos/__init__.py`, `config/configSpec.py` | high |
| E4.11 | **Owner's NVDA observation, Windows:** blockquote entry/exit **did not read at all** while editing, and **lists sometimes did not read inside an edit field** | reported by owner, real NVDA | conversation, 2026-08 | medium — a real session, not a controlled test; conditions and NVDA version not recorded |
| E4.12 | **Measured (Linux) + source-precise (2026-08-30, B1): the platform bridge does NOT demote an editable list — NVDA does, and more narrowly than we first read.** AT-SPI tree + caret capture of the same `<ul>` in a `contenteditable` host and read-only, two byte-equivalent runs: both lists identical (role `list`, `setsize=3`, items with `posinset`/`level`), differing only in the `editable` state (no `read-only` state on either); caret events land on the list items with full ancestry in both. NVDA source at `77973a3`: editable list → `PRESCAT_SINGLELINE` (`textInfos/__init__.py:187–189`) vs `PRESCAT_CONTAINER` read-only (`:229–233`); loses "with N items" (`speech/speech.py:2412–2424`) and "out of list" on line exit (`:2389–2400`) — **but `speakEntry` stays true, so bare "list" entry is still predicted**. E4.11's "sometimes did not read at all" is *more* silence than source predicts, so it is no longer clean corroboration — it is an open discrepancy for the 🧑 Windows pass | measured (Linux bridge) + source (NVDA, Windows path) — **not yet observed on Windows** | [`spikes/atspi/logs/report-b1-run1.txt`](../research/atspi/logs/report-b1-run1.txt), `tree-b1-run*.json`; [platform-rescue.md](platform-rescue.md) editable-lists section | high for the Linux bridge and the source reading; owner-session discrepancy unresolved |
| E4.10 | **Partially resolved (2026-08-30, B2): the focus-mode structural gap does not exist in the bridge (measured, Linux) or in NVDA's code path (source).** AT-SPI capture: caret crossings into/out of a `<blockquote>` inside a focused `contenteditable` are exposed via the caret event source's ancestor chain (`#p2` with ancestors `#bq > #edit`), role `block quote` retained, two byte-equivalent runs. NVDA source at `77973a3`: a focused contenteditable is served by `Editor` with `MozillaCompoundTextInfo` (`ia2Web.py:288–289, 520–522`), whose `getTextWithFields` builds ancestor control fields (`ia2TextMozilla.py:361–383, 449–450`), and the caret path speaks them via the stack diff for reason CARET (`editableText.py:165–178, 267–268`; `speech/speech.py:1636–1711`) with blockquote as `PRESCAT_CONTAINER` (`textInfos/__init__.py:206–233`). **Predicted: "block quote"/"out of block quote" spoken in focus mode.** The owner heard neither (E4.11) — the earlier different-TextInfo hypothesis is refuted, and what the Windows silence *is* remains unestablished (candidates in platform-rescue.md: caret-detection race, non-semantic markup, version/settings) | measured (Linux bridge) + source (NVDA) | [`spikes/atspi/logs/report-b2-run1.txt`](../research/atspi/logs/report-b2-run1.txt), `tree-b2-run*.json`; [platform-rescue.md](platform-rescue.md) focus-mode section | high for bridge + source; **what actually happens in a real Windows NVDA session is still unverified — 🧑 needed** |
| E4.15 | Chromium computes `HIERARCHICAL_LEVEL_CHANGED` cross-platform and discards it on two of three platforms | source | `platform-api-mapping.md` (Chromium event generator survey) | high |
| E4.16 | `UIA_TextEdit_TextChangedEventId` has **zero known screen-reader consumers** | source | `platform-api-mapping.md` | high — "known" bounded to the readers surveyed there |
| E4.17 | **List rescue chain (B3): rescued for reading, partial while editing.** `<ul>/<ol>` → AX `list`, `<li>` → `listitem` with `level` (no `setsize`/`posinset` in the CDP projection, though HTML-AAM §3.5.85 requires them and AT-SPI exposes them — E4.12); a styled-div list lookalike → `generic`. Core-AAM §3.4.3.38/§3.4.3.41 maps to all four platforms and itself prescribes `STATE_SYSTEM_READONLY` — the state NVDA's editable demotion keys on. NVDA (`77973a3`): "list"/"list item", braille `lst`, quick-nav `l`/`i`, `reportLists=true` gating read-only lists only; editable demotion exactly as E4.12 (entry kept; count + line-exit lost) | measured (CDP probe ×2 byte-identical, 2026-08-30) + doc + source | [platform-rescue.md](platform-rescue.md) rescue-chains §list | high for the chain; Windows session still 🧑 |
| E4.18 | **Heading rescue chain (B3): rescued — the strongest of the six.** `<h1>`–`<h6>` → AX `heading` `level=1–6` (`role="heading" aria-level` identical; styled-div lookalike → `generic`). Core-AAM §3.4.3.33: `IA2_ROLE_HEADING` / UIA "heading" / ATK `ROLE_HEADING` / AX `AXHeading` — no platform loses it. NVDA: "heading" + "level N" (`speech.py:2184,2345,2381`), quick-nav `h` plus per-level `1`–`9`, `reportHeadings=true`; no editable-state demotion exists for headings | measured + doc + source | platform-rescue.md rescue-chains §heading | high |
| E4.19 | **Code-block rescue chain (B3): NOT rescued for NVDA — the chain breaks inside the AT.** Chromium exposes role `code` (E4.13; monospace styled-div control → `generic`, new). Core-AAM §3.4.3.13 maps it weakly on Windows/Linux (`IA2_ROLE_TEXT_FRAME` shared with abbr/emphasis/time — Chromium `ax_platform_node_win.cc` `kCode` confirms — code-ness carried only by `xml-roles:code`; macOS uniquely richer: `AXCodeStyleGroup`). NVDA at `77973a3` has **no code role at all** (zero matches in `controlTypes/role.py`), maps `TEXT_FRAME`→`Role.TEXTFRAME` (`IAccessibleHandler/__init__.py:182`) which falls to `PRESCAT_LAYOUT` (`textInfos/__init__.py:242`), reads `xml-roles` only for gridcell/Kindle, has no quick-nav key and no config gate; `reportFontName=false` closes the last indirect channel. Consequence: `codeblock.*` `discoverable` outcomes over-credit the platform for our primary AT — see C13 | measured + doc + source | platform-rescue.md rescue-chains §code-block | high for the source reading; JAWS/VoiceOver unchecked (macOS could differ) |
| E4.20 | **Table rescue chain (B3): rescued for reading — the richest default.** `<table>` → AX `table` (caption-named), `row`/`columnheader`/`cell`; CSS-grid lookalike → `generic` throughout. Core-AAM §3.4.3.85/.65/.11/.14 strong on all four platforms (AX drops only `rowgroup`). NVDA: "table with N rows and M columns" (`speech.py:2426–2440`), cell coords and headers on by default (`reportTableCellCoords=True`, `reportTableHeaders=ROWS_AND_COLUMNS`), quick-nav `t`, `reportTables=true`. Trap recorded: Chromium-marked layout tables are demoted unless `includeLayoutTables` (default False) | measured + doc + source | platform-rescue.md rescue-chains §table | high; bridge leg for row/col-count attributes on Windows unmeasured (cf. E4.2) |
| E4.21 | **Link rescue chain (B3): rescued iff `href` is present.** `<a href>` → AX `link` + `url`, but **`<a>` without `href` → `generic`** — measured, and HTML-AAM §3.5.3 prescribes exactly that. Core-AAM §3.4.3.37 strong on all four platforms. NVDA: "link" (states-first: "visited link", `speech.py:2406`), braille `lnk`, quick-nav `k`/`u`/`v`, `reportLinks=true`. Editor-shaped risk for future link contracts: link UI built as href-less anchors during editing produces no construct at all | measured + doc + source | platform-rescue.md rescue-chains §link | high |
| E4.1 | UIA exposes editing structure through **TextPattern**, including `StyleId_Quote` (70014), `StyleId_BulletedList` (70015), `StyleId_NumberedList` (70016) | doc | Microsoft Learn `TextPattern` / `StyleId` reference; [`platform-api-mapping.md`](platform-apis.md) | high for the interface |
| E4.2 | Whether Chromium actually maps `<blockquote>`/`<ul>`/`<ol>` onto those StyleIds on Windows is **not verified** | — | open item P3.2; needs a real UIA inspector on Windows | **unverified — must be labelled** |
| E4.3 | Core-AAM hardcodes `NotificationKind_ActionCompleted` for `ariaNotify`, so the typing channel is plumbed end to end and deliberately unused | source + doc | Core-AAM; Chromium UIA notification call site; platform-api-mapping.md | high |
| E4.4 | `UIA_ChangesEventId` exists and is **never raised by Chromium** | source | Chromium UIA event surface | high |
| E4.5 | `TextEditChangeType_AutoCorrect` (Windows) and `NSAccessibilityAutocorrectionOccurredNotification` (macOS) are the exact autocorrect twin of `- ` → bullet, and are raised by nobody in this path | doc + source | platform-api-mapping.md | high for existence; medium for "nobody" (we checked Chromium, not every engine) |
| E4.6 | JAWS and VoiceOver consumer behaviour for the above | inferred | — | **unverified — we tested neither.** Everything we say about consumption is NVDA-shaped or bridge-shaped |

---

## 5. Corrections — claims that changed during the work

These were stated one way earlier and corrected. Wherever a document carries the original,
the correction is adjacent and dated. Listed here so a reader meeting the old version
elsewhere can resolve it.

| # | Original claim | Corrected to | Where corrected |
|---|---|---|---|
| C1 | The `@uiw` syntax-highlight overlay is invisible to assistive tech | **False.** Transparency is visual only; there is **zero `aria-hidden` anywhere in the library**, so note content can appear up to three times in the AX tree | [`PLAN.md`](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/a11y/PLAN.md) §edit surface |
| C2 | The live-region re-announce decision happens in the platform bridge | **AT-side.** `FireLiveRegionEvents()` always emits both events; remove+insert is indistinguishable from insertion at the bridge | [`chromium-ax-observation.md`](observing-chromium.md) (commit `201d165`) |
| C3 | AT-SPI is lossier than the generator layer | **Richer** for caret and text-change (offsets, real text), while still dropping live-region events entirely | [`spikes/atspi/FINDINGS.md`](../research/atspi/FINDINGS.md) |
| C4 | AT-SPI needs `--force-renderer-accessibility`, env flags, and a non-headless Chromium | **None of the three reproduced.** A registered AT-SPI client is the enabler | FINDINGS.md gating-probe table |
| C5 | New i18n keys can land in `en-US` only and be fanned out later | **False.** `satisfies TranslationShape` plus the parity test break the build immediately; keys must fan to all 14 locales in the introducing change | [`TASKS.md`](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/a11y/TASKS.md), [`ORCHESTRATION.md`](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/a11y/ORCHESTRATION.md) (commit `668e239`) |
| C11 | `CAN-CB-018`: Lexical's CodeNode "is a bare `<code>` with no role, no name and no `<pre>`: there is nothing to announce" | **The "no role" half is wrong.** Chromium maps `<code>` to the ARIA `code` role, measured — the subtree is `textbox > code > StaticText`. The real gaps are narrower: no `<pre>` (and `<pre>` maps to `generic` anyway, so preformatted semantics are lost regardless of editor), and the language is unreachable | [`scenarios/canonical.md`](../corpus/canonical.md) |
| C10 | `CAN-CB-046`, `CAN-CB-052`, `CAN-CB-053` describe Open Notebook as having no list exit, no nesting and no keyboard exit from the field | **Now false for this repository.** Those rows describe `@uiw/react-md-editor`, which still behaves that way (subject `uiw-react-md-editor` reproduces it exactly, including Shift+Tab appending four *more* spaces). Our wrapper diverged when the Tab trap and list-exit fixes landed. Rows re-scoped to the library, with the divergence noted | measured; [`scenarios/canonical.md`](../corpus/canonical.md) |
| C9 | "Most default AT profiles announce list and table entry but not blockquote entry, so the platform does not rescue this one" (`canonical.md` CAN-CB-003, and the containment preamble) | **Wrong for NVDA**, this project's stated primary target, and asserted rather than checked. `reportBlockQuotes` defaults to `true`. Corrected in place in both locations; the rows' `silent` statuses stand, since the editors are still silent at the moment of transformation | [platform-rescue.md](platform-rescue.md) |
| C8 | The contract reported announcement as pass/fail, implying an editor that says nothing conveys nothing | **Wrong, and it over-reported failure.** A screen reader reads correct semantics on its own: Lexical emits real `<h1>`, `<blockquote>` and `<ul><li>`, so a user navigating back to a heading hears "heading level 1" whether or not the editor announced it. Results now carry a 2×2 outcome — **announced** (told, and reviewable) · **discoverable** (correct semantics, found on navigation) · **told-only** (heard once, no structure to return to) · **absent** (neither) | `harness/run.mjs`, outcome table |
| C7 | Open Notebook's note surface has no list structure anywhere, so Tier B needs an editor migration | **Half wrong.** The *editing field* has none, but the live preview in the same dialog carries the real `<ul>/<li>`, exposed and not `aria-hidden`. Reading is fixable by labelling and routing; only structural navigation *while editing* needs a different editor | [SCENARIO-TASKS.md](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/a11y/SCENARIO-TASKS.md) Tier B, measured 2026-08 |
| C6 | UIA's relevance here is the notification event | **Understated.** TextPattern, StyleIds, embedded objects (U+FFFC), `ITextChildProvider` and `UIA_ChangesEventId` are all in scope | [`platform-api-mapping.md`](platform-apis.md) (commit `24c2236`) |
| C13 | The `discoverable` outcome (C8's vocabulary) applied to `codeblock.*` rows implies a screen-reader user can find out they are in a code block by navigating to it | **Not true for NVDA, this project's primary target.** The AX role `code` is real (E4.13) but NVDA has no code role, no braille label, no quick-nav key and no setting; the IA2 mapping (`TEXT_FRAME`) falls to `PRESCAT_LAYOUT` and is never spoken (E4.19). For NVDA, `discoverable` on a code block means only "the raw text is reachable" — its code-ness and language are not. The outcome cells stand as measured facts about the AX tree; the *reading* of them for codeblock rows is corrected. CKEditor's "Entering %0 code snippet" is therefore the only channel that exists for NVDA, not a duplication of the platform | [platform-rescue.md](platform-rescue.md) rescue-chains §code-block, E4.19 |
| C12 | (a) Focus mode may not announce blockquote crossings because a focused `contenteditable` "is served by a different TextInfo that may not surface control fields"; (b) an editable list "does not get container treatment" | **(a) Refuted at source** (NVDA `77973a3`): the focused-editable TextInfo is `MozillaCompoundTextInfo`, which does surface ancestor control fields, and the CARET stack diff speaks them — per source the crossing *should* read, which turns the owner's silence from an explained architecture gap into an unexplained discrepancy. **(b) Overstated:** the demotion is real but keeps the bare "list" entry (`speakEntry=True` for `PRESCAT_SINGLELINE`); what is lost is the item count and the line-exit announcement. Measured Linux-side (B1/B2, 2026-08-30): the bridge demotes neither construct | [platform-rescue.md](platform-rescue.md) (measured sections), E4.10/E4.12 |

---

## 6. What we are not claiming

Carried verbatim into Part V of the summary.

1. **Browser-told, not user-heard.** Everything measured here observes what Chromium was
   told, or what the Linux bridge carried. It does not observe what NVDA, JAWS or
   VoiceOver said. A passing contract predicts a good experience; it does not prove one
   (P3.3 exists to test that prediction).
2. **No screen reader was validated against.** No NVDA run has been performed. Every task
   requiring one is marked `awaiting-human`, never `done`.
3. **No user testing.** Nothing here substitutes for blind users using these editors.
4. **The percentages are source-read.** They are our best reading of three codebases at
   pinned versions, not a measured run (see P0.4).
5. **We do not claim agents can write these fixes unsupervised.** The claim is that
   *finding* and *checking* can be continuous. The fixing is still engineering.
6. **Windows and macOS platform mappings are documentation-level**, except where marked
   measured — and none of the Windows claims are measured.

---

## 7. Versions pinned

| Subject | Version | How pinned |
|---|---|---|
| Chromium | 141.0.7390.37 (`chromium-1194`) | `/opt/pw-browsers/`; recorded in `harness/results.json` |
| CKEditor 5 | v48.4.0 | recorded in `scenarios/ckeditor5.md` |
| Lexical | v0.49.0 | recorded in `scenarios/lexical.md` |
| `@uiw/react-md-editor` | v4.0.8 | `frontend/package.json` |
| at-spi2-core / ATK | 2.52.0 | `spikes/atspi/FINDINGS.md` |

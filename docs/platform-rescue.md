# Does the platform rescue it? — verifying, construct by construct

**Status: reference, 2026-08.** Created because a binary "announced / not announced"
over-reported failure: a screen reader reads correct semantics on its own, so an editor
that emits real HTML and says nothing is in a different situation from one that emits a
styled `<div>`.

This file records, per construct, **whether correct markup alone reaches the user** — and
how that was established. It is what makes the `discoverable` outcome in the harness
defensible rather than an assumption.

## The chain that has to hold

A construct is *rescued by the platform* only if every link holds. Any break and the user
hears nothing, however correct the HTML is.

```
HTML element  →  Chromium AX role  →  platform API mapping  →  AT reports it  →  by default
```

The last link is the one most often skipped in accessibility write-ups, and it is where
this project's own corpus was wrong.

---

## `<blockquote>` — the full chain, verified

Prompted by a direct challenge: *"blockquote is a real HTML tag, but I don't know what
NVDA does with it. Does it even show up?"* It does. Here is each link.

### 1 · Chromium exposes it — **measured**

CDP `Accessibility.getFullAXTree` over a page containing several quote shapes:

| Markup | Chromium AX role |
|---|---|
| `<blockquote>` | **`blockquote`** |
| `<blockquote cite="…">` | **`blockquote`** |
| `<div role="blockquote">` | **`blockquote`** |
| `<div class="quote" style="border-left:3px solid">` | *(no role — falls to generic)* |

The last row is the important one: **styling is not semantics.** A visually identical quote
built from a styled `div` produces nothing for any of the links below to carry.

### 2 · The platform mapping exists — **primary documentation**

[Core-AAM 1.2](https://www.w3.org/TR/core-aam-1.2/) § 3.4.3.6, `blockquote` role:

| API | Mapping |
|---|---|
| MSAA + IAccessible2 | `ROLE_SYSTEM_GROUPING` + **`IA2_ROLE_BLOCK_QUOTE`** |
| UIA | Control Type `Group`, Localized Control Type **`blockquote`** |
| ATK / AT-SPI | **`ROLE_BLOCK_QUOTE`** |
| AX (macOS) | `AXGroup`, subrole `<nil>` — **the weakest of the four** |

macOS is the outlier: `AXGroup` with no subrole loses the fact that it is a quotation. Any
claim about VoiceOver and blockquote should be treated as unverified until measured.

### 3 · NVDA has a role for it — **source**

From `nvaccess/nvda`:

| Where | What |
|---|---|
| `source/controlTypes/role.py` | `BLOCKQUOTE = 48`, spoken as `_("block quote")` |
| `source/braille/labels.py` | braille abbreviation `bqt` |
| `source/browseMode.py` | quick-nav key **`q`** — *"moves to the next block quote"* |
| `source/NVDAObjects/IAccessible/ia2Web.py` | `class BlockQuote(Ia2Web): role = controlTypes.Role.BLOCKQUOTE` |

### 4 · It is on by default — **source, and this is the link that matters**

`source/textInfos/__init__.py` gates reporting on a setting:

```python
or (role == controlTypes.Role.HEADING and not formatConfig["reportHeadings"])
or (role == controlTypes.Role.BLOCKQUOTE and not formatConfig["reportBlockQuotes"])
```

and `source/config/configSpec.py` gives the default:

```
reportLists       = boolean(default=true)
reportHeadings    = boolean(default=true)
reportBlockQuotes = boolean(default=true)
```

**`reportBlockQuotes` defaults to `true`, exactly like lists and headings.**

### Verdict

**A real `<blockquote>` is reported by NVDA out of the box.** It sits in the same class as
headings and lists: *not announced at the moment of transformation, but discoverable —
the user finds out when they navigate to it.*

### Correction to this repository

[`scenarios/canonical.md`](../corpus/canonical.md) `CAN-CB-003` said:

> *"Most default AT profiles announce list and table entry but not blockquote entry, so the
> platform does not rescue this one."*

**That is wrong for NVDA**, which is this project's stated primary target, and it was
asserted rather than checked. Corrected in place. The row's `silent` statuses are
unaffected — the editors still say nothing at the moment of transformation — but the
reasoning attached to it was misleading, and it would have mis-shaped the argument in an
upstream PR.

### Focus mode across a blockquote boundary — measured (Linux) + traced (NVDA source)

**Status: measured 2026-08-30 (B2, AT-SPI on this box, two byte-equivalent runs) and
traced through NVDA source at commit `77973a3015e9a58dc8638d9a6dc61b9f60e853b4`.
The earlier hypothesis on this page — that a focused `contenteditable` is served by a
TextInfo that does not surface control fields — is REFUTED at the source level.**
Artefacts: [`spikes/atspi/logs/report-b2-run1.txt`](../research/atspi/logs/report-b2-run1.txt)
(+ `-run2`, raw JSONL and `tree-b2-run*.json` alongside); rig:
[`spikes/atspi/run-b1b2.sh`](../research/atspi/run-b1b2.sh).

**Measured on Linux (AT-SPI2, Chromium 141 headless).** A `contenteditable` host
containing paragraph → `<blockquote><p>` → paragraph; caret arrowed down and back up
across both boundaries, each keypress isolated by an observed marker boundary:

- The `<blockquote>` keeps role **`block quote`** inside the editable host (tree dump;
  it gains the `editable` state, exactly like its sibling paragraphs).
- Every crossing produced exactly one `object:text-caret-moved` whose **source object
  is the paragraph now holding the caret**, and the source's ancestor chain names the
  containment: entering gives `src=#p2` with ancestors `#bq > #edit > document web`;
  leaving gives `src=#p3` with ancestors `#edit > document web`. Reproduced identically
  in both directions and both runs.
- **No dedicated "entered/exited container" event exists.** The crossing is fully
  exposed, but only as a property of the event source's position in the tree — a
  consumer must diff the ancestor chain between successive caret events, which is
  precisely the containment-stack diff of
  [containment-state-machine.md](../contract/containment.md).

**So the Linux bridge exposes everything a screen reader needs.** The gap the owner
heard on Windows, if it is systematic, is on the consumption side — and NVDA's own
source says its consumption path *should* work:

| Link (NVDA source, commit `77973a3`) | Where |
|---|---|
| A focused `contenteditable` (IA2_STATE_EDITABLE + FOCUSABLE) gets the `Editor` overlay | `source/NVDAObjects/IAccessible/ia2Web.py:520–522` |
| `Editor.TextInfo = MozillaCompoundTextInfo` — a tree-walking compound TextInfo, **not** a flat offsets one | `ia2Web.py:288–289` |
| Its `getTextWithFields` **does** build `controlStart` fields for every ancestor of the caret object up to the editable root | `source/NVDAObjects/IAccessible/ia2TextMozilla.py:449–450` (entry), `:361–383` (ancestor walk) |
| Only PARAGRAPH and EDITABLETEXT ancestors are dropped as "just text nodes"; a BLOCKQUOTE ancestor produces a real ControlField | `source/compoundDocuments.py:153–157, 164–166` |
| Arrow-by-line speaks via `speakTextInfo(info, unit=UNIT_LINE, reason=CARET)` | `source/editableText.py:267–268 → 181–192 → 165–178` |
| The containment-stack diff in `getTextInfoSpeech` runs for reason CARET (only FOCUS/QUICKNAV skip exits) | `source/speech/speech.py:1636–1646` (diff), `:1650–1663` (exits), `:1697–1711` (entries) |
| Blockquote resolves to `PRESCAT_CONTAINER` (gated only on `reportBlockQuotes`, default true) | `source/textInfos/__init__.py:206–233` (container tuple, blockquote at `:210`), `:119` (config gate) |
| `PRESCAT_CONTAINER` ⇒ `speakEntry=True`, `speakExitForLine=True`; role text survives for CARET on a nameless field | `source/speech/speech.py:2388–2400`, `:2028–2051` |

**Verdict: per NVDA source, arrowing across a blockquote boundary inside a focused
Chromium `contenteditable` should speak "block quote" on entry and "out of block quote"
on exit — focus mode included.** There is no structural focus-mode gap in either the
bridge (measured) or NVDA's code path (read).

**What remains unverified on Windows (🧑 needed):** the owner's real session heard
nothing. Since source says it should fire, the silence is either environmental or a
timing defect, not architecture. Candidate explanations to test with a real NVDA +
Speech Viewer: (a) the caret-move race — `editableText._hasCaretMoved`
(`editableText.py:70–163`) polls for the caret to move and
`_caretScriptPostMovedHelper` then speaks whatever position it captured, so an editor
that moves the caret asynchronously after keydown can be spoken **stale**, from before
the boundary; (b) the edited surface not being a real `<blockquote>` (a styled `div`
produces no control field — §1 above); (c) NVDA version/settings. Record version and
settings when testing. **Never collapse these three layers: bridge-measured (Linux),
source-read (NVDA), observed-in-session (Windows, still missing).**

### Editable lists — measured (Linux) + the NVDA demotion, precisely (source)

**Status: measured 2026-08-30 (B1, AT-SPI, two byte-equivalent runs) + NVDA source at
commit `77973a3`. This replaces the earlier source-read hypothesis, which was right
about the mechanism but overstated its effect.** Artefacts:
[`spikes/atspi/logs/report-b1-run1.txt`](../research/atspi/logs/report-b1-run1.txt)
(+ `-run2`, `tree-b1-run*.json`, raw JSONL alongside).

**Measured on Linux.** The same `<ul>` twice — once inside a `contenteditable` host,
once read-only — tree-dumped, then caret-navigated line by line (the read-only copy via
`--enable-caret-browsing`, which gives it a real caret):

- **The bridge does not demote the editable list.** Both lists are exposed
  identically: role `list` with `setsize=3`, three `list item` children each carrying
  `level=1`, `posinset`, `setsize=3`, and the same interface set (including
  Collection and Text). Child counts, roles and item numbering — everything an AT needs
  for "list, with 3 items, item 2 of 3" — are all present **on the editable copy too**.
- The *only* difference: the editable list, its items and their text leaves carry the
  **`editable`** state. **Neither list carries a `read-only` state** — on this bridge
  the distinction is the presence of `editable`, not the presence of `read-only`.
- The event streams are symmetric. In both copies, each ArrowDown produced one
  `object:text-caret-moved` sourced at the **list item** itself (caret offset 2 —
  after the `'• '` marker text, which is part of the item's AT-SPI text), with
  ancestors `#e-list > #edit > …` / `#r-list > #read > …`. Entering and leaving the
  list changes the event source's ancestry in both cases, identically. As with
  blockquote, the caret event itself carries **no containment payload** — containment
  is exposed only via the source object's place in the tree.

**The NVDA demotion is real, but narrower than this page previously claimed.**
At `77973a3`:

- An editable list (`Role.LIST` without `State.READONLY`) → `PRESCAT_SINGLELINE`
  (`source/textInfos/__init__.py:187–189`); a read-only list → `PRESCAT_CONTAINER`
  (`:229–233`).
- "with N items" is gated on `State.READONLY in states`
  (`source/speech/speech.py:2412–2424`).
- **But `PRESCAT_SINGLELINE` still sets `speakEntry=True`** (`speech.py:2389–2392`).
  What it lacks versus `PRESCAT_CONTAINER` is `speakExitForLine`
  (`speech.py:2395–2400`). So per source, arrowing into an editable list still says
  **"list"** — what is lost is the **item count on entry** and the **"out of list" on
  line exit** (exit is still spoken for character/word movement, via
  `speakExitForOther`). The earlier claim on this page — "no container treatment"
  full stop — implied entry silence; source does not support that.
- A curiosity that confirms the read: the `reportLists` config gate *itself* only
  matches read-only lists (`textInfos/__init__.py:131–135`) — an editable list's entry
  announcement is not even switchable off by that setting.

**What remains unverified on Windows (🧑 needed):** (a) that Chromium actually sets
IA2 `STATE_SYSTEM_READONLY` on lists in read-only pages and clears it inside
`contenteditable` — the Linux tree suggests the split (only `editable` varies) but the
IA2 state vocabulary is not observable from this box; (b) what a real NVDA session
actually speaks — the owner reports lists **sometimes did not read at all** inside an
edit field, which is *more* silence than the source predicts (source predicts "list"
without a count), so either the entry announcement also fails in practice or the
sessions differed in some other way. Same three-layer honesty rule as above.

### What this means for the editor-must-announce argument

Measured on Linux and traced through NVDA source, the platform layer is **not** the
missing link: the bridge exposes editable lists and blockquotes with full container
signals, and NVDA's own focus-mode code path should speak both crossings. The argument
for editor-side announcements therefore must not claim "the AT structurally cannot see
it while editing" — it cannot claim that until the 🧑 Windows session reproduces the
owner's silence under controlled conditions. What the argument *can* now say, with
evidence: (1) at the **moment of transformation** (`- ` → bullet, `> ` → quote) no
platform event announces anything — that gap is untouched by all of this and remains
the editor's alone; (2) even when every link works, NVDA **deliberately degrades an
editable list** — no item count on entry, no "out of list" when arrowing out by line
(source-confirmed) — so an editor that announces list context is not duplicating the
platform, it is supplying what the platform withholds on the editing surface; and
(3) the owner's real-session silence shows the rescue is at best **unreliable in
practice**, which is exactly the situation contract-level announcements exist to close.

### What is still unverified

- **Windows/NVDA in a real session** for both findings above: the B1/B2 Linux captures
  and the source trace predict behaviour that the owner's one real session partly
  contradicts (blockquote: heard nothing; lists: sometimes nothing). Reproducing that
  under recorded conditions (NVDA version, settings, Speech Viewer) is the single
  outstanding step — 🧑 owner, per MASTER-PLAN W2.
- **The IA2 state split** (READONLY set on read-only lists, absent in editable ones)
  is inferred from NVDA's code shape plus the Linux `editable`-state split; it is not
  directly measured on Windows.
- **JAWS, VoiceOver, Orca.** Not checked. The macOS mapping in §2 is visibly weaker, so
  VoiceOver is the most likely to differ.

---

## Method, for the next construct

1. **Measure** the Chromium AX role, including a deliberately non-semantic control case.
2. **Look up** the Core-AAM row and record all four platform mappings, noting any that
   lose information.
3. **Find the role** in the AT's source — spoken label, braille label, quick-nav key.
4. **Find the default**, because a role the AT knows about and does not report by default
   is not a rescue.
5. **State what remains unverified**, especially focus mode versus browse mode.

Steps 1–4 are all documentation and source reading, and none needs a screen reader. Step 5
is the honest boundary of that method.

---

## Rescue chains (B3, 2026-08-30)

The five-step method above, run for list, heading, code block, table and link.

**Sources, pinned.** Chromium AX roles: CDP `Accessibility.getFullAXTree` probe on this
box (Chromium 141.0.7390.37, the harness binary), a `data:` page carrying each construct
**plus a visually-equivalent non-semantic control**, run twice with **byte-identical
output**. The probe is a ~60-line throwaway per the MASTER-PLAN §6 protocol (gitignored,
not part of the harness): `harness/driver.mjs` `launch()`, navigate the `data:` URL, dump
`Accessibility.getFullAXTree` roles + properties; every measured cell below quotes that
dump, so the tables are the artefact. Platform mappings: [Core-AAM 1.2] and [HTML-AAM 1.0]
fetched 2026-08-30, section numbers per the fetched copies. NVDA: source at commit
`77973a3015e9a58dc8638d9a6dc61b9f60e853b4` — the **same commit as the B1/B2 trace above**,
so line numbers agree across this whole page. Everything in the NVDA column is
**source-read, not observed**: it predicts what NVDA says; no Windows session has
confirmed any of it (§ unverified, per chain).

[Core-AAM 1.2]: https://www.w3.org/TR/core-aam-1.2/
[HTML-AAM 1.0]: https://www.w3.org/TR/html-aam-1.0/

### Chain: list (`<ul>` / `<ol>` / `<li>`)

| Link | Evidence |
|---|---|
| 1 · Chromium role — **measured** | `<ul>` and `<ol>` → **`list`**; `<li>` → **`listitem`** with `level=1` (`level=2` when nested) and a `ListMarker` child named `"• "` / `"1. "` / `"◦ "`. **No `setsize`/`posinset` in the CDP projection** (consistent with E3.17) — though HTML-AAM §3.5.85 requires `<li>` to reflect `aria-setsize`/`aria-posinset`, and the AT-SPI side *does* expose both (B1, measured, above): the loss is in the CDP projection, not the platform bridge. **Control:** the styled `div` bullet-list lookalike → `generic` throughout. |
| 2 · Core-AAM | `list` §3.4.3.38: MSAA/IA2 `ROLE_SYSTEM_LIST` + **`STATE_SYSTEM_READONLY`**; UIA `List`; ATK `ROLE_LIST`; AX `AXList`/`AXContentList`. `listitem` §3.4.3.41: `ROLE_SYSTEM_LISTITEM` + `STATE_SYSTEM_READONLY`; UIA `ListItem` + SelectionItem; ATK `ROLE_LIST_ITEM`; AX **`AXGroup`, subrole `<nil>`** — macOS drops listitem-ness at the role level. Note the spec itself puts `STATE_SYSTEM_READONLY` on the mapping: the exact state NVDA's editable-list demotion keys on. |
| 3 · NVDA role | `Role.LIST = 14`, `LISTITEM = 15` (`controlTypes/role.py:59–60`), spoken `_("list")` / `_("list item")` (`:237`, `:239`); braille `lst` (`braille/labels.py:44`; no LISTITEM abbreviation exists). Quick-nav **`l`** (list, `browseMode.py:995–996`) and **`i`** (list item, `:1010–1011`). |
| 4 · The default | `reportLists = boolean(default=true)` (`config/configSpec.py:279`), gating at `textInfos/__init__.py:132–134` — which only matches lists **with `State.READONLY`**. Read-only list → `PRESCAT_CONTAINER` (`:229` → `:233`): entry + "with N items" (`speech/speech.py:2412–2425`) + line exit. Editable list → the **measured-narrower demotion** established by B1 (section above, verbatim): `PRESCAT_SINGLELINE` (`textInfos/__init__.py:187` → `:189`) keeps `speakEntry` (`speech.py:2389–2392`) so bare **"list" entry is kept**; the **item count** (`:2412–2425`, READONLY-gated) and the **"out of list" on line exit** (`:2395–2400`) are **lost**. `<li>` itself is layout when read by line (in no category list; falls to `:242`) — its bullet reaches the user as marker text, exactly what the CDP `ListMarker` node carries. |
| 5 · Unverified | Real Windows NVDA for both halves (the owner heard *more* silence than source predicts — E4.11/E4.12 discrepancy, open). Whether Chromium sets IA2 `STATE_SYSTEM_READONLY` on read-only lists (inferred from the Linux `editable`-state split, E4.12). JAWS, VoiceOver (macOS's `AXGroup` items make VoiceOver the likeliest to differ). Focus mode is source-predicted via the B2 trace, not observed. |

**Verdict: rescued for reading; partially rescued on the editing surface** (entry kept;
count and line-exit deliberately withheld by NVDA — the editor is not duplicating the
platform if it supplies them).

### Chain: heading (`<h1>`–`<h6>`)

| Link | Evidence |
|---|---|
| 1 · Chromium role — **measured** | `<h1>`…`<h6>` → **`heading`** with `level=1`…`6`; `<div role="heading" aria-level="3">` → `heading`, `level=3`. **Control:** a `div` styled to look exactly like an `<h1>` (2em, bold) → `generic`. |
| 2 · Core-AAM / HTML-AAM | `heading` §3.4.3.33: MSAA/IA2 **`IA2_ROLE_HEADING`** + `xml-roles:heading`; UIA `Text` + Localized Control Type **"heading"**; ATK `ROLE_HEADING`; AX **`AXHeading`**. HTML-AAM §3.5.47: heading role with `aria-level` = the tag number. **No platform loses the construct**; the strongest row of the five. |
| 3 · NVDA role | `Role.HEADING = 40` (+ `HEADING1`–`6` = 41–46, `controlTypes/role.py:85–91`), spoken `_("heading")` / `_("heading 1")`… (`:292–304`); braille has no abbreviation — displayString plus level as `lv N` (`braille/regions/properties.py`). Quick-nav **`h`** (`browseMode.py:909–910`) plus **per-level keys `1`–`9`** (`_addQuickNavHeading`, `:633`, registered at `:922`). |
| 4 · The default | `reportHeadings = boolean(default=true)` (`configSpec.py:280`), gate at `textInfos/__init__.py:118`. `HEADING` → `PRESCAT_SINGLELINE` (`:162` → `:189`) → `speakEntry` (`speech.py:2389–2392`); the level attribute (`speech.py:2345`) is spoken as `_("level %s")` (`:2184`, sequenced at `:2381`) — "heading, level 2". No state-conditioned demotion exists for headings: the editable surface takes the same path. |
| 5 · Unverified | Real Windows NVDA; JAWS/VoiceOver; focus mode source-predicted only. Already corroborated at the harness layer: E3.12 measured `[polite] "Heading level 1"` announced by Lexical-next — the platform half of that chain is this table. |

**Verdict: rescued for reading**, on every link, with no editable-state demotion.

### Chain: code block (`<pre><code>`)

| Link | Evidence |
|---|---|
| 1 · Chromium role — **measured (E4.13, cited not re-run)** | `<code>` → **`code`**; `<pre>` → **`generic`** — the code-ness survives, the preformatted-ness does not (E4.13). **Control (new, this probe):** a monospace, `white-space:pre`, shaded `div` — visually a code block — → `generic`. Language is unreachable in every editor measured (E4.14). |
| 2 · Core-AAM | `code` §3.4.3.13: MSAA/IA2 **`IA2_ROLE_TEXT_FRAME`** + object attribute `xml-roles:code`; UIA `Text` + Localized Control Type "code"; ATK **`ROLE_STATIC`** + `xml-roles:code`; AX `AXGroup` + subrole **`AXCodeStyleGroup`**. **Windows and Linux collapse the role into a generic one** — `IA2_ROLE_TEXT_FRAME` is shared with `abbr`, `emphasis` and `time` (Chromium `ui/accessibility/platform/ax_platform_node_win.cc`, `kCode` case, confirms the implementation matches the spec) — leaving the object attribute as the *only* carrier of code-ness. macOS is, unusually, the **richest** mapping here. |
| 3 · NVDA role | **Does not exist.** `controlTypes/role.py` at `77973a3` contains no code role — zero matches for "code" in the file. No braille label. No quick-nav key (`browseMode.py` registers none). `IA2_ROLE_TEXT_FRAME` maps to `Role.TEXTFRAME` (`IAccessibleHandler/__init__.py:182`), and NVDA consumes `xml-roles` only for `gridcell` and a Kindle special case (repo-wide search, `77973a3`) — **`xml-roles:code` is read nowhere**. |
| 4 · The default | There is no setting because there is nothing to switch: `TEXTFRAME` appears in no `formatConfig` gate and no presentation-category list in `textInfos/__init__.py`, so it falls through to **`PRESCAT_LAYOUT`** (`:242`) — "just layout as far as the user is concerned" — which speaks nothing on entry, exit, or quick-nav. `configSpec.py` has no code-related key. The only signal that could indirectly reveal a code block is the monospace font, and `reportFontName = boolean(default=false)` (`configSpec.py:243`). |
| 5 · Unverified | JAWS (which does announce code in some hosts) and VoiceOver (`AXCodeStyleGroup` — macOS could plausibly rescue what Windows cannot); a real NVDA session (predicted: silence); whether Chromium emits `xml-roles:code` as an IA2 object attribute at all (spec says it must; unmeasured — and moot while no reader consumes it). |

**Verdict: NOT rescued for NVDA.** The chain breaks at link 3: Chromium exposes the role,
Core-AAM maps it (weakly), and NVDA discards it — no role, no label, no key, no setting.
**Consequence for the corpus:** every `codeblock.*` row scored `discoverable` in
`results.json` is over-credited for this project's primary AT. What is discoverable is
the *text* of the code; its code-ness — the thing the outcome vocabulary credits the
platform with carrying — never reaches an NVDA user by any default path. CKEditor's
"Entering %0 code snippet" is not duplicating the platform; for NVDA it is the only
channel that exists.

### Chain: table (`<table>` / `<th>` / `<td>`)

| Link | Evidence |
|---|---|
| 1 · Chromium role — **measured** | `<table>` → **`table`** (named from its `<caption>`: `name="Prices"`), `<thead>` → `rowgroup`, `<tr>` → `row`, `<th>` → **`columnheader`**, `<td>` → **`cell`**, caption → `caption`. Row/column **counts are not surfaced as properties in the CDP projection**; on Windows they travel via the table interfaces (link 2). **Control:** a CSS-grid lookalike with bold header cells → `generic` throughout — six anonymous text runs, no table, rows, or cells. |
| 2 · Core-AAM / HTML-AAM | `table` §3.4.3.85: MSAA/IA2 `ROLE_SYSTEM_TABLE` + **`IAccessibleTable2`** interface; UIA `Table` + Grid/Table patterns; ATK `ROLE_TABLE` + Table interface; AX `AXTable` (+ header-element pointers). `row` §3.4.3.65: `ROLE_SYSTEM_ROW` / UIA DataItem "row" / ATK `ROLE_TABLE_ROW` / `AXRow`. `cell` §3.4.3.11: `ROLE_SYSTEM_CELL` + `IAccessibleTableCell`; UIA DataItem + GridItem/TableItem; ATK `ROLE_TABLE_CELL` + TableCell; `AXCell`. `columnheader` §3.4.3.14: `ROLE_SYSTEM_COLUMNHEADER` / UIA "column header". Weak spots: `rowgroup` §3.4.3.67 is **"Not mapped"** on AX (macOS loses thead/tbody grouping — harmless), and HTML-AAM §3.5.127 carries the caption-labelling relations seen in link 1. |
| 3 · NVDA role | `Role.TABLE = 28`, `TABLECELL = 29`, `TABLEROW = 31`, `TABLECOLUMNHEADER = 32` (`controlTypes/role.py:73–77`), spoken `_("table")`, `_("cell")`, `_("row")`, `_("column header")` (`:268–280`); braille `tbl` (`braille/labels.py:80`). Quick-nav **`t`** (`browseMode.py:924–925`); in-table navigation is Ctrl+Alt+arrows. |
| 4 · The default | `reportTables = boolean(default=true)` (`configSpec.py:267`), gate at `textInfos/__init__.py:124–129`. `TABLE` → `PRESCAT_CONTAINER` (`:220` → `:233`); entry speaks "table **with N rows and M columns**" from the `table-rowcount`/`columncount` field attributes (`speech.py:2426–2440`, count text `:2201–2218`). Cells → `PRESCAT_CELL` (`:202` → `:206`), entry-only (`speech.py:2393–2394`), with coordinates on by default (`reportTableCellCoords = True`, `configSpec.py:271`) and headers on by default (`reportTableHeaders = default=1` = `ROWS_AND_COLUMNS`, `configSpec.py:270`, `config/configFlags.py:228–231`; gating `speech.py:989–1010`). **One trap:** a table Chromium marks with the `table-layout` object attribute is demoted to layout unless `includeLayoutTables` (default **False**, `configSpec.py:268`; logic `textInfos/__init__.py:82–106`) — a real `<table>` with `<th>`/`<caption>`, which is what every editor in the corpus emits, is a data table and unaffected. |
| 5 · Unverified | Real Windows NVDA; whether Chromium stamps `table-rowcount`/`columncount` attributes as NVDA's virtual buffer expects (NVDA reads them at `speech.py:2428–2429`; the bridge leg is doc+source, unmeasured — cf. E4.2's open UIA question); JAWS/VoiceOver; table behaviour *inside* `contenteditable` (no state-conditioned demotion exists in the presentation-category code — unlike lists — but nothing table-shaped has been measured in an editable host). |

**Verdict: rescued for reading** — the richest default of the five (counts, coordinates
and headers all on) — with the layout-table demotion as the recorded trap.

### Chain: link (`<a href>`)

| Link | Evidence |
|---|---|
| 1 · Chromium role — **measured** | `<a href="…">` → **`link`**, `focusable`, with the target in the `url` property. **`<a>` without `href` → `generic`** — not a weaker link, no link at all. **Control:** a styled `span` (blue, underlined, pointer cursor) → `generic`. |
| 2 · Core-AAM / HTML-AAM | `link` §3.4.3.37: MSAA/IA2 `ROLE_SYSTEM_LINK` + `STATE_SYSTEM_LINKED` (also on descendants) + `IAccessibleHypertext`; UIA `HyperLink` + Value pattern; ATK `ROLE_LINK` + Hyperlink; AX `AXLink`. No platform loses it. HTML-AAM §3.5.2 maps `<a>` *(represents a hyperlink)* → link role; §3.5.3 maps `<a>` **(no `href`)** → **`generic`** — the spec-level twin of the measured control row. |
| 3 · NVDA role | `Role.LINK = 19` (`controlTypes/role.py:64`), spoken `_("link")` (`:249`); braille `lnk` (`braille/labels.py:56`). Quick-nav **`k`** (`browseMode.py:939–940`), plus **`v`** visited (`:953–954`) and **`u`** unvisited (`:967–968`). |
| 4 · The default | `reportLinks = boolean(default=true)` (`configSpec.py:274`), gate at `textInfos/__init__.py:116`. `LINK` → `PRESCAT_SINGLELINE` (`:161` → `:189`) → spoken on entry and when moving within the line (`speech.py:2389–2392`); links are the one role whose states are spoken *before* the role (`speech.py:2406`) — "visited link". No editable-state demotion. |
| 5 · Unverified | Real Windows NVDA; JAWS/VoiceOver; focus-mode crossing into a link inside `contenteditable` (source-predicted via B2's trace). **Editor-shaped risk, untested:** an editor that builds its link UI as `<a>` without `href` during editing (or swaps href in late) sits in the measured `generic` row — the construct to check when link contracts land. |

**Verdict: rescued for reading** — conditional on the `href` actually being present.

### Summary: five chains plus blockquote

| Construct | Chromium AX role (control) | Mapping weak spots | NVDA default | Verdict |
|---|---|---|---|---|
| List `<ul>/<ol>/<li>` | `list`/`listitem` + level (styled div → `generic`) | AX: listitem = `AXGroup` no subrole; CDP projection drops setsize/posinset | `reportLists=true`; READONLY-only gate; editable: entry kept, count + line-exit lost (B1, measured-narrower) | **Rescued for reading; partial while editing** |
| Heading `<h1>`–`<h6>` | `heading` + level 1–6 (styled div → `generic`) | none | `reportHeadings=true`; `h` + `1`–`9`; "heading, level N" | **Rescued** |
| Code block `<pre><code>` | `code` (E4.13); `<pre>` → `generic`; styled div → `generic` | IA2 `TEXT_FRAME` and ATK `ROLE_STATIC` are generic; only `xml-roles:code` carries code-ness; macOS richest | **No NVDA role, no label, no key, no setting; `PRESCAT_LAYOUT` — silence** | **NOT rescued (NVDA)** |
| Table `<table>/<th>/<td>` | `table`/`row`/`columnheader`/`cell`, caption-named (CSS grid → `generic`) | AX drops `rowgroup`; layout-table demotion (`includeLayoutTables=False`) | `reportTables=true`; counts + coords + headers all on by default; `t` | **Rescued** (richest default) |
| Link `<a href>` | `link` + url (`<a>` no href → **`generic`**; styled span → `generic`) | none — but no href = no construct, per spec and measured | `reportLinks=true`; `k`/`u`/`v`; "visited link" | **Rescued, iff href present** |
| Blockquote (above) | `blockquote` (styled div → `generic`) | AX: `AXGroup` no subrole | `reportBlockQuotes=true`; `q` | **Rescued for reading** (Windows session discrepancy open) |

### What this certifies about `discoverable` in `results.json`

Per family carrying at least one `discoverable` outcome in the standing run:

- **`bulleted-list.*`, `list.*`, `entry-parity.list`** — justified by the list chain: a
  real `list`/`listitem` structure is findable by an NVDA user by default. On the
  editing surface the rescue is partial (count and line-exit withheld), which is the
  measured argument *for* editor-side announcements, not against the outcome.
- **`heading.create`** — justified by the heading chain, the strongest of the six.
- **`blockquote.*`, `entry-parity.blockquote`** — justified by the blockquote chain at
  the top of this page.
- **`codeblock.*`, `entry-parity.codeblock`** — **not justified for NVDA.** The chain
  breaks inside the AT. These rows' `discoverable` means "the text is reachable and the
  AX tree carries role `code`"; it must not be read as "an NVDA user can find out they
  are in a code block", because per source they cannot, on any default path. Recorded
  as correction C13 in `EVIDENCE.md`.
- **`history.undo`/`history.redo`** — outside B3's five constructs: that family's
  `discoverable` rests on the restored *text* being re-readable, not on any role chain,
  and is unaffected by this section.
- **Table and link** have no contracts yet; their chains are recorded here ahead of
  need, including the two traps a future contract must probe (layout-table demotion;
  href-less anchors).

## Constructs still to do

Task list items · `<figure>` / `<figcaption>`. The five constructs above and blockquote
are done; the remaining two follow the same method.

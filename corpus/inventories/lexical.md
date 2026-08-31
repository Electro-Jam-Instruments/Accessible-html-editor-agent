# Lexical — editing-scenario corpus

**Subject:** [facebook/lexical](https://github.com/facebook/lexical), `main` @ `ad5904e`
(2026-08-27), workspace version `0.49.0`. Everything below is read from the repository at
that commit; paths are repo-relative to `facebook/lexical`.

**Purpose:** the Lexical row-set for the corpus defined in
[`../layered-gap-analysis.md`](../../docs/the-gap.md). Lexical is treated here as a
first-class, fully-featured editor — a plugin system with complete markdown support, ~55
playground plugins/extensions, 38 node classes and a 50-command surface — not as a
framework with a few plugins.

Every scenario is classified into exactly one bucket:

- **B1 — automated conversion.** The user typed ordinary characters; the editor changed
  the document unasked.
- **B2 — user-initiated change.** The user pressed a command and needs the resulting
  *state*.
- **B3 — menus and popups.** Typeahead, mentions, emoji picker, slash commands,
  autocomplete, floating toolbars, dialogs.

Section **CB** (container boundaries) uses its own ID range but the same schema; each row
still carries the bucket its trigger belongs to.

`currentSR` is what a screen reader user gets **today**. Where it is derived from source it
is stated plainly; where it depends on browser/AT behaviour that was not measured it is
marked `INFERRED`.

---

## 1. What counts as "full configuration"

The playground is the fullest supported configuration and is the definition used here. Its
extension graph is `packages/lexical-playground/src/App.tsx` (`AppExtension` +
`PlaygroundRichTextExtension`); its React plugin tree is
`packages/lexical-playground/src/Editor.tsx`; the plugin directory is
`packages/lexical-playground/src/plugins/`.

### 1.1 Complete plugin / extension inventory

Every directory in `packages/lexical-playground/src/plugins/`, classified. "n/a" means the
plugin is developer tooling or has no user-facing editing scenario.

| # | Plugin / extension | Buckets | Scenarios |
|---|---|---|---|
| 1 | `ActionsPlugin` | B2 | import/export JSON, share, clear, read-only toggle, **Convert To/From Markdown** (whole-document restructure), speech-to-text button |
| 2 | `AutoEmbedPlugin` | B1 + B3 | an embeddable URL offers a conversion menu |
| 3 | `AutoLinkExtension` | B1 | URL autodetection while typing — **the one B1 with an announcer** |
| 4 | `AutocompleteExtension` (`disabled: true`) | B3 | inline ghost-text completion; Tab/ArrowRight accepts |
| 5 | `CardExtension` | B2 | slot-based block host (title + body slots) |
| 6 | `CodeActionMenuPlugin` | B3 | hover menu on a code block: copy, prettier, **language selection** |
| 7 | `CodeHighlightExtension` | B1 | tokenises code as you type into `CodeHighlightNode`s |
| 8 | `CollapsibleExtension` | B2 + CB | disclosure container; arrow + Enter overrides |
| 9 | `CommentPlugin` | B2 + B3 | `MarkNode` on a passage, comment input, thread sidebar |
| 10 | `ComponentPickerPlugin` | B3 | `/` slash-command typeahead (~25 options) |
| 11 | `ContextMenuPlugin` | B3 | right-click menu built on `LexicalMenu` |
| 12 | `DateTimeExtension` | B1 | `/today`, `/tomorrow` insert a `DateTimeNode` decorator |
| 13 | `DocsPlugin` | n/a | links to docs |
| 14 | `DragDropPasteExtension` | B2 | files dropped/pasted become images |
| 15 | `DraggableBlockPlugin` | B3 | mouse-only gutter handle + menu |
| 16 | `EmojiPickerPlugin` | B3 | `:` typeahead over the full emoji list |
| 17 | `EmojisExtension` | B1 | `:)`, `:D`, `:(`, `<3` → `EmojiNode`, no confirming keystroke |
| 18 | `EquationsExtension` | B1 + B2 | `$…$` text-match and a modal; `EquationNode` has `role="math"` |
| 19 | `ExcalidrawExtension` | B2 + B3 | drawing decorator + editing modal |
| 20 | `FigmaExtension` | B1 | Figma URL → `FigmaNode` iframe decorator |
| 21 | `FindReplaceExtension` | B2 + B3 | `role="dialog"`, `aria-pressed` on the option toggles, `MarkNode`/CSS Highlight matches |
| 22 | `FloatingLinkEditorPlugin` | B3 | link-edit balloon |
| 23 | `FloatingTextFormatToolbarPlugin` | B3 | selection-triggered format bar |
| 24 | `ImagesExtension` | B1 + B2 | `![alt](src)` markdown, insert modal, caption sub-editor, resize |
| 25 | `LayoutExtension` | B2 + CB | CSS-grid multi-column container |
| 26 | `MarkdownShortcutsExtension` | **B1 (all of it)** | see §3 — the whole transformer set |
| 27 | `MarkdownTransformers` | B1 | playground additions: `TABLE`, `HR`, `IMAGE`, `EMOJI`, `BLOCK_EQUATION`, `EQUATION`, `TWEET` |
| 28 | `MaxLengthPlugin` | **B1** | silently trims text past the limit via `$trimTextContentFromAnchor` |
| 29 | `MentionsExtension` | B3 | `@` typeahead; `MentionNode` is a token `TextNode` |
| 30 | `PageBreakExtension` | B2 | `PageBreakNode` block decorator |
| 31 | `PagesExtension` / `PagesReactExtension` | n/a | pagination rendering |
| 32 | `PasteLogPlugin` | n/a | debug |
| 33 | `PollExtension` | B2 + B3 | `PollNode` decorator with interactive options |
| 34 | `PullQuoteExtension` | B2 + CB | slot-based quote block |
| 35 | `ReviewExtension` | B2 | star-rating slot block; uses `aria-pressed` |
| 36 | `RubyExtension` | B2 + B3 | ruby annotation; uses `role="group"` and `aria-label` |
| 37 | `ShortcutsExtension` | B2 | the whole keyboard map (§4.1) + help dialog |
| 38 | `SpecialTextExtension` (`disabled: true`) | B1 | `[foo]` → `SpecialTextNode` |
| 39 | `SpeechToTextPlugin` | B2 | dictation toggle; no `aria-pressed` |
| 40 | `TabFocusExtension` | B2 | preserves the selection when focus arrives via Tab |
| 41 | `TableActionMenuPlugin` | B3 | per-cell dropdown (insert/delete row/column, merge, header) |
| 42 | `TableCellResizer` | n/a | mouse-only |
| 43 | `TableFitNestedTablePlugin` | n/a | layout |
| 44 | `TableHoverActionsV2Plugin` | B3 | mouse-only "+" affordances |
| 45 | `TableOfContentsPlugin` | B2 | heading outline; entries are `role="button"` |
| 46 | `TablePlugin` | B2 + CB | table creation and cell navigation |
| 47 | `TableScrollShadowPlugin` | n/a | `aria-hidden` scrollbar chrome |
| 48 | `TerseExportExtension` | n/a | serialisation |
| 49 | `TestRecorderPlugin` | n/a | dev tooling |
| 50 | `ToolbarPlugin` | B2 + B3 | `role="toolbar"`; ~30 controls; **no `aria-pressed` on any format button** |
| 51 | `TreeViewPlugin` | n/a | debug view |
| 52 | `TwitterExtension` | B1 | tweet URL → `TweetNode` |
| 53 | `TypingPerfPlugin` | n/a | instrumentation |
| 54 | `VersionsPlugin` | n/a | version banner |
| 55 | `VisibleNonPrintingExtension` (`disabled: true`) | B2 | shows pilcrows/spaces |
| 56 | `YouTubeExtension` | B1 | YouTube URL → `YouTubeNode` iframe |

Additional framework extensions the playground mounts that are not in that directory:
`AutoFocus`, `ClearEditor`, `DecoratorText`, `WatchEditable`, `History`,
**`HistoryAnnounce`**, **`EditorModeAnnounce`**, `Keywords`, `Hashtag`, `SelectBlock`,
`SelectionAlwaysOnDisplay`, `ClickableLink`, `ClickAfterLastBlock`, `Link`,
`HorizontalRule`, `List` (`shouldPreserveNumbering: false`), `CheckList`, `RichText`
(which itself depends on **`HeadingAnnounce`**), `Table` (`hasStickyScrollbar: true`),
`TabIndentation` (`maxIndent: 7`), `Dragon`, **`FocusTrap`**, **`RovingTabIndex`**,
**`FocusManager`**, `CharacterLimitPlugin`.

### 1.2 Node catalogue — every node is a caret-navigation scenario

`packages/lexical-playground/src/nodes/PlaygroundNodes.ts` registers 38 classes. A
`DecoratorNode`'s DOM is given `contentEditable = 'false'` by the reconciler
(`packages/lexical/src/LexicalReconciler.ts`), which is exactly the embedded-object /
U+FFFC case in the platform text APIs. `DecoratorNode` defaults are `isInline() → true`,
`isIsolated() → false`, `isKeyboardSelectable() → true`
(`packages/lexical/src/nodes/LexicalDecoratorNode.ts`).

Arrowing onto a non-inline, keyboard-selectable decorator produces a **`NodeSelection`**
— a Lexical-internal selection with no DOM range. The node gains a `.selected` CSS class;
the browser's caret is gone, so the platform text API reports no caret position at all
(INFERRED for the AT consequence, verified for the mechanism in
`KEY_ARROW_*_COMMAND` handlers in `packages/lexical-rich-text/src/index.ts` and
`$exitNodeSelectionToward`).

| Node | Kind | DOM produced | Accessible exposure | Caret-crossing outcome |
|---|---|---|---|---|
| `HeadingNode` | element | `<h1>`–`<h6>` | correct heading + level | AT-native |
| `QuoteNode` | element | `<blockquote>` | correct | AT-native; see §6.1 |
| `CodeNode` | element | bare `<code>` + `spellcheck="false"` + `data-language` | **no role, no name, no `<pre>`** | silent |
| `CodeHighlightNode` | text | `<span class=token…>` | plain text | fine |
| `ListNode`/`ListItemNode` | element | `<ul>`/`<ol>`/`<li>`, real nesting | correct list semantics; **no `aria-level`** | AT-native |
| check-list `ListItemNode` | element | `<li role="checkbox" tabindex="-1" aria-checked>` | **`listitem` role destroyed**; the checkbox never takes focus | broken both ways |
| `LinkNode` / `AutoLinkNode` | element (inline) | `<a href>` | correct | AT-native |
| `HashtagNode`, `KeywordNode` | text | `<span class="hashtag"/"keyword">` | plain text, no role | invisible as a distinct thing |
| `MentionNode` | text (token mode) | `<span class="mention" data-lexical-mention>` | **plain text only** — no role, no `aria-label`; `canInsertTextBefore/After → false` | reads as the raw name; token-ness invisible |
| `EmojiNode` | text (token mode) | `<span class="emoji"><span class="emoji-inner">` | the glyph; the AT's own emoji name | fine |
| `SpecialTextNode` | text | `<span>` | plain text | invisible |
| `OverflowNode` | element (inline) | wrapper span | none | invisible |
| `MarkNode` (comments, find) | element (inline) | `<mark>` | `mark` role in modern AT | partially conveyed |
| `HorizontalRuleNode` | **decorator, block** | `<hr>` | `separator` role; `getTextContent() → "\n"` | becomes a `NodeSelection`; issue [#8025](https://github.com/facebook/lexical/issues/8025) |
| `PageBreakNode` | **decorator, block** | `<div data-lexical-page-break>` | **nothing** | `NodeSelection`, silent |
| `ImageNode` | **decorator, block** | `<span>` host + React `<img alt>` + optional caption sub-editor | the `alt` is exposed; the resize handles and caption editor are not named | `NodeSelection`; entering the caption is a nested editor |
| `EquationNode` | **decorator** (inline or block) | `<span role="math" aria-label="Equation: …">` | **best-labelled node in the product** | announced as maths with the source as its name |
| `PollNode` | **decorator, block** | `<div>` + React poll UI | `data-lexical-poll-question` only; the options are unlabelled controls | `NodeSelection`, silent |
| `StickyNode` | **decorator, `isIsolated(): true`** | portal | **unreachable by caret at all** | keyboard-inaccessible by construction |
| `ExcalidrawNode` | **decorator, block** | `<span>` + canvas/SVG | none | `NodeSelection`, silent |
| `TweetNode` | **decorator, block** | `<blockquote class="twitter-tweet">` + script | `getTextContent()` returns a URL string | `NodeSelection`, silent |
| `YouTubeNode` | **decorator, block** | `<iframe title="YouTube video">` | the iframe has a `title` **only on export**, not in `createDOM` | `NodeSelection`; a focusable iframe inside a text flow |
| `FigmaNode` | **decorator, block** | `<iframe>` | none | `NodeSelection`, silent |
| `DateTimeNode` | **decorator, inline** | `<span data-lexical-date-time>` | `getTextContent()` gives the formatted date | reads as its text |
| `CollapsibleContainerNode` | element | **`<div open="">` on Chrome/Firefox**; `<details>` elsewhere | **no disclosure semantics on Chrome/Firefox** | see §6.5 |
| `CollapsibleTitleNode` | element | `<summary>` | a `<summary>` with no `<details>` parent has no role | silent |
| `CollapsibleContentNode` | element | `<div>` | none | silent |
| `LayoutContainerNode`/`LayoutItemNode` | element | `<div style="grid-template-columns:…">` | **none** — no role, no name, no column index | silent |
| `TableNode`/`TableRowNode`/`TableCellNode` | element | native `<table>/<tr>/<th>/<td>` | correct grid semantics | AT-native |
| `CardNode`, `ReviewNode`, `PullQuoteNode`, `SlotContainerNode` | element/decorator + slots | `<div>` hosts | none | silent |

---

## 2. The command surface

`createCommand` / `editor.dispatchCommand` / `editor.registerCommand` are declared in
`packages/lexical/src/LexicalCommands.ts`, which holds the complete built-in set:

`SELECTION_CHANGE_COMMAND`, `SELECTION_INSERT_CLIPBOARD_NODES_COMMAND`, `CLICK_COMMAND`,
`BEFORE_INPUT_COMMAND`, `INPUT_COMMAND`, `COMPOSITION_START_COMMAND`,
`COMPOSITION_END_COMMAND`, `DELETE_CHARACTER_COMMAND`, `INSERT_LINE_BREAK_COMMAND`,
`INSERT_PARAGRAPH_COMMAND`, `CONTROLLED_TEXT_INSERTION_COMMAND`, `PASTE_COMMAND`,
`REMOVE_TEXT_COMMAND`, `DELETE_WORD_COMMAND`, `DELETE_LINE_COMMAND`,
`FORMAT_TEXT_COMMAND`, `SET_TEXT_FORMAT_COMMAND`, `UNDO_COMMAND`, `REDO_COMMAND`,
`KEY_DOWN_COMMAND`, `KEY_ARROW_RIGHT_COMMAND`, `MOVE_TO_END`, `KEY_ARROW_LEFT_COMMAND`,
`MOVE_TO_START`, `KEY_ARROW_UP_COMMAND`, `KEY_ARROW_DOWN_COMMAND`, `KEY_ENTER_COMMAND`,
`KEY_SPACE_COMMAND`, `KEY_BACKSPACE_COMMAND`, `KEY_ESCAPE_COMMAND`, `KEY_DELETE_COMMAND`,
`KEY_TAB_COMMAND`, `INSERT_TAB_COMMAND`, `INDENT_CONTENT_COMMAND`,
`OUTDENT_CONTENT_COMMAND`, `DROP_COMMAND`, `FORMAT_ELEMENT_COMMAND`, `DRAGSTART_COMMAND`,
`DRAGOVER_COMMAND`, `DRAGEND_COMMAND`, `COPY_COMMAND`, `CUT_COMMAND`,
`SELECT_ALL_COMMAND`, `CLEAR_EDITOR_COMMAND`, `CLEAR_HISTORY_COMMAND`,
`CAN_REDO_COMMAND` *(deprecated 0.49.0 → `canRedo` signal)*, `CAN_UNDO_COMMAND`
*(deprecated → `canUndo` signal)*, `FOCUS_COMMAND`, `BLUR_COMMAND`,
`KEY_MODIFIER_COMMAND` *(deprecated)*.

Package commands: `INSERT_UNORDERED_LIST_COMMAND`, `INSERT_ORDERED_LIST_COMMAND`,
`REMOVE_LIST_COMMAND`, `UPDATE_LIST_START_COMMAND`
(`packages/lexical-list/src/registerList.ts`); `INSERT_CHECK_LIST_COMMAND`
(`packages/lexical-list/src/checkList.ts`); `TOGGLE_LINK_COMMAND`
(`packages/lexical-link/src/LexicalLinkNode.ts`); `INSERT_TABLE_COMMAND`
(`packages/lexical-table/src/LexicalTableCommands.ts`); `DRAG_DROP_PASTE`
(`packages/lexical-rich-text/src/index.ts`); `INSERT_HORIZONTAL_RULE_COMMAND`
(`packages/lexical-extension/src/HorizontalRuleExtension.ts`);
`SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND`
(`packages/lexical-react/src/shared/LexicalMenu.tsx`).

`registerRichText` registers handlers for 31 of them
(`packages/lexical-rich-text/src/index.ts`). **None of the 50 commands emits an
announcement**, with the two exceptions of `UNDO_COMMAND` and `REDO_COMMAND`, which
`HistoryAnnounceExtension` hooks at `COMMAND_PRIORITY_LOW` and passes through
(`return false`).

**Announcement-layer caveat that applies to everything below.** Every announcer is an
*extension*. The legacy React plugin path (`RichTextPlugin` → `useRichTextSetup` →
`registerRichText`; `AutoLinkPlugin` → `registerAutoLink`) does **not** pull in
`HeadingAnnounceExtension` or `AutoLinkAnnounceExtension`. An app on the classic plugin
API — which is the overwhelming majority of deployed Lexical — gets **zero** announcements
from Lexical.

---

## 3. B1 — Automated conversion

Markdown shortcuts are registered by `registerMarkdownShortcuts`
(`packages/lexical-markdown/src/MarkdownShortcuts.ts`), driven from an editor update
listener rather than a keystroke handler. Firing rules, verified in
`runElementTransformers` / `runMultilineElementTransformers` /
`runTextMatchTransformers` / `$runTextFormatTransformers`:

- **element / multiline-element** transformers require the character before the caret to
  be a space, the match to start at the block's first child, and the match length to equal
  the caret offset; those with `triggerOnEnter: true` also fire on Enter;
- **text-format** transformers are indexed by the last character of their tag and fire when
  that character is typed;
- **text-match** transformers are indexed by their `trigger` character;
- updates tagged `COLLABORATION_TAG` or `HISTORIC_TAG` are skipped, and an IME session is
  handled through `COMPOSITION_END_TAG` with a trigger-character allowlist.

Transformer definitions: `packages/lexical-markdown/src/MarkdownTransformers.ts`
(`ELEMENT_TRANSFORMERS = [HEADING, QUOTE, UNORDERED_LIST, ORDERED_LIST]`,
`MULTILINE_ELEMENT_TRANSFORMERS = [CODE]`,
`TEXT_FORMAT_TRANSFORMERS = [INLINE_CODE, BOLD_ITALIC_STAR, BOLD_ITALIC_UNDERSCORE,
BOLD_STAR, BOLD_UNDERSCORE, HIGHLIGHT, ITALIC_STAR, ITALIC_UNDERSCORE, STRIKETHROUGH]`,
`TEXT_MATCH_TRANSFORMERS = [LINK]`), plus the playground's
`PLAYGROUND_TRANSFORMERS = [TABLE, HR, IMAGE, EMOJI, BLOCK_EQUATION, EQUATION, TWEET,
CHECK_LIST, …ELEMENT, …MULTILINE, …TEXT_FORMAT, …TEXT_MATCH]`
(`packages/lexical-playground/src/plugins/MarkdownTransformers/index.ts`).

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| LEX-B1-001 | B1 | `# ` (`HEADING_REGEX = /^(#{1,6})\s/`) | document structure | yes — `<h1>` | markers vanish; large bold line | **"Heading level 1"** — `HeadingAnnounceExtension`, `packages/lexical-rich-text/src/HeadingAnnounceExtension.ts`, default-on via `RichTextExtension`; extension API only | this line became a heading at level 1; the `#` was consumed | transition (**mitigated**) | high |
| LEX-B1-002 | B1 | `## ` … `###### ` | document structure | yes — `<h2>`…`<h6>` | as above | **"Heading level N"** — the only B1 announcer that carries a parameter | the level, exactly | transition (**mitigated**) | high |
| LEX-B1-003 | B1 | `- ` / `* ` / `+ ` (`UNORDERED_LIST_REGEX = /^(\s*)[-*+]\s/`) | document structure | yes — `<ul><li>` | bullet appears, text indents | **nothing.** No announcer exists for `ListNode` or `ListItemNode` | a bulleted list started; you are in item 1 | transition | high |
| LEX-B1-004 | B1 | `1. ` (`ORDERED_LIST_REGEX = /^(\s*)(\d{1,})\.\s/`) | document structure | yes — `<ol start=N><li>` | number appears | nothing | an ordered list started at N; item 1 | transition | high |
| LEX-B1-005 | B1 | leading whitespace + `- ` (the `(\s*)` capture nests the new list) | document structure | yes — nested `<ul>` | the bullet appears already indented | nothing; no `aria-level` is emitted anywhere in Lexical | a list started **at level 2**, not level 1 | transition | medium |
| LEX-B1-006 | B1 | `- [ ] ` / `- [x] ` / `[ ] ` (`CHECK_LIST_REGEX`) | document structure | contested | checkbox glyph appears | nothing. The resulting `<li>` gets `role="checkbox"` + `aria-checked` (`updateListItemChecked`, `packages/lexical-list/src/LexicalListItemNode.ts`), which **overrides** the implicit `listitem` role | a checkable item was created, unchecked, item 1 of a task list | **both** — the item stops being a list item to AT, so position/count is lost | medium |
| LEX-B1-007 | B1 | `> ` (`QUOTE_REGEX = /^>\s/`) | document structure | yes — `<blockquote>`; `replace` calls `node.select(0,0)` | left rule + indent | nothing | you are now inside a quotation | transition | medium |
| LEX-B1-008 | B1 | `` ``` `` at line start (`CODE_START_REGEX`, a fence of three or more backticks with an optional info string) | document structure | partial | monospace block | nothing. `CodeNode.createDOM` emits a bare `<code>` with `spellcheck="false"`; no role, no name, no `<pre>` | you are in a code block; spellcheck and autocorrect semantics changed | **both** (INFERRED: a bare `<code>` is not announced as a code region by most AT) | medium |
| LEX-B1-009 | B1 | `` ```ts `` — the info string sets the language | document structure | attribute only — `data-language`/`data-highlight-language` | syntax colours appear; a language chip shows | nothing; the chip is a plain `<div class="code-highlight-language">` | the code block's language is TypeScript | both | medium |
| LEX-B1-010 | B1 | `---` / `***` / `___` + Enter (playground `HR`, `/^(---\|\*\*\*\|___)\s?$/`) | document structure | yes — `<hr>` (a **block decorator**) | a rule appears; the caret jumps past it (`line.selectNext()`) | nothing. Issue [#8025](https://github.com/facebook/lexical/issues/8025) is the arrow-key counterpart, closed | a horizontal rule was inserted and the caret moved | transition | low |
| LEX-B1-011 | B1 | `\| a \| b \|` + Enter (playground `TABLE`, `TABLE_ROW_REG_EXP`) | document structure | yes — native `<table>` | a grid appears | nothing | a table was created; N columns; you are in row 1, column 1 | transition | low |
| LEX-B1-012 | B1 | `**x**` (`BOLD_STAR`, tag `**`) | inline formatting | yes — `IS_BOLD` bit | asterisks vanish, text bolds | nothing | that run is now bold; the delimiters were consumed | transition | high |
| LEX-B1-013 | B1 | `__x__` (`BOLD_UNDERSCORE`, `intraword: false`) | inline formatting | yes | as above | nothing | as above | transition | medium |
| LEX-B1-014 | B1 | `*x*` (`ITALIC_STAR`) | inline formatting | yes — `IS_ITALIC` | markers vanish, italic | nothing | that run is now italic | transition | high |
| LEX-B1-015 | B1 | `_x_` (`ITALIC_UNDERSCORE`, `intraword: false`) | inline formatting | yes | as above | nothing | as above | transition | medium |
| LEX-B1-016 | B1 | `***x***` (`BOLD_ITALIC_STAR`) | inline formatting | yes — two bits at once | bold + italic | nothing | **two** formats were applied, not one | transition | medium |
| LEX-B1-017 | B1 | `___x___` (`BOLD_ITALIC_UNDERSCORE`) | inline formatting | yes | as above | nothing | as above | transition | low |
| LEX-B1-018 | B1 | `~~x~~` (`STRIKETHROUGH`) | inline formatting | yes — `IS_STRIKETHROUGH` | strike line | nothing | that run is struck through | transition | medium |
| LEX-B1-019 | B1 | `==x==` (`HIGHLIGHT`) | inline formatting | yes — `IS_HIGHLIGHT` | highlight background | nothing | that run is highlighted | transition | low |
| LEX-B1-020 | B1 | `` `x` `` (`INLINE_CODE`, ordered first so nothing transforms inside it) | inline formatting | yes — `IS_CODE` | monospace pill | nothing | that run is inline code and will not be spellchecked | transition | medium |
| LEX-B1-021 | B1 | `[text](url)` then `)` (`LINK`, `trigger: ')'`) | document structure | yes — `LinkNode` → `<a href>` | text becomes a link, markup vanishes | **nothing.** `AutoLinkAnnounceExtension` watches `AutoLinkNode` only; a markdown `LinkNode` is not an `AutoLinkNode` | a link was created; its text and its destination | transition | medium |
| LEX-B1-022 | B1 | `[text](url "title")` — the title variant | document structure | yes — link with `title` | tooltip on hover | nothing | the link has a title as well as a destination | transition | low |
| LEX-B1-023 | B1 | typing a bare URL or `www.…` — **no confirming keystroke** (`registerAutoLink`) | document structure | yes — `AutoLinkNode` | text turns into a link partway through typing | **"Link"** (or `"N links"`) — `AutoLinkAnnounceExtension`, `packages/lexical-link/src/AutoLinkAnnounceExtension.ts`, default-on via `AutoLinkExtension`. A create paired with a destroy in the same update is deliberately suppressed so a growing URL announces once, not per character | what you typed is now a link, **and to what target** | transition (**partly mitigated** — the destination is never spoken) | high |
| LEX-B1-024 | B1 | editing/deleting so an auto-link stops matching | document structure | yes | the underline disappears | **"Link removed"** / `"N links removed"` (same extension) | the link you were in is no longer a link | transition (**mitigated**) | medium |
| LEX-B1-025 | B1 | `![alt](src)` then `)` (playground `IMAGE`) | document structure | yes — `ImageNode` decorator carrying `alt` | an image replaces the markup | nothing at conversion time | an image was inserted; its alt text | transition | low |
| LEX-B1-026 | B1 | `:smile:` then `:` (playground `EMOJI` text-match) | inline content | n/a — becomes a plain `TextNode` | the shortcode becomes a glyph | nothing | your text was replaced: `:smile:` became 😄 | transition | medium |
| LEX-B1-027 | B1 | `:)`, `:D`, `:(`, `<3` — a `TextNode` transform, **no confirming keystroke** (`EmojisExtension`) | inline content | partial — token-mode `EmojiNode` | the glyph appears the instant the second character lands | nothing | your text was changed for you, from `:)` to 🙂 | transition | medium |
| LEX-B1-028 | B1 | `$e=mc^2$` (playground `EQUATION`, trigger `$`) | document structure | yes — `EquationNode` with `role="math"` + `aria-label="Equation: …"` | rendered KaTeX replaces the source | nothing at conversion time; the *result* is the best-labelled node in the product | your expression was rendered as an equation | transition | low |
| LEX-B1-029 | B1 | `$$…$$` block form (`BLOCK_EQUATION` multiline transformer) | document structure | yes — block `EquationNode` | a centred formula block | nothing | a display equation block was created | transition | low |
| LEX-B1-030 | B1 | a tweet URL on its own line (playground `TWEET`) | document structure | yes — `TweetNode` decorator | an embedded tweet renders | nothing | your URL became an embedded tweet | transition | low |
| LEX-B1-031 | B1 | typing inside a code block — `CodeHighlightExtension` retokenises | inline structure | yes — text is re-split into `CodeHighlightNode`s | tokens recolour | nothing; the node churn is invisible. **INFERRED risk:** heavy re-splitting of the text nodes under the caret can perturb AT caret tracking | ideally nothing — but the churn should not disturb reading | transition | high |
| LEX-B1-032 | B1 | `[foo]` — `SpecialTextExtension` transform (`disabled: true` by default) | inline content | partial — `SpecialTextNode` | bracketed text becomes a token | nothing | your bracketed text became a token | transition | low |
| LEX-B1-033 | B1 | **typing past `MaxLengthExtension`'s limit** — `$trimTextContentFromAnchor` deletes back to the limit | document content | n/a — text is removed | typing simply stops having an effect | **nothing.** The editor silently discards the user's keystrokes | your input was rejected; you are at the maximum length | transition | low |
| LEX-B1-034 | B1 | a Figma / YouTube / tweet URL that `AutoEmbedPlugin` recognises | document structure + popup | yes once accepted | an "Embed …?" menu appears under the caret | the popup is a `LexicalMenu` listbox with the defects in §5 | the editor is offering to replace what you typed | both | low |
| LEX-B1-035 | B1 | any of the above committed through an IME (`COMPOSITION_END_TAG` path) | document structure | yes | identical | identical; the existing announcers still fire on the mutation | the same transition, while the user is already juggling composition state | transition | low |
| LEX-B1-036 | B1 | smart quotes, em-dashes, autocorrect | — | — | — | **not implemented.** Lexical ships no typographic-substitution transformer. Recorded so the corpus is comparable against editors that do | — | n/a | n/a |

---

## 4. B2 — User-initiated change

### 4.1 The keyboard map

`packages/lexical-playground/src/plugins/ShortcutsExtension/shortcuts.ts`
(`SHORTCUT_BINDINGS` + `BUILTIN_SHORTCUT_BINDINGS`; `CONTROL_OR_META` is Cmd on Apple,
Ctrl elsewhere):

`Normal ⌘⌥0` · `Heading1/2/3 ⌘⌥1/2/3` · `Numbered list ⌘⇧7` · `Bulleted list ⌘⇧8` ·
`Check list ⌘⇧9` · `Code block ⌘⌥C` · `Quote ⌃⇧Q` · `Add comment ⌘⌥M` ·
`Increase font ⌘⇧>` · `Decrease font ⌘⇧<` · `Insert code block ⌘⇧C` ·
`Strikethrough ⌘⇧X` · `Lowercase ⌃⇧1` · `Uppercase ⌃⇧2` · `Capitalize ⌃⇧3` ·
`Center ⌘⇧E` · `Justify ⌘⇧J` · `Left ⌘⇧L` · `Right ⌘⇧R` · `Subscript ⌘,` ·
`Superscript ⌘.` · `Indent ⌘]` · `Outdent ⌘[` · `Clear formatting ⌘\` ·
`Insert link ⌘K` · `Bold ⌘B` · `Italic ⌘I` · `Underline ⌘U` · `Undo ⌘Z` · `Redo ⌘⇧Z`.
Plus `Alt+F10` (jump to toolbar) and `Escape` (blur, or return from the toolbar).

### 4.2 Where the pending-format state actually lives — the crux case

This is the sharpest B2 case in the corpus, so it is documented mechanically rather than
summarised.

1. `FORMAT_TEXT_COMMAND` carries a `TextFormatType`, one of
   `'bold' | 'underline' | 'strikethrough' | 'italic' | 'highlight' | 'code' |
   'subscript' | 'superscript' | 'lowercase' | 'uppercase' | 'capitalize'`
   (`packages/lexical/src/nodes/LexicalTextNode.ts`).
2. `registerRichText` handles it by calling `selection.formatText(format)` →
   `$formatText` → `$updateTextFormat` (`packages/lexical/src/LexicalSelection.ts`).
3. `$updateTextFormat` branches:
   - **`selection.isCollapsed()`** → `selection.setFormat(applyFormat(selection.format))`
     and `$setCompositionKey(null)`, then **returns**. Nothing else happens. The change is
     a bit in `RangeSelection.format`, a `number` bitfield keyed by `TEXT_TYPE_TO_FORMAT`
     (`IS_BOLD`, `IS_ITALIC`, … in `packages/lexical/src/LexicalConstants.ts`), living on
     the selection object inside the editor state.
   - **range selection** → the bit is written onto each selected `TextNode` (and
     `ElementNode.setTextFormat` for element-level runs), producing real `<strong>` /
     `<em>` / `<code>` in the DOM.
4. The toolbar reads that same bitfield: `$updateToolbar`
   (`packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx`) calls
   `selection.hasFormat('bold')` — literally `(this.format & IS_BOLD) !== 0`
   (`RangeSelection.hasFormat`) — for all eleven format types, and writes the results into
   `toolbarState`. It runs from `SELECTION_CHANGE_COMMAND` and the editor's update
   listener, so it is correct and live.
5. The toolbar renders that state as **a CSS class only**:
   `className={'toolbar-item spaced ' + (toolbarState.isBold ? 'active' : '')}`.
   There is **no `aria-pressed`, no `role="switch"`, no `aria-checked`** on any of the
   ~14 format buttons. (`FindReplaceExtension` and `ReviewExtension` in the same codebase
   *do* use `aria-pressed`, so this is an omission rather than a house style.)

**Result.** With a selection, the user cannot tell whether Ctrl+B *bolded* or *unbolded*
those words — nothing is announced, and re-reading the run is the only recovery. With a
collapsed caret, they cannot tell whether bold turned on or off for the next character —
and there is **no DOM element, no attribute, and no accessibility-tree object anywhere
that represents that state**, so it is not even queryable. The state is computed, is
correct, is displayed visually, and reaches the accessibility layer nowhere at all.

### 4.3 B2 scenarios

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| LEX-B2-001 | B2 | ⌘B with a **range** selection | inline formatting | yes — `IS_BOLD` on the selected `TextNode`s → `<strong>` | selection goes bold; button gains `.active` | nothing at the moment of the command; the state is recoverable only by re-reading the run | bold was **applied** (vs removed) to the selection, and to how much | transition | high |
| LEX-B2-002 | B2 | ⌘B with a **collapsed** caret | **pending style** | **no — nothing exists in the DOM** | button gains `.active`; the text does not change | **nothing, and nothing inspectable.** See §4.2 | **bold is now on for what you type next** — and off again after the next toggle, a caret move, or Enter | transition, with no state anchor at all | high |
| LEX-B2-003 | B2 | ⌘B again (untoggle), either mode | inline formatting / pending style | same mechanism | the button dims | nothing — and "on" and "off" are equally silent, so the two are indistinguishable | the **direction** of the toggle | transition | high |
| LEX-B2-004 | B2 | ⌘I, ⌘U, ⌘⇧X, ⌘`,`, ⌘`.`, highlight, code, ⌃⇧1/2/3 | inline formatting / pending style | as B2-001/002 | as above | as above — the same silence for all eleven `TextFormatType`s | which format toggled, and to which value | transition | high |
| LEX-B2-005 | B2 | `SET_TEXT_FORMAT_COMMAND` (explicit set, not toggle) | inline / pending | same | same | nothing | the resulting value, not a delta | transition | low |
| LEX-B2-006 | B2 | ⌘\ — clear formatting | inline formatting | yes | text goes plain; several buttons dim at once | nothing | all inline formatting was removed | transition | medium |
| LEX-B2-007 | B2 | mixed selection (some bold, some not) then ⌘B | inline formatting | yes | the button's tri-state collapses to on/off | nothing; there is no exposure of "mixed" at all | the selection was mixed and is now uniformly bold | transition | medium |
| LEX-B2-008 | B2 | moving the caret into differently-formatted text (`SELECTION_CHANGE_COMMAND` → `$updateToolbar`) | selection/caret | n/a | the toolbar re-lights to match the caret | the toolbar change is invisible (no `aria-pressed`); the *text* boundary may be spoken from the platform text API (INFERRED) | formatting changed here; what is in effect at the caret | transition | high |
| LEX-B2-009 | B2 | ⌘⌥1/2/3 → heading | document structure | yes | the line becomes a heading | **"Heading level N"** | this block is a heading at level N | transition (**mitigated**) | high |
| LEX-B2-010 | B2 | ⌘⌥0 → Normal | document structure | yes | heading styling drops | **"Heading level N removed"** when leaving a heading; **nothing** when leaving a quote, list or code block | this block is now a plain paragraph | transition (**partly mitigated**) | medium |
| LEX-B2-011 | B2 | ⌃⇧Q → blockquote (`$setBlocksType`) | document structure | yes — `<blockquote>` | quote rule appears | nothing | you are now in a quotation | transition | medium |
| LEX-B2-012 | B2 | ⌘⇧8 → `INSERT_UNORDERED_LIST_COMMAND` | document structure | yes | bullets appear on the selected blocks | nothing | a bulleted list was created; how many items; where the caret is | transition | high |
| LEX-B2-013 | B2 | ⌘⇧7 → `INSERT_ORDERED_LIST_COMMAND` | document structure | yes | numbers appear | nothing | an ordered list was created; item N of M | transition | high |
| LEX-B2-014 | B2 | ⌘⇧9 → `INSERT_CHECK_LIST_COMMAND` | document structure | contested (LEX-B1-006) | checkboxes appear | nothing | a task list was created, items unchecked | both | medium |
| LEX-B2-015 | B2 | toolbar "Normal" from a list → `REMOVE_LIST_COMMAND` | document structure | yes | bullets disappear | nothing | you left the list; you are in a paragraph | transition | medium |
| LEX-B2-016 | B2 | `UPDATE_LIST_START_COMMAND` | document structure | yes — the `start` attribute | the numbering shifts | nothing | the list now starts at N; this item's number changed | transition | low |
| LEX-B2-017 | B2 | Enter at the end of a list item | document structure | yes — a new `<li>` | a new bullet/number | nothing from Lexical; the new line may be spoken from the platform API (INFERRED) | a new item; its number if ordered | transition | high |
| LEX-B2-018 | B2 | Tab in a list item (`TabIndentationExtension`, `maxIndent: 7`) | document structure | yes — a genuine nested `<ul>`/`<ol>` inside the `<li>` | the item indents | nothing. Lexical emits **no `aria-level`** anywhere; nesting is expressed only by nested-list DOM | your nesting level increased to N | transition | high |
| LEX-B2-019 | B2 | ⌘] → `INDENT_CONTENT_COMMAND` on a **paragraph** | document structure | **no** | the block shifts right | nothing, and there is nothing to read afterwards: `setElementIndent` (`packages/lexical/src/LexicalReconciler.ts`) applies only a theme class / `padding-inline-start` | your indent level increased to N | **both** — paragraph indent has no semantics | medium |
| LEX-B2-020 | B2 | ⇧Tab / ⌘[ → `OUTDENT_CONTENT_COMMAND` | document structure | as B2-018 / B2-019 | the block shifts left | nothing | your level decreased to N | transition or both | high |
| LEX-B2-021 | B2 | Tab at `maxIndent` — the indent is refused | *nothing* | n/a | nothing moves | nothing; indistinguishable from a working Tab | the command did **not** apply; you are at the maximum | transition | low |
| LEX-B2-022 | B2 | Backspace at offset 0 of an **indented** block → `$isSelectionCollapsedAtFrontOfIndentedBlock` re-routes to `OUTDENT_CONTENT_COMMAND` | document structure | as above | the block outdents instead of deleting a character | nothing — and the user pressed *delete* and got *outdent* | Backspace outdented rather than deleted | transition | medium |
| LEX-B2-023 | B2 | Space or Enter on a check-list item → `KEY_SPACE_COMMAND` → `toggleChecked()` (`packages/lexical-list/src/checkList.ts`) | document structure | yes — `aria-checked` flips | the box fills/empties | **nothing.** The `<li role="checkbox">` has `tabindex="-1"` and never holds DOM focus, so the `aria-checked` change happens on an unfocused element and raises no state-change event (INFERRED for the AT consequence, verified for the DOM facts) | the item is now checked / unchecked | transition | medium |
| LEX-B2-024 | B2 | ⌘⌥C / ⌘⇧C → code block | document structure | partial (LEX-B1-008) | monospace block | nothing | you are in a code block; language; spellcheck is off | both | medium |
| LEX-B2-025 | B2 | choosing a language in `CodeActionMenuPlugin` | document structure | attribute only | the language chip changes | nothing | the block's language is now X | both | low |
| LEX-B2-026 | B2 | Tab inside a code block (`CodeIndentation.ts` overrides `KEY_TAB_COMMAND`; `CodeNode.canIndent() → false`) | document content | yes — a `TabNode` | a tab is inserted; the block does **not** indent | nothing; and Tab here means something different from Tab everywhere else | Tab inserted a tab character rather than indenting or leaving | transition | medium |
| LEX-B2-027 | B2 | ⌥↑/⌥↓ inside a code block → `$handleShiftLines` | document structure | yes — lines swap | the line visibly moves | nothing | the line moved up/down; its new neighbours | transition | low |
| LEX-B2-028 | B2 | ⌘⇧L/E/R/J → `FORMAT_ELEMENT_COMMAND` | document structure | **style only** | text realigns | nothing | this block is now left/center/right/justified | **both** | medium |
| LEX-B2-029 | B2 | ⌘⇧> / ⌘⇧< → font size | inline style | style only | text grows/shrinks | nothing | the new size, and whether it applied to a selection or is pending | both | low |
| LEX-B2-030 | B2 | font family / colour / background dropdowns | inline style | style only | text restyles | nothing | the new value | both | low |
| LEX-B2-031 | B2 | ⌘K → `TOGGLE_LINK_COMMAND` + the floating editor | document structure + popup | yes — `LinkNode` | a URL input pops up | nothing announces the mode change; see LEX-B3-011 | you are editing a link's destination | both | medium |
| LEX-B2-032 | B2 | Shift+Enter → `INSERT_LINE_BREAK_COMMAND(false)` | document structure | yes — `LineBreakNode` → `<br>` | the caret drops a line without a new block | nothing distinguishes it from Enter | this is a soft break inside the same block | transition | medium |
| LEX-B2-033 | B2 | ⌃O on macOS → `INSERT_LINE_BREAK_COMMAND(true)` — break inserted, caret stays | document structure | yes | a line appears below; the caret does not move | nothing | a line break was inserted **behind** the caret | transition | low |
| LEX-B2-034 | B2 | ⌘Z → `UNDO_COMMAND` | document structure (arbitrary) | yes | the document snaps back | **"Undone"** — `HistoryAnnounceExtension` (`packages/lexical-a11y/src/index.ts`), hooked at `COMMAND_PRIORITY_LOW`, returns `false` so the chain continues | **what** was undone, and where the caret landed. The message is a constant string that names nothing | transition (**weakly mitigated**) | high |
| LEX-B2-035 | B2 | ⌘⇧Z / ⌃Y → `REDO_COMMAND` | document structure | yes | the change returns | **"Redone"** — same constant-string limit | what was redone | transition (**weakly mitigated**) | medium |
| LEX-B2-036 | B2 | undo/redo becoming unavailable (`canUndo`/`canRedo` signals; the `CAN_*_COMMAND`s are deprecated in 0.49.0) | control state | yes — `disabled` on the button | the button greys out | `disabled` is exposed but the change is not announced | there is nothing left to undo | transition | low |
| LEX-B2-037 | B2 | ⌘V → `PASTE_COMMAND` → `SELECTION_INSERT_CLIPBOARD_NODES_COMMAND` | document structure | yes | a block of content lands | nothing. `AutoLinkAnnounce` will say `"N links"` if the paste created several — the only paste feedback in the product, and it is incidental | what landed, and how much | transition | high |
| LEX-B2-038 | B2 | pasting HTML that becomes headings/lists/tables | document structure | yes | rich structure appears | `HeadingAnnounce` fires for the **first** created heading only (the listener announces one creation per mutation batch) | how much structure arrived, of what kinds | transition | medium |
| LEX-B2-039 | B2 | ⌘X → `CUT_COMMAND` | document structure | yes | content disappears | nothing. Issue [#5874](https://github.com/facebook/lexical/issues/5874) covers deletions going unannounced on Safari | how much was removed | transition | medium |
| LEX-B2-040 | B2 | ⌘A → `SELECT_ALL_COMMAND` | selection/caret | n/a | everything highlights | AT-native (INFERRED) | the extent of the selection | transition | medium |
| LEX-B2-041 | B2 | Shift+Arrow — selection extension | selection/caret | n/a | the highlight grows | AT-native (INFERRED); Lexical adds nothing | what is selected, and how much | transition | high |
| LEX-B2-042 | B2 | Arrow onto a block decorator (image, HR, poll, tweet, page break) → a **`NodeSelection`** | selection/caret | **no DOM range at all** | the node gets a `.selected` outline | **nothing, and the browser caret is gone.** A `NodeSelection` has no DOM selection, so the platform text API has no caret to report (INFERRED for the AT consequence) | you are on an object; what the object is; you are not in text any more | **both** | medium |
| LEX-B2-043 | B2 | Arrow off a decorator (`$exitNodeSelectionToward`) | selection/caret | n/a | the caret reappears in text | nothing announces the re-entry into text | you are back in text, at position X | transition | medium |
| LEX-B2-044 | B2 | Backspace/Delete on a `NodeSelection` → `DELETE_CHARACTER_COMMAND` | document structure | yes — the object is removed | the object vanishes | nothing | the object was deleted; what replaced it | transition | medium |
| LEX-B2-045 | B2 | Tab inside a table cell (`KEY_TAB_COMMAND`, `packages/lexical-table/src/LexicalTableSelectionHelpers.ts`) | selection/caret | yes — native table semantics | the caret moves to the next cell | AT-native cell reading (INFERRED); nothing says Tab *moved a cell* rather than indenting | you moved to row R, column C | transition | medium |
| LEX-B2-046 | B2 | `INSERT_TABLE_COMMAND` (toolbar / slash menu / modal) | document structure | yes — native `<table>` | a grid appears | nothing | a table of R rows and C columns was inserted; you are in cell 1,1 | transition | medium |
| LEX-B2-047 | B2 | table cell menu: insert/delete row or column, merge, toggle header | document structure | yes | the grid reshapes around the caret | nothing | the table is now R×C; your cell is now row R', column C' | transition | medium |
| LEX-B2-048 | B2 | Escape in the editor → `editor.blur()` (rich-text `KEY_ESCAPE_COMMAND` at `COMMAND_PRIORITY_EDITOR`, range selections only) | focus | n/a | the caret disappears | focus loss is AT-native | you left the editor; Tab now leaves | transition | medium |
| LEX-B2-049 | B2 | Alt+F10 → jump to the toolbar (`FocusManagerExtension`) | focus | n/a | the focus ring lands on a toolbar button | AT-native focus move; the button's `aria-label` is read | you are in the editor toolbar | — | low |
| LEX-B2-050 | B2 | Escape in the toolbar → return with the prior selection restored | focus + selection | n/a | the caret returns where it was | AT-native focus move; nothing says the selection survived | you are back in the editor at the same place | transition | low |
| LEX-B2-051 | B2 | Arrow keys in the toolbar (`RovingTabIndexExtension`, `orientation: 'horizontal'`, Home/End) | focus | n/a | focus moves inside the group; the group is one Tab stop | AT-native | which control you are on | — | low |
| LEX-B2-052 | B2 | Tab into the editor (`TabFocusExtension` re-clones the selection within `TAB_TO_FOCUS_INTERVAL`) | focus + selection | n/a | the previous caret is restored | AT-native focus; the selection restoration is silent | where the caret is now | transition | low |
| LEX-B2-053 | B2 | `editor.setEditable(false)` (the read-only toggle) | editor mode | yes — `aria-readonly="true"`, `contenteditable` removed, `tabIndex=-1` (`packages/lexical-react/src/shared/LexicalContentEditableElement.tsx`) | the caret disappears, controls disable | **"Editor is read-only"** — `EditorModeAnnounceExtension`; transition-based, so the initial mount is silent | the editor is no longer editable | transition (**mitigated**) | low |
| LEX-B2-054 | B2 | `CLEAR_EDITOR_COMMAND` | document structure | yes | the document empties | nothing | the document was cleared | transition | low |
| LEX-B2-055 | B2 | **"Convert To Markdown" / "Convert From Markdown"** (`ActionsPlugin`) | document structure | yes — the entire document is replaced | the whole document visibly changes form | nothing. Every heading/list/quote in the document is destroyed or created at once; `HeadingAnnounce` fires **once** for the first heading in the batch | the document changed representation wholesale; the caret moved to the start | transition | low |
| LEX-B2-056 | B2 | "Convert To/From HTML" (`ActionsPlugin`) | document structure | yes | as above | as above | as above | transition | low |
| LEX-B2-057 | B2 | typing past `CharacterLimitPlugin`'s limit → `OverflowNode` | inline formatting | yes — overflow wrapper | the excess turns red; a counter goes negative | nothing; the counter is a plain `<span>` | you are N characters over the limit | both | low |
| LEX-B2-058 | B2 | find (`FindReplaceExtension`) — typing a query | selection/caret | yes — `MarkNode`s or CSS Custom Highlight ranges | matches highlight; the current one is distinguished | **nothing announces the match count or the current index.** The dialog is correct (`role="dialog"`, labelled inputs, `aria-pressed` on Match case / Regex) but reports no results to AT | N matches; this is match M of N | transition | medium |
| LEX-B2-059 | B2 | find — next / previous match | selection/caret | yes | the highlight and scroll move | nothing | match M of N; the surrounding text | transition | medium |
| LEX-B2-060 | B2 | replace / replace all | document structure | yes | text swaps | nothing | what was replaced, and how many times | transition | medium |
| LEX-B2-061 | B2 | ⌘⌥M → add a comment (`CommentPlugin`) | document structure + popup | yes — a `MarkNode` (`<mark>`) | the passage highlights and an input opens | the `<mark>` is exposed by modern AT; nothing announces that the thread was attached | a comment thread was attached to this passage | both | low |
| LEX-B2-062 | B2 | deleting text that carried a comment mark | document structure | yes | the highlight disappears | nothing | the comment thread lost its anchor | transition | low |
| LEX-B2-063 | B2 | `escapeFormatTriggers` — arrow/click/Enter at a `code`-format boundary drops the pending `code` format (playground config in `App.tsx`) | pending style | no | the pending indicator changes | nothing — LEX-B2-002's failure again, arriving with no keystroke of its own | inline code is no longer in effect for what you type next | transition | low |
| LEX-B2-064 | B2 | drag a block with `DraggableBlockPlugin` | document structure | yes | the block relocates | nothing; and the affordance is mouse-only | the block moved; its new position | both | low |
| LEX-B2-065 | B2 | dropping / pasting image files (`DragDropPasteExtension` → `DRAG_DROP_PASTE`) | document structure | yes — `ImageNode`s | images appear | nothing | N images were inserted | transition | low |
| LEX-B2-066 | B2 | toggling dictation (`SpeechToTextPlugin`) | editor mode | no | the mic button changes appearance | the `aria-label` flips text, but there is **no `aria-pressed`** and no announcement | dictation is on / off | both | low |
| LEX-B2-067 | B2 | `TableOfContentsPlugin` entry activated | selection/caret | entries are `role="button"` | the view scrolls to the heading | the button is named; nothing says the caret/scroll moved | you jumped to heading X | transition | low |
| LEX-B2-068 | B2 | `VisibleNonPrintingExtension` toggled (`disabled: true` by default) | rendering | no | pilcrows and space dots appear | nothing; purely visual | that a display mode changed | both | low |

---

## 5. B3 — Menus and popups

### 5.1 The shared typeahead shape, read from source

All four typeahead surfaces (slash commands, mentions, emoji, auto-embed) and the context
menu use `LexicalMenu` / `useMenuAnchorRef`
(`packages/lexical-react/src/shared/LexicalMenu.tsx`) via `LexicalTypeaheadMenuPlugin`
(`packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx`). The exact wiring:

**DOM shape**

```
<div id="typeahead-menu" role="listbox" aria-label="Typeahead menu">   ← portal container,
  <div class="typeahead-popover mentions-menu">                          appended to the
    <ul>                                                                 resolved menu
      <li role="option" aria-selected id="typeahead-item-0" tabindex="-1">…</li>
      …                                                                  parent, OUTSIDE
    </ul>                                                                the editable
  </div>
</div>
```

**What owns focus.** Nothing in the menu ever takes DOM focus. Focus stays on the editor
root (`<div role="textbox" contenteditable>`) for the entire lifetime of the menu; every
option has `tabindex="-1"` and is never focused. This is the correct
`aria-activedescendant` pattern in principle.

**The combobox relationship.** `useMenuAnchorRef.positionMenu` sets, on the editor root:

- `aria-controls="typeahead-menu"` — set when the menu opens, removed on unmount.

`LexicalMenu.updateSelectedIndex` sets, on the editor root:

- `aria-activedescendant="typeahead-item-<index>"` — removed on unmount.

**What is missing, verified by absence:**

- **no `role="combobox"`.** The root keeps `role="textbox"` (the default in
  `LexicalContentEditableElement.tsx`, and the playground's `ContentEditable` never
  overrides it).
- **no `aria-expanded`.** `LexicalContentEditableElement` *does* implement it —
  `aria-expanded={isEditable && role === 'combobox' ? !!ariaExpanded : undefined}` — but
  because the role is never `combobox`, that support is dead code in every playground
  configuration.
- **no `aria-owns`.** The listbox is portaled outside the focused element's subtree, and
  `aria-controls` confers no ownership. `aria-activedescendant` therefore points at an
  element that is neither a DOM descendant of the focused element nor owned by it, which
  is invalid per ARIA. (INFERRED: this is the standard reason NVDA and JAWS do not speak
  the active option.)
- **options are not owned children of the listbox.** A `<div>` and a `<ul>` sit between
  `role="listbox"` and the `role="option"` items, so the implicit `list`/`listitem` roles
  of the `<ul>`/`<li>` interpose. (The `<li>`s carry `role="option"`, so they are not
  `listitem`s, but the `<ul>` is still an unexpected `list` inside the listbox.)
- **no live region of any kind.** Nothing announces the open, the result count, the
  filtered set, or the dismissal.

**How information is filled in as the user filters — the important detail.** Option ids
are **positional** (`'typeahead-item-' + index`), not per-option. And on each filter
keystroke `LexicalMenu` runs

```js
useEffect(() => { if (preselectFirstItem) setHighlightedIndex(0); }, [matchingString, …]);
```

— `setHighlightedIndex`, **not** `updateSelectedIndex`. So the React highlight resets to
index 0 without touching the DOM attribute; and because the attribute already reads
`typeahead-item-0` and the ids are positional, **the attribute value does not change at
all** while the user types. The option it names is a completely different option after
each keystroke, but no DOM mutation occurs. An AT that speaks on `aria-activedescendant`
change therefore has nothing to speak — even if the ownership problem above were fixed.

The same divergence appears on hover: `onMouseEnter={() => setHighlightedIndex(i)}` moves
the visual highlight without calling `updateSelectedIndex`, so the attribute goes stale.
Only Arrow Up / Arrow Down call `updateSelectedIndex` and actually mutate the attribute.

**Key handling** (all registered on the editor, at `COMMAND_PRIORITY_LOW` by default):
`KEY_ARROW_DOWN_COMMAND` / `KEY_ARROW_UP_COMMAND` wrap around the list;
`KEY_ENTER_COMMAND` and `KEY_TAB_COMMAND` accept the highlighted option (Shift+Enter is
let through to rich-text line-break handling); `KEY_ESCAPE_COMMAND` closes.

**The one popup class that works.** `packages/lexical-playground/src/ui/Modal.tsx` —
`role="dialog"`, `aria-modal`, `aria-labelledby`, plus `FocusTrapExtension` with focus
restoration on close. That is the reference shape; every other popup in the product falls
short of it in a different way.

### 5.2 B3 scenarios

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| LEX-B3-001 | B3 | `/` — `ComponentPickerPlugin`, `useBasicTypeaheadTriggerMatch('/', {allowWhitespace: true, minLength: 0})`; ~25 options (Paragraph, Heading 1–3, Table, Numbered/Bulleted/Check List, Quote, Code, Divider, Page Break, Excalidraw, Poll, Date/Today/Tomorrow, Image, Columns Layout, Align ×4, Card, Review, …) | popup state | §5.1 shape | a command list opens under the caret with option 1 preselected | nothing announces the open; the preselected option is very likely unspoken (INFERRED) | a menu opened with N options; option 1 of N is "Paragraph" | both | high |
| LEX-B3-002 | B3 | typing to filter the slash menu (regex over `title` + `keywords`) | popup state | §5.1 | the list shrinks; the highlight snaps to the top | **nothing changes in the DOM that an AT can observe** — see the positional-id analysis in §5.1 | N results now; the first is X | both | high |
| LEX-B3-003 | B3 | filtering to **zero** results | popup state | the menu unmounts (`options.length` falsy → `defaultMenuRenderFn` returns `null`) | the popup disappears | nothing; `aria-activedescendant` is left pointing at a removed id until unmount cleanup runs | there are no matches | both | medium |
| LEX-B3-004 | B3 | `:` + ≥1 char — `EmojiPickerPlugin`, `minLength: 1`, `MAX_EMOJI_SUGGESTION_COUNT = 10`; option title is `` `${emoji} ${aliases[0]}` `` | popup state | §5.1 | an emoji list appears | as above | a menu opened; N emoji; the highlighted one is "😄 smile" | both | medium |
| LEX-B3-005 | B3 | accepting an emoji — `selection.insertNodes([$createTextNode(selectedOption.emoji)])` | document content | n/a — a bare emoji character | the glyph appears | the AT reads the glyph using **its own Unicode/CLDR name**, which need not match the alias searched (`:grin:` → 😁 "beaming face with smiling eyes") | ideally the name you searched by, or at least a stable name | transition | **low priority — recorded, deferred** |
| LEX-B3-006 | B3 | `@` + a name — `MentionsPlugin`, 5 suggestions, 75-char query limit, punctuation-terminated | popup state | §5.1 | a people list appears | as above | a mention menu opened; N matches; the highlighted person | both | high |
| LEX-B3-007 | B3 | accepting a mention → a token-mode `MentionNode` | document structure | **weak** — `<span class="mention" data-lexical-mention>`, no role, no `aria-label`; `canInsertTextBefore/After → false` | a pill appears | the raw name is read as ordinary text; the token boundary is invisible | a mention of person X was inserted, and it is a single indivisible token | both | medium |
| LEX-B3-008 | B3 | an embeddable URL — `AutoEmbedPlugin` | popup state | §5.1 | an "Embed …?" menu appears | as above | the editor is offering to convert what you typed | both | low |
| LEX-B3-009 | B3 | Arrow Down / Up in any typeahead → `updateSelectedIndex` rewrites `aria-activedescendant` | popup state | §5.1 | the highlight moves and scrolls into view | the attribute genuinely changes here — this is the **only** interaction that mutates it — but the ownership is still invalid (§5.1), so it is likely still unspoken (INFERRED) | option M of N; its label | transition | high |
| LEX-B3-010 | B3 | Enter / Tab accepts; Escape dismisses | document structure + popup | yes — the node is inserted | the menu closes and content appears | nothing announces the closure **or** what was inserted | the menu closed; X was inserted | both | high |
| LEX-B3-011 | B3 | selecting text → `FloatingTextFormatToolbarPlugin` | popup state | **no** — a positioned div of buttons, no `role="toolbar"`, no live region | a format bar floats above the selection | **nothing at all**; it is not announced and not on the user's current tab path | a formatting toolbar is available; how to reach it | both | high |
| LEX-B3-012 | B3 | ⌘K or clicking a link → `FloatingLinkEditorPlugin` | popup state | partial | a URL input floats near the link | the input is focusable and labelled; nothing announces that it appeared or that a mode changed | you are editing this link's destination | transition | medium |
| LEX-B3-013 | B3 | inline autocomplete ghost text (`AutocompleteExtension`, `disabled: true` by default) | popup state, **inline** | **no** | a grey suffix `… (TAB)` after the caret | **nothing, and nothing readable.** The ghost is a `contenteditable="false"` span injected via `setDOMUnmanaged` — outside Lexical's node tree, so it is not in the document text, and outside any live region | a suggestion is available; its text; press Tab to accept | both | medium |
| LEX-B3-014 | B3 | Tab / ArrowRight accepts a ghost suggestion (`KEY_TAB_COMMAND` / `KEY_ARROW_RIGHT_COMMAND`) | document structure | yes | the grey text becomes real | nothing | the suggestion was accepted; what was inserted | transition | medium |
| LEX-B3-015 | B3 | hovering a block → `DraggableBlockPlugin` gutter handle and menu | popup state | no | a handle appears in the gutter | mouse-only; unreachable and unannounced | that the control exists at all | both | low |
| LEX-B3-016 | B3 | hovering a code block → `CodeActionMenuPlugin` (copy, prettier, language) | popup state | no | a bar appears over the block | mouse-only | the actions available on this code block | both | low |
| LEX-B3-017 | B3 | the chevron in a table cell → `TableActionMenuPlugin` | popup state | **no ARIA at all** in that directory | a dropdown of row/column/merge/header actions | reachable by click; nothing announces the open state or the item count | a menu of table actions opened; N options | both | low |
| LEX-B3-018 | B3 | hovering a table edge → `TableHoverActionsV2Plugin` | popup state | no | "+" buttons to add a row/column | mouse-only | that these affordances exist | both | low |
| LEX-B3-019 | B3 | right-click → `ContextMenuPlugin` (opt-in setting) | popup state | §5.1 — the same `LexicalMenu` | a context menu appears | the same defects as LEX-B3-001 | a context menu opened; N options | both | low |
| LEX-B3-020 | B3 | toolbar dropdowns — block type, font family, font size, alignment, insert (`packages/lexical-playground/src/ui/DropDown.tsx`) | popup state | partial — the trigger has `aria-label`; **no `aria-haspopup`, no `aria-expanded`**; the panel is a plain div of buttons with no `role="menu"` | a panel opens under the button | the trigger's label is read; the open/closed state and the item count are not | this control opens a menu; it is now open; N items; which is current | both | medium |
| LEX-B3-021 | B3 | the block-type dropdown's current value — the containment state, rendered as `buttonLabel={blockTypeToBlockName[blockType]}` | popup state | no | the trigger reads "Bulleted List", "Quote", "Code Block", "Heading 2", "Normal" | the trigger's accessible name is `buttonAriaLabel \|\| buttonLabel`, so this **is** exposed on demand — but only if the user goes and finds the toolbar; nothing announces it when it changes | what container the caret is in, at the moment it changes | transition | high |
| LEX-B3-022 | B3 | insert dialogs — image, table, poll, equation, embed, columns (`ui/Modal.tsx`) | popup state | yes — `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, focus restore | a modal covers the page | the dialog name and the trapped focus are conveyed properly. **The one popup class Lexical gets right.** | a dialog opened; its name; focus is trapped | — | medium |
| LEX-B3-023 | B3 | the shortcuts help dialog (`ShortcutsHelpDialog.tsx`) | popup state | yes — same modal machinery, plus `aria-checked` on the platform toggles | a table of shortcuts | as above | — | — | low |
| LEX-B3-024 | B3 | the find/replace dialog (`FindReplaceExtension`) | popup state | yes — `role="dialog"`, `aria-label="Find and Replace"`, labelled inputs, `aria-pressed` on Match case / Regex | a search panel opens | correctly labelled — but see LEX-B2-058: it reports **no result count** to anyone | the dialog opened; and N matches were found | transition | medium |
| LEX-B3-025 | B3 | comment thread panel and input (`CommentPlugin`) | popup state | partial — no ARIA in that directory | a sidebar and an input appear | the input takes focus; nothing announces the panel or the thread count | a comment panel opened; N threads | both | low |
| LEX-B3-026 | B3 | the image caption sub-editor (a nested `LexicalComposer` inside `ImageComponent`) | popup state / focus | partial | a caption field appears under the image | entering a nested editor is silent; `$updateToolbar` tracks `isImageCaption` but nothing announces it | you are now editing this image's caption, a separate text field | both | low |
| LEX-B3-027 | B3 | the Excalidraw / poll / ruby editing overlays | popup state | partial (`RubyExtension` uses `role="group"` + `aria-label`; Excalidraw and Poll have none) | an editing surface appears in place | mixed; mostly silent | you entered an embedded editor; how to leave | both | low |

---

## 6. CB — Container boundary state transitions

**The premise.** Every block container is a state the caret is either inside or outside
of, and the user must know which. The failure is not one missing announcement: a container
has many independent entry and exit vectors, and an editor can handle one while silently
failing the rest.

**The worked example, in Lexical.** Type `> ` + space — you are in a blockquote (silent).
Type, press Enter — and in Lexical you are **already out of the quote**, because
`QuoteNode.insertNewAfter()` returns a `ParagraphNode` inserted *after* the quote, and
`RangeSelection.insertParagraph()` always routes through `insertNewAfter`
(`packages/lexical/src/LexicalSelection.ts`). There is no "press Enter twice to escape" for
quotes; the *first* Enter escapes, and any text that was after the caret is lifted out of
the quote with it. Nothing announces the exit. Arrow back up — you are inside again,
untold. Arrow past the top — outside again, untold. Backspace from the paragraph below —
you are now editing inside the quote, untold.

**The information exists and is already computed.** `$updateToolbar`
(`packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx`) resolves, on every
`SELECTION_CHANGE_COMMAND`:

- `blockType` — via `$findTopLevelElement`, `$isListNode` + `$getNearestNodeOfType(anchorNode, ListNode)`,
  `$handleHeadingNode`, `$handleCodeNode` — mapped through `blockTypeToBlockName`
  (`packages/lexical-playground/src/context/ToolbarContext.tsx`):
  `bullet → "Bulleted List"`, `check → "Check List"`, `code → "Code Block"`,
  `h1–h6 → "Heading 1"…"Heading 6"`, `number → "Numbered List"`,
  `paragraph → "Normal"`, `quote → "Quote"`;
- `rootType` — `'table'` or `'root'`, via `$findMatchingParent(node, $isTableNode)`;
- `isImageCaption` — whether the caret is inside a nested caption editor;
- `codeLanguage`, `codeTheme`, `isRTL`, `isLink`, `elementFormat`.

**That toolbar state *is* the containment information.** It is computed correctly, it is
live, and it is rendered as the dropdown's visible label — and it reaches the
accessibility layer only as the trigger button's accessible name, which the user must go
and read on demand. No transition is ever announced.

Note also what `blockTypeToBlockName` **cannot** express: table cell, collapsible,
layout column, pull-quote, card, nesting depth, or "quote inside quote". For those
containers the toolbar shows "Normal", i.e. the same label it shows for a bare paragraph
at the root.

### 6.1 QuoteNode — `packages/lexical-rich-text/src/index.ts`

DOM: `<blockquote>`. Structure is correct; every transition is silent.

| id | bucket | trigger (vector) | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| LEX-CB-001 | B1 | **entry:** `> ` + space (`QUOTE` transformer; `replace` calls `node.select(0,0)`) | container entry | yes | the rule and indent appear | nothing | you are now inside a quotation | transition | medium |
| LEX-CB-002 | B2 | **entry:** ⌃⇧Q / toolbar → `$setBlocksType` | container entry | yes | as above | nothing | as above | transition | medium |
| LEX-CB-003 | B2 | **entry:** ↓ from the paragraph above | container entry | n/a | the caret lands inside the rule | AT-native block-boundary reading may say "quote" (INFERRED, browser-dependent); Lexical adds nothing | you entered a quotation | transition | high |
| LEX-CB-004 | B2 | **entry:** ↑ from the paragraph below | container entry | n/a | as above | as above | as above | transition | high |
| LEX-CB-005 | B2 | **entry:** Backspace at the start of the paragraph **below** the quote — the paragraph merges into the quote's last line | container entry + merge | yes | the paragraph's text visibly joins the quoted block | **nothing.** The user pressed delete and silently became a quote author | your text was moved **into** the quotation | transition | medium |
| LEX-CB-006 | B2 | **entry:** Delete at the end of the paragraph **above** the quote | container entry + merge | yes | the quote's first line joins the paragraph — content leaves the quote | nothing | text was pulled **out of** the quotation into your paragraph | transition | medium |
| LEX-CB-007 | B2 | **entry:** paste landing inside a quote | container entry | yes | pasted content appears indented | nothing | what you pasted is inside a quotation | transition | low |
| LEX-CB-008 | B2 | **entry:** undo/redo restoring a quote around the caret | container entry | yes | the rule reappears around the caret | only `"Undone"` / `"Redone"` | you are inside a quotation again | transition | medium |
| LEX-CB-009 | B2 | **exit:** **Enter anywhere in the quote** — `QuoteNode.insertNewAfter()` returns a `ParagraphNode` **after** the quote, unconditionally | container exit | yes | the caret drops below the rule; trailing text comes with it | **nothing.** There is **no escape-hatch semantics for quotes at all** — no "empty line then Enter": every Enter exits, which is a different contract from lists and from code | **you have left the quotation** — and any text that was to the right of the caret left with you | transition | high |
| LEX-CB-010 | B2 | **exit:** Shift+Enter inside a quote → `INSERT_LINE_BREAK_COMMAND` | **stays inside** | yes — a `<br>` in the `<blockquote>` | a new line inside the rule | nothing | you are **still** in the quotation — the opposite outcome from Enter, with no cue for either | transition | medium |
| LEX-CB-011 | B2 | **exit:** ↑ past the first line | container exit | n/a | the caret leaves the rule | AT-native (INFERRED); Lexical adds nothing | you left the quotation | transition | high |
| LEX-CB-012 | B2 | **exit:** ↓ past the last line | container exit | n/a | as above | as above | as above | transition | high |
| LEX-CB-013 | B2 | **exit:** Backspace at offset 0 of the quote's **first** line, when the quote has no previous sibling → `$collapseAtStart` walks up (while `!getPreviousSibling()`) and calls `QuoteNode.collapseAtStart()`, which **replaces the whole quote with a paragraph containing all its children** | container **destroyed** | yes | the rule vanishes from the entire block | **nothing.** One keystroke dissolves an arbitrarily long quotation | the quotation was removed entirely — not one character deleted | transition | medium |
| LEX-CB-014 | B2 | **exit:** the same Backspace when the quote **does** have a previous sibling — `$collapseAtStart` bails and `removeText()` merges into the previous block | container exit + merge | yes | the first quoted line joins the block above | nothing | your text left the quotation | transition | medium |
| LEX-CB-015 | B2 | **exit:** ⌘⌥0 / toolbar "Normal" | container exit | yes | the rule vanishes | nothing (`HeadingAnnounce` only covers headings) | this block is no longer a quotation | transition | medium |
| LEX-CB-016 | B2 | **nesting:** a shadow-root quote (`$createQuoteNode({shadowRoot: true})`) holds block children; `collapseAtStart` lifts them out as siblings rather than merging | container dissolved | yes | several blocks un-indent at once | nothing | N blocks left the quotation | transition | low |
| LEX-CB-017 | B2 | **nesting:** quote inside quote (nested `<blockquote>`) | depth change | yes — real nesting, browsers compute the level | a second indent step | **nothing announces the depth**, and Lexical emits no `aria-level`. The toolbar shows a single "Quote" regardless of depth | you are at quotation level 2 | transition | low |

### 6.2 CodeNode — `packages/lexical-code-core/src/CodeNode.ts`, `CodeExtension.ts`, `CodeIndentation.ts`

DOM: a bare `<code>` with `spellcheck="false"` and `data-language`. **No `<pre>`, no role,
no accessible name** — so unlike the quote, the container itself is not expressed at any
layer. Code is the one container in Lexical with a real, deliberate escape hatch.

| id | bucket | trigger (vector) | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| LEX-CB-018 | B1 | **entry:** `` ``` `` (+ optional language) | container entry | partial | monospace block | nothing | you are in a code block; language; spellcheck is off | both | medium |
| LEX-CB-019 | B2 | **entry:** ⌘⌥C / ⌘⇧C / `/code` | container entry | partial | as above | nothing | as above | both | medium |
| LEX-CB-020 | B2 | **entry:** arrowing in from above or below | container entry | partial | the caret enters monospace text | **nothing at any layer** — there is no role on the `<code>` for an AT to report, so even a perfectly behaved screen reader has nothing to say | you entered code; autocorrect/spellcheck semantics changed | **both** | high |
| LEX-CB-021 | B2 | **entry:** Backspace at the start of the paragraph below merges it into the code block | container entry | partial | the text becomes monospace | nothing | your prose is now code | both | low |
| LEX-CB-022 | B2 | **exit:** Enter — normally **stays inside**. `CodeNode.insertNewAfter` reproduces the current line's leading tabs/spaces and returns a node inside the block | *no* transition | yes | a new indented code line | nothing (correctly — this is the non-event) | ideally nothing; but the *indent that was auto-inserted* is a B1 substitution nobody is told about | transition | high |
| LEX-CB-023 | B2 | **exit:** **two trailing blank lines, then Enter** — `$exitCodeNodeOnEnter` (registered on `KEY_ENTER_COMMAND` at `COMMAND_PRIORITY_LOW`, which runs *before* rich-text's `COMMAND_PRIORITY_EDITOR = 0` handler) requires the last two children to be `LineBreakNode`s and the caret at the end; it removes them and inserts a paragraph after the block | container exit | yes | the caret drops out of the monospace block; two blank lines disappear | **nothing.** This is the one genuine escape hatch in the product and it is both undiscoverable and unannounced — **and its contract differs from lists (one empty item) and from quotes (any Enter)** | you have left the code block; the two blank lines were consumed | transition | medium |
| LEX-CB-024 | B2 | **exit:** ↑ / ↓ past the block's edge (`CodeIndentation.ts` overrides both) | container exit | partial | the caret leaves | nothing, and nothing to read | you left the code block | both | high |
| LEX-CB-025 | B2 | **exit:** Backspace at offset 0 → `CodeNode.collapseAtStart()` **converts the entire code block into a paragraph**, moving every child into it | container **destroyed** | yes | the whole block loses its monospace styling | **nothing.** One keystroke converts an arbitrarily long code block to prose | the code block was dissolved, not one character deleted | transition | medium |
| LEX-CB-026 | B2 | **exit:** ⌘⌥0 / toolbar "Normal" | container exit | yes | as above | nothing | this is no longer code | transition | medium |
| LEX-CB-027 | B2 | **inside:** Tab — `CodeNode.canIndent() → false`, so `CodeIndentation` inserts a `TabNode` instead of indenting the block | *no* container change | yes | a tab appears | nothing; Tab means something different here than anywhere else in the editor | Tab inserted a character rather than indenting or leaving | transition | medium |
| LEX-CB-028 | B2 | **inside:** ⌘←/→ (`MOVE_TO_START` / `MOVE_TO_END` overridden by `$handleMoveTo`) | selection/caret | n/a | the caret goes to the code line's start/end rather than the document's | AT-native caret move; the changed meaning is unannounced | the keystroke's meaning changed because you are in code | transition | low |
| LEX-CB-029 | B2 | **nesting:** code inside a list item | depth change | the `<code>` sits inside the `<li>` | monospace inside a bullet | nothing; the toolbar shows "Code Block" and loses the list context entirely | you are in code **inside** a list item at level N | both | low |

### 6.3 ListNode / ListItemNode — `packages/lexical-list/`

The best-handled container in Lexical: real nested `<ul>`/`<ol>`/`<li>`, a genuine
escape hatch, and a genuine outdent-on-Backspace. Every transition is still silent.

| id | bucket | trigger (vector) | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| LEX-CB-030 | B1 | **entry:** `- ` / `1. ` / `- [ ] ` + space | container entry | yes | a marker appears | nothing | a list started; you are in item 1 of 1 | transition | high |
| LEX-CB-031 | B2 | **entry:** ⌘⇧7/8/9, toolbar, `/bulleted list` | container entry | yes | markers appear on the selected blocks | nothing | a list was created with N items; you are in item M | transition | high |
| LEX-CB-032 | B2 | **entry:** ↑ / ↓ into a list from an adjacent paragraph | container entry | yes | the caret lands on an item | AT-native list reading should say "list, N items, item M" (INFERRED); this is the one entry vector the platform may cover | you entered a list; its size; your position | transition | high |
| LEX-CB-033 | B2 | **entry:** Backspace at the start of the paragraph below a list — it merges into the last item | container entry | yes | the text joins the last bullet | nothing | your paragraph became part of the last list item | transition | medium |
| LEX-CB-034 | B2 | **entry:** paste of list HTML | container entry | yes | bullets appear | nothing | N list items were pasted | transition | medium |
| LEX-CB-035 | B2 | **entry (sibling):** Enter at the end of an item — a new `<li>`, still inside | *no* container change | yes | a new marker | nothing | a new item; its ordinal | transition | high |
| LEX-CB-036 | B2 | **exit:** Enter on an **empty** (or whitespace-only) item → `$handleListInsertParagraph` (registered on `INSERT_PARAGRAPH_COMMAND` at `COMMAND_PRIORITY_LOW`, `packages/lexical-list/src/registerList.ts`). When the list's grandparent is the root it inserts a `ParagraphNode` **after the whole list**; the empty item and its following siblings are re-homed | container exit | yes | the bullet disappears; the caret un-indents | **nothing.** The escape hatch works, and is the classic thing a blind user does not know happened | **you left the list**; you are now in a paragraph | transition | high |
| LEX-CB-037 | B2 | **exit (partial):** Enter on an empty **nested** item — the same function copies the *grandparent* `ListItemNode` and inserts it after, i.e. it drops exactly one nesting level rather than leaving the list | depth change | yes | the caret un-indents one step and keeps a bullet | nothing; and the outcome here is **different** from LEX-CB-036 for the identical keystroke | you dropped to level N−1 and are **still** in the list | transition | medium |
| LEX-CB-038 | B2 | **exit:** Backspace at offset 0 of an item → `registerList`'s `KEY_BACKSPACE_COMMAND` at `COMMAND_PRIORITY_BEFORE_EDITOR (-8)` walks up to the `ListItemNode` and calls `collapseAtStart`. If the list's parent is a `ListItemNode` → `$handleOutdent` (one level out). Otherwise the item becomes a paragraph after the list, and the **list is split in two** if there were following siblings | container exit or depth change | yes | the bullet vanishes; the list may visibly split | **nothing** — and one keystroke has two very different outcomes depending on depth, plus a possible list split the user is not told about | you left the list / dropped a level; the list was split into two lists | transition | high |
| LEX-CB-039 | B2 | **exit:** `collapseAtStart` returns `false` for a nested-list wrapper item (`$isNestedListNode`), so Backspace falls through to ordinary deletion | container exit (merge) | yes | text merges upward | nothing | your text merged into the item above | transition | low |
| LEX-CB-040 | B2 | **exit:** ↑ / ↓ past the list's edges | container exit | yes | the caret leaves the markers | AT-native (INFERRED) | you left the list | transition | high |
| LEX-CB-041 | B2 | **exit:** `REMOVE_LIST_COMMAND` / toolbar "Normal" | container exit | yes | markers disappear from all selected items | nothing | N items stopped being a list | transition | medium |
| LEX-CB-042 | B2 | **depth:** Tab (`TabIndentationExtension`, `maxIndent: 7`) → a real nested `<ul>`/`<ol>` inside the `<li>` | depth change | yes | one indent step | nothing; **no `aria-level` is emitted anywhere in Lexical** — the depth is recoverable only from the nested DOM, if the AT computes it | your level increased to N | transition | high |
| LEX-CB-043 | B2 | **depth:** Shift+Tab → `$handleOutdent` | depth change | yes | one step out | nothing | your level decreased to N | transition | high |
| LEX-CB-044 | B2 | **depth:** Tab refused at level 7 | *nothing* | n/a | nothing moves | nothing; indistinguishable from success | the command did not apply | transition | low |
| LEX-CB-045 | B2 | **nesting:** a list inside a blockquote, or a list inside a table cell | depth change | yes — real nesting | indent inside the rule/cell | nothing; the toolbar shows only the innermost `blockType` ("Bulleted List"), losing the quote/table context | you are in a list **inside** a quotation, at level N | transition | low |
| LEX-CB-046 | B2 | check-list item toggled with Space (`KEY_SPACE_COMMAND` → `toggleChecked()`) | item state | `aria-checked` flips on an `<li role="checkbox" tabindex="-1">` | the box fills | **nothing** — the element never holds DOM focus, so no state-change event is raised (INFERRED for the AT consequence) | the item is now checked | transition | medium |

### 6.4 TableCellNode — `packages/lexical-table/`

DOM: native `<table>/<tr>/<th>/<td>`, so the *state* is the best-expressed in the
product; the *transitions* are the usual silence. A cell is also a container within a
container (table → row → cell), and Lexical's `TableSelection` is a third selection class
alongside `RangeSelection` and `NodeSelection`.

| id | bucket | trigger (vector) | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| LEX-CB-047 | B1 | **entry:** `\| a \| b \|` + Enter | container entry | yes | a grid appears | nothing | a table was created; you are in row 1, column 1 | transition | low |
| LEX-CB-048 | B2 | **entry:** `INSERT_TABLE_COMMAND` (modal or `/table`) | container entry | yes | a grid appears | nothing | an R×C table; you are in cell 1,1 | transition | medium |
| LEX-CB-049 | B2 | **entry:** ↓ / ↑ / → into a table from an adjacent block (`ARROW_KEY_COMMANDS_WITH_DIRECTION` in `LexicalTableSelectionHelpers.ts`) | container entry | yes | the caret lands in a cell | AT-native grid reading should give the cell coordinates and headers (INFERRED) — the one container where the platform genuinely carries the state | you entered a table; row R, column C; the column header | transition | medium |
| LEX-CB-050 | B2 | **entry/exit:** Tab / Shift+Tab between cells, wrapping at row ends | container hop | yes | the caret moves cell to cell | AT-native cell reading (INFERRED); nothing says Tab moved a cell rather than indenting | row R, column C | transition | medium |
| LEX-CB-051 | B2 | **exit:** ↑ from the first row / ↓ from the last row — the table handlers insert or move to a paragraph outside the table | container exit | yes | the caret leaves the grid | AT-native (INFERRED) | you left the table | transition | medium |
| LEX-CB-052 | B2 | **exit:** Backspace / Delete at a cell edge (`DELETE_KEY_COMMANDS` / `DELETE_TEXT_COMMANDS` are intercepted so deletion is clamped inside the cell) | *no* container change | yes | nothing happens at the boundary | nothing; a refused deletion is indistinguishable from a performed one | the deletion was clamped at the cell boundary | transition | medium |
| LEX-CB-053 | B2 | **selection:** Shift+Arrow across a cell boundary produces a **`TableSelection`**, a different selection class (`$isTableSelection` in `$updateToolbar`) | selection | **no DOM range** for the cell block (INFERRED, by analogy with `NodeSelection`); cells get a highlight class | a rectangular block of cells highlights | nothing; and the selection is no longer a text range the platform can describe | you have selected a rectangular block of R×C cells | **both** | medium |
| LEX-CB-054 | B2 | **structure:** insert/delete row or column, merge/unmerge, toggle header row/column | container reshaped around the caret | yes — the DOM table changes | the grid reshapes | nothing | the table is now R×C; your cell is now row R', column C' | transition | medium |
| LEX-CB-055 | B2 | **containment state:** `$updateToolbar` sets `rootType: 'table' \| 'root'` on every selection change | — | — | some toolbar controls change availability | the computed "am I in a table" flag is used to gate UI and is **never announced or exposed** | you are inside / outside a table | transition | high |

### 6.5 CollapsibleContainerNode — `packages/lexical-playground/src/plugins/CollapsibleExtension/`

The worst container in the product: on Chrome and Firefox it is not a disclosure widget at
any layer.

| id | bucket | trigger (vector) | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| LEX-CB-056 | B2 | **entry:** insert a collapsible (`INSERT_COLLAPSIBLE_COMMAND`) | container entry | **browser-dependent.** `createDOM` branches: on `IS_CHROME \|\| IS_FIREFOX` it builds a **`<div open="">`** — a plain div with a meaningless attribute; elsewhere a real `<details>` with a `toggle` listener. The title is always a `<summary>`, which outside a `<details>` has **no role at all** | a titled, expandable block appears | **nothing, and on Chrome/Firefox nothing to read either** | you are in a collapsible section, currently open, titled X | **both** | low |
| LEX-CB-057 | B2 | **entry:** ↓ / → from the block above; `$onEscapeDown` also inserts a trailing paragraph when the collapsible is the last child | container entry | as above | the caret enters the title | nothing | you entered a collapsible section | both | low |
| LEX-CB-058 | B2 | **transition:** Enter in the title — the plugin's `INSERT_PARAGRAPH_COMMAND` handler **opens the container if it is closed** and then moves the caret into the content (`titleNode.getNextSibling()?.selectEnd()`) | two state changes at once | as above | the section expands and the caret jumps into the body | **nothing for either change**; and on Chrome/Firefox the expansion has no `aria-expanded` to observe | the section expanded, **and** you moved from the title into the body | both | low |
| LEX-CB-059 | B2 | **transition:** toggling open/closed (click on the summary, or `toggleOpen()`) | disclosure state | `<div open>` on Chrome/Firefox — no `aria-expanded` anywhere | the body appears/disappears | nothing | the section is now expanded / collapsed | both | low |
| LEX-CB-060 | B2 | **exit:** ↑ / ← out of the title (`$onEscapeUp`, which also inserts a leading paragraph when the collapsible is the first child) | container exit | as above | the caret leaves | nothing | you left the collapsible section | both | low |
| LEX-CB-061 | B2 | **exit:** ↓ / → out of the content (`$onEscapeDown`) | container exit | as above | as above | nothing | as above | both | low |

### 6.6 LayoutContainerNode / LayoutItemNode, and the slot-based blocks

| id | bucket | trigger (vector) | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| LEX-CB-062 | B2 | **entry:** insert a columns layout (`/columns`) | container entry | **no** — `<div style="grid-template-columns:…" data-lexical-layout-container>`; the items are bare `<div>`s. No role, no name, no column index | text splits into visible columns | nothing, and nothing to read afterwards | you are in column 1 of 3 | **both** | low |
| LEX-CB-063 | B2 | **transition:** Tab / arrow between columns | container hop | no | the caret jumps to the next column | nothing; the columns do not exist at the accessibility layer, so the jump reads as an arbitrary caret move within one flow | you moved to column 2 of 3 | **both** | low |
| LEX-CB-064 | B2 | **entry/exit:** a `CardNode` / `PullQuoteNode` / `ReviewNode` slot (`SlotContainerNode`, `$getSlotHostKey`) | container entry/exit | no — plain `<div>` hosts | a styled sub-region takes the caret | nothing. `RangeSelection.insertParagraph()` explicitly returns `null` inside a single-block slot ("Mirrors Enter in a single-line input — a no-op"), so **Enter does nothing at all** and is indistinguishable from a broken key | you are in the card's title slot; Enter will not create a line here | **both** | low |
| LEX-CB-065 | B2 | **entry:** the image caption sub-editor (a nested `LexicalComposer`) | container entry | partial — a separate editable region | a caption field appears under the image | entering a nested editor is silent; `$updateToolbar` tracks `isImageCaption` and never announces it | you are in a separate caption editor; Escape leaves it | both | low |
| LEX-CB-066 | B2 | **entry:** a `StickyNode` (`isIsolated(): true`) | container entry | n/a | a sticky note renders | **the caret cannot reach it at all** — an isolated decorator stops caret traversal, so the content is pointer-only | that the content exists and how to reach it | **structural** | low |

### 6.7 Cross-cutting boundary failures

| id | bucket | trigger | whatChanges | structural | sightedCue | currentSR | needsToKnow | failureClass | frequency |
|---|---|---|---|---|---|---|---|---|---|
| LEX-CB-067 | B2 | **Shift+Arrow across any container edge** (quote → paragraph, list item → paragraph, in/out of a code block) | selection spanning a boundary | the `RangeSelection` legitimately spans the edge | the highlight visibly crosses the rule/marker | AT-native selection growth (INFERRED); **nothing signals that the selection now spans a structural boundary**, which is exactly when a subsequent Delete or format command behaves surprisingly | your selection now crosses out of the quotation | transition | medium |
| LEX-CB-068 | B2 | a format or delete command applied to a boundary-spanning selection | document structure | yes — containers merge, split or dissolve | several blocks change shape at once | nothing | how many containers were affected, and how | transition | medium |
| LEX-CB-069 | B2 | undo/redo of any container transition above | container entry/exit | yes | the container reappears/vanishes around the caret | only `"Undone"` / `"Redone"` — the same constant string for "you re-entered a code block" as for "a character came back" | which container state you are now in | transition | high |
| LEX-CB-070 | B2 | any of the above while the toolbar's `blockType` label changes from e.g. "Quote" to "Normal" | containment state | the label is exposed as the dropdown trigger's accessible name | the dropdown label visibly changes | the new value is readable **on demand**, by leaving the text and finding the toolbar; the change itself is never announced | that the containment changed, at the moment it changed | transition | high |

**Summary of the escape-hatch contract, which is different for every container:**

| Container | "I am at the end and want out" gesture | Announced? |
|---|---|---|
| `QuoteNode` | **any Enter** (there is no empty-line rule) | no |
| `CodeNode` | **two blank lines, then Enter** (`$exitCodeNodeOnEnter`) | no |
| `ListNode` (top level) | Enter on **one empty item** (`$handleListInsertParagraph`) | no |
| `ListNode` (nested) | Enter on one empty item → **drops one level, stays in the list** | no |
| `TableCellNode` | arrow past the table's first/last row | no |
| `CollapsibleContainerNode` | `$onEscapeUp` / `$onEscapeDown` on arrow keys | no |
| Layout column / slot | none; Enter inside a single-block slot is a **silent no-op** | no |

Three different Enter contracts for three containers, none of them announced and none of
them discoverable — a sighted user learns them by watching the caret, which is precisely
the channel a blind user does not have.

---

## 7. Existing accessibility work in Lexical — a precise account

This section is written to be usable by someone maintaining an a11y branch, so it states
exactly what is there rather than characterising it.

### 7.1 Every live region in the repository

`grep -rn "aria-live" packages/*/src --include=*.ts --include=*.tsx` returns **one
non-test source file**: `packages/lexical-a11y/src/index.ts`. The other matches are the
unit tests of the announcers listed below. There is **no other `aria-live`, `role="alert"`
or `role="status"` in any editor code path** (`ui/FlashMessage.tsx` has a
`role="alert"`, and the website has one in an error boundary; neither is an editing
surface).

`grep -rni "arianotify" packages/` returns **nothing**. `ariaNotify` is not used, not
polyfilled and not referenced anywhere.

### 7.2 `@lexical/a11y` (new in 0.49.0) — `packages/lexical-a11y/src/index.ts`

| Export | What it does |
|---|---|
| `AriaLiveRegionExtension` | Owns **one** visually-hidden region per editor: `role="status"`, `aria-atomic="true"`, `aria-live` from a runtime-tunable `politeness` signal (default `polite`). Created in `register`, disposed on teardown, mounted into the editor's **own document** (iframe/shadow-safe) or an explicit `owner`. Exposes a stable `announce(message)` sink. Re-announcing the same string appends `​` so the change still registers. The buffered message is deliberately **not** replayed into a freshly mounted region, so an editor remount does not re-speak stale text. |
| `HistoryAnnounceExtension` | `UNDO_COMMAND` → `"Undone"`, `REDO_COMMAND` → `"Redone"` (both configurable, both `return false` so the chain continues). Registered at `COMMAND_PRIORITY_LOW`. |
| `EditorModeAnnounceExtension` | `registerEditableListener` → `"Editor is editable"` / `"Editor is read-only"`. Transition-based; the initial mount is silent. |
| `FocusTrapExtension` | Full Tab/Shift+Tab management inside a container plus a document-level `focusin` pull-back; restores prior focus on dispose. Escape is deliberately not intercepted. |
| `RovingTabIndexExtension` | WAI-ARIA roving tabindex; `horizontal`/`vertical`/`both`; Home/End; items re-queried on every interaction. |
| `FocusManagerExtension` | Alt+F10 into a toolbar (preferring the `[tabindex="0"]` roving item), Escape back to the editor with `editor.focus()` restoring the prior selection. |

All six are `disabled`-gated from inside an `effect`, so a disabled announcer registers no
listener at all, and all messages are configurable signals for i18n. React adapters:
`useLexicalAriaLiveRegion`, `useLexicalFocusTrapRef`, `useLexicalRovingTabIndexRef`,
`useLexicalFocusManagerRef` in `packages/lexical-react/src/` — thin wrappers that require
the matching extension to be registered.

### 7.3 The two content announcers outside that package

| Extension | File | Behaviour |
|---|---|---|
| `HeadingAnnounceExtension` | `packages/lexical-rich-text/src/HeadingAnnounceExtension.ts` | `registerMutationListener(HeadingNode, …, {skipInitialization: true})` → `"Heading level %s"` on create, `"Heading level %s removed"` on destroy. A level change fires both, so creation is preferred and destruction only announced when nothing replaced it; a destroyed node's level is read from `prevEditorState`. Announces **only** create/destroy — typing inside a heading is deliberately silent. **A dependency of `RichTextExtension`, so it is on by default.** |
| `AutoLinkAnnounceExtension` | `packages/lexical-link/src/AutoLinkAnnounceExtension.ts` | `registerMutationListener(AutoLinkNode, …)` → `"Link"` / `"%s links"` / `"Link removed"` / `"%s links removed"`. A create paired with a destroy in the same update is suppressed, because every keystroke extending a URL rebuilds the node. **A dependency of `AutoLinkExtension`, so it is on by default.** |

### 7.4 Complete ARIA inventory of the editor surfaces

From `packages/lexical-website/docs/concepts/keyboard-accessibility.md`, cross-checked
against source:

| Component | role | aria-* |
|---|---|---|
| editor root (`LexicalContentEditableElement.tsx`) | `textbox` (default) | `aria-label`/`labelledby`, `aria-describedby`, `aria-multiline`, `aria-placeholder`, `aria-readonly` (when not editable), `aria-required`, `aria-invalid`, `aria-errormessage`, `aria-owns`, `aria-autocomplete`, `aria-activedescendant`, `aria-controls`, `aria-expanded` **(only when `role === 'combobox'`)** — all optional props the host must supply |
| `ToolbarPlugin` | `toolbar` | `aria-label="Editor toolbar"` on the container; `aria-label` on each button; **no `aria-pressed` anywhere** |
| `Modal` | `dialog` | `aria-modal`, `aria-labelledby` |
| check-list `ListItemNode` | `checkbox` | `aria-checked`, `tabindex="-1"` |
| `LexicalMenu` typeahead container | `listbox` | `aria-label="Typeahead menu"`; items `role="option"` + `aria-selected` |
| editor root while a typeahead is open | — | `aria-controls="typeahead-menu"`, `aria-activedescendant="typeahead-item-N"` |
| `EquationNode` | `math` | `aria-label="Equation: …"` |
| `FindReplaceExtension` | `dialog` | `aria-label`, labelled inputs, **`aria-pressed`** on Match case / Use regex |
| `ReviewExtension` | — | **`aria-pressed`** on the star buttons |
| `RubyExtension` | `group` | `aria-label` |
| `TableOfContentsPlugin` | `button` | — |
| `Switch` / `ShortcutsHelpDialog` | — | `aria-checked` |
| the live region | `status` | `aria-live`, `aria-atomic` |
| `TableScrollShadowPlugin` chrome | — | `aria-hidden` |
| exported `YouTubeNode` | — | `title="YouTube video"` **on export only**, not in `createDOM` |

`aria-level` appears nowhere in Lexical's own output; the only occurrences in the repo are
inside pasted-Google-Docs HTML fixtures in `packages/lexical/src/__tests__/`.
`role="combobox"` is never set. `aria-owns` is never set by any editor code.

### 7.5 Upstream issues and PRs

Searching `facebook/lexical` for accessibility work returns a small, narrow set:

- [#5874](https://github.com/facebook/lexical/issues/5874) — `contentEditable` does not
  properly announce deletions with screen readers on Safari (closed).
- [#8025](https://github.com/facebook/lexical/issues/8025) — screen reader does not
  announce "Passed horizontal rule" on up/down arrow navigation (closed).
- [#6006](https://github.com/facebook/lexical/issues/6006) — better support for keyboard
  accessibility (closed).
- [#1923](https://github.com/facebook/lexical/issues/1923) — toolbar keyboard
  accessibility (closed).
- [#8544](https://github.com/facebook/lexical/issues/8544) — improve accessibility with a
  mouse click (closed).
- [#7364](https://github.com/facebook/lexical/issues/7364) — do not select the first item
  on render of `LexicalMenu` (closed) — the origin of the `preselectFirstItem` option.

There is **no umbrella accessibility issue**, and **no filed issue** for autoformat
announcements, pending-format disclosure, container-boundary transitions, or the
typeahead's `aria-activedescendant` ownership. Nobody has asked upstream for the things
this corpus is about — which is itself evidence that the gap is invisible from inside any
single layer.

### 7.6 What the docs claim, and whether it holds

`packages/lexical-website/docs/concepts/keyboard-accessibility.md` is accurate. It
correctly states that the hooks require their extensions, that Escape blurs only on a
range selection, that `TabIndentationExtension` taking over Tab means WCAG 2.1.2 must be
verified per integration, and that mobile screen readers and forced-colors are untested.
Its ARIA quick-reference table matches source. The one thing it does not say — and the
thing that matters most for adoption — is that **none of this reaches an app built on the
legacy `@lexical/react` plugin API**.

---

## 8. Counts

| Section | rows |
|---|---|
| B1 — automated conversion | 36 (35 live scenarios + 1 recorded absence) |
| B2 — user-initiated change | 68 |
| B3 — menus and popups | 27 |
| CB — container boundary transitions | 70 (4 of them B1 triggers, 66 B2) |
| **total** | **201** |

| Bucket, across all sections | rows |
|---|---|
| B1 | 40 |
| B2 | 134 |
| B3 | 27 |

**Announced today, by any mechanism:** 10 rows of 201 — LEX-B1-001, LEX-B1-002,
LEX-B1-023, LEX-B1-024 (the four `HeadingAnnounce` / `AutoLinkAnnounce` cases);
LEX-B2-009, LEX-B2-010 (partial), LEX-B2-038 (partial) (heading commands and pasted
headings); LEX-B2-034, LEX-B2-035 (undo/redo); LEX-B2-053 (read-only mode). That is
**≈5%**, and six of the ten are constant strings that name nothing.

**Coverage by container** (§6, 70 rows): **zero** announced. Not one entry vector, exit
vector, depth change or escape hatch across `QuoteNode`, `CodeNode`, `ListNode`,
`TableCellNode`, `CollapsibleContainerNode`, `LayoutContainerNode` or the slot blocks
produces any announcement. (LEX-CB-008 and LEX-CB-069 hear `"Undone"` / `"Redone"`, but
that string reports the history operation, not the container state the caret landed in.)

---

## 9. What Lexical does well

**Structure, almost everywhere.** The reconciler emits real HTML: `<h1>`–`<h6>`,
`<ul>`/`<ol>` with genuine nesting, `<blockquote>`, `<a href>`, `<mark>`, `<hr>`, and
native `<table>/<tr>/<th>/<td>`. A user who navigates back over a converted region finds
proper semantics. On the layered analysis Lexical **passes layer 1 for most things and
fails layer 3** — the classic rich-editor profile named in `layered-gap-analysis.md`. The
exceptions are specific and enumerable (§9's counterpart below), which is itself valuable.

**A real, designed accessibility layer exists.** `@lexical/a11y` is not a token gesture.
One editor-owned live region, correct lifecycle, iframe/shadow-root aware, runtime-tunable
politeness, repeat-suppression via a zero-width space, and a deliberate refusal to replay
a buffered message into a remounted region. It is the single-funnel pattern this project's
own `ORCHESTRATION.md` mandates, arrived at independently.

**The two content announcers are carefully scoped, and both are on by default.**
`HeadingAnnounceExtension` announces only create/destroy, refuses to announce on every
keystroke inside a heading, and reads a destroyed node's level from `prevEditorState`.
`AutoLinkAnnounceExtension` suppresses the create+destroy pair that every keystroke of a
growing URL produces, so a URL announces once rather than once per character. Both are
`disabled`-gated from inside an effect so a disabled announcer costs nothing, and both are
message-configurable for i18n. **This is the correct shape for a B1 announcement.** The
problem is coverage, not design.

**Keyboard architecture.** `FocusManagerExtension` implements the WAI-ARIA editor-menubar
pattern with selection restoration; `RovingTabIndexExtension` collapses the toolbar to one
tab stop with Home/End; `FocusTrapExtension` handles modals and restores prior focus; and
Escape blurs the editor so there is no keyboard trap. The docs state each contract, and
state where it is *not* guaranteed.

**Modals.** `role="dialog"` + `aria-modal` + `aria-labelledby` + a real focus trap with
restoration. The one popup class in the product that is properly conveyed, and the obvious
reference for fixing the others.

**Genuine escape hatches exist.** `$handleListInsertParagraph` and `$exitCodeNodeOnEnter`
are real, deliberate affordances for leaving a container. Most editors have one or none.
Lexical has two — they are simply undiscoverable and unannounced.

**Some nodes are labelled well.** `EquationNode` carries `role="math"` and
`aria-label="Equation: …"` and re-applies it in `updateDOM`. That is the model every other
decorator should follow.

**`aria-pressed` is already in the house vocabulary.** `FindReplaceExtension` and
`ReviewExtension` use it correctly. The main toolbar's omission is an oversight, not a
policy.

**Honest documentation.** `keyboard-accessibility.md` is accurate and names its own gaps.

## 10. What Lexical does badly

**B1 is 90% silent.** Of the 39 live B1 rows (35 in §3 plus the four container-entry
rows in §6), **four** announce: heading
creation, heading level, auto-link creation, auto-link destruction. Lists, ordered lists,
check lists, blockquotes, code blocks, code languages, horizontal rules, tables, all
**nine** text-format transformers, markdown links, images, emoji shortcodes, `:)`→🙂,
equations, tweets, and the silent `MaxLengthExtension` trim are all silent. `- ` + space —
the single most common autoformat gesture in any editor — announces nothing. The mechanism
is already built and already wired: `AriaLiveRegionExtension` is one dependency away and
each existing announcer is ~40 lines.

**B2 pending-format disclosure is the worst case in the corpus and is unfixable in ARIA.**
See §4.2 for the mechanics. Both channels fail simultaneously: no transition event, and no
queryable state, because the state is a bitfield on a selection object and the toolbar
expresses it only as a CSS class. With a selection, a blind user cannot tell whether ⌘B
bolded or unbolded the words; with a collapsed caret, they cannot tell whether bold is now
pending — and there is nothing anywhere to point an announcement *at*. Adding
`aria-pressed` to the toolbar buttons is a genuine, cheap improvement (it makes the state
queryable, and the codebase already does it elsewhere) but it does not make the transition
perceivable at the moment the key is pressed.

**Container boundaries are 100% silent, and every container has a different contract.**
Seventy enumerated entry/exit vectors across seven container types, none announced. Three
different Enter semantics — quote exits on *any* Enter, code needs *two blank lines*, a
list needs *one empty item*, and a nested list drops a level instead of leaving — with no
cue for any of them. Two containers dissolve entirely on a single Backspace
(`QuoteNode.collapseAtStart` and `CodeNode.collapseAtStart` both convert the whole block
to a paragraph). Backspace inside a list can silently **split one list into two**. And the
containment state is not merely absent — it is *computed on every selection change*,
stored in `toolbarState.blockType` / `rootType` / `isImageCaption`, and rendered as a
visible label. The gap is precisely the last hop from that state to the accessibility
layer.

**The typeahead ARIA is structurally invalid, and its filtering is invisible.** Every
piece is present and mis-assembled: `role="listbox"` on a container whose options sit two
levels down; `aria-activedescendant` on a `role="textbox"` pointing into a portal outside
the focused subtree, with `aria-controls` (which confers no ownership) where `aria-owns`
was needed; and no `role="combobox"`, which makes `LexicalContentEditableElement`'s
existing `aria-expanded` support dead code. Worse — and independent of all that — option
ids are **positional**, and each filter keystroke calls `setHighlightedIndex(0)` rather
than `updateSelectedIndex(0)`, so **the `aria-activedescendant` value does not change at
all while the user types**. Even a correctly-owned activedescendant would announce nothing
during filtering. No result count is exposed by any menu, and mouse hover moves the visual
highlight without updating the attribute.

**Nothing distinguishes "the command did nothing" from "the command worked."** Tab at
`maxIndent: 7` is refused silently. Deletion clamped at a table-cell boundary is silent.
Enter inside a single-block slot is an explicit no-op. `MaxLengthExtension` discards
keystrokes. `escapeFormatTriggers` drops a pending format on an arrow key. In every case a
sighted user sees nothing move and infers the refusal; a blind user gets the same silence
they get from success.

**Check lists trade one semantic for another and land with neither.**
`updateListItemChecked` puts `role="checkbox"` on the `<li>`, overriding `listitem` and
destroying position-in-set; and because the `<li>` has `tabindex="-1"` and never takes DOM
focus, the `aria-checked` flip on Space fires on an unfocused element and raises no state
change.

**Several containers and nodes have no semantics at all.** `CodeNode` is a bare `<code>`
with no role or name. `CollapsibleContainerNode` is a **`<div open="">` on Chrome and
Firefox** — the two browsers most users are on — so the disclosure widget does not exist
at the accessibility layer, and its `<summary>` title has no `<details>` parent and
therefore no role. `LayoutContainerNode` columns are CSS grid with no roles, names or
indices. Paragraph indent is `padding-inline-start`; block alignment is a CSS class; font
size is an inline style; the code language is a `data-` attribute. These are **layer-1**
failures: no announcement can repair them, because there is nothing in the document to
review afterwards.

**Decorator nodes are a silent embedded-object minefield.** Arrowing onto a block
decorator produces a `NodeSelection` with **no DOM range**, so the browser caret vanishes
and the platform text API has nothing to report. Most decorators carry no accessible name
at all — `PageBreakNode`, `PollNode`, `ExcalidrawNode`, `FigmaNode` are unlabelled;
`YouTubeNode` has a `title` only on export, not in `createDOM`; `MentionNode` renders as
plain text with no role despite being an indivisible token; `StickyNode` is
`isIsolated(): true` and therefore unreachable by keyboard at all. `EquationNode` and
`ImageNode` (via `alt`) are the exceptions.

**Undo/redo announce a constant string.** "Undone" says that *something* reverted, not
what — and it is the same word whether a character came back or an entire code block
re-formed around the caret. It is the cleanest illustration of the live-region ceiling: a
string channel cannot carry a document delta.

**`ariaNotify` is unused.** Every announcement goes through a visually-hidden
`role="status"` div — the layer-3 workaround this analysis is about.

**Announcements exist only on the extension API.** `RichTextPlugin` and `AutoLinkPlugin`
call `registerRichText` / `registerAutoLink` directly and never pull in the announcers, so
the real deployed coverage of B1 across the Lexical ecosystem is closer to **0%** than to
the ~10% the playground achieves.

---

## 11. The five worst scenarios

Ranked by (severity of the information loss) × (frequency) × (how little any existing
mechanism can carry).

1. **LEX-B2-002 / LEX-B2-003 — ⌘B with a collapsed caret, and its untoggle.** The hardest
   case in the corpus. The state is a bit in `RangeSelection.format`; there is no element,
   attribute, or AX object to inspect, and the toolbar expresses it only as a CSS class.
   Both channels fail at once: no transition event *and* no queryable state. "On" and
   "off" are equally silent, so the user cannot even infer the direction from repetition.
   Highest possible frequency — it is how anyone types a bold word. This is the row that
   most clearly demands a new platform concept rather than a better live region.

2. **§6 as a whole — container boundary transitions (LEX-CB-001…070).** Seventy vectors,
   zero announced, across seven container types with three mutually incompatible Enter
   contracts, two one-keystroke container dissolutions, and a Backspace that can split a
   list in two. The user's mental model of "where am I" is destroyed and never rebuilt.
   The aggravating factor: the answer **is already computed on every selection change**
   and rendered as a visible toolbar label, so this is a missing hop, not a missing
   capability. LEX-CB-009 (any Enter silently exits a blockquote, dragging trailing text
   out with it) is the single sharpest instance.

3. **LEX-B1-003 / LEX-B1-004 / LEX-B1-006 — `- `, `1. `, `- [ ] ` becoming a list.** The
   archetypal B1 conversion, the highest-frequency autoformat in existence, completely
   silent — while the exact announcer pattern that would fix it ships twice over in the
   same repository for headings and auto-links. The check-list variant is worse still: it
   makes the document *less* navigable than a plain list, because `role="checkbox"`
   destroys the `listitem` semantics and the checkbox never takes focus.

4. **LEX-B3-001 / LEX-B3-002 / LEX-B3-006 / LEX-B3-009 — the typeahead menus.** Invalid
   `aria-activedescendant` ownership, a broken listbox→option relationship, no
   `role="combobox"` (making existing `aria-expanded` support dead), **positional ids that
   make filtering produce no DOM change at all**, no result count, and no live-region
   fallback. Opening, filtering, navigating and accepting are all probably silent on three
   surfaces a user reaches for dozens of times per document. This is a structural ARIA
   failure, not merely an unannounced transition.

5. **LEX-B2-019 / LEX-B2-028 / LEX-CB-056 / LEX-CB-062 — the pure layer-1 failures:
   paragraph indent, block alignment, the collapsible container on Chrome/Firefox, and
   layout columns.** Chosen over noisier candidates because these cannot be fixed by any
   announcement, any `ariaNotify`, or any new ARIA transition vocabulary. Indent is
   `padding-inline-start`; alignment is a CSS class; a disclosure widget is a `<div
   open="">`; columns are CSS grid with no roles. The *state* has to become expressible
   before the *transition* is even worth discussing.

**Honourable mention — LEX-B2-034 (undo).** Not in the top five because Lexical does
announce it, but it is the cleanest demonstration of the live-region ceiling: the best
available mechanism reduces an arbitrary document delta — including "you are now back
inside a code block" — to the single word "Undone."

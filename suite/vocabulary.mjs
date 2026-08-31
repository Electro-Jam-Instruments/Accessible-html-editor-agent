/**
 * vocabulary.mjs — the announcement vocabulary, extracted from the contracts.
 *
 * One exported entry per semantic token (P0.5 session 1; the design is
 * conformance-suite-design.md, "The hard part: matching announcements
 * semantically"). Each token maps to the surface forms the suite accepts, and
 * the tokens follow the corpus's `needsToKnow` vocabulary in
 * scenarios/canonical.md: `container:blockquote`, `direction:left`,
 * `state:unchecked`, `op:undone`, …
 *
 * The governing principle, stated once here instead of once per contract:
 * **generous on wording, strict on substance.** Announcements are free text, so
 * a regex per clause makes editors pass or fail on wording accidents. A
 * screen-reader user does not care whether an editor says "out of list" or
 * "left list"; they care that SOMETHING named the construct and the fact that
 * changed. Every entry below accepts any phrasing a screen-reader user would
 * accept as conveying its token, and no entry accepts a phrasing that omits
 * the substance ("formatted", a bare "level" with no number, an ordinal with
 * no construct).
 *
 * This module is suite-owned and public on purpose: an editor can be tested
 * against it, argue with it, and contribute to it — rather than each clause
 * encoding one author's phrasing. It is also a documented vocabulary of what
 * editing transitions must convey, which is precisely the input a standards
 * proposal needs. The fairness decisions recorded on the entries below are
 * that documentation; do not strip them.
 *
 * A note on regex sharing: none of these carry the /g flag, so the objects are
 * stateless and safe to share between contracts (no lastIndex to race on).
 * Several conceptual tokens carry more than one surface-form set because two
 * contracts historically matched them differently; each variant is exported
 * under its own name and annotated, so behaviour is preserved bit-for-bit and
 * the divergence is visible rather than silently unified.
 */

/* ================================================================== */
/* Containers                                                          */
/* ================================================================== */

/**
 * `container:blockquote` — something named the quotation container.
 *
 * Fairness (blockquote.mjs): facebook/lexical#9070 adds a
 * QuoteAnnounceExtension announcing "Block quote", "Block quote removed",
 * "Block quote removed, in block quote" and "Exiting block quote". The suite
 * must accept those strings — a clause that fails on `main` and passes on that
 * branch is review evidence the maintainers do not have — but it must not be
 * written *only* for them, or it stops being a contract and becomes a snapshot
 * test of one project's copy. So: any of the words a screen-reader user would
 * accept as "this is a quote" pass; "formatted" and silence do not.
 *
 * Fairness (blockquote.mjs): direction words are deliberately NOT required on
 * entry. Naming a container as you arrive in it is the established convention
 * ("Block quote", the way NVDA itself reads a container on entry in browse
 * mode); demanding "entered" would fail a correct implementation over house
 * style. Direction IS required on exit — see `direction:left` /
 * `direction:removed` below, where the direction is the whole content.
 *
 * Shared verbatim by entry-parity.mjs's construct table.
 */
export const CONTAINER_BLOCKQUOTE =
  /\b(block\s*quotes?|blockquotes?|quotations?|quotes?|quoting)\b/i

/**
 * `container:codeblock` — something named the code container.
 *
 * Fairness (codeblock.mjs): the matcher accepts "code snippet" as readily as
 * "code block". CKEditor 5's string is "Entering %0 code snippet"; Lexical's
 * hypothetical one would be "Code block". A clause that demanded either
 * wording would be a snapshot test of one project's copy, not a contract.
 * "Preformatted" is what several screen readers say for <pre> in browse mode.
 * All pass. (This is the one container an editor demonstrably gets right, so
 * the vocabulary here was written to be passable by the editor that clears
 * the bar — CKEditor — without being written only for it.)
 */
export const CONTAINER_CODEBLOCK =
  /\b(code\s*blocks?|codeblocks?|code\s*snippets?|snippets?|code|preformatted|monospaced)\b/i

/**
 * `container:codeblock` — the comparative (entry-parity.mjs) variant.
 *
 * entry-parity.mjs compares the SET of container constructs named by two
 * vectors, so its form set differs from codeblock.mjs's: it adds
 * "source code" and drops the standalone "snippets?" / "monospaced" forms.
 * The two variants predate this module and are kept separate so that no
 * measured cell changes; unifying them is a candidate for a future session,
 * to be proved by a re-run, not assumed.
 */
export const CONTAINER_CODEBLOCK_COMPARATIVE =
  /\b(code\s*blocks?|code\s*snippets?|codeblocks?|preformatted|source\s*code|code)\b/i

/**
 * `container:list` + `direction:entered` — a bulleted list started.
 *
 * (bulleted-list.mjs) Deliberately generous: the suite is testing whether
 * ANYTHING was said, not whether the wording matches a house style. Accepts
 * either order — a bullet/unordered word before "list", or "list" followed by
 * a word that reads as its beginning ("bullet", "item 1", "start").
 */
export const CONTAINER_LIST_STARTED =
  /\b(bullet(ed)?|unordered)\b[^.]*\blist\b|\blist\b[^.]*\b(bullet|item\s*1|start)/i

/**
 * `container:list` — the comparative (entry-parity.mjs) variant: any word
 * that names the list construct at all, used only to compute which constructs
 * an announcement named so two vectors' identity sets can be compared.
 */
export const CONTAINER_LIST_COMPARATIVE =
  /\b(lists?|bullets?|bulleted|numbered|ordered|unordered|list\s*items?)\b/i

/**
 * `container:list` — the weak form (checklist.mjs, NAMES_LIST): something
 * named the container as a list OF ANY KIND. Used to tell "said the wrong
 * thing" apart from "said nothing" — an announcement that matches this but
 * not `container:tasklist` named a list and lost the task identity.
 */
export const CONTAINER_LIST_WEAK = /\b(lists?|items?|bullets?)\b/i

/**
 * `container:listitem` — something that reads as a list item at all.
 *
 * Used by list.mjs (CONVEYS_ITEM) and bulleted-list.mjs (CONVEYS_NEW_ITEM);
 * their historical regexes listed the same three alternatives in different
 * orders, which is behaviourally identical under .test(), so they share one
 * entry.
 */
export const CONTAINER_LISTITEM = /\b(list\s*item|item|bullet)\b/i

/**
 * `container:orderedlist` — an ordered list, however the editor words it.
 *
 * Fairness (list.mjs, CONVEYS_ORDERED): an ordinal alone is AMBIGUOUS, so the
 * construct must be named. "item 2" / "number 2" is also exactly what a
 * position announcement in a BULLETED list says. Heard once, with no second
 * string to contrast it against, the user cannot tell whether the editor is
 * numbering their document or merely counting it — and that decides what
 * their next Enter produces. So this entry requires an ordered/numbered word
 * and the word "list" together (in either order), and a bare ordinal never
 * satisfies `container:orderedlist` on its own.
 */
export const CONTAINER_ORDEREDLIST =
  /\b(ordered|numbered|number)\b[^.!]*\blist\b|\blist\b[^.!]*\b(ordered|numbered)\b/i

/**
 * `container:tasklist` — something named the construct as a TASK, not merely
 * as a list.
 *
 * Fairness (checklist.mjs, NAMES_TASK): "bulleted list, item 1" must not
 * satisfy this — a task item that reports itself as a plain bullet has lost
 * the only thing that distinguishes it, and the two constructs behave
 * differently under every subsequent keystroke.
 */
export const CONTAINER_TASKLIST =
  /\b(tasks?|to-?dos?|check\s*lists?|check\s*box(es)?|checkable|tick\s*box(es)?|action items?)\b/i

/**
 * `container:heading` — the comparative (entry-parity.mjs) variant of naming
 * a heading construct. The per-vector heading clause uses the stricter
 * `role:heading` entry below (which also accepts the "h1" shorthand).
 */
export const CONTAINER_HEADING_COMPARATIVE = /\b(headings?|titles?)\b/i

/** `container:table` — used by entry-parity.mjs's construct table only. */
export const CONTAINER_TABLE = /\b(tables?|rows?|columns?|cells?)\b/i

/* ================================================================== */
/* Roles and levels                                                    */
/* ================================================================== */

/**
 * `role:heading` — something named the heading construct (heading.mjs).
 * "Heading level 1", "heading 1", "h1" all pass; "formatted" does not.
 */
export const ROLE_HEADING = /\bheading\b|\bh1\b/i

/**
 * `level:1` — heading flavour (heading.mjs, CONVEYS_LEVEL). Level matters
 * because a heading with no level is not navigable. Accepts the "h1"
 * shorthand, which names construct and level in one token.
 */
export const LEVEL_1_HEADING = /\b(level\s*)?1\b|\bh1\b|\bone\b/i

/**
 * `level:1` — list-depth flavour (list.mjs, CONVEYS_LEVEL_1). Accepts
 * "first" and "top level", which are natural wordings for the shallowest
 * list depth but not for a heading. At level 1 the next Shift+Tab may leave
 * the list entirely, so the number is what tells the user what their next
 * keystroke will do.
 */
export const LEVEL_1_LIST = /\b(level\s*)?1\b|\bone\b|\bfirst\b|\btop(-| )?level\b/i

/** `level:2` — list depth (list.mjs, CONVEYS_LEVEL_2). */
export const LEVEL_2_LIST = /\b(level\s*)?2\b|\btwo\b|\bsecond\b/i

/* ================================================================== */
/* Directions (the containment stack changed)                          */
/* ================================================================== */

/**
 * `direction:left` — the caret moved out of a structure that still exists.
 *
 * Fairness (blockquote.mjs, C-5): "removed" is a different fact from "left".
 * `exit` moved the caret and the container still exists; `destroy` dissolved
 * the container around a caret that never moved. An editor that says one
 * string for both has told the user something false half the time — so the
 * suite keeps two separate direction tokens and asserts them against each
 * other: an exit announcement must convey leaving and must NOT convey
 * removal, and a destroy announcement must convey removal. Shared verbatim
 * by blockquote.mjs and codeblock.mjs.
 */
export const DIRECTION_LEFT =
  /\b(exit(ed|ing|s)?|left|leave|leaves|leaving|outside|escaped)\b|\bout of\b|\bend of\b/i

/**
 * `direction:removed` — the structure ceased to exist, as opposed to the
 * caret moving out of it (the other half of C-5; see `direction:left`).
 * This is the general form, used by codeblock.mjs.
 */
export const DIRECTION_REMOVED =
  /\b(removed?|removal|deleted?|dissolved|cleared)\b|\bno longer\b/i

/**
 * `direction:removed` — the blockquote variant (blockquote.mjs), which also
 * accepts "unquoted": a removal word that exists only for this container.
 * Kept as a separate entry so the general form does not grow a quote-only
 * word and the blockquote clause does not lose one it accepted.
 */
export const DIRECTION_REMOVED_QUOTE =
  /\b(removed?|removal|deleted?|unquoted|dissolved|cleared)\b|\bno longer\b/i

/**
 * `direction:left` + `container:list` — left the list: a direction word and
 * the construct, in either order (list.mjs, CONVEYS_LEFT_LIST). A bare
 * direction with no construct, or "list" with no direction, does not pass —
 * those are the halves that make the message useless.
 */
export const DIRECTION_LEFT_LIST =
  /\b(left|leaving|exit(ed|ing)?|out of|end(ed)?|no longer (in|a))\b[^.!]*\blist\b|\blist\b[^.!]*\b(left|ended|exited|removed|finished)\b/i

/**
 * `direction:left` + `container:tasklist`|`container:list` — left the task
 * list (checklist.mjs, CONVEYS_LEFT_LIST). Wider than the list form on both
 * halves: the construct may be named as a task/to-do/check list as well as a
 * list, and a few more closing words are accepted ("stopped", "over",
 * "closed"). Whether the announcement named the TASK list specifically is a
 * separate assertion on `container:tasklist` — this entry only decides that
 * a crossing out of the construct was conveyed at all.
 */
export const DIRECTION_LEFT_TASKLIST =
  /\b(left|leaving|exit(ed|ing)?|out of|end(ed)?|no longer (in|a)|stopped)\b[^.!]*\b(list|tasks?|to-?do|check\s*list)\b|\b(lists?|tasks?|to-?do list|check\s*list)\b[^.!]*\b(left|ended|exited|removed|finished|over|closed)\b/i

/**
 * `destination:named` — the announcement says what the caret is now in, not
 * only what it left (list.mjs / checklist.mjs, CONVEYS_DESTINATION —
 * identical in both). Half a containment stack is not a containment stack:
 * the user knows they moved and not where to. Not a corpus `needsToKnow`
 * token; it is the suite's SHOULD-level refinement of `direction:left`.
 */
export const DESTINATION_NAMED =
  /\b(paragraph|body|text|normal|document|blank line|editor)\b/i

/* ================================================================== */
/* Depth and position                                                  */
/* ================================================================== */

/**
 * `depth:increased` / `depth:decreased` — a depth change of any wording:
 * "level", "indent", "nest", "depth" (list.mjs, CONVEYS_DEPTH). One entry
 * for both directions: the contracts key the direction to the operation
 * (Tab vs Shift+Tab) and use the level entries above to ask whether the NEW
 * depth was named, so the surface forms here only have to convey that depth
 * changed at all. Note that Tab and Shift+Tab are the same state change with
 * opposite signs, so an editor that announces one and not the other is worse
 * than one that announces neither (invariant C-3).
 */
export const DEPTH_CHANGED =
  /\b(level|indent(ed|ation)?|outdent(ed)?|nest(ed|ing)?|depth|sub-?list)\b/i

/**
 * `position:2` — a standalone "2": the ordinal the editor supplied
 * (list.mjs, CONVEYS_TWO). Not "2px", not "v2" — the guards exclude a digit
 * embedded in a longer token. The ordinal is the ONE fact an ordered list
 * has that a bulleted list does not, and it is the fact the editor computed
 * and inserted; but see `container:orderedlist` for why an ordinal alone is
 * never enough — list.mjs only credits the ordinal on an announcement that
 * also reads as a list item (`container:listitem`).
 */
export const POSITION_2 = /(?:^|[^\w.])2(?![\w])|\bsecond\b|\btwo\b/i

/**
 * `position:2` — the item-position variant (bulleted-list.mjs, inline in
 * `announcement-position`): "item 2", a bare "2" on a word boundary, or
 * "second". Predates POSITION_2 and is looser about a "2" inside dotted
 * tokens; kept separate so the measured cells do not move.
 */
export const POSITION_2_ITEM = /\b(item\s*)?2\b|\bsecond\b/i

/* ================================================================== */
/* State (the one construct in the corpus that carries it)             */
/* ================================================================== */

/**
 * `state:unchecked` — the item is NOT ticked (checklist.mjs,
 * CONVEYS_UNCHECKED). Must be tested BEFORE `state:checked`: every phrasing
 * of "not ticked" contains a substring that also reads as "ticked" — see
 * statedState() below, which encodes that ordering.
 */
export const STATE_UNCHECKED =
  /\bun-?checked\b|\bun-?ticked\b|\bnot\s+(checked|ticked|done|complete|completed|marked|selected|ready)\b|\bincomplete\b|\bempty\s+(check\s*box|box)\b/i

/** `state:checked` — the item is ticked (checklist.mjs, CONVEYS_CHECKED). */
export const STATE_CHECKED =
  /\bchecked\b|\bticked\b|\bdone\b|\bcompleted?\b|\bmarked\b|\bselected\b/i

/**
 * The state an announcement claims, or null if it claims none.
 *
 * Order matters and is not a detail (checklist.mjs): "not checked" contains
 * "checked", so the negative form is tested first. Getting this backwards
 * would score every honest "unchecked" announcement as a claim that the item
 * is ticked — which is the single worst failure mode a state clause can
 * have, because it would turn a correct editor red and a wrong one green.
 */
export function statedState(text) {
  if (STATE_UNCHECKED.test(text)) return 'unchecked'
  if (STATE_CHECKED.test(text)) return 'checked'
  return null
}

/**
 * Action-only words — the anti-vocabulary for invariant T-1
 * (conformance-suite-design.md): "a toggle command announces the RESULTING
 * STATE, not the action". These describe the keystroke rather than what the
 * document now says; an announcement built only from these has told the user
 * that they pressed a key, which they already knew. Used by checklist.mjs to
 * detect an announcement that names the action and never the state.
 */
export const ACTION_WORDS =
  /\b(toggled?|toggling|pressed|activated?|clicked|switched|flipped|changed|space|enter)\b/i

/* ================================================================== */
/* History                                                             */
/* ================================================================== */

/**
 * `op:undone` — something named the undo operation (history.mjs).
 * 'Undone', 'undo', 'reverted', 'undid' all pass; 'changed' does not.
 */
export const OP_UNDONE = /\bundo(ne)?\b|\bundid\b|\brevert(ed)?\b/i

/** `op:redone` — something named the redo operation (history.mjs). */
export const OP_REDONE = /\bredo(ne)?\b|\bre-?applied\b|\brestored\b/i

/**
 * `target:named` — the announcement says something about the CONTENT that
 * moved, as opposed to naming the operation and stopping (history.mjs,
 * NAMES_TARGET): either the affected text itself (checked by the contract
 * against what was actually typed) or a word for what kind of thing it was.
 * This is the live-region ceiling CAN-B2-023 is really about — a constant
 * string cannot carry a document delta — kept as a SHOULD so the two facts
 * ("was the operation named" and "was its target named") stay separable.
 */
export const TARGET_NAMED =
  /\b(typ\w+|insert\w*|delet\w*|character|letter|word|text|line|paragraph|heading|list|item|quote|block|format\w*)\b/i

/* ================================================================== */
/* Language (`language:X`)                                             */
/* ================================================================== */

/**
 * Aliases for a language token, because an editor is allowed to speak its
 * own label rather than the one that was typed (codeblock.mjs). CKEditor's
 * code-block config maps `js` to the label "JavaScript" and announces THAT;
 * an editor that says "JavaScript" when the user typed "js" has been more
 * helpful than the input, not less, and must not fail for it.
 */
export const LANGUAGE_ALIASES = {
  js: ['js', 'javascript', 'ecmascript'],
  javascript: ['javascript', 'js'],
  plaintext: ['plaintext', 'plain'],
  text: ['text', 'plaintext', 'plain'],
}

/** Every alias a language token expands to (itself when none are recorded). */
export function expandLanguage(token) {
  return LANGUAGE_ALIASES[String(token).toLowerCase()] || [token]
}

/** Fold "Plain text" and "plaintext" into the same word. */
const normalise = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '')

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Does `text` name `candidate`?
 *
 * Word-boundary match on the raw string first. Only for candidates of five
 * characters or more does it fall back to a normalised substring — that is
 * what lets "Plain text" match `plaintext`, and the length guard is what
 * stops a short token like `js` or `c` from matching by accident inside a
 * longer word (codeblock.mjs).
 *
 * The fairness rule that governs which candidates to pass (codeblock.mjs):
 * what is judged is the language the block ACTUALLY RECORDS, not only the
 * token that was typed. Lexical's fence regex captures the typed token
 * (`data-language="js"`); CKEditor's autoformat pattern is a bare /^```$/
 * and assigns the configured default instead — so "Entering Plain text code
 * snippet" from CKEditor HAS named its block's language, correctly, and a
 * clause that insisted on "JavaScript" would fail the one editor it was
 * written to be passable by. What is measured is "is the block's language
 * conveyed", never "did the fence syntax survive".
 */
export function names(text, candidate) {
  if (!text || !candidate) return false
  if (new RegExp(`\\b${escapeRe(candidate)}\\b`, 'i').test(text)) return true
  return candidate.length >= 5 && normalise(text).includes(normalise(candidate))
}

/** The first candidate `text` names, or null. */
export function mentionsLanguage(text, candidates) {
  return candidates.find((cand) => names(text, cand)) || null
}

/* ================================================================== */
/* Token index                                                         */
/* ================================================================== */

/**
 * The vocabulary as a token-keyed map, for tooling and for the standards
 * proposal. Values are the SAME regex objects as the named exports above
 * (regexes without /g are stateless, so sharing is safe); where a token has
 * per-contract variants they are listed most-general-first.
 */
export const TOKENS = {
  'container:blockquote': [CONTAINER_BLOCKQUOTE],
  'container:codeblock': [CONTAINER_CODEBLOCK, CONTAINER_CODEBLOCK_COMPARATIVE],
  'container:list': [CONTAINER_LIST_STARTED, CONTAINER_LIST_COMPARATIVE, CONTAINER_LIST_WEAK],
  'container:listitem': [CONTAINER_LISTITEM],
  'container:orderedlist': [CONTAINER_ORDEREDLIST],
  'container:tasklist': [CONTAINER_TASKLIST],
  'container:heading': [CONTAINER_HEADING_COMPARATIVE],
  'container:table': [CONTAINER_TABLE],
  'role:heading': [ROLE_HEADING],
  'level:1': [LEVEL_1_HEADING, LEVEL_1_LIST],
  'level:2': [LEVEL_2_LIST],
  'direction:left': [DIRECTION_LEFT, DIRECTION_LEFT_LIST, DIRECTION_LEFT_TASKLIST],
  'direction:removed': [DIRECTION_REMOVED, DIRECTION_REMOVED_QUOTE],
  'destination:named': [DESTINATION_NAMED],
  'depth:changed': [DEPTH_CHANGED],
  'position:2': [POSITION_2, POSITION_2_ITEM],
  'state:checked': [STATE_CHECKED],
  'state:unchecked': [STATE_UNCHECKED],
  'action:only': [ACTION_WORDS],
  'op:undone': [OP_UNDONE],
  'op:redone': [OP_REDONE],
  'target:named': [TARGET_NAMED],
  // 'language:X' is functional, not a fixed form set: see LANGUAGE_ALIASES,
  // expandLanguage(), names() and mentionsLanguage() above.
}

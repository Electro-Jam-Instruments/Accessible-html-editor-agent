/**
 * adapters/gestures.mjs — the canonical per-editor operation gestures.
 *
 * P0.5 session 3 moved the gestures out of the contracts and into the
 * adapters; this module is where the canonical definitions live, so that nine
 * adapters declaring the same gesture reference one definition instead of
 * nine copies that can drift.
 *
 * The fairness rule the contracts stated in place (list.mjs, checklist.mjs)
 * still governs and is restated once, here: the gesture sets are UNIFORM
 * across every subject by default — no subject is special-cased, and no
 * subject can expose a hook to be treated differently — so the generosity of
 * trying several real editors' gestures cannot flatter one editor over
 * another. An adapter MAY override a gesture when an editor documents a
 * different one; any divergence is then visible in that adapter file rather
 * than buried in clause code, which is the point of the move.
 */

/**
 * Change-depth gestures, in attempt order (list.mjs, CAN-CB-052/053).
 *
 * Tab/Shift+Tab go first because the canonical rows name them and Tab is what
 * a user tries first. Ctrl+]/Ctrl+[ is tried when the first attempt changed
 * nothing: it is the Word and Google Docs convention, and it is where Open
 * Notebook's own editor moved indentation so that Tab could keep moving focus
 * out of the field (WCAG 2.1.2 — the library's Tab handling is a two-way
 * keyboard trap). The clause asks whether a depth change is CONVEYED; losing
 * that measurement to a keybinding disagreement would make it measure the
 * wrong thing.
 */
export const DEPTH = {
  indent: ['Tab', 'Control+]'],
  outdent: ['Shift+Tab', 'Control+['],
}

/**
 * Checklist toggle gestures, in attempt order (checklist.mjs, CAN-CB-057).
 * The three gestures real editors actually ship:
 *
 *   1. A pointer click on the check marker. Lexical: `handleClick` in
 *      @lexical/list/checkList.ts calls `node.toggleChecked()` for a click
 *      inside the marker region of the <li>. CKEditor 5 does the same with
 *      its injected checkbox span. The only gesture BOTH feature-rich editors
 *      implement, so it goes first — and the least destructive, because a
 *      click that misses only moves the caret.
 *
 *   2. Home, ArrowLeft, Space. Lexical's keyboard route, a two-step one:
 *      `KEY_ARROW_LEFT_COMMAND` at the start of a check item moves DOM FOCUS
 *      onto the <li role=checkbox tabindex=-1>, and only then does
 *      `KEY_SPACE_COMMAND` reach `toggleChecked()`. Space alone, with the
 *      caret in the text, types a space.
 *
 *   3. Ctrl+Enter. CKEditor 5's documented to-do-list keystroke.
 *
 * The attempt loop (still in checklist.mjs — it needs the contract's own
 * probe) stops at the first gesture that changes the document at all.
 */
export const CHECKLIST_TOGGLE = [
  { kind: 'pointer-marker', gesture: 'click on the check marker' },
  {
    kind: 'keys',
    gesture: 'Home, ArrowLeft, Space (focus the checkbox, then toggle it)',
    keys: ['Home', 'ArrowLeft', 'Space'],
  },
  { kind: 'keys', gesture: 'Ctrl+Enter', keys: ['Control+Enter'] },
]

/**
 * Container escape gestures (blockquote.mjs X1 CAN-CB-009, codeblock.mjs X1
 * CAN-CB-026). Editors disagree about what the escape gesture IS — Lexical
 * exits a quote on any Enter (QuoteNode.insertNewAfter) but needs THREE
 * Enters from the end of a code line ($exitCodeNodeOnEnter wants two trailing
 * linebreaks); CKEditor wants an Enter on an empty last line, so two — and
 * the clauses are not the place to adjudicate that. The contract presses the
 * key, OBSERVES the containment stack, and presses again only while the
 * reading still says "inside". `maxPresses` is the terminating bound, NOT a
 * retry budget: it is simply past both known contracts with headroom, so that
 * reaching it is itself a finding and is reported as one.
 */
export const ESCAPE = {
  blockquote: { key: 'Enter', maxPresses: 2 },
  codeblock: { key: 'Enter', maxPresses: 4 },
}

/**
 * Container entry markers (entry-parity.mjs, and the setup keystrokes of the
 * per-container clauses): the typed trigger that asks the editor for each
 * container. The code fence is three backticks then a space because Lexical's
 * CODE transformer fires on CODE_START_REGEX and, having no `triggerOnEnter`,
 * only when the character just typed is a space (MarkdownShortcuts.ts).
 */
export const ENTRY_MARKERS = {
  blockquote: '> ',
  codeblock: '``` ',
  list: '- ',
}

/** The full canonical gesture set, spread into each adapter's `gestures`. */
export const CANONICAL_GESTURES = {
  depth: DEPTH,
  checklistToggle: CHECKLIST_TOGGLE,
  escape: ESCAPE,
  entryMarkers: ENTRY_MARKERS,
}

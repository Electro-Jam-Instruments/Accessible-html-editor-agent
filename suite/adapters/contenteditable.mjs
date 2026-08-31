/**
 * adapters/contenteditable.mjs — a bare contenteditable region, no library.
 *
 * The rich-surface floor of the corpus: a real editing host with a real
 * accessibility tree and NO editor logic. It can hold structure but nothing
 * ever creates any — typing a markdown trigger leaves the trigger as text.
 *
 * Measured (results.json):
 *   - blockquote/codeblock/bulleted-list/list.ordered/checklist create
 *     clauses all report the construct was never produced ("no blockquote
 *     holding …", "no list/listitem in the editor's AX subtree", "no
 *     checkable item was produced") — no construct capability.
 *   - list.nest: "no depth change … Neither Tab nor Ctrl+] produced any
 *     indentation" — no indentGesture, no nesting.
 *   - history.undo/redo: "alpha" -> "" -> "alpha" — native editing history
 *     works, so 'history' is declared.
 */

import { CANONICAL_GESTURES } from './gestures.mjs'

export default {
  id: 'contenteditable',
  kind: 'rich',
  // How a container crossing is recognised for this subject (entry-parity.mjs):
  // the selection's ancestor chain gains or loses the container.
  crossing: 'ancestor-chain',
  supports: ['realStructure', 'history'],
  gestures: { ...CANONICAL_GESTURES },
}

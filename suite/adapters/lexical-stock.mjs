/**
 * adapters/lexical-stock.mjs — a stock Lexical React integration: the
 * documented getting-started config, which is what most applications ship
 * (subjects/lexical/build.mjs).
 *
 * Measured (results.json):
 *   - blockquote, codeblock, bulletList, orderedList: real containers, all
 *     create/enter/exit/destroy structure clauses green — declared.
 *   - checkList: NOT declared. CHECK_LIST is exported by @lexical/markdown
 *     but is not a member of ELEMENT_TRANSFORMERS, and therefore not of
 *     TRANSFORMERS, which is what the subject passes to the markdown shortcut
 *     registration — so `- [ ] ` fires the UNORDERED_LIST transformer on the
 *     `- ` and leaves "[ ] " as literal text in an ordinary bullet
 *     (checklist.create.structure's measured finding). Check lists are behind
 *     two separate opt-ins that the documented path does not take; the
 *     declared n/a records that as a configuration fact, not an announcer
 *     defect.
 *   - nesting: declared — @lexical/list's model nests (ListItemNode depth) —
 *     but indentGesture is NOT: no keybinding reaches the indent command in
 *     this config ("Neither Tab nor Ctrl+] produced any indentation",
 *     list.nest.structure).
 *   - history: HistoryPlugin is in the getting-started config and works
 *     ("alpha" -> "" -> "alpha") — declared.
 */

import { CANONICAL_GESTURES } from './gestures.mjs'

export default {
  id: 'lexical-stock',
  kind: 'rich',
  // How a container crossing is recognised for this subject (entry-parity.mjs):
  // the selection's ancestor chain gains or loses the container.
  crossing: 'ancestor-chain',
  supports: [
    'realStructure',
    'blockquote',
    'codeblock',
    'bulletList',
    'orderedList',
    'nesting',
    'history',
  ],
  gestures: { ...CANONICAL_GESTURES },
}

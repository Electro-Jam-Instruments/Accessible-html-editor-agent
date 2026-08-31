/**
 * adapters/tiptap.mjs — stock Tiptap StarterKit 3.30.5, the getting-started
 * config, nothing added (subjects/tiptap/build.mjs; measured 2026-08-30).
 *
 * Measured (results.json):
 *   - blockquote, codeblock, bulletList, orderedList: real containers, all
 *     structure clauses green — declared.
 *   - checkList: NOT declared. StarterKit does not include the TaskList /
 *     TaskItem extensions; `- [ ] ` becomes an ordinary bullet with "[ ] " as
 *     literal text (checklist.create.structure's measured finding).
 *   - nesting AND indentGesture declared: Tab genuinely nests a list item
 *     ("depth increased: nested list=true, deepest listitem level=2",
 *     list.nest.structure) and Shift+Tab outdents it — the only rich subject
 *     in the corpus where the primary attempt in the canonical order lands.
 *   - history: StarterKit includes History; undo/redo work ("alpha" -> "" ->
 *     "alpha") — declared.
 */

import { CANONICAL_GESTURES } from './gestures.mjs'

export default {
  id: 'tiptap',
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
    'indentGesture',
    'history',
  ],
  gestures: { ...CANONICAL_GESTURES },
}

/**
 * adapters/lexical-next-max.mjs — the lexical-next build with every announcer
 * opted in (subjects/lexical-next/build.mjs, max profile). The delta against
 * lexical-next is announcements and history, not structure.
 *
 * Measured (results.json):
 *   - Containers as lexical-stock: blockquote, codeblock, bulletList,
 *     orderedList declared; checkList NOT declared (same two missed opt-ins —
 *     the announcer profile does not add CheckListExtension either).
 *   - nesting declared, indentGesture NOT.
 *   - history: declared — HistoryExtension plus HistoryAnnounceExtension are
 *     in this profile; undo/redo move the document and announce ('Undone' /
 *     'Redone' through AriaLiveRegionExtension, the positive control of
 *     history.mjs).
 */

import { CANONICAL_GESTURES } from './gestures.mjs'

export default {
  id: 'lexical-next-max',
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

/**
 * adapters/lexical-next.mjs — Lexical via the new extension API, on a nightly
 * carrying the accessibility-by-default work, strict/minimal opt-in
 * (subjects/lexical-next/build.mjs).
 *
 * Measured (results.json):
 *   - Same container surface as lexical-stock: blockquote, codeblock,
 *     bulletList, orderedList declared; checkList NOT declared
 *     (CheckListExtension exists in @lexical/list but ListExtension does not
 *     depend on it, and this build does not add it — the second of the two
 *     opt-ins the stock config also misses).
 *   - nesting declared, indentGesture NOT (no keybinding in this config).
 *   - history: NOT declared. This strict build carries no history extension:
 *     Ctrl+Z and Ctrl+Shift+Z move nothing ("unchanged by Ctrl+Z: still
 *     \"alpha\"", history.undo.reverted). The gap between this subject and
 *     lexical-next-max is what an integrator has to know to ask for.
 */

import { CANONICAL_GESTURES } from './gestures.mjs'

export default {
  id: 'lexical-next',
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
  ],
  gestures: { ...CANONICAL_GESTURES },
}

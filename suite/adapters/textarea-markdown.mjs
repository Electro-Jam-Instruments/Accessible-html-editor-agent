/**
 * adapters/textarea-markdown.mjs — a textarea with markdown continuation and
 * no announcer (the "before" of the worked example's before/after pair).
 *
 * A flat field: one textbox AX node whose value happens to contain markdown.
 * It continues list and task markers on Enter (measured: bulleted-list.enter
 * and checklist.continue pass by the textual equivalent), but every construct
 * is characters in a string — no realStructure, so no construct capability
 * can be declared. Those textual expressions are measured by the clauses'
 * plain paths (gated on kind), not declared here; see the capability notes in
 * adapters/index.mjs.
 *
 * Measured (results.json):
 *   - list.nest / list.outdent: no attempt changed the caret line's
 *     indentation — no indentGesture.
 *   - history.undo/redo: "alpha" -> "" -> "alpha" — native textarea history
 *     works, so 'history' is declared.
 */

import { CANONICAL_GESTURES } from './gestures.mjs'

export default {
  id: 'textarea-markdown',
  kind: 'plaintext',
  // How a container crossing is recognised for this subject (entry-parity.mjs):
  // a flat field has no ancestor chain, so the strongest equivalent is that
  // the caret's LINE gains the container's markdown marker.
  crossing: 'line-marker',
  supports: ['history'],
  gestures: { ...CANONICAL_GESTURES },
}

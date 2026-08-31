/**
 * adapters/uiw-react-md-editor.mjs — the shipped @uiw/react-md-editor,
 * built locally from frontend/node_modules (subjects/build-uiw-md-editor.mjs).
 *
 * A flat field (the library's editing surface is a textarea): markdown
 * continuation works, structure does not exist. No realStructure, so no
 * construct capability.
 *
 * Measured (results.json):
 *   - list.nest / list.outdent: no attempt changed the caret line's
 *     indentation — no indentGesture (the library's Tab handling moves focus;
 *     see the fairness note in adapters/gestures.mjs).
 *   - history.undo: "alpha" -> "alph" — per-character granularity, but the
 *     document moves, so 'history' is declared (granularity is a SHOULD-level
 *     finding, history.undo.reverted-fully, and stays probed).
 */

import { CANONICAL_GESTURES } from './gestures.mjs'

export default {
  id: 'uiw-react-md-editor',
  kind: 'plaintext',
  // How a container crossing is recognised for this subject (entry-parity.mjs):
  // a flat field has no ancestor chain, so the strongest equivalent is that
  // the caret's LINE gains the container's markdown marker.
  crossing: 'line-marker',
  supports: ['history'],
  gestures: { ...CANONICAL_GESTURES },
}

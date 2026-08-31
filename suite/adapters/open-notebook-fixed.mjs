/**
 * adapters/open-notebook-fixed.mjs — the same editor as it ships in THIS
 * repository: @uiw/react-md-editor wrapped by our MarkdownEditor with the
 * announcer and the hidden overlay (subjects/build-open-notebook.mjs). The
 * pair uiw-react-md-editor -> open-notebook-fixed is the before/after of the
 * worked example, measured rather than asserted.
 *
 * Still a flat field: the announcer and the fixed keybindings change what is
 * said and which gestures work, not what the field can structurally express.
 * No realStructure, so no construct capability.
 *
 * Measured (results.json):
 *   - list.nest: "- beta" -> "  - beta" via Ctrl+] (Tab was deliberately left
 *     to move focus — WCAG 2.1.2; see adapters/gestures.mjs), and
 *     list.outdent reverses it — 'indentGesture' IS declared. This is the
 *     one subject where the Ctrl+] fallback in the canonical attempt order is
 *     the gesture that lands, which is why the fallback exists.
 *   - 'nesting' is NOT declared even though the indent gesture works: the
 *     capability means structural depth (a nested list / aria-level), and
 *     here the "depth" is literally spaces in a string (list.nest.structure's
 *     own caveat). The textual pass is the plain path's to award.
 *   - history.undo: "alpha" -> "alph" — works, per-character; 'history'
 *     declared, granularity stays probed.
 */

import { CANONICAL_GESTURES } from './gestures.mjs'

export default {
  id: 'open-notebook-fixed',
  kind: 'plaintext',
  // How a container crossing is recognised for this subject (entry-parity.mjs):
  // a flat field has no ancestor chain, so the strongest equivalent is that
  // the caret's LINE gains the container's markdown marker.
  crossing: 'line-marker',
  supports: ['history', 'indentGesture'],
  gestures: { ...CANONICAL_GESTURES },
}

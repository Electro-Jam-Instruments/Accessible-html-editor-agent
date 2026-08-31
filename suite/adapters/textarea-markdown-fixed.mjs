/**
 * adapters/textarea-markdown-fixed.mjs — the same textarea with a live-region
 * announcer bolted on.
 *
 * Identical capability surface to textarea-markdown: the announcer changes
 * what is SAID (its E1 list announcement is what makes it the one subject
 * that can exhibit a C-3 parity violation rather than mere silence —
 * entry-parity.mjs), not what the field can structurally do. No
 * realStructure, so no construct capability.
 *
 * Measured (results.json):
 *   - list.nest / list.outdent: no attempt changed the caret line's
 *     indentation — no indentGesture.
 *   - history.undo/redo: works — 'history' declared.
 */

import { CANONICAL_GESTURES } from './gestures.mjs'

export default {
  id: 'textarea-markdown-fixed',
  kind: 'plaintext',
  // How a container crossing is recognised for this subject (entry-parity.mjs):
  // a flat field has no ancestor chain, so the strongest equivalent is that
  // the caret's LINE gains the container's markdown marker.
  crossing: 'line-marker',
  supports: ['history'],
  gestures: { ...CANONICAL_GESTURES },
}

/**
 * adapters/index.mjs — per-subject capability declaration (P0.5 session 3;
 * the design is conformance-suite-design.md, "Editor adapters — the only
 * per-editor code" and "Capability declaration is what makes the comparison
 * fair").
 *
 * One adapter per subject in run.mjs's SUBJECTS table. Each declares:
 *
 *   id, kind    the subject's identity, matching the SUBJECTS row.
 *   supports    the capabilities the subject ACTUALLY HAS, from the fixed
 *               CAPABILITIES set below — derived from the measured corpus
 *               (results.json) and the subject's build notes, never assumed.
 *   gestures    the per-editor operations that used to be hardcoded in clause
 *               code: indent/outdent attempt order, checklist toggle
 *               candidates, container escape keys and bounds, container entry
 *               markers. Canonical definitions live in ./gestures.mjs; an
 *               adapter that diverges does so visibly, in its own file.
 *
 * What a declaration does: where a subject's adapter says a capability is
 * ABSENT, the clause returns the declared-n/a form of "precondition not
 * reached" (mode 'n/a-declared') WITHOUT probing — the verdict is derived
 * from the declaration, not rediscovered by exercising an operation the
 * subject was never built to support. Where the capability is PRESENT,
 * nothing changes: the clause probes exactly as before, so a declaration can
 * never turn a measured failure into a pass. This is the fairness mechanism:
 * an editor that does not implement a construct scores n/a on it, not a
 * probed FAIL dressed up as an announcer defect — and a minimal editor no
 * longer looks worse than a feature-rich one that handles its features badly.
 *
 * What a declaration must NOT do — the discipline, stated once:
 *
 *   - A declared absence must agree with measurement. Every `supports` list
 *     below is justified line-by-line in its adapter file against the
 *     committed results.json. Declaring a capability absent that the subject
 *     has would hide a measurable defect; declaring one present that it
 *     lacks merely restores probing, which is safe.
 *   - A declaration never flips a passing cell. The gates in the contracts
 *     fire only on paths that a capability-less subject cannot pass anyway
 *     (the probed precondition failures); textual-equivalent passes are
 *     governed by the subject's kind, exactly as before.
 *   - An unknown subject (no adapter) declares nothing and is probed
 *     everywhere — the honest default for an unmeasured editor.
 */

import { preconditionNotReached } from '../invariants.mjs'
import { CANONICAL_GESTURES } from './gestures.mjs'

import contenteditable from './contenteditable.mjs'
import textareaMarkdown from './textarea-markdown.mjs'
import textareaMarkdownFixed from './textarea-markdown-fixed.mjs'
import uiwReactMdEditor from './uiw-react-md-editor.mjs'
import openNotebookFixed from './open-notebook-fixed.mjs'
import lexicalStock from './lexical-stock.mjs'
import lexicalNext from './lexical-next.mjs'
import lexicalNextMax from './lexical-next-max.mjs'
import tiptap from './tiptap.mjs'

/**
 * The fixed capability vocabulary. A `supports` entry outside this set is a
 * load-time error, so a typo cannot silently declare nothing.
 *
 *   realStructure  the subject can put structure in the accessibility tree at
 *                  all (a contenteditable region). A flat field (textarea)
 *                  lacks it: its textual equivalents are real markdown and
 *                  real *nothing* in the AX tree, which is why such a subject
 *                  is judged by the clauses' textual paths and can never score
 *                  `discoverable`.
 *   blockquote     `> ` produces a real quotation container.
 *   codeblock      a backtick fence produces a real code block container.
 *   bulletList     `- ` produces a real list with listitems.
 *   orderedList    `1. ` produces a real <ol> and Enter continues it.
 *   checkList      `- [ ] ` produces a real checkable task item (a checkbox
 *                  role with a checked property, or a native input).
 *   nesting        the editor's document model can represent list depth
 *                  structurally (a nested list / aria-level >= 2).
 *   indentGesture  the editor ships a working keyboard gesture that changes
 *                  list depth (any of the canonical attempts in
 *                  ./gestures.mjs). Distinct from `nesting`: Lexical's model
 *                  nests, but none of the harness configs binds a key to it.
 *   history        Ctrl+Z / Ctrl+Shift+Z actually move the document.
 *
 * Construct capabilities describe REAL structure. The markdown textareas'
 * textual expressions ("> sample" as characters) are not capabilities; they
 * are what the clauses' plain paths measure, gated on `kind`, exactly as
 * before this refactor.
 */
export const CAPABILITIES = [
  'realStructure',
  'blockquote',
  'codeblock',
  'bulletList',
  'orderedList',
  'checkList',
  'nesting',
  'indentGesture',
  'history',
]

export const ADAPTERS = [
  contenteditable,
  textareaMarkdown,
  textareaMarkdownFixed,
  uiwReactMdEditor,
  openNotebookFixed,
  lexicalStock,
  lexicalNext,
  lexicalNextMax,
  tiptap,
]

const BY_ID = new Map()
for (const a of ADAPTERS) {
  if (!a.id || !a.kind) throw new Error(`adapter missing id/kind: ${JSON.stringify(a)}`)
  if (BY_ID.has(a.id)) throw new Error(`duplicate adapter id: ${a.id}`)
  for (const cap of a.supports) {
    if (!CAPABILITIES.includes(cap)) {
      throw new Error(`adapter ${a.id} declares unknown capability '${cap}'`)
    }
  }
  if (!a.gestures) throw new Error(`adapter ${a.id} declares no gestures`)
  if (!['ancestor-chain', 'line-marker'].includes(a.crossing)) {
    throw new Error(`adapter ${a.id} declares unknown crossing mode '${a.crossing}'`)
  }
  BY_ID.set(a.id, a)
}

/** The adapter for a subject id, or null for an unknown subject. */
export function adapterFor(subjectId) {
  return BY_ID.get(subjectId) ?? null
}

/**
 * Does this subject declare the capability?
 *
 * Reads the adapter run.mjs threaded onto the subject, falling back to the
 * registry by id, so a clause keeps working even when handed a bare subject
 * record. An unknown subject returns true — declare nothing, probe
 * everything — because "unmeasured" must never be reported as "declared
 * absent".
 */
export function supports(subject, capability) {
  if (!CAPABILITIES.includes(capability)) {
    throw new Error(`unknown capability '${capability}' — see CAPABILITIES in adapters/index.mjs`)
  }
  const a = subject?.adapter ?? adapterFor(subject?.id)
  if (!a) return true
  return a.supports.includes(capability)
}

/**
 * The declared-n/a result: the protocol's "precondition not reached", derived
 * from the adapter's declaration instead of from probing. `mode:
 * 'n/a-declared'` marks the provenance in the cell itself, so a reader of
 * results.json can tell a declared absence from a probed precondition report.
 * pass stays false — a declared absence is still an unsatisfied clause, so
 * outcomes and scenario verdicts are unchanged by the conversion.
 */
export function declaredNA(subject, capability, what) {
  const id = subject?.id ?? 'unknown-subject'
  return preconditionNotReached(
    `NOT APPLICABLE (declared) — the '${id}' adapter does not declare the ` +
      `'${capability}' capability, so ${what}. Derived from the declaration in ` +
      `harness/adapters/${id}.mjs (justified there against the measured corpus), ` +
      `not from probing this run.`,
    { mode: 'n/a-declared' },
  )
}

/**
 * Capability gate: null when the subject declares `capability` (the clause
 * probes as before), the declared-n/a result when it does not. Usage in a
 * clause: `const na = requireCapability(subject, 'checkList', '…'); if (na)
 * return na`.
 */
export function requireCapability(subject, capability, what) {
  return supports(subject, capability) ? null : declaredNA(subject, capability, what)
}

/** The gesture table for a subject id, or the canonical set for an unknown one. */
export { CANONICAL_GESTURES }

export function gesturesFor(subjectId) {
  return adapterFor(subjectId)?.gestures ?? CANONICAL_GESTURES
}

/**
 * How a container crossing is recognised for this subject (entry-parity.mjs):
 * 'ancestor-chain' — the selection's ancestor chain gains the container;
 * 'line-marker' — a flat field's caret line gains the markdown marker. Falls
 * back to the subject's kind for an unknown subject, which is the same
 * dispatch the clause used before the declaration existed.
 */
export function crossingModeFor(subject) {
  const a = subject?.adapter ?? adapterFor(subject?.id)
  if (a) return a.crossing
  return subject?.kind === 'rich' ? 'ancestor-chain' : 'line-marker'
}

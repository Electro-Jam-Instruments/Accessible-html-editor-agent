/**
 * contract.mjs — the assertion format from editor-contract.md.
 *
 * Shape borrowed from W3C ARIA-AT V2, because it is battle-tested and legible
 * to the field:
 *
 *   operation      { id, title, setup, actions, resultState[], announcement[] }
 *   assertion      { assertionId, assertionStatement, assertionPhrase, priority, evaluate }
 *
 * The split between `resultState` and `announcement` is load-bearing, not
 * cosmetic. An editor can build a perfect list structure and say nothing about
 * it (the common case), or announce something it did not actually do. Keeping
 * the two halves separate is the diagnostic.
 *
 * `evaluate(ctx)` receives:
 *   { before, after, subject, driver }
 * where `before`/`after` are driver snapshots and `subject` carries `kind`
 * ('rich' | 'plaintext') so an assertion can express one intent with
 * subject-appropriate checks. It returns:
 *   { pass: boolean, mode?: 'structural' | 'textual-equivalent', detail: string }
 *
 * `mode` is how we stay honest. A plain-markdown textarea cannot express a list
 * in the accessibility tree at all — there is no structure to expose. When such
 * a subject passes by the textual equivalent, the result is recorded as
 * `PASS~` (textual equivalent), never as an unqualified structural pass.
 */

export const MUST = 'MUST'
export const SHOULD = 'SHOULD'
export const MAY = 'MAY'

export const PRIORITY_ORDER = { MUST: 0, SHOULD: 1, MAY: 2 }

/** Declare one assertion. */
export function assertion({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = MUST,
  evaluate,
}) {
  if (!assertionId) throw new Error('assertion requires assertionId')
  if (!assertionStatement) throw new Error(`${assertionId}: requires assertionStatement`)
  if (typeof evaluate !== 'function') throw new Error(`${assertionId}: requires evaluate()`)
  if (!(priority in PRIORITY_ORDER)) throw new Error(`${assertionId}: bad priority ${priority}`)
  return {
    assertionId,
    assertionStatement,
    assertionPhrase: assertionPhrase || assertionStatement.toLowerCase(),
    priority,
    evaluate,
  }
}

/**
 * Declare one operation.
 *
 *   setup   : async (driver) => void   — puts the subject in the precondition.
 *                                        Runs BEFORE the announcement journal is
 *                                        cleared, so setup keystrokes never
 *                                        contaminate announcement assertions.
 *   actions : async (driver) => void   — the operation under test. Real keystrokes only.
 */
export function operation({
  id,
  title,
  precondition,
  operationText,
  setup,
  actions,
  resultState = [],
  announcement = [],
  scenarios = [],
  destructive = false,
}) {
  if (!id) throw new Error('operation requires id')
  // The link back to the corpus. Without it a measured result cannot tick a
  // scenario, and the walk-through has to be hand-maintained - which is how a
  // checklist starts lying about what actually works.
  for (const sid of scenarios) {
    if (!/^CAN-[A-Z0-9]+-\d+$/.test(sid)) {
      throw new Error(`${id}: "${sid}" is not a canonical scenario id`)
    }
  }
  if (typeof actions !== 'function') throw new Error(`${id}: requires actions()`)
  for (const a of [...resultState, ...announcement]) {
    if (!a.assertionId) throw new Error(`${id}: malformed assertion`)
  }
  return {
    id,
    title: title || id,
    precondition: precondition || '',
    operationText: operationText || '',
    scenarios,
    // A destroying vector's correct outcome is that the container is GONE, so
    // "is it findable afterwards" has no answer — there is nothing to find.
    // Without this flag the 2x2 reads a passing result state as "structure is
    // real" and scores a successful destroy as `discoverable`, which is exactly
    // backwards.
    destructive,
    setup: setup || (async () => {}),
    actions,
    resultState,
    announcement,
  }
}

export function contract({ id, title, description, operations }) {
  return { id, title, description, operations }
}

/* ------------------------------------------------------------------ */
/* Helpers shared by contract clauses                                  */
/* ------------------------------------------------------------------ */

/** Does the pruned AX subtree contain `role`, optionally under an ancestor role? */
export function axFind(snapshot, role, { within = null } = {}) {
  const nodes = snapshot.axTree?.nodes || []
  if (!within) return nodes.filter((n) => n.role === role && !n.ignored)
  const out = []
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].role !== within || nodes[i].ignored) continue
    const baseDepth = nodes[i].depth
    for (let j = i + 1; j < nodes.length && nodes[j].depth > baseDepth; j++) {
      if (nodes[j].role === role && !nodes[j].ignored) out.push(nodes[j])
    }
  }
  return out
}

/** Compact one-line rendering of the pruned AX subtree, for failure detail. */
export function axSummary(snapshot, limit = 8) {
  const nodes = (snapshot.axTree?.nodes || []).filter((n) => !n.ignored)
  const parts = nodes.slice(0, limit).map((n) => `${'  '.repeat(n.depth)}${n.role}`)
  const more = nodes.length > limit ? ` …+${nodes.length - limit}` : ''
  return parts.join(' | ').replace(/\s+/g, ' ') + more
}

/** Announcements recorded since the journal was cleared (i.e. by the operation). */
export function announcementsOf(snapshot) {
  return snapshot.announcements || []
}

/** First announcement matching `re`, or null. */
export function matchAnnouncement(snapshot, re) {
  return announcementsOf(snapshot).find((a) => re.test(a.text)) || null
}

export function renderAnnouncements(snapshot) {
  const a = announcementsOf(snapshot)
  if (!a.length) return '(no live-region content emitted)'
  return a.map((x) => `[${x.politeness}] "${x.text}"`).join(' · ')
}

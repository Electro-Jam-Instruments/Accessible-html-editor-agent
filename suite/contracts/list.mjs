/**
 * contracts/list.mjs — the list operations that `bulleted-list.mjs` does not cover.
 *
 * `contracts/bulleted-list.mjs` holds the two entry clauses:
 *   - `bulleted-list.create` (CAN-CB-036)  `- ` + space starts a list
 *   - `bulleted-list.enter`  (CAN-CB-044)  Enter at the end of an item makes the next one
 * Nothing here duplicates or modifies them. This file starts where they stop: once
 * you are IN a list, how do you get out, how do you change depth, and does the
 * editor ever tell you the number you are looking at?
 *
 * Four operations, each a distinct vector from containment-state-machine.md:
 *
 *   list.exit     X1     Enter on an empty item leaves the list        CAN-CB-046
 *   list.nest     depth  Tab increases depth                           CAN-CB-052
 *   list.outdent  depth  Shift+Tab decreases depth                     CAN-CB-053
 *   list.ordered  E1     `1. ` starts an ordered list; Enter continues  CAN-CB-037 (+ CAN-CB-044)
 *
 * Why these four are one file and not four: they share a precondition (the caret
 * is already inside a list) and they share a failure mode. In every one of them
 * the editor performs a structural edit on the user's behalf — removes a marker,
 * changes a level, supplies the next ordinal — and the ARIA vocabulary that could
 * describe the RESULT (`aria-level`, `aria-posinset`) does not exist for the
 * CHANGE. See layered-gap-analysis.md case B3.
 *
 * Why the announcement half matters more here than anywhere else in the corpus:
 * platform-rescue.md, §"editable lists are not containers". NVDA classifies a list
 * it can edit as `PRESCAT_SINGLELINE`, not `PRESCAT_CONTAINER`, and gates
 * "with N items" on `State.READONLY`. If that source read is right, the platform
 * does not rescue an editable list at all — so for these operations an editor
 * announcement is not redundant with correct markup, it is the only route. That
 * makes `discoverable` a weaker verdict here than it is for a heading, and it is
 * why several assertions below check whether the state is even *readable back*
 * (`list.nest.level-exposed`, `list.ordered.number-exposed`) rather than assuming
 * correct HTML implies a reachable fact.
 *
 * Every clause is written to be assertable on the TRANSITION, not just the end
 * state: each MUST assertion inspects `before` as well as `after`, so a subject
 * that never reached the precondition fails with a truthful reason instead of
 * passing because its "after" happens to look like the answer. That is not
 * pedantry — `list.outdent` on a subject where Tab does nothing would otherwise
 * be a guaranteed false PASS, since "not nested" is exactly what outdent produces.
 */

import {
  contract,
  operation,
  assertion,
  MUST,
  SHOULD,
  axFind,
  axSummary,
  matchAnnouncement,
  renderAnnouncements,
} from '../contract.mjs'

/* Invariant predicates (../invariants.mjs): the announcement half of every
 * clause below is announcement-conveys / announcement-refines (C-1's crossing
 * announcement, C-6's "the new depth is named"), and the precondition guards
 * use the shared precondition-not-reached shape. The STRUCTURE half stays
 * bespoke on purpose: each of these four operations proves its precondition
 * from markdown markers and AX levels in a way no other contract repeats
 * (outdent especially — "flat" is also what success looks like, so the guard
 * IS the assertion), so there is no shared shape to lift. */
import {
  preconditionNotReached,
  announcementConveys,
  announcementRefines,
} from '../invariants.mjs'

/* Adapters (../adapters/index.mjs): the per-subject capability declaration
 * and gesture table (P0.5 session 3). Where a subject's adapter declares a
 * capability ABSENT, the gated assertions below return the declared-n/a form
 * of "precondition not reached" WITHOUT probing; where it is present, the
 * probe runs exactly as before, so a declaration can never turn a measured
 * failure into a pass. The depth gestures come from the adapter instead of
 * being hardcoded here. */
import { requireCapability, gesturesFor } from '../adapters/index.mjs'

/** Gate an assertion on a declared capability: absent -> declared n/a. */
const gated = (a, gate) => ({ ...a, evaluate: (ctx) => gate(ctx) ?? a.evaluate(ctx) })

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/*                                                                     */
/* The accepted surface forms live in ../vocabulary.mjs, one entry per  */
/* semantic token, with the fairness decisions recorded there:          */
/*   direction:left+container:list  a bare "list" with no direction, or */
/*                                  a bare direction, does not pass     */
/*   container:orderedlist          an ordinal alone is AMBIGUOUS — the */
/*                                  construct must be named             */
/*   depth / level / position:2     "level" without a number is half a  */
/*                                  message                             */
/* ------------------------------------------------------------------ */

import {
  DIRECTION_LEFT_LIST as CONVEYS_LEFT_LIST,
  DESTINATION_NAMED as CONVEYS_DESTINATION,
  DEPTH_CHANGED as CONVEYS_DEPTH,
  LEVEL_2_LIST as CONVEYS_LEVEL_2,
  LEVEL_1_LIST as CONVEYS_LEVEL_1,
  CONTAINER_ORDEREDLIST as CONVEYS_ORDERED,
  CONTAINER_LISTITEM as CONVEYS_ITEM,
  POSITION_2 as CONVEYS_TWO,
} from '../vocabulary.mjs'

/* ------------------------------------------------------------------ */
/* Snapshot helpers                                                    */
/* ------------------------------------------------------------------ */

/** Lines of the plaintext source, and the one the caret is on. */
function lines(snapshot) {
  return String(snapshot.domText ?? '').split('\n')
}
function lastLine(snapshot) {
  const l = lines(snapshot)
  return l[l.length - 1]
}

/** A markdown list marker at the head of a line, with its leading indent. */
const MARKER = /^([ \t]*)([-*+]|\d+[.)])[ \t]/

/**
 * `aria-level` / hierarchical level for an AX node.
 *
 * The driver's pruned tree flattens `properties` into a plain object
 * (`Object.fromEntries`), but CDP's own shape is an array of
 * `{name, value:{value}}`. Accept both, so this keeps working if the driver's
 * pruning changes and so a `0`/absent level is never silently read as a pass.
 */
function levelOf(node) {
  const p = node?.properties
  if (!p) return null
  if (Array.isArray(p)) return p.find((x) => x.name === 'level')?.value?.value ?? null
  return p.level ?? null
}

function propOf(node, ...names) {
  const p = node?.properties
  if (!p) return null
  for (const n of names) {
    if (Array.isArray(p)) {
      const hit = p.find((x) => x.name === n)
      if (hit) return hit.value?.value ?? null
    } else if (n in p) {
      return p[n]
    }
  }
  return null
}

/** Is there a list nested inside another list? The structural fact of depth 2. */
function hasNestedList(snapshot) {
  return axFind(snapshot, 'list', { within: 'list' }).length > 0
}

/** The deepest level any listitem reports, or null if none reports one. */
function deepestItemLevel(snapshot) {
  const levels = axFind(snapshot, 'listitem')
    .map(levelOf)
    .filter((v) => typeof v === 'number')
  return levels.length ? Math.max(...levels) : null
}

/** Just enough state to see a depth change: the text, and the two ways depth shows. */
function depthSignature(snap) {
  return JSON.stringify({
    text: snap.domText,
    nested: hasNestedList(snap),
    level: deepestItemLevel(snap),
  })
}

/**
 * Perform the editor's change-depth gesture. `sign` is +1 to nest, -1 to outdent.
 *
 * The attempt order comes from the subject's adapter (`gestures.depth`); the
 * canonical order and its rationale — Tab first because CAN-CB-052/053 name
 * it, Ctrl+]/Ctrl+[ as the fallback Word, Google Docs and Open Notebook's own
 * editor use — live in adapters/gestures.mjs, together with the fairness rule
 * that the set is uniform across subjects so the generosity cannot flatter
 * one editor over another. This clause asks whether a depth change is
 * CONVEYED; losing that measurement to a keybinding disagreement would make
 * it measure the wrong thing.
 *
 * The gestures are still EXERCISED on every subject, including one whose
 * adapter declares no 'indentGesture' capability: the declaration decides how
 * the assertions report (declared n/a instead of a probed diagnosis), never
 * what the operation does, so every other cell of the operation is measured
 * on exactly the same document it always was.
 *
 * No timers. Each further attempt is gated on comparing observed state before
 * and after, and `driver.press()` has already settled by the time each
 * signature is read.
 */
async function changeDepth(driver, sign) {
  const g = gesturesFor(driver.subjectMeta?.id).depth
  const attempts = sign > 0 ? g.indent : g.outdent
  const before = depthSignature(await driver.capture())
  for (let i = 0; i < attempts.length; i++) {
    if (i > 0) {
      // The previous attempt may have moved focus out of the field rather
      // than done nothing, in which case the next one would be dispatched at
      // the body and prove nothing. Restore the precondition first:
      // focusEditor() collapses the caret to the end of the content, which is
      // exactly where these operations require it.
      await driver.focusEditor()
    }
    await driver.press(attempts[i])
    if (i === attempts.length - 1) return attempts[i]
    if (depthSignature(await driver.capture()) !== before) return attempts[i]
  }
  return attempts[attempts.length - 1]
}

/**
 * A note on focus, deliberately absent from every detail string below.
 *
 * On several subjects Tab moves focus out of the editing surface instead of
 * indenting — which is a real and interesting behaviour. It is NOT reported
 * here, because it is not stable: headless, with no tab stop after the editor,
 * Chromium's sequential focus navigation lands on `body` on some runs and back
 * on the editor on others, for the same page and the same keystroke. Measured
 * directly, `textarea-markdown-fixed` and `lexical-stock` each flipped between
 * two consecutive trials.
 *
 * A detail string that flips run to run is worse than no detail string: it makes
 * a stable red row look like a flaky one. The stable fact — no indentation was
 * produced — is what these clauses assert on and what they report. Whether the
 * caret also left the document needs a subject with a real focus successor, and
 * belongs to a keyboard-navigation clause rather than a list one.
 */

/** Non-ignored children of the editor root — the blocks the caret can live in. */
function topBlocks(snapshot) {
  return (snapshot.axTree?.nodes || []).filter((n) => !n.ignored && n.depth === 1)
}

/** Does the DOM selection anchor sit on a list item element? */
function anchoredInItem(snapshot) {
  return /^li@/.test(String(snapshot.anchorPath ?? ''))
}

/** One-line dump of every AX node that carries a name, for failure detail. */
function axNames(snapshot, limit = 10) {
  const named = (snapshot.axTree?.nodes || [])
    .filter((n) => !n.ignored && (n.name || n.value))
    .slice(0, limit)
    .map((n) => `${n.role}:${JSON.stringify(n.name ?? n.value)}`)
  return named.length ? named.join(' ') : '(no named AX nodes)'
}

/* ================================================================== */
/* Clause 1 — exit: Enter on an empty item leaves the list  (CAN-CB-046)
/* ================================================================== */

const exitStructure = assertion({
  assertionId: 'list.exit.structure',
  assertionStatement: 'The list ends: the empty item is gone and the caret is in a block outside the list.',
  assertionPhrase: 'leave the list',
  priority: MUST,
  evaluate: ({ before, after, subject }) => {
    if (subject.kind === 'rich') {
      // Declared, not probed: a rich subject whose adapter declares no
      // bulletList capability never builds the list this exit is supposed to
      // leave, so X1 is n/a by declaration. The plain path below is NOT
      // gated — a flat field's textual exit is a genuine measurement.
      const na = requireCapability(
        subject,
        'bulletList',
        'the subject never builds a list for X1 to exit',
      )
      if (na) return na
      const itemsBefore = axFind(before, 'listitem').length
      if (itemsBefore < 2) {
        // Not a false negative on exit — the subject never built the list the
        // exit is supposed to leave, so there is nothing to measure here.
        return preconditionNotReached(
          `expected 2 listitems before the operation (one with ` +
            `"alpha", one empty), found ${itemsBefore}. The subject never entered a list, so ` +
            `X1 cannot be exercised. before subtree: ${axSummary(before)}`,
        )
      }
      const itemsAfter = axFind(after, 'listitem').length
      const outsideBlock = topBlocks(after).some((n) => n.role !== 'list')
      const stillInItem = anchoredInItem(after)
      const ok = itemsAfter === itemsBefore - 1 && outsideBlock && !stillInItem
      return {
        pass: ok,
        mode: 'structural',
        detail: ok
          ? `the empty item was consumed (${itemsBefore} -> ${itemsAfter} listitems) and a ` +
            `non-list block exists outside it for the caret (anchor ${JSON.stringify(after.anchorPath)})`
          : `listitems ${itemsBefore} -> ${itemsAfter}; block outside the list=${outsideBlock}; ` +
            `caret still anchored on an <li>=${stillInItem}. The canonical escape hatch did not ` +
            `fire. subtree: ${axSummary(after)}`,
      }
    }

    // Plaintext. There is no list to leave, structurally — but the SOURCE has a
    // marker and the exit is expressible in it: the marker on the caret's line
    // must go away and the earlier item must survive.
    const before10 = lastLine(before)
    if (!MARKER.test(before10) || before10.replace(MARKER, '').length !== 0) {
      return preconditionNotReached(
        `the caret's line was ${JSON.stringify(before10)}, which is ` +
          `not an EMPTY marked item, so this is not the X1 case. Full text before: ` +
          `${JSON.stringify(before.domText)}`,
        { mode: 'textual-equivalent' },
      )
    }
    const after10 = lastLine(after)
    const firstIntact = lines(after)[0] === '- alpha'
    const markerGone = !MARKER.test(after10)
    const ok = firstIntact && markerGone
    return {
      pass: ok,
      mode: 'textual-equivalent',
      detail: ok
        ? `the marker on the caret's line was removed and "- alpha" survives; text is ` +
          `${JSON.stringify(after.domText)}. NOTE: nothing in the accessibility tree ever said ` +
          `"list", so nothing says "out of list" either — this is a pass on intent only.`
        : `expected the marker on the caret's line to be removed; text is ` +
          `${JSON.stringify(after.domText)} (caret line ${JSON.stringify(after10)}). ` +
          `A list with no exit is unbounded: every Enter supplies another marker and the user ` +
          `has no keystroke that ends it.`,
    }
  },
})

const exitCaret = assertion({
  assertionId: 'list.exit.caret',
  assertionStatement: 'The caret is collapsed in the block the user has landed in.',
  assertionPhrase: 'place the caret outside the list',
  priority: SHOULD,
  evaluate: ({ after, subject }) => {
    const collapsed = !!after.caret && after.caret.start === after.caret.end
    if (subject.kind === 'rich') {
      return {
        pass: collapsed && !anchoredInItem(after),
        mode: 'structural',
        detail: `caret ${JSON.stringify(after.caret)}, anchor ${JSON.stringify(after.anchorPath)}` +
          (anchoredInItem(after) ? ' — still inside a list item' : ''),
      }
    }
    const expected = String(after.domText ?? '').length
    const atEnd = collapsed && after.caret.start === expected
    return {
      pass: atEnd,
      mode: 'textual-equivalent',
      detail: `caret ${JSON.stringify(after.caret)}; expected collapsed at ${expected} ` +
        `(end of ${JSON.stringify(after.domText)})`,
    }
  },
})

const exitAnnounced = announcementConveys({
  assertionId: 'list.exit.announcement',
  assertionStatement: 'An announcement conveys that the list has ended.',
  assertionPhrase: 'announce leaving the list',
  priority: MUST,
  token: CONVEYS_LEFT_LIST,
  missDetail: (after) =>
    'nothing announced the crossing. This is the one list vector the platform is least ' +
    'likely to cover: per platform-rescue.md an EDITABLE list is classified ' +
    'PRESCAT_SINGLELINE by NVDA rather than PRESCAT_CONTAINER, which is what supplies ' +
    '"out of list" on a read-only page. If that source read holds, the user is not told ' +
    'now and will not be told later. observed: ' + renderAnnouncements(after),
})

const exitDestinationAnnounced = announcementRefines({
  assertionId: 'list.exit.announcement-destination',
  assertionStatement: 'The announcement says what the caret is now in, not only what it left.',
  assertionPhrase: 'name what the caret is now in',
  priority: SHOULD,
  anchor: CONVEYS_LEFT_LIST,
  refine: CONVEYS_DESTINATION,
  okDetail: (hit) => `names the destination: ${JSON.stringify(hit.text)}`,
  missDetail: (hit) =>
    `${JSON.stringify(hit.text)} says what was left and not what was entered. Half a ` +
    `containment stack is not a containment stack: the user knows they moved and not where to.`,
})

/* ================================================================== */
/* Clause 2 — nest: Tab increases depth  (CAN-CB-052)
/* ================================================================== */

/* Both depth clauses are gated on the 'indentGesture' capability, whatever
 * the subject's kind: a subject whose adapter declares no working depth
 * gesture cannot exercise CAN-CB-052/053 at any layer, and probing it again
 * every run would rediscover the declaration. The gestures are still pressed
 * (see changeDepth), so the ungated cells of these operations measure the
 * same document as before. */
const nestGate = ({ subject }) =>
  requireCapability(
    subject,
    'indentGesture',
    'no gesture changes list depth in this subject and CAN-CB-052 cannot be exercised',
  )

const outdentGate = ({ subject }) =>
  requireCapability(
    subject,
    'indentGesture',
    'no gesture changes list depth in this subject, so nothing nested the item ' +
      'during setup and there is nothing for CAN-CB-053 to outdent',
  )

const nestStructure = assertion({
  assertionId: 'list.nest.structure',
  assertionStatement: 'The item is now one level deeper, and the depth is expressed in the tree.',
  assertionPhrase: 'nest the item one level deeper',
  priority: MUST,
  evaluate: ({ before, after, subject }) => {
    if (subject.kind === 'rich') {
      if (hasNestedList(before)) {
        return preconditionNotReached(
          `the list was already nested before Tab. ` +
            `before subtree: ${axSummary(before)}`,
        )
      }
      const nested = hasNestedList(after)
      const level = deepestItemLevel(after)
      const ok = nested || (typeof level === 'number' && level >= 2)
      return {
        pass: ok,
        mode: 'structural',
        detail: ok
          ? `depth increased: nested list=${nested}, deepest listitem level=${level ?? 'not exposed'}`
          : `no depth change. nested list=${nested}, deepest listitem level=` +
            `${level ?? 'not exposed'}. Neither Tab nor Ctrl+] produced any indentation. ` +
            `subtree: ${axSummary(after)}`,
      }
    }

    // Plaintext: nesting is expressible only as leading whitespace on the source
    // line. That is a real markdown nesting and a real *nothing* in the AX tree.
    const beforeLine = lastLine(before)
    if (!MARKER.test(beforeLine)) {
      return preconditionNotReached(
        `the caret's line ${JSON.stringify(beforeLine)} is not ` +
          `a list item, so there is nothing to indent.`,
        { mode: 'textual-equivalent' },
      )
    }
    const beforeIndent = MARKER.exec(beforeLine)[1].length
    const afterLine = lastLine(after)
    const m = MARKER.exec(afterLine)
    const ok = !!m && m[1].length > beforeIndent && afterLine.replace(MARKER, '') === 'beta'
    return {
      pass: ok,
      mode: 'textual-equivalent',
      detail: ok
        ? `the caret's line went from ${JSON.stringify(beforeLine)} to ${JSON.stringify(afterLine)} — ` +
          `indented markdown that renders as a sub-list elsewhere. NOTE: there is no aria-level, ` +
          `no nested list role and no depth anywhere in the accessibility tree; the "depth" is ` +
          `literally spaces in a string. Pass on intent only.`
        : `expected the caret's line to gain indentation and keep "beta"; it is ` +
          `${JSON.stringify(afterLine)} (was ${JSON.stringify(beforeLine)}). ` +
          `full text: ${JSON.stringify(after.domText)}`,
    }
  },
})

const nestLevelExposed = assertion({
  assertionId: 'list.nest.level-exposed',
  assertionStatement: 'The new depth is readable back from the accessibility tree.',
  assertionPhrase: 'expose the new level in the accessibility tree',
  priority: SHOULD,
  evaluate: ({ after, subject }) => {
    // Deliberately separate from the structural assertion. "The user finds out
    // when they navigate back" (the `discoverable` outcome) is only true if the
    // level is actually THERE to be found. This is the assertion that decides it.
    const level = deepestItemLevel(after)
    if (typeof level === 'number' && level >= 2) {
      return {
        pass: true,
        mode: subject.kind === 'rich' ? 'structural' : 'textual-equivalent',
        detail: `a listitem reports level ${level}`,
      }
    }
    if (subject.kind !== 'rich') {
      return {
        pass: false,
        mode: 'textual-equivalent',
        detail: 'a textarea exposes one textbox node; there is no listitem to carry a level, at ' +
          'any depth, ever. The indentation is invisible to the accessibility tree.',
      }
    }
    if (typeof level === 'number') {
      return {
        pass: false,
        mode: 'structural',
        detail:
          `listitems DO report a level — Chromium computes a hierarchical level for a listitem ` +
          `from its ancestry, with no aria-level in the markup — but the deepest is still ` +
          `${level}${hasNestedList(after) ? ' despite a genuinely nested list in the DOM' : ', because the item never nested'}. ` +
          `The level is re-readable; it just does not say what this operation was supposed to change it to. ` +
          `named AX nodes: ${axNames(after)}`,
      }
    }
    return {
      pass: false,
      mode: 'structural',
      detail:
        `no listitem reports a level at all${hasNestedList(after) ? ', although the list IS genuinely nested in the DOM' : ''}. ` +
        `The depth is therefore not announced (see .announcement) AND not re-readable, so ` +
        `"discoverable" would overstate it. named AX nodes: ${axNames(after)}`,
    }
  },
})

const nestAnnounced = announcementConveys({
  assertionId: 'list.nest.announcement',
  assertionStatement: 'An announcement conveys that the depth changed.',
  assertionPhrase: 'announce the depth change',
  priority: MUST,
  token: CONVEYS_DEPTH,
  missDetail: (after) =>
    'the depth changed silently. Chromium computes HIERARCHICAL_LEVEL_CHANGED and drops it ' +
    'on Mac and Linux (platform-api-mapping.md), and ARIA has no vocabulary for a level ' +
    'CHANGE at all — only aria-level for the resulting state. observed: ' +
    renderAnnouncements(after),
})

const nestLevelAnnounced = announcementRefines({
  assertionId: 'list.nest.announcement-level',
  assertionStatement: 'The announcement names the new depth.',
  assertionPhrase: 'name the new depth',
  priority: SHOULD,
  anchor: CONVEYS_DEPTH,
  refine: CONVEYS_LEVEL_2,
  okDetail: (hit) => `names the new depth: ${JSON.stringify(hit.text)}`,
  missDetail: (hit) =>
    `${JSON.stringify(hit.text)} says the depth changed but not to what. "indented" without ` +
    `a number leaves the user counting keystrokes.`,
})

/* ================================================================== */
/* Clause 3 — outdent: Shift+Tab decreases depth  (CAN-CB-053)
/* ================================================================== */

const outdentStructure = assertion({
  assertionId: 'list.outdent.structure',
  assertionStatement: 'The item returns to the shallower level it came from.',
  assertionPhrase: 'outdent the item one level',
  priority: MUST,
  evaluate: ({ before, after, subject }) => {
    if (subject.kind === 'rich') {
      const wasNested = hasNestedList(before)
      const beforeLevel = deepestItemLevel(before)
      if (!wasNested && !(typeof beforeLevel === 'number' && beforeLevel >= 2)) {
        // The trap this whole clause is written around. "Not nested" is exactly
        // what a successful outdent looks like, so a subject that never nested
        // would PASS an end-state-only check. It must not.
        return preconditionNotReached(
          'no indent gesture nested the item during setup, so there ' +
            'was nothing to outdent (see list.nest). Reporting this as a failure rather than as a ' +
            'pass is deliberate: "flat" is also what success looks like, so an end-state-only ' +
            `check here would be a false PASS. before subtree: ${axSummary(before)}`,
        )
      }
      const stillNested = hasNestedList(after)
      const afterLevel = deepestItemLevel(after)
      const shallower = !stillNested || (typeof afterLevel === 'number' && afterLevel < (beforeLevel ?? 2))
      return {
        pass: shallower,
        mode: 'structural',
        detail: shallower
          ? `depth decreased: nested=${wasNested}->${stillNested}, level=` +
            `${beforeLevel ?? 'n/a'}->${afterLevel ?? 'n/a'}`
          : `still nested after Shift+Tab: nested=${stillNested}, level=${afterLevel ?? 'n/a'}. ` +
            `subtree: ${axSummary(after)}`,
      }
    }

    const beforeLine = lastLine(before)
    const bm = MARKER.exec(beforeLine)
    if (!bm || bm[1].length === 0) {
      return preconditionNotReached(
        `the caret's line ${JSON.stringify(beforeLine)} carries no ` +
          `indentation, so no indent gesture nested it and there is nothing to outdent (see ` +
          `list.nest). ` +
          `An un-indented line is ALSO what a correct outdent produces, so passing this would be ` +
          `a false PASS.`,
        { mode: 'textual-equivalent' },
      )
    }
    const afterLine = lastLine(after)
    const am = MARKER.exec(afterLine)
    const ok = !!am && am[1].length < bm[1].length && afterLine.replace(MARKER, '') === 'beta'
    return {
      pass: ok,
      mode: 'textual-equivalent',
      detail: ok
        ? `indentation decreased: ${JSON.stringify(beforeLine)} -> ${JSON.stringify(afterLine)}`
        : `expected less indentation on the caret's line; it is ${JSON.stringify(afterLine)} ` +
          `(was ${JSON.stringify(beforeLine)}). full text: ${JSON.stringify(after.domText)}`,
    }
  },
})

const outdentKeepsItem = assertion({
  assertionId: 'list.outdent.content',
  assertionStatement: 'The item keeps its text and is still a list item after the outdent.',
  assertionPhrase: 'keep the item and its content',
  priority: SHOULD,
  evaluate: ({ before, after, subject }) => {
    // Preservation across a no-op is not the same claim as preservation across
    // an outdent, and a green cell must not imply the second when only the
    // first happened. Say which one this is.
    const moved =
      subject.kind === 'rich'
        ? hasNestedList(before) !== hasNestedList(after) ||
          deepestItemLevel(before) !== deepestItemLevel(after)
        : (MARKER.exec(lastLine(before))?.[1]?.length ?? -1) !==
          (MARKER.exec(lastLine(after))?.[1]?.length ?? -1)
    const caveat = moved ? '' : ' NOTE: the depth did not change, so this is preservation across a no-op.'

    if (subject.kind === 'rich') {
      const items = axFind(after, 'listitem')
      const hasBeta = String(after.domText ?? '').includes('beta')
      const ok = items.length >= 2 && hasBeta
      return {
        pass: ok,
        mode: 'structural',
        detail: ok
          ? `${items.length} listitems, text ${JSON.stringify(after.domText)}.${caveat}`
          : `expected the outdented item to remain a list item alongside "alpha"; found ` +
            `${items.length} listitem(s), text ${JSON.stringify(after.domText)}. Outdent that ` +
            `lifts the item OUT of the list is a different fact from outdent that changes its ` +
            `level, and the two need announcing differently.`,
      }
    }
    const ok = lastLine(after).replace(MARKER, '') === 'beta' && MARKER.test(lastLine(after))
    return {
      pass: ok,
      mode: 'textual-equivalent',
      detail: ok
        ? `the caret's line is still a marked item containing "beta".${caveat}`
        : `the caret's line is ${JSON.stringify(lastLine(after))}`,
    }
  },
})

const outdentAnnounced = announcementConveys({
  assertionId: 'list.outdent.announcement',
  assertionStatement: 'An announcement conveys that the depth changed.',
  assertionPhrase: 'announce the depth change',
  priority: MUST,
  token: CONVEYS_DEPTH,
  missDetail: (after) =>
    'the depth changed silently in the other direction. Note that Tab and Shift+Tab are the ' +
    'same state change with opposite signs, so an editor that announces one and not the ' +
    'other is worse than one that announces neither (invariant C-3). observed: ' +
    renderAnnouncements(after),
})

const outdentLevelAnnounced = announcementRefines({
  assertionId: 'list.outdent.announcement-level',
  assertionStatement: 'The announcement names the depth the item is now at.',
  assertionPhrase: 'name the new depth',
  priority: SHOULD,
  anchor: CONVEYS_DEPTH,
  refine: CONVEYS_LEVEL_1,
  okDetail: (hit) => `names the new depth: ${JSON.stringify(hit.text)}`,
  missDetail: (hit) =>
    `${JSON.stringify(hit.text)} does not say which level the item is now at. At level 1 ` +
    `the next Shift+Tab may leave the list entirely, so the number is what tells the user ` +
    `what their next keystroke will do.`,
})

/* ================================================================== */
/* Clause 4 — ordered: `1. ` starts one, Enter supplies the next number
/*             (CAN-CB-037, and CAN-CB-044 for the continuation)
/* ================================================================== */

const orderedStructure = assertion({
  assertionId: 'list.ordered.structure',
  assertionStatement: 'An ordered list with two items exists, the second one supplied by Enter.',
  assertionPhrase: 'create an ordered list and continue it',
  priority: MUST,
  evaluate: ({ after, subject }) => {
    if (subject.kind === 'rich') {
      // Declared, not probed; the plain path below stays a real measurement.
      const na = requireCapability(
        subject,
        'orderedList',
        'the subject never turns "1. " into an ordered list for E1 to create',
      )
      if (na) return na
      const items = axFind(after, 'listitem', { within: 'list' })
      // <ul> and <ol> are BOTH role=list in Chromium's AX tree, so "ordered" is
      // not a fact the accessibility tree carries at all. The only place it
      // survives is the DOM.
      const ol = /<ol[\s>]/i.test(String(after.domHtml ?? ''))
      const ok = ol && items.length >= 2
      return {
        pass: ok,
        mode: 'structural',
        detail: ok
          ? `<ol> with ${items.length} listitems. NOTE: the AX role of an <ol> is "list", exactly ` +
            `like a <ul> — orderedness is a DOM fact, not an accessibility-tree fact.`
          : `expected an <ol> with >=2 listitems; ol=${ol}, listitems=${items.length}. ` +
            `subtree: ${axSummary(after)} text=${JSON.stringify(after.domText)}`,
      }
    }
    const ok = after.domText === '1. alpha\n2. '
    return {
      pass: ok,
      mode: 'textual-equivalent',
      detail: ok
        ? 'source text is "1. alpha\\n2. " — the editor parsed the ordinal, incremented it and ' +
          'inserted "2. " on the user\'s behalf. Four characters the user did not type and was ' +
          'not told about; the number is correct and unspoken.'
        : `expected "1. alpha\\n2. ", got ${JSON.stringify(after.domText)}`,
    }
  },
})

const orderedNumberExposed = assertion({
  assertionId: 'list.ordered.number-exposed',
  assertionStatement: 'The second item\'s ordinal is readable back from the accessibility tree.',
  assertionPhrase: 'expose the item number in the accessibility tree',
  priority: SHOULD,
  evaluate: ({ after, subject }) => {
    const items = axFind(after, 'listitem')
    const withPos = items
      .map((n) => propOf(n, 'posInSet', 'posinset'))
      .filter((v) => v !== null && v !== undefined)
    if (withPos.includes(2) || withPos.includes('2')) {
      return { pass: true, mode: 'structural', detail: `a listitem reports posInSet=2` }
    }
    // Chromium surfaces the CSS-generated `::marker` of an <ol> as its own
    // `ListMarker` AX node with the counter as its accessible name. That is a
    // genuine exposure and a weaker one than posInSet: it is text beside the
    // item, not a stated position in a set, so nothing derives "of N" from it
    // and nothing re-bases it when the list is renumbered.
    const marker = (after.axTree?.nodes || []).find(
      (n) => !n.ignored && n.role === 'ListMarker' && CONVEYS_TWO.test(String(n.name ?? '')),
    )
    if (marker) {
      return {
        pass: true,
        mode: 'structural',
        detail:
          `the ordinal is exposed as a ListMarker node named ${JSON.stringify(marker.name)} — ` +
          `Chromium surfaces the CSS counter as text. No listitem carries posInSet, so the ` +
          `number is readable but the POSITION is not stated: nothing supplies "2 of N".`,
      }
    }
    if (subject.kind !== 'rich') {
      // In a markdown textarea "2. " is literally part of the document the user
      // is editing. It is readable, but only in the way any other characters are.
      const ok = /(^|\n)2[.)]\s?/.test(String(after.domText ?? ''))
      return {
        pass: ok,
        mode: 'textual-equivalent',
        detail: ok
          ? 'the ordinal is readable — as literal source characters inside the textbox value, ' +
            'which a screen reader reads as content on the line, never as this item\'s position ' +
            'in a list. There is no listitem, no posInSet and no set to be in. Pass on intent only.'
          : `no ordinal in the source text ${JSON.stringify(after.domText)}`,
      }
    }
    return {
      pass: false,
      mode: 'structural',
      detail:
        'the number "2" is nowhere in the accessibility tree: no posInSet on any listitem, no ' +
        'ListMarker node carrying the counter. An <ol> marker is a CSS-generated counter, so ' +
        'unless the browser surfaces it the visible number is not text and is not exposed. ' +
        "Combined with platform-rescue.md's finding that an EDITABLE list is not given container " +
        'treatment (no "with N items"), the ordinal would then be neither announced nor ' +
        `re-readable — "discoverable" is false for this fact. named AX nodes: ${axNames(after)}`,
    }
  },
})

const orderedAnnounced = announcementConveys({
  assertionId: 'list.ordered.announcement',
  assertionStatement: 'An announcement conveys that this is an ordered list.',
  assertionPhrase: 'announce that an ordered list is in play',
  priority: MUST,
  token: CONVEYS_ORDERED,
  missDetail: (after) => {
    const anyItem = matchAnnouncement(after, CONVEYS_ITEM)
    return anyItem
      ? `${JSON.stringify(anyItem.text)} never names the construct. This is not a wording nit: ` +
        `an ordinal alone is AMBIGUOUS, because "item 2" / "number 2" is also exactly what a ` +
        `position announcement in a BULLETED list says. Heard once, with no second string to ` +
        `contrast it against, the user cannot tell whether the editor is numbering their ` +
        `document or merely counting it — and that decides what their next Enter produces.`
      : `nothing announced. observed: ${renderAnnouncements(after)}`
  },
})

const orderedNumberAnnounced = announcementConveys({
  assertionId: 'list.ordered.announcement-number',
  assertionStatement: 'The announcement names the number the editor supplied.',
  assertionPhrase: 'announce the next number',
  priority: MUST,
  // A compound token: the announcement must both read as a list item and name
  // "2" — see container:orderedlist in the vocabulary for why a bare ordinal
  // is never credited on its own.
  token: (a) => CONVEYS_ITEM.test(a.text) && CONVEYS_TWO.test(a.text),
  missDetail: (after) => {
    const anyItem = matchAnnouncement(after, CONVEYS_ITEM)
    return (
      'the ordinal is the ONE fact an ordered list has that a bulleted list does not, and it ' +
      'is the fact the editor computed and inserted. ' +
      (anyItem
        ? `The announcement ${JSON.stringify(anyItem.text)} omits it.`
        : 'Nothing was announced at all.') +
      ` observed: ${renderAnnouncements(after)}`
    )
  },
})

/* ================================================================== */

export default contract({
  id: 'list',
  title: 'List exit, depth and ordering',
  description:
    'The list operations beyond creating and continuing one (those are in ' +
    'contracts/bulleted-list.mjs). Each of these has the editor perform a structural ' +
    'edit the user did not type — removing a marker, changing a level, supplying the ' +
    'next ordinal — and in each case ARIA can describe the resulting state but has no ' +
    'vocabulary for the change. Per platform-rescue.md an editable list may not even ' +
    'get container treatment from the AT, so several clauses also check whether the ' +
    'resulting state is readable back at all.',
  operations: [
    operation({
      id: 'list.exit',
      // CAN-CB-046 — "Enter on an empty item leaves the list" (vector X1).
      scenarios: ['CAN-CB-046'],
      title: 'Press Enter on an empty list item',
      precondition:
        'The editor contains one item "alpha" and a second, empty item; the caret is in the empty item.',
      operationText: 'Press Enter.',
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type('- alpha')
        await driver.press('Enter')
      },
      actions: async (driver) => {
        await driver.press('Enter')
      },
      resultState: [exitStructure, exitCaret],
      announcement: [exitAnnounced, exitDestinationAnnounced],
    }),

    operation({
      id: 'list.nest',
      // CAN-CB-052 — "Tab nests the list item one level deeper".
      scenarios: ['CAN-CB-052'],
      title: 'Indent a second list item',
      precondition:
        'The editor contains "alpha" and "beta" as two top-level items; the caret is at the end of "beta".',
      operationText: "Press Tab; if Tab changes nothing, press Ctrl+] as well.",
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type('- alpha')
        await driver.press('Enter')
        await driver.type('beta')
      },
      actions: async (driver) => {
        await changeDepth(driver, +1)
      },
      resultState: [gated(nestStructure, nestGate), nestLevelExposed],
      announcement: [nestAnnounced, nestLevelAnnounced],
    }),

    operation({
      id: 'list.outdent',
      // CAN-CB-053 — "Shift+Tab outdents the list item".
      scenarios: ['CAN-CB-053'],
      title: 'Outdent a nested list item',
      precondition:
        'The item "beta" has been nested under "alpha" by the editor\'s indent gesture; the caret is at the end of "beta".',
      operationText: "Press Shift+Tab; if Shift+Tab changes nothing, press Ctrl+[ as well.",
      // The nesting is produced by the same gesture a user would use, not
      // injected, so a subject with no indent gesture at all reaches the
      // operation WITHOUT the precondition — which the assertions detect and
      // report, rather than crediting the resulting flat list as a successful
      // outdent.
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type('- alpha')
        await driver.press('Enter')
        await driver.type('beta')
        await changeDepth(driver, +1)
      },
      actions: async (driver) => {
        await changeDepth(driver, -1)
      },
      resultState: [gated(outdentStructure, outdentGate), outdentKeepsItem],
      announcement: [outdentAnnounced, outdentLevelAnnounced],
    }),

    operation({
      id: 'list.ordered',
      // CAN-CB-037 — "`1. ` + space becomes an ordered list" (vector E1).
      // CAN-CB-044 — "Enter at the end of an item creates the next item" is the
      // only canonical row for the continuation; there is no ordered-specific
      // one, and its payload `position:MofN` is exactly the ordinal this clause
      // asserts on. Its note already records that "the ordinal is never spoken
      // by any editor" — this clause measures that claim instead of citing it.
      scenarios: ['CAN-CB-037', 'CAN-CB-044'],
      title: 'Type "1. alpha" then press Enter',
      precondition: 'The editor is focused and empty; the caret is at offset 0.',
      operationText: 'Type "1", ".", Space, "alpha", then press Enter.',
      setup: async (driver) => {
        await driver.focusEditor()
      },
      actions: async (driver) => {
        await driver.type('1')
        await driver.type('.')
        await driver.type(' ')
        await driver.type('alpha')
        await driver.press('Enter')
      },
      resultState: [orderedStructure, orderedNumberExposed],
      announcement: [orderedAnnounced, orderedNumberAnnounced],
    }),
  ],
})

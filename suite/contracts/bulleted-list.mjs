/**
 * contracts/bulleted-list.mjs — the first two clauses of the editor contract.
 *
 * Clause 1: at the start of an empty line, type `-` then space.
 * Clause 2: with the caret at the end of a non-empty list item, press Enter.
 *
 * Each clause is split into resultState (assertable from the AX tree / DOM /
 * caret) and announcement (assertable from live-region content). Every subject
 * is expected to pass some of the first half; almost none pass the second. That
 * asymmetry is the finding the whole harness exists to produce.
 */

import {
  contract,
  operation,
  assertion,
  MUST,
  SHOULD,
  axFind,
  axSummary,
  renderAnnouncements,
} from '../contract.mjs'

/* Invariant predicates: the assertion shapes live in ../invariants.mjs (C-1
 * structure and announcement halves with the exactly-once and politeness
 * refinements, A-1/A-2, and the position refinement). */
import {
  containerCreated,
  announcementConveys,
  announcedOnce,
  announcedPolitely,
  announcementRefines,
} from '../invariants.mjs'

/* Vocabulary: accepted surface forms live in ../vocabulary.mjs, one entry
 * per semantic token. Deliberately generous: we are testing whether ANYTHING
 * was said, not whether the wording matches a house style. */
import {
  CONTAINER_LIST_STARTED as CONVEYS_LIST_START,
  CONTAINER_LISTITEM as CONVEYS_NEW_ITEM,
  POSITION_2_ITEM,
} from '../vocabulary.mjs'

/* Adapters (../adapters/index.mjs): the per-subject capability declaration
 * (P0.5 session 3). A rich subject whose adapter declares no 'bulletList'
 * capability never turns "- " into a list, so its rich-path assertions are
 * n/a by declaration instead of being re-probed each run; the plain
 * (textual-equivalent) paths are never gated. */
import { requireCapability } from '../adapters/index.mjs'

const richListGate = (subject, what) => requireCapability(subject, 'bulletList', what)

/* ------------------------------------------------------------------ */
/* Clause 1 — creating a bulleted list                                 */
/* ------------------------------------------------------------------ */

const listCreated = containerCreated({
  assertionId: 'bulleted-list.create.structure',
  assertionStatement: 'A bulleted list structure containing one item is conveyed.',
  assertionPhrase: 'convey a bulleted list with one item',
  priority: MUST,
  rich: ({ after, subject }) => {
    // Declared, not probed, for a subject with no list transform at all.
    const na = richListGate(subject, 'typing "- " never produces a list in this subject')
    if (na) return na
    // A rich editor has an accessibility tree to put structure in, so the
    // only acceptable evidence is structure in that tree.
    const lists = axFind(after, 'list')
    const items = axFind(after, 'listitem', { within: 'list' })
    if (lists.length >= 1 && items.length >= 1) {
      return {
        pass: true,
        detail: `AX tree exposes list -> listitem (${lists.length} list, ${items.length} listitem)`,
      }
    }
    return {
      pass: false,
      detail:
        `no list/listitem in the editor's AX subtree; text is ${JSON.stringify(after.domText)}. ` +
        `subtree: ${axSummary(after)}`,
    }
  },
  // A plain-markdown textarea has exactly one AX node — a textbox with a
  // string value. It CANNOT express a list structurally; there is nowhere to
  // put it. The subject-appropriate equivalent is that the source text now
  // carries the marker and the caret sits after it, ready for content — which
  // also checks the caret, so this contract supplies the whole plain branch
  // rather than the factory's uniform text-equality one.
  plain: ({ after }) => {
    const structural = axFind(after, 'listitem').length > 0
    if (structural) {
      return { pass: true, mode: 'structural', detail: 'unexpectedly exposes listitem' }
    }
    const textOk = after.domText === '- '
    const caretOk = after.caret && after.caret.start === 2 && after.caret.end === 2
    if (textOk && caretOk) {
      return {
        pass: true,
        mode: 'textual-equivalent',
        detail:
          'source text is "- " with caret at offset 2. NOTE: nothing in the accessibility ' +
          'tree says "list" — the editor exposes one textbox whose value happens to start ' +
          'with a hyphen. A screen reader has no list to enter, no item count, and no ' +
          'level. This is a pass on intent only.',
      }
    }
    return {
      pass: false,
      mode: 'textual-equivalent',
      detail: `expected text "- " with caret 2; got ${JSON.stringify(after.domText)} caret ${JSON.stringify(after.caret)}`,
    }
  },
})

// Caret-placement assertions are not a shared invariant: the conformance-suite
// invariants (C-1…C-8) are about containment and announcement, and the caret
// checks below are per-operation offset arithmetic with no repeated shape
// across contracts. They stay bespoke.
const caretInItem = assertion({
  assertionId: 'bulleted-list.create.caret',
  assertionStatement: 'The caret is positioned to type the content of the first item.',
  assertionPhrase: 'place the caret in the first list item',
  priority: SHOULD,
  evaluate: ({ after, subject }) => {
    if (subject.kind === 'rich') {
      const na = richListGate(subject, 'no list item exists for the caret to sit in')
      if (na) return na
      const items = axFind(after, 'listitem')
      if (!items.length) {
        return { pass: false, mode: 'structural', detail: 'no listitem to place a caret in' }
      }
      // Caret offset here is "visible characters before the caret inside the
      // editor". Inside a fresh empty item that is 0.
      const ok = after.caret && after.caret.start === after.caret.end
      return {
        pass: !!ok,
        mode: 'structural',
        detail: `caret ${JSON.stringify(after.caret)} (collapsed=${!!ok})`,
      }
    }
    const ok = after.caret && after.caret.start === 2 && after.caret.end === 2
    return {
      pass: !!ok,
      mode: 'textual-equivalent',
      detail: `caret ${JSON.stringify(after.caret)}; expected collapsed at 2 (after "- ")`,
    }
  },
})

const listStartAnnounced = announcementConveys({
  assertionId: 'bulleted-list.create.announcement',
  assertionStatement: 'An announcement conveys that a bulleted list has started.',
  assertionPhrase: 'announce that a bulleted list started',
  priority: MUST,
  token: CONVEYS_LIST_START,
  hitDetail: (hit) => `[${hit.politeness}] "${hit.text}"`,
  missDetail: (after) =>
    `no list start was written to a live region at the moment of transformation. ` +
    `Correct <ul>/<li> still reaches the user on navigation; the outcome row ` +
    `separates that (discoverable) from no structure at all (absent). ` +
    `observed: ${renderAnnouncements(after)}`,
})

const announcedExactlyOnce = announcedOnce({
  assertionId: 'bulleted-list.create.announcement-once',
  assertionStatement: 'The list-start announcement is made exactly once.',
  assertionPhrase: 'announce the list start exactly once',
  priority: SHOULD,
  token: CONVEYS_LIST_START,
  noneDetail: 'no announcement at all (see .announcement)',
  manyDetail: (hits) => `${hits.length} matching announcements — repeated speech`,
})

const politeNotAssertive = announcedPolitely({
  assertionId: 'bulleted-list.create.announcement-politeness',
  assertionStatement: 'The list-start announcement is polite, not assertive.',
  assertionPhrase: 'announce the list start politely',
  priority: SHOULD,
  token: CONVEYS_LIST_START,
})

/* ------------------------------------------------------------------ */
/* Clause 2 — Enter at the end of a non-empty list item                */
/* ------------------------------------------------------------------ */

const newItemCreated = containerCreated({
  assertionId: 'bulleted-list.enter.structure',
  assertionStatement: 'A second list item exists and the first item retains its content.',
  assertionPhrase: 'create a second list item',
  priority: MUST,
  rich: ({ after, subject }) => {
    const na = richListGate(subject, 'there is no list whose item Enter could continue')
    if (na) return na
    const items = axFind(after, 'listitem', { within: 'list' })
    if (items.length >= 2) {
      return { pass: true, detail: `${items.length} listitems in a list` }
    }
    return {
      pass: false,
      detail: `expected >=2 listitem under list, found ${items.length}. subtree: ${axSummary(after)}`,
    }
  },
  plain: ({ after }) => {
    const structural = axFind(after, 'listitem').length >= 2
    if (structural) return { pass: true, mode: 'structural', detail: 'exposes 2 listitems' }
    const ok = after.domText === '- alpha\n- '
    return {
      pass: ok,
      mode: 'textual-equivalent',
      detail: ok
        ? 'source text is "- alpha\\n- " — the marker was continued onto the new line. ' +
          'The continuation is a PROGRAMMATIC insertion: the user pressed one key and ' +
          'received two characters they were never told about.'
        : `expected "- alpha\\n- ", got ${JSON.stringify(after.domText)}`,
    }
  },
})

// Bespoke for the same reason as caretInItem — and here the collapsed caret is
// only meaningful INSIDE a second list item, which is this operation's own
// structural fact, not a shared shape.
const caretInNewItem = assertion({
  assertionId: 'bulleted-list.enter.caret',
  assertionStatement: 'The caret is positioned to type the content of the new item.',
  assertionPhrase: 'place the caret in the new list item',
  priority: SHOULD,
  evaluate: ({ after, subject }) => {
    if (subject.kind === 'rich') {
      const na = richListGate(subject, 'no second list item exists for the caret to sit in')
      if (na) return na
      // A collapsed caret is not enough: it has to be collapsed *inside a second
      // list item*. Without the structure there is nothing for it to be inside,
      // so this fails rather than passing on a technicality.
      const items = axFind(after, 'listitem')
      if (items.length < 2) {
        return {
          pass: false,
          mode: 'structural',
          detail: `no second listitem for the caret to sit in (found ${items.length})`,
        }
      }
      const ok = after.caret && after.caret.start === after.caret.end
      return { pass: !!ok, mode: 'structural', detail: `caret ${JSON.stringify(after.caret)}` }
    }
    const expected = '- alpha\n- '.length
    const ok = after.caret && after.caret.start === expected && after.caret.end === expected
    return {
      pass: !!ok,
      mode: 'textual-equivalent',
      detail: `caret ${JSON.stringify(after.caret)}; expected collapsed at ${expected}`,
    }
  },
})

const newItemAnnounced = announcementConveys({
  assertionId: 'bulleted-list.enter.announcement',
  assertionStatement: 'An announcement conveys that a new list item has begun.',
  assertionPhrase: 'announce the new list item',
  priority: MUST,
  token: CONVEYS_NEW_ITEM,
  hitDetail: (hit) => `[${hit.politeness}] "${hit.text}"`,
  missDetail: (after) =>
    'the new item was inserted programmatically and silently. observed: ' +
    renderAnnouncements(after),
})

const itemNumberAnnounced = announcementRefines({
  assertionId: 'bulleted-list.enter.announcement-position',
  assertionStatement: 'The announcement conveys which item this is (its position in the list).',
  assertionPhrase: 'announce the position of the new item',
  priority: SHOULD,
  anchor: CONVEYS_NEW_ITEM,
  refine: POSITION_2_ITEM,
  okDetail: (hit) => `"${hit.text}" states the position`,
  missDetail: (hit) => `"${hit.text}" omits the item position`,
})

/* ------------------------------------------------------------------ */

export default contract({
  id: 'bulleted-list',
  title: 'Bulleted list creation and continuation',
  description:
    'The two most common list operations. Both hinge on the same insight: the ' +
    'characters the editor supplies on the user\'s behalf are supplied silently, ' +
    'so the announcement must come from the editor explicitly.',
  operations: [
    operation({
      id: 'bulleted-list.create',
      // CAN-CB-036 is "`- ` + space becomes a bulleted list" in the corpus.
      scenarios: ['CAN-CB-036'],
      title: 'Type "- " at the start of an empty line',
      precondition: 'The editor is focused and empty; the caret is at offset 0.',
      operationText: 'Type "-" then Space.',
      setup: async (driver) => {
        await driver.focusEditor()
      },
      actions: async (driver) => {
        await driver.type('-')
        await driver.type(' ')
      },
      resultState: [listCreated, caretInItem],
      announcement: [listStartAnnounced, announcedExactlyOnce, politeNotAssertive],
    }),

    operation({
      id: 'bulleted-list.enter',
      // CAN-CB-044 is "Enter at the end of an item creates the next item".
      scenarios: ['CAN-CB-044'],
      title: 'Press Enter at the end of a non-empty list item',
      precondition: 'The editor contains a single bulleted item "alpha"; caret at end of it.',
      operationText: 'Press Enter.',
      // Setup is typed, not injected, so every subject reaches the precondition
      // by the same route a user would — and so subject-specific setup hooks
      // (which a subject could use to cheat) are unnecessary.
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type('- alpha')
      },
      actions: async (driver) => {
        await driver.press('Enter')
      },
      resultState: [newItemCreated, caretInNewItem],
      announcement: [newItemAnnounced, itemNumberAnnounced],
    }),
  ],
})

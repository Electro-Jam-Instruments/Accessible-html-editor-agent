/**
 * contracts/heading.mjs — `# ` + space becomes a heading.
 *
 * Canonical scenario CAN-B1-... "# at line start becomes a heading" (corpus row
 * A3 in layered-gap-analysis.md). This is the first shape in the owner's
 * ordering, and it is the one Lexical has already fixed upstream: PR #8908
 * (merged 2026-08-13) added HeadingAnnounceExtension to @lexical/rich-text and
 * made RichTextExtension depend on it, so the announcement arrives WITHOUT the
 * integrator opting in.
 *
 * The point of this clause is therefore not to find a bug. It is to check,
 * independently and from outside the project, that the accessibility-by-default
 * design actually reaches a screen reader — and to give every other editor the
 * same question.
 */
import { contract, operation, MUST, SHOULD, axFind, axSummary } from '../contract.mjs'

/* Invariant predicates: the assertion shapes live in ../invariants.mjs (C-1
 * structure and announcement halves, A-1/A-2, and the level refinement). This
 * contract supplies only the heading-specific detection and prose. */
import {
  containerCreated,
  announcementConveys,
  announcementRefines,
} from '../invariants.mjs'

/* No adapter capability gate here (P0.5 session 3): 'heading' is not in the
 * capability set (adapters/index.mjs), so every subject — including the bare
 * contenteditable, which produces no heading — is probed. One operation, one
 * assertion path, and the probed failure already says precisely what is
 * absent; a declared n/a would add a capability token for no saved probing. */

/* Vocabulary: accepted surface forms live in ../vocabulary.mjs, one entry per
 * semantic token. Something must name the construct AND its level; "formatted"
 * passes neither. Level matters because a heading with no level is not
 * navigable. */
import {
  ROLE_HEADING as CONVEYS_HEADING,
  LEVEL_1_HEADING as CONVEYS_LEVEL,
} from '../vocabulary.mjs'

const headingCreated = containerCreated({
  assertionId: 'heading.create.structure',
  assertionStatement: 'A level-1 heading containing the typed text is conveyed.',
  assertionPhrase: 'convey a level 1 heading',
  priority: MUST,
  rich: ({ after }) => {
    const headings = axFind(after, 'heading')
    if (headings.length >= 1) {
      const lvl = headings[0].properties?.find?.((p) => p.name === 'level')?.value?.value
      return {
        pass: true,
        detail: `AX tree exposes heading${lvl ? ` level ${lvl}` : ' (level not exposed)'}`,
      }
    }
    return {
      pass: false,
      detail: `no heading in the editor's AX subtree; text is ${JSON.stringify(after.domText)}. subtree: ${axSummary(after)}`,
    }
  },
  // Plain-text subjects: the characters survive, and that is all they can do.
  plain: {
    expectedText: '# title',
    passDetail:
      'source text is "# title" — markdown that renders as a heading elsewhere, ' +
      'but the edited field exposes no heading role for the caret to be inside.',
  },
})

const headingAnnounced = announcementConveys({
  assertionId: 'heading.create.announcement',
  assertionStatement: 'The transformation into a heading is announced.',
  assertionPhrase: 'announce that a heading was created',
  priority: MUST,
  token: CONVEYS_HEADING,
  missDetail: (after) =>
    'not announced at the moment of transformation. If the editor emitted a ' +
    'real <h1> the user will still hear "heading level 1" when they navigate back ' +
    'to it — see the outcome row, which distinguishes discoverable from absent. ' +
    'observed: ' +
    (after.announcements?.length
      ? JSON.stringify(after.announcements.map((a) => a.text))
      : '(no live-region content emitted)'),
})

const headingLevelAnnounced = announcementRefines({
  assertionId: 'heading.create.announcement-level',
  assertionStatement: 'The announcement names the heading level.',
  assertionPhrase: 'name the heading level',
  priority: SHOULD,
  anchor: CONVEYS_HEADING,
  refine: CONVEYS_LEVEL,
  okDetail: (hit) => `names the level: ${JSON.stringify(hit.text)}`,
  missDetail: (hit) =>
    `${JSON.stringify(hit.text)} omits the level — a heading with no level is not navigable`,
})

export default contract({
  id: 'heading',
  title: 'Heading creation by markdown shortcut',
  operations: [
    operation({
      id: 'heading.create',
      scenarios: ['CAN-B1-003'],
      title: 'Type "# " at the start of an empty line',
      precondition: 'The editor is focused and empty; the caret is at offset 0.',
      operationText: 'Type "#", Space, then "title".',
      setup: async (driver) => { await driver.focusEditor() },
      actions: async (driver) => {
        await driver.type('#')
        await driver.type(' ')
        await driver.type('title')
      },
      resultState: [headingCreated],
      announcement: [headingAnnounced, headingLevelAnnounced],
    }),
  ],
})

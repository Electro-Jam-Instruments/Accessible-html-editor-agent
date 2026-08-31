/**
 * contracts/history.mjs — undo and redo.
 *
 * Canonical scenario CAN-B2-023 "Undo and redo" (scenarios/canonical.md, the B2
 * block). The corpus row records Lexical as `announced` there, on the strength
 * of the constant strings 'Undone' / 'Redone', and CKEditor as `silent`.
 *
 * This clause exists as a POSITIVE CONTROL, not as a bug hunt. `@lexical/a11y`
 * ships `HistoryAnnounceExtension`, which announces undo and redo through the
 * same `AriaLiveRegionExtension` sink that `HeadingAnnounceExtension` uses — and
 * the heading clause already comes back green through that sink. So a red
 * announcement row here cannot be shrugged off: it means either the extension
 * is not actually in the subject, or the harness cannot see this class of
 * announcement at all. The second would put every other green cell in the
 * corpus in doubt, which is why this row is worth half a session on its own.
 *
 * Two things are deliberately NOT conflated:
 *
 *   - the MUST on the announcement half asks only "was anything said". A bare
 *     'Undone' passes it. That is the honest reading of the row.
 *   - a separate SHOULD asks whether the announcement names WHAT was undone.
 *     Lexical's constant string cannot, and that is the live-region ceiling the
 *     corpus row is really about: a string channel cannot carry a document
 *     delta. It is recorded as a SHOULD failure rather than being folded into
 *     the MUST, so the two facts stay separable.
 */

import {
  contract,
  operation,
  assertion,
  MUST,
  SHOULD,
  matchAnnouncement,
  renderAnnouncements,
} from '../contract.mjs'

/* Invariant predicates: announcement-conveys (../invariants.mjs) carries A-3's
 * "the undo is announced" here, via the op:undone / op:redone tokens. The
 * result-state assertions below (reverted, reverted-fully, caret, and the
 * names-target refinements) stay bespoke: they compare the document against a
 * mid-operation stash and against the literally-typed content, which is revert
 * logic particular to history, not one of the shared containment shapes. */
import { announcementConveys } from '../invariants.mjs'

/* Vocabulary: accepted surface forms live in ../vocabulary.mjs, one entry per
 * semantic token. Something must name the operation ('changed' does not), and
 * a separate SHOULD-level token asks whether the announcement says anything
 * about the CONTENT that moved, as opposed to naming the operation and
 * stopping. */
import {
  OP_UNDONE as CONVEYS_UNDO,
  OP_REDONE as CONVEYS_REDO,
  TARGET_NAMED as NAMES_TARGET,
} from '../vocabulary.mjs'

/* Adapters (../adapters/index.mjs): the per-subject capability declaration
 * (P0.5 session 3). A subject whose adapter declares no 'history' capability
 * (the strict lexical-next build ships no history extension) has nothing for
 * Ctrl+Z to move, so the revert/reapply assertions are n/a by declaration
 * instead of re-reporting "unchanged by Ctrl+Z" every run.
 *
 * `history.redo.reapplied-fully` is deliberately NOT gated: on a subject with
 * no history it passes trivially (the text never left "alpha", which is also
 * what a full redo restores), and this refactor's rule is that a declaration
 * must never move a measured cell's verdict — so that path stays probed, with
 * its trivial pass on record. The announcement half also stays probed
 * everywhere: silence is a measurement of the announcer, not of the
 * capability. */
import { requireCapability } from '../adapters/index.mjs'

const gated = (a, what) => ({
  ...a,
  evaluate: (ctx) => requireCapability(ctx.subject, 'history', what) ?? a.evaluate(ctx),
})

/**
 * The document as it stood at the instant BEFORE the history key was pressed.
 *
 * The undo half cannot be judged from `before`/`after` alone: `before` is the
 * precondition, and between it and the history key the operation makes the very
 * change it is about to revert. So the operation records the intermediate state
 * itself, from inside `actions`, at a point the driver has already settled.
 *
 * This is a single slot, and that is safe only because run.mjs drives subjects
 * strictly sequentially (`for (const subject of ACTIVE) await runOperation(...)`)
 * and the assertions for an operation are evaluated before the next subject
 * starts. Each write is immediately consumed by the read that follows it; there
 * is no concurrency for it to race with. `beforeKey` is nulled at the top of
 * every `actions` so a stale value from a previous subject can never be read as
 * if it were this one's.
 */
const stash = { beforeKey: null }

/**
 * One document, read through two `innerText` conventions.
 *
 * An empty textarea reads as `""`. An empty Lexical document is a real empty
 * paragraph — `<p><br></p>` — and `innerText` renders that as `"\n"`. Those are
 * the same document. Without this, "did the text roll back" would compare
 * `"alpha".startsWith("\n")` and report a successful undo as a failure on every
 * contenteditable subject.
 *
 * This is a correction to the instrument, not a relaxation of the clause, and it
 * is checkable rather than asserted: `history.undo.reverted-fully` compares two
 * readings taken from the SAME subject, so it is immune to the convention
 * difference — and it already passed on both Lexical subjects in the same run
 * where `history.undo.reverted` failed. Two assertions about one document
 * disagreeing is the signature of a measurement artefact.
 *
 * Only TRAILING newlines are stripped, so an undo that genuinely collapsed the
 * document to blank lines still reads as empty, and nothing internal is touched.
 */
const docText = (s) => String(s ?? '').replace(/\n+$/, '')

function requireStash() {
  if (stash.beforeKey === null) {
    throw new Error(
      'the pre-keystroke document was never recorded — the operation did not reach ' +
        'the history keystroke, so no undo/redo result can be judged',
    )
  }
  return stash.beforeKey
}

/* ------------------------------------------------------------------ */
/* Clause 1 — undo                                                     */
/* ------------------------------------------------------------------ */

const undoReverted = assertion({
  assertionId: 'history.undo.reverted',
  assertionStatement: 'The document is rolled back towards its state before the edit.',
  assertionPhrase: 'actually undo the edit',
  priority: MUST,
  evaluate: ({ after }) => {
    const typed = docText(requireStash())
    // Whether one Ctrl+Z takes back the whole typed run or only part of it is a
    // history-granularity question (Lexical merges adjacent insertions inside a
    // time window; a textarea batches differently again). Either is a genuine
    // undo, so the MUST asks only that the document moved BACK: strictly shorter
    // than it was, and still a prefix of it.
    const now = docText(after.domText)
    const moved = now !== typed
    const backwards = typed.startsWith(now)
    return {
      pass: moved && backwards,
      mode: 'structural',
      detail: moved
        ? backwards
          ? `${JSON.stringify(typed)} -> ${JSON.stringify(now)}`
          : `document changed but not by rolling back: ${JSON.stringify(typed)} -> ${JSON.stringify(now)}`
        : `unchanged by Ctrl+Z: still ${JSON.stringify(now)} — nothing was undone`,
    }
  },
})

const undoRevertedFully = assertion({
  assertionId: 'history.undo.reverted-fully',
  assertionStatement: 'One undo takes back the whole typed run, not part of a character.',
  assertionPhrase: 'undo the whole edit in one step',
  priority: SHOULD,
  evaluate: ({ before, after }) => {
    const ok = docText(after.domText) === docText(before.domText)
    return {
      pass: ok,
      mode: 'structural',
      detail: ok
        ? `back to the precondition ${JSON.stringify(docText(before.domText))}`
        : `partial undo: expected ${JSON.stringify(docText(before.domText))}, got ${JSON.stringify(docText(after.domText))}. ` +
          'Undo granularity is not itself an accessibility defect, but a user who ' +
          'hears one "Undone" per keystroke is being told the same thing about very ' +
          'different amounts of lost work.',
    }
  },
})

const undoCaret = assertion({
  assertionId: 'history.undo.caret',
  assertionStatement: 'A collapsed caret survives the undo inside the editor.',
  assertionPhrase: 'leave the caret somewhere in the document',
  priority: SHOULD,
  evaluate: ({ after }) => {
    if (!after.caret) {
      return {
        pass: false,
        mode: 'structural',
        detail:
          'no selection inside the editor after the undo — the caret was destroyed ' +
          'along with the content it was in, so there is no position to read from.',
      }
    }
    const ok = after.caret.start === after.caret.end
    return {
      pass: ok,
      mode: 'structural',
      detail: ok
        ? `collapsed caret at ${after.caret.start}`
        : `undo left a range selection ${JSON.stringify(after.caret)}`,
    }
  },
})

const undoAnnounced = announcementConveys({
  assertionId: 'history.undo.announcement',
  assertionStatement: 'The undo is announced.',
  assertionPhrase: 'announce that an undo happened',
  priority: MUST,
  token: CONVEYS_UNDO,
  missDetail: (after) =>
    'nothing named the operation. Undo is the one edit with no visible cause — ' +
    'the user did not type the change that appeared — so unlike a heading there ' +
    'is nothing to navigate back to and re-read. observed: ' +
    renderAnnouncements(after),
})

const undoNamesTarget = assertion({
  assertionId: 'history.undo.announcement-names-target',
  assertionStatement: 'The announcement conveys what was undone.',
  assertionPhrase: 'say what was undone',
  priority: SHOULD,
  evaluate: ({ after }) => {
    const hit = matchAnnouncement(after, CONVEYS_UNDO)
    if (!hit) return { pass: false, detail: 'no announcement to judge' }
    const typed = stash.beforeKey === null ? null : docText(stash.beforeKey)
    const quotesContent =
      typeof typed === 'string' && typed.length > 0 &&
      hit.text.toLowerCase().includes(typed.trim().toLowerCase())
    const ok = quotesContent || NAMES_TARGET.test(hit.text)
    return {
      pass: ok,
      detail: ok
        ? `names the target: ${JSON.stringify(hit.text)}`
        : `${JSON.stringify(hit.text)} names the operation and nothing else. The user is ` +
          'told that something was taken back, not what — and cannot tell one undo from ' +
          'the next, or a one-character undo from one that removed a paragraph.',
    }
  },
})

/* ------------------------------------------------------------------ */
/* Clause 2 — redo                                                     */
/* ------------------------------------------------------------------ */

const redoReapplied = assertion({
  assertionId: 'history.redo.reapplied',
  assertionStatement: 'The undone edit is put back.',
  assertionPhrase: 'actually redo the edit',
  priority: MUST,
  evaluate: ({ after }) => {
    const undone = docText(requireStash())
    const now = docText(after.domText)
    const moved = now !== undone
    const forwards = now.startsWith(undone) && 'alpha'.startsWith(now)
    return {
      pass: moved && forwards,
      mode: 'structural',
      detail: moved
        ? forwards
          ? `${JSON.stringify(undone)} -> ${JSON.stringify(now)}`
          : `document changed but not by re-applying the edit: ${JSON.stringify(undone)} -> ${JSON.stringify(now)}`
        : `unchanged by the redo key: still ${JSON.stringify(undone)} — nothing was redone`,
    }
  },
})

const redoReappliedFully = assertion({
  assertionId: 'history.redo.reapplied-fully',
  assertionStatement: 'Redo restores the edit in full.',
  assertionPhrase: 'restore the whole edit',
  priority: SHOULD,
  evaluate: ({ after }) => {
    const ok = docText(after.domText) === 'alpha'
    return {
      pass: ok,
      mode: 'structural',
      detail: ok
        ? 'restored to "alpha"'
        : `expected "alpha", got ${JSON.stringify(docText(after.domText))}`,
    }
  },
})

const redoAnnounced = announcementConveys({
  assertionId: 'history.redo.announcement',
  assertionStatement: 'The redo is announced.',
  assertionPhrase: 'announce that a redo happened',
  priority: MUST,
  token: CONVEYS_REDO,
  missDetail: (after) =>
    'nothing named the operation. observed: ' + renderAnnouncements(after),
})

const redoNamesTarget = assertion({
  assertionId: 'history.redo.announcement-names-target',
  assertionStatement: 'The announcement conveys what was put back.',
  assertionPhrase: 'say what was redone',
  priority: SHOULD,
  evaluate: ({ after }) => {
    const hit = matchAnnouncement(after, CONVEYS_REDO)
    if (!hit) return { pass: false, detail: 'no announcement to judge' }
    const ok = hit.text.toLowerCase().includes('alpha') || NAMES_TARGET.test(hit.text)
    return {
      pass: ok,
      detail: ok
        ? `names the target: ${JSON.stringify(hit.text)}`
        : `${JSON.stringify(hit.text)} names the operation and nothing else.`,
    }
  },
})

/* ------------------------------------------------------------------ */

export default contract({
  id: 'history',
  title: 'Undo and redo',
  description:
    'Ctrl+Z and Ctrl+Shift+Z. The document must actually move, and the user must be ' +
    'told that it moved — an undo is the only edit with no visible cause, so there is ' +
    'no structure to navigate back to afterwards.',
  operations: [
    operation({
      id: 'history.undo',
      scenarios: ['CAN-B2-023'],
      title: 'Type, then press Ctrl+Z',
      precondition: 'The editor is focused and empty; the caret is at offset 0.',
      operationText: 'Type "alpha", then press Ctrl+Z.',
      setup: async (driver) => {
        await driver.focusEditor()
      },
      actions: async (driver) => {
        stash.beforeKey = null
        await driver.type('alpha')
        // driver.type() returns only once the settle predicate is stable, so
        // this read observes the finished edit — it is a sync point, not a wait.
        stash.beforeKey = (await driver.capture()).domText
        await driver.press('Control+z')
      },
      resultState: [
        gated(undoReverted, 'no history stack exists for Ctrl+Z to roll back'),
        gated(undoRevertedFully, 'no history stack exists for Ctrl+Z to roll back'),
        undoCaret,
      ],
      announcement: [undoAnnounced, undoNamesTarget],
    }),

    operation({
      id: 'history.redo',
      scenarios: ['CAN-B2-023'],
      title: 'Undo, then press Ctrl+Shift+Z',
      precondition:
        'The editor is focused; "alpha" has been typed and undone, so there is a ' +
        'redo stack. Setup keystrokes are not credited to the operation — the ' +
        'journal is cleared after setup.',
      operationText: 'Press Ctrl+Shift+Z.',
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type('alpha')
        await driver.press('Control+z')
      },
      actions: async (driver) => {
        stash.beforeKey = null
        stash.beforeKey = (await driver.capture()).domText
        await driver.press('Control+Shift+z')
      },
      resultState: [
        gated(redoReapplied, 'no history stack exists for the redo key to re-apply'),
        redoReappliedFully,
      ],
      announcement: [redoAnnounced, redoNamesTarget],
    }),
  ],
})

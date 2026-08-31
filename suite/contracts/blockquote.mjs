/**
 * contracts/blockquote.mjs — one container, four vectors.
 *
 * Work-queue item A2. The blockquote is the smallest container that still has a
 * full containment state machine around it, which makes it the cheapest place to
 * measure the thing that actually breaks: **a container has many independent
 * entry and exit vectors, implemented in different code paths, and they fail
 * independently** (containment-state-machine.md). An editor that announces
 * autoformat entry and nothing on arrow entry has taught the user to trust a
 * signal that is not reliable.
 *
 * The four clauses, and the canonical rows they measure:
 *
 *   create   E1  `> ` + space turns the block into a quotation      CAN-CB-001
 *   enter    E3  arrow down into an existing quote from above       CAN-CB-003
 *   exit     X1  the editor's escape gesture leaves the quote       CAN-CB-009
 *   destroy  X4  Backspace at the start dissolves the quote         CAN-CB-012
 *
 * Two invariants are load-bearing here and are stated in the assertions rather
 * than left implicit:
 *
 *   C-3  `create` and `enter` must convey the SAME container identity. They are
 *        different code paths — one hooks a text transform, the other a caret
 *        movement — so an announcer wired to the transform passes `create` and
 *        fails `enter`. That asymmetry is the finding, not a harness bug.
 *   C-5  "removed" is a different fact from "left". `exit` moved the caret and
 *        the quotation still exists; `destroy` dissolved the quotation around a
 *        caret that never moved. An editor that says one string for both has
 *        told the user something false half the time.
 *
 * The assertion SHAPES here — container-created, container-entered/exited/
 * destroyed, announcement-conveys with its exactly-once and politeness
 * refinements, and both halves of C-5 — live in ../invariants.mjs. This file
 * supplies the quotation-specific probe, detection and prose.
 *
 * ---------------------------------------------------------------------------
 * Why the vocabulary is shaped the way it is
 * ---------------------------------------------------------------------------
 * facebook/lexical#9070 (open at the time of writing) adds a
 * `QuoteAnnounceExtension` announcing "Block quote", "Block quote removed",
 * "Block quote removed, in block quote" and "Exiting block quote". This clause
 * must accept those strings — a clause that fails on `main` and passes on that
 * branch is review evidence the maintainers do not have — but it must not be
 * written *only* for them, or it stops being a contract and becomes a snapshot
 * test of one project's copy.
 *
 * So the matchers are generous on wording and strict on substance, exactly as in
 * heading.mjs. The MUST level asks only: **did anything name the quotation at the
 * moment the containment stack changed?** "Block quote", "blockquote", "quote",
 * "quotation", "entering quotation" all pass; "formatted" and silence do not.
 * The SHOULD level carries the discriminations that matter — leaving is not
 * removal, and one crossing is one announcement — which is where C-5 lives.
 *
 * Direction words are deliberately NOT required on entry. Naming a container as
 * you arrive in it is the established convention ("Block quote", the way NVDA
 * itself reads a container on entry in browse mode); demanding "entered" would
 * fail a correct implementation over house style.
 *
 * ---------------------------------------------------------------------------
 * Why this clause reads the DOM selection directly
 * ---------------------------------------------------------------------------
 * Every other assertion in the harness is answered from the standard snapshot.
 * Containment cannot be. The snapshot's caret is "visible characters before the
 * caret", which flattens block boundaries — after `above` + a quote holding
 * `sample`, offset 5 is *both* the end of the paragraph and the start of the
 * quotation. The entire enter/exit distinction lives inside that ambiguity.
 *
 * So each operation reads the selection's ancestor chain once, at the settled
 * point the driver has already reached, via a read-only `Runtime.evaluate`. That
 * is an observation of a real signal at a real sync point — no waiting, no
 * clock, nothing scheduled (CLAUDE.md). The reading is stored with the subject
 * and operation it came from, and an assertion that finds a mismatch fails
 * loudly rather than judging stale data.
 *
 * ---------------------------------------------------------------------------
 * Subjects with no blockquote at all
 * ---------------------------------------------------------------------------
 * The markdown textareas have no quotation container at any layer: `> ` is two
 * characters in a string, and the containment state machine has no state to be
 * in. `create` still has an honest textual equivalent (the source text is
 * `"> sample"`, markdown that renders as a quotation somewhere else) and is
 * scored PASS~ on intent, as heading.mjs scores `"# title"`.
 *
 * `enter`, `exit` and `destroy` have no equivalent — there is no container to
 * arrive in, leave, or dissolve — so they are recorded as NOT APPLICABLE and
 * their detail says so in the first phrase. They are still counted as
 * unsatisfied, because the harness's honest verdict for those subjects is
 * `absent`: nothing was announced *and* there is no structure to navigate back
 * to, which is exactly what canonical.md records for Open Notebook on these
 * rows ("n/a — not supported"). Read the FAIL on `enter.structure` as "this
 * editor has no quotation", never as "this editor's announcer is broken".
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

/* Invariant predicates (../invariants.mjs): the assertion shapes, keyed to the
 * conformance-suite invariants they implement. */
import {
  staleProbe,
  containerCreated,
  containerEntered,
  containerExited,
  containerDestroyed,
  enteredWithoutEditing,
  contentPreserved,
  announcementConveys,
  announcedOnce,
  announcedPolitely,
  exitConveysLeavingNotRemoval,
  destroyConveysRemoval,
} from '../invariants.mjs'

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/*                                                                     */
/* The accepted surface forms live in ../vocabulary.mjs, one entry per  */
/* semantic token, with the fairness decisions recorded there:          */
/*   container:blockquote  the lexical#9070 strings must pass without   */
/*                         the entry being written only for them, and   */
/*                         no direction word is required on entry       */
/*   direction:removed /   C-5 — "removed" and "left" are different     */
/*   direction:left        facts and are matched by different tokens    */
/* ------------------------------------------------------------------ */

import {
  CONTAINER_BLOCKQUOTE as NAMES_QUOTE,
  DIRECTION_REMOVED_QUOTE as CONVEYS_REMOVAL,
  DIRECTION_LEFT as CONVEYS_LEAVING,
} from '../vocabulary.mjs'

/* Adapters (../adapters/index.mjs): the per-subject capability declaration
 * and gesture table (P0.5 session 3). The navigation vectors (enter, exit,
 * destroy) need a real quotation to exist, and whether one CAN exist is now
 * declared per subject rather than re-probed each run: a flat field declares
 * no 'realStructure', a bare contenteditable declares no 'blockquote', and
 * either absence makes those vectors n/a by declaration. Where both are
 * declared, the probe runs exactly as before. The escape gesture (key and
 * terminating bound) comes from the adapter. */
import { requireCapability, gesturesFor } from '../adapters/index.mjs'

/** Gate an assertion on declared capabilities: absent -> declared n/a. */
const gated = (a, gate) => ({ ...a, evaluate: (ctx) => gate(ctx) ?? a.evaluate(ctx) })

/** The quotation vectors need real structure AND a real blockquote. */
const quoteGate = (what) => ({ subject }) =>
  requireCapability(
    subject,
    'realStructure',
    `${what} — "> " is two characters in a string at every layer of this subject`,
  ) ?? requireCapability(subject, 'blockquote', what)

/* The typed content is deliberately "above" and "sample": neither contains a
 * word the matchers look for, so an editor that merely echoes the line it is on
 * cannot be mistaken for one that named the container. */
const BODY = 'sample'
const ABOVE = 'above'

/* ------------------------------------------------------------------ */
/* Containment probe                                                   */
/* ------------------------------------------------------------------ */

/** Read-only. Returns the ancestor chain of the selection anchor, plus what
 *  quotations exist in the document at all. */
const READ_CONTAINMENT_FN = `
(sel) => {
  const el = document.querySelector(sel);
  if (!el) return { error: 'editor not found: ' + sel };
  const quoteSel = 'blockquote, [role="blockquote"]';
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return {
      shape: 'field', stack: [], inQuote: false, quotes: 0, quoteTexts: [],
      text: el.value, caret: { start: el.selectionStart, end: el.selectionEnd },
    };
  }
  const s = document.getSelection();
  const stack = [];
  let inQuote = false;
  if (s && s.anchorNode && el.contains(s.anchorNode)) {
    let n = s.anchorNode;
    if (n.nodeType === 1 && n.childNodes[s.anchorOffset]) n = n.childNodes[s.anchorOffset];
    if (n.nodeType === 3) n = n.parentElement;
    while (n && n !== el) {
      const tag = n.tagName.toLowerCase();
      const role = (n.getAttribute('role') || '').toLowerCase();
      stack.unshift(role ? tag + '[role=' + role + ']' : tag);
      if (tag === 'blockquote' || role === 'blockquote') inQuote = true;
      n = n.parentElement;
    }
  }
  const quotes = [...el.querySelectorAll(quoteSel)];
  return {
    shape: 'contenteditable',
    stack,
    inQuote,
    quotes: quotes.length,
    quoteTexts: quotes.map((q) => q.textContent.replace(/\\s+/g, ' ').trim()),
    text: el.innerText,
    collapsed: !!s && s.isCollapsed,
  };
}
`

/**
 * One slot, written by setup/actions and read by the assertions of the same
 * operation on the same subject. run.mjs drives subjects strictly sequentially
 * (`for (const subject of ACTIVE) await runOperation(...)`), so nothing races
 * for it; the subject and operation ids are recorded so a stale read is caught
 * rather than believed.
 */
const probe = { subjectId: null, opId: null, before: null, mid: null, after: null }

async function readContainment(driver) {
  const r = await driver.send('Runtime.evaluate', {
    expression: `(${READ_CONTAINMENT_FN})(${JSON.stringify(driver.editorSelector)})`,
    returnByValue: true,
  })
  if (r.exceptionDetails) {
    throw new Error(`containment probe failed: ${r.exceptionDetails.text}`)
  }
  return r.result.value
}

/** Call at the end of setup: opens a fresh record for this subject+operation. */
async function probeSetup(driver, opId) {
  probe.subjectId = driver.subjectMeta?.id ?? null
  probe.opId = opId
  probe.mid = null
  probe.after = null
  probe.enters = 0
  probe.before = await readContainment(driver)
}

/** Call at the end of actions. */
async function probeAfter(driver) {
  probe.after = await readContainment(driver)
}

/** Fetch the record, refusing to judge one that belongs to another run. */
function containment(subject, opId) {
  if (probe.opId !== opId || probe.subjectId !== subject.id || !probe.after) {
    return null
  }
  return probe
}

const STALE = staleProbe('containment reading')

/** A subject where the construct does not exist at any layer. */
function notApplicable(what) {
  return {
    pass: false,
    mode: 'textual-equivalent',
    detail:
      `NOT APPLICABLE — ${what} This subject has no quotation container at any layer: ` +
      `"> " is two characters in a string. Recorded as unsatisfied because the honest ` +
      `outcome is "absent" (nothing announced, and no structure to navigate back to), ` +
      `which is what canonical.md records for this editor. It is a structural gap, not ` +
      `a silent announcer.`,
  }
}

/** Shared failure text for the announcement half. */
function noAnnouncement(after, crossing) {
  return (
    `nothing named the quotation when ${crossing}. A real <blockquote> is still reported ` +
    `by NVDA on navigation (reportBlockQuotes defaults to true — platform-rescue.md), so ` +
    `the outcome row separates that (discoverable) from no structure at all (absent). ` +
    `What it does NOT cover is this moment: the containment stack changed and the user ` +
    `was not told. observed: ${renderAnnouncements(after)}`
  )
}

/** The escape gesture as it actually went, for the exit details. */
const gesture = (c) => `${c.enters} Enter${c.enters === 1 ? '' : 's'}`

/* ------------------------------------------------------------------ */
/* Clause 1 — create (E1, CAN-CB-001)                                  */
/* ------------------------------------------------------------------ */

const createStructure = containerCreated({
  assertionId: 'blockquote.create.structure',
  assertionStatement: 'A quotation containing the typed text is conveyed.',
  assertionPhrase: 'convey a block quotation',
  priority: MUST,
  rich: ({ after, subject }) => {
    // Declared, not probed: a rich subject that declares no blockquote
    // capability (a bare contenteditable) will never produce the quotation.
    // The plain branch below is NOT gated — a flat field's textual
    // equivalent is a genuine measurement.
    const na = requireCapability(
      subject,
      'blockquote',
      'typing "> " never produces a quotation in this subject',
    )
    if (na) return na
    const c = containment(subject, 'blockquote.create')
    if (!c) return STALE
    const quotes = axFind(after, 'blockquote')
    const holdsText = c.after.quoteTexts.some((t) => t.includes(BODY))
    if (quotes.length >= 1 && holdsText) {
      return {
        pass: true,
        detail:
          `AX tree exposes blockquote; the quotation holds ${JSON.stringify(BODY)}. ` +
          `caret stack: ${c.after.stack.join(' › ') || '(none)'}`,
      }
    }
    return {
      pass: false,
      detail:
        `no blockquote holding ${JSON.stringify(BODY)} in the editor's AX subtree ` +
        `(${quotes.length} blockquote node(s), ${c.after.quotes} quotation element(s)). ` +
        `text is ${JSON.stringify(after.domText)}. subtree: ${axSummary(after)}`,
    }
  },
  // Plain-markdown subjects: the characters survive and mean "quotation" in
  // some other renderer. That is the whole of what they can do.
  plain: {
    expectedText: `> ${BODY}`,
    passDetail:
      `source text is "> ${BODY}" — markdown that renders as a quotation elsewhere, ` +
      `but the edited field exposes one textbox whose value happens to start with ` +
      `">". There is no quotation for a caret to be inside, so none of the other ` +
      `three vectors in this clause can even arise.`,
  },
})

// Caret placement is per-operation offset arithmetic against this clause's own
// probe, not one of the shared containment/announcement invariants — bespoke.
const createCaret = assertion({
  assertionId: 'blockquote.create.caret',
  assertionStatement: 'The caret is inside the quotation, ready to type its content.',
  assertionPhrase: 'place the caret inside the quotation',
  priority: SHOULD,
  evaluate: ({ subject, after }) => {
    if (subject.kind === 'rich') {
      const c = containment(subject, 'blockquote.create')
      if (!c) return STALE
      const ok = c.after.inQuote && c.after.collapsed
      return {
        pass: ok,
        mode: 'structural',
        detail: ok
          ? `caret is inside the quotation: ${c.after.stack.join(' › ')}`
          : `caret is not inside a quotation (stack: ${c.after.stack.join(' › ') || '(none)'}, ` +
            `collapsed=${c.after.collapsed})`,
      }
    }
    const n = `> ${BODY}`.length
    const ok = after.caret && after.caret.start === n && after.caret.end === n
    return {
      pass: !!ok,
      mode: 'textual-equivalent',
      detail: `caret ${JSON.stringify(after.caret)}; expected collapsed at ${n} (after "> ${BODY}")`,
    }
  },
})

const createAnnounced = announcementConveys({
  assertionId: 'blockquote.create.announcement',
  assertionStatement: 'The transformation into a quotation is announced.',
  assertionPhrase: 'announce that a quotation was created',
  priority: MUST,
  token: NAMES_QUOTE,
  missDetail: (after) => noAnnouncement(after, 'the block became a quotation'),
})

const createAnnouncedOnce = announcedOnce({
  assertionId: 'blockquote.create.announcement-once',
  assertionStatement: 'The quotation is announced exactly once.',
  assertionPhrase: 'announce the quotation exactly once',
  priority: SHOULD,
  token: NAMES_QUOTE,
  manyDetail: (hits) =>
    `${hits.length} matching announcements — one crossing, repeated speech: ` +
    hits.map((h) => JSON.stringify(h.text)).join(' · '),
})

const createPolite = announcedPolitely({
  assertionId: 'blockquote.create.announcement-politeness',
  assertionStatement: 'The quotation announcement is polite, not assertive.',
  assertionPhrase: 'announce the quotation politely',
  priority: SHOULD,
  token: NAMES_QUOTE,
})

/* ------------------------------------------------------------------ */
/* Clause 2 — enter by arrow (E3, CAN-CB-003)                          */
/* ------------------------------------------------------------------ */

const enterStructure = containerEntered({
  assertionId: 'blockquote.enter.structure',
  assertionStatement:
    'Arrowing down from the block above puts the caret inside the existing quotation.',
  assertionPhrase: 'move the caret into the quotation',
  priority: MUST,
  read: (subject) => containment(subject, 'blockquote.enter'),
  stale: STALE,
  notApplicable: () => notApplicable('there is no quotation to arrow into.'),
  containersBefore: (c) => c.before.quotes,
  inside: (state) => state.inQuote,
  noContainerDetail: () =>
    `precondition not met: setup typed "> " and this subject produced no quotation ` +
    `(0 blockquote elements), so there is no container to enter. A structural gap ` +
    `upstream of anything this clause can measure about crossings.`,
  alreadyInsideDetail: (c) =>
    `precondition not met: the caret was already inside the quotation before the ` +
    `ArrowDown (stack: ${c.before.stack.join(' › ')}), so no crossing was exercised.`,
  crossedDetail: (c) =>
    `containment stack changed ${c.before.stack.join(' › ') || '(root)'} → ` +
    `${c.after.stack.join(' › ')}: a real crossing, by a code path that has nothing ` +
    `to do with the "> " transform (invariant C-3).`,
  notCrossedDetail: (c) =>
    `ArrowDown did not put the caret in the quotation: ` +
    `${c.before.stack.join(' › ') || '(root)'} → ${c.after.stack.join(' › ') || '(root)'}`,
})

const enterNoEdit = enteredWithoutEditing({
  assertionId: 'blockquote.enter.no-edit',
  assertionStatement: 'Entering by navigation does not modify the document.',
  assertionPhrase: 'enter the quotation without editing it',
  priority: SHOULD,
  read: (subject) => containment(subject, 'blockquote.enter'),
  inside: (state) => state.inQuote,
})

const enterAnnounced = announcementConveys({
  assertionId: 'blockquote.enter.announcement',
  assertionStatement:
    'Arriving in the quotation by arrow announces the same container identity as creating it (C-3).',
  assertionPhrase: 'announce the quotation on arrow entry',
  priority: MUST,
  token: NAMES_QUOTE,
  missDetail: (after) =>
    noAnnouncement(after, 'the caret arrived inside the quotation') +
    ' — note this vector is a caret movement, not a text transform, so an announcer ' +
    'hooked on the transform passes blockquote.create and fails here (invariant C-3).',
})

const enterAnnouncedOnce = announcedOnce({
  assertionId: 'blockquote.enter.announcement-once',
  assertionStatement: 'The arrival is announced exactly once.',
  assertionPhrase: 'announce the arrival exactly once',
  priority: SHOULD,
  token: NAMES_QUOTE,
  manyDetail: (hits) =>
    `${hits.length} matching announcements for one crossing: ` +
    hits.map((h) => JSON.stringify(h.text)).join(' · '),
})

/* ------------------------------------------------------------------ */
/* Clause 3 — exit by the editor's escape gesture (X1, CAN-CB-009)     */
/* ------------------------------------------------------------------ */

const exitStructure = containerExited({
  assertionId: 'blockquote.exit.structure',
  assertionStatement:
    'The escape gesture leaves the quotation: the caret is outside it and the quotation still exists.',
  assertionPhrase: 'leave the quotation without destroying it',
  priority: MUST,
  read: (subject) => containment(subject, 'blockquote.exit'),
  stale: STALE,
  notApplicable: () => notApplicable('there is no quotation to leave.'),
  containersBefore: (c) => c.before.quotes,
  inside: (state) => state.inQuote,
  survived: (c) => c.after.quotes >= 1 && c.after.quoteTexts.some((t) => t.includes(BODY)),
  noContainerDetail: () =>
    `precondition not met: setup typed "> " and this subject produced no quotation, ` +
    `so there is nothing to escape from. Invariant C-7 (every container has at least ` +
    `one keyboard exit) cannot even be posed.`,
  leftDetail: (c) =>
    `left after ${gesture(c)}: ${c.before.stack.join(' › ')} → ` +
    `${c.after.stack.join(' › ') || '(root)'}, and the quotation still holds ` +
    `${JSON.stringify(BODY)}. The caret moved; the document's structure did not.`,
  destroyedNotExitedDetail: (c) =>
    `after ${gesture(c)} the caret is outside, but the quotation no longer holds ` +
    `${JSON.stringify(BODY)} (${c.after.quotes} quotation element(s)). That is a ` +
    `destruction, not an exit — a different fact, and it must not be announced as ` +
    `one (invariant C-5).`,
  stillInsideDetail: (c) =>
    `still inside the quotation after ${gesture(c)} (stack: ${c.after.stack.join(' › ')}). ` +
    `No escape gesture this clause knows about leaves this container; see invariant C-7.`,
})

const exitContentPreserved = contentPreserved({
  assertionId: 'blockquote.exit.content-preserved',
  assertionStatement: 'Leaving the quotation loses none of its content.',
  assertionPhrase: 'leave the quotation with its content intact',
  priority: SHOULD,
  body: BODY,
  passDetail: `${JSON.stringify(BODY)} still present after the escape gesture`,
  failDetail: (after) => `${JSON.stringify(BODY)} is gone: ${JSON.stringify(after.domText)}`,
})

const exitAnnounced = announcementConveys({
  assertionId: 'blockquote.exit.announcement',
  assertionStatement: 'Leaving the quotation is announced.',
  assertionPhrase: 'announce leaving the quotation',
  priority: MUST,
  token: NAMES_QUOTE,
  missDetail: (after) =>
    noAnnouncement(after, 'the caret left the quotation') +
    ' — and unlike entry, nothing rescues this one: there is no structure at the new ' +
    'position for the user to navigate to and discover that they are out.',
})

const exitDirection = exitConveysLeavingNotRemoval({
  assertionId: 'blockquote.exit.announcement-direction',
  assertionStatement:
    'The announcement says the quotation was left, and does not say it was removed (C-5).',
  assertionPhrase: 'distinguish leaving from removing',
  priority: SHOULD,
  names: NAMES_QUOTE,
  leaving: CONVEYS_LEAVING,
  removal: CONVEYS_REMOVAL,
  removedDetail: (hit) =>
    `${JSON.stringify(hit.text)} says the quotation was REMOVED. It was not — the ` +
    `caret moved out and the quotation is still there. Invariant C-5.`,
  directionlessDetail: (hit) =>
    `${JSON.stringify(hit.text)} names the quotation but not the direction, so it is ` +
    `indistinguishable from the announcement for entering it. The user cannot tell ` +
    `whether they are in or out — which is the state they were trying to establish.`,
})

/* ------------------------------------------------------------------ */
/* Clause 4 — destroy by Backspace at the start (X4, CAN-CB-012)       */
/* ------------------------------------------------------------------ */

const destroyStructure = containerDestroyed({
  assertionId: 'blockquote.destroy.structure',
  assertionStatement:
    'Backspace at the start dissolves the quotation and keeps its text.',
  assertionPhrase: 'dissolve the quotation, keeping its text',
  priority: MUST,
  read: (subject) => containment(subject, 'blockquote.destroy'),
  stale: STALE,
  notApplicable: () => notApplicable('there is no quotation to dissolve.'),
  containersBefore: (c) => c.before.quotes,
  gone: (c) => c.after.quotes === 0,
  kept: (c, { after }) => after.domText.includes(BODY),
  noContainerDetail: () =>
    `precondition not met: setup typed "> " and this subject produced no quotation, ` +
    `so there is nothing for Backspace to dissolve.`,
  dissolvedDetail: (c) =>
    `the quotation is gone and ${JSON.stringify(BODY)} survives as ` +
    `${c.after.stack.join(' › ') || 'top-level text'}. One keystroke changed the ` +
    `document's structure around a caret that did not move — the fact the user most ` +
    `needs and is least likely to be told (invariant C-5).`,
  notDissolvedDetail: (c, { after }) =>
    `expected the quotation to dissolve with its text kept; got ` +
    `${c.after.quotes} quotation element(s), text ${JSON.stringify(after.domText)}`,
})

const destroyContentPreserved = contentPreserved({
  assertionId: 'blockquote.destroy.content-preserved',
  assertionStatement: 'Dissolving the quotation deletes none of its text.',
  assertionPhrase: 'keep the text when the quotation is dissolved',
  priority: SHOULD,
  body: BODY,
  passDetail: `${JSON.stringify(BODY)} survived the dissolution`,
  failDetail: (after) =>
    `${JSON.stringify(BODY)} was destroyed along with the container: ` +
    JSON.stringify(after.domText),
})

const destroyAnnounced = announcementConveys({
  assertionId: 'blockquote.destroy.announcement',
  assertionStatement: 'The disappearance of the quotation is announced.',
  assertionPhrase: 'announce that the quotation is gone',
  priority: MUST,
  token: NAMES_QUOTE,
  missDetail: (after) =>
    noAnnouncement(after, 'one Backspace dissolved the quotation') +
    ' — this is the vector with no fallback at all: the structure that would have told ' +
    'the user on navigation is precisely what stopped existing.',
})

const destroyRemoval = destroyConveysRemoval({
  assertionId: 'blockquote.destroy.announcement-removal',
  assertionStatement:
    'The announcement says the quotation was removed, not merely that the caret left it (C-5).',
  assertionPhrase: 'announce removal, distinctly from leaving',
  priority: SHOULD,
  names: NAMES_QUOTE,
  removal: CONVEYS_REMOVAL,
  removedDetail: (hit) =>
    `${JSON.stringify(hit.text)} conveys that the structure itself is gone`,
  notRemovedDetail: (hit) =>
    `${JSON.stringify(hit.text)} does not convey removal. The user is left believing ` +
    `they navigated out of a quotation that still exists, when in fact the quotation ` +
    `stopped existing. Invariant C-5: "removed" and "left" are different facts.`,
})

/* ------------------------------------------------------------------ */

export default contract({
  id: 'blockquote',
  title: 'Blockquote: create, enter, exit, destroy',
  description:
    'One container through four vectors. create and enter must convey the same identity ' +
    'by different code paths (C-3); exit and destroy must be told apart (C-5). The four ' +
    'together are the smallest complete containment state machine in the corpus.',
  operations: [
    operation({
      id: 'blockquote.create',
      scenarios: ['CAN-CB-001'],
      title: 'Type "> " at the start of an empty line',
      precondition: 'The editor is focused and empty; the caret is at offset 0.',
      operationText: `Type ">", Space, then "${BODY}".`,
      setup: async (driver) => {
        await driver.focusEditor()
        await probeSetup(driver, 'blockquote.create')
      },
      actions: async (driver) => {
        await driver.type('>')
        await driver.type(' ')
        await driver.type(BODY)
        await probeAfter(driver)
      },
      resultState: [createStructure, createCaret],
      announcement: [createAnnounced, createAnnouncedOnce, createPolite],
    }),

    operation({
      id: 'blockquote.enter',
      scenarios: ['CAN-CB-003'],
      title: 'Arrow down into an existing quotation from the block above',
      precondition:
        'A paragraph "above" is followed by a quotation containing "sample"; the caret is ' +
        'at the start of the paragraph, outside the quotation.',
      operationText: 'Press ArrowDown.',
      // Typed, never injected: the precondition is reached the way a user would
      // reach it, so no subject can expose a hook that flatters it. The ArrowUp
      // and Home are part of setup, so any announcement they cause is discarded
      // before the operation is measured.
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type(ABOVE)
        await driver.press('Enter')
        await driver.type('> ')
        await driver.type(BODY)
        await driver.press('ArrowUp')
        await driver.press('Home')
        await probeSetup(driver, 'blockquote.enter')
      },
      actions: async (driver) => {
        await driver.press('ArrowDown')
        await probeAfter(driver)
      },
      resultState: [
        gated(enterStructure, quoteGate('there is no quotation to arrow into')),
        enterNoEdit,
      ],
      announcement: [enterAnnounced, enterAnnouncedOnce],
    }),

    operation({
      id: 'blockquote.exit',
      scenarios: ['CAN-CB-009'],
      title: "Use the editor's escape gesture to leave the quotation",
      precondition: 'The caret is at the end of a quotation containing "sample".',
      // Editors disagree about what the escape gesture IS - Lexical exits on any
      // Enter (QuoteNode.insertNewAfter), CKEditor needs an Enter on an empty
      // paragraph - and this clause is not the place to adjudicate that. The
      // gesture (key and terminating bound) is declared in the subject's
      // adapter (gestures.escape.blockquote; the canonical definition and its
      // rationale are in adapters/gestures.mjs). The loop presses the key,
      // OBSERVES whether the caret is still inside, and presses again only if
      // it is. That is a state-driven branch, not a retry: both known
      // contracts are satisfied by the same bound, and what is asserted is
      // that the transition was conveyed, not which keystroke caused it.
      operationText: 'Press Enter; if the caret is still inside the quotation, press Enter again.',
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type('> ')
        await driver.type(BODY)
        await probeSetup(driver, 'blockquote.exit')
      },
      actions: async (driver) => {
        const esc = gesturesFor(driver.subjectMeta?.id).escape.blockquote
        probe.enters = 0
        for (;;) {
          await driver.press(esc.key)
          probe.enters += 1
          if (probe.enters >= esc.maxPresses) break
          probe.mid = await readContainment(driver)
          if (!probe.mid.inQuote) break
        }
        await probeAfter(driver)
      },
      resultState: [
        gated(exitStructure, quoteGate('there is no quotation to leave')),
        exitContentPreserved,
      ],
      announcement: [exitAnnounced, exitDirection],
    }),

    operation({
      id: 'blockquote.destroy',
      // The container is meant to be gone; see `destructive` in contract.mjs.
      destructive: true,
      scenarios: ['CAN-CB-012'],
      title: 'Backspace at the very start of the quotation',
      precondition: 'The caret is collapsed at offset 0 of a quotation containing "sample".',
      operationText: 'Press Backspace.',
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type('> ')
        await driver.type(BODY)
        await driver.press('Home')
        await probeSetup(driver, 'blockquote.destroy')
      },
      actions: async (driver) => {
        await driver.press('Backspace')
        await probeAfter(driver)
      },
      resultState: [
        gated(destroyStructure, quoteGate('there is no quotation to dissolve')),
        destroyContentPreserved,
      ],
      announcement: [destroyAnnounced, destroyRemoval],
    }),
  ],
})

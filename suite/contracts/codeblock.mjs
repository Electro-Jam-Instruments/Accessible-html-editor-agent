/**
 * contracts/codeblock.mjs — the container an editor demonstrably gets right.
 *
 * Work-queue item A4. Every other clause in this harness measures a gap. This
 * one measures a **bar that has already been cleared**, and that is its whole
 * value: CKEditor 5 announces "Entering %0 code snippet" — with the language
 * name — from about twelve lines hooked on `selection.on('change:range')` that
 * diff `focus.parent`. Because the hook is on the *selection* rather than on the
 * command, every entry and exit vector is covered for free: autoformat, toolbar,
 * arrow in from above or below, Backspace merging you in, undo relocating you
 * in, Enter out, arrow out, toggle out (CAN-CB-018 through CAN-CB-031). It is
 * the existence proof the rest of this project rests on — the ask to maintainers
 * is not "do a large amount of work", it is "do what the code block already
 * does, for the containers next to it in the same repository".
 *
 * The four clauses, and the canonical rows they measure:
 *
 *   create    E1  a fence of three backticks becomes a code block   CAN-CB-018
 *   enter     E3  arrow down into an existing code block from above CAN-CB-020
 *   exit      X1  the editor's escape gesture leaves it             CAN-CB-026
 *   language  E1  ```js — is the LANGUAGE conveyed at all?          CAN-CB-018
 *
 * The assertion SHAPES — container-created, container-entered/exited with
 * their precondition guards, announcement-conveys with the exactly-once and
 * politeness refinements, and C-5's leaving-is-not-removal — live in
 * ../invariants.mjs. What stays here is code-block-specific: the probe that
 * knows both editors' markup, the escape LOOP, and the language logic.
 *
 * ---------------------------------------------------------------------------
 * Writing a clause that CKEditor would pass
 * ---------------------------------------------------------------------------
 * There is no CKEditor subject in the harness yet, so this run is red
 * everywhere. That makes the fairness of the vocabulary un-checkable by
 * experiment, and it has to be argued instead. Three deliberate choices:
 *
 *   1. The container matcher accepts "code snippet" as readily as "code block".
 *      CKEditor's string is "Entering %0 code snippet"; Lexical's hypothetical
 *      one would be "Code block". A clause that demanded either wording would be
 *      a snapshot test of one project's copy, not a contract.
 *   2. Nothing requires a direction word on ENTRY. "Entering …" is CKEditor's
 *      house style and it is good style, but naming the container as you arrive
 *      is the established convention (it is how NVDA itself reports a container
 *      in browse mode), and a correct implementation must not fail on house
 *      style. Direction IS required on EXIT, where the whole content of the
 *      announcement is that you are now outside.
 *   3. The escape gesture is not specified. Editors disagree — measured here,
 *      Lexical needs THREE Enters from the end of a line (two to build the
 *      trailing blank lines `$exitCodeNodeOnEnter` looks for, one to leave);
 *      CKEditor needs one empty last line, so two. `exit` presses Enter, READS
 *      THE CONTAINMENT STACK, and presses again only while the reading still
 *      says "inside". The loop condition is an observation of the document, not
 *      a retry budget and not a delay (CLAUDE.md); the bound exists only so a
 *      driver loop terminates, and if it is ever reached the assertion says so
 *      in those words instead of reporting a clean failure.
 *
 * ---------------------------------------------------------------------------
 * Why `language` is measured separately, and why it is a SHOULD
 * ---------------------------------------------------------------------------
 * "You are in a code block" and "you are in a JavaScript code block" are
 * different facts, and the second one changes what the following keystrokes
 * mean. Every editor surveyed stores the language — Lexical as
 * `data-language="js"` on the `<code>`, CKEditor as `class="language-javascript"`
 * on it — and **neither attribute is visible to an assistive technology**:
 * `data-*` and `class` contribute nothing to the accessible name, description or
 * any computed property. So the language splits cleanly across the two halves of
 * the operation:
 *
 *   resultState   is the language readable from the accessibility tree at all?
 *                 Expected NO for everyone, including CKEditor. It is a
 *                 DOM-only fact.
 *   announcement  did anything say it at the moment of entry? Expected YES for
 *                 CKEditor alone, and for nobody else in the corpus.
 *
 * An editor that passes the announcement half and fails the state half scores
 * `told-only` on this operation, and that is the honest reading: heard once,
 * with nothing to return to. It is also why CAN-CB-032 (the language is later
 * CHANGED) is the one hole in CKEditor's otherwise complete implementation —
 * `focus.parent` is unchanged, so `change:range` never fires, and the user is
 * still working from "Entering JavaScript code snippet" for a block that is now
 * Python. This clause does not measure that vector; it measures the weaker
 * precondition, whether the language is ever conveyed at all.
 *
 * SHOULD, not MUST, because an editor that says "code block" and nothing else
 * has still told the user the load-bearing fact. The MUST level on every
 * operation here asks only the containment question.
 *
 * And what is judged is the language the block ACTUALLY HAS, not the token that
 * was typed. Lexical's fence regex captures one (`data-language="js"`);
 * CKEditor's autoformat pattern is a bare /^```$/ and assigns the configured
 * default instead, so "Entering Plain text code snippet" from CKEditor has named
 * its block's language, correctly, and passes. Insisting on "JavaScript" would
 * have failed the one editor this clause was written to be passable by — see
 * `languageCandidates` below.
 *
 * ---------------------------------------------------------------------------
 * What counts as a code block
 * ---------------------------------------------------------------------------
 * Editor-neutral and read from the DOM, because the two known implementations
 * disagree about the markup:
 *
 *   Lexical    <code spellcheck="false" data-language="js"> as a direct child
 *              of the editing host. No <pre> anywhere in the live DOM — only
 *              exportDOM emits one.
 *   CKEditor   <pre><code class="language-javascript">.
 *
 * So a code block is: a `<pre>`, or anything carrying a language marker, or any
 * `<code>`/`[role=code]` that is a top-level block of the editing host — and
 * where one such element contains another, the outermost wins, so `<pre><code>`
 * counts once. Inline code inside a paragraph is excluded by construction: it is
 * neither `<pre>`, nor language-marked, nor a top-level block.
 *
 * A note on the AX layer, because canonical.md is wrong about it and the
 * correction matters: CAN-CB-018 says Lexical's CodeNode "is a bare <code> with
 * no role". Measured, Chromium computes **role `code`** for that element and
 * exposes it in the accessibility tree (HTML-AAM maps `<code>` to the ARIA
 * `code` role). The structure IS there to be found. What is missing is the
 * language, the `<pre>`, and any announcement — a narrower and still-real gap.
 * The structural MUST below is therefore satisfiable by Lexical today, and the
 * failures it reports are announcement failures, which is the true finding.
 *
 * ---------------------------------------------------------------------------
 * Subjects with no code block at all
 * ---------------------------------------------------------------------------
 * The markdown textareas keep the fence as three literal backticks in a string.
 * `create` and `language` have an honest textual equivalent and are scored PASS~
 * on intent, exactly as heading.mjs scores `"# title"`. `enter` and `exit` have
 * none — there is no container to arrive in or leave — so they report NOT
 * APPLICABLE in the first phrase of their detail and are still counted as
 * unsatisfied, because the honest outcome for those subjects is `absent`:
 * nothing announced and no structure to navigate back to. Read a FAIL on
 * `enter.structure` as "this editor has no code block", never as "this editor's
 * announcer is broken".
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

/* Invariant predicates (../invariants.mjs): the assertion shapes, keyed to the
 * conformance-suite invariants they implement. */
import {
  staleProbe,
  containerCreated,
  containerEntered,
  containerExited,
  enteredWithoutEditing,
  contentPreserved,
  announcementConveys,
  announcedOnce,
  announcedPolitely,
  exitConveysLeavingNotRemoval,
} from '../invariants.mjs'

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/*                                                                     */
/* The accepted surface forms live in ../vocabulary.mjs, one entry per  */
/* semantic token, with the fairness decisions recorded there:          */
/*   container:codeblock   "code snippet" (CKEditor's word) passes as   */
/*                         readily as "code block"                      */
/*   direction:left /      C-5 — leaving is not removal; asserted       */
/*   direction:removed     against each other on exit                   */
/*   language:X            spoken aliases are accepted (js/JavaScript), */
/*                         via names()'s word-boundary match with the   */
/*                         5+-char normalised-substring fallback        */
/* ------------------------------------------------------------------ */

import {
  CONTAINER_CODEBLOCK as NAMES_CODE,
  DIRECTION_LEFT as CONVEYS_LEAVING,
  DIRECTION_REMOVED as CONVEYS_REMOVAL,
  expandLanguage,
  mentionsLanguage,
} from '../vocabulary.mjs'

/* Adapters (../adapters/index.mjs): the per-subject capability declaration
 * and gesture table (P0.5 session 3). The navigation vectors (enter, exit)
 * and the language-exposure check need a real code block to exist, and
 * whether one CAN exist is now declared per subject rather than re-probed
 * each run: a flat field declares no 'realStructure', a bare contenteditable
 * declares no 'codeblock', and either absence makes those checks n/a by
 * declaration. Where both are declared, the probe runs exactly as before.
 * The escape gesture (key and terminating bound) comes from the adapter. */
import { requireCapability, gesturesFor } from '../adapters/index.mjs'

/** Gate an assertion on declared capabilities: absent -> declared n/a. */
const gated = (a, gate) => ({ ...a, evaluate: (ctx) => gate(ctx) ?? a.evaluate(ctx) })

/** The code-block vectors need real structure AND a real code block. */
const codeGate = (what) => ({ subject }) =>
  requireCapability(
    subject,
    'realStructure',
    `${what} — the fence is three literal backticks in a string at every layer of this subject`,
  ) ?? requireCapability(subject, 'codeblock', what)

/**
 * Every string that would count as naming THIS block's language.
 *
 * Deliberately includes the language the editor actually recorded, not only the
 * `js` that was typed. Editors disagree about whether the fence carries a
 * language at all: Lexical's CODE_START_REGEX captures one (`data-language="js"`),
 * while CKEditor's autoformat pattern is a bare /^```$/ and assigns the default
 * language instead — so an announcement of "Entering Plain text code snippet"
 * from CKEditor HAS named the block's language, correctly, and a clause that
 * insisted on "JavaScript" would fail the one editor it was written to be
 * passable by. What is measured is "is the block's language conveyed", never
 * "did the fence syntax survive".
 */
function languageCandidates(c) {
  const observed = (c?.after?.blocks || [])
    .map((b) => b.domOnly.dataLanguage || b.domOnly.languageClass)
    .filter(Boolean)
  return {
    observed,
    all: [...new Set([...observed.flatMap(expandLanguage), ...expandLanguage(LANG)])],
  }
}

/* The fence, the language token, and the body are chosen so that nothing the
 * user types contains a word any matcher looks for. "sample" is not "code";
 * three backticks are not "snippet". An editor that merely echoes the line it is
 * on therefore cannot be mistaken for one that named the container — except on
 * the LANGUAGE matcher, where "js" is by necessity in the typed text. That is
 * why the language assertions judge the language *on the announcement that
 * already named the container*, never on the journal at large. */
const FENCE = '```'
const LANG = 'js'
const BODY = 'sample'
const ABOVE = 'above'

/* The escape gesture — the key and the loop's terminating bound — is declared
 * in the subject's adapter (gestures.escape.codeblock; the canonical
 * definition and its rationale are in adapters/gestures.mjs). The bound is
 * NOT a retry budget: the loop stops the moment the containment reading says
 * the caret is outside, and every iteration is gated on that reading. Four is
 * simply past both known contracts (Lexical 3, CKEditor 2) with headroom, so
 * that reaching it is itself a finding and is reported as one. */

/* ------------------------------------------------------------------ */
/* Containment probe                                                   */
/* ------------------------------------------------------------------ */

/**
 * Read-only. Returns the ancestor chain of the selection anchor, which code
 * blocks exist in the document at all, and — for each of them — every place a
 * language could have been recorded, split into the ones an assistive technology
 * can read and the ones it cannot.
 *
 * Containment cannot be answered from the standard snapshot. Its caret is
 * "visible characters before the caret", which flattens block boundaries: after
 * `above` plus a code block holding `sample`, offset 5 is both the end of the
 * paragraph and the start of the code block, and the entire enter/exit
 * distinction lives inside that ambiguity. So this reads the real selection at
 * the settled point the driver has already reached — an observation of a real
 * signal at a real sync point, nothing scheduled.
 */
const READ_CONTAINMENT_FN = `
(sel) => {
  const el = document.querySelector(sel);
  if (!el) return { error: 'editor not found: ' + sel };
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return {
      shape: 'field', stack: [], inCode: false, blocks: [],
      text: el.value, caret: { start: el.selectionStart, end: el.selectionEnd },
      collapsed: el.selectionStart === el.selectionEnd,
    };
  }
  const CODE_SEL = 'pre, code, [role="code"], [data-language], [class*="language-"]';
  const cls = (n) => n.getAttribute('class') || '';
  const all = [...el.querySelectorAll(CODE_SEL)];
  const candidates = all.filter((n) => {
    if (n.tagName === 'PRE') return true;                    // CKEditor's wrapper
    if (n.hasAttribute('data-language')) return true;        // Lexical's marker
    if (/(^|\\s)language-/.test(cls(n))) return true;        // highlight.js convention
    if (n.parentElement === el) return true;                 // a top-level block
    return false;
  });
  // Outermost wins, so <pre><code> is one block and not two.
  const blocks = candidates.filter((n) => !candidates.some((m) => m !== n && m.contains(n)));
  const describe = (n) => {
    const inner = n.querySelector('code') || n;
    const langClass = (cls(n) + ' ' + cls(inner)).match(/(?:^|\\s)language-([\\w-]+)/);
    return {
      tag: n.tagName.toLowerCase(),
      text: n.textContent.replace(/\\s+/g, ' ').trim(),
      // Recorded by the editor, invisible to an assistive technology.
      domOnly: {
        dataLanguage: n.getAttribute('data-language') || inner.getAttribute('data-language') || null,
        languageClass: langClass ? langClass[1] : null,
      },
      // Anything here DOES reach the accessibility tree.
      accessible: {
        ariaLabel: n.getAttribute('aria-label') || inner.getAttribute('aria-label') || null,
        ariaRoleDescription:
          n.getAttribute('aria-roledescription') || inner.getAttribute('aria-roledescription') || null,
        ariaDescription:
          n.getAttribute('aria-description') || inner.getAttribute('aria-description') || null,
        title: n.getAttribute('title') || inner.getAttribute('title') || null,
        describedBy: n.getAttribute('aria-describedby') || inner.getAttribute('aria-describedby') || null,
        labelledBy: n.getAttribute('aria-labelledby') || inner.getAttribute('aria-labelledby') || null,
      },
    };
  };
  const s = document.getSelection();
  const stack = [];
  let inCode = false;
  if (s && s.anchorNode && el.contains(s.anchorNode)) {
    let n = s.anchorNode;
    if (n.nodeType === 1 && n.childNodes[s.anchorOffset]) n = n.childNodes[s.anchorOffset];
    if (n.nodeType === 3) n = n.parentElement;
    while (n && n !== el) {
      const tag = n.tagName.toLowerCase();
      const role = (n.getAttribute('role') || '').toLowerCase();
      stack.unshift(role ? tag + '[role=' + role + ']' : tag);
      if (blocks.includes(n)) inCode = true;
      n = n.parentElement;
    }
  }
  return {
    shape: 'contenteditable',
    stack,
    inCode,
    blocks: blocks.map(describe),
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
const probe = {
  subjectId: null,
  opId: null,
  before: null,
  after: null,
  steps: [],
  enters: 0,
  hitBound: false,
}

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
  probe.after = null
  probe.steps = []
  probe.enters = 0
  probe.hitBound = false
  probe.before = await readContainment(driver)
}

/** Call at the end of actions. */
async function probeAfter(driver) {
  probe.after = await readContainment(driver)
}

/** Fetch the record, refusing to judge one that belongs to another run. */
function containment(subject, opId) {
  if (probe.opId !== opId || probe.subjectId !== subject.id || !probe.after) return null
  return probe
}

const STALE = staleProbe('containment reading')

/** A subject where the construct does not exist at any layer. */
function notApplicable(what) {
  return {
    pass: false,
    mode: 'textual-equivalent',
    detail:
      `NOT APPLICABLE — ${what} This subject has no code block at any layer: the fence is ` +
      `three literal backticks in a string. Recorded as unsatisfied because the honest ` +
      `outcome is "absent" (nothing announced, and no structure to navigate back to), ` +
      `which is what canonical.md records for this editor. It is a structural gap, not a ` +
      `silent announcer.`,
  }
}

/** Shared failure text for the announcement half. */
function noAnnouncement(after, crossing) {
  return (
    `nothing named the code block when ${crossing}. This is the one container in the ` +
    `corpus where an editor already does it: CKEditor announces "Entering %0 code snippet" ` +
    `for every entry and exit vector, from one listener on selection change:range ` +
    `(CAN-CB-018). observed: ${renderAnnouncements(after)}`
  )
}

/** Every place a language was found on the code blocks, rendered for detail. */
function languageEvidence(c) {
  if (!c || !c.after || !c.after.blocks.length) return '(no code block to inspect)'
  return c.after.blocks
    .map((b, i) => {
      const dom = Object.entries(b.domOnly)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      const acc = Object.entries(b.accessible)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      return (
        `<${b.tag}> #${i}: dom-only[${dom.join(', ') || 'none'}] ` +
        `accessible[${acc.join(', ') || 'none'}]`
      )
    })
    .join(' · ')
}

/** The AX-tree nodes that could carry the code container's identity. */
function axCodeNodes(after) {
  return [...axFind(after, 'code'), ...axFind(after, 'Pre'), ...axFind(after, 'pre')]
}

/** How the escape gesture actually went, for failure detail. */
function gestureTrace(c) {
  const n = c.enters
  const word = `${n} Enter${n === 1 ? '' : 's'}`
  const trace = c.steps.map((s, i) => `#${i + 1}${s.inCode ? ' inside' : ' OUT'}`).join(' ')
  return `${word} (${trace || 'no steps recorded'})`
}

/* ------------------------------------------------------------------ */
/* Clause 1 — create (E1, CAN-CB-018)                                  */
/* ------------------------------------------------------------------ */

const createStructure = containerCreated({
  assertionId: 'codeblock.create.structure',
  assertionStatement: 'A code block containing the typed text is conveyed.',
  assertionPhrase: 'convey a code block',
  priority: MUST,
  rich: ({ after, subject }) => {
    // Declared, not probed: a rich subject that declares no codeblock
    // capability will never produce the block. The plain branch below is NOT
    // gated — a flat field's textual equivalent is a genuine measurement.
    const na = requireCapability(
      subject,
      'codeblock',
      'typing a fence never produces a code block in this subject',
    )
    if (na) return na
    const c = containment(subject, 'codeblock.create')
    if (!c) return STALE
    const ax = axCodeNodes(after)
    const holdsText = c.after.blocks.some((b) => b.text.includes(BODY))
    if (ax.length >= 1 && holdsText) {
      return {
        pass: true,
        detail:
          `AX tree exposes ${ax.length} code node(s) (role ${ax.map((n) => n.role).join('/')}); ` +
          `the block holds ${JSON.stringify(BODY)}. caret stack: ` +
          `${c.after.stack.join(' › ') || '(none)'}. Note this contradicts CAN-CB-018's ` +
          `"a bare <code> with no role": Chromium maps <code> to the ARIA code role, so ` +
          `the container IS in the tree. What is absent is the language and the crossing.`,
      }
    }
    return {
      pass: false,
      detail:
        `no code block holding ${JSON.stringify(BODY)} in the editor's AX subtree ` +
        `(${ax.length} code/pre AX node(s), ${c.after.blocks.length} code element(s) in the DOM). ` +
        `text is ${JSON.stringify(after.domText)}. subtree: ${axSummary(after)}`,
    }
  },
  // Plain-markdown subjects: the characters survive and mean "code block" in
  // some other renderer. That is the whole of what they can do.
  plain: {
    expectedText: `${FENCE} ${BODY}`,
    passDetail:
      `source text is ${JSON.stringify(`${FENCE} ${BODY}`)} — markdown that renders as a code ` +
      `block elsewhere, but the edited field exposes one textbox whose value happens ` +
      `to start with three backticks. There is no code block for a caret to be inside, ` +
      `so neither of the navigation vectors in this clause can even arise.`,
  },
})

// Caret placement is per-operation arithmetic against this clause's own probe,
// not one of the shared containment/announcement invariants — bespoke.
const createCaret = assertion({
  assertionId: 'codeblock.create.caret',
  assertionStatement: 'The caret is inside the code block, ready to type code.',
  assertionPhrase: 'place the caret inside the code block',
  priority: SHOULD,
  evaluate: ({ subject, after }) => {
    if (subject.kind === 'rich') {
      const c = containment(subject, 'codeblock.create')
      if (!c) return STALE
      const ok = c.after.inCode && c.after.collapsed
      return {
        pass: ok,
        mode: 'structural',
        detail: ok
          ? `caret is inside the code block: ${c.after.stack.join(' › ')}`
          : `caret is not inside a code block (stack: ${c.after.stack.join(' › ') || '(none)'}, ` +
            `collapsed=${c.after.collapsed})`,
      }
    }
    const n = `${FENCE} ${BODY}`.length
    const ok = after.caret && after.caret.start === n && after.caret.end === n
    return {
      pass: !!ok,
      mode: 'textual-equivalent',
      detail: `caret ${JSON.stringify(after.caret)}; expected collapsed at ${n} (after "${FENCE} ${BODY}")`,
    }
  },
})

const createAnnounced = announcementConveys({
  assertionId: 'codeblock.create.announcement',
  assertionStatement: 'The transformation into a code block is announced.',
  assertionPhrase: 'announce that a code block was created',
  priority: MUST,
  token: NAMES_CODE,
  missDetail: (after) => noAnnouncement(after, 'the block became a code block'),
})

const createAnnouncedOnce = announcedOnce({
  assertionId: 'codeblock.create.announcement-once',
  assertionStatement: 'The code block is announced exactly once.',
  assertionPhrase: 'announce the code block exactly once',
  priority: SHOULD,
  token: NAMES_CODE,
  manyDetail: (hits) =>
    `${hits.length} matching announcements — one crossing, repeated speech: ` +
    hits.map((h) => JSON.stringify(h.text)).join(' · '),
})

const createPolite = announcedPolitely({
  assertionId: 'codeblock.create.announcement-politeness',
  assertionStatement: 'The code-block announcement is polite, not assertive.',
  assertionPhrase: 'announce the code block politely',
  priority: SHOULD,
  token: NAMES_CODE,
})

/* ------------------------------------------------------------------ */
/* Clause 2 — enter by arrow (E3, CAN-CB-020)                          */
/* ------------------------------------------------------------------ */

const enterStructure = containerEntered({
  assertionId: 'codeblock.enter.structure',
  assertionStatement:
    'Arrowing down from the block above puts the caret inside the existing code block.',
  assertionPhrase: 'move the caret into the code block',
  priority: MUST,
  read: (subject) => containment(subject, 'codeblock.enter'),
  stale: STALE,
  notApplicable: () => notApplicable('there is no code block to arrow into.'),
  containersBefore: (c) => c.before.blocks.length,
  inside: (state) => state.inCode,
  noContainerDetail: () =>
    `precondition not reached: setup typed a fence and this subject produced no code ` +
    `block (0 code elements), so there is no container to enter. A structural gap ` +
    `upstream of anything this clause can measure about crossings.`,
  alreadyInsideDetail: (c) =>
    `precondition not reached: the caret was already inside the code block before the ` +
    `ArrowDown (stack: ${c.before.stack.join(' › ')}), so no crossing was exercised.`,
  crossedDetail: (c) =>
    `containment stack changed ${c.before.stack.join(' › ') || '(root)'} → ` +
    `${c.after.stack.join(' › ')}: a real crossing, by a code path that has nothing to ` +
    `do with the fence transform (invariant C-3). This is the vector CKEditor gets for ` +
    `free by hooking the selection instead of the command.`,
  notCrossedDetail: (c) =>
    `ArrowDown did not put the caret in the code block: ` +
    `${c.before.stack.join(' › ') || '(root)'} → ${c.after.stack.join(' › ') || '(root)'}`,
})

const enterNoEdit = enteredWithoutEditing({
  assertionId: 'codeblock.enter.no-edit',
  assertionStatement: 'Entering by navigation does not modify the document.',
  assertionPhrase: 'enter the code block without editing it',
  priority: SHOULD,
  read: (subject) => containment(subject, 'codeblock.enter'),
  inside: (state) => state.inCode,
})

const enterAnnounced = announcementConveys({
  assertionId: 'codeblock.enter.announcement',
  assertionStatement:
    'Arriving in the code block by arrow announces the same container identity as creating it (C-3).',
  assertionPhrase: 'announce the code block on arrow entry',
  priority: MUST,
  token: NAMES_CODE,
  missDetail: (after) =>
    noAnnouncement(after, 'the caret arrived inside the code block') +
    ' — note this vector is a caret movement, not a text transform, so an announcer ' +
    'hooked on the transform passes codeblock.create and fails here (invariant C-3). ' +
    'CKEditor passes both from the same twelve lines because it hooked neither: it ' +
    'hooked the selection.',
})

const enterAnnouncedOnce = announcedOnce({
  assertionId: 'codeblock.enter.announcement-once',
  assertionStatement: 'The arrival is announced exactly once.',
  assertionPhrase: 'announce the arrival exactly once',
  priority: SHOULD,
  token: NAMES_CODE,
  manyDetail: (hits) =>
    `${hits.length} matching announcements for one crossing: ` +
    hits.map((h) => JSON.stringify(h.text)).join(' · '),
})

/* ------------------------------------------------------------------ */
/* Clause 3 — exit by the editor's escape gesture (X1, CAN-CB-026)     */
/* ------------------------------------------------------------------ */

const exitStructure = containerExited({
  assertionId: 'codeblock.exit.structure',
  assertionStatement:
    "The editor's escape gesture leaves the code block: the caret is outside it and the block still exists.",
  assertionPhrase: 'leave the code block without destroying it',
  priority: MUST,
  read: (subject) => containment(subject, 'codeblock.exit'),
  stale: STALE,
  notApplicable: () => notApplicable('there is no code block to leave.'),
  containersBefore: (c) => c.before.blocks.length,
  inside: (state) => state.inCode,
  survived: (c) => c.after.blocks.some((b) => b.text.includes(BODY)),
  // The escape LOOP's terminating bound (see the operation): reaching it is
  // reported in its own words, never as a clean failure.
  extraFail: (c, { out }) =>
    c.hitBound && !out
      ? {
          pass: false,
          mode: 'structural',
          detail:
            `still inside the code block after ${gestureTrace(c)}, which is this clause's ` +
            `terminating bound. The bound is not a verdict about the editor: it means no ` +
            `Enter-based escape was observed within more presses than either known contract ` +
            `needs (Lexical 3, CKEditor 2), so either this editor's exit is a different ` +
            `gesture entirely or it has none (invariant C-7). Read it as "not measured here", ` +
            `not as "no exit exists".`,
        }
      : null,
  noContainerDetail: () =>
    `precondition not reached: setup typed a fence and this subject produced no code ` +
    `block, so there is nothing to escape from. Invariant C-7 (every container has at ` +
    `least one keyboard exit) cannot even be posed.`,
  leftDetail: (c) =>
    `left after ${gestureTrace(c)}: ${c.before.stack.join(' › ')} → ` +
    `${c.after.stack.join(' › ') || '(root)'}, and the code block still holds ` +
    `${JSON.stringify(BODY)}. The caret moved; the document's structure did not. ` +
    `The count is itself the finding — the same editor's blockquote and list exit on ` +
    `different counts (CAN-CB-026).`,
  destroyedNotExitedDetail: (c) =>
    `after ${gestureTrace(c)} the caret is outside, but no code block holds ` +
    `${JSON.stringify(BODY)} any more (${c.after.blocks.length} code element(s)). That ` +
    `is a destruction, not an exit — a different fact, and it must not be announced as ` +
    `one (invariant C-5).`,
  stillInsideDetail: (c) =>
    `still inside the code block after ${gestureTrace(c)} (stack: ${c.after.stack.join(' › ')}).`,
})

const exitContentPreserved = contentPreserved({
  assertionId: 'codeblock.exit.content-preserved',
  assertionStatement: 'Leaving the code block loses none of its content.',
  assertionPhrase: 'leave the code block with its content intact',
  priority: SHOULD,
  body: BODY,
  passDetail: `${JSON.stringify(BODY)} still present after the escape gesture`,
  failDetail: (after) => `${JSON.stringify(BODY)} is gone: ${JSON.stringify(after.domText)}`,
})

const exitAnnounced = announcementConveys({
  assertionId: 'codeblock.exit.announcement',
  assertionStatement: 'Leaving the code block is announced.',
  assertionPhrase: 'announce leaving the code block',
  priority: MUST,
  token: NAMES_CODE,
  missDetail: (after) =>
    noAnnouncement(after, 'the caret left the code block') +
    ' — and unlike entry, nothing rescues this one: there is no structure at the new ' +
    'position for the user to navigate to and discover that they are out. It also ' +
    'matters more here than for any other container, because the keystroke semantics ' +
    'inside a code block are different (autoformat off, Tab literal, spellcheck off — ' +
    'CAN-CB-033, CAN-CB-034) and the user has just silently got them back.',
})

const exitDirection = exitConveysLeavingNotRemoval({
  assertionId: 'codeblock.exit.announcement-direction',
  assertionStatement:
    'The announcement says the code block was left, and does not say it was removed (C-5).',
  assertionPhrase: 'distinguish leaving from removing',
  priority: SHOULD,
  names: NAMES_CODE,
  leaving: CONVEYS_LEAVING,
  removal: CONVEYS_REMOVAL,
  removedDetail: (hit) =>
    `${JSON.stringify(hit.text)} says the code block was REMOVED. It was not — the ` +
    `caret moved out and the block is still there. Invariant C-5.`,
  directionlessDetail: (hit) =>
    `${JSON.stringify(hit.text)} names the code block but not the direction, so it is ` +
    `indistinguishable from the announcement for entering it. The user cannot tell ` +
    `whether they are in or out — which is the state they were trying to establish.`,
})

/* ------------------------------------------------------------------ */
/* Clause 4 — the language (E1 with a language, CAN-CB-018)            */
/* ------------------------------------------------------------------ */

const languageStructure = containerCreated({
  assertionId: 'codeblock.language.structure',
  assertionStatement: 'A code block containing the typed text is conveyed.',
  assertionPhrase: 'convey a code block from a language-tagged fence',
  priority: MUST,
  rich: ({ after, subject }) => {
    // Declared, not probed, exactly as codeblock.create.structure.
    const na = requireCapability(
      subject,
      'codeblock',
      'typing a language-tagged fence never produces a code block in this subject',
    )
    if (na) return na
    const c = containment(subject, 'codeblock.language')
    if (!c) return STALE
    const ax = axCodeNodes(after)
    const holdsText = c.after.blocks.some((b) => b.text.includes(BODY))
    if (ax.length >= 1 && holdsText) {
      return {
        pass: true,
        detail:
          `AX tree exposes ${ax.length} code node(s); the block holds ${JSON.stringify(BODY)}. ` +
          `language evidence: ${languageEvidence(c)}`,
      }
    }
    return {
      pass: false,
      detail:
        `no code block holding ${JSON.stringify(BODY)} after a "${FENCE}${LANG}" fence ` +
        `(${ax.length} code/pre AX node(s), ${c.after.blocks.length} code element(s)). ` +
        `text is ${JSON.stringify(after.domText)}. subtree: ${axSummary(after)}`,
    }
  },
  plain: {
    expectedText: `${FENCE}${LANG} ${BODY}`,
    passDetail:
      `source text is ${JSON.stringify(`${FENCE}${LANG} ${BODY}`)} — markdown that names its language to ` +
      `a renderer somewhere else. Inside this field it is one textbox value; there is no ` +
      `code block and therefore no language for anything to convey.`,
  },
})

// Bespoke, not a shared invariant: whether the LANGUAGE reaches the
// accessibility layer is this contract's own question (no other container
// carries one), and the answer needs the probe's dom-only/accessible split,
// the name-from-contents exclusion, and the language-actually-recorded rule —
// none of which recur elsewhere.
const languageState = assertion({
  assertionId: 'codeblock.language.state',
  assertionStatement:
    'The code block\'s language is readable from the accessibility tree, not only from the DOM.',
  assertionPhrase: 'expose the language to assistive technology',
  priority: SHOULD,
  evaluate: ({ after, subject }) => {
    if (subject.kind !== 'rich') {
      return notApplicable('there is no code block whose language could be exposed.')
    }
    const c = containment(subject, 'codeblock.language')
    if (!c) return STALE
    if (!c.after.blocks.length) {
      return {
        pass: false,
        mode: 'structural',
        detail: 'precondition not reached: no code block was produced, so it has no language.',
      }
    }
    // Anything that reaches the accessibility tree: an accessible name or
    // description on the container, or a name on its AX node. A name that is
    // merely the block's own text is not the language being exposed — it is
    // name-from-contents — so it is excluded.
    const cands = languageCandidates(c)
    const blockTexts = new Set(c.after.blocks.map((b) => b.text))
    const axNamed = axCodeNodes(after).filter(
      (n) => n.name && !blockTexts.has(n.name.trim()) && mentionsLanguage(n.name, cands.all),
    )
    const accessible = c.after.blocks.filter((b) =>
      Object.values(b.accessible).some((v) => v && mentionsLanguage(v, cands.all)),
    )
    if (axNamed.length || accessible.length) {
      return {
        pass: true,
        mode: 'structural',
        detail:
          `the language reaches the accessibility layer: ` +
          (axNamed.length ? `AX name ${JSON.stringify(axNamed[0].name)}. ` : '') +
          languageEvidence(c),
      }
    }
    const domOnly = c.after.blocks.some((b) => b.domOnly.dataLanguage || b.domOnly.languageClass)
    return {
      pass: false,
      mode: 'structural',
      detail: domOnly
        ? `the editor KNOWS the language and stores it where no assistive technology will ` +
          `ever see it — ${languageEvidence(c)}. Neither data-* attributes nor class names ` +
          `contribute to the accessible name, description or any computed property, and the ` +
          `code element carries no aria-label, aria-roledescription or title. So the language ` +
          `is a fact the editor has, the sighted user reads off the syntax colouring, and the ` +
          `screen-reader user can only be told by an announcement — which is why the ` +
          `announcement half of this operation is the one that matters (CAN-CB-018), and why ` +
          `CKEditor's implementation degrades to told-only rather than announced.`
        : `no language anywhere: ${languageEvidence(c)}. The fence "${FENCE}${LANG}" named one ` +
          `and the editor discarded it.`,
    }
  },
})

const languageAnnounced = announcementConveys({
  assertionId: 'codeblock.language.announcement',
  assertionStatement: 'Entering the language-tagged code block is announced.',
  assertionPhrase: 'announce the code block created from a language-tagged fence',
  priority: MUST,
  token: NAMES_CODE,
  missDetail: (after) =>
    noAnnouncement(after, `a "${FENCE}${LANG}" fence became a code block`) +
    ' — measured separately from codeblock.create because it is a different keystroke ' +
    'sequence through the same transform, and an editor could plausibly handle the bare ' +
    'fence and not the tagged one.',
})

// Bespoke for the same reason as languageState: the refinement is not a fixed
// vocabulary token but the set of aliases for the language the block ACTUALLY
// records (languageCandidates), judged only on the announcement that already
// named the container. announcementRefines takes a RegExp; this needs the
// containment probe and mentionsLanguage().
const languageNamed = assertion({
  assertionId: 'codeblock.language.announcement-language',
  assertionStatement: 'The announcement names the language of the code block.',
  assertionPhrase: 'name the language',
  priority: SHOULD,
  evaluate: ({ after, subject }) => {
    // Judged on the announcement that already named the container, never on the
    // journal at large: "js" is by necessity in the text the user typed, so an
    // editor that merely echoes the line must not be able to pass this.
    const hit = matchAnnouncement(after, NAMES_CODE)
    if (!hit) return { pass: false, detail: 'no announcement to judge' }
    const c = containment(subject, 'codeblock.language')
    const cands = languageCandidates(c)
    const named = mentionsLanguage(hit.text, cands.all)
    if (named) {
      return {
        pass: true,
        detail:
          `names the language (${JSON.stringify(named)}): ${JSON.stringify(hit.text)}` +
          (cands.observed.length ? ` — block records ${JSON.stringify(cands.observed[0])}` : ''),
      }
    }
    return {
      pass: false,
      detail:
        `${JSON.stringify(hit.text)} names the container but not the language. Accepted ` +
        `wordings were ${JSON.stringify(cands.all)} — the language the block actually ` +
        `records${cands.observed.length ? ` (${JSON.stringify(cands.observed[0])})` : ' (none recorded)'}, ` +
        `plus the token that was typed and its aliases. This is the detail CKEditor gets ` +
        `right and nobody else does: "Entering JavaScript code snippet" tells the user what ` +
        `the following keystrokes will mean, and "code block" alone does not. SHOULD, ` +
        `because the container is the load-bearing fact — but it is the difference between ` +
        `the best announcement in the corpus and a merely adequate one.`,
    }
  },
})

/* ------------------------------------------------------------------ */

export default contract({
  id: 'codeblock',
  title: 'Code block: create, enter, exit, language',
  description:
    'The one container an editor demonstrably gets right. CKEditor announces every entry ' +
    'and exit vector, with the language name, from one listener on selection change:range ' +
    '(CAN-CB-018) — so this clause is written to be passable, and measures how far the ' +
    'others are from a bar that has already been cleared. create and enter must convey the ' +
    'same identity by different code paths (C-3); exit must be conveyed whatever gesture ' +
    'the editor requires; the language is a SHOULD, measured in both halves because every ' +
    'editor stores it somewhere no assistive technology can read.',
  operations: [
    operation({
      id: 'codeblock.create',
      scenarios: ['CAN-CB-018'],
      title: 'Type a fence of three backticks at the start of an empty line',
      precondition: 'The editor is focused and empty; the caret is at offset 0.',
      operationText: `Type "${FENCE}", Space, then "${BODY}".`,
      setup: async (driver) => {
        await driver.focusEditor()
        await probeSetup(driver, 'codeblock.create')
      },
      actions: async (driver) => {
        await driver.type(FENCE)
        await driver.type(' ')
        await driver.type(BODY)
        await probeAfter(driver)
      },
      resultState: [createStructure, createCaret],
      announcement: [createAnnounced, createAnnouncedOnce, createPolite],
    }),

    operation({
      id: 'codeblock.enter',
      scenarios: ['CAN-CB-020'],
      title: 'Arrow down into an existing code block from the block above',
      precondition:
        'A paragraph "above" is followed by a code block containing "sample"; the caret is ' +
        'at the start of the paragraph, outside the code block.',
      operationText: 'Press ArrowDown.',
      // Typed, never injected: the precondition is reached the way a user would
      // reach it, so no subject can expose a hook that flatters it. The ArrowUp
      // and Home are part of setup, so any announcement they cause is discarded
      // before the operation is measured.
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type(ABOVE)
        await driver.press('Enter')
        await driver.type(`${FENCE} `)
        await driver.type(BODY)
        await driver.press('ArrowUp')
        await driver.press('Home')
        await probeSetup(driver, 'codeblock.enter')
      },
      actions: async (driver) => {
        await driver.press('ArrowDown')
        await probeAfter(driver)
      },
      resultState: [
        gated(enterStructure, codeGate('there is no code block to arrow into')),
        enterNoEdit,
      ],
      announcement: [enterAnnounced, enterAnnouncedOnce],
    }),

    operation({
      id: 'codeblock.exit',
      scenarios: ['CAN-CB-026'],
      title: "Use the editor's escape gesture to leave the code block",
      precondition: 'The caret is at the end of a code block containing "sample".',
      // Editors disagree about what the escape gesture IS, and this clause is
      // not the place to adjudicate that. Lexical's $exitCodeNodeOnEnter fires
      // only when the block's last two children are both linebreaks, so from the
      // end of a line it takes THREE Enters; CKEditor needs one empty last line,
      // so TWO. The loop presses Enter and then READS THE CONTAINMENT STACK,
      // pressing again only while the reading still says "inside". That is a
      // state-driven branch, not a retry and not a delay: the condition is an
      // observation of the document, the bound below exists only so the loop
      // terminates, and reaching it is reported in those words rather than as a
      // clean failure. What is asserted is that the transition was conveyed —
      // never which keystroke caused it.
      operationText:
        'Press Enter; keep pressing Enter while the caret is still observed inside the code block.',
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type(`${FENCE} `)
        await driver.type(BODY)
        await probeSetup(driver, 'codeblock.exit')
      },
      actions: async (driver) => {
        const esc = gesturesFor(driver.subjectMeta?.id).escape.codeblock
        for (let i = 0; i < esc.maxPresses; i++) {
          await driver.press(esc.key)
          probe.enters = i + 1
          const state = await readContainment(driver)
          probe.steps.push({ inCode: state.inCode, stack: state.stack })
          if (!state.inCode) break
          if (i === esc.maxPresses - 1) probe.hitBound = true
        }
        await probeAfter(driver)
      },
      resultState: [
        gated(exitStructure, codeGate('there is no code block to leave')),
        exitContentPreserved,
      ],
      announcement: [exitAnnounced, exitDirection],
    }),

    operation({
      id: 'codeblock.language',
      scenarios: ['CAN-CB-018'],
      title: 'Type a fence that names a language',
      precondition: 'The editor is focused and empty; the caret is at offset 0.',
      operationText: `Type "${FENCE}${LANG}", Space, then "${BODY}".`,
      setup: async (driver) => {
        await driver.focusEditor()
        await probeSetup(driver, 'codeblock.language')
      },
      actions: async (driver) => {
        await driver.type(`${FENCE}${LANG}`)
        await driver.type(' ')
        await driver.type(BODY)
        await probeAfter(driver)
      },
      resultState: [
        languageStructure,
        gated(languageState, codeGate('there is no code block whose language could be exposed')),
      ],
      announcement: [languageAnnounced, languageNamed],
    }),
  ],
})

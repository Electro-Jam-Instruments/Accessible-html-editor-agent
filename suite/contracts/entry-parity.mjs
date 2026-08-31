/**
 * contracts/entry-parity.mjs — the same container, reached two ways.
 *
 * Work-queue item A5, and the first COMPARATIVE clause in the suite. Every other
 * clause asks "what happened when I did X". This one asks "did doing X and doing
 * Y produce the same announcement", and it is the only shape of question that can
 * catch invariant C-3:
 *
 *   C-3  entering a container announces the same container identity regardless of
 *        which entry vector was used.
 *
 * ---------------------------------------------------------------------------
 * Why an ordinary suite cannot see this
 * ---------------------------------------------------------------------------
 * An editor that hooks the AUTOFORMAT COMMAND announces entry when you type `> `
 * and says nothing when you arrow in from the block above. Measured one vector at
 * a time, that editor scores one green row and one red row and looks like an
 * editor with a partial implementation. It is worse than that: it has taught the
 * user that quotation entry is signalled, so the silence on every other vector
 * now reads as "I am NOT in a quote". Silence they could have compensated for.
 * A signal that fires on one vector in five is a lie the user has been trained to
 * believe.
 *
 * Two measurements already in this repository say why the failure is structural
 * rather than an oversight:
 *
 *   - `blockquote.enter` MUTATES NOTHING. Before and after document text are
 *     byte-identical (results.json: "above\n\nsample" -> "above\n\nsample"); only
 *     the DOM ancestor chain changes, p>span -> blockquote>span. An announcer
 *     driven by node mutation — a transform hook, a MutationObserver, a command
 *     listener — is structurally incapable of firing here. There is no mutation.
 *   - CKEditor's code-block announcer hooks `selection.on('change:range')`
 *     instead, and therefore covers every entry vector for free, including the
 *     ones nobody wrote a test for.
 *
 * So C-3 is not a checklist item. It is the difference between hooking the wrong
 * signal and hooking the right one, and this clause is the smallest measurement
 * that tells them apart.
 *
 * ---------------------------------------------------------------------------
 * The pairs, and why these two per container
 * ---------------------------------------------------------------------------
 * Each operation reaches ONE container by TWO vectors and compares. Vector names
 * are from containment-state-machine.md.
 *
 *   blockquote   E1 autoformat  x  E5 backspace merge     CAN-CB-001 / CAN-CB-005
 *   codeblock    E1 autoformat  x  E5 backspace merge     CAN-CB-018 / CAN-CB-022
 *   list         E1 autoformat  x  E3 arrow down          CAN-CB-036 / CAN-CB-040
 *
 * E1 is one half of every pair on purpose: it is the vector editors DO hook, so
 * it is the reference against which the others are measured. A pair of two
 * unhooked vectors agrees trivially and proves nothing.
 *
 * blockquote and codeblock take E5 rather than E3 because the E1/E3 pair for both
 * is ALREADY measured, vector by vector, elsewhere in this suite:
 * `blockquote.create`/`blockquote.enter` in blockquote.mjs, and
 * `codeblock.create`/`codeblock.enter` in codeblock.mjs. Re-running those two
 * pairs here would add a comparison but no new observation. Pairing E1 with E5
 * adds a vector the corpus does not otherwise have anywhere, and E5 is the one
 * the state machine singles out as least handled in practice.
 *
 * list keeps E3 because nothing measures arrow entry into a list at all —
 * `bulleted-list.enter` is E8 (Enter continues the list), not an entry — so
 * CAN-CB-040 is uncovered, and E3 is the cheapest vector that is genuinely a
 * different code path from E1: it needs only a block ABOVE, reached by typing a
 * paragraph first. E5 for a list would have been affordable too; E3 was chosen so
 * the clause exercises all three of E1, E3 and E5 rather than two of them.
 *
 * ---------------------------------------------------------------------------
 * What "the same" means, precisely
 * ---------------------------------------------------------------------------
 * Identity is compared as the SET OF CONTAINER CONSTRUCTS NAMED, never as
 * wording. "Block quote", "blockquote", "quotation", "entering quote" are one
 * identity; "list item 1" is a different one. An editor is entitled to its house
 * style and this clause does not adjudicate it. It adjudicates only whether the
 * user was told the same THING.
 *
 * The four assertion kinds, per container:
 *
 *   both-reach      MUST  both vectors land the caret in that container. If one
 *                         does not, the comparison is VOID and says so. A void
 *                         comparison must never be reported as agreement — two
 *                         vectors that never arrived anywhere agree perfectly.
 *   both-announce   MUST  both vectors announce. Fails on asymmetry (the C-3
 *                         violation) AND on symmetric silence, because a clause
 *                         whose announcement MUSTs pass vacuously would score a
 *                         mute editor as `announced` in the outcome table.
 *   same-identity   MUST  when both announced, both named the same construct.
 *   neither         SHOULD a record, not a requirement: did anything speak at
 *                         all? It fails on total silence so the failure is
 *                         legible in the table, and it is SHOULD so it does not
 *                         double-count against the outcome.
 *
 * ---------------------------------------------------------------------------
 * How two vectors fit inside one operation
 * ---------------------------------------------------------------------------
 * The harness hands an assertion ONE `after` snapshot, which is one vector's
 * worth of evidence. So the operation runs both vectors itself:
 *
 *   for each vector:  navigate (fresh document, fresh journal)
 *                     focus, type the precondition the way a user would
 *                     read containment              <- the vector's `before`
 *                     resetAnnouncements()          <- preparation is not credited
 *                     perform the measured keystroke(s)
 *                     read containment + journal    <- the vector's `after`
 *
 * The re-navigation is the same reset run.mjs performs between operations, so the
 * second vector cannot inherit the first one's document, journal, undo stack or
 * focus. Every read happens at a point `driver.type`/`press`/`navigate` has
 * already settled through its frame-gated digest poll — no delay is introduced
 * anywhere, and nothing is scheduled (CLAUDE.md). A dropped announcement here
 * would show up as agreement, i.e. a FALSE PASS, which is the one failure mode
 * this clause cannot be allowed to have.
 *
 * A consequence worth knowing when reading results.json: the `__observed`
 * announcements recorded by run.mjs for these operations are the SECOND vector's
 * only, because the journal was reset before it. Both vectors' journals are in
 * the assertion details.
 *
 * Two more things a reader of results.json should know:
 *
 *   - The outcome table's 2x2 has no cell for "told on one route out of two", so
 *     an asymmetric row lands in `absent` (or `discoverable`) exactly as a fully
 *     silent one does. That is the right side of the line — a signal that fires
 *     on one vector is not a signal the user can rely on — but it means the
 *     outcome word alone does not distinguish a C-3 VIOLATION from plain silence.
 *     `.both-announce` does, and its detail names both vectors and what each said.
 *   - Silence here is not the observer failing to look. The same journal, in the
 *     same harness, records `lexical-next-max` announcing undo and redo through
 *     AriaLiveRegionExtension (A3, history.mjs), and records
 *     `textarea-markdown-fixed` announcing on E1 below. When this clause reports
 *     silence, nothing was emitted.
 *
 * ---------------------------------------------------------------------------
 * Flat fields (the markdown textareas)
 * ---------------------------------------------------------------------------
 * A textarea has no containment stack, so `both-reach` is answered by the
 * strongest thing a flat field can offer: the caret's LINE carries the markdown
 * marker for the construct. That is scored `textual-equivalent` (PASS~), never
 * structural, so `realStructure` stays false and such a subject can never be
 * reported as `discoverable`.
 *
 * This is deliberate and it is load-bearing. Recording these subjects as NOT
 * APPLICABLE — the convention blockquote.mjs uses, and the right one there —
 * would void the comparison for the only two subjects in the corpus that HAVE an
 * announcer, and it is precisely those subjects that can exhibit a C-3 violation
 * rather than mere silence. Voiding them would hide the finding.
 */

import { contract, operation } from '../contract.mjs'

/* ------------------------------------------------------------------ */
/* Invariant predicates and adapters                                    */
/*                                                                     */
/* The COMPARATIVE assertion shapes — both-reach, both-announce,        */
/* same-identity, neither — live in ../invariants.mjs as the parity*    */
/* family (invariant C-3), together with the construct-identity table   */
/* they compare against (constructsOf over the vocabulary entries).     */
/* The per-editor pieces live in ../adapters/ (P0.5 session 3): the     */
/* entry markers the vectors type (gestures.entryMarkers), how a        */
/* crossing is recognised for each subject (the adapter's `crossing`    */
/* declaration), and the capability gate on both-reach — a rich subject */
/* whose adapter declares the construct absent scores a declared n/a    */
/* instead of a re-probed COMPARISON VOID. What stays in this file is   */
/* the measurement itself: the probe that reads containment for THIS    */
/* clause's three containers, and the vector definitions.               */
/* ------------------------------------------------------------------ */

import {
  staleProbe,
  parityBothReach,
  parityBothAnnounce,
  paritySameIdentity,
  parityNeitherSpoke,
} from '../invariants.mjs'

import { requireCapability, gesturesFor, crossingModeFor } from '../adapters/index.mjs'

/** Gate an assertion on a declared capability: absent -> declared n/a. */
const gated = (a, gate) => ({ ...a, evaluate: (ctx) => gate(ctx) ?? a.evaluate(ctx) })

/** The construct capability each parity operation's destination needs. */
const CONSTRUCT_CAP = { blockquote: 'blockquote', codeblock: 'codeblock', list: 'bulletList' }

/* The typed content is deliberately "above", "sample", "item", "code": none of
 * them contains a word CONSTRUCT_WORDS looks for, so an editor that merely
 * echoes the line the caret is on cannot be mistaken for one that named the
 * container it just entered. */
const ABOVE = 'above'
const QUOTE_BODY = 'sample'
const BELOW = 'below'
const CODE_BODY = 'code'
const ITEM_BODY = 'item'

/* ------------------------------------------------------------------ */
/* Containment probe                                                   */
/* ------------------------------------------------------------------ */

/**
 * Read-only. Returns the container kinds on the selection's ancestor chain, what
 * containers exist in the document at all, and — for flat fields, which have no
 * chain — the text of the caret's line.
 *
 * Containment is read from the DOM, not from the harness snapshot, for the reason
 * blockquote.mjs gives: the snapshot caret counts visible characters before the
 * caret, which flattens block boundaries, so "end of the paragraph above" and
 * "start of the quotation" are the same number. The entire clause lives inside
 * that ambiguity.
 *
 * `code` needs one discrimination: Lexical's CodeNode renders as a BARE <code>
 * with no <pre>, no role and no name (canonical.md CAN-CB-018), and inline code
 * renders as <code> too. A <code> with a <p> or heading ancestor inside the
 * editor is inline; otherwise it is a block. (A code block nested inside a list
 * item would defeat this; no operation here nests one.)
 */
const READ_ENTRY_STATE_FN = `
(sel) => {
  const el = document.querySelector(sel);
  if (!el) return { error: 'editor not found: ' + sel };

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const v = el.value;
    const idx = v.slice(0, el.selectionStart).split('\\n').length - 1;
    return {
      shape: 'field',
      stack: [], containers: [], present: { blockquote: 0, codeblock: 0, list: 0 },
      text: v,
      line: v.split('\\n')[idx] || '',
      lineIndex: idx,
      caret: { start: el.selectionStart, end: el.selectionEnd },
      collapsed: el.selectionStart === el.selectionEnd,
    };
  }

  const kindOf = (n) => {
    const tag = n.tagName.toLowerCase();
    const role = (n.getAttribute('role') || '').toLowerCase();
    if (tag === 'blockquote' || role === 'blockquote') return 'blockquote';
    if (tag === 'pre') return 'codeblock';
    if (tag === 'code' || role === 'code') {
      let p = n.parentElement;
      while (p && p !== el) {
        const t = p.tagName.toLowerCase();
        if (t === 'p' || /^h[1-6]$/.test(t)) return null;  // inline code
        p = p.parentElement;
      }
      return 'codeblock';
    }
    if (tag === 'li' || tag === 'ul' || tag === 'ol' ||
        role === 'listitem' || role === 'list') return 'list';
    return null;
  };

  const s = document.getSelection();
  const stack = [];
  const containers = [];
  let anchored = false;
  if (s && s.anchorNode && el.contains(s.anchorNode)) {
    anchored = true;
    let n = s.anchorNode;
    if (n.nodeType === 1 && n.childNodes[s.anchorOffset]) n = n.childNodes[s.anchorOffset];
    if (n.nodeType === 3) n = n.parentElement;
    while (n && n !== el) {
      const role = (n.getAttribute('role') || '').toLowerCase();
      const tag = n.tagName.toLowerCase();
      stack.unshift(role ? tag + '[role=' + role + ']' : tag);
      const k = kindOf(n);
      if (k && !containers.includes(k)) containers.unshift(k);
      n = n.parentElement;
    }
  }

  const present = { blockquote: 0, codeblock: 0, list: 0 };
  for (const n of el.querySelectorAll('*')) {
    const k = kindOf(n);
    if (k) present[k]++;
  }

  return {
    shape: 'contenteditable',
    stack, containers, present, anchored,
    text: el.innerText,
    line: null, lineIndex: null,
    collapsed: !!s && s.isCollapsed,
  };
}
`

/**
 * One slot, written by `actions` and read by the assertions of the same operation
 * on the same subject. run.mjs drives subjects strictly sequentially
 * (`for (const subject of ACTIVE) await runOperation(...)`), so nothing races for
 * it; the subject and operation ids are recorded so a stale read is caught rather
 * than believed.
 */
const probe = { subjectId: null, opId: null, url: null, vectors: null }

async function readState(driver) {
  const r = await driver.send('Runtime.evaluate', {
    expression: `(${READ_ENTRY_STATE_FN})(${JSON.stringify(driver.editorSelector)})`,
    returnByValue: true,
  })
  if (r.exceptionDetails) throw new Error(`containment probe failed: ${r.exceptionDetails.text}`)
  if (r.result.value?.error) throw new Error(r.result.value.error)
  return r.result.value
}

async function readJournal(driver) {
  const r = await driver.send('Runtime.evaluate', {
    expression: `(window.__a11yJournal || []).slice()`,
    returnByValue: true,
  })
  if (r.exceptionDetails) throw new Error(`journal read failed: ${r.exceptionDetails.text}`)
  return r.result.value || []
}

async function currentUrl(driver) {
  const r = await driver.send('Runtime.evaluate', {
    expression: 'location.href',
    returnByValue: true,
  })
  return r.result.value
}

/**
 * Run one entry vector from a clean page and return everything needed to compare
 * it with another. Every read sits at a settle point the driver has already
 * reached; nothing here waits on a clock.
 */
async function runVector(driver, url, vector) {
  await driver.navigate(url)
  await driver.focusEditor()
  await vector.prepare(driver)
  const before = await readState(driver)
  // The preparation typed the container into existence (or typed the block above
  // it). Those keystrokes are not the vector under test and must not be credited
  // to it — E5's preparation in particular contains an E1 autoformat, which in a
  // command-hooked editor announces.
  await driver.resetAnnouncements()
  await vector.act(driver)
  const after = await readState(driver)
  return {
    id: vector.id,
    name: vector.name,
    before,
    after,
    announcements: await readJournal(driver),
  }
}

function vectors(subject, opId) {
  if (probe.opId !== opId || probe.subjectId !== subject.id || !probe.vectors) return null
  if (probe.vectors.length !== 2) return null
  return probe.vectors
}

const STALE = staleProbe('vector readings')

/** The dependencies the parity factories need from this clause's probe. */
const PARITY_DEPS = { vectors, crossing, stale: STALE }

/* ------------------------------------------------------------------ */
/* Reach: did a vector actually cross into the container?              */
/* ------------------------------------------------------------------ */

/**
 * A crossing, per vector, in the terms the subject can support.
 *
 *   rich       the container kind is absent from the ancestor chain before and
 *              present after. Both halves matter: landing inside a container the
 *              caret was ALREADY in is not a crossing and exercises nothing.
 *   flat field the caret's line does not carry the marker before and does after.
 *              Not containment — a textarea has none — but the strongest
 *              equivalent the field can offer, and scored as such.
 */
function crossing(spec, v, subject) {
  // The recognition mode is the adapter's declaration ('ancestor-chain' for a
  // rich surface, 'line-marker' for a flat field), not a kind special-case in
  // clause code; crossingModeFor falls back to the kind for an unknown
  // subject, which is the dispatch this function used before the declaration
  // existed.
  if (crossingModeFor(subject) === 'ancestor-chain') {
    const was = v.before.containers.includes(spec.container)
    const is = v.after.containers.includes(spec.container)
    return {
      ok: !was && is,
      was,
      is,
      why: !is
        ? `caret is not in a ${spec.container} after the vector ` +
          `(stack: ${v.after.stack.join(' › ') || '(root)'}; the document holds ` +
          `${v.after.present[spec.container]} ${spec.container} element(s))`
        : was
          ? `caret was ALREADY in a ${spec.container} before the vector ` +
            `(stack: ${v.before.stack.join(' › ')}), so no crossing was exercised`
          : `${v.before.stack.join(' › ') || '(root)'} → ${v.after.stack.join(' › ')}`,
    }
  }
  const was = spec.linePattern.test(v.before.line || '')
  const is = spec.linePattern.test(v.after.line || '')
  return {
    ok: !was && is,
    was,
    is,
    why: !is
      ? `caret's line ${JSON.stringify(v.after.line)} does not carry the ${spec.marker.trim()} marker`
      : was
        ? `caret's line already carried the marker before the vector ` +
          `(${JSON.stringify(v.before.line)})`
        : `line ${JSON.stringify(v.before.line)} → ${JSON.stringify(v.after.line)}`,
  }
}

/* ------------------------------------------------------------------ */
/* Vector definitions                                                  */
/* ------------------------------------------------------------------ */

/** E1 — type the markdown trigger. The container does not exist until this runs. */
const e1 = (marker, body) => ({
  id: 'E1',
  name: `autoformat (type ${JSON.stringify(marker)})`,
  prepare: async () => {},
  act: async (driver) => {
    for (const ch of marker) await driver.type(ch)
    await driver.type(body)
  },
})

/**
 * E3 — arrow down into an existing container from the block above.
 *
 * The precondition is TYPED, never injected, so every subject reaches it the way
 * a user would and no subject can expose a hook that flatters it. The ArrowUp and
 * Home that put the caret above the container are part of the preparation, so
 * anything they announce is discarded before the vector is measured.
 */
const e3 = (marker, body) => ({
  id: 'E3',
  name: 'arrow down from the block above',
  prepare: async (driver) => {
    await driver.type(ABOVE)
    await driver.press('Enter')
    for (const ch of marker) await driver.type(ch)
    await driver.type(body)
    await driver.press('ArrowUp')
    await driver.press('Home')
  },
  act: async (driver) => {
    await driver.press('ArrowDown')
  },
})

/**
 * E5 — Backspace at the start of the block BELOW merges the caret into the
 * container. The nastiest vector in the machine: the user pressed a DELETION key
 * and became a quote author. They were not navigating. They had no reason to
 * suspect the containment stack had moved at all.
 *
 * The preparation builds the block below FIRST and the container second:
 *
 *     type "below" · Home · Enter · ArrowUp · type the marker · type the body
 *
 * so the caret ends inside the container with an ordinary paragraph beneath it,
 * and ArrowDown+Home puts it at the start of that paragraph ready for Backspace.
 *
 * The obvious route — build the container, then LEAVE it, then type below it —
 * was rejected. Leaving is exactly the gesture editors disagree about (Lexical
 * exits a quote on any Enter via QuoteNode.insertNewAfter; CKEditor wants an
 * Enter on an empty paragraph; a Lexical code block wants TWO trailing blank
 * lines, CAN-CB-026), so the precondition would rest on a contested gesture and
 * would fail for different reasons in different subjects — voiding the
 * comparison in precisely the editors it is most interesting to compare. The
 * route above needs no escape gesture at all, and it was verified to produce the
 * same shape in every subject in the corpus, flat fields included.
 */
const e5 = (marker, body) => ({
  id: 'E5',
  name: 'Backspace at the start of the block below merges in',
  prepare: async (driver) => {
    await driver.type(BELOW)
    await driver.press('Home')
    await driver.press('Enter')
    await driver.press('ArrowUp')
    for (const ch of marker) await driver.type(ch)
    await driver.type(body)
    await driver.press('ArrowDown')
    await driver.press('Home')
  },
  act: async (driver) => {
    await driver.press('Backspace')
  },
})

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */

function parityOperation(spec) {
  return operation({
    id: spec.opId,
    scenarios: spec.scenarios,
    title: `${spec.noun}: ${spec.a.id} vs ${spec.b.id} — same destination, two vectors`,
    precondition:
      `The editor is focused and empty. Each vector builds its own precondition from ` +
      `keystrokes on a freshly navigated page.`,
    operationText:
      `Run ${spec.a.id} (${spec.a.name}), then ${spec.b.id} (${spec.b.name}), each from a ` +
      `clean document, and compare what was announced.`,
    setup: async (driver) => {
      await driver.focusEditor()
      probe.subjectId = driver.subjectMeta?.id ?? null
      probe.opId = spec.opId
      probe.vectors = null
      probe.url = await currentUrl(driver)
    },
    actions: async (driver) => {
      // The marker each vector types is the subject's adapter's declaration
      // (gestures.entryMarkers), falling back to the spec's canonical marker
      // for an unknown subject. The vectors are rebuilt per subject from the
      // same pure factories that named them in the operation text, so a
      // subject whose adapter declares the canonical marker runs exactly the
      // keystrokes it always did.
      const marker = gesturesFor(driver.subjectMeta?.id).entryMarkers[spec.container] ?? spec.marker
      const out = []
      for (const v of spec.pair(marker)) out.push(await runVector(driver, probe.url, v))
      probe.vectors = out
    },
    resultState: [
      // Declared, not probed, for a rich subject whose adapter says the
      // construct does not exist: two vectors aimed at a container the
      // subject never produces are n/a by declaration, not a re-probed
      // COMPARISON VOID. Flat fields are deliberately NOT gated — see "Flat
      // fields" above: their marker-level comparison is what lets the only
      // subjects with an announcer exhibit a C-3 violation, and voiding them
      // would hide the finding.
      gated(parityBothReach(spec, PARITY_DEPS), (ctx) =>
        crossingModeFor(ctx.subject) === 'ancestor-chain'
          ? requireCapability(
              ctx.subject,
              CONSTRUCT_CAP[spec.container],
              `no ${spec.noun} can exist in this subject for either vector to reach, ` +
                `so there is no comparison to make or void`,
            )
          : null,
      ),
    ],
    announcement: [
      parityBothAnnounce(spec, PARITY_DEPS),
      paritySameIdentity(spec, PARITY_DEPS),
      parityNeitherSpoke(spec, PARITY_DEPS),
    ],
  })
}

/* Each spec's canonical `marker` mirrors the adapters' entryMarkers
 * declaration (adapters/gestures.mjs) and is the fallback for a subject with
 * no adapter; `pair(marker)` rebuilds the two vectors from that marker, and
 * `a`/`b` are the canonical pair used for the operation's static title and
 * text. */

const BLOCKQUOTE = {
  opId: 'entry-parity.blockquote',
  container: 'blockquote',
  noun: 'quotation',
  marker: '> ',
  linePattern: /^\s*>\s?/,
  scenarios: ['CAN-CB-001', 'CAN-CB-005'],
  a: e1('> ', QUOTE_BODY),
  b: e5('> ', QUOTE_BODY),
  pair: (marker) => [e1(marker, QUOTE_BODY), e5(marker, QUOTE_BODY)],
}

const CODEBLOCK = {
  opId: 'entry-parity.codeblock',
  container: 'codeblock',
  noun: 'code block',
  // Lexical's CODE transformer fires on CODE_START_REGEX /^([ \t]*`{3,})([\w-]+)?[ \t]?/
  // and, having no `triggerOnEnter`, only when the character just typed is a
  // space (MarkdownShortcuts.ts). So the trigger is three backticks then a space.
  marker: '``` ',
  linePattern: /^\s*```/,
  scenarios: ['CAN-CB-018', 'CAN-CB-022'],
  a: e1('``` ', CODE_BODY),
  b: e5('``` ', CODE_BODY),
  pair: (marker) => [e1(marker, CODE_BODY), e5(marker, CODE_BODY)],
}

const LIST = {
  opId: 'entry-parity.list',
  container: 'list',
  noun: 'list',
  marker: '- ',
  linePattern: /^\s*([-*+]|\d+\.)\s/,
  scenarios: ['CAN-CB-036', 'CAN-CB-040'],
  a: e1('- ', ITEM_BODY),
  b: e3('- ', ITEM_BODY),
  pair: (marker) => [e1(marker, ITEM_BODY), e3(marker, ITEM_BODY)],
}

export default contract({
  id: 'entry-parity',
  title: 'Entry vector parity: the same container, reached two ways',
  description:
    'Invariant C-3. Three containers, each entered by two different vectors, with the ' +
    'announcements COMPARED rather than checked one at a time. An editor that hooks the ' +
    'autoformat command announces E1 and is silent on E3 and E5 — and passes a shallow ' +
    'suite while teaching the user to trust a signal that fires on one vector in five.',
  operations: [parityOperation(BLOCKQUOTE), parityOperation(CODEBLOCK), parityOperation(LIST)],
})

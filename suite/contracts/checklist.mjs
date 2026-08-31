/**
 * contracts/checklist.mjs — the one construct in the corpus that carries STATE.
 *
 * Work-queue item A6. Every other clause in the measurement stack asks a
 * containment question: is the caret inside a thing, did it leave the thing, how
 * deep is the thing. A task item asks that *and* a second, independent one —
 * **is it ticked?** — and the second answer changes without the first one moving.
 * Nothing else in the corpus exercises it, so this clause extends the
 * announcement vocabulary with `state:checked` / `state:unchecked`.
 *
 * Four operations, and the canonical rows they measure:
 *
 *   checklist.create    E1     `- [ ] ` + space becomes a checkable item   CAN-CB-055
 *   checklist.continue  E8     Enter at the end of a task item             CAN-CB-044
 *   checklist.toggle    state  the editor's gesture to tick an item        CAN-CB-057
 *   checklist.exit      X1     Enter on an empty task item leaves the list CAN-CB-058
 *
 * ---------------------------------------------------------------------------
 * Why state needs its own vocabulary, and why an announcement cannot save it
 * ---------------------------------------------------------------------------
 * For containment, `discoverable` is a real (if late) consolation: a genuine
 * <blockquote> or <ul> is still there when the user navigates back, so silence at
 * the moment of the change costs them a beat, not the fact. State does not work
 * that way *unless the state is in the accessibility tree*. "Checked" is not
 * implied by anything the user can feel from the keyboard; if the only trace of
 * it is a CSS class or a `::before` glyph, then it is not late information, it is
 * no information — the tick is visible to sighted users and does not exist for
 * anybody else.
 *
 * So this clause is deliberately harsher than the containment clauses on one
 * specific point. `*.state-exposed` is a **MUST on the result-state half**, and
 * it fails for a subject whose checkbox is drawn rather than declared. That makes
 * the 2x2 in run.mjs resolve to `absent` (or `told-only` where the editor did
 * speak), never to `discoverable` — which is the correct verdict, because there
 * is nothing to discover. An announcement can tell the user what just happened;
 * it cannot tell them what the third item's state is an hour later.
 *
 * ---------------------------------------------------------------------------
 * The two facts this clause was written to be able to see
 * ---------------------------------------------------------------------------
 * 1. **A continued task item starts unchecked even when the previous one was
 *    ticked** (scenarios/open-notebook.md, ON-B1-005; cited in canonical.md's
 *    note on CAN-CB-044). The behaviour is defensible — a new task is not done —
 *    but it is a state the editor CHOSE on the user's behalf and did not type,
 *    and the item it was continued from said otherwise. `checklist.continue`
 *    therefore starts from a **checked** item on purpose, so the resulting state
 *    differs from the source, and `announcement-contrast` asks whether anything
 *    named the difference. Continuing from an unchecked item would have measured
 *    the easy case and hidden the surprising one.
 *
 * 2. **Lexical stamps `role="checkbox"` and `aria-checked` on the `<li>` itself**
 *    (@lexical/list, `updateListItemChecked`), which is a real accessible state
 *    and simultaneously destroys the `listitem` role that carried the item's
 *    position in the set — canonical.md's note on CAN-CB-055. Both halves of that
 *    are assertable, so both are asserted: `state-exposed` (MUST) and
 *    `item-identity` (SHOULD). The clause does not assume the markup; it reads
 *    what the subject actually produced, which is the entire point of a harness.
 *
 * ---------------------------------------------------------------------------
 * What the subjects turned out to do — measured, not assumed
 * ---------------------------------------------------------------------------
 * Worth stating up front, because several rows below read as "the editor is
 * silent" when the truth is "the editor has no check list at all":
 *
 *   - **No Lexical subject registers check lists.** `CHECK_LIST` is exported by
 *     @lexical/markdown but is NOT a member of `ELEMENT_TRANSFORMERS`, and
 *     therefore not of `TRANSFORMERS`, which is what all three Lexical subjects
 *     pass to the markdown shortcut registration. On the extension API,
 *     `CheckListExtension` exists in @lexical/list but nothing depends on it —
 *     `ListExtension` does not. So typing `- [ ] ` fires the UNORDERED_LIST
 *     transformer on the `- `, and `[ ] ` is left as literal text inside an
 *     ordinary bullet item. This is a **precondition failure**, not an
 *     announcement failure, and the assertions say so in the first phrase.
 *     It is also a finding in its own right: check-list accessibility on Lexical
 *     is behind two separate opt-ins that the documented paths do not take.
 *
 *   - **No subject in the corpus has a toggle gesture at all.** See
 *     `attemptToggle` below for the three gestures tried and where each comes
 *     from. On every subject the document either did not change or changed in a
 *     way that was not a state change.
 *
 *   - The markdown subjects keep the state in the source text (`- [x] `), which
 *     is genuine GFM and genuinely invisible: a textarea exposes one `textbox`
 *     node whose value happens to contain brackets. Those rows are PASS~ on the
 *     containment half and a flat FAIL on the state half, and the difference
 *     between the two is the argument this clause exists to make.
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
  announcementsOf,
  renderAnnouncements,
} from '../contract.mjs'

/* Invariant predicates (../invariants.mjs): container-created (C-1/A-2),
 * announcement-conveys (C-1/A-1), state-exposed — the AX-first, DOM-fallback
 * discipline this contract exists to enforce — and the shared
 * precondition-not-reached / stale-probe protocol shapes. The assertions that
 * stay bespoke are the ones whose logic is particular to STATE:
 * announcement-vs-observed-state agreement (continueAnnouncedState), the
 * carried-over-state contrast (continueAnnouncedContrast, ON-B1-005), the
 * role-collision check (createItemIdentity), the focusable-state-holder check
 * (toggleFocusable, CAN-CB-057) and T-1's state-not-action wording check
 * (toggleAnnouncesStateNotAction) — none of which recurs in another contract. */
import {
  staleProbe,
  preconditionNotReached,
  containerCreated,
  announcementConveys,
  stateExposed,
} from '../invariants.mjs'

/* ------------------------------------------------------------------ */
/* Content                                                             */
/*                                                                     */
/* "alpha" for the same reason list.mjs uses it: the body text must not */
/* contain a word any matcher below looks for, or an editor that merely */
/* echoes the line it is on would be indistinguishable from one that    */
/* named the construct and its state. "task", "todo", "done", "check"   */
/* and "tick" are all disqualified as body text for exactly that reason.*/
/* ------------------------------------------------------------------ */

const BODY = 'alpha'

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/*                                                                     */
/* The accepted surface forms live in ../vocabulary.mjs, one entry per  */
/* semantic token, with the fairness decisions recorded there:          */
/*   container:tasklist       named as a TASK, not merely as a list —   */
/*                            "bulleted list, item 1" must not satisfy  */
/*                            it (the weak container:list entry exists  */
/*                            to tell "wrong thing" from "nothing")     */
/*   state:unchecked/checked  the negative form is tested FIRST in      */
/*                            statedState(); getting that backwards     */
/*                            turns a correct editor red                */
/*   action words (T-1)       a toggle announces the resulting STATE,   */
/*                            never the keystroke                       */
/* ------------------------------------------------------------------ */

import {
  CONTAINER_TASKLIST as NAMES_TASK,
  CONTAINER_LIST_WEAK as NAMES_LIST,
  ACTION_WORDS as CONVEYS_ACTION_ONLY,
  DIRECTION_LEFT_TASKLIST as CONVEYS_LEFT_LIST,
  DESTINATION_NAMED as CONVEYS_DESTINATION,
  statedState,
} from '../vocabulary.mjs'

/* Adapters (../adapters/index.mjs): the per-subject capability declaration
 * and gesture table (P0.5 session 3). The 'checkList' capability is what the
 * long "what the subjects turned out to do" section above establishes by
 * measurement — no Lexical subject and no Tiptap StarterKit registers check
 * lists, and the adapters now DECLARE that (with the two-missed-opt-ins
 * evidence recorded in each adapter file), so the rich-path assertions here
 * report a declared n/a instead of re-deriving the same precondition failure
 * from probes every run. The gates never touch the plain (textual-equivalent)
 * paths, whose GFM source text is a genuine measurement, and they never touch
 * the announcement half — with one deliberate exception each way:
 * item-identity and state-holder-focusable are gated for EVERY subject
 * lacking the capability, because without a real checkbox there is no role
 * collision and no state holder to judge at any layer. The toggle gestures
 * come from the adapter (gestures.checklistToggle). */
import { requireCapability, gesturesFor } from '../adapters/index.mjs'

/** Gate an assertion on the declared checkList capability. */
const gated = (a, what) => ({
  ...a,
  evaluate: (ctx) => requireCapability(ctx.subject, 'checkList', what) ?? a.evaluate(ctx),
})

/** The same gate for a rich evaluation branch (plain paths are never gated). */
const richGate = (subject, what) =>
  subject.kind === 'rich' ? requireCapability(subject, 'checkList', what) : null

/** The first announcement that claims a state, with the state it claims. */
function stateAnnouncement(snapshot) {
  for (const a of announcementsOf(snapshot)) {
    const s = statedState(a.text)
    if (s) return { ...a, state: s }
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Source-text helpers (the plaintext subjects)                        */
/* ------------------------------------------------------------------ */

/** A GFM task-list marker at the head of a line: `- [ ] `, `* [x] `, `1. [X] `. */
const TASK_MARKER = /^([ \t]*)(?:[-*+]|\d+[.)])[ \t]+\[([ xX])\][ \t]/
/** Any list marker, task or not. */
const LIST_MARKER = /^([ \t]*)(?:[-*+]|\d+[.)])[ \t]/

function lines(snapshot) {
  return String(snapshot.domText ?? '').split('\n')
}
function lastLine(snapshot) {
  const l = lines(snapshot)
  return l[l.length - 1]
}

/** 'checked' | 'unchecked' | null for one source line. */
function taskStateOfLine(line) {
  const m = TASK_MARKER.exec(String(line ?? ''))
  if (!m) return null
  return m[2] === ' ' ? 'unchecked' : 'checked'
}

/** Every task-marked line's state, in document order. */
function sourceTaskStates(snapshot) {
  return lines(snapshot).map(taskStateOfLine).filter((s) => s !== null)
}

/* ------------------------------------------------------------------ */
/* Accessibility-tree helpers                                          */
/* ------------------------------------------------------------------ */

/**
 * Nodes the accessibility tree reports as a checkbox.
 *
 * Case-insensitive on purpose. Chromium's CDP tree mixes conventions — the
 * ARIA-mapped roles come back lowercase (`listitem`, `paragraph`) while several
 * internal ones are capitalised (`ListMarker`, `LineBreak`) — and a clause that
 * guessed wrong would report "no checkbox" for a subject that has one, which is
 * precisely the false negative this file must not produce.
 */
function checkboxNodes(snapshot) {
  return (snapshot.axTree?.nodes || []).filter(
    (n) => !n.ignored && /^check\s*box$/i.test(String(n.role ?? '')),
  )
}

/** An AX node's `checked` property, normalised to our two-value vocabulary. */
function axCheckedOf(node) {
  const p = node?.properties
  let raw = null
  if (Array.isArray(p)) raw = p.find((x) => x.name === 'checked')?.value?.value ?? null
  else if (p && 'checked' in p) raw = p.checked
  if (raw === null || raw === undefined) return null
  const s = String(raw).toLowerCase()
  if (s === 'true' || s === 'checked') return 'checked'
  if (s === 'false' || s === 'unchecked') return 'unchecked'
  return s // 'mixed', or anything unexpected, reported verbatim
}

/** Non-ignored children of the editor root — the blocks the caret can live in. */
function topBlocks(snapshot) {
  return (snapshot.axTree?.nodes || []).filter((n) => !n.ignored && n.depth === 1)
}

/** One-line dump of every AX node carrying a name, for failure detail. */
function axNames(snapshot, limit = 8) {
  const named = (snapshot.axTree?.nodes || [])
    .filter((n) => !n.ignored && (n.name || n.value))
    .slice(0, limit)
    .map((n) => `${n.role}:${JSON.stringify(n.name ?? n.value)}`)
  return named.length ? named.join(' ') : '(no named AX nodes)'
}

/* ------------------------------------------------------------------ */
/* DOM probe                                                           */
/*                                                                     */
/* Read-only, evaluated once at a sync point the driver has already     */
/* settled — an observation of a real signal, not a wait (CLAUDE.md).   */
/*                                                                     */
/* It exists for the same reason blockquote.mjs has one: the standard   */
/* snapshot cannot answer a containment question, because its caret is  */
/* "visible characters before the caret" and that flattens block        */
/* boundaries. It answers two more here that no snapshot field carries: */
/* whether the tick is DECLARED (role/aria-checked/<input>) or merely   */
/* DRAWN (a class, or a ::before glyph), and where a pointer would have */
/* to go to hit the marker.                                            */
/* ------------------------------------------------------------------ */

const READ_TASK_FN = `
(sel) => {
  const el = document.querySelector(sel);
  if (!el) return { error: 'editor not found: ' + sel };
  const active = document.activeElement;
  const activeDesc = active
    ? active.tagName.toLowerCase() +
      (active.getAttribute && active.getAttribute('role') ? '[role=' + active.getAttribute('role') + ']' : '')
    : null;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return {
      shape: 'field',
      text: el.value,
      items: [],
      stack: [],
      marker: null,
      collapsed: el.selectionStart === el.selectionEnd,
      activeDesc: activeDesc,
    };
  }
  const items = [...el.querySelectorAll('li')].map((li) => {
    let before = null;
    try { before = getComputedStyle(li, '::before').content; } catch (e) { before = null; }
    const input = li.querySelector('input[type=checkbox]');
    return {
      role: li.getAttribute('role'),
      ariaChecked: li.getAttribute('aria-checked'),
      tabindex: li.getAttribute('tabindex'),
      className: String(li.className || ''),
      inputChecked: input ? !!input.checked : null,
      beforeContent: before,
      text: String(li.textContent || '').replace(/\\s+/g, ' ').trim(),
    };
  });
  const s = document.getSelection();
  const stack = [];
  if (s && s.anchorNode && el.contains(s.anchorNode)) {
    let n = s.anchorNode;
    if (n.nodeType === 1 && n.childNodes[s.anchorOffset]) n = n.childNodes[s.anchorOffset];
    if (n.nodeType === 3) n = n.parentElement;
    while (n && n !== el) {
      const tag = n.tagName.toLowerCase();
      const role = (n.getAttribute('role') || '').toLowerCase();
      stack.unshift(role ? tag + '[role=' + role + ']' : tag);
      n = n.parentElement;
    }
  }
  // Where a check marker is drawn: immediately left of the list item's content
  // box. Both editors that implement one (Lexical's ::before, CKEditor's
  // injected span) put it there, and it is the only pointer target a check list
  // offers that is not the item's own text.
  let marker = null;
  const li0 = el.querySelector('li');
  if (li0) {
    const r = li0.getBoundingClientRect();
    if (r.width > 0 || r.height > 0) {
      marker = { x: Math.round(r.left - 10), y: Math.round(r.top + Math.min(12, r.height / 2)) };
    }
  }
  return {
    shape: 'contenteditable',
    text: el.innerText,
    html: el.innerHTML,
    items: items,
    stack: stack,
    marker: marker,
    collapsed: !!s && s.isCollapsed,
    activeDesc: activeDesc,
  };
}
`

async function readTask(driver) {
  const r = await driver.send('Runtime.evaluate', {
    expression: `(${READ_TASK_FN})(${JSON.stringify(driver.editorSelector)})`,
    returnByValue: true,
  })
  if (r.exceptionDetails) {
    throw new Error(`task probe failed: ${r.exceptionDetails.text}`)
  }
  const v = r.result.value
  if (v?.error) throw new Error(`task probe: ${v.error}`)
  return v
}

/**
 * Is this list item a DECLARED checkbox, and what does it declare?
 *
 * Three routes are accepted, in descending order of how well they carry the
 * state, because all three are things a real editor ships:
 *   role="checkbox" + aria-checked   Lexical (@lexical/list)
 *   a native <input type=checkbox>   GitHub-flavoured rendered markdown
 *   aria-checked alone               a partially-wired implementation
 * A class name and a ::before glyph are NOT routes; they are the failure this
 * clause is looking for.
 */
function declaredState(item) {
  if (!item) return null
  if (item.ariaChecked === 'true') return 'checked'
  if (item.ariaChecked === 'false') return 'unchecked'
  if (item.inputChecked !== null) return item.inputChecked ? 'checked' : 'unchecked'
  return null
}

/** A checkbox that is drawn but not declared — the case the clause indicts. */
function drawnOnly(item) {
  if (!item || declaredState(item)) return false
  const cls = String(item.className || '')
  const glyph = String(item.beforeContent || '')
  return (
    /check|task|todo|to-do|tick/i.test(cls) ||
    (glyph && glyph !== 'none' && glyph !== 'normal' && /[☐☑✓✔✗x×□■]/i.test(glyph))
  )
}

/** All declared task states in the editor, in document order. */
function declaredStates(reading) {
  return (reading?.items || []).map(declaredState).filter((s) => s !== null)
}

/**
 * The state signature the toggle helper watches. Only the checked states — not
 * the text, not the caret — so that a gesture which merely moves the caret is
 * correctly scored as "did nothing to the state", and a gesture which edits text
 * is not mistaken for a toggle.
 */
function stateSignature(reading) {
  return JSON.stringify(
    reading.shape === 'field'
      ? String(reading.text ?? '').split('\n').map(taskStateOfLine)
      : (reading.items || []).map((i) => `${i.role}/${i.ariaChecked}/${i.inputChecked}`),
  )
}

/** Everything a toggle could plausibly have altered. */
function docSignature(reading) {
  return JSON.stringify({ text: reading.text, state: stateSignature(reading) })
}

/* ------------------------------------------------------------------ */
/* The toggle gesture                                                  */
/* ------------------------------------------------------------------ */

/**
 * There is no single toggle keystroke across editors, so this tries the
 * gestures real editors actually ship, in the order the subject's adapter
 * declares them (`gestures.checklistToggle`). The canonical set — pointer on
 * the marker first (Lexical's handleClick / CKEditor's injected span), then
 * Lexical's Home‑ArrowLeft‑Space two-step, then CKEditor's Ctrl+Enter — and
 * the provenance of each live in adapters/gestures.mjs, together with the
 * fairness rule: the set is uniform across subjects by default, so the
 * generosity cannot flatter one editor over another.
 *
 * Stops at the first gesture that changes the document at all. Continuing past
 * one that edited text would measure a document nobody asked for; and a gesture
 * that changed something without changing the state is itself the finding —
 * the user pressed the key the docs told them to and got a space.
 *
 * No timers. Every step is gated on `driver.press()` / an explicit `_settle()`,
 * both of which return only once the digest of the observed state has been
 * identical on consecutive frame-gated reads, and the decision to continue is
 * made by comparing two readings, never by waiting.
 */
async function attemptToggle(driver) {
  const attempts = []
  const start = await readTask(driver)
  let last = start

  const record = async (gesture, run) => {
    if (last === null) return // already stopped
    const before = last
    await run()
    const after = await readTask(driver)
    const changedDoc = docSignature(after) !== docSignature(before)
    const changedState = stateSignature(after) !== stateSignature(before)
    attempts.push({ gesture, changedDoc, changedState, text: after.text })
    last = changedDoc ? null : after
    return after
  }

  for (const g of gesturesFor(driver.subjectMeta?.id).checklistToggle) {
    if (g.kind === 'pointer-marker') {
      // A pointer on the check marker needs a marker to aim at; the probe
      // supplies the coordinates or the honest reason there are none.
      if (start.marker) {
        const { x, y } = start.marker
        await record(g.gesture, async () => {
          for (const type of ['mousePressed', 'mouseReleased']) {
            await driver.send('Input.dispatchMouseEvent', {
              type,
              x,
              y,
              button: 'left',
              buttons: type === 'mousePressed' ? 1 : 0,
              clickCount: 1,
            })
          }
          await driver._settle()
        })
      } else {
        attempts.push({
          gesture: g.gesture,
          skipped:
            'no list-item element exists, so there is no marker for a pointer to hit — ' +
            'the "checkbox" is two characters of the text itself',
        })
      }
    } else {
      await record(g.gesture, async () => {
        for (const key of g.keys) await driver.press(key)
      })
    }
  }

  return attempts
}

/** Human-readable rendering of what the toggle attempts did. */
function renderAttempts(attempts) {
  if (!attempts?.length) return '(no gesture attempted)'
  return attempts
    .map((a) =>
      a.skipped
        ? `${a.gesture}: skipped — ${a.skipped}`
        : `${a.gesture}: ${
            a.changedState
              ? 'CHANGED THE STATE'
              : a.changedDoc
                ? `changed the document but not the state (text is now ${JSON.stringify(a.text)})`
                : 'did nothing'
          }`,
    )
    .join(' · ')
}

/* ------------------------------------------------------------------ */
/* Probe slot                                                          */
/*                                                                     */
/* One slot, written by setup/actions and read by the assertions of the */
/* same operation on the same subject. run.mjs drives subjects strictly */
/* sequentially, so nothing races for it; the subject and operation ids  */
/* are recorded so a stale read is caught rather than believed.         */
/* ------------------------------------------------------------------ */

const probe = { subjectId: null, opId: null, before: null, after: null, attempts: null }

async function probeSetup(driver, opId) {
  probe.subjectId = driver.subjectMeta?.id ?? null
  probe.opId = opId
  probe.after = null
  probe.attempts = null
  probe.before = await readTask(driver)
}

async function probeAfter(driver) {
  probe.after = await readTask(driver)
}

function reading(subject, opId) {
  if (probe.opId !== opId || probe.subjectId !== subject.id || !probe.after) return null
  return probe
}

const STALE = staleProbe('probe reading')

/* ------------------------------------------------------------------ */
/* Shared failure prose                                                */
/* ------------------------------------------------------------------ */

/**
 * Why a missing state is a STRUCTURAL failure and not merely an unannounced one.
 * Used verbatim by every `state-exposed` assertion so the argument is stated
 * once and cannot drift between rows.
 */
const STATE_IS_STRUCTURAL =
  'A checked state that is not in the accessibility tree cannot be repaired by an ' +
  'announcement: containment is re-readable on navigation (the `discoverable` outcome), ' +
  'but a tick that exists only as a class name or a ::before glyph is not late ' +
  'information, it is no information — there is nothing to navigate back to. This is ' +
  'why the outcome for this row reads `absent` rather than `discoverable`.'

/** Shared note for the platform half of the argument. */
const PLATFORM_NOTE =
  'platform-rescue.md, §"editable lists are not containers": NVDA classifies a list it ' +
  'can EDIT as PRESCAT_SINGLELINE rather than PRESCAT_CONTAINER and gates "with N items" ' +
  'on State.READONLY, so the platform does not give an editable task list container ' +
  'treatment either. If that source read holds, the editor is the only route.'

/* ================================================================== */
/* Clause 1 — create: `- [ ] ` + space becomes a checkable item
/*             (CAN-CB-055, vector E1)
/* ================================================================== */

const createStructure = containerCreated({
  assertionId: 'checklist.create.structure',
  assertionStatement: 'A checkable task item holding the typed text is conveyed.',
  assertionPhrase: 'convey a checkable task item',
  priority: MUST,
  rich: ({ after, subject }) => {
    // Declared, not probed: the adapter records (with the evidence) that this
    // configuration has no check list — CHECK_LIST not in TRANSFORMERS,
    // CheckListExtension not depended on, TaskList not in StarterKit — so the
    // per-run rediscovery of that fact is retired. The plain branch below is
    // NOT gated: the GFM source text is a genuine measurement.
    const na = richGate(subject, 'typing "- [ ] " never produces a checkable item in this subject')
    if (na) return na
    const c = reading(subject, 'checklist.create')
    if (!c) return STALE
    const boxes = checkboxNodes(after)
    const declared = (c.after.items || []).filter((i) => declaredState(i) !== null)
    const holdsBody = declared.some((i) => i.text.includes(BODY)) || boxes.some((n) => String(n.name ?? '').includes(BODY))
    if (boxes.length >= 1 && holdsBody) {
      return {
        pass: true,
        detail:
          `the accessibility tree exposes ${boxes.length} checkbox node(s) and the item holds ` +
          `${JSON.stringify(BODY)}. caret stack: ${c.after.stack.join(' › ') || '(none)'}`,
      }
    }
    const items = c.after.items || []
    const listitems = axFind(after, 'listitem')
    // The measured Lexical case: `- ` fired the UNORDERED_LIST transformer and
    // the brackets survived as text. Name it precisely rather than reporting a
    // generic absence, because "no check list exists" and "the check list is
    // silent" are different findings and only one of them is about announcing.
    const bracketsAsText = items.some((i) => /\[\s*[xX]?\s*\]/.test(i.text))
    return {
      pass: false,
      detail:
        (bracketsAsText
          ? `precondition not reached: the editor produced an ORDINARY list item whose text is ` +
            `${JSON.stringify(items.find((i) => /\[\s*[xX]?\s*\]/.test(i.text)).text)} — the "- " was ` +
            `consumed by the bulleted-list transformer and "[ ] " was left as literal characters. ` +
            `On every Lexical subject here that is expected and is itself the finding: CHECK_LIST is ` +
            `exported by @lexical/markdown but is not a member of ELEMENT_TRANSFORMERS, so it is not ` +
            `in TRANSFORMERS; and CheckListExtension exists in @lexical/list but ListExtension does ` +
            `not depend on it. Check lists are behind two separate opt-ins that neither documented ` +
            `path takes. Read this FAIL as "this configuration has no check list", never as "its ` +
            `announcer is broken". `
          : `no checkable item was produced. `) +
        `checkbox nodes=${boxes.length}, listitems=${listitems.length}, ` +
        `<li> with a declared state=${declared.length}, text=${JSON.stringify(after.domText)}. ` +
        `subtree: ${axSummary(after)}`,
    }
  },
  // Plaintext. `- [ ] alpha` is real GFM: it renders as a checked-able item in
  // any markdown viewer. That is the whole of what a textarea can express, and
  // it is scored the way heading.mjs scores "# title" — PASS~, on intent. The
  // probe guard is kept so a stale reading is still refused before judging.
  plain: ({ after, subject }) => {
    const c = reading(subject, 'checklist.create')
    if (!c) return STALE
    const ok = after.domText === `- [ ] ${BODY}`
    return {
      pass: ok,
      mode: 'textual-equivalent',
      detail: ok
        ? `source text is "- [ ] ${BODY}" — GFM task-list markdown that renders as a checkbox ` +
          `elsewhere. NOTE: the edited field exposes one textbox node whose value happens to ` +
          `contain brackets. There is no checkable item here for a caret to be in and no state ` +
          `for anything to read. Pass on intent only.`
        : `expected "- [ ] ${BODY}", got ${JSON.stringify(after.domText)}`,
    }
  },
})

const createStateExposed = stateExposed({
  assertionId: 'checklist.create.state-exposed',
  assertionStatement: 'The new item reports an UNCHECKED accessible state.',
  assertionPhrase: 'expose the unchecked state in the accessibility tree',
  priority: MUST,
  // The rich gate runs before anything is read: no check list, no state to
  // expose. The plaintext branch is NOT gated — its "NOT EXPRESSIBLE"
  // structural failure is this clause's central argument (state has no honest
  // textual equivalent) and stays measured.
  guard: ({ subject }) =>
    richGate(subject, 'no checkable item exists whose unchecked state could be exposed') ??
    (reading(subject, 'checklist.create') ? null : STALE),
  // The AX tree is the authority. The DOM attribute is read too (fallbacks
  // below), so that "the markup is right and Chromium did not surface it" can
  // be reported as the different (and much rarer) failure that it is.
  axStates: ({ after }) => checkboxNodes(after).map(axCheckedOf).filter((s) => s !== null),
  passWhen: (states) => states.includes('unchecked'),
  passDetail: (states) =>
    `a checkbox node reports checked=false. AX states: ${JSON.stringify(states)}`,
  fallbacks: [
    (ctx, states) =>
      states.includes('checked')
        ? {
            pass: false,
            mode: 'structural',
            detail:
              `the state IS exposed, but as CHECKED on an item the user has just created and never ` +
              `ticked. AX states: ${JSON.stringify(states)}. A wrong state is worse than a missing ` +
              `one: it is the only reading the user gets and it is false.`,
          }
        : null,
    ({ after, subject }) => {
      const c = reading(subject, 'checklist.create')
      const domStates = declaredStates(c.after)
      if (!domStates.length) return null
      return {
        pass: false,
        mode: 'structural',
        detail:
          `the DOM declares a state (${JSON.stringify(domStates)}) but no node in the editor's ` +
          `accessibility subtree carries a checkbox role with a checked property. The markup is ` +
          `there and the tree does not have it, which is a browser-mapping problem rather than an ` +
          `authoring one. subtree: ${axSummary(after)}`,
      }
    },
    ({ subject }) => {
      const c = reading(subject, 'checklist.create')
      const drawn = (c.after.items || []).filter(drawnOnly)
      if (!drawn.length) return null
      return {
        pass: false,
        mode: 'structural',
        detail:
          `the checkbox is DRAWN and not DECLARED: ${drawn.length} list item(s) carry a check-ish ` +
          `class or ::before glyph (${JSON.stringify(drawn.map((d) => d.className || d.beforeContent))}) ` +
          `and no role="checkbox", no aria-checked and no <input type=checkbox>. ` +
          STATE_IS_STRUCTURAL,
      }
    },
    ({ after, subject }) =>
      subject.kind !== 'rich'
        ? {
            pass: false,
            mode: 'structural',
            detail:
              `NOT EXPRESSIBLE — a textarea exposes one textbox node. The "[ ]" in ` +
              `${JSON.stringify(after.domText)} is two characters of that node's value, read out as ` +
              `content on the line, never as a state. There is no element to carry aria-checked at any ` +
              `depth, ever. Recorded as a structural failure rather than a textual-equivalent pass ` +
              `because state, unlike containment, has no honest textual equivalent: a reader who hears ` +
              `"bracket space bracket" has been told what is on the screen and not what it means. ` +
              STATE_IS_STRUCTURAL,
          }
        : null,
    ({ after }) => ({
      pass: false,
      mode: 'structural',
      detail:
        `no checkbox role and no checked state anywhere in the editor's accessibility subtree. ` +
        STATE_IS_STRUCTURAL +
        ` named AX nodes: ${axNames(after)}`,
    }),
  ],
})

const createItemIdentity = assertion({
  assertionId: 'checklist.create.item-identity',
  assertionStatement: 'The checkable item is still a list item, so its position in the set survives.',
  assertionPhrase: 'keep the item a list item as well as a checkbox',
  priority: SHOULD,
  evaluate: ({ after, subject }) => {
    const c = reading(subject, 'checklist.create')
    if (!c) return STALE
    const boxes = checkboxNodes(after)
    if (!boxes.length) {
      return {
        pass: false,
        mode: subject.kind === 'rich' ? 'structural' : 'textual-equivalent',
        detail:
          'cannot be judged: no checkbox was produced, so there is no role collision to look for. ' +
          'This assertion exists for the case canonical.md records on CAN-CB-055 — an editor that ' +
          'stamps role="checkbox" on the <li> itself gains the state and loses the listitem role, ' +
          'and with it position-in-set. See checklist.create.structure for why no checkbox exists here.',
      }
    }
    const listitems = axFind(after, 'listitem')
    const ok = listitems.length >= boxes.length
    return {
      pass: ok,
      mode: 'structural',
      detail: ok
        ? `${boxes.length} checkbox node(s) alongside ${listitems.length} listitem(s): the item is ` +
          `both, so the state was added without costing the position.`
        : `${boxes.length} checkbox node(s) but only ${listitems.length} listitem(s). The checkbox ` +
          `role has REPLACED the listitem role — which is what @lexical/list does, stamping ` +
          `role="checkbox" on the <li> in updateListItemChecked. The state arrived and the item's ` +
          `position in the set left with the role that carried it, so nothing can say "2 of 5". ` +
          `subtree: ${axSummary(after)}`,
    }
  },
})

const createAnnouncedTask = announcementConveys({
  assertionId: 'checklist.create.announcement',
  assertionStatement: 'An announcement conveys that the line is now a task.',
  assertionPhrase: 'announce that a task item was created',
  priority: MUST,
  token: NAMES_TASK,
  missDetail: (after) => {
    const listish = matchAnnouncement(after, NAMES_LIST)
    return listish
      ? `${JSON.stringify(listish.text)} names a list but not a TASK list. That is not a wording ` +
        `nit: the announcement fires on the "- " and the line only becomes a task four keystrokes ` +
        `later, so the user is told they made a bullet and never told it turned into something ` +
        `with a state. The two constructs behave differently under every subsequent keystroke.`
      : `nothing announced the transformation. ${PLATFORM_NOTE} observed: ${renderAnnouncements(after)}`
  },
})

const createAnnouncedState = assertion({
  assertionId: 'checklist.create.announcement-state',
  assertionStatement: 'The announcement says the new task is unchecked.',
  assertionPhrase: 'announce that the new task is unchecked',
  priority: MUST,
  evaluate: ({ after }) => {
    const hit = stateAnnouncement(after)
    if (hit && hit.state === 'unchecked') {
      return { pass: true, detail: `[${hit.politeness}] ${JSON.stringify(hit.text)}` }
    }
    if (hit) {
      return {
        pass: false,
        detail:
          `${JSON.stringify(hit.text)} claims the item is ${hit.state}, on an item the user has ` +
          `just created and never ticked.`,
      }
    }
    const any = matchAnnouncement(after, NAMES_TASK) || matchAnnouncement(after, NAMES_LIST)
    return {
      pass: false,
      detail:
        `no announcement named a state. CAN-CB-055's payload is ` +
        `\`direction:entered, container:tasklist, state:unchecked, position:1of1\` — the state is ` +
        `half the payload, and it is the half that distinguishes this construct from a bullet. ` +
        (any ? `The announcement ${JSON.stringify(any.text)} omits it. ` : '') +
        `observed: ${renderAnnouncements(after)}`,
    }
  },
})

/* ================================================================== */
/* Clause 2 — continue: Enter at the end of a CHECKED task item
/*             (CAN-CB-044; the behaviour is ON-B1-005)
/* ================================================================== */

const continueStructure = assertion({
  assertionId: 'checklist.continue.structure',
  assertionStatement: 'A second task item exists, supplied by the editor.',
  assertionPhrase: 'continue the task list',
  priority: MUST,
  evaluate: ({ before, after, subject }) => {
    const c = reading(subject, 'checklist.continue')
    if (!c) return STALE

    if (subject.kind === 'rich') {
      // Declared, not probed; the plain path below stays a real measurement.
      const na = richGate(subject, 'there is no task item for Enter to continue (E8 cannot be exercised on this construct)')
      if (na) return na
      const boxesBefore = (c.before.items || []).filter((i) => declaredState(i) !== null).length
      if (boxesBefore < 1) {
        return preconditionNotReached(
          `there was no task item to continue before Enter ` +
            `(${boxesBefore} item(s) with a declared state; before subtree: ${axSummary(before)}). ` +
            `See checklist.create.structure — this configuration produced an ordinary bullet list, ` +
            `so E8 is being exercised on the wrong construct and no verdict about task continuation ` +
            `can be drawn from it.`,
        )
      }
      const boxesAfter = (c.after.items || []).filter((i) => declaredState(i) !== null).length
      const ok = boxesAfter === boxesBefore + 1
      return {
        pass: ok,
        mode: 'structural',
        detail: ok
          ? `task items ${boxesBefore} -> ${boxesAfter}; the editor supplied the second one.`
          : `expected one more task item after Enter; task items ${boxesBefore} -> ${boxesAfter}. ` +
            `subtree: ${axSummary(after)}`,
      }
    }

    const statesBefore = sourceTaskStates(before)
    if (statesBefore.length !== 1 || statesBefore[0] !== 'checked') {
      return preconditionNotReached(
        `expected exactly one CHECKED task line before Enter, found ` +
          `${JSON.stringify(statesBefore)} in ${JSON.stringify(before.domText)}.`,
        { mode: 'textual-equivalent' },
      )
    }
    const statesAfter = sourceTaskStates(after)
    const ok = statesAfter.length === 2 && TASK_MARKER.test(lastLine(after))
    return {
      pass: ok,
      mode: 'textual-equivalent',
      detail: ok
        ? `the editor inserted a second task marker on the user's behalf: ` +
          `${JSON.stringify(after.domText)}. Six characters they did not type. NOTE: this is ` +
          `markdown source, not structure — nothing in the accessibility tree gained an item.`
        : `expected a second task-marked line; text is ${JSON.stringify(after.domText)} ` +
          `(states ${JSON.stringify(statesAfter)}).`,
    }
  },
})

const continueStateExposed = stateExposed({
  assertionId: 'checklist.continue.state-exposed',
  assertionStatement: "The new item's state is readable back from the accessibility tree.",
  assertionPhrase: "expose the new item's state in the accessibility tree",
  priority: MUST,
  // Rich gate first (declared, not probed); the plaintext "NOT EXPRESSIBLE"
  // branch stays measured, as on checklist.create.state-exposed.
  guard: ({ subject }) =>
    richGate(subject, "no task items exist whose states could be read back") ??
    (reading(subject, 'checklist.continue') ? null : STALE),
  axStates: ({ after }) => checkboxNodes(after).map(axCheckedOf).filter((s) => s !== null),
  // Two items exist after the continuation, so BOTH states must be readable.
  passWhen: (states) => states.length >= 2,
  passDetail: (states) => `AX checkbox states in document order: ${JSON.stringify(states)}`,
  fallbacks: [
    ({ after, subject }, states) => {
      const c = reading(subject, 'checklist.continue')
      const src = subject.kind === 'rich' ? declaredStates(c.after) : sourceTaskStates(after)
      return {
        pass: false,
        mode: 'structural',
        detail:
          (subject.kind === 'rich'
            ? `no second checkbox node with a checked property in the editor's accessibility subtree ` +
              `(AX states ${JSON.stringify(states)}, DOM-declared ${JSON.stringify(src)}). `
            : `NOT EXPRESSIBLE — the states ${JSON.stringify(src)} exist only as "[ ]" / "[x]" ` +
              `characters inside one textbox value. `) +
          `This is the assertion that decides whether the user can find the answer later, and it is ` +
          `the reason the announcement half below matters so much more here than it does for a ` +
          `container. ${STATE_IS_STRUCTURAL}`,
      }
    },
  ],
})

const continueAnnouncedState = assertion({
  assertionId: 'checklist.continue.announcement-state',
  assertionStatement: "An announcement conveys the new item's checked state.",
  assertionPhrase: "announce the new item's state",
  priority: MUST,
  evaluate: ({ after, subject }) => {
    const c = reading(subject, 'checklist.continue')
    if (!c) return STALE

    // What the editor ACTUALLY did, measured — the clause does not assume the
    // new item is unchecked, it reads it and then requires the announcement to
    // match. An editor that inherits the tick is not wrong here; an editor that
    // says the wrong thing about it is.
    const observed =
      subject.kind === 'rich'
        ? (declaredStates(c.after).slice(-1)[0] ?? null)
        : (sourceTaskStates(after).slice(-1)[0] ?? null)

    const hit = stateAnnouncement(after)
    if (!hit) {
      const any = matchAnnouncement(after, NAMES_TASK) || matchAnnouncement(after, NAMES_LIST)
      return {
        pass: false,
        detail:
          `nothing named a state. The editor supplied a new item and chose its state ` +
          `(${observed ? `it is ${observed}` : 'the state is not readable anywhere'}); the user ` +
          `pressed one key and was not told either fact. ` +
          (any
            ? `The announcement ${JSON.stringify(any.text)} says an item appeared and stops there, ` +
              `which is exactly the shape of the gap: "an item exists" is the containment half, ` +
              `and the state half is missing. `
            : '') +
          `observed: ${renderAnnouncements(after)}`,
      }
    }
    if (observed && hit.state !== observed) {
      return {
        pass: false,
        detail:
          `the announcement ${JSON.stringify(hit.text)} claims ${hit.state}; the item the editor ` +
          `actually produced is ${observed}. An announcement that contradicts the document is ` +
          `worse than silence — it is the user's only reading and it is wrong.`,
      }
    }
    return {
      pass: true,
      detail:
        `[${hit.politeness}] ${JSON.stringify(hit.text)} — states ${hit.state}` +
        (observed ? `, and the item is in fact ${observed}.` : ', though no readable state exists to corroborate it.'),
    }
  },
})

const continueAnnouncedContrast = assertion({
  assertionId: 'checklist.continue.announcement-contrast',
  assertionStatement:
    'When the new item does not inherit the state of the one it was continued from, the announcement says so.',
  assertionPhrase: 'name the state that did not carry over',
  priority: SHOULD,
  evaluate: ({ before, after, subject }) => {
    const c = reading(subject, 'checklist.continue')
    if (!c) return STALE
    const source =
      subject.kind === 'rich'
        ? (declaredStates(c.before).slice(-1)[0] ?? null)
        : (sourceTaskStates(before).slice(-1)[0] ?? null)
    const produced =
      subject.kind === 'rich'
        ? (declaredStates(c.after).slice(-1)[0] ?? null)
        : (sourceTaskStates(after).slice(-1)[0] ?? null)

    if (!source || !produced) {
      return {
        pass: false,
        detail:
          `cannot be judged: the state of the source item (${source ?? 'unreadable'}) or of the ` +
          `item produced (${produced ?? 'unreadable'}) is not readable, so there is no comparison ` +
          `to make. See checklist.continue.structure.`,
      }
    }
    const hit = stateAnnouncement(after)
    if (source === produced) {
      return {
        pass: true,
        detail:
          `the state carried over (${source} -> ${produced}), so nothing surprising happened and ` +
          `there is nothing extra to say. NOTE: this is a pass on a case that did not arise, not ` +
          `evidence the editor would handle the other one.`,
      }
    }
    if (hit && hit.state === produced) {
      return {
        pass: true,
        detail:
          `the state did NOT carry over (${source} -> ${produced}) and the announcement ` +
          `${JSON.stringify(hit.text)} names it. This is the ON-B1-005 case handled honestly: the ` +
          `editor made a choice the user did not make and said which one.`,
      }
    }
    return {
      pass: false,
      detail:
        `the previous item was ${source} and the item the editor supplied is ${produced} — the ` +
        `state was silently dropped (scenario ON-B1-005, cited in canonical.md's note on ` +
        `CAN-CB-044). ` +
        (hit
          ? `The announcement ${JSON.stringify(hit.text)} does not name ${produced}. `
          : `Nothing named a state. `) +
        `A user who ticks an item and presses Enter has every reason to expect the tick to be the ` +
        `thing that carried over, because the marker did. observed: ${renderAnnouncements(after)}`,
    }
  },
})

/* ================================================================== */
/* Clause 3 — toggle: the editor's gesture to tick an item
/*             (CAN-CB-057, invariant T-1)
/* ================================================================== */

const toggleState = stateExposed({
  assertionId: 'checklist.toggle.state',
  assertionStatement: 'The item is now checked, and the accessibility tree says so.',
  assertionPhrase: 'tick the item and expose the new state',
  priority: MUST,
  guard: ({ before, subject }) => {
    // Declared, not probed, for a rich subject with no check list: there is
    // no state for any gesture to flip. The plaintext branch below stays
    // measured — an editor COULD ship a gesture that rewrites "[ ]" to
    // "[x]" in the source, and whether one does is a probe's job.
    const na = richGate(
      subject,
      'no checkable item exists, so there is no state for a toggle gesture to flip',
    )
    if (na) return na
    const c = reading(subject, 'checklist.toggle')
    if (!c) return STALE
    const stateBefore =
      subject.kind === 'rich'
        ? (declaredStates(c.before).slice(-1)[0] ?? null)
        : (sourceTaskStates(before).slice(-1)[0] ?? null)
    if (stateBefore !== 'unchecked') {
      return preconditionNotReached(
        `there was no unchecked task item to tick before the gesture ` +
          `(state read as ${stateBefore ?? 'nothing — no item declares a state'}). ` +
          (subject.kind === 'rich'
            ? `See checklist.create.structure: this configuration produced no check list. `
            : `The "[ ]" is text, so there is no state for a gesture to flip — the only way to ` +
              `"tick" it is to select the space and type an x, which is a text edit and is not a ` +
              `state change at all. `) +
          `Reporting this as a failure rather than a pass is deliberate: "not checked" is also ` +
          `what a broken toggle produces, so an end-state-only check here would be a false PASS. ` +
          `gestures tried — ${renderAttempts(c.attempts || [])}`,
      )
    }
    return null
  },
  axStates: ({ after }) => checkboxNodes(after).map(axCheckedOf).filter((s) => s !== null),
  passWhen: (states) => states.includes('checked'),
  passDetail: (states, { subject }) => {
    const c = reading(subject, 'checklist.toggle')
    return (
      `a checkbox node now reports checked=true. AX states: ${JSON.stringify(states)}. ` +
      `gesture that did it — ${renderAttempts(c.attempts || [])}`
    )
  },
  fallbacks: [
    ({ subject }, states) => {
      const c = reading(subject, 'checklist.toggle')
      return {
        pass: false,
        mode: 'structural',
        detail:
          `the item is not checked in the accessibility tree after every gesture a real editor ` +
          `ships. AX states: ${JSON.stringify(states)}, DOM-declared: ` +
          `${JSON.stringify(declaredStates(c.after))}. gestures tried — ${renderAttempts(c.attempts || [])}`,
      }
    },
  ],
})

const toggleFocusable = assertion({
  assertionId: 'checklist.toggle.state-holder-focusable',
  assertionStatement:
    'The element that carries the state can hold focus, so the platform can raise a state-change event.',
  assertionPhrase: 'give the state a focusable holder',
  priority: SHOULD,
  evaluate: ({ subject }) => {
    const c = reading(subject, 'checklist.toggle')
    if (!c) return STALE
    const holders = (c.after.items || []).filter((i) => declaredState(i) !== null)
    if (!holders.length) {
      return {
        pass: false,
        mode: 'structural',
        detail:
          'cannot be judged: nothing in the document declares a checked state, so there is no ' +
          'holder to ask about. This assertion exists for the case canonical.md records on ' +
          'CAN-CB-057 — both feature-rich editors flip aria-checked on an element with ' +
          'tabindex="-1" that never holds DOM focus, so no state-change event is raised and the ' +
          'announcement is the only possible route.',
      }
    }
    const trapped = holders.filter((h) => h.tabindex === '-1')
    const ok = trapped.length === 0
    return {
      pass: ok,
      mode: 'structural',
      detail: ok
        ? `the state holders are reachable: tabindex values ${JSON.stringify(holders.map((h) => h.tabindex))}`
        : `${trapped.length} of ${holders.length} state holder(s) carry tabindex="-1" ` +
          `(roles ${JSON.stringify(holders.map((h) => h.role))}). The state lives on an element ` +
          `that never takes DOM focus, so the platform raises no state-change event when it ` +
          `flips and there is no focusable control the user can query. CAN-CB-057.`,
    }
  },
})

const toggleAnnouncedState = assertion({
  assertionId: 'checklist.toggle.announcement',
  assertionStatement: 'An announcement conveys the resulting state: checked.',
  assertionPhrase: 'announce the resulting state',
  priority: MUST,
  evaluate: ({ after, subject }) => {
    const c = reading(subject, 'checklist.toggle')
    if (!c) return STALE
    const hit = stateAnnouncement(after)
    if (hit && hit.state === 'checked') {
      return { pass: true, detail: `[${hit.politeness}] ${JSON.stringify(hit.text)}` }
    }
    if (hit) {
      return {
        pass: false,
        detail: `${JSON.stringify(hit.text)} states ${hit.state} after a gesture meant to tick the item.`,
      }
    }
    return {
      pass: false,
      detail:
        `nothing named a state. This is the vector with the least platform cover in the whole ` +
        `clause: the state holder is not focusable (see .state-holder-focusable), so no focus or ` +
        `state-change event fires. ${PLATFORM_NOTE} ` +
        `gestures tried — ${renderAttempts(c.attempts || [])}. observed: ${renderAnnouncements(after)}`,
    }
  },
})

const toggleAnnouncesStateNotAction = assertion({
  assertionId: 'checklist.toggle.announcement-not-action',
  assertionStatement:
    'The announcement names the resulting state rather than the action performed (invariant T-1).',
  assertionPhrase: 'name the state, not the keystroke',
  priority: SHOULD,
  evaluate: ({ after }) => {
    const hit = stateAnnouncement(after)
    const action = matchAnnouncement(after, CONVEYS_ACTION_ONLY)
    if (!hit && !action) {
      return { pass: false, detail: 'no announcement to judge — nothing was said at all.' }
    }
    if (!hit && action) {
      return {
        pass: false,
        detail:
          `${JSON.stringify(action.text)} describes the ACTION and never the result. Invariant T-1 ` +
          `(conformance-suite-design.md): "a toggle command announces the resulting state, not the ` +
          `action" — "checked", never "checkbox pressed". The user knows which key they pressed; ` +
          `what they cannot see is what the document now says.`,
      }
    }
    return {
      pass: true,
      detail:
        `${JSON.stringify(hit.text)} names the resulting state (${hit.state})` +
        (action ? `, and mentions the action alongside it, which is harmless.` : `.`),
    }
  },
})

/* ================================================================== */
/* Clause 4 — exit: Enter on an empty task item leaves the list
/*             (CAN-CB-058, vector X1)
/* ================================================================== */

const exitStructure = assertion({
  assertionId: 'checklist.exit.structure',
  assertionStatement: 'The task list ends: the empty item is gone and the caret is outside it.',
  assertionPhrase: 'leave the task list',
  priority: MUST,
  evaluate: ({ before, after, subject }) => {
    const c = reading(subject, 'checklist.exit')
    if (!c) return STALE

    if (subject.kind === 'rich') {
      // Declared, not probed; the plain path below stays a real measurement.
      const na = richGate(subject, 'the subject never builds a task list for X1 to exit')
      if (na) return na
      const boxesBefore = (c.before.items || []).filter((i) => declaredState(i) !== null).length
      if (boxesBefore < 2) {
        return preconditionNotReached(
          `expected two task items before the operation (one holding ` +
            `${JSON.stringify(BODY)}, one empty), found ${boxesBefore} with a declared state. The ` +
            `subject never entered a task list, so X1 cannot be exercised on one — see ` +
            `checklist.create.structure. before subtree: ${axSummary(before)}`,
        )
      }
      const boxesAfter = (c.after.items || []).filter((i) => declaredState(i) !== null).length
      const outsideBlock = topBlocks(after).some((n) => n.role !== 'list')
      const stillInItem = (c.after.stack || []).some((s) => /^li(\[|$)/.test(s))
      const ok = boxesAfter === boxesBefore - 1 && outsideBlock && !stillInItem
      return {
        pass: ok,
        mode: 'structural',
        detail: ok
          ? `the empty task item was consumed (${boxesBefore} -> ${boxesAfter}) and the caret is ` +
            `outside the list: ${c.after.stack.join(' › ') || '(root)'}`
          : `task items ${boxesBefore} -> ${boxesAfter}; a non-list block exists=${outsideBlock}; ` +
            `caret still on an <li>=${stillInItem} (stack ${c.after.stack.join(' › ') || '(none)'}). ` +
            `subtree: ${axSummary(after)}`,
      }
    }

    const beforeLine = lastLine(before)
    if (taskStateOfLine(beforeLine) === null || beforeLine.replace(TASK_MARKER, '').length !== 0) {
      return preconditionNotReached(
        `the caret's line was ${JSON.stringify(beforeLine)}, which is ` +
          `not an EMPTY task item, so this is not the X1 case. Full text before: ` +
          `${JSON.stringify(before.domText)}`,
        { mode: 'textual-equivalent' },
      )
    }
    const afterLine = lastLine(after)
    const firstIntact = lines(after)[0] === `- [ ] ${BODY}`
    const markerGone = !LIST_MARKER.test(afterLine)
    const ok = firstIntact && markerGone
    return {
      pass: ok,
      mode: 'textual-equivalent',
      detail: ok
        ? `the task marker on the caret's line was removed and "- [ ] ${BODY}" survives; text is ` +
          `${JSON.stringify(after.domText)}. NOTE: nothing in the accessibility tree ever said ` +
          `"task list", so nothing says "out of the task list" either — pass on intent only.`
        : `expected the task marker on the caret's line to be removed; text is ` +
          `${JSON.stringify(after.domText)} (caret line ${JSON.stringify(afterLine)}). ` +
          `A checklist with no exit is unbounded: every Enter supplies another empty checkbox and ` +
          `the user has no keystroke that ends it.`,
    }
  },
})

const exitCaret = assertion({
  assertionId: 'checklist.exit.caret',
  assertionStatement: 'The caret is collapsed in the block the user has landed in.',
  assertionPhrase: 'place the caret outside the task list',
  priority: SHOULD,
  evaluate: ({ after, subject }) => {
    const c = reading(subject, 'checklist.exit')
    if (!c) return STALE
    if (subject.kind === 'rich') {
      const inItem = (c.after.stack || []).some((s) => /^li(\[|$)/.test(s))
      const ok = c.after.collapsed && !inItem
      return {
        pass: ok,
        mode: 'structural',
        detail: `caret stack ${c.after.stack.join(' › ') || '(root)'}, collapsed=${c.after.collapsed}` +
          (inItem ? ' — still inside a list item' : ''),
      }
    }
    const expected = String(after.domText ?? '').length
    const ok = !!after.caret && after.caret.start === after.caret.end && after.caret.start === expected
    return {
      pass: ok,
      mode: 'textual-equivalent',
      detail: `caret ${JSON.stringify(after.caret)}; expected collapsed at ${expected} ` +
        `(end of ${JSON.stringify(after.domText)})`,
    }
  },
})

const exitAnnounced = announcementConveys({
  assertionId: 'checklist.exit.announcement',
  assertionStatement: 'An announcement conveys that the list has ended.',
  assertionPhrase: 'announce leaving the task list',
  priority: MUST,
  token: CONVEYS_LEFT_LIST,
  missDetail: (after) =>
    `nothing announced the crossing. ${PLATFORM_NOTE} observed: ${renderAnnouncements(after)}`,
})

const exitNamesTaskList = assertion({
  assertionId: 'checklist.exit.announcement-identity',
  assertionStatement: 'The exit announcement identifies what was left as a task list, and says where the caret is now.',
  assertionPhrase: 'name the task list that was left',
  priority: SHOULD,
  evaluate: ({ after }) => {
    const hit = matchAnnouncement(after, CONVEYS_LEFT_LIST)
    if (!hit) return { pass: false, detail: 'no announcement to judge' }
    const named = NAMES_TASK.test(hit.text)
    const dest = CONVEYS_DESTINATION.test(hit.text)
    if (named && dest) {
      return { pass: true, detail: `names both the task list and the destination: ${JSON.stringify(hit.text)}` }
    }
    return {
      pass: false,
      detail:
        `${JSON.stringify(hit.text)} ` +
        (!named
          ? `is the same string a bulleted list would produce. Invariant C-3 in reverse: two ` +
            `different containers announcing identically means the announcement carries no ` +
            `identity, and a user who was ticking things off is told only that "a list" ended. `
          : '') +
        (!dest ? `It also says what was left and not what was entered. ` : ''),
    }
  },
})

/* ================================================================== */

export default contract({
  id: 'checklist',
  title: 'Checklist item and checked state',
  description:
    'The one construct in the corpus that carries state as well as containment. Each ' +
    'operation is measured twice: whether the checked state is REAL in the accessibility ' +
    'tree (a checkbox role with a checked property, a native input, or nothing), and ' +
    'whether anything said it at the moment it changed. The state half is a MUST on the ' +
    'result-state side on purpose — a tick that exists only as a class or a drawn glyph ' +
    'cannot be repaired by an announcement, because there is nothing for the user to ' +
    'navigate back to, so the honest outcome is `absent` and never `discoverable`.',
  operations: [
    operation({
      id: 'checklist.create',
      // CAN-CB-055 — "`[ ] ` becomes a checkable item" (vector E1). Its payload is
      // `direction:entered, container:tasklist, state:unchecked, position:1of1`;
      // this clause asserts on the container half and the state half separately,
      // because measured editors get one and not the other.
      scenarios: ['CAN-CB-055'],
      title: 'Type "- [ ] alpha"',
      precondition: 'The editor is focused and empty; the caret is at offset 0.',
      operationText: 'Type "-", Space, "[", Space, "]", Space, then "alpha".',
      setup: async (driver) => {
        await driver.focusEditor()
        await probeSetup(driver, 'checklist.create')
      },
      actions: async (driver) => {
        await driver.type(`- [ ] ${BODY}`)
        await probeAfter(driver)
      },
      resultState: [
        createStructure,
        createStateExposed,
        // Gated for EVERY subject lacking the capability: the role collision
        // this assertion looks for needs a real checkbox to exist at any
        // layer, and no layer of a subject without one can produce it.
        gated(
          createItemIdentity,
          'no checkbox exists, so there is no role collision to look for',
        ),
      ],
      announcement: [createAnnouncedTask, createAnnouncedState],
    }),

    operation({
      id: 'checklist.continue',
      // CAN-CB-044 — "Enter at the end of an item creates the next item" is the only
      // canonical row for the continuation, and its note already records the
      // behaviour this operation measures: "Open Notebook's task-item continuation
      // additionally drops the checked state (ON-B1-005) without saying so."
      // This clause measures that claim instead of citing it.
      scenarios: ['CAN-CB-044'],
      title: 'Press Enter at the end of a CHECKED task item',
      precondition:
        'The editor contains one checked task item "- [x] alpha"; the caret is at the end of it.',
      operationText: 'Press Enter.',
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type(`- [x] ${BODY}`)
        await probeSetup(driver, 'checklist.continue')
      },
      actions: async (driver) => {
        await driver.press('Enter')
        await probeAfter(driver)
      },
      resultState: [continueStructure, continueStateExposed],
      announcement: [continueAnnouncedState, continueAnnouncedContrast],
    }),

    operation({
      id: 'checklist.toggle',
      // CAN-CB-057 — "Toggling a checkbox in a task item", payload
      // `container:tasklist, state:checked`. Invariant T-1 governs the wording.
      scenarios: ['CAN-CB-057'],
      title: "Tick an unchecked task item with the editor's toggle gesture",
      precondition:
        'The editor contains one unchecked task item "- [ ] alpha"; the caret is at the end of it.',
      operationText:
        'Click the check marker; if nothing changed, press Home, ArrowLeft, Space; if nothing ' +
        'changed, press Ctrl+Enter. Stops at the first gesture that changes the document.',
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type(`- [ ] ${BODY}`)
        await probeSetup(driver, 'checklist.toggle')
      },
      actions: async (driver) => {
        probe.attempts = await attemptToggle(driver)
        await probeAfter(driver)
      },
      resultState: [
        toggleState,
        // Gated for EVERY subject lacking the capability: without a declared
        // state there is no holder whose focusability could be judged, at any
        // layer.
        gated(
          toggleFocusable,
          'nothing declares a checked state, so there is no state holder to judge',
        ),
      ],
      announcement: [toggleAnnouncedState, toggleAnnouncesStateNotAction],
    }),

    operation({
      id: 'checklist.exit',
      // CAN-CB-058 — "Leaving a to-do list" (vector X1/X*), payload
      // `direction:left, container:tasklist`.
      scenarios: ['CAN-CB-058'],
      title: 'Press Enter on an empty task item',
      precondition:
        'The editor contains "- [ ] alpha" and a second, empty task item; the caret is in the empty item.',
      operationText: 'Press Enter.',
      setup: async (driver) => {
        await driver.focusEditor()
        await driver.type(`- [ ] ${BODY}`)
        await driver.press('Enter')
        await probeSetup(driver, 'checklist.exit')
      },
      actions: async (driver) => {
        await driver.press('Enter')
        await probeAfter(driver)
      },
      resultState: [exitStructure, exitCaret],
      announcement: [exitAnnounced, exitNamesTaskList],
    }),
  ],
})

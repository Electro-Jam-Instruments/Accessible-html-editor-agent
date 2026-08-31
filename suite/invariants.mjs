/**
 * invariants.mjs — the repeated assertion shapes, as parameterised predicate
 * factories (P0.5 session 2; the design is conformance-suite-design.md, "The
 * invariants": ~20 parameterised assertions, written once, editor-agnostic).
 *
 * Each factory returns an `assertion({...})`-compatible object (contract.mjs),
 * or — for the small result helpers at the top — the `{ pass, mode?, detail }`
 * shape an `evaluate()` returns. The contracts instantiate these over their
 * own tokens (vocabulary.mjs) and probes; what lives HERE is the shape of the
 * check, what lives THERE is the container, the gesture and the prose.
 *
 * The governing rule for this refactor, stated once: **behaviour must not
 * change.** Every default string below is verbatim from the contract it was
 * extracted from, and every divergence between two contracts' historical
 * wordings is preserved through a parameter rather than silently unified —
 * unification is a future session's job, to be proved by a re-run, not
 * assumed. That is also why most detail text arrives as callbacks: the suite's
 * failure prose is per-container by design (it names the user's actual
 * situation), and flattening it into generic strings would make the report
 * worse in order to make this file smaller.
 *
 * Coverage of the conformance-suite invariants:
 *
 *   C-1..C-8  containment  — containerCreated, containerEntered,
 *             containerExited, containerDestroyed, enteredWithoutEditing,
 *             contentPreserved, announcementConveys (+ announcedOnce,
 *             announcedPolitely refinements), announcementRefines,
 *             exitConveysLeavingNotRemoval / destroyConveysRemoval (C-5),
 *             and the parity* family (C-3/C-4, the comparative shape).
 *   A-1..A-4  automated conversion — announcementConveys (A-1, and A-3 via
 *             history's op tokens), containerCreated (A-2). A-4 (untransformed
 *             typing announces nothing) has no factory yet: no contract
 *             measures it.
 *   T-1..T-5  toggle/state — stateExposed (the AX-first, DOM-fallback state
 *             discipline behind T-4/T-5); T-1's action-vs-state wording check
 *             stays bespoke in checklist.mjs (it interleaves two vocabulary
 *             tokens with prose that names the gesture attempts).
 *   M-1..M-7  menus — no factory yet: no contract exercises a typeahead menu.
 *
 * Two protocol predicates round it out (MASTER-PLAN §6: a subject that cannot
 * perform the operation reports "precondition not reached", never a
 * silent-announcer failure and never a crash): preconditionNotReached() and
 * staleProbe().
 */

import { assertion, MUST, SHOULD, matchAnnouncement, announcementsOf } from './contract.mjs'
import {
  CONTAINER_BLOCKQUOTE,
  CONTAINER_CODEBLOCK_COMPARATIVE,
  CONTAINER_LIST_COMPARATIVE,
  CONTAINER_HEADING_COMPARATIVE,
  CONTAINER_TABLE,
} from './vocabulary.mjs'

/* ================================================================== */
/* Protocol predicates: honest non-results                             */
/* ================================================================== */

/**
 * A result for an operation whose precondition the subject never reached.
 *
 * The discipline (MASTER-PLAN §6, and the trap list.mjs's outdent clause is
 * written around): "not reached" is reported as an explicit failure with a
 * truthful first phrase, because the precondition's absence often LOOKS like
 * the operation's success — "not nested" is exactly what a successful outdent
 * produces — and an end-state-only check would be a false PASS.
 *
 * `phrase` exists because blockquote.mjs historically says "precondition not
 * met" where every other contract says "precondition not reached"; both are
 * preserved verbatim.
 */
export function preconditionNotReached(
  detail,
  { mode = 'structural', phrase = 'precondition not reached' } = {},
) {
  return { pass: false, mode, detail: `${phrase}: ${detail}` }
}

/**
 * A result for an assertion whose probe slot holds another run's reading (or
 * none). Judging stale data would be worse than failing loudly: the verdict
 * would be about a different subject. `what` names the probe so the message
 * says which instrument failed ("containment reading", "probe reading",
 * "vector readings").
 */
export function staleProbe(what) {
  return {
    pass: false,
    detail:
      `harness error: no ${what} for this subject/operation, so nothing can be judged. ` +
      `This is a bug in the clause, not a result.`,
  }
}

/* ================================================================== */
/* Structure half: containment (C-1, C-4, C-5, C-7, C-8; A-2)          */
/* ================================================================== */

/**
 * C-1 (structure half) / A-2 — the container the operation was meant to
 * create is real: in the AX tree for a rich subject, and — for a plain-text
 * subject, which has nowhere to put structure — present as the textual
 * equivalent, scored PASS~ (mode 'textual-equivalent'), never as an
 * unqualified structural pass. This factory owns that discipline; the
 * contract supplies what "real" looks like for its container.
 *
 *   rich   ({ before, after, subject }) => { pass, detail } — the structural
 *          detection; the factory stamps mode 'structural' (a callback may
 *          override it for the rare "unexpectedly structural" plaintext case
 *          by returning its own mode).
 *   plain  either { expectedText, passDetail } — the uniform textual
 *          equivalent: domText must equal expectedText, and a miss reports
 *          `expected <it>, got <actual>` — or a function (ctx) => result for
 *          the contracts whose equivalent also checks the caret.
 */
export function containerCreated({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = MUST,
  rich,
  plain,
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: (ctx) => {
      if (ctx.subject.kind === 'rich') {
        return { mode: 'structural', ...rich(ctx) }
      }
      if (typeof plain === 'function') return plain(ctx)
      const ok = ctx.after.domText === plain.expectedText
      return {
        pass: ok,
        mode: 'textual-equivalent',
        detail: ok
          ? plain.passDetail
          : `expected ${JSON.stringify(plain.expectedText)}, got ${JSON.stringify(ctx.after.domText)}`,
      }
    },
  })
}

/**
 * C-1 / C-3 (structure half) — a navigation vector genuinely crossed INTO the
 * container. The shape encodes the two precondition guards that make the
 * measurement honest: the container must exist before the vector (else there
 * is nothing to enter), and the caret must be OUTSIDE it before the vector
 * (else no crossing was exercised). Both report as precondition failures with
 * the contract's own prose, never as announcer verdicts.
 *
 *   read(subject)        the contract's probe accessor; null => `stale`
 *   notApplicable(ctx)   result for a subject where the construct cannot
 *                        exist at any layer (flat fields), or null to fall
 *                        through to the rich path
 *   containersBefore(c)  how many container elements existed before
 *   inside(state)        is the caret inside, for one probe state
 */
export function containerEntered({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = MUST,
  read,
  stale,
  notApplicable,
  containersBefore,
  inside,
  noContainerDetail,
  alreadyInsideDetail,
  crossedDetail,
  notCrossedDetail,
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: (ctx) => {
      if (ctx.subject.kind !== 'rich') return notApplicable(ctx)
      const c = read(ctx.subject)
      if (!c) return stale
      if (containersBefore(c) === 0) {
        return { pass: false, mode: 'structural', detail: noContainerDetail(c) }
      }
      if (inside(c.before)) {
        return { pass: false, mode: 'structural', detail: alreadyInsideDetail(c) }
      }
      const ok = inside(c.after)
      return {
        pass: ok,
        mode: 'structural',
        detail: ok ? crossedDetail(c) : notCrossedDetail(c),
      }
    },
  })
}

/**
 * C-4 / C-5 / C-7 (structure half) — the escape gesture left the container
 * WITHOUT destroying it. The three-way verdict is the point: out-and-survived
 * is the only pass; out-but-gone is a destruction misdescribed as an exit
 * (C-5) and fails with prose that says so; still-inside fails against C-7.
 *
 *   survived(c, ctx)  does the container still exist and hold its content
 *   extraFail(c, { out, survived }) optional pre-verdict branch (codeblock's
 *                     escape-loop bound), returning a result or null
 */
export function containerExited({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = MUST,
  read,
  stale,
  notApplicable,
  containersBefore,
  inside,
  survived,
  extraFail,
  noContainerDetail,
  leftDetail,
  destroyedNotExitedDetail,
  stillInsideDetail,
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: (ctx) => {
      if (ctx.subject.kind !== 'rich') return notApplicable(ctx)
      const c = read(ctx.subject)
      if (!c) return stale
      if (containersBefore(c) === 0) {
        return { pass: false, mode: 'structural', detail: noContainerDetail(c) }
      }
      const out = !inside(c.after)
      const lived = survived(c, ctx)
      if (extraFail) {
        const r = extraFail(c, { out, survived: lived })
        if (r) return r
      }
      if (out && lived) {
        return { pass: true, mode: 'structural', detail: leftDetail(c, ctx) }
      }
      if (out && !lived) {
        return { pass: false, mode: 'structural', detail: destroyedNotExitedDetail(c, ctx) }
      }
      return { pass: false, mode: 'structural', detail: stillInsideDetail(c, ctx) }
    },
  })
}

/**
 * C-5 (structure half) — a destroying vector actually dissolved the container
 * and kept its text. The pass requires BOTH: gone-and-kept. Anything else —
 * container survived, or its text went with it — fails with the contract's
 * own diagnosis.
 */
export function containerDestroyed({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = MUST,
  read,
  stale,
  notApplicable,
  containersBefore,
  gone,
  kept,
  noContainerDetail,
  dissolvedDetail,
  notDissolvedDetail,
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: (ctx) => {
      if (ctx.subject.kind !== 'rich') return notApplicable(ctx)
      const c = read(ctx.subject)
      if (!c) return stale
      if (containersBefore(c) === 0) {
        return { pass: false, mode: 'structural', detail: noContainerDetail(c) }
      }
      const g = gone(c)
      const k = kept(c, ctx)
      if (g && k) {
        return { pass: true, mode: 'structural', detail: dissolvedDetail(c, ctx) }
      }
      return { pass: false, mode: 'structural', detail: notDissolvedDetail(c, ctx) }
    },
  })
}

/**
 * C-2 support — entering by pure navigation modifies nothing. This is what
 * makes the entry measurement mean anything: `blockquote.enter` and
 * `codeblock.enter` mutate zero bytes of the document, which is precisely why
 * a mutation-hooked announcer cannot fire on them (entry-parity.mjs's
 * argument). Detail strings are shared verbatim by both historical sites.
 */
export function enteredWithoutEditing({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = SHOULD,
  read,
  inside,
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: ({ before, after, subject }) => {
      const same = before.domText === after.domText
      const c = read(subject)
      const crossed = subject.kind === 'rich' && c && !inside(c.before) && inside(c.after)
      return {
        pass: same,
        detail: same
          ? crossed
            ? 'text identical across the crossing — the caret moved, the document did not'
            : 'text identical (no crossing happened in this subject, so this is a weak pass: ' +
              'nothing moved because there was nothing to move into)'
          : `the document changed during a pure navigation: ` +
            `${JSON.stringify(before.domText)} → ${JSON.stringify(after.domText)}`,
      }
    },
  })
}

/**
 * C-7 — the keyboard exit (or destroy) lost none of the container's content.
 * The check is one substring test; the value is the pair of details, which
 * say WHICH gesture the content survived (or did not).
 */
export function contentPreserved({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = SHOULD,
  body,
  passDetail,
  failDetail,
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: ({ after }) => {
      const ok = after.domText.includes(body)
      return { pass: ok, detail: ok ? passDetail : failDetail(after) }
    },
  })
}

/* ================================================================== */
/* Announcement half (C-1, C-3, C-4, C-6; A-1, A-3)                    */
/* ================================================================== */

/**
 * announcement-conveys(token) — the workhorse. C-1's announcement half, and
 * A-1's (a typed sequence the editor transforms announces what it became);
 * with history.mjs's op tokens it is also A-3's "the undo is announced".
 *
 *   token       a vocabulary RegExp, or a predicate (announcement) => bool
 *               for compound tokens (list.mjs's ordinal-on-an-item)
 *   hitDetail   (hit, ctx) => string; the default is the suite's standard
 *               `[politeness] "text"` rendering
 *   missDetail  (after, ctx) => string — the contract's failure prose, which
 *               names what changed and why silence costs the user
 */
export function announcementConveys({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = MUST,
  token,
  hitDetail = (hit) => `[${hit.politeness}] ${JSON.stringify(hit.text)}`,
  missDetail,
}) {
  const find = (after) =>
    typeof token === 'function'
      ? announcementsOf(after).find(token) || null
      : matchAnnouncement(after, token)
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: (ctx) => {
      const hit = find(ctx.after)
      if (hit) return { pass: true, detail: hitDetail(hit, ctx) }
      return { pass: false, detail: missDetail(ctx.after, ctx) }
    },
  })
}

/**
 * C-1's "exactly once" refinement — one crossing is one announcement.
 * Repeated speech is a real defect (the user hears the construct twice and
 * wonders whether there are two), so more-than-one fails with the contract's
 * rendering of what repeated; zero defers to the MUST-level conveys
 * assertion, with a fixed pointer string.
 */
export function announcedOnce({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = SHOULD,
  token,
  manyDetail,
  noneDetail = 'no announcement at all (see .announcement)',
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: ({ after }) => {
      const hits = (after.announcements || []).filter((a) => token.test(a.text))
      if (hits.length === 1) return { pass: true, detail: 'exactly one matching announcement' }
      if (hits.length === 0) return { pass: false, detail: noneDetail }
      return { pass: false, detail: manyDetail(hits) }
    },
  })
}

/**
 * Politeness refinement — the crossing announcement is polite, not assertive.
 * An assertive live region interrupts the user mid-typing for something they
 * caused themselves. Detail strings are shared verbatim by every historical
 * site (bulleted-list, blockquote, codeblock).
 */
export function announcedPolitely({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = SHOULD,
  token,
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: ({ after }) => {
      const hit = matchAnnouncement(after, token)
      if (!hit) return { pass: false, detail: 'no announcement to judge' }
      const ok = hit.politeness === 'polite'
      return {
        pass: ok,
        detail: ok
          ? 'aria-live="polite"'
          : `politeness="${hit.politeness}" — interrupts the user mid-typing`,
      }
    },
  })
}

/**
 * Refinement on the anchored announcement — C-6 (the announcement names the
 * NEW depth), and the payload refinements of A-1 (the heading's level, the
 * item's position, the exit's destination). Finds the announcement that
 * already passed the anchor token, then requires the refining token on THAT
 * text — never on the journal at large, so an editor cannot pass by saying
 * the refinement somewhere unrelated.
 */
export function announcementRefines({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = SHOULD,
  anchor,
  refine,
  okDetail,
  missDetail,
  noneDetail = 'no announcement to judge',
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: ({ after }) => {
      const hit = matchAnnouncement(after, anchor)
      if (!hit) return { pass: false, detail: noneDetail }
      const ok = refine.test(hit.text)
      return { pass: ok, detail: ok ? okDetail(hit) : missDetail(hit) }
    },
  })
}

/**
 * C-5, announcement half, exit side — the announcement conveys LEAVING and
 * does not convey REMOVAL. The two directions are asserted against each
 * other because an editor that says one string for both has told the user
 * something false half the time. The three-way verdict (left / claimed
 * removal / named the container but no direction) is the shape; the prose
 * per branch is the contract's.
 */
export function exitConveysLeavingNotRemoval({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = SHOULD,
  names,
  leaving,
  removal,
  leftDetail = (hit) => `${JSON.stringify(hit.text)} conveys leaving, not removal`,
  removedDetail,
  directionlessDetail,
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: ({ after }) => {
      const hit = matchAnnouncement(after, names)
      if (!hit) return { pass: false, detail: 'no announcement to judge' }
      const left = leaving.test(hit.text)
      const removed = removal.test(hit.text)
      if (left && !removed) return { pass: true, detail: leftDetail(hit) }
      if (removed) return { pass: false, detail: removedDetail(hit) }
      return { pass: false, detail: directionlessDetail(hit) }
    },
  })
}

/**
 * C-5, announcement half, destroy side — the announcement conveys that the
 * structure itself is GONE, distinctly from the caret having left it.
 */
export function destroyConveysRemoval({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = SHOULD,
  names,
  removal,
  removedDetail,
  notRemovedDetail,
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: ({ after }) => {
      const hit = matchAnnouncement(after, names)
      if (!hit) return { pass: false, detail: 'no announcement to judge' }
      if (removal.test(hit.text)) return { pass: true, detail: removedDetail(hit) }
      return { pass: false, detail: notRemovedDetail(hit) }
    },
  })
}

/* ================================================================== */
/* State (T-1..T-5 territory; the checklist family)                    */
/* ================================================================== */

/**
 * state-exposed — the AX-first, DOM-fallback discipline behind checklist.mjs
 * (and the state analogue of A-2/T-5: the state the user needs is REAL in
 * the accessibility tree, not merely drawn). The order is the invariant:
 *
 *   1. an optional guard (a precondition check that must run first — the
 *      toggle clause's "was there an unchecked item to tick at all");
 *   2. the AX tree is read and is the authority: `passWhen` over the
 *      normalised checkbox states decides the pass;
 *   3. only then the ordered fallbacks, which exist to tell the rarer
 *      failures apart — wrong state, DOM-declared-but-not-surfaced, drawn
 *      but never declared, not expressible at all — because "no checkbox
 *      role" and "the markup is right and the tree dropped it" are
 *      different findings. The final fallback must be total.
 *
 *   guard(ctx)            => result | null
 *   axStates(ctx)         => normalised states from the AX tree
 *   passWhen(states)      => boolean
 *   passDetail(states, ctx) => string (mode 'structural' stamped)
 *   fallbacks             [(ctx, states) => result | null], last one total
 */
export function stateExposed({
  assertionId,
  assertionStatement,
  assertionPhrase,
  priority = MUST,
  guard,
  axStates,
  passWhen,
  passDetail,
  fallbacks,
}) {
  return assertion({
    assertionId,
    assertionStatement,
    assertionPhrase,
    priority,
    evaluate: (ctx) => {
      if (guard) {
        const g = guard(ctx)
        if (g) return g
      }
      const states = axStates(ctx)
      if (passWhen(states)) {
        return { pass: true, mode: 'structural', detail: passDetail(states, ctx) }
      }
      for (const fb of fallbacks) {
        const r = fb(ctx, states)
        if (r) return r
      }
      throw new Error(`${assertionId}: no fallback produced a verdict — the last fallback must be total`)
    },
  })
}

/* ================================================================== */
/* Parity: the comparative shape (C-3, and C-4 by symmetry)            */
/* ================================================================== */

/**
 * Container constructs an announcement can name, from vocabulary.mjs.
 * Generous on wording, strict on substance: any phrase a screen-reader user
 * would accept as "this is a X". Order matters only for reporting (the sets
 * built from this table render in insertion order).
 */
const CONSTRUCT_WORDS = [
  ['blockquote', CONTAINER_BLOCKQUOTE],
  ['codeblock', CONTAINER_CODEBLOCK_COMPARATIVE],
  ['list', CONTAINER_LIST_COMPARATIVE],
  ['heading', CONTAINER_HEADING_COMPARATIVE],
  ['table', CONTAINER_TABLE],
]

/** The set of container constructs a piece of announced text names. */
export function constructsIn(text) {
  const out = new Set()
  for (const [name, re] of CONSTRUCT_WORDS) if (re.test(text)) out.add(name)
  return out
}

/** The set of constructs named across everything one vector announced. */
export function constructsOf(vector) {
  const out = new Set()
  for (const a of vector.announcements) for (const c of constructsIn(a.text)) out.add(c)
  return out
}

const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x))
const show = (s) => (s.size ? [...s].join('+') : '(names no container)')

/** One vector's identity line for the comparative details. */
export function renderVector(v) {
  const said = v.announcements.length
    ? v.announcements.map((a) => `[${a.politeness}] ${JSON.stringify(a.text)}`).join(' · ')
    : '(silent)'
  return `${v.id} ${v.name}: ${said}`
}

/**
 * The parity family — invariant C-3 as a COMPARISON, the only shape of
 * question that can catch it (entry-parity.mjs's argument: per-vector rows
 * cannot see that the same destination announced on one route and not the
 * other). Each factory takes the contract's `spec` (container, noun, marker,
 * opId) plus `deps`:
 *
 *   vectors(subject, opId)      the contract's probe accessor: the two
 *                               vector records, or null (=> `stale`)
 *   crossing(spec, v, subject)  the contract's per-subject-kind crossing
 *                               verdict { ok, why } (stays in the contract:
 *                               it reads the contract's own probe shape)
 *   stale                       the result for a missing probe read
 *
 * Four assertions per container, and the division of labour is load-bearing:
 * both-reach voids the comparison rather than letting two vectors that
 * arrived nowhere "agree"; both-announce is where the C-3 violation lands;
 * same-identity compares the construct SETS, never wording; neither is the
 * SHOULD-level record of total silence.
 */
export function parityBothReach(spec, { vectors, crossing, stale }) {
  return assertion({
    assertionId: `parity.${spec.container}.both-reach`,
    assertionStatement:
      `Both entry vectors put the caret inside a ${spec.noun}, so the two are comparable.`,
    assertionPhrase: `reach the ${spec.noun} by both vectors`,
    priority: MUST,
    evaluate: ({ subject }) => {
      const vs = vectors(subject, spec.opId)
      if (!vs) return stale
      const mode = subject.kind === 'rich' ? 'structural' : 'textual-equivalent'
      const cs = vs.map((v) => crossing(spec, v, subject))
      if (cs.every((c) => c.ok)) {
        return {
          pass: true,
          mode,
          detail:
            (mode === 'textual-equivalent'
              ? `no containment exists in a flat field; both vectors reached a line carrying ` +
                `the ${spec.marker.trim()} marker, which is the strongest equivalent this ` +
                `subject can offer. `
              : `both vectors crossed into a ${spec.noun} by different code paths. `) +
            vs.map((v, i) => `${v.id} ${v.name}: ${cs[i].why}`).join(' | '),
        }
      }
      const failed = vs.filter((_, i) => !cs[i].ok)
      return {
        pass: false,
        mode,
        detail:
          `COMPARISON VOID — ${failed.length} of 2 vectors never reached a ${spec.noun}, so ` +
          `there is nothing to compare and this row must not be read as agreement. ` +
          `Two vectors that both arrived nowhere agree perfectly and mean nothing. ` +
          vs.map((v, i) => `${v.id} ${v.name}: ${cs[i].ok ? 'reached — ' : 'NOT REACHED — '}${cs[i].why}`)
            .join(' | '),
      }
    },
  })
}

export function parityBothAnnounce(spec, { vectors, stale }) {
  return assertion({
    assertionId: `parity.${spec.container}.both-announce`,
    assertionStatement:
      `Both entry vectors announce the arrival: if either speaks, both must (C-3).`,
    assertionPhrase: 'announce on both entry vectors',
    priority: MUST,
    evaluate: ({ subject }) => {
      const vs = vectors(subject, spec.opId)
      if (!vs) return stale
      const spoke = vs.filter((v) => v.announcements.length > 0)
      if (spoke.length === 2) {
        return { pass: true, detail: `both vectors spoke — ${vs.map(renderVector).join(' | ')}` }
      }
      if (spoke.length === 1) {
        const quiet = vs.find((v) => v.announcements.length === 0)
        return {
          pass: false,
          detail:
            `PARITY VIOLATION (C-3) — ${spoke[0].id} ${spoke[0].name} announced and ` +
            `${quiet.id} ${quiet.name} said nothing, for the SAME destination. This is the ` +
            `failure ordinary per-vector testing cannot see: measured separately these are ` +
            `one green row and one red row, but together they are worse than silence, ` +
            `because the user has been taught that entry is signalled and will read the ` +
            `silence on ${quiet.id} as "I am not in a ${spec.noun}". ` +
            vs.map(renderVector).join(' | '),
        }
      }
      return {
        pass: false,
        detail:
          `both vectors silent — symmetric, and therefore not a C-3 violation, but not a ` +
          `pass either: nothing announced on either path. Scored as unsatisfied so the ` +
          `outcome for this row reads discoverable (real structure, found on navigation) ` +
          `or absent (neither), never announced. See .neither for the honest record. ` +
          vs.map(renderVector).join(' | '),
      }
    },
  })
}

export function paritySameIdentity(spec, { vectors, stale }) {
  return assertion({
    assertionId: `parity.${spec.container}.same-identity`,
    assertionStatement:
      `When both vectors announce, both name the same container construct. Wording may differ.`,
    assertionPhrase: 'name the same container on both vectors',
    priority: MUST,
    evaluate: ({ subject }) => {
      const vs = vectors(subject, spec.opId)
      if (!vs) return stale
      const spoke = vs.filter((v) => v.announcements.length > 0)
      if (spoke.length < 2) {
        return {
          pass: false,
          detail:
            `${spoke.length} of 2 vectors announced, so there is no pair of identities to ` +
            `compare. Not judged as disagreement — judged as unmeasurable, which is what ` +
            `.both-announce is for. ` + vs.map(renderVector).join(' | '),
        }
      }
      const sets = vs.map(constructsOf)
      if (sets.some((s) => s.size === 0)) {
        const mute = vs.filter((_, i) => sets[i].size === 0)
        return {
          pass: false,
          detail:
            `${mute.map((v) => v.id).join(' and ')} announced without naming any container ` +
            `construct, so the user heard a noise rather than an identity. ` +
            vs.map((v, i) => `${renderVector(v)} → ${show(sets[i])}`).join(' | '),
        }
      }
      if (!setEq(sets[0], sets[1])) {
        return {
          pass: false,
          detail:
            `DIFFERENT CONSTRUCTS — ${vs[0].id} named ${show(sets[0])}, ${vs[1].id} named ` +
            `${show(sets[1])}, for the same destination. Different wording would be fine; a ` +
            `different construct means the user's model of where they are depends on how ` +
            `they got there. ` + vs.map(renderVector).join(' | '),
        }
      }
      const agreed = sets[0]
      const right = agreed.has(spec.container)
      return {
        pass: true,
        detail:
          `both vectors named ${show(agreed)}` +
          (right
            ? ' — the container actually entered. '
            : ` — but the caret entered a ${spec.container}, so both are consistently ` +
              `misnaming it. Consistent, which is what this assertion measures, and wrong, ` +
              `which .both-reach records. `) +
          vs.map(renderVector).join(' | '),
      }
    },
  })
}

export function parityNeitherSpoke(spec, { vectors, stale }) {
  return assertion({
    assertionId: `parity.${spec.container}.neither`,
    assertionStatement:
      `At least one vector announced, so parity is a comparison rather than two silences.`,
    assertionPhrase: 'say anything at all on either vector',
    priority: SHOULD,
    evaluate: ({ subject }) => {
      const vs = vectors(subject, spec.opId)
      if (!vs) return stale
      const spoke = vs.filter((v) => v.announcements.length > 0)
      if (spoke.length > 0) {
        return {
          pass: true,
          detail:
            `${spoke.length} of 2 vectors spoke, so the parity comparison has content. ` +
            vs.map(renderVector).join(' | '),
        }
      }
      return {
        pass: false,
        detail:
          `NEITHER VECTOR SPOKE. This is the common case in the corpus and it is recorded ` +
          `honestly rather than counted as agreement: two silences are trivially equal and ` +
          `prove nothing about C-3. The user was not told on entry by either route; whether ` +
          `they can find out later depends on the structure, which is why the outcome for ` +
          `this row is discoverable (real ${spec.noun} to navigate back to) or absent (none), ` +
          `and never announced. ` + vs.map(renderVector).join(' | '),
      }
    },
  })
}

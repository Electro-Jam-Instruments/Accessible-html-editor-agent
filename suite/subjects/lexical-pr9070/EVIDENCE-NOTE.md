# Measured evidence for facebook/lexical#9070 (QuoteAnnounceExtension)

Material for the OWNER to draw on when commenting on the PR, in their own
voice — this repository does not post to the PR itself. **The measurement was
performed by an AI agent** (Claude, orchestrated session of 2026-08-30) using
the harness in `docs/7-DEVELOPMENT/a11y/harness/`; commands to reproduce it
independently are at the end.

## What was measured

The harness's `blockquote` contract — one container, four vectors (create by
`> ` autoformat, enter by ArrowDown, exit by Enter at the end, destroy by
Backspace at the start), each vector asserting both the resulting structure
and what a live region announced at the moment of the change.

- **Branch subject:** built from the PR head,
  commit `7737554bbc0bfc81d3b6ec3f46b2fa480ab86f0f` (a merge of
  `a11y-quote-announce` with then-current `main`), packages built with
  `pnpm run build`, bundled from `packages/<pkg>/dist` — the PR's own code,
  not an npm build. Config is strict defaults on the extension API:
  `RichTextExtension` + `ListExtension` (+ `CodeExtension`/`LinkExtension`
  for the markdown transformers), nothing opted in.
- **Baseline ("main") column:** the standing `lexical-next` subject — the
  identical configuration on `lexical@0.49.1-nightly.20260828.0`, which
  predates this PR — from the committed `harness/results.json`
  (generated 2026-08-29).

## Result: before / after

MUST-level announcement assertions, plus the outcome row ("does the user find
out?"). Structure assertions pass on both sides throughout — the editor's DOM
and AX tree were already correct; what the PR changes is whether the user is
*told at the moment of the change*.

| Vector | Assertion | main (nightly 2026-08-28) | PR #9070 branch | Announced string on branch |
|---|---|---|---|---|
| create (`> ` autoformat) | `blockquote.create.announcement` (MUST) | FAIL | **PASS** | `[polite] "Block quote"` |
| enter (ArrowDown into existing quote) | `blockquote.enter.announcement` (MUST) | FAIL | FAIL | *(none — see verdict below)* |
| exit (Enter at end of quote) | `blockquote.exit.announcement` (MUST) | FAIL | **PASS** | `[polite] "Exiting block quote"` |
| destroy (Backspace at start) | `blockquote.destroy.announcement` (MUST) | FAIL | **PASS** | `[polite] "Block quote removed"` |

| Vector | Outcome on main | Outcome on branch |
|---|---|---|
| create | discoverable | **announced** |
| enter | discoverable | discoverable |
| exit | discoverable | **announced** |
| destroy | **absent** | **announced** |

The `destroy` row is the strongest single cell: on main it is `absent` — the
structure that would have told the user on navigation is precisely what
stopped existing, so there is no fallback — and the branch takes it straight
to `announced`.

The SHOULD-level refinements also all pass on the branch where an
announcement exists: exactly one announcement per crossing, `polite` (not
assertive), and — invariant C-5 — the exit string conveys *leaving* without
conveying *removal*, while the destroy string conveys *removal*. The wording
distinguishes the two facts the user most needs told apart: "the caret moved
out of a quotation that still exists" versus "the quotation stopped existing
around a caret that never moved." (The PR's fourth string, "Block quote
removed, in block quote" for removing a nested quote, is outside this
contract's four vectors and was not measured.)

Two runs produced byte-identical output apart from the `generatedAt`
timestamp.

## The enter vector: red, and deliberately so

Pre-stated expectation (MASTER-PLAN §7 W3 C-branch): *enter stays red unless
the extension hooks selection change*, because the measured fact E3
established that arrow-entry mutates nothing — before/after text is
byte-identical; only the caret's ancestor chain changes.

Measured: ArrowDown from the paragraph above into the existing quote crossed
the boundary (`p › span → blockquote › span`, document unmodified) and
announced nothing.

Mechanism, from the PR's source
(`packages/lexical-rich-text/src/QuoteAnnounceExtension.ts` at commit
`7737554bbc0`):

- The extension registers a `QuoteNode` **mutation listener** (line 111) and
  an **update listener** (line 128). The update listener *does* read the
  selection — it compares the caret's containing quote before and after the
  update — so this is not a pure mutation hook.
- But crossing announcements are **gated on the far-side block having been
  created or destroyed in the same update**: `entered` fires only when the
  block the caret left is missing from the new state (line 167), and
  `exited` only when the block the caret arrived in is missing from the
  previous state (line 174). A pure arrow crossing satisfies neither guard —
  both blocks already existed — and is additionally short-circuited when the
  update dirtied nothing (line 134).
- This is an explicit design decision, not an oversight. The doc comment
  (lines 54–58) says arrow crossings are "left alone: both blocks are
  already there and the screen reader reports the boundary itself."

So the accurate characterisation for the PR discussion is: **the PR announces
every vector in which the document changes (create, exit-by-Enter, destroy)
and deliberately delegates pure caret crossings to the screen reader.** The
harness's C-3 invariant records the consequence: create and arrow-entry now
convey different things (an announcement vs. silence) for the same container
identity. Whether the delegation is safe maps onto this project's B2
finding (WORK-QUEUE): per NVDA's source, focus mode *should* report the
blockquote boundary on a caret crossing — which supports the PR's rationale —
but an observed Windows silence on exactly this crossing remains an
unexplained discrepancy, with a real-Windows NVDA confirmation still pending.
If the silence turns out to be real, the arrow vector's quiet lands on the
user; if focus mode reports as the source says it should, the PR's
delegation is correct and the red `enter` cell is the harness being stricter
than the platform requires. Either way it is a per-vector fact worth stating
in the PR rather than leaving implicit.

## Vocabulary check (suite self-test)

The harness's vocabulary (`harness/vocabulary.mjs`) was written before this
measurement to be *generous on wording, strict on substance*, with the
explicit design goal that #9070's strings pass without the vocabulary being
written for them. Measured: all three observed strings — "Block quote",
"Exiting block quote", "Block quote removed" — were accepted by the standing
entries (`CONTAINER_BLOCKQUOTE`, `DIRECTION_LEFT`, `DIRECTION_REMOVED_QUOTE`)
**without any modification to the vocabulary or the contract**. The design
held.

## Reproduction

```sh
# facebook/lexical at the PR head
git clone https://github.com/facebook/lexical lexical && cd lexical
git fetch origin pull/9070/head:pr9070 --depth 50
git checkout pr9070                      # 7737554bbc0 when measured
pnpm install && pnpm run build

# subject bundle from the checkout's dist (never from npm)
cd <this repo>/docs/7-DEVELOPMENT/a11y/harness/subjects/lexical-pr9070
npm install
LEXICAL_CHECKOUT=<path to lexical checkout> node build.mjs

# run the contract via a gitignored copy of the runner (run.mjs is never
# edited; --contract requires --out so the shared results.json is untouched):
cd ..; cd ..
cp run.mjs run-pr9070.mjs   # then add the lexical-pr9070 subject to its SUBJECTS list
node run-pr9070.mjs --contract=blockquote --out=/tmp/pr9070-blockquote.json --allow-failures
# run twice; output must be byte-identical apart from generatedAt
```

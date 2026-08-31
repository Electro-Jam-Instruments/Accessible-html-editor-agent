#!/usr/bin/env node
/**
 * run.mjs — run a contract against every subject and print the comparison table.
 *
 *   node docs/7-DEVELOPMENT/a11y/harness/run.mjs
 *   node docs/7-DEVELOPMENT/a11y/harness/run.mjs --verbose
 *   node docs/7-DEVELOPMENT/a11y/harness/run.mjs --allow-failures   # always exit 0
 *
 * Exit code is non-zero when any MUST assertion fails. For the current corpus
 * that is the EXPECTED outcome — the announcement clauses are supposed to fail
 * on real editors, and that failure is the finding. Use --allow-failures when
 * running this as a report rather than as a gate.
 */

import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs'
import { launch } from './driver.mjs'
import { PRIORITY_ORDER } from './contract.mjs'
import { adapterFor } from './adapters/index.mjs'
import bulletedList from './contracts/bulleted-list.mjs'
import heading from './contracts/heading.mjs'
import history from './contracts/history.mjs'
import blockquote from './contracts/blockquote.mjs'
import list from './contracts/list.mjs'
import codeblock from './contracts/codeblock.mjs'
import entryParity from './contracts/entry-parity.mjs'
import checklist from './contracts/checklist.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const argv = new Set(process.argv.slice(2))
const VERBOSE = argv.has('--verbose') || argv.has('-v')
const ALLOW_FAILURES = argv.has('--allow-failures')
// `run` reports; `--check` gates. They are different jobs. A run measures every
// subject, and most subjects are red on purpose - that is the finding, not a
// regression, so a run must not fail a build. `--check` compares ONE subject
// against a committed baseline and fails only on a backward step.
const CHECK = argv.has('--check')
const CHECK_SUBJECT = (() => {
  for (const a of argv) {
    const m = /^--subject=(.+)$/.exec(a)
    if (m) return m[1]
  }
  return 'open-notebook-fixed'
})()
// One baseline file per gated subject, so each subject's gate moves (and fails)
// independently. `--check --subject=X` reads/writes baselines/X.json; on a first
// run with no baseline it writes one from the measurement.
const BASELINES_DIR = resolve(HERE, 'baselines')
const BASELINE = resolve(BASELINES_DIR, `${CHECK_SUBJECT}.json`)
// Run one contract in isolation, and write results somewhere other than the
// shared results.json. Both exist so several authors (or agents) can develop
// clauses concurrently without racing each other's output file.
const ONLY = (() => {
  for (const a of argv) {
    const m = /^--contract=(.+)$/.exec(a)
    if (m) return m[1]
  }
  return null
})()
// A single-contract run must never overwrite the shared corpus: its outcomes
// cover only the contracts it ran, so committing one silently deletes every
// other row. --contract therefore REQUIRES --out.
const OUT_EXPLICIT = (() => {
  for (const a of argv) {
    const m = /^--out=(.+)$/.exec(a)
    if (m) return resolve(m[1])
  }
  return null
})()
const OUT = OUT_EXPLICIT ?? resolve(HERE, 'results.json')

if (ONLY && OUT === resolve(HERE, 'results.json')) {
  console.error(
    `refusing to write a single-contract run to the shared results.json.\n` +
      `  --contract=${ONLY} covers one contract; results.json is the corpus of all of them.\n` +
      `  Pass --out=<path> to write elsewhere, or drop --contract to run the full suite.`,
  )
  process.exit(2)
}

const SUBJECTS = [
  { id: 'contenteditable', kind: 'rich', file: 'subjects/contenteditable.html' },
  { id: 'textarea-markdown', kind: 'plaintext', file: 'subjects/textarea-markdown.html' },
  {
    id: 'textarea-markdown-fixed',
    kind: 'plaintext',
    file: 'subjects/textarea-markdown-fixed.html',
  },
  // The real shipped editor, built locally from frontend/node_modules — see
  // subjects/build-uiw-md-editor.mjs. NOT checked in (third-party bundle;
  // REPO-PROPOSAL §4.1): build it to measure it, skipped with a hint otherwise.
  { id: 'uiw-react-md-editor', kind: 'plaintext', file: 'subjects/uiw-react-md-editor.html', optional: true },
  // The same editor as it ships in THIS repository, i.e. wrapped by our own
  // MarkdownEditor with the announcer and the hidden overlay. The pair
  // uiw-react-md-editor -> open-notebook-fixed is the before/after of the
  // worked example, measured rather than asserted. Generated — see
  // subjects/build-open-notebook.mjs. Not checked in: run the build script.
  { id: 'open-notebook-fixed', kind: 'plaintext', file: 'subjects/open-notebook-fixed.html', optional: true },
  // A stock Lexical React integration — the documented getting-started config,
  // which is what most applications ship. Generated; see subjects/lexical/build.mjs.
  { id: 'lexical-stock', kind: 'rich', file: 'subjects/lexical-stock.html', optional: true },
  // The same editor via the new extension API, on a nightly carrying the
  // accessibility-by-default work. See subjects/lexical-next/build.mjs.
  { id: 'lexical-next', kind: 'rich', file: 'subjects/lexical-next.html', optional: true },
  // The same build with every announcer opted in. The gap between this and
  // lexical-next is what an integrator has to know to ask for.
  { id: 'lexical-next-max', kind: 'rich', file: 'subjects/lexical-next-max.html', optional: true },
  // Stock Tiptap StarterKit 3.30.5 — the getting-started config, nothing added.
  // Generated; see subjects/tiptap/build.mjs. Measured 2026-08-30: 19
  // discoverable, 5 absent, zero announcements, zero live regions.
  { id: 'tiptap', kind: 'rich', file: 'subjects/tiptap.html', optional: true },
]

// An `optional` subject is one that must be built before it can be measured
// (it is generated, and deliberately not checked in). Skip it with a note
// rather than failing the run, so `node run.mjs` works on a fresh clone.
let ACTIVE = SUBJECTS.filter((s) => {
  if (!s.optional || existsSync(resolve(HERE, s.file))) return true
  console.log(
    `skipping ${s.id}: ${s.file} not built. ` +
      `Build it first (see subjects/ for its build script).`,
  )
  return false
})

// `--check` gates ONE subject, so it measures only that subject: the gate's
// verdict cannot depend on which other subjects happen to be built, and a CI
// job checking N subjects costs N single-subject runs, not N full suites.
// A gate on a subject that is missing must fail loudly, never pass vacuously.
if (CHECK) {
  const wanted = SUBJECTS.find((s) => s.id === CHECK_SUBJECT)
  if (!wanted) {
    console.error(
      `--check --subject=${CHECK_SUBJECT}: no such subject. ` +
        `Known subjects: ${SUBJECTS.map((s) => s.id).join(', ')}`,
    )
    process.exit(2)
  }
  if (!ACTIVE.includes(wanted)) {
    console.error(
      `--check --subject=${CHECK_SUBJECT}: ${wanted.file} is not built, so there is ` +
        `nothing to gate. Build it first (see subjects/ for its build script).`,
    )
    process.exit(2)
  }
  ACTIVE = [wanted]
}

// P0.5 session 3: thread each subject's adapter (capability declaration +
// gestures, adapters/index.mjs) onto the subject object handed to contracts.
// Non-enumerable on purpose: `{ ...subject }` spreads and JSON serialisation
// skip it, so report.subjects and results.json carry exactly what they always
// did — the adapter is consulted by clauses, never recorded as data.
for (const s of ACTIVE) {
  Object.defineProperty(s, 'adapter', { value: adapterFor(s.id), enumerable: false })
}

const ALL_CONTRACTS = [bulletedList, heading, history, blockquote, list, codeblock, entryParity, checklist]
const CONTRACTS = ONLY ? ALL_CONTRACTS.filter((c) => c.id === ONLY) : ALL_CONTRACTS

/* ------------------------------------------------------------------ */

const C = process.stdout.isTTY
  ? { red: (s) => `\x1b[31m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m` }
  : { red: (s) => s, green: (s) => s, yellow: (s) => s, dim: (s) => s, bold: (s) => s }

function cellText(r) {
  if (!r) return '—'
  if (r.error) return 'ERROR'
  if (!r.pass) return 'FAIL'
  return r.mode === 'textual-equivalent' ? 'PASS~' : 'PASS'
}

function colourCell(text) {
  if (text === 'PASS') return C.green(text)
  if (text === 'PASS~') return C.yellow(text)
  if (text === 'FAIL') return C.red(text)
  if (text === 'ERROR') return C.red(text)
  return C.dim(text)
}

/**
 * Preflight: prove real keystrokes actually enter this subject's field before
 * we assert anything about what they produced. A silently-dropped keystroke
 * would otherwise show up as a contract failure and we would blame the editor.
 */
async function preflight(driver, subject) {
  await driver.focusEditor()
  await driver.type('x')
  const snap = await driver.capture()
  if (!snap.domText.includes('x')) {
    throw new Error(
      `preflight failed for ${subject.id}: typed "x" via Input.dispatchKeyEvent but the ` +
        `editor's text is ${JSON.stringify(snap.domText)}. Keystrokes are not landing; ` +
        `no result from this subject would mean anything.`,
    )
  }
  if (!snap.focused) {
    throw new Error(`preflight failed for ${subject.id}: editor did not take focus`)
  }
}

async function runOperation(driver, subject, op) {
  const url = pathToFileURL(resolve(HERE, subject.file)).href
  // Fresh navigation per operation: the cleanest possible reset, and it clears
  // the announcement journal along with everything else.
  await driver.navigate(url)
  await op.setup(driver)
  const before = await driver.capture()
  // Setup keystrokes must not be credited to (or held against) the operation.
  await driver.resetAnnouncements()
  await op.actions(driver)
  const after = await driver.capture()

  const results = []
  for (const [half, list] of [
    ['resultState', op.resultState],
    ['announcement', op.announcement],
  ]) {
    for (const a of list) {
      let r
      try {
        r = a.evaluate({ before, after, subject, driver })
      } catch (e) {
        r = { pass: false, error: true, detail: `assertion threw: ${e.message}` }
      }
      results.push({
        assertionId: a.assertionId,
        assertionStatement: a.assertionStatement,
        assertionPhrase: a.assertionPhrase,
        priority: a.priority,
        half,
        pass: !!r.pass,
        error: !!r.error,
        mode: r.mode || null,
        detail: r.detail || '',
      })
    }
  }
  return { before, after, results }
}

async function main() {
  const started = new Date().toISOString()
  const driver = await launch()
  const report = {
    generatedAt: started,
    chrome: process.env.HARNESS_CHROME || 'chromium-1194',
    subjects: [],
    contracts: [],
    results: {}, // results[contractId][operationId][assertionId][subjectId]
  }

  try {
    for (const subject of ACTIVE) {
      const url = pathToFileURL(resolve(HERE, subject.file)).href
      await driver.navigate(url)
      await preflight(driver, subject)
      report.subjects.push({ ...subject, url, meta: driver.subjectMeta })
      console.log(C.dim(`preflight ok: ${subject.id} (${driver.subjectMeta.label})`))
    }
    console.log('')

    for (const contract of CONTRACTS) {
      report.contracts.push({ id: contract.id, title: contract.title })
      report.results[contract.id] = {}
      for (const op of contract.operations) {
        report.results[contract.id][op.id] = {
          title: op.title,
          precondition: op.precondition,
          operationText: op.operationText,
          scenarios: op.scenarios,
          assertions: {},
        }
        for (const subject of ACTIVE) {
          let run
          try {
            run = await runOperation(driver, subject, op)
          } catch (e) {
            run = {
              results: [...op.resultState, ...op.announcement].map((a) => ({
                assertionId: a.assertionId,
                assertionStatement: a.assertionStatement,
                priority: a.priority,
                half: op.resultState.includes(a) ? 'resultState' : 'announcement',
                pass: false,
                error: true,
                mode: null,
                detail: `harness error: ${e.message}`,
              })),
              after: null,
            }
          }
          const bucket = report.results[contract.id][op.id].assertions
          for (const r of run.results) {
            bucket[r.assertionId] = bucket[r.assertionId] || {
              assertionStatement: r.assertionStatement,
              assertionPhrase: r.assertionPhrase,
              priority: r.priority,
              half: r.half,
              bySubject: {},
            }
            bucket[r.assertionId].bySubject[subject.id] = {
              pass: r.pass,
              error: r.error,
              mode: r.mode,
              detail: r.detail,
            }
          }
          if (run.after) {
            bucket.__observed = bucket.__observed || { bySubject: {} }
            bucket.__observed.bySubject[subject.id] = {
              domText: run.after.domText,
              caret: run.after.caret,
              announcements: run.after.announcements,
              axRoles: (run.after.axTree?.nodes || [])
                .filter((n) => !n.ignored)
                .map((n) => `${'>'.repeat(n.depth)}${n.role}`),
            }
          }
        }
      }
    }
  } finally {
    await driver.close()
  }

  /* ---------------- render ---------------- */

  const idW = 46
  const colW = Math.max(...ACTIVE.map((s) => s.id.length), 7)
  let mustFailures = 0
  let total = 0
  let passes = 0

  for (const contract of CONTRACTS) {
    console.log(C.bold(`CONTRACT  ${contract.id} — ${contract.title}`))
    console.log('')
    for (const op of contract.operations) {
      const opData = report.results[contract.id][op.id]
      console.log(C.bold(`  ${op.id}`))
      console.log(C.dim(`    given: ${op.precondition}`))
      console.log(C.dim(`    when:  ${op.operationText}`))
      console.log('')
      const head =
        '    ' +
        'assertion'.padEnd(idW) +
        'pri'.padEnd(7) +
        ACTIVE.map((s) => s.id.padEnd(colW + 2)).join('')
      console.log(C.dim(head))
      console.log(C.dim('    ' + '-'.repeat(idW + 7 + ACTIVE.length * (colW + 2))))

      let currentHalf = null
      const entries = Object.entries(opData.assertions)
        .filter(([k]) => k !== '__observed')
        .sort(
          (a, b) =>
            (a[1].half === 'resultState' ? 0 : 1) - (b[1].half === 'resultState' ? 0 : 1) ||
            PRIORITY_ORDER[a[1].priority] - PRIORITY_ORDER[b[1].priority],
        )
      for (const [aid, a] of entries) {
        if (a.half !== currentHalf) {
          currentHalf = a.half
          console.log(
            C.dim(
              `    ${currentHalf === 'resultState' ? 'RESULT STATE (AX tree / DOM / caret)' : 'ANNOUNCEMENT (live-region content)'}`,
            ),
          )
        }
        const short = aid.replace(/^bulleted-list\./, '')
        const cells = ACTIVE.map((s) => {
          const r = a.bySubject[s.id]
          total++
          if (r?.pass) passes++
          if (!r?.pass && a.priority === 'MUST') mustFailures++
          return colourCell(cellText(r)).padEnd(colW + 2 + (process.stdout.isTTY ? 9 : 0))
        })
        console.log('      ' + short.padEnd(idW - 2) + a.priority.padEnd(7) + cells.join(''))
      }
      console.log('')

      if (VERBOSE) {
        for (const [aid, a] of entries) {
          for (const s of ACTIVE) {
            const r = a.bySubject[s.id]
            if (!r) continue
            console.log(
              C.dim(`      ${cellText(r).padEnd(6)} ${s.id.padEnd(colW)} ${aid}`),
            )
            console.log(C.dim(`             ${r.detail}`))
          }
        }
        console.log('')
        const obs = opData.assertions.__observed
        if (obs) {
          console.log(C.dim('      OBSERVED STATE'))
          for (const s of ACTIVE) {
            const o = obs.bySubject[s.id]
            if (!o) continue
            console.log(C.dim(`        ${s.id}`))
            console.log(C.dim(`          text:          ${JSON.stringify(o.domText)}`))
            console.log(C.dim(`          caret:         ${JSON.stringify(o.caret)}`))
            console.log(C.dim(`          ax roles:      ${o.axRoles.join(' ') || '(none)'}`))
            console.log(
              C.dim(
                `          announcements: ${
                  o.announcements.length
                    ? o.announcements.map((x) => `[${x.politeness}] "${x.text}"`).join(' · ')
                    : '(none)'
                }`,
              ),
            )
          }
          console.log('')
        }
      }
    }
  }

  console.log(C.dim('  legend: PASS = satisfied structurally · PASS~ = satisfied only by the'))
  console.log(C.dim('          subject-appropriate textual equivalent (no accessible structure'))
  console.log(C.dim('          exists to convey) · FAIL = not satisfied'))
  console.log('')
  console.log(
    `  ${passes}/${total} assertions pass across ${ACTIVE.length} subjects; ` +
      `${mustFailures} MUST failure${mustFailures === 1 ? '' : 's'}.`,
  )

  // Three-way outcome per operation per subject.
  //
  // A binary pass/fail on the announcement half over-reports failure, because a
  // screen reader reads correct semantics on its own. If `# ` produces a real
  // <h1>, the user is told "heading level 1" the moment they navigate to it —
  // they are just not told at the moment it happened. That is a materially
  // different experience from a styled <div> that no navigation will ever
  // report, and collapsing the two makes an editor that emits correct HTML look
  // as bad as one that emits none.
  //
  // It is a 2x2, not a scale: "was the user told at the time" and "can the user
  // find it again" are independent, and each can be true without the other.
  //
  //                   |  structure real      |  no real structure
  //   ----------------+----------------------+-----------------------
  //   editor spoke    |  announced           |  told-only
  //   editor silent   |  discoverable        |  absent
  //
  //   announced     told at the moment, and reviewable afterwards. The goal.
  //   discoverable  correct semantics, no announcement. The user finds out when
  //                 they navigate back — late, but they do find out.
  //   told-only     heard once and then gone: the announcement was honest at the
  //                 time, but there is no structure to return to. A markdown
  //                 textarea with an announcer lives here.
  //   absent        neither. Nothing to hear, nothing to find.
  const outcomes = {}
  for (const contract of CONTRACTS) {
    for (const op of contract.operations) {
      const opData = report.results[contract.id][op.id]
      const entries = Object.entries(opData.assertions).filter(([aid]) => !aid.startsWith('__'))
      const bySubject = {}
      for (const s of ACTIVE) {
        const musts = entries.map(([, a]) => a).filter((a) => a.priority === 'MUST' && a.bySubject[s.id])
        const structureOk = musts
          .filter((a) => a.half === 'resultState')
          .every((a) => a.bySubject[s.id].pass)
        const structural = musts
          .filter((a) => a.half === 'resultState')
          .every((a) => a.bySubject[s.id].mode !== 'textual-equivalent')
        const announcedOk = musts
          .filter((a) => a.half === 'announcement')
          .every((a) => a.bySubject[s.id].pass)
        const realStructure = structureOk && structural
        bySubject[s.id] = op.destructive
          // Nothing survives to navigate back to, so the only question left is
          // whether the user was told at the time.
          ? (announcedOk ? 'announced' : 'absent')
          : realStructure
            ? (announcedOk ? 'announced' : 'discoverable')
            : (announcedOk ? 'told-only' : 'absent')
      }
      outcomes[op.id] = bySubject
      opData.outcome = bySubject
    }
  }
  report.outcomes = outcomes

  // The outcome table is the one a maintainer should read first: it answers
  // "does the user ever find out", not "did a live region fire".
  const OUTCOME_COLOUR = {
    announced: C.green('announced'),
    discoverable: C.yellow('discoverable'),
    'told-only': C.yellow('told-only'),
    absent: C.red('absent'),
  }
  console.log(C.bold('  DOES THE USER FIND OUT?'))
  console.log(
    C.dim('    announced = told, and reviewable · discoverable = correct semantics, found on navigation') +
      C.dim('\n    told-only = heard once, no structure to return to · absent = neither'),
  )
  console.log('')
  {
    const idW = Math.max(...Object.keys(outcomes).map((k) => k.length), 12)
    console.log(
      '    ' + 'operation'.padEnd(idW + 2) + ACTIVE.map((s) => s.id.padEnd(colW + 2)).join(''),
    )
    console.log(C.dim('    ' + '-'.repeat(idW + 2 + ACTIVE.length * (colW + 2))))
    for (const [opId, bySubject] of Object.entries(outcomes)) {
      console.log(
        '    ' +
          opId.padEnd(idW + 2) +
          ACTIVE.map((s) => {
            const v = bySubject[s.id]
            // pad on the raw word, then colour, so ANSI codes do not skew width
            return (v || '-').padEnd(colW + 2).replace(v, OUTCOME_COLOUR[v] ? OUTCOME_COLOUR[v].trim() : v)
          }).join(''),
      )
    }
  }
  console.log('')

  // Per-scenario verdicts, keyed by canonical id, so the corpus walk-through is
  // generated from measurement instead of hand-maintained. A scenario is
  // `pass` for a subject only when EVERY MUST assertion of every operation
  // declaring it passed for that subject.
  const scenarioVerdicts = {}
  for (const contract of CONTRACTS) {
    for (const op of contract.operations) {
      const opData = report.results[contract.id][op.id]
      for (const sid of op.scenarios || []) {
        const bySubject = (scenarioVerdicts[sid] ||= {})
        for (const s of ACTIVE) {
          const musts = Object.entries(opData.assertions)
            .filter(([aid]) => !aid.startsWith('__'))
            .map(([, a]) => a)
            .filter((a) => a.priority === 'MUST' && a.bySubject[s.id])
          const ok = musts.length > 0 && musts.every((a) => a.bySubject[s.id].pass)
          // Several operations can map to one scenario; all must hold.
          bySubject[s.id] = bySubject[s.id] === false ? false : ok
        }
      }
    }
  }
  report.scenarios = scenarioVerdicts

  report.summary = { total, passes, mustFailures }
  // A --check run covers one subject, so writing it to the shared results.json
  // would silently delete every other subject's column — the same corruption
  // the --contract guard exists to prevent. Gate runs therefore write a report
  // only when --out names somewhere else to put it.
  if (!CHECK || OUT_EXPLICIT) {
    writeFileSync(OUT, JSON.stringify(report, null, 2))
    console.log(C.dim(`  wrote ${OUT}`))
    console.log('')
  }

  if (CHECK) {
    // Gate on one subject against its committed baseline.
    const baselineName = `baselines/${CHECK_SUBJECT}.json`
    if (!existsSync(BASELINE)) {
      console.log(
        C.yellow(`  --check: no ${baselineName}. Writing one from this run for ${CHECK_SUBJECT}.`),
      )
      mkdirSync(BASELINES_DIR, { recursive: true })
      writeFileSync(BASELINE, JSON.stringify(baselineFrom(report, CHECK_SUBJECT), null, 2))
      return
    }
    const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
    const now = baselineFrom(report, CHECK_SUBJECT)
    const regressions = []
    const fixes = []
    for (const [aid, wasPass] of Object.entries(base.assertions)) {
      const isPass = now.assertions[aid]
      if (isPass === undefined) continue
      if (wasPass && !isPass) regressions.push(aid)
      if (!wasPass && isPass) fixes.push(aid)
    }
    for (const aid of Object.keys(now.assertions)) {
      if (!(aid in base.assertions)) fixes.push(`${aid} (new)`)
    }
    console.log(C.bold(`  --check ${CHECK_SUBJECT} against ${baselineName}`))
    for (const f of fixes) console.log(C.green(`    improved: ${f}`))
    for (const r of regressions) console.log(C.red(`    REGRESSED: ${r}`))
    if (!fixes.length && !regressions.length) console.log(C.dim('    no change'))
    console.log('')
    if (regressions.length) {
      console.log(C.red(`  ${regressions.length} regression(s). Failing.`))
      process.exitCode = 1
    } else if (fixes.length) {
      console.log(C.dim('  Improvements only. Re-run with --accept to move the baseline.'))
      if (argv.has('--accept')) {
        writeFileSync(BASELINE, JSON.stringify(now, null, 2))
        console.log(C.green('  baseline updated.'))
      }
    }
    return
  }

  if (mustFailures && !ALLOW_FAILURES) process.exitCode = 1
}

/** Flatten one subject's assertion outcomes into a comparable baseline. */
function baselineFrom(report, subjectId) {
  const assertions = {}
  for (const cid of Object.keys(report.results)) {
    for (const oid of Object.keys(report.results[cid])) {
      const as = report.results[cid][oid].assertions
      for (const [aid, a] of Object.entries(as)) {
        // `__observed` is the raw capture kept alongside the assertions for
        // debugging; it has a bySubject shape but no verdict, so exclude it.
        if (aid.startsWith('__')) continue
        const cell = a.bySubject[subjectId]
        if (cell && typeof cell.pass === 'boolean') assertions[aid] = cell.pass
      }
    }
  }
  return { subject: subjectId, generatedAt: report.generatedAt, assertions }
}

main().catch((e) => {
  console.error(C.red(`harness failed: ${e.stack || e.message}`))
  process.exitCode = 2
})

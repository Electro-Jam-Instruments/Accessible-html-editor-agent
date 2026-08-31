#!/usr/bin/env node
/**
 * Builds subjects/lexical-next.html — Lexical on the NEW extension API, from a
 * nightly that contains the accessibility-by-default work.
 *
 * Why this exists alongside subjects/lexical/ (the stock React-plugin subject):
 * they are the SAME EDITOR reached by two different APIs, and they do not behave
 * the same for a screen-reader user.
 *
 *   subjects/lexical/       legacy React plugins, lexical 0.49.0 (stable)
 *                           LexicalComposer + RichTextPlugin + …
 *                           -> the config most applications ship today
 *
 *   subjects/lexical-next/  extension API, 0.49.1-nightly
 *                           buildEditorFromExtensions([RichTextExtension, …])
 *                           -> RichTextExtension.dependencies now includes
 *                              HeadingAnnounceExtension, which depends on
 *                              AriaLiveRegionExtension. Heading accessibility is
 *                              ON BY DEFAULT and requires no opt-in.
 *
 * The pair measures the gap between what Lexical can now do and what a typical
 * integration actually gets.
 *
 * ---------------------------------------------------------------------------
 * THIS SUBJECT IS NO LONGER A PURELY DEFAULT CONFIGURATION.  (A3, 2026-08)
 * ---------------------------------------------------------------------------
 * It now opts in to TWO extensions that nothing else would have pulled in, and
 * the distinction matters when reading any lexical-next row:
 *
 *   HistoryExtension        @lexical/history. Undo/redo does not work at all
 *                           without it. Lexical CORE already maps Ctrl+Z /
 *                           Ctrl+Shift+Z / Ctrl+Y to UNDO_COMMAND / REDO_COMMAND
 *                           (see compileKeyboardShortcuts in lexical), so before
 *                           this the subject dispatched the commands and nothing
 *                           listened: the keys were inert.
 *
 *   HistoryAnnounceExtension  @lexical/a11y. UNLIKE HeadingAnnounceExtension,
 *                           NOTHING depends on it — not RichTextExtension, and
 *                           not HistoryExtension either (@lexical/history does
 *                           not import @lexical/a11y at all). Undo/redo
 *                           announcements are opt-in in a way heading
 *                           announcements are not, and an integrator who adds
 *                           history gets silence unless they know this package
 *                           exists.
 *
 * So: the heading row for this subject still measures Lexical's defaults. The
 * history row measures Lexical's CEILING — the best a well-informed integrator
 * can get — and the corresponding default is the `absent` outcome this subject
 * produced before the two lines below were added.
 *
 *   npm install && node build.mjs
 *
 * Output is not checked in.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ESBUILD = join(HERE, 'node_modules/.bin/esbuild')
const entryPath = join(HERE, '.entry.js')
const outDir = mkdtempSync(join(tmpdir(), 'a11y-lexnext-'))

/**
 * Two subjects from one script, because the difference between them IS the finding.
 *
 *   lexical-next      strict defaults. Exactly what `buildEditorFromExtensions` with
 *                     RichTextExtension + ListExtension gives you and nothing more.
 *                     Undo/redo is INERT here: lexical core maps Ctrl+Z to
 *                     UNDO_COMMAND, but with no HistoryExtension nothing listens.
 *
 *   lexical-next-max  the informed ceiling. Everything a well-read integrator can
 *                     switch on today, including the announcers that no extension
 *                     depends on.
 *
 * Keeping them separate preserves the measurement that matters — what an editor
 * gives you without being asked — while still producing a green cell to validate
 * the harness against. Collapsing them into one configured subject would have
 * destroyed the first to get the second.
 */
const VARIANTS = [
  {
    id: 'lexical-next',
    label: `Lexical VERSION via extension API (strict defaults)`,
    imports: '',
    deps: '',
    notes:
      'buildEditorFromExtensions with RichTextExtension + ListExtension and nothing ' +
      'else. Nothing opts in to accessibility: RichTextExtension depends on ' +
      'HeadingAnnounceExtension which depends on AriaLiveRegionExtension, so the live ' +
      'region and the heading announcer arrive by default. Undo/redo is inert - core ' +
      'maps the keys to UNDO_COMMAND but no HistoryExtension listens.',
  },
  {
    id: 'lexical-next-max',
    label: `Lexical VERSION via extension API (every announcer opted in)`,
    imports:
      "import { HistoryExtension } from '@lexical/history'\n" +
      "import { HistoryAnnounceExtension } from '@lexical/a11y'",
    deps: '      HistoryExtension, HistoryAnnounceExtension,',
    notes:
      'The defaults PLUS every announcer a well-informed integrator can reach. ' +
      'HistoryAnnounceExtension is named explicitly because nothing depends on it: ' +
      'not RichTextExtension, and not HistoryExtension either - @lexical/history does ' +
      'not import @lexical/a11y at all. This subject measures the ceiling, not ' +
      'its defaults. Compare against lexical-next for the gap.',
  },
]
const makeEntry = (v) => `
import { buildEditorFromExtensions } from '@lexical/extension'
import { defineExtension } from 'lexical'
import { RichTextExtension } from '@lexical/rich-text'
import { ListExtension } from '@lexical/list'
// Opt-in, and deliberately so — see the header. HistoryExtension makes Ctrl+Z
// do something; HistoryAnnounceExtension makes it say something. Neither is
// reached by any dependency edge from RichTextExtension.
${v.imports}
// The full TRANSFORMERS set references code and link nodes; Lexical throws at
// registration if their extensions are absent. A real integration registers them,
// so the subject does too.
import { CodeExtension } from '@lexical/code'
import { LinkExtension } from '@lexical/link'
import { registerMarkdownShortcuts, TRANSFORMERS } from '@lexical/markdown'

const el = document.getElementById('editor')

const editor = buildEditorFromExtensions(
  defineExtension({
    name: '[root]',
    // RichTextExtension pulls in HeadingAnnounceExtension, which pulls in
    // AriaLiveRegionExtension. Nothing here asks for HEADING accessibility; it
    // arrives because the extension declares it as a dependency.
    //
    // HistoryAnnounceExtension is the opposite case and has to be named here.
    // It announces through the same AriaLiveRegionExtension sink, so the two
    // announcers share one live region — which is exactly why measuring both
    // in one harness run is worth doing: a green heading row and a red history
    // row through the SAME sink can only be an opt-in gap, never a blind spot
    // in the observer.
    dependencies: [
      RichTextExtension, ListExtension, CodeExtension, LinkExtension,
${v.deps}
    ],
  })
)

editor.setRootElement(el)
registerMarkdownShortcuts(editor, TRANSFORMERS)
window.__editor = editor
`

for (const variant of VARIANTS) {
 try {
  writeFileSync(entryPath, makeEntry(variant))
  execFileSync(ESBUILD, [
    entryPath, '--bundle', '--format=iife',
    '--define:process.env.NODE_ENV="production"',
    `--outfile=${join(outDir, 'bundle.js')}`,
  ], { cwd: HERE, stdio: 'inherit' })

  const js = readFileSync(join(outDir, 'bundle.js'), 'utf8')
  const version = JSON.parse(
    readFileSync(join(HERE, 'node_modules/lexical/package.json'), 'utf8')).version

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Subject: ${variant.label.replace('VERSION', version)}</title>
    <style>
      body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem; }
      #editor { width: 44rem; min-height: 220px; padding: 8px;
                border: 1px solid #ccc; border-radius: 4px; outline: none; }
      ul, ol { padding-left: 2rem; }
    </style>
  </head>
  <body>
    <div id="editor" contenteditable="true" role="textbox" aria-label="Note body"></div>
    <script>
      window.__a11ySubject = {
        id: '${variant.id}',
        label: '${variant.label.replace('VERSION', version)}',
        editorSelector: '#editor',
        kind: 'rich',
        notes: ${JSON.stringify(variant.notes)},
      };
    </script>
    <script>
${js}
    </script>
  </body>
</html>
`
  const out = join(HERE, '..', `${variant.id}.html`)
  writeFileSync(out, html)
  console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`)
 } finally {
  rmSync(outDir, { recursive: true, force: true })
  try { unlinkSync(entryPath) } catch {}
 }
}

#!/usr/bin/env node
/**
 * Builds subjects/lexical-pr9070.html — Lexical built FROM THE SOURCE TREE of
 * facebook/lexical PR #9070 ("QuoteAnnounceExtension"), not from npm.
 *
 * This subject exists for exactly one measurement (MASTER-PLAN §7 W3,
 * C-branch): run the `blockquote` contract against the PR branch and produce
 * the fail-on-main / pass-on-branch table. It tracks an UNMERGED branch and is
 * NOT part of the standing corpus — see README.md in this directory.
 *
 * How it differs from subjects/lexical-next/build.mjs (the model it follows):
 *
 *   - Every `lexical` / `@lexical/*` import is resolved from the CHECKOUT's
 *     built `packages/<pkg>/dist` via esbuild `--alias`, never from npm. The whole
 *     point is measuring the PR's code; vendoring an npm build would measure
 *     the wrong thing.
 *
 *   - ONE variant, not two. lexical-next builds a strict-defaults variant and
 *     an everything-opted-in variant because HistoryAnnounceExtension is
 *     opt-in. QuoteAnnounceExtension is NOT opt-in on this branch: it is a
 *     default dependency of RichTextExtension
 *     (packages/lexical-rich-text/src/LexicalRichTextExtension.ts, in the
 *     `dependencies` array right after HeadingAnnounceExtension), so the
 *     strict-defaults configuration already contains it and a "max" variant
 *     would measure nothing extra for this contract. The extension config here
 *     mirrors lexical-next's strict-defaults variant exactly: RichTextExtension
 *     + ListExtension + CodeExtension + LinkExtension + markdown shortcuts,
 *     nothing else.
 *
 * Prerequisites (documented in README.md):
 *
 *   1. A facebook/lexical checkout at the PR head:
 *        git clone https://github.com/facebook/lexical <checkout>
 *        cd <checkout>
 *        git fetch origin pull/9070/head:pr9070 --depth 50
 *        git checkout pr9070
 *   2. Its packages built:  pnpm install && pnpm run build
 *      (the dev build is enough; it emits packages/<pkg>/dist/<Name>.dev.mjs,
 *      and each package's `module` fork file re-exports the dev build)
 *   3. npm install in THIS directory (esbuild only)
 *
 * Then:
 *
 *   LEXICAL_CHECKOUT=<checkout> node build.mjs
 *   # or: node build.mjs <checkout>
 *
 * Output subjects/lexical-pr9070.html is generated and gitignored — a bundle
 * of an unmerged third-party branch is never committed.
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdtempSync,
  rmSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ESBUILD = join(HERE, 'node_modules/.bin/esbuild')

const CHECKOUT = resolve(process.env.LEXICAL_CHECKOUT || process.argv[2] || '')
if (!CHECKOUT || !existsSync(join(CHECKOUT, 'packages/lexical/package.json'))) {
  console.error(
    'usage: LEXICAL_CHECKOUT=<facebook/lexical checkout> node build.mjs\n' +
      '   or: node build.mjs <checkout>\n' +
      `got: ${JSON.stringify(CHECKOUT)} — packages/lexical/package.json not found there.\n` +
      'The checkout must be on the pr9070 branch with `pnpm install && pnpm run build` done.',
  )
  process.exit(2)
}

// Record exactly what is being measured. A subject built from a moving branch
// is meaningless without the commit hash in the artifact itself.
const COMMIT = execFileSync('git', ['-C', CHECKOUT, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim()
const VERSION = JSON.parse(
  readFileSync(join(CHECKOUT, 'packages/lexical/package.json'), 'utf8'),
).version

/**
 * One --alias per public lexical package, package name -> the checkout's built
 * ESM fork file (dist/<Name>.mjs, which re-exports dist/<Name>.dev.mjs after a
 * dev `pnpm run build`). The subject entry imports only a handful of packages,
 * but their dist files import each other by bare specifier (@lexical/utils,
 * @lexical/selection, ...), so every package gets an alias and esbuild pulls
 * in whatever the closure needs — all of it from the checkout.
 */
const aliases = []
for (const dir of readdirSync(join(CHECKOUT, 'packages'))) {
  const pkgJson = join(CHECKOUT, 'packages', dir, 'package.json')
  if (!existsSync(pkgJson)) continue
  const pkg = JSON.parse(readFileSync(pkgJson, 'utf8'))
  if (pkg.name !== 'lexical' && !pkg.name?.startsWith('@lexical/')) continue
  if (!pkg.module) continue // not a built library package
  const modPath = resolve(join(CHECKOUT, 'packages', dir), pkg.module)
  if (!existsSync(modPath)) continue // not built; only fatal if the bundle needs it
  aliases.push(`--alias:${pkg.name}=${modPath}`)
}
if (!aliases.some((a) => a.startsWith('--alias:lexical='))) {
  console.error(
    `no built dist for the core "lexical" package under ${CHECKOUT}/packages — ` +
      'run `pnpm install && pnpm run build` in the checkout first.',
  )
  process.exit(2)
}

/* Extension config mirrors subjects/lexical-next (strict defaults): the PR
 * makes QuoteAnnounceExtension a dependency of RichTextExtension, so nothing
 * here opts in to quote accessibility — it arrives, or fails to, by default. */
const ENTRY = `
import { buildEditorFromExtensions } from '@lexical/extension'
import { defineExtension } from 'lexical'
import { RichTextExtension } from '@lexical/rich-text'
import { ListExtension } from '@lexical/list'
// The full TRANSFORMERS set references code and link nodes; Lexical throws at
// registration if their extensions are absent. A real integration registers
// them, so the subject does too (same rationale as lexical-next).
import { CodeExtension } from '@lexical/code'
import { LinkExtension } from '@lexical/link'
import { registerMarkdownShortcuts, TRANSFORMERS } from '@lexical/markdown'

const el = document.getElementById('editor')

const editor = buildEditorFromExtensions(
  defineExtension({
    name: '[root]',
    // On this branch RichTextExtension.dependencies includes
    // QuoteAnnounceExtension (beside HeadingAnnounceExtension), which depends
    // on AriaLiveRegionExtension. Nothing here asks for quote accessibility;
    // whatever the blockquote contract observes is the branch's DEFAULT.
    dependencies: [
      RichTextExtension, ListExtension, CodeExtension, LinkExtension,
    ],
  })
)

editor.setRootElement(el)
registerMarkdownShortcuts(editor, TRANSFORMERS)
window.__editor = editor
`

const entryPath = join(HERE, '.entry.js')
const outDir = mkdtempSync(join(tmpdir(), 'a11y-lexpr9070-'))
try {
  writeFileSync(entryPath, ENTRY)
  execFileSync(
    ESBUILD,
    [
      entryPath,
      '--bundle',
      '--format=iife',
      '--define:process.env.NODE_ENV="production"',
      ...aliases,
      `--outfile=${join(outDir, 'bundle.js')}`,
    ],
    { cwd: HERE, stdio: 'inherit' },
  )

  const js = readFileSync(join(outDir, 'bundle.js'), 'utf8')
  const label =
    `Lexical ${VERSION} from PR #9070 branch (${COMMIT.slice(0, 10)}) — ` +
    `QuoteAnnounceExtension default-on via extension API`
  const notes =
    'Built from a facebook/lexical checkout of PR #9070 (QuoteAnnounceExtension) at ' +
    `commit ${COMMIT}, resolving every lexical package from the checkout's built ` +
    'packages/<pkg>/dist. Config mirrors lexical-next strict defaults: ' +
    'buildEditorFromExtensions with RichTextExtension + ListExtension (+ Code/Link for ' +
    'the markdown TRANSFORMERS) and nothing else. On this branch RichTextExtension ' +
    'depends on QuoteAnnounceExtension, so quote announcements are DEFAULT-ON, not ' +
    'opted into. Tracks an unmerged branch: NOT part of the standing corpus.'

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Subject: ${label}</title>
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
        id: 'lexical-pr9070',
        label: ${JSON.stringify(label)},
        editorSelector: '#editor',
        kind: 'rich',
        notes: ${JSON.stringify(notes)},
      };
    </script>
    <script>
${js}
    </script>
  </body>
</html>
`
  const out = join(HERE, '..', 'lexical-pr9070.html')
  writeFileSync(out, html)
  console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB) from ${COMMIT}`)
} finally {
  rmSync(outDir, { recursive: true, force: true })
  try {
    unlinkSync(entryPath)
  } catch {}
}

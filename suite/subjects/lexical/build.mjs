#!/usr/bin/env node
/**
 * Builds subjects/lexical-stock.html — a STOCK Lexical React integration, bundled
 * offline for the harness.
 *
 * "Stock" is the whole point. This is the configuration a team gets by following
 * Lexical's own React getting-started docs: LexicalComposer + RichTextPlugin +
 * HistoryPlugin + ListPlugin + MarkdownShortcutPlugin. It is what most applications
 * actually ship.
 *
 * It deliberately does NOT install anything from `@lexical/a11y`. Those announcers
 * exist and are well built, but they are opt-in extensions that the documented React
 * path never wires up — which is precisely the finding in the corpus
 * (scenarios/lexical.md). Adding them here would measure a configuration almost
 * nobody runs and would flatter the subject.
 *
 *   npm install && node build.mjs
 *
 * Dependencies are local to this directory, so the application's package.json is
 * untouched. The output is NOT checked in - build it to run it.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ESBUILD = join(HERE, 'node_modules/.bin/esbuild')
const entryPath = join(HERE, '.entry.jsx')
const outDir = mkdtempSync(join(tmpdir(), 'a11y-lexical-'))

const ENTRY = `
import React from 'react'
import { createRoot } from 'react-dom/client'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { TRANSFORMERS } from '@lexical/markdown'
import { ListNode, ListItemNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
// The full TRANSFORMERS set references code and link nodes, and Lexical throws at
// registration if a transformer's node is not in the config. Registering them is what
// a real integration has to do, so the subject does it too.
import { CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'

const config = {
  namespace: 'a11y-subject',
  nodes: [ListNode, ListItemNode, HeadingNode, QuoteNode, CodeNode, LinkNode],
  onError: (e) => { throw e },
  theme: {},
}

function App() {
  return React.createElement(
    LexicalComposer,
    { initialConfig: config },
    React.createElement(RichTextPlugin, {
      contentEditable: React.createElement(ContentEditable, {
        id: 'editor',
        'aria-label': 'Note body',
        style: { outline: 'none', minHeight: '220px', padding: '8px' },
      }),
      ErrorBoundary: LexicalErrorBoundary,
    }),
    React.createElement(HistoryPlugin, null),
    React.createElement(ListPlugin, null),
    React.createElement(MarkdownShortcutPlugin, { transformers: TRANSFORMERS })
  )
}

createRoot(document.getElementById('root')).render(React.createElement(App))
`

try {
  writeFileSync(entryPath, ENTRY)
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
    <title>Subject: stock Lexical ${version} React integration</title>
    <style>
      body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem; }
      #root { width: 44rem; border: 1px solid #ccc; border-radius: 4px; }
      ul, ol { padding-left: 2rem; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.__a11ySubject = {
        id: 'lexical-stock',
        label: 'stock Lexical ${version} (React getting-started config)',
        editorSelector: '#editor',
        kind: 'rich',
        notes:
          'LexicalComposer + RichTextPlugin + History + List + MarkdownShortcut, the ' +
          'documented React path. No @lexical/a11y announcers: they are opt-in ' +
          'extensions the documented path never wires up, which is the finding.',
      };
    </script>
    <script>
${js}
    </script>
  </body>
</html>
`
  const out = join(HERE, '..', 'lexical-stock.html')
  writeFileSync(out, html)
  console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`)
} finally {
  rmSync(outDir, { recursive: true, force: true })
  try { unlinkSync(entryPath) } catch {}
}

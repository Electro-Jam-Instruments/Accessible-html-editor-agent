#!/usr/bin/env node
/**
 * Builds subjects/uiw-react-md-editor.html — the REAL @uiw/react-md-editor,
 * as Open Notebook ships it, bundled into one self-contained offline page.
 *
 * The output is NOT checked in — build it to run it. The bundle contains
 * @uiw/react-md-editor plus roughly a hundred transitive packages (React, the
 * unified/remark/rehype ecosystem, prismjs, …), and committing that to the
 * repository would be redistribution without the copyright notice each of those
 * licences requires (see ATTRIBUTION.md). Built on your machine from packages
 * npm delivers to you, it is use, not distribution. The output path is
 * gitignored; run.mjs skips the subject with a hint when it is absent.
 *
 *   node suite/subjects/build-uiw-md-editor.mjs
 *
 * Installs exact pins (the versions the published corpus was measured against)
 * into a scratch directory, bundles from there, and deletes the scratch. Pass
 * UIW_FROM=<project dir> to resolve editor + esbuild from an existing install's
 * node_modules instead (e.g. an Open Notebook checkout's frontend/). esbuild
 * writes the bundle's licence comments to a .LEGAL.txt beside the page, so the
 * local build carries its notices.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))

// The pins the corpus run of 2026-08 measured. Bump deliberately, never silently.
const PINS = {
  '@uiw/react-md-editor': '4.0.8',
  react: '19.2.3',
  'react-dom': '19.2.3',
  esbuild: '0.27.2',
}

let PROJECT = process.env.UIW_FROM ? resolve(process.env.UIW_FROM) : null
let scratch = null
if (PROJECT) {
  if (!existsSync(join(PROJECT, 'node_modules/@uiw/react-md-editor'))) {
    console.error(`UIW_FROM=${PROJECT} has no node_modules/@uiw/react-md-editor — install it there first.`)
    process.exit(2)
  }
} else {
  scratch = mkdtempSync(join(tmpdir(), 'uiw-subject-'))
  PROJECT = scratch
  writeFileSync(
    join(scratch, 'package.json'),
    JSON.stringify({ name: 'uiw-subject-build', private: true, dependencies: PINS }, null, 2),
  )
  console.log(`installing pinned packages into scratch ${scratch} …`)
  execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: scratch, stdio: 'inherit' })
}
const ESBUILD = join(PROJECT, 'node_modules/.bin/esbuild')

// esbuild resolves bare specifiers from the importer's directory, so the entry
// lives inside the project dir for node_modules resolution to find the editor.
const entryPath = join(PROJECT, '.uiw-subject-entry.jsx')
const outDir = mkdtempSync(join(tmpdir(), 'uiw-subject-out-'))

const ENTRY = `
import React from 'react'
import { createRoot } from 'react-dom/client'
import MDEditor from '@uiw/react-md-editor/nohighlight'
import '@uiw/react-md-editor/markdown-editor.css'

function App() {
  const [value, setValue] = React.useState('')
  return React.createElement(MDEditor, {
    value,
    onChange: (v) => setValue(v ?? ''),
    // 'edit' hides the live preview pane. The preview renders the markdown as
    // real HTML (with real <ul>/<li>), which would put list roles in the page
    // that the EDITING surface never exposes. Including it would flatter the
    // subject: the user editing the note is focused in the textarea and never
    // reaches the preview.
    preview: 'edit',
    height: 260,
    textareaProps: { id: 'editor', 'aria-label': 'Note body' },
  })
}

createRoot(document.getElementById('root')).render(React.createElement(App))
`

try {
  writeFileSync(entryPath, ENTRY)
  execFileSync(
    ESBUILD,
    [
      entryPath,
      '--bundle',
      '--format=iife',
      '--define:process.env.NODE_ENV="production"',
      `--outfile=${join(outDir, 'bundle.js')}`,
      '--minify',
      '--legal-comments=external',
    ],
    { cwd: PROJECT, stdio: 'inherit' },
  )

  const js = readFileSync(join(outDir, 'bundle.js'), 'utf8')
  const css = readFileSync(join(outDir, 'bundle.css'), 'utf8')
  const version = JSON.parse(
    readFileSync(join(PROJECT, 'node_modules/@uiw/react-md-editor/package.json'), 'utf8'),
  ).version

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Subject: @uiw/react-md-editor ${version} (the real editor)</title>
    <style>
      body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem; }
      #root { width: 44rem; }
    </style>
    <style>
${css}
    </style>
  </head>
  <body>
    <h1>The real <code>@uiw/react-md-editor</code> (v${version})</h1>
    <!--
      GENERATED FILE — do not edit by hand.
      Rebuild with: node suite/subjects/build-uiw-md-editor.mjs

      This is the actual editor Open Notebook ships, bundled offline on this
      machine. It is here so the comparison table reports the shipped component
      rather than a reproduction of it. The hand-written
      subjects/textarea-markdown.html models the same behaviour in 60 readable
      lines; if the two ever disagree, this one is the truth.
    -->
    <div id="root"></div>
    <script>
${js}
    </script>
    <script>
      window.__a11ySubject = {
        id: 'uiw-react-md-editor',
        label: '@uiw/react-md-editor ${version} (real, bundled offline)',
        editorSelector: '#editor',
        kind: 'plaintext',
        notes:
          'The shipped editor, preview pane disabled. React mounts asynchronously; ' +
          'the driver waits for #editor to exist before driving anything.',
      };
    </script>
  </body>
</html>
`
  const outPath = join(HERE, 'uiw-react-md-editor.html')
  writeFileSync(outPath, html)
  // The notices for everything the bundle contains, next to the page they cover.
  try {
    const legal = readFileSync(join(outDir, 'bundle.js.LEGAL.txt'), 'utf8')
    writeFileSync(join(HERE, 'uiw-react-md-editor.html.LEGAL.txt'), legal)
  } catch {}
  console.log(`wrote ${outPath} (${(html.length / 1024).toFixed(0)} kB, editor v${version})`)
} finally {
  rmSync(outDir, { recursive: true, force: true })
  if (scratch) rmSync(scratch, { recursive: true, force: true })
  else try { rmSync(entryPath, { force: true }) } catch {}
}

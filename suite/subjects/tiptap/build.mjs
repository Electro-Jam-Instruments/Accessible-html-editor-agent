#!/usr/bin/env node
/**
 * Builds subjects/tiptap.html — STOCK Tiptap StarterKit, bundled offline for the
 * harness.
 *
 * "Stock" is the whole point, exactly as for subjects/lexical/. This is the
 * configuration a team gets by following Tiptap's own getting-started guide:
 *
 *   new Editor({ element, extensions: [StarterKit] })
 *
 * and nothing else. No menu packages, no TaskList/TaskItem, no editorProps —
 * and deliberately NO aria-label on the editor. The inventory's finding
 * TT-B2-047 (scenarios/tiptap.md) is that the editor root ships as a nameless
 * `role="textbox"` with no aria-multiline; adding a label here would fix the
 * subject before measuring it. The harness must see what stock renders.
 *
 * Per the same inventory (§7), this configuration contains no live region, no
 * announcer, and no aria-* state anywhere — the prediction on record is zero
 * announcements on every operation.
 *
 *   npm install && node build.mjs
 *
 * Dependencies are local to this directory, so the application's package.json is
 * untouched. The output is NOT checked in — build it to run it.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ESBUILD = join(HERE, 'node_modules/.bin/esbuild')
const entryPath = join(HERE, '.entry.js')
const outDir = mkdtempSync(join(tmpdir(), 'a11y-tiptap-'))

const ENTRY = `
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

// The exact getting-started configuration. Nothing added, nothing configured.
const editor = new Editor({
  element: document.getElementById('mount'),
  extensions: [StarterKit],
})
window.__editor = editor
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
    readFileSync(join(HERE, 'node_modules/@tiptap/core/package.json'), 'utf8')).version

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Subject: stock Tiptap StarterKit ${version}</title>
    <style>
      body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem; }
      #mount { width: 44rem; }
      /* Border on the ProseMirror root itself, so the editable area is visible.
         Presentation only — no behaviour, no ARIA. */
      #mount > [contenteditable] { min-height: 220px; padding: 8px;
        border: 1px solid #ccc; border-radius: 4px; outline: none; }
      ul, ol { padding-left: 2rem; }
    </style>
  </head>
  <body>
    <div id="mount"></div>
    <script>
      window.__a11ySubject = {
        id: 'tiptap',
        label: 'stock Tiptap StarterKit ${version} (getting-started config)',
        // Tiptap mounts <div class="tiptap ProseMirror" contenteditable="true"
        // role="textbox" tabindex="0"> inside #mount. Scoped to the mount point
        // and matched on the contenteditable itself, which is the element every
        // capture must read.
        editorSelector: '#mount [contenteditable="true"]',
        kind: 'rich',
        notes:
          'new Editor({ element, extensions: [StarterKit] }) - stock StarterKit ' +
          '${version}, nothing added. No aria-label on purpose: the nameless ' +
          'role="textbox" root is the inventory finding TT-B2-047, and the subject ' +
          'must ship exactly what stock renders.',
      };
    </script>
    <script>
${js}
    </script>
  </body>
</html>
`
  const out = join(HERE, '..', 'tiptap.html')
  writeFileSync(out, html)
  console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`)
} finally {
  rmSync(outDir, { recursive: true, force: true })
  try { unlinkSync(entryPath) } catch {}
}

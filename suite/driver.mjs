/**
 * driver.mjs — CDP driver for the editing-surface accessibility harness.
 *
 * Plain Node ESM. No dependencies: Node 22 ships a global `WebSocket` and `fetch`.
 * Connection/driving patterns are lifted from the proven spikes in ../spikes/.
 *
 * What it gives you:
 *   launch()            -> Driver
 *   driver.navigate(url)
 *   driver.focusEditor()
 *   driver.type(text)
 *   driver.press(key)
 *   driver.capture()    -> snapshot { axTree, domText, caret, liveRegions, announcements }
 *
 * ---------------------------------------------------------------------------
 * SYNCHRONISATION STRATEGY (read this before touching anything below)
 * ---------------------------------------------------------------------------
 * There are no sleeps in this file. Not one. Every wait is on an observable
 * signal, per the project rule in CLAUDE.md. Concretely, after each driven
 * action we sequence three real signals:
 *
 *   1. The CDP command ack. `Input.dispatchKeyEvent` does not resolve until the
 *      renderer has dispatched and processed the event, so every synchronous
 *      keydown/input handler on the page has already run when the promise
 *      settles. That is the platform's own ordering guarantee, not a guess.
 *
 *   2. Two animation frames, awaited inside the page
 *      (`rAF -> rAF -> resolve`). One frame lets anything scheduled on the
 *      render lifecycle (React commit, a queued microtask flush, a
 *      MutationObserver callback) run; the second frame proves the first one
 *      completed. This is the render lifecycle, awaited — not a duration.
 *
 *   3. A settle predicate. We compute a digest of *exactly the state the
 *      contract asserts on* (editor text, caret, cumulative announcement
 *      journal, and the roles of the pruned AX subtree) and re-read it,
 *      each read gated on a fresh pair of animation frames, until the digest
 *      is byte-identical on SETTLE_ROUNDS consecutive reads. If it never
 *      settles within MAX_SETTLE_POLLS reads we throw — a loud failure, never
 *      a silent "probably fine".
 *
 * Two consequences worth stating plainly:
 *
 *   - Announcements are journalled, not sampled. A live-region message that is
 *     appended and then cleared before we look would be invisible to a
 *     snapshot poll. So a MutationObserver installed via
 *     `Page.addScriptToEvaluateOnNewDocument` — i.e. before any page script
 *     runs — records every text ever added to any live container, each with its
 *     own sequence number. Nothing races for one slot, so nothing can be lost
 *     to overwrite.
 *
 *   - The AX tree is derived from the DOM, so we include an AX role digest in
 *     the settle predicate rather than assuming DOM quiescence implies AX
 *     quiescence. `Accessibility.getFullAXTree` is pull-based and computed on
 *     demand; per ../chromium-ax-observation.md we never treat
 *     `Accessibility.nodesUpdated` as an event stream.
 */

import { spawn } from 'node:child_process'

export const CHROME_PATH =
  process.env.HARNESS_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const SETTLE_ROUNDS = 2
const MAX_SETTLE_POLLS = 40
const CDP_TIMEOUT_MS = 15000
const LAUNCH_TIMEOUT_MS = 30000

/** Keys we need to drive the corpus. Chromium wants code + windowsVirtualKeyCode
 *  to match what a real keyboard produces; editors branch on `e.code` and
 *  `e.keyCode` (react-md-editor's handleKeyDown checks both), so getting these
 *  wrong silently changes the behaviour under test. */
const NAMED_KEYS = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9, text: '\t' },
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8, text: '' },
  Delete: { key: 'Delete', code: 'Delete', keyCode: 46, text: '' },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, text: '' },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, text: '' },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, text: '' },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, text: '' },
  Home: { key: 'Home', code: 'Home', keyCode: 36, text: '' },
  End: { key: 'End', code: 'End', keyCode: 35, text: '' },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
}

/** Best-effort `code` + virtual key for a printable character. */
function printableKeyDescriptor(ch) {
  const upper = ch.toUpperCase()
  let code = `Key${upper}`
  let keyCode = upper.charCodeAt(0)
  if (ch >= '0' && ch <= '9') {
    code = `Digit${ch}`
    keyCode = ch.charCodeAt(0)
  } else if (!/[a-z]/i.test(ch)) {
    const punctuation = {
      '-': ['Minus', 189],
      '_': ['Minus', 189],
      '=': ['Equal', 187],
      '+': ['Equal', 187],
      '[': ['BracketLeft', 219],
      ']': ['BracketRight', 221],
      '\\': ['Backslash', 220],
      ';': ['Semicolon', 186],
      ':': ['Semicolon', 186],
      "'": ['Quote', 222],
      '"': ['Quote', 222],
      ',': ['Comma', 188],
      '<': ['Comma', 188],
      '.': ['Period', 190],
      '>': ['Period', 190],
      '/': ['Slash', 191],
      '?': ['Slash', 191],
      '`': ['Backquote', 192],
      '~': ['Backquote', 192],
      '*': ['Digit8', 56],
      '#': ['Digit3', 51],
      '(': ['Digit9', 57],
      ')': ['Digit0', 48],
      '!': ['Digit1', 49],
      '@': ['Digit2', 50],
      '$': ['Digit4', 52],
      '%': ['Digit5', 53],
      '^': ['Digit6', 54],
      '&': ['Digit7', 55],
      ' ': ['Space', 32],
    }[ch]
    if (punctuation) {
      code = punctuation[0]
      keyCode = punctuation[1]
    } else {
      code = ''
      keyCode = 0
    }
  }
  const shift = /[A-Z]/.test(ch) || '~!@#$%^&*()_+{}|:"<>?'.includes(ch)
  return { key: ch, code, keyCode, text: ch, modifiers: shift ? 8 : 0 }
}

/* ------------------------------------------------------------------ */
/* In-page instrumentation                                             */
/* ------------------------------------------------------------------ */

/**
 * Installed via Page.addScriptToEvaluateOnNewDocument, so it is running before
 * any subject script. Records every text ever added into a live region, each
 * entry with its own sequence number and its own slot.
 */
const INSTRUMENT_SOURCE = `
(() => {
  if (window.__a11yJournal) return;
  const journal = [];
  window.__a11yJournal = journal;
  const LIVE_SEL = '[aria-live], [role="status"], [role="alert"], [role="log"], output';
  let idSeq = 0;
  const idOf = (el) => (el.__a11yId || (el.__a11yId = 'live#' + (++idSeq)));
  function politenessOf(el) {
    const live = el.getAttribute('aria-live');
    if (live) return live;
    const role = (el.getAttribute('role') || '').toLowerCase();
    if (role === 'alert') return 'assertive';
    if (role === 'status' || role === 'log') return 'polite';
    if (el.tagName === 'OUTPUT') return 'polite';
    return 'polite';
  }
  function containerOf(node) {
    let el = node && node.nodeType === 1 ? node : node && node.parentElement;
    while (el) {
      if (el.matches && el.matches(LIVE_SEL)) return el;
      el = el.parentElement;
    }
    return null;
  }
  const norm = (s) => String(s == null ? '' : s).replace(/\\s+/g, ' ').trim();
  function record(container, text) {
    const t = norm(text);
    if (!t) return;
    const cid = idOf(container);
    const last = journal[journal.length - 1];
    if (last && last.container === cid && last.text === t) return; // collapse duplicate emissions of one mutation batch
    journal.push({
      seq: journal.length,
      container: cid,
      politeness: politenessOf(container),
      atomic: container.getAttribute('aria-atomic') === 'true',
      role: container.getAttribute('role') || null,
      text: t,
    });
  }
  const obs = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') {
        for (const n of r.addedNodes) {
          const c = containerOf(n);
          if (c) record(c, n.textContent);
        }
      } else if (r.type === 'characterData') {
        const c = containerOf(r.target);
        if (c) record(c, r.target.data);
      } else if (r.type === 'attributes') {
        // A container that only becomes live later still counts from that moment.
        const el = r.target;
        if (el.matches && el.matches(LIVE_SEL)) record(el, el.textContent);
      }
    }
  });
  obs.observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['aria-live', 'role', 'aria-atomic'],
  });
})();
`

/** Reads editor text + caret generically, so a subject cannot self-report. */
const READ_STATE_FN = `
(sel) => {
  const el = document.querySelector(sel);
  if (!el) return { error: 'editor not found: ' + sel };
  const isField = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;
  if (isField) {
    return {
      shape: 'field',
      tag: el.tagName.toLowerCase(),
      text: el.value,
      caret: { start: el.selectionStart, end: el.selectionEnd },
      focused: document.activeElement === el,
    };
  }
  // contenteditable: caret offsets are measured as the length of the range text
  // from the start of the editor to the selection endpoint. This flattens block
  // boundaries (a Range's string form has no newline for a <div> break), so
  // treat these offsets as "characters of visible text before the caret",
  // not as an index into innerText. Documented in README.
  const sel_ = document.getSelection();
  let caret = null;
  let anchorPath = null;
  if (sel_ && sel_.anchorNode && el.contains(sel_.anchorNode)) {
    const measure = (node, offset) => {
      const r = document.createRange();
      r.setStart(el, 0);
      r.setEnd(node, offset);
      return r.toString().length;
    };
    caret = { start: measure(sel_.anchorNode, sel_.anchorOffset), end: measure(sel_.focusNode, sel_.focusOffset) };
    if (caret.start > caret.end) caret = { start: caret.end, end: caret.start };
    const n = sel_.anchorNode;
    anchorPath = (n.nodeType === 3 ? '#text' : n.nodeName.toLowerCase()) + '@' + sel_.anchorOffset;
  }
  return {
    shape: 'contenteditable',
    tag: el.tagName.toLowerCase(),
    text: el.innerText,
    textContent: el.textContent,
    html: el.innerHTML,
    caret,
    anchorPath,
    focused: el.contains(document.activeElement) || document.activeElement === el,
  };
}
`

const READ_LIVE_FN = `
() => {
  const LIVE_SEL = '[aria-live], [role="status"], [role="alert"], [role="log"], output';
  const norm = (s) => String(s == null ? '' : s).replace(/\\s+/g, ' ').trim();
  const regions = [...document.querySelectorAll(LIVE_SEL)].map((el) => {
    const live = el.getAttribute('aria-live');
    const role = (el.getAttribute('role') || '').toLowerCase();
    let politeness = live;
    if (!politeness) politeness = role === 'alert' ? 'assertive' : 'polite';
    return {
      politeness,
      role: el.getAttribute('role') || null,
      atomic: el.getAttribute('aria-atomic') === 'true',
      text: norm(el.textContent),
    };
  });
  return { regions, journal: (window.__a11yJournal || []).slice() };
}
`

/* ------------------------------------------------------------------ */
/* Driver                                                              */
/* ------------------------------------------------------------------ */

class Driver {
  constructor(proc, ws) {
    this.proc = proc
    this.ws = ws
    this._id = 0
    this._pending = new Map()
    this.editorSelector = null
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id !== undefined) {
        const entry = this._pending.get(m.id)
        if (entry) {
          this._pending.delete(m.id)
          clearTimeout(entry.timer)
          if (m.error) entry.reject(new Error(`${entry.method}: ${m.error.message}`))
          else entry.resolve(m.result)
        }
      }
    })
  }

  send(method, params = {}) {
    const id = ++this._id
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id)
        reject(new Error(`CDP timeout after ${CDP_TIMEOUT_MS}ms: ${method}`))
      }, CDP_TIMEOUT_MS)
      this._pending.set(id, { resolve, reject, timer, method })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  /** Evaluate a raw expression in the page. */
  async _eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails) {
      throw new Error(
        `page evaluation failed: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`,
      )
    }
    return r.result?.value
  }

  /** Call a function expression in the page with JSON-serialisable args. */
  async _call(fnSource, args = []) {
    return this._eval(`(${fnSource})(${args.map((a) => JSON.stringify(a)).join(',')})`)
  }

  /**
   * Await two animation frames inside the page. This is the render lifecycle,
   * not a duration: if the compositor never produces a frame the surrounding
   * CDP timeout fires and we fail loudly rather than guessing.
   */
  async _frames() {
    await this._eval(
      `new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))`,
    )
  }

  async navigate(url) {
    const loaded = new Promise((resolve) => {
      const onMsg = (ev) => {
        const m = JSON.parse(ev.data)
        if (m.method === 'Page.loadEventFired') {
          this.ws.removeEventListener('message', onMsg)
          resolve()
        }
      }
      this.ws.addEventListener('message', onMsg)
    })
    await this.send('Page.navigate', { url })
    await loaded
    // Await the document's own readiness signal, not a delay.
    await this._eval(`
      document.readyState === 'complete'
        ? Promise.resolve(1)
        : new Promise((r) => window.addEventListener('load', () => r(1), { once: true }))
    `)
    const subject = await this._eval(`window.__a11ySubject || null`)
    if (!subject || !subject.editorSelector) {
      throw new Error(`subject at ${url} does not declare window.__a11ySubject.editorSelector`)
    }
    this.editorSelector = subject.editorSelector
    this.subjectMeta = subject
    // A subject may mount its editor asynchronously (the real React editor
    // does). Wait for the element itself to appear — a DOM condition, gated on
    // animation frames — rather than for an amount of time.
    await this._waitForEditor()
    await this._frames()
    return subject
  }

  async _waitForEditor() {
    for (let i = 0; i < MAX_SETTLE_POLLS; i++) {
      const present = await this._call(`(sel) => !!document.querySelector(sel)`, [
        this.editorSelector,
      ])
      if (present) return
      await this._frames()
    }
    throw new Error(
      `editor ${this.editorSelector} never appeared after ${MAX_SETTLE_POLLS} frames — ` +
        `the subject did not mount.`,
    )
  }

  /** Focus the editor and put the caret at the end of its content. */
  async focusEditor() {
    const ok = await this._call(
      `(sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.focus();
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          const n = el.value.length;
          el.setSelectionRange(n, n);
        } else {
          const r = document.createRange();
          r.selectNodeContents(el);
          r.collapse(false);
          const s = document.getSelection();
          s.removeAllRanges();
          s.addRange(r);
        }
        return true;
      }`,
      [this.editorSelector],
    )
    if (!ok) throw new Error(`could not focus ${this.editorSelector}`)
    await this._settle()
  }

  async _key(desc, { modifiers = 0 } = {}) {
    const base = {
      modifiers: modifiers | (desc.modifiers || 0),
      key: desc.key,
      code: desc.code,
      windowsVirtualKeyCode: desc.keyCode,
      nativeVirtualKeyCode: desc.keyCode,
    }
    // A keyDown carrying `text` is what actually inserts a character in
    // Chromium; a bare rawKeyDown does not. Non-printing keys use rawKeyDown so
    // no spurious character is generated.
    if (desc.text) {
      await this.send('Input.dispatchKeyEvent', {
        ...base,
        type: 'keyDown',
        text: desc.text,
        unmodifiedText: desc.text,
      })
    } else {
      await this.send('Input.dispatchKeyEvent', { ...base, type: 'rawKeyDown' })
    }
    await this.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' })
  }

  /** Type literal text, one real keystroke per character. */
  async type(text) {
    for (const ch of text) {
      await this._key(printableKeyDescriptor(ch))
    }
    await this._settle()
  }

  /** Press a named key, e.g. 'Enter', 'Tab', 'Shift+Tab', 'Control+b'. */
  async press(combo) {
    let modifiers = 0
    const parts = combo.split('+')
    const name = parts.pop()
    for (const mod of parts) {
      const m = mod.toLowerCase()
      if (m === 'alt') modifiers |= 1
      else if (m === 'control' || m === 'ctrl') modifiers |= 2
      else if (m === 'meta' || m === 'cmd') modifiers |= 4
      else if (m === 'shift') modifiers |= 8
      else throw new Error(`unknown modifier: ${mod}`)
    }
    const desc = NAMED_KEYS[name] || (name.length === 1 ? printableKeyDescriptor(name) : null)
    if (!desc) throw new Error(`unknown key: ${name}`)
    // Shift+Enter etc. must not inherit the printable-shift flag twice.
    await this._key({ ...desc, modifiers: 0 }, { modifiers })
    await this._settle()
  }

  /* --- capture ---------------------------------------------------- */

  async _axNodes() {
    const { nodes } = await this.send('Accessibility.getFullAXTree')
    return nodes
  }

  async _editorBackendNodeId() {
    const { root } = await this.send('DOM.getDocument', { depth: 1 })
    const { nodeId } = await this.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: this.editorSelector,
    })
    if (!nodeId) throw new Error(`DOM.querySelector found nothing for ${this.editorSelector}`)
    const { node } = await this.send('DOM.describeNode', { nodeId })
    return node.backendNodeId
  }

  /** Full AX tree, pruned to the editor element and its descendants. */
  async _prunedAxTree() {
    const [nodes, backendNodeId] = await Promise.all([this._axNodes(), this._editorBackendNodeId()])
    const byId = new Map(nodes.map((n) => [n.nodeId, n]))
    const rootNode = nodes.find((n) => n.backendDOMNodeId === backendNodeId)
    if (!rootNode) return { root: null, nodes: [], note: 'editor has no node in the AX tree' }
    const out = []
    const stack = [{ node: rootNode, depth: 0 }]
    while (stack.length) {
      const { node, depth } = stack.pop()
      const props = Object.fromEntries(
        (node.properties || []).map((p) => [p.name, p.value?.value]),
      )
      out.push({
        nodeId: node.nodeId,
        depth,
        role: node.role?.value ?? null,
        name: node.name?.value ?? null,
        value: node.value?.value ?? null,
        ignored: !!node.ignored,
        properties: props,
      })
      const kids = (node.childIds || []).map((id) => byId.get(id)).filter(Boolean)
      for (let i = kids.length - 1; i >= 0; i--) stack.push({ node: kids[i], depth: depth + 1 })
    }
    return { root: out[0] ?? null, nodes: out }
  }

  /** Everything the contract may assert on, at one sync point. */
  async capture() {
    const [state, live, ax] = [
      await this._call(READ_STATE_FN, [this.editorSelector]),
      await this._call(READ_LIVE_FN),
      await this._prunedAxTree(),
    ]
    if (state.error) throw new Error(state.error)
    return {
      subjectMeta: this.subjectMeta,
      axTree: ax,
      domText: state.text,
      domHtml: state.html ?? null,
      shape: state.shape,
      focused: state.focused,
      caret: state.caret,
      anchorPath: state.anchorPath ?? null,
      liveRegions: live.regions,
      announcements: live.journal,
    }
  }

  /** Cheap digest of exactly the state we assert on — the settle predicate. */
  async _digest() {
    await this._frames()
    const state = await this._call(READ_STATE_FN, [this.editorSelector])
    const live = await this._call(READ_LIVE_FN)
    const ax = await this._prunedAxTree()
    return JSON.stringify({
      text: state.text,
      caret: state.caret,
      html: state.html ?? null,
      journal: live.journal.map((j) => `${j.seq}:${j.politeness}:${j.text}`),
      regions: live.regions.map((r) => `${r.politeness}:${r.text}`),
      ax: ax.nodes.map((n) => `${n.depth}/${n.role}/${n.name ?? ''}/${n.ignored ? 'i' : ''}`),
    })
  }

  /** Poll the digest until it is identical SETTLE_ROUNDS times running. */
  async _settle() {
    let previous = null
    let stable = 0
    for (let i = 0; i < MAX_SETTLE_POLLS; i++) {
      const d = await this._digest()
      if (d === previous) {
        if (++stable >= SETTLE_ROUNDS - 1) return
      } else {
        stable = 0
        previous = d
      }
    }
    throw new Error(
      `state never settled after ${MAX_SETTLE_POLLS} frame-gated reads — the page is ` +
        `changing continuously; assertions would be meaningless.`,
    )
  }

  /** Reset the announcement journal, e.g. between setup and the operation. */
  async resetAnnouncements() {
    await this._eval(`(window.__a11yJournal || []).length = 0; 1`)
  }

  async close() {
    try {
      this.ws.close()
    } catch {}
    this.proc.kill()
    await new Promise((r) => this.proc.once('exit', r))
  }
}

export async function launch({ chromePath = CHROME_PATH, port = 9500 + (process.pid % 400) } = {}) {
  const proc = spawn(
    chromePath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--no-sandbox',
      '--disable-gpu',
      '--allow-file-access-from-files',
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )

  // Await Chromium's own readiness line on stderr, not a fixed delay.
  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Chromium did not report DevTools within ${LAUNCH_TIMEOUT_MS}ms`)),
      LAUNCH_TIMEOUT_MS,
    )
    let buf = ''
    proc.stderr.on('data', (d) => {
      buf += String(d)
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) {
        clearTimeout(timer)
        resolve(m[1])
      }
    })
    proc.once('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    proc.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`Chromium exited early (code ${code}): ${buf.slice(-500)}`))
    })
  })

  // Prefer the page target over the browser-level endpoint.
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page ? page.webSocketDebuggerUrl : wsUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  const driver = new Driver(proc, ws)
  await driver.send('Page.enable')
  await driver.send('Runtime.enable')
  await driver.send('DOM.enable')
  await driver.send('Accessibility.enable') // self-provisions kAXModeComplete; no flag needed
  await driver.send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT_SOURCE })
  return driver
}

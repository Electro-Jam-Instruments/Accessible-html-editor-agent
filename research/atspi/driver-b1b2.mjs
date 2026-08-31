// B1/B2 driver: launch headless Chromium bridged to AT-SPI, dump the
// accessible tree, then caret-navigate the scenario's boundaries.
//
//   node driver-b1b2.mjs <b1|b2> <events.jsonl> <treedump.json>
//
// Sync model identical to driver.mjs: after each step the driver renames the
// marker control to STEP-<n>; the recorder writes {"marker":"STEP-<n>"} when
// the AT-SPI name-change event arrives; the driver blocks on that line via
// fs.watch. Every step boundary is an observed event, never a delay.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = process.env.CHROME_BIN
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const SCEN = process.argv[2];                       // 'b1' | 'b2'
const EVENTS = process.argv[3];
const TREEDUMP = process.argv[4];
const PAGE = SCEN === 'b1' ? 'b1-lists.html' : 'b2-blockquote.html';
const TITLE = SCEN === 'b1' ? 'B1 editable' : 'B2 blockquote';
const PORT = SCEN === 'b1' ? 9433 : 9434;
const NOTES = EVENTS.replace(/\.jsonl$/, '') + '-notes.jsonl';

const log = (...a) => console.log('[driver]', ...a);

function waitForMarker(name, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const seen = () => {
      let txt = '';
      try { txt = fs.readFileSync(EVENTS, 'utf8'); } catch { return false; }
      return txt.includes(`"marker": "${name}"`) || txt.includes(`"marker":"${name}"`);
    };
    const finish = (ok, err) => {
      if (done) return; done = true;
      try { watcher.close(); } catch {}
      clearTimeout(timer);
      ok ? resolve(true) : reject(err);
    };
    const watcher = fs.watch(EVENTS, () => { if (seen()) finish(true); });
    const timer = setTimeout(
      () => finish(false, new Error(`marker ${name} never observed on the AT-SPI bus`)),
      timeoutMs);
    if (seen()) finish(true);
  });
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.sessionId = null;
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      }
    });
  }
  send(method, params = {}, sessionId = this.sessionId) {
    const id = ++this.id;
    const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId;
    this.ws.send(JSON.stringify(msg));
    return new Promise((res, rej) => this.pending.set(id, { resolve: res, reject: rej }));
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
}

async function connect(port) {
  for (let i = 0; i < 300; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      const j = await r.json();
      const ws = new WebSocket(j.webSocketDebuggerUrl);
      await new Promise((res, rej) => {
        ws.addEventListener('open', res, { once: true });
        ws.addEventListener('error', rej, { once: true });
      });
      return new CDP(ws);
    } catch { await new Promise((r) => setTimeout(r, 100)); }  // polling an
    // external process's readiness; there is no push signal before it listens
  }
  throw new Error('CDP never came up');
}

async function key(cdp, { key, code, windowsVirtualKeyCode, text }) {
  const base = { key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode };
  await cdp.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, text });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const ARROW_RIGHT = { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 };
const ARROW_DOWN  = { key: 'ArrowDown',  code: 'ArrowDown',  windowsVirtualKeyCode: 40 };
const ARROW_UP    = { key: 'ArrowUp',    code: 'ArrowUp',    windowsVirtualKeyCode: 38 };

// ---------------------------------------------------------------- main
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `chrome-atspi-${SCEN}-`));
const args = [
  `--remote-debugging-port=${PORT}`,
  '--remote-allow-origins=*',
  '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-dev-shm-usage',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1024,768',
  '--force-renderer-accessibility',
  // B1 needs a reading caret in the read-only region; caret browsing is the
  // browser feature that provides one.
  ...(SCEN === 'b1' ? ['--enable-caret-browsing'] : []),
  '--headless=new',
  `file://${path.join(HERE, PAGE)}`,
];
const env = { ...process.env, ACCESSIBILITY_ENABLED: '1', GNOME_ACCESSIBILITY: '1' };
delete env.CHROME_HEADLESS;

log('scenario:', SCEN, '| page:', PAGE);
const chrome = spawn(CHROME, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
const chromeLog = fs.createWriteStream(path.join(path.dirname(EVENTS), `chrome-${SCEN}.log`));
chrome.stdout.pipe(chromeLog); chrome.stderr.pipe(chromeLog);

const cdp = await connect(PORT);
const { targetInfos } = await cdp.send('Target.getTargets');
const page = targetInfos.find((t) => t.type === 'page');
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
cdp.sessionId = sessionId;
await cdp.send('Runtime.enable');
const ver = await cdp.send('Browser.getVersion', {}, null);
log('browser product:', ver.product, '| headless:', /HeadlessChrome/.test(ver.userAgent));

let step = 0;
async function mark(label) {
  step += 1;
  await cdp.eval(`window.__mark(${step})`);
  await waitForMarker(`STEP-${step}`);
  log(`  boundary STEP-${step} (${label}) observed on AT-SPI bus`);
}
async function note(text) {
  fs.appendFileSync(NOTES, JSON.stringify({ afterStep: step, note: text }) + '\n');
  log('--', text);
}

await note('page loaded, marker sanity check');
await mark('boot');

// Tree dump while the page is idle; wait on process EXIT (an observed signal).
await note(`tree dump -> ${TREEDUMP}`);
await new Promise((resolve, reject) => {
  const p = spawn('/usr/bin/python3.12', [path.join(HERE, 'dump-tree.py'), TREEDUMP, TITLE,
    ...(SCEN === 'b1' ? ['edit', 'read'] : ['edit'])],
  { env: process.env, stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('exit', (c) => c === 0 ? resolve() : reject(new Error(`dump-tree exited ${c}`)));
});
await note('tree dump complete');
await mark('post-dump');

if (SCEN === 'b1') {
  await note('EDITABLE: focus #edit, caret to start of #e-before');
  await cdp.eval(`document.getElementById('edit').focus(); window.__caretTo('e-before')`);
  await mark('e-caret-home');

  const eSteps = ['into #e-li1 (list entry)', 'into #e-li2', 'into #e-li3',
    'into #e-after (list exit)'];
  for (const [i, what] of eSteps.entries()) {
    await note(`EDITABLE: ArrowDown #${i + 1} — ${what}`);
    await key(cdp, ARROW_DOWN);
    await mark(`e-down${i + 1}`);
  }
  await note('EDITABLE: two ArrowRights inside #e-after (control: within-line motion)');
  await key(cdp, ARROW_RIGHT);
  await mark('e-right1');
  await key(cdp, ARROW_RIGHT);
  await mark('e-right2');

  await note('READ-ONLY: blur #edit, collapse selection to start of #r-before (caret browsing is on)');
  await cdp.eval(`document.getElementById('edit').blur(); window.__caretTo('r-before')`);
  await mark('r-caret-home');

  const rSteps = ['into #r-li1 (list entry)', 'into #r-li2', 'into #r-li3',
    'into #r-after (list exit)'];
  for (const [i, what] of rSteps.entries()) {
    await note(`READ-ONLY: ArrowDown #${i + 1} — ${what}`);
    await key(cdp, ARROW_DOWN);
    await mark(`r-down${i + 1}`);
  }
} else {
  await note('focus #edit, caret to start of #p1');
  await cdp.eval(`document.getElementById('edit').focus(); window.__caretTo('p1')`);
  await mark('caret-home');

  await note('ArrowDown #1 — INTO the blockquote (#p1 -> #p2)');
  await key(cdp, ARROW_DOWN);
  await mark('down-into-bq');

  await note('ArrowDown #2 — OUT of the blockquote (#p2 -> #p3)');
  await key(cdp, ARROW_DOWN);
  await mark('down-out-of-bq');

  await note('ArrowUp #1 — back INTO the blockquote (#p3 -> #p2)');
  await key(cdp, ARROW_UP);
  await mark('up-into-bq');

  await note('ArrowUp #2 — back OUT to #p1');
  await key(cdp, ARROW_UP);
  await mark('up-out-of-bq');
}

await note('drain boundary');
await cdp.eval('void 0');
await mark('drain');
await note('DONE');
log('done');
chrome.kill('SIGTERM');
process.exit(0);

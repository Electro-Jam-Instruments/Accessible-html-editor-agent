// Launch Chromium so it bridges to AT-SPI, then drive the four pillars.
// Zero deps: Node >= 21 has a global WebSocket and fetch.
//
// Sync model: after each step the driver sets the marker control's accessible
// name to STEP-<n>; the recorder writes a {"marker":"STEP-<n>"} line when the
// corresponding AT-SPI name-change event actually arrives. The driver waits on
// that line (fs.watch, not a timer) before starting the next step, so every
// step boundary is an observed event, not a guess.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME_BIN
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const MODE = process.argv[2] || 'x11';          // 'x11' | 'headless'
const EVENTS = process.argv[3] || path.join(os.tmpdir(), 'atspi-events.jsonl');
const PORT = 9333 + (MODE === 'headless' ? 1 : 0);
const NOTES = EVENTS.replace(/\.jsonl$/, '') + '-notes.jsonl';

const log = (...a) => console.log('[driver]', ...a);

// ---------------------------------------------------------------- marker sync
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

// ---------------------------------------------------------------- tiny CDP
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

// ---------------------------------------------------------------- key events
async function key(cdp, { key, code, windowsVirtualKeyCode, text }) {
  const base = { key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode };
  await cdp.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, text });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const ARROW_RIGHT = { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 };
const ARROW_LEFT  = { key: 'ArrowLeft',  code: 'ArrowLeft',  windowsVirtualKeyCode: 37 };
const TAB         = { key: 'Tab',        code: 'Tab',        windowsVirtualKeyCode: 9 };

// ---------------------------------------------------------------- main
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-atspi-'));
const args = [
  `--remote-debugging-port=${PORT}`,
  '--remote-allow-origins=*',
  '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-dev-shm-usage',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1024,768',
  ...(process.env.NO_FORCE_A11Y ? [] : ['--force-renderer-accessibility']),
  ...(MODE === 'headless' ? ['--headless=new'] : ['--ozone-platform=x11']),
  `file://${path.join(HERE, 'testpage.html')}`,
];
const env = { ...process.env, ACCESSIBILITY_ENABLED: '1', GNOME_ACCESSIBILITY: '1' };
delete env.CHROME_HEADLESS;

log('mode:', MODE);
log('launch:', CHROME, args.join(' '));
const chrome = spawn(CHROME, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
const chromeLog = fs.createWriteStream(path.join(path.dirname(EVENTS), `chrome-${MODE}.log`));
chrome.stdout.pipe(chromeLog); chrome.stderr.pipe(chromeLog);

const cdp = await connect(PORT);
const { targetInfos } = await cdp.send('Target.getTargets');
const page = targetInfos.find((t) => t.type === 'page');
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
cdp.sessionId = sessionId;
await cdp.send('Runtime.enable');
await cdp.send('Page.enable');
const ver = await cdp.send('Browser.getVersion', {}, null);
log('browser product:', ver.product, '| userAgent has HeadlessChrome:', /HeadlessChrome/.test(ver.userAgent));
log('attached to', page.url);

let step = 0;
async function mark(label) {
  step += 1;
  await cdp.eval(`window.__mark(${step})`);
  try { await waitForMarker(`STEP-${step}`); log(`  ✓ boundary STEP-${step} (${label}) observed on AT-SPI bus`); }
  catch (e) { log(`  ✗ boundary STEP-${step} (${label}) NOT observed: ${e.message}`); }
}
async function note(text) {
  fs.appendFileSync(NOTES, JSON.stringify({ afterStep: step, note: text }) + '\n');
  log('--', text);
}

await note('page loaded, marker sanity check');
await mark('boot');

// -- pillar 1: focus -------------------------------------------------------
await note('P1a: focus #btn-alpha via .focus()');
await cdp.eval(`document.getElementById('btn-alpha').focus()`);
await mark('p1a');

await note('P1b: focus #btn-beta via .focus()');
await cdp.eval(`document.getElementById('btn-beta').focus()`);
await mark('p1b');

await note('P1c: real Tab keypress from #btn-beta');
await key(cdp, TAB);
await mark('p1c');

// -- pillar 2: control state ----------------------------------------------
await note('P2a: aria-pressed false -> true on #btn-toggle');
await cdp.eval(`document.getElementById('btn-toggle').setAttribute('aria-pressed','true')`);
await mark('p2a');

await note('P2b: focus #btn-victim');
await cdp.eval(`document.getElementById('btn-victim').focus()`);
await mark('p2b');

await note('P2c: disable #btn-victim WHILE FOCUSED');
await cdp.eval(`document.getElementById('btn-victim').disabled = true`);
await mark('p2c');

// -- pillar 3: live regions -----------------------------------------------
await note('P3a: pure append to live region');
await cdp.eval(`(()=>{const d=document.createElement('div');d.textContent='First message';document.getElementById('live').appendChild(d);})()`);
await mark('p3a');

await note('P3b: second pure append');
await cdp.eval(`(()=>{const d=document.createElement('div');d.textContent='Second message';document.getElementById('live').appendChild(d);})()`);
await mark('p3b');

await note('P3c: remove + insert in ONE tick (the discriminating case)');
await cdp.eval(`(()=>{const l=document.getElementById('live');l.removeChild(l.firstChild);const d=document.createElement('div');d.textContent='Third message';l.appendChild(d);})()`);
await mark('p3c');

await note('P3d: wholesale wipe (innerHTML = "")');
await cdp.eval(`document.getElementById('live').innerHTML=''`);
await mark('p3d');

// -- pillar 4: caret -------------------------------------------------------
await note('P4a: focus #inp (value "hello world")');
await cdp.eval(`document.getElementById('inp').focus()`);
await mark('p4a');

await note('P4b: three real ArrowRight keypresses');
await key(cdp, ARROW_RIGHT);
await key(cdp, ARROW_RIGHT);
await key(cdp, ARROW_RIGHT);
await mark('p4b');

await note('P4c: one real ArrowLeft keypress');
await key(cdp, ARROW_LEFT);
await mark('p4c');

await note('P4d: setSelectionRange(7,7) programmatically');
await cdp.eval(`document.getElementById('inp').setSelectionRange(7,7)`);
await mark('p4d');

await note('P4e: type the letter X');
await key(cdp, { key: 'X', code: 'KeyX', windowsVirtualKeyCode: 88, text: 'X' });
await mark('p4e');

await note('P4f: select all in the input (selection change)');
await cdp.eval(`document.getElementById('inp').setSelectionRange(0,12)`);
await mark('p4f');

// -- pillar 4 follow-up: is caret movement coalesced? ----------------------
await note('P4g: reset caret to offset 0, then ONE ArrowRight, isolated by a boundary');
await cdp.eval(`document.getElementById('inp').setSelectionRange(0,0)`);
await mark('p4g-reset');
await note('P4h: ArrowRight #1 (isolated)');
await key(cdp, ARROW_RIGHT);
await mark('p4h');
await note('P4i: ArrowRight #2 (isolated)');
await key(cdp, ARROW_RIGHT);
await mark('p4i');
await note('P4j: ArrowRight #3 (isolated)');
await key(cdp, ARROW_RIGHT);
await mark('p4j');
await note('P4k: reset to 0, then FIVE ArrowRights back-to-back (coalescing test)');
await cdp.eval(`document.getElementById('inp').setSelectionRange(0,0)`);
await mark('p4k-reset');
await note('P4l: five rapid ArrowRights');
await key(cdp, ARROW_RIGHT); await key(cdp, ARROW_RIGHT); await key(cdp, ARROW_RIGHT);
await key(cdp, ARROW_RIGHT); await key(cdp, ARROW_RIGHT);
await mark('p4l');

await note('P4m: focus the contenteditable "Rich editor" (text: "ab [link] cd")');
await cdp.eval(`(()=>{const e=document.getElementById('edit');e.focus();const r=document.createRange();r.setStart(e.firstChild,0);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);})()`);
await mark('p4m');
for (let i = 1; i <= 6; i++) {
  await note(`P4n${i}: ArrowRight #${i} in the rich editor (walking towards/through the link)`);
  await key(cdp, ARROW_RIGHT);
  await mark(`p4n${i}`);
}

// -- announcement probe ----------------------------------------------------
await note('P5a: ariaNotify feature detection');
const hasNotify = await cdp.eval(`typeof document.body.ariaNotify === 'function'`);
log('   ariaNotify available:', hasNotify);
const enumProbe = await cdp.eval(`(()=>{const out={};for(const p of ['none','normal','important','high','polite','assertive'])
  { try { document.body.ariaNotify('enum probe ' + p, {priority: p}); out[p]='accepted'; } catch(e){ out[p]='rejected'; } } return out;})()`);
log('   ariaNotify priority enum:', JSON.stringify(enumProbe));
await mark('p5a-enum');

await note('P5b: ariaNotify on document.body, default priority');
await cdp.eval(`document.body.ariaNotify('Body default priority')`);
await mark('p5b');

await note('P5c: ariaNotify on document.body, priority high');
await cdp.eval(`document.body.ariaNotify('Body high priority', {priority:'high'})`);
await mark('p5c');

await note('P5d: focus a button first, then ariaNotify on that button');
await cdp.eval(`document.getElementById('btn-alpha').focus()`);
await mark('p5d-focus');
await note('P5e: ariaNotify on the focused button');
await cdp.eval(`document.getElementById('btn-alpha').ariaNotify('From the focused button', {priority:'high'})`);
await mark('p5e');

await note('P5f: ariaNotify on document.documentElement');
await cdp.eval(`document.documentElement.ariaNotify('From documentElement')`);
await mark('p5f');

await note('P5g: extra boundary, to catch any lagged announcement');
await cdp.eval(`void 0`);
await mark('p5g-drain');

await note('P5h: role=alert element inserted after boot');
await cdp.eval(`(()=>{const a=document.createElement('div');a.setAttribute('role','alert');a.textContent='Alert text';document.body.appendChild(a);})()`);
await mark('p5h');
await note('P5i: drain boundary after the alert');
await cdp.eval(`void 0`);
await mark('p5i-drain');

await note('P5j: text change INSIDE an existing role=alert (the correct pattern)');
await cdp.eval(`document.querySelector('[role=alert]').textContent='Alert text updated'`);
await mark('p5j');
await note('P5k: drain boundary');
await cdp.eval(`void 0`);
await mark('p5k-drain');

// -- dump live-region object attributes ------------------------------------
await note('DONE');
log('done');
chrome.kill('SIGTERM');
process.exit(0);

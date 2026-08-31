# Spike: can we capture Chromium's ordered accessibility event stream via AT-SPI2 on Linux?

**Status: empirical, 2026-08. Verdict: YES — comprehensively, and headless with no X
server at all.** This closes the open question left by
[`../../chromium-ax-observation.md`](../../docs/observing-chromium.md), and it
overturns that document's recommendation to skip AT-SPI in favour of
`chrome.automation` (which is blocked for us anyway).

Everything below was observed on this box. Scripts in this directory reproduce it;
raw logs are in [`logs/`](logs).

## Environment

| | |
|---|---|
| OS | Ubuntu 24.04.4 LTS (noble), container, running as root |
| Chromium | 141.0.7390.37 — `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` |
| at-spi2-core / libatspi / ATK / atk-bridge / GIR | 2.52.0-1build1 (ATK 2.52 ≥ 2.50, so `object:announcement` is in scope) |
| PyGObject | 3.48.2 |
| Xvfb | 21.1.12 · dbus 1.14.10 · Node 22.22.2 |

### What was installed vs. missing

Already present: `dbus-daemon`, `dbus-run-session`, `dbus-update-activation-environment`,
`gdbus`, `busctl`, `Xvfb`, `xvfb-run`, `libatspi.so.0`, `libatk-bridge2.0-0t64`,
`at-spi2-common`, `python3-dbus`, `python3-gi` (broken — see below).

Missing, and installed with `apt-get install at-spi2-core gir1.2-atspi-2.0 python3-gi
python3-gi-cairo xdotool` after `apt-get update`:
**`at-spi2-core`** (which is what actually ships `/usr/libexec/at-spi-bus-launcher` and
`/usr/libexec/at-spi2-registryd` — `at-spi2-common` alone ships only the D-Bus service
files and GSettings schemas) and **`gir1.2-atspi-2.0`** (the `Atspi-2.0.typelib`).
Installation worked with no friction.

One trap: **`/usr/bin/python3` is 3.11 here and cannot import `gi`**
(`ImportError: cannot import name '_gi'`) because `python3-gi` is built for 3.12.
The recorder therefore hardcodes `/usr/bin/python3.12`. `setup.sh` probes for the
interpreter that actually owns a working `gi` + `Atspi`.

## Standing up the stack — the recipe that works

[`stack.sh`](stack.sh), run under `dbus-run-session`. Every wait is on an observed
condition (socket exists, bus name resolves, name is owned), never a fixed delay:

1. `Xvfb :99 -screen 0 1024x768x24 -nolisten tcp`, export `DISPLAY=:99`; wait for
   `/tmp/.X11-unix/X99` to exist.
2. `dbus-update-activation-environment DISPLAY=:99` (warns without systemd; harmless).
3. `/usr/libexec/at-spi-bus-launcher --launch-immediately --a11y=1 --screen-reader=0`.
4. Resolve the bus with `gdbus call --session --dest org.a11y.Bus --object-path
   /org/a11y/bus --method org.a11y.Bus.GetAddress`, export **`AT_SPI_BUS_ADDRESS`**.
   Here it resolves to `unix:path=/root/.cache/at-spi/bus_99,guid=…`.
5. `/usr/libexec/at-spi2-registryd`; poll `org.freedesktop.DBus.NameHasOwner` on the
   a11y bus until `org.a11y.atspi.Registry` is owned.

`Atspi.init()` then returns 0 and `Atspi.get_desktop(0)` works. Chromium appears as a
child of the desktop within ~0.4 s of launch.

Reproduce: `./setup.sh && ./run.sh x11` (or `./run-headless-nox.sh`).

## Harness design — why there are no sleeps

The recorder ([`recorder.py`](recorder.py)) and the driver ([`driver.mjs`](driver.mjs))
are separate processes on either side of a D-Bus hop. Rather than sleeping between
steps, the test page carries a **marker control**; after each action the driver sets
its `aria-label` to `STEP-<n>`, the recorder observes the resulting
`object:property-change:accessible-name` and writes a `{"marker":"STEP-n"}` line, and
the driver blocks on `fs.watch` until that line appears. Each step boundary is a real
observed event. The only polling left is waiting for Chromium's CDP port to open (an
external process with no push signal) and for the recorder to finish registering.

One bug this surfaced, worth repeating: **the driver must not append its own notes to
the recorder's JSONL.** The recorder holds that file open with its own write offset, so
a second writer silently clobbers lines. Notes go to a sibling `-notes.jsonl`.

## Launching Chromium so it bridges — and which gates are actually real

The brief listed several gating conditions from Chromium source. **Most of them did not
hold in Chromium 141.** [`gating-probe.sh`](gating-probe.sh) runs the full pillar suite
under four environments and counts what reaches the bus:

| Configuration | AT-SPI events | all 41 step boundaries observed? |
|---|---|---|
| baseline (`ACCESSIBILITY_ENABLED=1`, `--force-renderer-accessibility`) | 150 | ✅ |
| **`CHROME_HEADLESS=1` set** | 142 (incl. `object:announcement`) | ✅ |
| `ACCESSIBILITY_ENABLED`/`GNOME_ACCESSIBILITY`/`QT_ACCESSIBILITY` all unset | 620 | ✅ |
| `AT_SPI_BUS_ADDRESS` unset in Chromium's env | 150 | ✅ |
| **no `--force-renderer-accessibility`**, `ACCESSIBILITY_ENABLED=1` | 136 (caret ✅, announcement ✅) | ✅ |
| **no `--force-renderer-accessibility`, no env flags at all** | 136 (caret ✅, announcement ✅) | ✅ |
| `at-spi-bus-launcher --a11y=0` (bus says accessibility disabled), no env flags | 145 | ✅ |

Read that carefully:

- **`CHROME_HEADLESS=1` did NOT disable the ATK bridge.** The
  `ShouldEnableAccessibility()` early-return described in the source notes is either
  gone, moved, or on a different path in 141. Do not rely on it either way — but also
  do not treat it as a blocker.
- **`--force-renderer-accessibility` is not required** for the AT-SPI path, and neither
  are the env flags. What actually turns Chromium's accessibility on is **the presence
  of a registered AT-SPI client**: with `at-spi2-registryd` running and a listener
  registered, Chromium enables accessibility through the normal "an AT is present"
  path. Even `--a11y=0` on the bus launcher did not suppress it.
- Chromium resolves the a11y bus itself via `org.a11y.Bus.GetAddress` on the session
  bus. `AT_SPI_BUS_ADDRESS` matters for **our recorder**, not for Chromium.

We still pass `ACCESSIBILITY_ENABLED=1` and `--force-renderer-accessibility` in
`stack.sh`/`driver.mjs`, as belt and braces and because they are cheap.

Chromium's stderr is noisy but benign: `Failed to connect to socket
/run/dbus/system_bus_socket` (no system bus in the container) and a UPower probe
failure. Neither affects the a11y bridge.

## Headless: it works with no X server whatsoever

Three configurations were run end to end:

| Configuration | Result |
|---|---|
| Xvfb + `--ozone-platform=x11` (the Igalia recipe) | ✅ full stream |
| Xvfb + `--headless=new` | ✅ full stream |
| **No Xvfb, `DISPLAY` unset, `--headless=new`** ([`run-headless-nox.sh`](run-headless-nox.sh)) | ✅ full stream |

Headless was genuinely engaged — `Browser.getVersion` reports a `HeadlessChrome`
user-agent. **This is the single most operationally valuable finding: AT-SPI2 needs
D-Bus, but it does not need a display.** CI needs `dbus-run-session` +
`at-spi-bus-launcher` + `at-spi2-registryd` and nothing else. Xvfb is optional.

Comparing the 40 pillar steps between the Xvfb/x11 run and the headless/no-X run,
**37 are identical in event type, `detail1` and source id**; the other 3 contain the
same multiset of events in a different order. (An earlier pair of runs matched on 36,
the extra difference being caret coalescing.) Both kinds of variation are described
under "Constraints" below and neither is mode-related — they reproduce within a single
mode across runs.

## The four pillars — raw results

Full logs: [`logs/report-x11.txt`](logs/report-x11.txt),
[`logs/report-headless-nox.txt`](logs/report-headless-nox.txt), JSONL alongside.
`d1`/`d2` are AT-SPI `detail1`/`detail2`; `any` is `any_data`.

### Pillar 1 — keyboard & focus ✅

```
### step 2: focus #btn-alpha via .focus()
  object:state-changed:focused   d1=0  src=document web('AT-SPI pillar probe')
  object:state-changed:focused   d1=1  src=push button('Alpha')
### step 4: real Tab keypress from #btn-beta
  object:state-changed:focused   d1=0  src=push button('Beta')
  object:state-changed:focused   d1=1  src=toggle button('Toggle Mute')
```

Clean, paired blur/focus with `detail1` as the boolean. Real `Tab` (dispatched via
`Input.dispatchKeyEvent`) is indistinguishable from `.focus()`.

**No bare `focus:` event is ever emitted** — zero occurrences across every run, despite
the listener being registered successfully. Use `object:state-changed:focused` with
`detail1 == 1`. The legacy `focus:` class is dead here.

### Pillar 2 — dynamic control state ✅

```
### step 5: aria-pressed false -> true on #btn-toggle
  (marker STEP-5)
  object:state-changed:pressed   d1=1  src=toggle button('Toggle Mute')
### step 7: disable #btn-victim WHILE FOCUSED
  object:state-changed:focused   d1=0  src=push button('Victim')
  object:state-changed:focused   d1=1  src=document web('AT-SPI pillar probe')
  (marker STEP-7)
  object:state-changed:enabled    d1=0  src=push button('Victim')
  object:state-changed:sensitive  d1=0  src=push button('Victim')
  object:state-changed:read-only  d1=0  src=push button('Victim')
```

Note two things. `aria-pressed` promotes the role to `toggle button` and emits
`state-changed:pressed`. And **the focus black hole is directly visible**: focus does
not vanish, it lands on the `document web` root — which is exactly the defect (the user
is dumped at the top of the document). AT-SPI names the destination, which CDP could
only infer from the absence of a `focused: true` node.

### Pillar 3 — live regions ⚠️ rich, but no live-region event

**Confirmed as the source review predicted: AuraLinux emits no live-region event at
all.** No `object:announcement`, no `LIVE_REGION_*` equivalent, for any of the four
mutations. Instead you get text and children deltas on the container:

```
### step 8: pure append          (live region had 0 children)
  object:text-changed:insert  d1=0 d2=13  any='First message'  src=section('')      <- the new child
  object:text-changed:insert  d1=0 d2=1   any='￼'         src=#live            <- one embedded-object char
  (marker STEP-8)
  object:children-changed:add d1=0  any={role:section, container-live:'polite', atomic:'false',
                                         relevant:'additions text', container-atomic:'false', …}

### step 9: second pure append
  object:text-changed:insert  d1=0 d2=14  any='Second message'
  object:text-changed:insert  d1=1 d2=1   any='￼'         <- appended at index 1
  (marker) object:children-changed:add d1=1

### step 10: remove first child + append, IN ONE TICK
  object:children-changed:remove d1=0
  object:text-changed:insert     d1=0 d2=13  any='Third message'
  object:text-changed:delete     d1=0 d2=2   any='￼￼'   <- whole run torn down
  object:text-changed:insert     d1=0 d2=2   any='￼￼'   <- and rebuilt
  (marker) object:children-changed:add d1=1

### step 11: wholesale wipe (innerHTML = '')
  object:children-changed:remove d1=0
  object:children-changed:remove d1=1
  object:text-changed:delete     d1=0 d2=2   any='￼￼'
```

**Answer to the second headline question: yes, a pure append and a remove+insert in the
same tick ARE distinguishable at AT-SPI** — and this is strictly better than CDP, where
they produced identical event shapes.

- Pure append = a **1-character** `￼` insert at the tail index, plus one
  `children-changed:add`, and **no delete**.
- Remove+insert = a `children-changed:remove` plus a `text-changed:delete` **and**
  `text-changed:insert` of the **entire** embedded-object run (`d2` = current child
  count), plus a `children-changed:add`.

That is a mechanical, assertable discriminator for the announcer's append-only
discipline: *if a step ever produces `object:text-changed:delete` on the live container,
the DOM was not append-only.*

Two further useful details:

- The `children-changed:add` payload carries the **added child's accessible name and
  the live-region metadata** (`container-live: polite`, `atomic`, `relevant`,
  `container-atomic`, `container-relevant`). That is very close to what an AT needs to
  decide what to speak, delivered in one event.
- A `role="alert"` element **inserted after boot** produced only a `text-changed:insert`
  on the new `notification` object plus `children-changed` — **no announcement, no
  live-region event** (step 38). Changing the text *inside* an already-mounted alert
  (step 40) produced `children-changed:remove` + `text-changed:delete` +
  `text-changed:insert` on the notification, then a lagged `children-changed:add`
  carrying the new static's name and `container-live: assertive`. This is the
  source-level "region created with its content is silent" gotcha, visible at layer 2,
  and it independently validates mounting live regions empty at boot.

### Pillar 4 — caret ✅ THE UNLOCK

**Answer to the first headline question: yes.** `object:text-caret-moved` arrives on
real arrow keys with `detail1` = the new offset:

```
### step 12: focus #inp (value "hello world")
  object:text-caret-moved  d1=0   CARET=0  len=11  text='hello world'  src=entry('Notes')
### step 19/20/21: three ISOLATED ArrowRight presses
  object:text-caret-moved  d1=1   CARET=1  len=12  text='hello wXorld'
  object:text-caret-moved  d1=2   CARET=2
  object:text-caret-moved  d1=3   CARET=3
### step 16: typing the letter X at offset 7
  object:text-changed:insert d1=7 d2=1 any='X'
  object:text-caret-moved    d1=8  CARET=8 len=12 text='hello wXorld'
### step 17: setSelectionRange(0,12)
  object:text-selection-changed
  object:text-caret-moved    d1=12
```

`detail1` and a live `Atspi.Text.get_caret_offset()` agree in every single event, and
the recorder can pull the full text and character count at the same moment. Text
insertion carries offset, length and the inserted string, exactly as advertised.

**Caret across an embedded object — the hypertext model, fully observable.** In a
`contenteditable` reading `ab <a>link</a> cd`, the container's AT-SPI text is
`'ab ￼ cd'` (the link collapsed to one `U+FFFC`), and walking right with six
isolated `ArrowRight` presses gives:

```
step 25  caret d1=1  len=7  text='ab ￼ cd'  src=entry('Rich editor')
step 26  caret d1=2  len=7  text='ab ￼ cd'  src=entry('Rich editor')
step 27  caret d1=3  len=7  text='ab ￼ cd'  src=entry('Rich editor')   <- at the U+FFFC
step 28  caret d1=1  len=4  text='link'          src=link('link')           <- SOURCE SWITCHES
step 29  caret d1=2  len=4  text='link'          src=link('link')
step 30  caret d1=3  len=4  text='link'          src=link('link')
```

Crossing into the link **changes the event source object** and restarts offsets inside
the link's own text. That is precisely the information a screen reader uses to decide
"link, link" boundary narration, and it is exactly what CDP could not see at all.

### Bonus — `object:announcement` (ariaNotify) works, with a caveat

`Element.ariaNotify()` exists in Chromium 141. Its `priority` enum accepts only
`'normal'` and `'high'` (`'polite'`, `'assertive'`, `'important'`, `'none'` are all
rejected). When it fires, AT-SPI delivers:

```
object:announcement  d1=2  any='From the focused button'  src=push button('Alpha')   [priority 'high']
object:announcement  d1=1  any='probe normal'                                        [priority 'normal']
```

`detail1` carries politeness (1 = normal, 2 = high) and `any_data` carries the literal
text. **Caveat, reproduced in every run:** `ariaNotify` produced an AT-SPI event **only
when called on the element that currently held focus**. Calls on `document.body` and
`document.documentElement` while focus was elsewhere reached the bus **never** — the
call succeeds in JS and nothing is emitted. Do not treat `document.body.ariaNotify()`
as observable; scope the call to the focused element (or verify against a newer
Chromium before relying on it).

## Constraints a harness must respect

Three real ones, all established empirically rather than assumed.

### 1. `object:children-changed` (and non-focus `state-changed`) lag by one update

Look again at step 8 above: the marker for the step arrives **before** the
`children-changed:add` describing that step's own mutation. This is not a client-side
artifact. A raw `dbus-monitor --profile` tap of the a11y bus
([`logs/wire-x11.tsv`](logs/wire-x11.tsv)) shows it in the sender's own serial numbers:

```
serial=68  Object.TextChanged      path=…/235   (live container)
serial=69  Object.TextChanged      path=…/236   (new child)
serial=70  Object.PropertyChange   path=…/230   (the STEP-8 marker, set by the NEXT eval)
serial=71  Object.ChildrenChanged  path=…/235
```

Monotonic serials from one sender: **Chromium really emits `children-changed` in the
next tree-update batch.** The same lag applies to `state-changed:{pressed, enabled,
sensitive, read-only}` — but *not* to `state-changed:focused`, `text-changed`,
`text-caret-moved` or `property-change`, which land in the mutation's own batch.

Consequence: a sync marker does **not** bound a step's events. Assert over the window
between marker `n-1` and marker `n+1`, or plant a no-op "drain" boundary after any step
whose expectations include children/state changes. The driver does the latter.

### 2. Rapid input is coalesced — intermediate caret offsets are lost

Five `ArrowRight` presses dispatched back to back produced **one** event with
`detail1=5`, not five events. Three back-to-back presses produced one event with
`detail1=3` in one run and two events (`2`, `3`) in another. Isolated presses separated
by an observed boundary produced one event each, every time, in both display modes.

So AT-SPI is a true ordered stream, but it is **not lossless under burst**. This is the
same class of problem as CDP's 250 ms coalescing, though much less aggressive — and,
crucially, it is avoidable by driving one interaction per sync point, which is how a
behavioural harness should be written anyway. It does mean **you cannot attest "the
user heard N things" by firing N mutations in one tick** — a real screen reader would
drop them too (NVDA's `orderedWinEventLimiter` caps at 10 per cycle).

### 3. Within-step ordering across different source objects is not stable

Comparing full runs step by step, 3 of 40 steps differ every time: the live region
emits `text-changed` on the new child and on the container in either order.

```
x11 : text-changed:insert(#live-child 'First message'), text-changed:insert(#live '￼')
nox : text-changed:insert(#live '￼'),              text-changed:insert(#live-child 'First message')
```

Same multiset, different order. The fourth was the caret coalescing above. **Assert on
the multiset of events per source object, and on ordering only within one source
object** — not on a global sequence.

## Practical notes

- **Node identity is available.** Chromium exposes the DOM `id` in AT-SPI object
  attributes, along with `tag`, `xml-roles`, `display`, `class` and the live-region
  metadata. The recorder harvests these, which is what makes the logs readable
  (`src=#live` rather than `src=section('')`). Without it, three different `<div>`s all
  report as `section('')`.
- **Teardown is noisy.** Killing Chromium emits a burst of
  `object:state-changed:defunct` (13 to 473 across runs, depending on how long the
  recorder outlives the browser), and touching those sources raises
  `atspi_error: The application no longer exists`. Every accessor in the recorder is
  wrapped in a guard; filter `defunct` when analysing.
- **Cost.** The whole 41-step suite runs in ~4 s wall clock inside the stack, from cold
  browser launch. Stack startup is ~0.5 s. This is cheap enough for CI.

## Verdict

| Pillar | CDP (layer 1) | AT-SPI2 (layer 2), measured here |
|---|---|---|
| 1. Keyboard & focus | ✅ | ✅ typed, ordered, with the focus destination named |
| 2. Control state / focus loss | ✅ | ✅ plus explicit `enabled`/`sensitive`/`read-only` transitions |
| 3. Live regions | ⚠️ append and replace look identical | ⚠️→✅ **no live-region event**, but append vs. remove+insert **is** discriminable via `text-changed:delete`, and `children-changed:add` carries the child's name + politeness |
| 4. Caret | ❌ invisible | ✅ **offsets on real keypresses, and source switching across embedded objects** |

**AT-SPI2 is worth adopting.** Not as a replacement for the CDP harness — CDP stays the
right tool for pillars 1–2 because it needs no D-Bus, no daemons and no root — but as a
second tier that adds the two things CDP structurally cannot provide:

1. **The caret pillar, outright.** There is no other route to it on Linux short of
   running Orca. Offsets, text context, and embedded-object traversal all arrive.
2. **A real ordered event stream with types intact**, so "what happened, in what order"
   becomes assertable instead of inferred from snapshot diffs.

The cost is far lower than the prior document assumed: **no Xvfb, no display, no screen
reader, no Chromium build, no special flags** — just `dbus-run-session`, two daemons
from `at-spi2-core`, and a ~60-line PyGObject listener. It runs in this container today.

Two corrections to [`../../chromium-ax-observation.md`](../../docs/observing-chromium.md)
that should be folded back into it:

- "**AT-SPI2 on Linux is *lossier* than the generator layer**" is true only for
  live-region *semantics*. For text and caret deltas AT-SPI is **richer** than anything
  above the split, because the hypertext representation (offsets, `U+FFFC`, per-object
  text) only exists at the platform layer. Since `chrome.automation` is confirmed
  blocked for us, AT-SPI is not a fallback — it is the plan.
- The `CHROME_HEADLESS=1` gate and the necessity of `--force-renderer-accessibility`
  did not reproduce in Chromium 141. The actual enabler is a registered AT-SPI client.

### Suggested next steps

1. Port the marker-boundary sync into a reusable fixture; make "one interaction per
   boundary" the harness's contract, given constraint 2.
2. Build the assertion vocabulary on `(source id, event type, detail1)` multisets per
   step, per constraint 3.
3. Validate the recorder against Chromium's checked-in
   `content/test/data/accessibility/event/*-expected-auralinux.txt` goldens — they are
   the ground truth for exactly this stream.
4. Decide whether the caret pillar justifies the D-Bus dependency in CI, or whether it
   runs as a separate slower tier alongside the CDP harness.

## Addendum (2026-08-30): the B1/B2 platform-verification captures

The W2 items B1 (editable vs read-only list) and B2 (blockquote crossing in an
editable host) were measured on this rig. Reproduce with
[`run-b1b2.sh`](run-b1b2.sh) (headless, no X; same marker-boundary sync via
[`recorder-b1b2.py`](recorder-b1b2.py), which additionally records the ancestor
chain and state set on every `object:text-caret-moved`, and
[`dump-tree.py`](dump-tree.py), which snapshots the document's accessible tree).
Pages: [`b1-lists.html`](b1-lists.html), [`b2-blockquote.html`](b2-blockquote.html);
renderer: [`report-b1b2.py`](report-b1b2.py). Two runs each are archived under
`logs/` (`events-b{1,2}-run{1,2}.jsonl`, `tree-*.json`, `report-*.txt`); all
measurement steps were event-for-event identical across runs (the only run-to-run
difference is browser-teardown `defunct` noise). The B1 read-only walk uses
`--enable-caret-browsing`, which works under `--headless=new` and emits real
`object:text-caret-moved` events in non-editable content. Findings and their
interpretation live in [`../../platform-rescue.md`](../../docs/platform-rescue.md)
(measured sections) and `EVIDENCE.md` E4.10/E4.12 — headline: the Linux bridge
demotes neither construct; the demotion NVDA applies to editable lists is
consumer-side, and NVDA source predicts blockquote crossings *should* speak in
focus mode.

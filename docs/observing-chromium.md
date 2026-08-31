# Observing accessibility behaviour from Chromium, without a screen reader

Research notes. **Status: empirical findings from a spike, 2026-08.** The question:
can we attest screen-reader-relevant behaviour deterministically, on Linux, in CI, by
observing Chromium directly — rather than by driving a real screen reader on a real OS?

> **Read this first.** This document was written as the spike ran, so it records claims
> in the order they were made — including three that were later **overturned by
> measurement** and one that was corrected on a closer source read. Each is marked in
> place below; the consolidated list is [`EVIDENCE.md` §5](evidence.md#5--corrections--claims-that-changed-during-the-work).
> Nothing in the earlier sections should be quoted without checking whether a later
> section revises it.

## The premise

Screen readers are *consumers*. Chromium computes an accessibility tree and a change
stream, then translates it to a platform API — IAccessible2/UIA on Windows,
NSAccessibility on macOS, AT-SPI2 on Linux. NVDA, JAWS, VoiceOver and Orca read that
platform output and decide what to speak. So there are three distinct layers, and it
matters enormously which one a test observes:

| Layer | What it is | What it answers |
|---|---|---|
| **1. Blink AX tree** | Chromium's internal tree + change notifications. Reachable over CDP. Platform-independent. | *What semantics did the page expose?* |
| **2. Platform bridge** | AT-SPI2 (Linux) / IA2 (Windows). Where "what changed, and how should it be presented" is serialised for ATs. | *What was the AT actually told?* |
| **3. Screen reader** | NVDA / Orca presentation logic, politeness queues, heuristics. | *What did the user hear?* |

Most existing tooling (axe-core, Lighthouse, Pa11y) sits *beside* layer 1 — static rule
checks over a snapshot. None of them observe change over time, which is where the four
behaviours below actually live.

## The four pillars

1. **Keyboard & focus** — tab order, focus visibility, focus consistency.
2. **Dynamic control state** — a control becoming pressed/expanded/disabled, and
   critically *where focus goes* when a focused control is disabled or removed.
3. **Live regions** — what is announced, once, and in what order.
4. **Caret / insertion point** — what would be read as the caret moves, especially
   adjacent to embedded objects, links and block boundaries.

## Spike results (Chromium 1194, headless, Linux, CDP)

Method: launch with `--force-renderer-accessibility`, attach over CDP, enable the
`Accessibility` domain, subscribe, mutate the page, record `Accessibility.nodesUpdated`.
Scripts in the session scratchpad (`axspike/`).

### Finding 0 — the subscription trap (undocumented, and decisive)

`Accessibility.nodesUpdated` fires **almost nothing** until the client has walked the
tree. On a fresh page, focus changes, ARIA state changes and live-region mutations all
produced **zero events**. After walking the tree via `getRootAXNode` +
`getChildAXNodes` (60 nodes on a trivial page), the same mutations produced meaningful,
targeted events.

It is a lazy-loading protocol built for the DevTools accessibility pane: you are only
notified about nodes you have already fetched. Anyone evaluating CDP for this and
skipping the walk will conclude — wrongly — that it is useless. **You must re-walk
after DOM insertions** to stay subscribed to new nodes.

### Finding 1 — focus is cleanly observable ✅

Focusing a button emits one event carrying that node with `focused: true`, and the
previously-focused node is reported alongside it. Tab-order and focus-consistency
assertions are straightforwardly buildable at layer 1.

### Finding 2 — control state changes are cleanly observable ✅

`aria-pressed="false" → "true"` emits the node with `pressed: "true"`. The property
vocabulary is rich: `focused, focusable, disabled, pressed, checked, expanded,
selected, level, invalid, required, readonly, busy, live, atomic, relevant,
activedescendant, controls, describedby, labelledby, errormessage, details, owns`.

**The focus-loss case works and is the headline result.** Disabling a button *while it
holds focus* emits four nodes: the button with `disabled: true`, a node turning
`ignored: true`, the `RootWebArea` — and **no node reporting `focused: true` at all**.
The focus black hole is directly detectable, automatically, with no screen reader.
That is one of the most common and most damaging real-world failures.

### Finding 3 — live regions are visible but COARSE ⚠️

Every mutation of an `aria-live` container emits exactly one event reporting **the
container**, with its child count. We could see `children=1 → 2 → 3` on successive
appends, `children=3` after a remove+insert, `children=0` after a wholesale wipe.

So we can verify **our own DOM discipline** — that we appended and never trimmed. But
a pure append and a remove+insert produce the *same* event shape at this layer. The
decision that distinguishes "announce the inserted node" from "re-announce the whole
region" is made **below** layer 1, in the platform bridge. **CDP cannot attest what
will be spoken.** For that, layer 2 (AT-SPI) or a real screen reader is required.

### Finding 4 — the caret is effectively invisible at this layer ❌

`setSelectionRange()` produced an event naming the textbox and root — no offset, no
text context. A **real `ArrowRight` keypress produced zero events.** Caret movement,
and therefore "what would be read as the insertion point moves", is not attestable
over CDP. This pillar needs layer 2: AT-SPI's `object:text-caret-moved`, plus
Chromium's hypertext representation (inline text boxes and the embedded-object
character `U+FFFC` that stands in for embedded objects within text).

There is also no richer hidden stream: the `Accessibility` domain exposes exactly two
events, `loadComplete` and `nodesUpdated`, both experimental.

## Source-level confirmation and three facts the spike could not see

A parallel source review of `third_party/blink/renderer/modules/accessibility/
inspector_accessibility_agent.cc` confirms the spike and adds constraints that decide
the design:

1. **The subscription trap is real and exact.** `MarkAXObjectDirty()` returns early
   unless `nodes_requested_.Contains(id)`. `nodes_requested_` is populated by
   `getRootAXNode`, `getAXNodeAndAncestors` and `getChildAXNodes` — **`getFullAXTree`
   does not populate it.** The obvious approach (fetch the whole tree, then listen)
   subscribes you to nothing. `loadComplete` also *clears* the set, so every navigation
   requires a re-walk.
2. **Updates are throttled to 250 ms** (`kNodeSyncThrottlePeriod`).
   `ProcessPendingDirtyNodes()` returns early inside that window, so intermediate
   states are coalesced away — you see the final state of a node, never the sequence it
   passed through. **This makes CDP push unusable for asserting ordering of rapid
   transitions**, which is exactly what a burst of announcements is.
3. **The event type is erased.** `AXEventFired(AXObject*, ax::mojom::blink::Event)`
   special-cases only `kLoadComplete` and `kLocationChanged`; everything else — focus,
   checked-state-changed, value-changed, text-selection-changed, live-region-changed —
   falls through to `default:` and merely marks the node dirty. You learn *that* a node
   changed, never *what Chromium considered the change to be*.
4. Minor: `Accessibility.enable` self-provisions `ui::kAXModeComplete`, so
   **`--force-renderer-accessibility` is unnecessary for the CDP path** (we passed it;
   it was harmless but redundant).

Consequence: treat CDP as **pull-based with scripted sync points** — drive an
interaction, wait for quiescence, snapshot and assert — rather than as an event stream.
That is sufficient for pillars 1 and 2 and is fully deterministic.

## The layer-2 picture (AT-SPI2), from source

Chromium's `AXPlatformNodeAuraLinux::NotifyAccessibilityEvent` does emit a typed,
ordered stream: `focus:` and `object:state-changed:focused`, `:checked`, `:pressed`,
`:expanded`, `:enabled`/`:sensitive`, `:selected`; `object:text-caret-moved` **with the
new offset**; `object:text-changed:insert`/`:delete` **with offset, length and text**;
`object:children-changed:add`/`:remove` with index; `object:property-change:accessible-
name`/`-value`; and — for `ariaNotify` — `object:announcement` carrying politeness
(needs ATK ≥ 2.50). Live-region metadata rides as object attributes: `container-live`,
`live`, `atomic`, `relevant`, `busy`.

Two gaps worth knowing: `ax::mojom::Event::kStateChanged` is an explicit no-op in
Chromium ("we don't know what state changed, so we deliberately do nothing"), and there
is **no `kActiveDescendantChanged` case** — Chromium appears never to emit
`object:active-descendant-changed`, so composite-widget focus must be tracked via
focus/selection events instead.

Activation is gated separately from the renderer flag:
`AtkUtilAuraLinux::ShouldEnableAccessibility()` checks `ACCESSIBILITY_ENABLED` /
`GNOME_ACCESSIBILITY` / `QT_ACCESSIBILITY`, then **returns false if `CHROME_HEADLESS=1`**,
then the `org.a11y.Bus` D-Bus property, then GSettings. So `--force-renderer-accessibility`
alone is not enough. Igalia's own Orca harness runs Chromium under **Xvfb with
`--ozone-platform=x11`**, not `--headless=new`; whether AT-SPI works under new headless
is **unverified and must be tested empirically**.

> **⚠️ Corrected by measurement — none of the three gating premises in the paragraph
> above reproduced.** Against Chromium 141: `CHROME_HEADLESS=1` did *not* disable the
> bridge (142 events, including `object:announcement`);
> `--force-renderer-accessibility` was *not* required (136 events, caret and announcement
> both present); and no environment flags were required at all (136 events). The actual
> enabler is **a registered AT-SPI client**. AT-SPI also works with **no X server at
> all**. Measured table in
> [`spikes/atspi/FINDINGS.md`](../research/atspi/FINDINGS.md); revised recommendation in the
> two sections below.

## Prior art that changes the plan

- **Orca already has the log-only speech backend.** `ORCA_TEST_SPEECH_SERVER_FACTORY`
  swaps in a no-audio speech server; the D-Bus Remote Controller exposes
  `set_log_file("SpeechPresenter", …)`; `OutputReader` yields ordered `SpeechRecord`s.
  Its `tests/integration_tests/` contains ~80 `test_web_*.py` files mapping almost
  exactly onto our four pillars — including `test_web_caret_context.py` and
  `test_web_editable_embedded.py` for pillar 4. Caveat: this machinery is on Orca
  `main` (51.x, unreleased) and the tests are maintainer-only and CI-disabled.
- **W3C ARIA-AT is the methodology template.** Assertion-per-observable-behaviour with
  MUST/SHOULD/MAY priorities, `assertionStatement`/`assertionPhrase`, per-AT command
  tables, and `at-driver`'s `interaction.capturedOutput` = "the text enunciated by the
  screen reader". **It supports JAWS, NVDA and VoiceOver — not Orca, not Linux.**
  Implementing an AT-Driver remote end over Orca's Remote Controller would make Linux a
  first-class ARIA-AT target; nothing like it exists, and it is upstreamable.
- **Chromium's `content/test/data/accessibility/event/`** holds ~150 scenarios with
  platform-verified `-expected-auralinux.txt` golden files, including
  `live-region-change`, `aria-pressed-changed`, `disabled-state-changed`,
  `caret-move-*`. The harness needs a Chromium build, but the **corpus is directly
  mineable as ground truth** for validating our own recorder.
- **`@guidepup/virtual-screen-reader`** is Linux-runnable but is a JS re-implementation
  of accname/role over the DOM — it never touches Chromium's real AX tree, and reports
  81 failing / 338 skipped WPT tests. Useful as a fast pre-commit smoke tier; it
  attests nothing about what Chromium exposes.
- **axe-core, Lighthouse, Pa11y, Accessibility Insights** contribute **nothing** to any
  of the four pillars: no events, no time or sequence, no focus destination after a
  mutation, no announcement verification, no caret. Keep axe for its disjoint defect
  class; do not let it imply coverage here.

## Verdict so far

| Pillar | Layer 1 (CDP) | Needs layer 2+ |
|---|---|---|
| 1. Keyboard & focus | ✅ works | — |
| 2. Control state, focus loss | ✅ works | — |
| 3. Live regions | ⚠️ own-DOM discipline only | ✅ for announcement behaviour |
| 4. Caret / insertion point | ❌ not observable | ✅ required |

Pillars 1 and 2 — probably the majority of real-world screen-reader defects — are
attestable **today**, on Linux, headless, in CI, deterministically, with no screen
reader and no Windows runner. That alone is worth building.

Pillars 3 and 4 need the platform bridge. On Linux that is AT-SPI2 over D-Bus, which
is automatable (`dbus-run-session` + `at-spi2-core` + a `pyatspi` client) and still
far cheaper than a screen reader in the loop. A real screen reader remains the only
answer for layer 3 — *what the user actually heard* — and for NVDA-specific quirks.

## CORRECTION — where the double-read decision actually lives

An earlier version of this document (and the spike write-up) claimed the decision that
distinguishes "announce the inserted node" from "re-announce the whole region" is made
**below** Blink, in the platform bridge. **That is wrong.** Source reading of
`ui/accessibility/ax_event_generator.cc` establishes:

`FireLiveRegionEvents()` emits, for every relevant change, **both**
`LIVE_REGION_NODE_CHANGED` on the changed node (when it has a non-empty name) **and**
`LIVE_REGION_CHANGED` on the live root. There is no code path that emits one instead of
the other. Therefore:

- **Pure insertion** → node event + root event.
- **Pure removal** → **nothing at all**, because the default `aria-relevant` is
  `"additions text"` and `IsRemovalRelevantInLiveRegion()` returns false.
- **Removal + insertion in the same update** → *identical output to a pure insertion*.
  The removal is filtered out by default, and even when `aria-relevant` includes
  removals both paths call `AddEvent(live_root, LIVE_REGION_CHANGED)` into a
  `std::set`, so they collapse to one event.

Confirmed by Chromium's own checked-in goldens: `live-region-change-innerhtml.html`
(remove + insert in one update) produces **a single** `EVENT_OBJECT_LIVEREGIONCHANGED`
on the root, plus one TEXT_INSERTED and one TEXT_REMOVED — the same shape as
`live-region-change.html`. And `live-region-remove.html` produces no live-region event
at all.

**So the re-announcement behaviour observed in the field is an AT-side decision.**
Chromium hands the AT a root-level live-region-changed plus text deltas; NVDA and JAWS
decide, from `aria-atomic` and their own virtual-buffer diff, whether to speak the delta
or re-read the region. `aria-atomic` **does not affect Chromium's emission at all** — it
is serialized and passed through for the AT to interpret.

This cuts both ways. It is good news for determinism: the Chromium-observable signal is
stable and does not vary between insert and replace, which makes it a sound test
substrate. It is bad news for catching this specific bug: **a re-announcement defect of
that shape cannot be detected by observing Chromium alone.**

The append-only discipline in our announcer remains correct — it simply defends against
the AT's diffing rather than against Chromium's — and two further facts reinforce it:

- **NVDA silently discards events under load.** `orderedWinEventLimiter.py` caps
  processing at `MAX_WINEVENTS_PER_THREAD = 10` per core cycle (`maxFocusItems = 4`),
  deduplicates identical event tuples, and cancels a pending HIDE against a later SHOW
  for the same object. A burst larger than that is *not* fully announced no matter what
  Chromium emits. Our 40/60 queue bounds should be read in that light: the ceiling is
  about hygiene, not about guaranteeing 60 utterances.
- **A live region root inserted in the same update as its content emits nothing.**
  `PostprocessEvents()` removes `LIVE_REGION_CHANGED` when `ALERT` or
  `LIVE_REGION_CREATED` is present on the node, and both Windows and AuraLinux then drop
  `LIVE_REGION_CREATED` entirely. This is a real Chromium-layer behaviour, observable
  above the split, and it is the source-level explanation of the classic ARIA gotcha.
  It validates mounting our regions empty at boot: a region created together with its
  first message would be silent.

## The better access path — `chrome.automation`

The most useful finding of the whole investigation. `ui::AXEventGenerator`:

- lives in `ui/accessibility/`, **above** the platform split;
- contains **zero platform conditionals** (`grep 'BUILDFLAG|#if'` over
  `ax_event_generator.cc` returns nothing) — every platform runs the identical diff;
- produces an **81-value semantic event stream** (`FOCUS_CHANGED`,
  `CHECKED_STATE_CHANGED`, `ENABLED_CHANGED`, `EXPANDED`, `COLLAPSED`, `NAME_CHANGED`,
  `LIVE_REGION_*`, `TEXT_SELECTION_CHANGED`, `DOCUMENT_SELECTION_CHANGED`,
  `CARET_BOUNDS_CHANGED`, `ACTIVE_DESCENDANT_CHANGED`, …).

`chrome.automation` runs its **own `AXEventGenerator` instance** over the same
`AXTreeUpdate` stream and dispatches to JavaScript, withholding only three of the 81
values (`NONE`, `ATK_TEXT_OBJECT_ATTRIBUTE_CHANGED`, `WIN_IACCESSIBLE_STATE_CHANGED`).
Linux is a supported platform. **ChromeVox is a complete screen reader built entirely on
this API** — existence proof that the layer carries enough signal.

That inverts the earlier tiering. Contrary to the previous recommendation, **AT-SPI2 on
Linux is *lossier* than the generator layer, not richer**:
`browser_accessibility_manager_auralinux.cc` drops **all three** live-region generated
events (Windows forwards `LIVE_REGION_CHANGED` but drops `LIVE_REGION_CREATED` and
`LIVE_REGION_NODE_CHANGED`). Confirmed by the `live-region-change`
`-expected-auralinux.txt` golden, which shows `NAME-CHANGED` / `TEXT-INSERT` /
`TEXT-REMOVE` and **no live-region signal whatsoever**. Testing above the split is
strictly more informative than testing at AT-SPI on Linux.

> **⚠️ Partly corrected by measurement.** The live-region half of this stands: AuraLinux
> emits no live-region event of any kind, confirmed empirically. The blanket "lossier,
> not richer" does **not**: AT-SPI is *richer* for caret and text change, delivering
> `object:text-caret-moved` with real offsets and `object:text-changed:*` with
> offset/length/text — signal the generator layer does not expose in that form. The
> correct statement is **lossy for live regions, richer for caret and text**, so the two
> layers complement each other rather than one dominating. See
> [`spikes/atspi/FINDINGS.md`](../research/atspi/FINDINGS.md) §Pillar 3 and §Pillar 4.

Caveat, unverified: `chrome.automation` is allowlist-gated to four hardcoded extension
IDs plus component extensions; the escape hatch is `--allowlisted-extension-id=<id>`.
Nobody has run this in our context — it is the first thing to prototype, and it fails
fast if the switch does not cooperate.

Also note `--force-renderer-accessibility` with **no value** yields
`kAXModeComplete | kScreenReader`. `kExtendedProperties` is non-negotiable: without it
there are no `kContainerLiveStatus` attributes and therefore no live-region events at
all.

## MEASURED — AT-SPI2 works, headless, with no X server (2026-08)

Spike in `spikes/atspi/`. Verdict: **AT-SPI2 gives everything CDP could not, runs
headless with no display, and needs only D-Bus.** This supersedes the caution above.

**Install:** only `at-spi2-core` (the daemons; `at-spi2-common` ships neither) and
`gir1.2-atspi-2.0` were missing. Trap: `/usr/bin/python3` here is 3.11 and cannot
import `gi` — the recorder pins `python3.12`.

### Three premises from source reading did NOT reproduce
Measured against Chromium 141.0.7390.37 with `gating-probe.sh`, not assumed:
- **`CHROME_HEADLESS=1` did *not* disable the bridge.**
- **`--force-renderer-accessibility` is *not* required.**
- **The `ACCESSIBILITY_ENABLED` / `GNOME_ACCESSIBILITY` env flags are *not* required.**
- The actual enabler is simply **the presence of a registered AT-SPI client**.
- **No bare `focus:` event is ever emitted** — use `object:state-changed:focused`.

Earlier sections of this document state the opposite, from source reading of
`AtkUtilAuraLinux::ShouldEnableAccessibility()`. Trust the measurement.

### Pillar 4 — caret — SOLVED
`object:text-caret-moved` arrives on **real arrow keys** with `detail1` = the new
offset, agreeing with a live `get_caret_offset()` every time, plus text and length.
Better than hoped: walking the caret through `ab <a>link</a> cd` exposes the container
as `'ab ￼ cd'` (U+FFFC standing in for the link) and then **switches the event source to
the link accessible, with offsets restarting inside it**. The hypertext model is fully
observable. This is the pillar CDP could not see at all.

### Pillar 3 — live regions — distinguishable here, unlike CDP
Confirmed: AuraLinux emits **no live-region event at all** (as the drop-list predicted).
But the shapes differ mechanically:
- **Pure append** → a 1-character `￼` insert at the tail + `object:children-changed:add`.
- **Remove + insert in one tick** → additionally `children-changed:remove` and a
  `text-changed:delete`+`insert` of the *entire* embedded-object run.

So **`text-changed:delete` on a live container is a mechanical "the DOM was not
append-only" assertion** — a direct automated test for the announcer discipline this
project adopted. The `children-changed:add` payload also carries the added child's name
and `container-live` politeness.

### Headless
Works with `--headless=new` and **no `DISPLAY` at all** (confirmed via `HeadlessChrome`
in the UA). 37 of 40 pillar steps are identical between Xvfb/X11 and headless/no-X.
**CI needs D-Bus, not a display.**

### Real constraints found
1. `object:children-changed` and non-focus `state-changed` **lag by one tree-update
   batch** — proven on the wire with a `dbus-monitor --profile` tap showing monotonic
   sender serials, so it is emission order, not a libatspi artifact.
2. **Rapid input is coalesced**: five back-to-back ArrowRights produce one event with
   `detail1=5`. Drive one interaction per sync point.
3. **Within-step ordering across different source objects is unstable** — assert on
   multisets per source, not a global sequence.

Synchronisation in the harness uses **no sleeps**: a marker control's accessible name is
set after each action and the driver blocks until the recorder observes that event.

### `ariaNotify` — works, with a caveat worth chasing
`object:announcement` carries politeness in `detail1` and text in `any_data` — but
reproducibly **only when `ariaNotify` is called on the focused element**. Calls on
`document.body` / `documentElement` succeeded in JS and never reached the bus. Verify
against source before relying on it.

## Recommended strategy

**Tier 1 — CDP behavioural harness (build first).** Headless, no display, no D-Bus,
runs anywhere. `Accessibility.enable` + `Input.dispatchKeyEvent` + `Runtime.evaluate`,
asserting on snapshots at scripted sync points. Covers pillar 1 completely and pillar
2's most valuable half (focus destination after mutation) with perfect determinism.
Do not attempt live regions or caret here.

**Tier 2 — AT-SPI2 event recorder (REVISED AGAIN — this is now the recommended path).**
Measured working, headless, no display, D-Bus only. Gives ordered typed events, caret
offsets with hypertext traversal into embedded objects, and mechanically
distinguishable live-region mutation shapes. This is what unlocks pillars 3 and 4.
The `chrome.automation` note below is retained for the record but that path is blocked.

**(blocked) `chrome.automation` event recorder.**
A small unpacked extension loaded with `--allowlisted-extension-id`, subscribing to the
generated-event stream and writing timestamped JSONL. This gets the full 78-event
semantic stream, platform-independently, above the split, with no D-Bus, no Xvfb and no
screen reader — and it is strictly richer than AT-SPI on Linux, which drops every
live-region event. Prototype the allowlist switch first; it is the one unverified
assumption. AT-SPI remains a fallback if the extension path is blocked, and is still
the only route to `object:text-caret-moved` offsets if `CARET_BOUNDS_CHANGED` and the
`AXTreeData` selection tuple prove insufficient for pillar 4.

**Tier 3 — Orca in the loop**, for narration-dependent assertions only (announcement
semantics, caret narration near embedded objects). Slow, version-pinned, non-blocking.

Model the assertion vocabulary on ARIA-AT V2 so results are legible to the field.

## Next steps

- Prove the AT-SPI path in a container: does headless Chromium expose AT-SPI at all,
  or is Xvfb required? Can we see the live-region and caret events CDP withholds?
- Compare, at layer 2, a pure append against a remove+insert in one commit — the
  behaviour this project's announcer design turns on.
- Build the scenario binding: assert event streams against expected sequences per
  user journey, rather than asserting on a static snapshot.
- Assess W3C ARIA-AT as prior art and as a source of expectation formats.

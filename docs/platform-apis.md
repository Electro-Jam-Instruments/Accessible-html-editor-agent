# Layer 4: what the platform APIs can carry that the web cannot express

Verified against primary sources and browser/AT source, 2026-08. This is the layer-4
column of [layered-gap-analysis.md](the-gap.md).

## The headline

> **Every user agent, on every platform, when asked to convey an author-authored
> announcement, calls the platform's typed notification API and hardcodes the type to
> "action completed". Core-AAM *mandates* this.**

Core-AAM § 4.1.1 writes `NotificationKind_ActionCompleted` into the spec as a literal
constant, and specifies `activityId` as the empty string. Chromium
(`browser_accessibility_manager_win.cc:248`) and Gecko
(`uiaRawElmProvider.cpp:306`) both comply.

**The typing channel exists, is plumbed end to end, and is deliberately not used.**

That reframes the ask. This is not "invent a way to type announcements". It is "stop
throwing away the type on the one platform that already has a field for it."

## Windows UIA — a two-axis model the web only uses one axis of

```cpp
HRESULT UiaRaiseNotificationEvent(provider, NotificationKind, NotificationProcessing,
                                  BSTR displayString, BSTR activityId);
```
Win10 1709+. `UIA_NotificationEventId` = 20035.

- **`NotificationKind`** — *what happened*: `ItemAdded`, `ItemRemoved`,
  `ActionCompleted`, `ActionAborted`, `Other`.
- **`NotificationProcessing`** — *how to pace it*: `ImportantAll`,
  `ImportantMostRecent`, `All`, `MostRecent`, `CurrentThenMostRecent`, and
  `ImportantCurrentThenMostRecent` (added in Windows build 26100 — six values, not five).
- **`activityId`** — "a unique non-localized string to identify an action or group of
  actions". A machine-readable correlation key, distinct from the human-readable string.

**ARIA's `aria-live` and `ariaNotify`'s `priority` only ever address the second axis.**
There is no web expression for the first, nor for the correlation key.

### The precedent that wins the argument

NVDA ignores `notificationKind` for presentation — but **NVDA's Word module maintains a
denylist of `activityId` strings** (`source/NVDAObjects/UIA/wordDocument.py`, e.g.
`"AccSN2"`) to suppress announcements such as "delete back word". And NVDA's native
coalescer keys on `{runtimeID, eventId, notificationKind, notificationProcessing,
activityId}`.

**ATs already discriminate on notification identity when they are given one, and are
reduced to guessing when they are not.** That is the sharpest single argument available
in a standards room.

## The autocorrect twin — real on two platforms, fired by nobody

`- ` → bullet is structurally identical to autocorrect: the application changed the
user's text without being asked. Both major platforms have a typed mechanism for it.

**Windows** — `UiaRaiseTextEditTextChangedEvent` with `TextEditChangeType`
(`None`, `AutoCorrect`, `Composition`, `CompositionFinalized`, `AutoComplete`), Win 8.1+.
`AutoCorrect` carries **the new corrected string as payload**.
- Chromium raises `_Composition` only (`ax_platform_node_win.cc:831`); `_AutoCorrect`
  and `_AutoComplete` are **never used**.
- **NVDA subscribes to neither TextEdit event.** `UIA_TextEditPatternId` appears only as
  an unused property getter.
- So the richest typed text-change channel Windows has is raised by nobody for the
  interesting cases and consumed by nobody. (JAWS: closed source, unverified.)

**macOS** — `NSAccessibilityAutocorrectionOccurredNotification`, **public in the macOS 26
SDK**.
- **WebKit fires it for real** (`Editor.cpp:3487`, in `markAndReplaceFor`).
- Chromium has the mapping but never fires it — `ax_enums.mojom` annotates
  `kAutocorrectionOccured = 4,  // Unknown: http://crbug.com/392498`. **Dead since 2014.**
- macOS additionally carries `AXTextEditType` (9 values including `Replace` and
  `AttributesChange`), `AXTextStateChangeType`, plus `AXTextSelectionDirection` and
  `AXTextSelectionGranularity` — a rich vocabulary with **no ARIA analogue whatsoever**.
  A delete+insert pair is posted as a two-element array in one notification, an explicit
  atomic-replacement representation.

**Linux** — none. WebKit's ATSPI backend collapses its 8-valued `AXTextEditType` to
three outcomes (`AXObjectCacheAtspi.cpp:168`): Cut and Delete become indistinguishable;
Typing, Dictation, Paste and Insert become indistinguishable. AT-SPI has no
`TextEditChangeType` equivalent. Only `object:text-attributes-changed` separates
formatting change from content change.

## UIA's TextPattern — containment may not need a notification at all

The notification event is the *shallowest* thing UIA offers. The deeper mechanism, and
the one with no equivalent on any other platform, is **TextPattern**: text ranges, text
runs, per-range attributes, selection ranges, and embedded objects inside the text
stream. It gives a **pull** model that complements the push model of events.

### Containment is expressible as a text attribute

`UIA_StyleIdAttributeId` (40034) on a range, Windows 8+ (verified against
[Style Identifiers](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-style-identifiers)):

| Constant | Value |
|---|---|
| `StyleId_Heading1` … `Heading9` | 70001–70009 |
| `StyleId_Title` / `Subtitle` / `Normal` / `Emphasis` | 70010 / 70011 / 70012 / 70013 |
| **`StyleId_Quote`** | **70014** |
| **`StyleId_BulletedList`** | **70015** (Win 8.1+) |
| **`StyleId_NumberedList`** | **70016** (Win 8.1+) |

Plus `UIA_BulletStyleAttributeId` (40002, a typed `BulletStyle` enum),
`UIA_IndentationLeadingAttributeId` (40011), `UIA_StyleNameAttributeId` (40033).

**So "the caret is inside a quotation" is directly expressible on Windows, as an
attribute of the text range — no announcement required.** A screen reader walking
`TextUnit_Format` runs reads attribute changes natively; that is precisely how it
announces structure when reading a document. Containment could therefore be conveyed by
*correct exposure* rather than by a synthesised sentence.

This reframes the containment problem on Windows from "we need a transition event" to
"is the attribute exposed correctly, and does the AT walk it in an editable region?"

**Open question worth answering with a real UIA inspector:** does Chromium map
`<blockquote>` → `StyleId_Quote`, and `<ul>`/`<ol>` → `StyleId_BulletedList` /
`StyleId_NumberedList`? Chromium implements ~21 text attributes including `StyleId` and
`BulletStyle` (`ax_platform_node_win.cc` ~L6132–6223), but which DOM constructs feed
them was not verified here.

### Embedded objects put containers *in* the text stream

Non-text objects appear in a container's text as **U+FFFC**, counting as one character
and one word unit. `ITextChildProvider` (`get_TextContainer` / `get_TextRange`) lets an
embedded object hand back its enclosing text provider and its own range;
`IUIAutomationTextRange::GetChildren` and `RangeFromChild` walk in and out.

That means a container boundary can be a **placeholder object in the text run** — so
crossing into a quoted reply is observable as traversing an embedded object, positionally
rather than by event. Combined with the caret events we verified on AT-SPI, this is the
richest structural model any platform offers for exactly the containment problem.

### `UIA_ChangesEventId` — an unused payload channel

`UiaRaiseChangesEvent(provider, eventIdCount, UiaChangeInfo*)`, Windows 10+, event id
20034. A generic batch channel carrying `{uiaId, payload (VARIANT), extraInfo}` — capable
of conveying structured change information, not just a string. **Chromium never raises
it.** Another wired-but-unused channel, and a candidate home for typed editing
transitions that do not fit the notification model.

### The consequence for the analysis

UIA is not one mechanism but a layered set:

| Model | Mechanism | Answers |
|---|---|---|
| **Pull / structural** | TextPattern attributes (`StyleId`, `BulletStyle`, indentation), embedded objects, `ITextChildProvider` | *What is true at this position?* |
| **Push / typed event** | `NotificationEvent` (kind × processing), `TextEdit_TextChanged` (`TextEditChangeType`), `StructureChanged`, `ChangesEvent` (payload) | *What just happened?* |

The web has a partial pull model (the a11y tree, which Chromium already maps into some
of these attributes) and **essentially no push model for transitions**. So the honest
per-row question is not always "what event is missing" — for containment on Windows it
may be "is the pull model exposed and consumed correctly?", which is a much cheaper fix.

**Do not scope any UIA proposal to the notification event alone.** The full surface —
TextPattern, embedded objects, Changes, TextEdit, StructureChanged — should be assessed
per row.

## Implementers keep working around the gap

Three independent workarounds, each an admission the untyped string is insufficient:

1. **WebKit invented four non-Core-AAM macOS userInfo keys** — including
   **`AXAnnouncementIsLiveRegionKey`**, whose sole job is to let VoiceOver tell an
   `ariaNotify` from a live region.
2. **Chromium repurposed UIA's `activityId`** — a field Core-AAM specifies as the empty
   string — to smuggle its experimental `type` through.
3. **NVDA filters Word announcements on `activityId`**, as above.

## Chromium already computes the answer and discards it

`AXEventGenerator` produces real typed transition events by diffing successive trees —
`HIERARCHICAL_LEVEL_CHANGED`, `POSITION_IN_SET_CHANGED`, `SET_SIZE_CHANGED`,
`TEXT_ATTRIBUTE_CHANGED`, `SUBTREE_CREATED` — and then **drops most of them on Mac and
Linux** because there is no platform event to carry them. Chromium fires
`UIA_LevelPropertyId` property-changed on Windows only.

The browser is not missing the information. The *platform mapping* is missing on two of
three OSes; the *web-facing expression* is missing on all three.

## The comparison table

Cells describe the mechanism for signalling **that the transition occurred** — not the
ability to read the resulting state.

| Information to convey | ARIA / web | UIA | AT-SPI2 | NSAccessibility |
|---|---|---|---|---|
| A list structure started | **none** (state only) | `StructureChangedEvent` + `ChildAdded`; `UIA_BulletStyleAttributeId` | `children-changed:add`; no bullet attr | children-changed; no discriminator |
| Indent / nesting level changed | **none** (`aria-level` is state) | property-changed on `UIA_LevelPropertyId` — **Chromium fires this** | **none** — Chromium drops it | **none** — Chromium drops it |
| **Programmatic text substitution** | **none** | **`TextEditChangeType_AutoCorrect`** + corrected string | none | **`AutocorrectionOccurredNotification`** + `AXTextEditType` |
| Formatting toggled at caret | **none** | IA2 `TEXT_ATTRIBUTE_CHANGED`; UIA has no such event | `object:text-attributes-changed` ✅ | `kAXTextEditTypeAttributesChange` (WebKit) |
| Caret crossed a link/object | derivable — **not a real gap** | `TextSelectionChanged` + U+FFFC + `ITextChildProvider` | `text-caret-moved` + `AtkHypertext` | `SelectedTextChanged` + AXTextMarkers |
| An item was added to a list | **none** | `ChildAdded` **and** `NotificationKind_ItemAdded` | `children-changed:add` | children-changed |
| Operation completed **vs failed** | `ariaNotify` — **untyped** | **`ActionCompleted` vs `ActionAborted`** — Core-AAM hardcodes Completed, so "failed" is **unreachable from the web** | politeness only | priority only |

## The three proposals, ranked

**1. A `kind` enum on `ariaNotify` — cheapest, nearly free, do this first.**
Even just `{completed, aborted, itemAdded, itemRemoved, other}`, deliberately isomorphic
to UIA. Costs: one IDL enum, one line in Core-AAM's UIA row replacing a hardcoded
constant with a mapped variable, and "ignore it" on the other platforms — which is not a
regression, it is exactly the status quo. Argue it from the NVDA-Word-`activityId`
precedent. It also establishes the principle that announcements can be typed.
Note the immediate win: **"operation failed" is currently unreachable from the web**,
because the spec hardcodes `ActionCompleted`.

**2. Level/structure transitions — the browser-side work is already done.**
Chromium computes `HIERARCHICAL_LEVEL_CHANGED` cross-platform and discards it on two
platforms. The ask is "give two platforms a place to put what the third already
receives, and give authors a way to assert it when the diff cannot infer it."

**3. A text-substitution signal — most valuable, hardest.**
Two-platform floor exists and the UIA variant carries the substituted text. Three
obstacles: both platform APIs are documented as scoped to *user-agent* correction (TSF
autocorrect, WebKit spellcheck), so repurposing them for author-initiated transformation
needs Microsoft and Apple to bless it; `UIA_TextEdit_TextChangedEventId` has **zero known
screen-reader consumers**, so shipping it means shipping into a void and needs AT
commitment first; and an author-facing API must name the substituted *range*, which drags
in `EditContext`/`beforeinput` rather than being a simple `Element` method.

## Corrections to prior assumptions in this repo

- `ariaNotify` is **in the ARIA spec** (`ARIANotifyMixin`), not WICG. Shipped: Chrome 141,
  Firefox 150, Safari 27. The **standardised** dictionary has **only `priority`** —
  `interrupt` ships in WebKit and behind a Chromium flag; `type` exists only behind
  Chromium's `AriaNotifyV2` flag.
- **GTK4 abandoned ATK** (`GtkAccessible` + `GtkATContext` talk to AT-SPI directly).
  **Chromium still uses ATK.** AccessKit is a third, separate path (AT-SPI via zbus,
  not ATK). So Linux is a three-way split, not one stack.
- `aria-relevant` is ARIA's only typed change vocabulary — and it is a *filter*, not a
  description, and it has **no Core-AAM platform mapping** at all.

## Backlog — full custom canvases

Noted for much later, not now. A fully custom-drawn editing surface (Google Docs, Figma,
a canvas-based editor) has **no DOM semantics at all**, so the entire accessibility
representation must be synthesised. **UIA's TextPattern is the only platform API rich
enough to express a synthesised document properly** — text runs with attributes, ranges,
selection ranges, and embedded objects for non-text content.

That makes the canvas case the *hardest* instance of everything above and the one where
the pull/structural model matters most, since there is no markup for a browser to derive
anything from. The owner has a separate partial project to link here when we reach it.

Sequencing: this comes after the DOM-based editor corpus is specified and measured.
Getting the contract right on HTML editors is a prerequisite — a canvas surface has to
satisfy the same contract with none of the free structure.

## Unverified — state as open in any standards discussion

1. JAWS's handling of `NotificationKind` / `NotificationProcessing` / `activityId`
   (closed source; no vendor documentation found).
2. JAWS's handling of `UIA_TextEdit_TextChangedEventId`.
3. Whether VoiceOver actually consumes `AXTextStateChangeType` / `AXTextEditType`
   (circumstantially very likely — the enums originate in Apple's private headers and
   Apple promoted the state-change key to the public SDK in macOS 26 — but not
   confirmable from primary sources).
4. Whether VoiceOver consumes `NSAccessibilityAutocorrectionOccurredNotification`.
5. Whether Narrator reads `NotificationKind`.
6. Exact `object:text-changed` D-Bus signature — `(offset, length, text)` is inferred
   from Chromium's ATK emission, not read from the interface XML.

# The rich-text editor landscape, and how widely Lexical is actually deployed

**Status: research, 2026-08-28.** External research to inform (a) which editor framework
this app should consider migrating to, and (b) which editor the accessibility
conformance suite (see [editor-contract.md](../contract/rationale.md),
[conformance-suite-design.md](../contract/invariants.md)) should target first.

**Method note on citations.** Every factual claim below is tagged with where it came
from:

- **[primary]** — an official docs page, the project's own GitHub repo, the npm
  registry API (`registry.npmjs.org` / `api.npmjs.org`, queried directly, not scraped),
  or a vendor's own marketing/compliance page (marked as such — vendors self-report).
- **[secondary]** — a blog post, comparison article, or aggregator (npmtrends,
  PkgPulse, Eddyter, etc.) repeating a figure I did not independently reproduce from a
  primary source.
- **[unverified]** — something I found only once, in a low-authority source, and could
  not corroborate. Treated as a lead, not a fact.
- All npm download and registry figures were pulled live from `registry.npmjs.org` /
  `api.npmjs.org` on **2026-08-28**, for the week of 2026-08-21 to 2026-08-27. GitHub
  star/fork/issue counts were read from each project's GitHub page on the same date and
  will drift.

---

## Bottom line

**Lexical is a safe, well-adopted choice, but on a specific and narrower basis than
its marketing implies.** Its adoption case rests almost entirely on Meta running it at
huge internal scale, not on broad third-party ecosystem adoption — third-party usage is
real (Payload CMS made it their default editor; a long tail of smaller products) but
thin compared to Tiptap/ProseMirror, which has the deeper and more diverse
production-user list, the larger community, and — critically for this project — an
actual "accessible" reputation that Lexical does not (see §4). Lexical is MIT-licensed,
actively released on a monthly cadence, and is the direct, maintainer-endorsed successor
to the now-archived Draft.js, so it is not a risky bet technically. It is a **plausible
first target for the conformance suite specifically because of Meta's deployment scale**
(hundreds of millions of daily users across Facebook, Messenger, WhatsApp Web,
Instagram, Workplace, and — per one independent report — Threads), which is a stronger
"real-world blast radius" argument than any adoption-count argument.

**The strongest alternative is Tiptap (built on ProseMirror).** It has the largest npm
download numbers of any editor here, the largest and most diverse named-customer list
(including, by its own account, Notion, GitLab, LinkedIn, Spotify, and — notably —
Anthropic/Claude), an MIT core, and no license entanglement risk. ProseMirror itself
(the engine underneath) is the most durable of the group — MIT, maintained by one
person for a decade, still shipping weekly — but its author moved the canonical repo off
GitHub in 2026, which quietly erodes GitHub-based popularity signals for it (see §1.3).

**On accessibility specifically, none of these projects has a strong public record.**
The most concrete finding of this whole research pass is a negative one: an official
Lexical GitHub Discussion titled "How accessible is Lexical?" asking for exactly this
kind of specificity got **zero replies** ([facebook/lexical#5398](https://github.com/facebook/lexical/discussions/5398)).
TinyMCE and CKEditor 5 are the only two with anything resembling a real accessibility
program (a VPAT, a named plugin, stated WCAG levels) — both are GPL/commercial dual
licensed, which rules them out for this MIT project. See §4 for the full breakdown,
including where I found nothing at all.

### Summary table

| Editor | License | Architecture | Adoption signal (2026-08-28) | Maintenance | Documented a11y posture |
|---|---|---|---|---|---|
| **Lexical** | MIT [primary](https://github.com/facebook/lexical) | contenteditable + own DOM reconciler over an immutable node-tree state; plugin/node model, React-first | `lexical` 5.0M dl/wk, `@lexical/react` 4.7M dl/wk [primary, npm registry]; 23.8k★ / 2.2k forks [primary, GitHub]; GitHub reports 26,779 dependent repos / 963 dependent packages [primary, GitHub dependency graph — likely an undercount, see §1] | Meta-backed, monthly releases (v0.43→v0.49 Apr–Jul 2026) [primary, GitHub releases] | "Emphasis on accessibility" in marketing copy [primary, lexical.dev]; no dedicated a11y guide, no VPAT; official "How accessible is Lexical?" discussion has 0 replies [primary] |
| **Tiptap** (ProseMirror-based) | MIT core; a few Pro extensions (comments/collab/AI) not MIT [primary, tiptap.dev] | headless, ProseMirror engine + extension API, framework-agnostic (React/Vue/vanilla) | `@tiptap/core` 18.4M dl/wk [primary, npm]; 38.2k★ / 3.1k forks [primary, GitHub]; vendor lists ~35 named customers incl. Notion, GitLab, LinkedIn, Spotify, PagerDuty, Anthropic/Claude [primary but self-reported, tiptap.dev] | Very active; 8,100+ commits, 100+ open PRs [primary, GitHub] | No dedicated a11y statement found; inherits whatever ProseMirror provides |
| **ProseMirror** | MIT [primary] | headless document-model/transform engine, no UI, no plugin marketplace — a toolkit, not an editor | `prosemirror-view` 19.6M dl/wk [primary, npm] — highest raw download count of any package here, largely *because* Tiptap and other tools depend on it; ~8.7k★ on the (now-secondary) GitHub mirror [primary] | Actively maintained by author Marijn Haverbeke, but **the canonical repo moved off GitHub to a self-hosted Forgejo instance in April 2026** [primary, code.haverbeke.berlin + ProseMirror discourse]; GitHub star/fork counts are now frozen artifacts, not a live signal | A 2023 community thread ("Enabling accessibility on ProseMirror") exists on the ProseMirror forum; no official a11y statement found |
| **Slate** | MIT [primary] | contenteditable + custom immutable document model; explicitly a toolkit for building your own editor, not a finished product | `slate` 3.2M dl/wk [primary, npm]; 31.7k★ / 3.3k forks [primary, GitHub] | Community/volunteer-run, no company backing; README states this explicitly; still in beta after 8+ years, 628 open issues vs. 22 open PRs [primary, GitHub] | Maintainers opened their own issue, "Let's make Slate accessible!" ([#2572](https://github.com/ianstormtaylor/slate/issues/2572)), describing the *only* a11y feature as a bare `role` prop, with no good way to apply ARIA inside composite widgets — an admission from the maintainers, not an outside critique |
| **Quill** | BSD-3-Clause [primary] | contenteditable, Delta (JSON op-based) document format, batteries-included toolbar | `quill` 8.0M dl/wk [primary, npm]; 47.3k★ / 3.7k forks [primary, GitHub] — most-starred editor in this set | "Actively maintained by Slab" per README, but the last npm publish of the current major (2.0.3) was **2024-11-30** [primary, npm registry] — no release in ~21 months as of 2026-08-28 | No official a11y documentation found. Frequently claimed (secondary sources only) to be used by Slack/LinkedIn/Figma/Zoom/Miro/Airtable — **could not verify this against any primary source**; treat as unverified |
| **CKEditor 5** | **Dual: GPL-2.0-or-later OR commercial** [primary, ckeditor.com] — GPL entanglement risk for an MIT project | contenteditable, plugin architecture, own document model | `ckeditor5` 1.0M dl/wk [primary, npm]; 10.5k★ / 3.7k forks [primary, GitHub] | Actively maintained, commercially backed (CKSource) | The **strongest documented a11y posture of the group**: claims WCAG 2.2 A/AA + Section 508, publishes a dated VPAT (v41.4.2, May 2024) [primary, ckeditor.com], ships a built-in "Accessibility help" dialog (Alt+0). Ruled out here purely on license. |
| **TinyMCE** | **Dual: GPL-2.0-or-later OR commercial** [primary, tiny.cloud/github] — same GPL problem | contenteditable, plugin architecture, iframe or inline modes | `tinymce` 1.2M dl/wk [primary, npm]; 16.3k★ / 2.3k forks [primary, GitHub] | Actively maintained, v8 current, commercially backed (Tiny Technologies) | Second-strongest documented a11y posture: WAI-ARIA compliance claims, a premium "Accessibility Checker" plugin for WCAG A/AA/AAA, explicit VoiceOver/JAWS/NVDA compatibility claims [primary, tiny.cloud docs]. Also ruled out on license. |
| **Draft.js** | MIT [primary] | contenteditable, flat block-list + entity-map model | 1.1M dl/wk [primary, npm] — still nontrivial legacy traffic; last npm publish **2020-08-17** | **Archived by Meta on 2023-02-06**, read-only, maintenance-only for critical security fixes; maintainers explicitly point users to Lexical as the successor [primary, GitHub archive banner] | Not evaluated — dead end, included only for context |

---

## 1. Lexical adoption — the core question

### 1.1 Named real-world users

**Meta's own properties, per Meta's own docs [primary]:** the Lexical docs site states
plainly that "at Meta, Lexical powers web text editing experiences for hundreds of
millions of users every day" across **Facebook, Workplace, Messenger, WhatsApp[ Web]
and Instagram** — https://lexical.dev/docs/intro. This is the strongest, most concrete
adoption claim available for Lexical anywhere, and it is a first-party statement from
the team that ships it, not a secondhand rumor.

A 2022 Hacker News thread with participation from Meta engineers corroborates the
Draft.js → Lexical replacement at Meta internally
(https://news.ycombinator.com/item?id=31022152) **[secondary but from people close to
the project]**.

One independent, non-official blog post (a developer building a browser extension)
separately reports encountering Lexical's contenteditable-protection behavior on
**Facebook, Instagram, WhatsApp, and Threads.net** while trying to inject text
programmatically (https://fernandocordeiro.substack.com/p/lexical-setbacks). This is
the only place I found **Threads** named as a Lexical surface — I could not corroborate
it against an official source, so treat "Threads uses Lexical" as **[unverified]**,
though plausible given Threads shares Instagram's web stack.

**Third parties, verified:**
- **Payload CMS** — Lexical is Payload's current default rich-text editor; the
  previous Slate-based editor is deprecated and scheduled for removal in Payload 4.0.
  Verified via Payload's own docs and the `@payloadcms/richtext-lexical` npm package
  (https://payloadcms.com/docs/rich-text/overview, https://www.npmjs.com/package/@payloadcms/richtext-lexical)
  **[primary]**. This is the single clearest non-Meta production adoption I could
  establish.
- A long tail of smaller commercial and open-source products (e.g., "Eddyter",
  "Luxe Edit") build directly on Lexical, per their own marketing — these are small
  products, not evidence of broad ecosystem pull, and I list them only for
  completeness **[secondary/low-confidence]**.

**What I could not establish:** any adoption of Lexical inside a top-100 GitHub
repository outside Meta's own org, or inside another large consumer product (Notion,
Slack, Discord, Linear, Coinbase, Vercel, Deel — none turned up in search). This is a
meaningful negative finding: Lexical's adoption story is "Meta runs it at massive
internal scale plus a modest, growing open-source tail," not "the industry converged on
it."

### 1.2 npm download figures

Pulled directly from the npm registry download-counts API on 2026-08-28, for the week
of 2026-08-21–2026-08-27 (`api.npmjs.org/downloads/point/last-week/<pkg>`) **[primary]**:

| Package | Downloads/week |
|---|---|
| `lexical` | 5,035,144 |
| `@lexical/react` | 4,740,203 |
| `@lexical/markdown` | 4,817,081 |
| `@tiptap/core` | 18,433,872 |
| `prosemirror-view` | 19,628,964 |
| `quill` | 8,048,832 |
| `slate` | 3,160,728 |
| `ckeditor5` | 1,017,368 |
| `tinymce` | 1,153,980 |
| `draft-js` | 1,143,180 |

Two things worth noting about these numbers:

1. **Lexical's own download count trails Tiptap and ProseMirror by roughly 4×**, and
   trails Quill by roughly 1.6×. Secondary sources (npmtrends, PkgPulse) reported
   figures in the same ballpark for `lexical`/`@lexical/react` (2.9M–4.1M/week, dated
   variously across mid-2026) — the live number I pulled is higher and more recent, but
   directionally consistent: Lexical is a solidly popular package, not the most
   popular.
2. `@lexical/markdown` (4.8M/week) tracking almost identically to `lexical` core
   (5.0M/week) is a useful confirmation that near-everyone who installs Lexical also
   installs its Markdown import/export plugin — relevant given this project's own
   markdown-centric editing model.

### 1.3 GitHub signals

From the `facebook/lexical` GitHub page, read 2026-08-28 **[primary]**:
- **23.8k stars, 2.2k forks**
- **297 open issues, 39 open PRs**
- MIT license, copyright Meta Platforms, Inc.
- GitHub's dependency graph reports **26,779 dependent repositories and 963 dependent
  packages**. Treat this as an approximate floor, not a precise count — GitHub's
  dependency graph only indexes public repos with a parseable manifest and is known to
  undercount; the "notable" dependents it surfaced on inspection were all small,
  low-star projects, not recognizable products.
- Release cadence is genuinely monthly and current: v0.43.0 (2026-04-09) through
  v0.49.0 (2026-07-30), roughly one release every 3–4 weeks, each described in
  changelogs as a "monthly release." This is a real, current, actively-maintained
  project, not a project coasting on Meta's name.

For comparison, read the same day **[primary, GitHub]**: Tiptap 38.2k★/3.1k forks;
Quill 47.3k★/3.7k forks (most-starred of the group); Slate 31.7k★/3.3k forks; Draft.js
22.6k★/2.6k forks (archived, frozen); TinyMCE 16.3k★/2.3k forks; ProseMirror ~8.7k★ on
its now-secondary GitHub mirror; CKEditor 5 10.5k★/3.7k forks. **Lexical's star count is
mid-pack** — ahead of CKEditor 5, TinyMCE, and ProseMirror's GitHub mirror, behind
Quill, Tiptap, Slate, and even the archived Draft.js.

A genuinely surprising finding: **ProseMirror's canonical repository moved off GitHub
entirely in April 2026.** The GitHub page now shows an archive banner ("This repository
was archived by the owner on Apr 7, 2026. It is now read-only") pointing to
`code.haverbeke.berlin/prosemirror/prosemirror`, a self-hosted Forgejo instance run by
author Marijn Haverbeke. This is confirmed on the ProseMirror discourse
(https://discuss.prosemirror.net/t/prosemirrors-migration-to-forgejo/8974) **[primary]**
and mirrored across the other ProseMirror sub-repos (prosemirror-state,
prosemirror-model, prosemirror-markdown, website). **Practical effect for this
research: ProseMirror's GitHub star count is now a frozen historical artifact, not a
live adoption signal** — the project is still very much maintained (weekly
`prosemirror-view` releases, most recent 2026-08-24), it just no longer accrues GitHub
stars. Anyone doing "GitHub stars" comparisons after April 2026 needs to know this or
they will systematically undercount ProseMirror's continuing relevance.

### 1.4 Top-repo adoption

I could not establish Lexical usage inside any well-known top-tier GitHub repository
outside Meta's own organization (`facebook/lexical`, `facebook/lexical-ios`). This is a
genuine absence, not just a search miss — I ran multiple targeted queries (company
names, "built with Lexical," GitHub topic pages) and the only unambiguous, independently
verifiable non-Meta production user found was Payload CMS (§1.1). Flag this as the
single most important caveat on Lexical's adoption story: **the "widely deployed" claim
is true and load-bearing for Meta's own apps, and thin everywhere else.**

---

## 2. The competitive field

(License, architecture, adoption, and maintenance are in the summary table above; this
section adds detail and direct citations not captured there.)

- **Draft.js → Lexical relationship.** Draft.js was archived by Meta on 2023-02-06
  (GitHub archive banner, confirmed live on the repo page, https://github.com/facebookarchive/draft-js)
  **[primary]**. The archive banner and maintainers explicitly recommend Lexical as the
  successor for new projects. Crucially, **Meta never shipped an official Draft.js →
  Lexical migration path** — the data models are structurally incompatible (Draft.js:
  flat block list + style ranges + entity map; Lexical: nested node tree) — and
  migration-guide issues have sat open since 2022 (per DEV Community write-ups and HN
  discussion, **[secondary]**). This matters for any org currently on Draft.js: "just
  move to Lexical" is not a mechanical upgrade.
- **CKEditor 5 license detail.** Open-source distribution is GPL-2.0-or-later; a
  commercial license is required to avoid GPL obligations (https://ckeditor.com/legal/ckeditor-licensing-options/,
  https://github.com/ckeditor/ckeditor5/blob/master/docs/getting-started/licensing/license-and-legal.md)
  **[primary]**. There is an active, unresolved-looking GitHub issue thread from users
  questioning how many CKEditor 5 integrators are unknowingly out of GPL compliance
  (`ckeditor/ckeditor5#14314`) — a sign the dual-license model is a live source of
  confusion, not just a checkbox. This alone rules CKEditor 5 out for an MIT project.
- **TinyMCE license detail.** TinyMCE was MIT through v5; **v6 changed the open-source
  track to GPL-2.0-or-later** (dual-licensed with commercial), confirmed via TinyMCE's
  own GitHub discussions (`tinymce/tinymce#9496`, `#9453`) and docs
  (https://www.tiny.cloud/docs/tinymce/latest/license-key/) **[primary]**. Same
  disqualifier as CKEditor 5.
- **Tiptap Pro boundary.** The core (`@tiptap/core` and the standard extensions) is
  MIT. Tiptap open-sourced 10 previously-paid "Pro" extensions under MIT in mid-2026;
  what remains paid is specifically the pieces that depend on Tiptap's own backend
  services — real-time collaboration, comments, document conversion, and AI features
  (https://tiptap.dev/blog/release-notes/were-open-sourcing-more-of-tiptap,
  https://news.ycombinator.com/item?id=44202103) **[primary/secondary mix]**. For a
  self-hosted, privacy-focused app like this one, that's a clean split: the editor core
  needed for WYSIWYG-with-markdown-shortcuts is unambiguously MIT.
- **Quill's stagnation signal.** README claims active maintenance by Slab, but the
  registry shows the current major version (2.0.3) has not been republished since
  **2024-11-30** — essentially no release in the ~21 months up to this research date
  **[primary, npm registry]**. Popularity (highest star count, second-highest download
  count of the group) is not the same as active development.
- **Slate's own maintainers on its accessibility gap** — see §4, this is one of the
  most useful pieces of evidence found in this whole pass.

---

## 3. Markdown-with-live-preview vs. WYSIWYG-with-markdown-shortcuts

The split-pane model (raw markdown left, rendered preview right) has **not** held its
ground as the default for consumer note-taking/knowledge products. The field has mostly
moved to WYSIWYG-with-markdown-shortcuts, with a few notable holdouts and one hybrid
pattern that's distinct from both:

| Product | Model | Evidence |
|---|---|---|
| **Notion** | WYSIWYG with markdown-shortcut triggers (type `**text**` and it bolds live, type `- ` and it becomes a real list block) | Notion's own help docs describe formatting applying immediately as you type the markdown characters — https://thomasjfrank.com/a-guide-to-editing-and-formatting-text-in-notion-notion-fundamentals/ **[secondary but describes documented product behavior]** |
| **Obsidian** | Hybrid: default editor is CodeMirror-based plain markdown, but "Live Preview" mode (now the default in current Obsidian) hides markdown syntax tokens once the cursor leaves them — WYSIWYG-*like* editing over a plain-text CodeMirror buffer, not a separate rendered pane | Obsidian's Live Preview upgraded the desktop editor to CodeMirror 6 and is built partly on the open-source HyperMD project — https://forum.obsidian.md/t/how-to-configure-codemirror-to-work-like-live-preview/43047 **[secondary, describes documented product behavior]** |
| **Bear** | Hybrid live editor: markdown syntax and rendered formatting are shown simultaneously in one pane (not split, not fully hidden) | Bear's own product description and the developers' newer app Lettera continue this "syntax visible, but styled live" model — https://blog.bear.app/2026/06/introducing-lettera-a-native-markdown-editor-for-mac-now-in-beta/ **[primary, vendor blog]** |
| **Craft** | WYSIWYG-first, block-based; markdown is treated as an import/export/interop format, not the primary editing substrate | Secondary sources describe Craft's editing model as block/WYSIWYG with Markdown support layered on — could not find Craft's own detailed technical description **[secondary, moderate confidence]** |
| **Logseq** | Still fundamentally markdown/outliner-first; explicitly **does not** default to WYSIWYG — there is an open, unresolved community feature request for a WYSIWYG editing mode | https://discuss.logseq.com/t/wysiwyg-editing-mode/2216 **[primary, Logseq's own forum]** — this is the clearest surviving "raw markdown first" holdout in the set |
| **Google NotebookLM** | Basic rich text (bold/italic, headings, bullets) in its Notes feature — not a raw-markdown-with-preview split pane; formatting appears to apply directly, closer to lightweight WYSIWYG | Secondary write-ups describing the Notes UI; I could not find Google's own technical documentation of the notes editor's internals **[secondary, low-to-moderate confidence]** |
| **Slite** | Reported to be modernizing its editor technology around 2025, but I could not verify which framework it landed on (Tiptap/ProseMirror is a plausible guess given industry direction, but unconfirmed) | **[unverified]** — flagging rather than guessing |
| **Coda** | Could not find any credible technical description of Coda's editor internals in this pass | **[not established]** |

**Takeaway for this project's decision:** the split-pane raw-markdown/preview model
this app currently uses (`frontend/src/components/ui/markdown-editor.tsx`, a
textarea + `react-markdown`-based renderer, confirmed by reading `frontend/package.json`
and the component tree) is a legitimate, still-viable *transitional* pattern (Logseq
proves it's not extinct), but it is not where the category has converged. The
mainstream direction for knowledge-management products is WYSIWYG-with-markdown-
shortcuts (Notion) or a hybrid live-render-over-plaintext model (Obsidian, Bear) — both
of which are exactly the territory Lexical, Tiptap, and similar contenteditable-based
frameworks are built for, and exactly the territory a raw `<textarea>` cannot reach on
its own. That's a real point in favor of migrating; it does not by itself decide *which*
framework.

---

## 4. Accessibility reputation — the section this whole report exists for

This is where the field is weakest, and where the differences between projects are
sharpest.

**What has a real, documented program:**
- **CKEditor 5** — publishes a dated VPAT (v41.4.2, 2024-05-17), claims WCAG 2.2 A/AA +
  Section 508 conformance, ships a built-in "Accessibility help" dialog (Alt+0
  keystroke) listing available shortcuts, and documents a recommended screen-
  reader/browser pairing (NVDA+Chrome on Windows, VoiceOver+Safari on macOS)
  (https://ckeditor.com/docs/ckeditor5/latest/features/accessibility.html,
  https://ckeditor.com/ckeditor-5/capabilities/compliance-features/) **[primary,
  vendor-published — not independently audited by us]**.
- **TinyMCE** — claims WAI-ARIA conformance, compatibility with JAWS/NVDA/VoiceOver,
  and sells a dedicated "Accessibility Checker" premium plugin claiming to exceed WCAG
  A/AA/AAA with auto-repair (https://www.tiny.cloud/docs/tinymce/latest/tinymce-and-screenreaders/,
  https://www.tiny.cloud/tinymce/features/accessibility-checker/) **[primary,
  vendor-published]**. Note the actual accessibility-*checking* plugin is a paid add-on,
  not the free/GPL tier.

Both of the above are ruled out here purely on license (§2), which is itself worth
naming explicitly: **the two editors with the most mature public accessibility
programs in this entire survey are the two we cannot use without GPL entanglement.**
That tension is real and worth stating plainly in whatever decision doc follows this
one.

**What has essentially nothing — and this is the strongest evidence for the
project's whole thesis:**
- **Lexical**: markets itself with "reliability, accessibility, and performance" as a
  three-word tagline on its own homepage/docs (https://lexical.dev/docs/intro)
  **[primary]**, but there is no dedicated accessibility guide, no VPAT, no stated WCAG
  conformance level anywhere I could find. The single most telling artifact: an official
  GitHub Discussion on the `facebook/lexical` repo, opened by a user explicitly asking
  which WCAG standards are met, what screen-reader compatibility actually means in
  practice, and whether there's a roadmap — titled **"How accessible is Lexical?"**
  (https://github.com/facebook/lexical/discussions/5398) — **has zero replies**, from
  either maintainers or the community, as of this research date **[primary]**. Closed
  GitHub issues do show some real accessibility engineering activity over time — a
  keyboard-shortcut feature request (`#6734`), an HR-navigation screen-reader
  announcement bug (`#8025`), and a keyboard-accessibility bug (`#1923`) were all
  eventually fixed and closed — so the team is not indifferent to accessibility bug
  reports when filed with enough specificity. But there is no proactive, published
  statement of what Lexical does or doesn't guarantee, which is exactly the gap this
  project's conformance suite is built to expose and fill.
- **ProseMirror / Tiptap**: no official accessibility statement found for either. A
  single 2023 community thread, "Enabling accessibility on prosemirror," exists on the
  ProseMirror discourse (https://discuss.prosemirror.net/t/enabling-accessibility-on-prosemirror/3147)
  but I did not find a resolution or an official position referenced from it.
- **Slate**: the most candid admission in the entire survey, and it comes from the
  maintainers themselves. Issue **"Let's make Slate accessible!"**
  (https://github.com/ianstormtaylor/slate/issues/2572) describes the *only* existing
  accessibility feature as a bare `role` prop on the contenteditable root, and states
  plainly that when Slate is embedded inside a larger composite widget (combobox,
  autocomplete, dropdown), "there isn't a good way to apply ARIA tags to the
  contentEditable element" **[primary — maintainer-authored issue on the official
  repo]**. This is the single most explicit public statement by any of these projects
  that their accessibility story has a structural hole, not just missing polish.
- **Quill, Draft.js**: no official accessibility documentation found for either. Not
  evaluated further given Draft.js is archived and Quill's stagnant release cadence
  makes it a poor migration target regardless.

**The absence itself is the finding.** Across seven actively-relevant frameworks
(Lexical, Tiptap, ProseMirror, Slate, Quill, plus the two GPL options), only the two
GPL-licensed, commercially-backed products have anything resembling an audited,
published accessibility posture. Every MIT-licensed option in this set — which is the
entire set this project could actually adopt — has either no public accessibility
documentation at all, or (Slate) an explicit maintainer admission of a structural gap.
That is the gap the conformance suite in this repo is positioned to fill, and it's also
the strongest argument for treating "screen-reader behavior" as something this project
needs to verify itself rather than take on faith from any vendor's marketing copy —
Lexical's included.

---

## Appendix: raw data pulls (for reproducibility)

npm registry, queried 2026-08-28 (`registry.npmjs.org/<pkg>`):

| Package | Latest version | Last published | License (as declared in package.json) |
|---|---|---|---|
| lexical | 0.49.0 | 2026-07-30 | MIT |
| @lexical/react | 0.49.0 | 2026-07-30 | MIT |
| prosemirror-view | 1.42.3 | 2026-08-24 | MIT |
| @tiptap/core | 3.30.5 | 2026-08-26 | MIT |
| slate | 0.126.2 | 2026-08-08 | MIT |
| quill | 2.0.3 | 2024-11-30 | BSD-3-Clause |
| ckeditor5 | 48.4.0 | 2026-08-05 | "SEE LICENSE IN LICENSE.md" (GPL-2.0-or-later / commercial) |
| tinymce | 8.8.2 | 2026-07-27 | "SEE LICENSE IN license.md" (GPL-2.0-or-later / commercial) |
| draft-js | 0.11.7 | 2020-08-17 | MIT |

npm weekly downloads, queried 2026-08-28 (`api.npmjs.org/downloads/point/last-week/<pkg>`,
window 2026-08-21 to 2026-08-27): see §1.2 table above.

GitHub star/fork/issue counts: read from each repo's GitHub page on 2026-08-28 via
direct page fetch; see §1.3 and the summary table for values and per-repo notes.

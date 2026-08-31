# Subject: lexical-pr9070 — the facebook/lexical #9070 branch

**This subject tracks an UNMERGED pull request and is NOT part of the standing
corpus.** It exists for one measurement (MASTER-PLAN §7 W3, C-branch): run the
`blockquote` contract against the branch that adds `QuoteAnnounceExtension` and
produce the fail-on-main / pass-on-branch evidence. Its results are never
written to `harness/results.json`, its HTML output is gitignored, and it is not
registered in `run.mjs`.

- **PR:** facebook/lexical#9070 — adds `QuoteAnnounceExtension` to
  `@lexical/rich-text`
- **Measured commit:** `7737554bbc0bfc81d3b6ec3f46b2fa480ab86f0f`
  (PR head at measurement time, 2026-08-30; a merge of the PR's
  `a11y-quote-announce` work with then-current `main`)
- **Result:** [EVIDENCE-NOTE.md](EVIDENCE-NOTE.md)

## Why one variant, not two

`subjects/lexical-next/` builds two variants because
`HistoryAnnounceExtension` is opt-in. On this branch `QuoteAnnounceExtension`
is **not** opt-in: it is a default dependency of `RichTextExtension`
(`packages/lexical-rich-text/src/LexicalRichTextExtension.ts:118`), exactly
like `HeadingAnnounceExtension`. The strict-defaults configuration therefore
already contains it, and an "opted-in" variant would be identical for this
contract. The extension config mirrors `lexical-next`'s strict-defaults
variant: `buildEditorFromExtensions` with `RichTextExtension` +
`ListExtension` + `CodeExtension` + `LinkExtension` (the latter two only
because the markdown `TRANSFORMERS` set requires their nodes) + markdown
shortcuts, nothing else.

## Reproduction

```sh
# 1. Checkout at the PR head
git clone https://github.com/facebook/lexical <checkout>
cd <checkout>
git fetch origin pull/9070/head:pr9070 --depth 50
git checkout pr9070            # was 7737554bbc0 when measured

# 2. Build its packages (the dev build is sufficient)
pnpm install && pnpm run build

# 3. Build this subject (resolves every lexical package from the
#    checkout's built packages/<pkg>/dist via esbuild --alias)
cd docs/7-DEVELOPMENT/a11y/harness/subjects/lexical-pr9070
npm install
LEXICAL_CHECKOUT=<checkout> node build.mjs

# 4. Run the blockquote contract without touching the standing runner:
#    copy run.mjs to run-pr9070.mjs (gitignored), add
#      { id: 'lexical-pr9070', kind: 'rich',
#        file: 'subjects/lexical-pr9070.html', optional: true },
#    to its SUBJECTS list, then:
cd ../..
node run-pr9070.mjs --contract=blockquote --out=/tmp/pr9070-blockquote.json --allow-failures
```

A rebuild against a later PR head is a **new measurement**: re-record the
commit hash and re-run twice (byte-identical output apart from `generatedAt`
required) before citing any number.

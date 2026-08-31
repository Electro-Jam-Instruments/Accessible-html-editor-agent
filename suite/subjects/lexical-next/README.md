# Subjects: Lexical extension API (nightly) — `lexical-next` and `lexical-next-max`

One build script, two subjects, deliberately kept apart:

- `lexical-next` — the strict defaults of `buildEditorFromExtensions` with
  RichTextExtension + ListExtension: what arrives without asking.
- `lexical-next-max` — the same build with every reachable announcer opted in:
  the informed ceiling. The gap between the two is what an integrator has to
  know to ask for.

The full rationale is in the header of [build.mjs](build.mjs).

## Build

```sh
npm install && node build.mjs   # writes ../lexical-next.html and ../lexical-next-max.html (gitignored)
```

Outputs bundle Lexical and are never committed (third-party code). `node_modules/`
and the lockfile are gitignored too.

## Pin policy

`package.json` pins **exact versions, no ranges** — every Lexical package at the
nightly `0.49.1-nightly.20260828.0` that carries the accessibility-by-default work,
and `esbuild` exact because it shapes the bundle. Every number in the corpus is
measured against these pins; nightly drift is a standing risk (MASTER-PLAN §8).
**Bumping a pin is a reviewed commit**: change the pin, rebuild, re-run the harness,
and re-accept both baselines
(`node ../../run.mjs --check --subject=lexical-next --accept`, then the same for
`lexical-next-max`) in the same change — never as a side effect. CI gates both
subjects against [`../../baselines/`](../../baselines/).

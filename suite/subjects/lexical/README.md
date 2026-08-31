# Subject: stock Lexical (React getting-started)

The documented Lexical React integration — `LexicalComposer` + RichTextPlugin +
HistoryPlugin + ListPlugin + MarkdownShortcutPlugin, nothing from `@lexical/a11y` —
because that is what the getting-started path wires up and what most applications
ship. The full rationale is in the header of [build.mjs](build.mjs).

## Build

```sh
npm install && node build.mjs   # writes ../lexical-stock.html (gitignored)
```

The output bundles Lexical + React and is never committed (third-party code).
`node_modules/` and the lockfile are gitignored too.

## Pin policy

`package.json` pins **exact versions, no ranges** (`lexical` and every `@lexical/*`
at `0.49.0`; `react`/`react-dom`/`esbuild` exact too, since they shape the bundle).
Every number in the corpus is measured against these pins. **Bumping a pin is a
reviewed commit**: change the pin, rebuild, re-run the harness, and re-accept the
baseline (`node ../../run.mjs --check --subject=lexical-stock --accept`) in the same
change — never as a side effect. CI gates this subject against
[`../../baselines/lexical-stock.json`](../../baselines/lexical-stock.json).

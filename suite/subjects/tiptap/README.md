# Subject: stock Tiptap StarterKit

Built **2026-08-30**. Pinned exactly (no ranges):

| Package | Version |
|---|---|
| `@tiptap/core` | 3.30.5 |
| `@tiptap/starter-kit` | 3.30.5 |
| `@tiptap/pm` | 3.30.5 |

These are the same pins the inventory ([../../../scenarios/tiptap.md](../../../corpus/inventories/tiptap.md))
was read from, on the same date. Per `editor-landscape.md`, ProseMirror's canonical
repository left GitHub in 2026-04 — everything here is pinned by npm version only.

**Pin policy:** `package.json` pins exact versions, no ranges (`esbuild` too — it
shapes the bundle). **Bumping a pin is a reviewed commit**: change the pin, rebuild,
re-run the harness, and re-accept the baseline
(`node ../../run.mjs --check --subject=tiptap --accept`) in the same change — never
as a side effect. CI gates this subject against
[`../../baselines/tiptap.json`](../../baselines/tiptap.json).

## What this subject is

The exact configuration from Tiptap's getting-started guide:

```js
new Editor({ element, extensions: [StarterKit] })
```

Nothing added, nothing configured. In particular **no `aria-label`** and no
`editorProps.attributes`: the nameless `role="textbox"` root (no `aria-multiline`,
no accessible name) is the inventory finding TT-B2-047, and the subject must ship
exactly what stock renders so the harness measures the truth.

## Build

```sh
npm install && node build.mjs   # writes ../tiptap.html (~830 KB, gitignored)
```

The output bundles Tiptap + ProseMirror and is never committed (third-party code;
same rule as every other generated subject). `node_modules/` and the lockfile are
gitignored too.

## Measurement

Results and prediction-vs-measured notes: [MEASUREMENT.md](MEASUREMENT.md).

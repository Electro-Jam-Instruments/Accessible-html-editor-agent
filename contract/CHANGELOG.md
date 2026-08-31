# Contract changelog

Every change to an invariant, a clause, or the announcement vocabulary is recorded here,
with what it changes for existing scores. See [CONTRIBUTING.md](../CONTRIBUTING.md)
§Versioning duty.

## contract-v1 — 2026-08-31

Initial published state, extracted from the development fork
([Open-notebook-a11y](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y)):

- ~20 invariant predicates ([`suite/invariants.mjs`](../suite/invariants.mjs)):
  C-family containment/announcement, A-family, T-family, comparative entry-parity, and
  the `preconditionNotReached` discipline.
- Announcement vocabulary v1 ([`suite/vocabulary.mjs`](../suite/vocabulary.mjs)) —
  semantic tokens with accepted surface forms, English only so far.
- 8 contract modules ([`suite/contracts/`](../suite/contracts)): bulleted-list, list,
  heading, blockquote, codeblock, history, entry-parity, checklist — 24 operations.

# Why the summary is shaped the way it is

**The summary itself is [the repository README](../README.md).** It lives there, and
only there, so that whoever reads this work reads the same document — a reviewer, someone
arriving from a link, and someone who just cloned the repo all get one text.

This file is the editorial reasoning behind it. It deliberately contains **no prose from
the summary**; if you find yourself copying a sentence here, delete it and link instead.

## The spine

Intro (it doesn't work) → the problem → **how AI can help** → where the platform must
change → what we're not claiming → Q&A.

Revision 1 was Amazon-shaped: argument → evidence → objections. Revision 2 kept the
stopping point and the Q&A but inserted **How AI can help** as its own part, between the
problem and the platform gaps.

The reason: for this audience the differentiated claim is not "editors are inaccessible" —
they suspect that already. It is that **the problem is now tractable in a way it was not
before**, and that we have demonstrated the tractability rather than proposing it. Burying
that in a methodology appendix would waste the strongest material in the document.

**Audience:** technically strong people who know their editing surface has accessibility
problems but have not dug into this layer. **Not a standards committee.** Part IV is
therefore kept much shorter than Part III, and the deep version stays in
[`platform-api-mapping.md`](platform-apis.md).

## Load-bearing choices

**Vocabulary: "unify", never "standardise".** That word imports a decade of W3C process
into a sentence that should not carry it. The tenets are **efficient, predictable, clear**
— the plain-language form of *efficient, habituating, understandable*.

**Part I paragraph 2 is the load-bearing paragraph.** An earlier draft treated silence as
the problem. It is not; it is the *symptom*. The problem is that these surfaces are
unpredictable, both across editors and within a single one. That yields the argument for
the whole project — *clarity can be fixed by one editor alone, predictability can only be
fixed together* — which is precisely why this is a shared body of work rather than three
bug reports.

**Naming the editors is deliberate.** The finding is that *good* editors fail. Anonymising
loses that, and it would read as an attack rather than an observation. For the same reason
the headline number is CKEditor's — the **best** performer. That framing must never be
softened; it is what stops a reader dismissing this as a cherry-picked bad product.

**One divergence example is enough.** The audience knows the space; the point is *that*
they disagree, not how many ways.

**The twelve-line CKEditor fact does three jobs at once**: it proves the fix shape is real,
proves it is cheap, and proves that even a team doing it right does not generalise it. All
three implications should survive any edit.

**The pseudo-code stays, with the line count immediately after.** On its own it risks
reading as a toy to anyone who knows what selection handling really costs; the CKEditor
line count is the reality check that earns it.

**Part V is not hedging, it is the strongest section.** An expert reader is already
composing the attack; the fastest way to be trusted is to have written it down first. The
one that will land hardest — *the percentages are source-read, not measured* — is stated in
the summary in those words, and closing it is task P0.4.

## Deliberately not claimed

That agents can write the fixes unsupervised, and that any of this replaces testing with
real users. Both would be easy to overreach on and would undermine everything else.

## Still open

Whether Part I's fourth paragraph earns its place, or whether four paragraphs is one too
many for an opening. Current view: it earns it, because without detection the proposal is a
cleanup that decays, and *new features work by default* is the part that makes this worth
an organisation's time.

import re, collections

def cells(line):
    """Split a markdown row on unescaped pipes. Notes contain `\\|` (e.g. a TypeScript
    union written inline), and splitting naively shifts every column after it."""
    return [c.strip() for c in re.split(r'(?<!\\)\|', line.strip().strip('|'))]

src = open('canonical.md').read()
# ---------------------------------------------------------------------------
# Two sources of truth, deliberately distinguished.
#
# MEASURED comes from the harness: a suite results file carries a verdict per
# canonical scenario per subject, derived from the contract's MUST assertions.
# Nobody types these, so they cannot drift from what the browser actually did.
#
# CLAIMED is the hand-maintained list: scenarios fixed in the app that no
# contract clause covers yet. They are real fixes with unit tests behind them,
# but they are asserted by us rather than measured, and the walk-through says so
# rather than letting them look equally proven.
# ---------------------------------------------------------------------------
import json, os, sys

# MIGRATION.md §3: both are parameters so the corpus can live in a different
# repository from any one editor's results. Defaults preserve today's behaviour.
#   generate-scenarios.py [--results=path]... [--subject=id]
HARNESS_SUBJECT = 'open-notebook-fixed'
RESULTS = [os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        '..', 'suite', 'examples', 'report-2026-08.json')]
_cli_results = [a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--results=')]
if _cli_results: RESULTS = _cli_results
for a in sys.argv[1:]:
    if a.startswith('--subject='): HARNESS_SUBJECT = a.split('=',1)[1]

def load_measured():
    merged = {}
    for path in RESULTS:
        try:
            with open(path) as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            continue
        for sid, by in (data.get('scenarios') or {}).items():
            if HARNESS_SUBJECT in by:
                # Later files win on conflict; a real conflict between two
                # results files for the same subject is itself worth noticing.
                merged[sid] = bool(by.get(HARNESS_SUBJECT))
    return merged

MEASURED = load_measured()
CLAIMED = {'CAN-CB-046','CAN-CB-052','CAN-CB-053','CAN-B1-029'}
FIXED = CLAIMED | {sid for sid, ok in MEASURED.items() if ok}
# Partly closed: some of the source rows behind the canonical row are fixed, others are not.
PARTIAL = {'CAN-B2-025': 'InlineEdit and the chat composer fixed; the MDEditor toolbar '
                         'disabling in preview mode (ON-B2-043) is not'}

rows=[]; cur=None
for line in src.splitlines():
    m=re.match(r'^## (CB|B1|B2|B3) ', line)
    if m: cur=m.group(1)
    if not line.startswith('| <a id="can-'): continue
    c=cells(line)
    cid=re.search(r'`(CAN-[A-Z0-9-]+)`',c[0]).group(1)
    if cur=='CB':
        r=dict(id=cid,bucket=cur,container=c[1],vector=c[2],title=c[3],intent=c[4],
               needs=c[5],on=c[9],lex=c[11],cke=c[13])
    else:
        r=dict(id=cid,bucket=cur,container='',vector='',title=c[1],intent=c[2],
               needs=c[3],on=c[7],lex=c[9],cke=c[11])
    rows.append(r)

CONT={'list':'Lists','orderedlist':'Lists','tasklist':'Lists','blockquote':'Blockquotes',
 'codeblock':'Code blocks','heading':'Headings','table':'Tables','cell':'Tables',
 'caption':'Tables','column':'Tables','collapsible':'Collapsible and callout sections',
 'callout':'Collapsible and callout sections','region':'Collapsible and callout sections',
 'isolated':'Collapsible and callout sections','slot':'Collapsible and callout sections',
 'footnote':'Footnotes','embed':'Images, media and embeds','any':'Any container',
 'blockquote+list':'Containers inside containers','codeblock+list':'Containers inside containers'}

SEL=('undo','redo','paste','cut or delete','select all','shift+arrow','find','replace',
     'the caret lands','collapsed caret is silently expanded','mixed selection','enter versus shift')
ENTEREXIT=('leaving the editing surface','entering an inline edit','toolbar','mode changes',
     'switching view mode','disabled mid-edit','editor is created or restarted','fullscreen',
     'leaves the application')
STATUS=('save or commit succeeded','save failed','edit was discarded','streaming assistant',
     'word/character count','command that did nothing','command rewrites a large span')

def ctype(r):
    if r['container']:
        return CONT.get(r['container'].lower(), r['container'].title())
    t=r['title'].lower()
    if r['bucket']=='B3': return 'Menus, autocomplete and suggestions'
    for kw,name in [('table','Tables'),('$...$','Math'),('math','Math'),
        ('url','Links'),('link','Links'),('[foo]','Links'),('mention','Links'),
        ('image','Images, media and embeds'),('embedded object','Images, media and embeds'),
        ('media embed','Images, media and embeds'),('heading','Headings'),
        ('code','Code blocks'),('quote','Blockquotes'),('list','Lists'),
        ('task','Lists'),('checkbox','Lists'),('glyph','Text formatting'),
        ('rule, page break','Images, media and embeds')]:
        if kw in t: return name
    if any(k in t for k in ('bold','italic','strike','underline','superscript','subscript',
        'highlight','font','colour','color','named style','alignment','another language',
        'same shortcut applies')): return 'Text formatting'
    if any(k in t for k in SEL): return 'Selection, caret, undo and paste'
    if any(k in t for k in ENTEREXIT): return 'Getting into and out of the editor'
    if any(k in t for k in STATUS): return 'Saving, status and errors'
    return 'The document as a whole'

PH=['Getting in','Working inside','Getting out']
def phase(r):
    if r['bucket']=='B1': return 'The editor changes your text as you type'
    if r['bucket']=='B2': return 'When you ask for a change'
    if r['bucket']=='B3': return 'Menus'
    v=r['vector']
    return 'Getting in' if v.startswith('E') else 'Getting out' if v.startswith('X') else 'Working inside'
PHASE_ORDER=PH+['The editor changes your text as you type','When you ask for a change','Menus']

def sym(v,cid=None,me=False):
    v=v.strip()
    if me and MEASURED.get(cid): return '✅ **measured**'
    if me and cid in MEASURED: return '⬜ measured, not conveyed'
    if me and cid in FIXED: return '🔧 fixed'
    if me and cid in PARTIAL: return '🔧 part'
    if v.startswith('announced'): return '✅ heard'
    if v.startswith('structural'): return '❌ broken'
    if v.startswith('n/a'): return '– n/a'
    return '⬜ silent'

groups=collections.OrderedDict()
for r in rows: groups.setdefault(ctype(r),[]).append(r)
ORDER=['Lists','Blockquotes','Code blocks','Headings','Tables','Text formatting','Links',
 'Images, media and embeds','Math','Footnotes','Collapsible and callout sections',
 'Containers inside containers','Any container','Menus, autocomplete and suggestions',
 'Selection, caret, undo and paste','Getting into and out of the editor',
 'Saving, status and errors','The document as a whole']
names=[g for g in ORDER if g in groups]+[g for g in groups if g not in ORDER]

def anchor(s): return s.lower().replace(' ','-').replace(',','').replace('+','')

o=[];W=o.append
W("# The scenarios, in plain language\n")
W("""**Every distinct thing a person can do in an editor, grouped by the kind of content they
are doing it to.** 218 scenarios, merged from three editors, named the way a user would
name them.

This is the walk-through version of [`canonical.md`](canonical.md) — the same rows and the
same ids, with the analytical columns stripped out. Read this one to *talk through* the
problem; read that one to argue about it.\n""")
W("""## How to read it

Each row is one thing a user did, and what they should hear at the moment they do it. Then
what each of the three editors actually does today.

| | Meaning |
|---|---|
| ✅ heard | The user is told, at the moment it happens |
| ⬜ silent | The editor does this correctly and says nothing about it |
| ❌ broken | The result carries no real structure — **no announcement can repair it** |
| – n/a | The editor does not have this feature. Not a failure. |
| ✅ **measured** | Fixed **and proven by the harness** in a real browser — the strongest claim here |
| ⬜ measured, not conveyed | The harness ran this scenario against our editor and the information does not (fully) reach the user — silence, or an announcement judged insufficient by the contract |
| 🔧 fixed | Fixed in the app with unit tests, but no contract clause measures it yet |
| 🔧 part | Partly fixed — some of the ways this happens are closed, others are not; the row says which |

**`– n/a` is not `⬜ silent`.** An editor with fewer features is not a more accessible one,
and conflating the two would invert the whole comparison.

The checkboxes are the plan. A scenario is ticked when a screen-reader user can complete it
in Open Notebook — we work down the list content type by content type, and the tick is the
same claim the conformance suite makes automatically.\n""")
W("""## What is ticked so far

The rows below are the worked example: each was found by reading source, is named in the
corpus, and is fixed in code and tested. One earlier tick (CAN-CB-044) was **withdrawn**
when a stricter contract measured the scenario and judged its announcement insufficient —
the loop taking a green mark back is the loop working.
The full write-up is [`worked-example.md`](https://github.com/Electro-Jam-Instruments/Open-notebook-a11y/blob/claude/clone-open-notebook-hl79xs/docs/7-DEVELOPMENT/a11y/worked-example.md).

| Scenario | What changed |
|---|---|
| [Enter at the end of an item creates the next item](canonical.md#can-cb-044) | The library already inserted the next marker silently. It is now announced - "new list item", or "new task, not checked" - **but the tick was withdrawn**: for an ordered list the announcement gives the number without naming the construct, and the stricter list contract judged that insufficient. |
| [Enter on an empty item leaves the list](canonical.md#can-cb-046) | There was **no way out**: Enter on `- ` produced `- ` forever. An empty item now removes the marker and announces "list ended". |
| [Tab nests the list item one level deeper](canonical.md#can-cb-052) | **The keystroke changed.** Tab used to insert spaces and never move focus, trapping keyboard users inside a modal (WCAG 2.1.2). Tab now leaves the field; indenting moved to `Ctrl+]` and is announced. |
| [Shift+Tab outdents the list item](canonical.md#can-cb-053) | The same trap in reverse, and it was worse than the catalogue recorded - the trap is two-way, so the modal had no keyboard exit at all. Outdenting moved to `Ctrl+[`. |
| [The document appears more than once in the accessibility tree](canonical.md#can-b1-029) | The syntax-highlight overlay is a full second copy of the note, rewritten on every keystroke and hidden from nobody. Now `aria-hidden`, so the note is read once rather than three times. |
| [A focused control is disabled mid-edit](canonical.md#can-b2-025) | **Partly.** `disabled` became `readOnly` + `aria-busy` in the inline title editor and the chat composer, so focus survives a save. The editor toolbar greying out in preview mode is still unfixed. |

The keystroke change in rows 3 and 4 is a real trade: Tab no longer does what a sighted
user's muscle memory expects. It is the right trade - a two-way keyboard trap in a modal is
a hard failure, and the shortcut is announced in the field's help text - but it is a trade,
and it should be argued with rather than assumed.

""")
W("## Contents\n")
W("| Content type | Scenarios | Heard in Open Notebook today |")
W("|---|---:|---:|")
for g in names:
    rs=groups[g]; impl=[r for r in rs if not r['on'].startswith('n/a')]
    heard=len([r for r in rs if r['id'] in FIXED or r['on'].startswith('announced')])
    W(f"| [{g}](#{anchor(g)}) | {len(rs)} | {heard} of {len(impl)} implemented |")
W("")
for g in names:
    rs=groups[g]
    W(f"\n---\n\n## {g}\n")
    byph=collections.OrderedDict()
    for r in rs: byph.setdefault(phase(r),[]).append(r)
    for ph in [p for p in PHASE_ORDER if p in byph]+[p for p in byph if p not in PHASE_ORDER]:
        W(f"### {ph}\n")
        W("| | Scenario | You should hear | Open Notebook | Lexical | CKEditor 5 |")
        W("|---|---|---|---|---|---|")
        for r in byph[ph]:
            box='x' if r['id'] in FIXED else '~' if r['id'] in PARTIAL else ' '
            needs=r['needs'].replace('`','').replace(', ',' · ')
            W(f"| [{box}] | [{r['title']}](canonical.md#{r['id'].lower()}) | {needs} "
              f"| {sym(r['on'],r['id'],True)} | {sym(r['lex'])} | {sym(r['cke'])} |")
        W("")
open('scenarios.md','w').write('\n'.join(o)+'\n')
print("total",len(rows))
for g in names: print(f"  {g}: {len(groups[g])}")

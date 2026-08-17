# Shell parity with the approved prototype

**Date:** 2026-08-17
**Status:** Approved. Abhishek reviewed `klio-v4.html` and said: *"yes this was I
approved I want exactly this nothing to be deviated."*
**Source of truth:** `klio-v4.html`, published at
`https://claude.ai/code/artifact/1cfa9616-4154-48cb-a790-534b95f1baac`.
**Repo:** `apps/web` (app.klio.tech).

---

## Why this exists

The prototype was approved and then only partially built. PR #80 implemented the
`2026-08-17-context-surfaces-addendum` — the shared/private split, proposals, and
per-item evidence — which is three of the prototype's surfaces. The addendum
deliberately does not restate information architecture, so the prototype's
navigation, its Home screen, its Projects screen and its Agents screen were never
written into any document an implementer could read. They were not built.

Worse, the same PR moved the untouched Hub page *further* from the prototype: its
first commit is titled "make Hub Projects match Linear's costume" and added
columns with no data behind them.

**This spec is a transcription, not a redesign.** Where it and the prototype
disagree, the prototype wins. No screen, column, label, or control may be added,
removed, renamed or reordered relative to `klio-v4.html`.

## What must be undone

Present on app.klio.tech, absent from the prototype. All are removed:

- The **Hub** nav item and its Projects table, including the `Health`,
  `Priority`, `Lead`, `Target date`, `Issues` and `Status` columns. `Priority`
  renders a literal `---` for every row and `Target date` renders an empty cell;
  neither has a backing field.
- The **Inbox** nav item.
- The **Private** nav item. Private context is a group inside **Shared**, per the
  prototype.

## Navigation

One unlabelled list, in this order, each with a live count except Home:

| Label | Count | Route |
|---|---|---|
| Home | — | `/home/[account]` |
| Projects | number of projects | `/home/[account]/projects` |
| Context | number of context items | `/home/[account]/context` |
| Shared | org-scoped active count | `/home/[account]/shared` |
| Proposals | open proposal count | `/home/[account]/proposals` |
| Agents | number of recall sources | `/home/[account]/agents` |

Then a group header **Setup**, and under it one item **Keys & agents** →
`/home/[account]/setup`.

The current item carries `aria-current="page"`. Selecting any nav item clears
both filters and closes the drawer.

## Page header

Every screen shows a title and a subtitle, taken verbatim from the prototype's
`T` map:

| View | Title | Subtitle |
|---|---|---|
| home | Home | what your agents are working from |
| projects | Projects | context by project |
| context | Context | every item, freshest first |
| shared | Shared | what your team can see, and what only you can |
| proposals | Proposals | changes Klio suggests, with evidence |
| agents | Agents | who is connected and what they claimed |
| setup | Setup | keys and agents |

## The context row

One component, used by Home, Context and Shared. Header row: **Kind · Context ·
Project · Recalled · Age**.

- **Kind** — the memory type.
- **Context** — the content. Struck through when the item is superseded.
- **Project** — project display name.
- **Recalled** — the recall count, followed by a `stale` danger badge when the
  served-stale count is non-zero, and a `shared` badge when the item is
  org-scoped.
- **Age** — relative, `Nm` under an hour, `Nh` under a day, else `Nd`.

Selecting a row opens the detail drawer. Empty list renders:

> **Nothing matches** — No context items for this filter. Clear it to see everything.

## Filters

Shown on Home and Context. A row of chips: every memory kind with its count,
then the **top six projects** with their counts, then a `clear` chip that appears
only when a filter is active. Chips toggle; selecting an active chip clears it.
Filters are project and kind, combined with AND.

## Home

Four stat cards, in order:

1. total context items
2. recalls across the loaded items
3. recalls served
4. number of projects

Then the scope-reality note, rendered in the warning-rule note style:

> Scope reality: *N* private · *M* org-scoped. A team stream would show one row —
> nothing has been shared yet.

Then filters, then the context rows.

## Projects

Rows: **Project · Items · Last**, where Items is the item count and Last is the
relative age of the newest item. Selecting a project sets the project filter and
navigates to **Context**.

## Context

Filters, then rows, unfiltered by default and newest first.

## Shared

Two stat cards: **shared with the team** and **private to you**. Then the note:

> Only *N* of *M* items is shared. Sharing is what makes this a team brain — open
> any row to share it.

Then a **Shared** group, then a **Private to you** group, each rendered as
context rows. When nothing is shared the first group renders:

> **Nothing shared yet** — Open a private item and share it — everyone on your
> team can then use it.

**Visibility is inherited, never restated.** The two groups are two loaders with
two hard-coded predicates, never one parameterised query. This rule and the
existing `shared-context.loader` / `my-private-context.loader` from PR #80 carry
forward unchanged.

## Proposals

When there are none:

> **Nothing needs your attention** — Klio proposes changes when it sees a pattern
> across sessions — a fact that keeps being served after it stopped being true,
> or a gap that keeps coming up.

Empty is the normal state and must never read as broken. When proposals exist,
each renders as a card with its heading, its superseded-by line, a confidence
badge, an evidence block, and **Reject** / **Approve** actions — the shape the
prototype illustrates and the surface PR #80 already implements.

**The prototype's illustrative example card is not built.** It is labelled
"Illustrative — not real data" in the prototype because the prototype had no
proposals to show. Shipping fabricated evidence into production would violate the
addendum's standing rule that no copy may claim evidence the schema does not
carry.

## Agents

Rows: **Agent · Source · Recalls · Last**, one per recall source. A source of
`hook` displays as `claude-code (hooks)`; every other source displays verbatim.
Below the table:

> **No active claims** — When an agent claims work, it appears here so others
> don't duplicate it.

## Setup

One card titled **Connected** with the connected agent list as its subtitle, and
an evidence block naming each integration and its transport.

## The detail drawer

Opens over a scrim from any context row. Contents in order: the kind, the content
as the heading, a **Close** button, then an evidence block:

| Row | Value |
|---|---|
| project | project name |
| scope | scope |
| captured | relative age, suffixed "ago" |
| recalled | count, suffixed × |
| used by an agent | count, suffixed × |
| served stale | count as a danger badge when non-zero, else `0` |
| status | `superseded`, or an `active` success badge |

Then the provenance note:

> Recall counts from brain_recall_events.memory_ids; used and stale from
> recall_outcomes.

Then a full-width action: **Share with the team** on a private item, or **Make
private again** on a shared one.

`recall_outcomes` has `used`, `usage_score` and `served_stale`. It has **no**
verdict column and no per-outcome agent attribution. Copy implying pass/fail
grading, or naming the agent that used a memory, is fiction and must not ship.

Closing: the Close button, selecting the scrim, or Escape. Focus moves to Close
on open.

## Responsive

Below 820px the sidebar is hidden and the Kind, Project and Age columns are
dropped from context rows, leaving content and the recall count.

## Data

Every number is a live query. The prototype's fixtures are shapes, not values —
no literal from `window.KLIO` may survive into the implementation, including the
hardcoded total on the Home stat card.

New loaders follow the existing `memory.loader.ts` pattern: `server-only`,
`cache()`, `getAgentGuardPool`, org-scoped SQL, one visibility predicate per
loader. Degradation follows the home page's `orFallback` pattern — a slow Neon
resume must not error the page.

Nav counts are queried once per request and passed to the navigation config; a
count that cannot be resolved renders as absent, never as `0`.

## Testing

- Visibility: adversarial test per new loader — another user's private item with a
  distinctive literal must not appear, with a positive control proving the fixture
  is findable by its owner. Predicate mutation must fail the test.
- Navigation: a test asserting the exact nav list, in order, with the Setup group
  — failing if an item is added, removed or reordered.
- Empty states: no proposals, nothing shared, a filter matching nothing. Each
  asserts the reassuring copy, not merely an empty list.
- Row rendering: superseded struck through, stale badge present only when the
  count is non-zero, shared badge only on org-scoped items.
- Filters: kind and project combine with AND; the clear chip appears only when a
  filter is active.
- The existing web suite must not drop. It stands at 556.

## Success criteria

- Every screen, column, label and control matches `klio-v4.html`. A reviewer
  holding the prototype beside the app finds no difference in structure or copy.
- Hub, Inbox and the standalone Private item are gone, along with every column
  that had no backing field.
- No number on any screen comes from a literal.
- Visibility adversarial tests pass and fail under predicate mutation.

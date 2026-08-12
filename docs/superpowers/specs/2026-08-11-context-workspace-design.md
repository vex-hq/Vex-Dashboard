# The context workspace — design

**Date:** 2026-08-11
**Status:** Design, approved in conversation (frame, atom, and single-release
scope all confirmed by Abhishek).
**Repo:** `apps/web` (app.klio.tech). One release, no phases.

---

## What this is

The Klio Cloud dashboard rebuilt around the product's own thesis: **Linear for
agents**. Humans and AI agents collaborate on the same projects; the dashboard
is where a human sees that collaboration. The Vex-era verification console
(agent health, alert summary, failure patterns, reliability score) leaves the
home screen; the context stream replaces it.

**The atom is the context item** — a decision, plan, fact or note. Every list
on this dashboard is rows of context items. Sessions and agents are metadata
on the rows, never the rows themselves; they demote from navigation entries to
filters.

Decided against, for the record: home-as-context-view (rejected — the
dashboard serves the whole team, not a manager's overview; the context view
belongs to each project instead) and a phased rollout (rejected — Abhishek
wants the complete platform in one release; risk is contained by internal
ordering rather than by shipping in stages).

## What ships, in one release

### 1. Home: the context stream

The first screen answers "what is happening across my projects" — mine and my
team's, in one feed.

- **Rows are context items**: kind glyph, content (one line, expandable),
  project, author (agent id + person where attributed), relative time.
  Superseded items render struck-through with a pointer to what replaced them.
- **Filters**: project, agent, person, kind (decision / plan / fact / note),
  time. Filters are URL state, so a filtered view is shareable.
- **"My projects" rail**: each project the viewer belongs to, with a pulse —
  items this week, last item's age, agents active in the window.
- **The connect card** (shipped 2026-08-11) stays: an org with no captured
  memories sees it above the stream.
- **Usage strip**, two numbers per the token conversation:
  - *Klio accounting* (measured): memories captured, recalls served, storage,
    per project. From `session_memories`, `brain_recall_events`,
    `memory_usage_counters`.
  - *Context served* (estimate, labeled as such): recalls × result_count ×
    mean active-memory content length ÷ 4 chars/token. **Verified 2026-08-11:
    `brain_recall_events` carries `result_count` but not returned ids**, so an
    exact figure is impossible without an engine change, and the engine is
    frozen. The label says "estimated"; the tooltip says why.

### 2. Project page: the context view

Roadmap item #1 from the positioning doc, and the onboarding demo. Each
project gets one screen that reads like a brief:

- **Header**: project name, agents active, members, items this week.
- **Sections**: Decisions · Plans · Constraints · Recent. Type mapping, so
  no two readers disagree: `decision` → Decisions, `plan` → Plans, `fact` →
  Constraints, everything else (`note`, `memory`, captures) → Recent only.
  The first three sections show active items; Recent shows the newest N of
  any type including superseded ones. Each item
  shows author, date, and — for decisions — its supersession chain inline
  ("replaced *deploy Fridays* from March"). The chain walks `superseded_by`.
- **The onboarding read**: the page IS the "join the project, read the brief,
  you're current" pitch. No separate onboarding flow is built; this page is
  measured against that claim instead.

### 3. Information architecture

Nav becomes: **Home · Projects · Memory · Docs · Settings.**

- *Memory* stays: it is the raw archive (existing Mine/Projects/Team tabs).
  The stream is curated flow; Memory is complete record.
- *Sessions* and *Agents* leave the nav. Their routes stay reachable (hidden,
  not deleted — the standing Vex decision) and their content is reachable as
  stream filters.
- Vex-era routes (alerts, executions, experiments, datasets, tools…) remain
  exactly as today: routed, unlinked.

### 4. Billing guard

The Billing page currently sells Vex's $29/$99/$349 tiers to Klio users —
prices that contradict klio.tech/pricing and that nobody should be able to
pay. Until Klio's Stripe products exist (explicitly deferred by Abhishek):

- Billing leaves the personal-account nav.
- The route itself renders a plan summary (current plan name, seat count) and
  a "pricing is at klio.tech/pricing — talk to us" card instead of the Vex
  checkout. No checkout path to a wrong price.

### 5. Home loader cleanup

The home page stops calling the seven Vex loaders (KPIs, agent health, alert
summary, trend, failure patterns, anomaly alerts, plan usage keeps only its
memory fields). The loaders themselves are not deleted; the hidden Vex routes
still use them.

## Data and boundaries

**Everything reads existing tables** — `session_memories`, `projects`,
`project_members`, `brain_recall_events`, `memory_usage_counters` — through
new loaders in `apps/web` following the `memory.loader.ts` patterns
(`getAgentGuardPool`, `cache()`, org-scoped SQL). **No engine changes, no
migrations.** The engine freeze (2026-08-07) holds.

**Visibility is the highest-risk part, and it is inherited, never restated.**
The stream and the context view show: org-scope items, project-scope items for
projects the viewer belongs to, and the viewer's own private items. This is
the same ladder the Memory page already implements — the new loaders reuse its
predicate helpers (`memory-visibility.types` / existing loader WHERE shapes)
rather than composing fresh SQL predicates. The Wave-1 engine defect and the
lexical-arm rule both exist because a second query path with hand-rolled
tenancy is where leaks are born. Adversarial tests are required: another
user's private item with a distinctive literal must not appear in the stream
or the context view, with positive controls proving the fixture is findable
by its owner.

**Degradation:** every loader wraps in the home's existing `orFallback`
pattern — one slow Neon resume must not error the page (this exact failure is
documented in `page.tsx`).

## Testing

- Loader tests: visibility (adversarial + positive control), supersession
  chain assembly, filter combinations, estimate arithmetic.
- Component tests: stream row rendering incl. superseded state, empty states
  (new org → connect card; filtered-to-nothing → explain the filter).
- The full existing suite (213 web tests) must not drop.
- Typecheck clean; verified in the browser at desktop and 375px before push.

## Out of scope, explicitly

- Conflict surfacing across brains (needs engine read paths — separate
  conversation against the freeze).
- Stripe products / Klio checkout (deferred by Abhishek).
- `klio_live_` key prefix.
- Real-time stream updates (Redis pub/sub exists; polling/refresh is enough
  for v1 — live updates are an enhancement, not a dependency).
- Any engine or migration change whatsoever.

## Success criteria

- A Klio user's home shows only context-management surfaces — zero
  verification-era panels.
- The stream answers "what happened across my projects" in one glance,
  filtered by URL state.
- A project page reads as a brief a new teammate could start from.
- No route can present a Vex price to a Klio user.
- Visibility adversarial tests pass and fail under predicate mutation.
- Existing 213 tests still pass; the hidden Vex routes still render.

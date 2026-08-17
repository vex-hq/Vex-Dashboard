# Context surfaces — addendum to the context workspace design

**Date:** 2026-08-17
**Status:** Approved in conversation (prototype reviewed and accepted by Abhishek).
**Extends:** `2026-08-11-context-workspace-design.md`. That design stands; this
adds only what became possible after it was written.
**Repo:** `apps/web` (app.klio.tech).

---

## Why this exists

The Aug-11 design was written under the engine freeze (2026-08-07) and says so:
*"No engine changes, no migrations."* That freeze was lifted deliberately and
the engine has since shipped the evidence loop, claims, proposals and
project-scoped recall. Three surfaces are now buildable that were not then.

Nothing in the Aug-11 design is superseded. Its IA, its visibility rules, its
`orFallback` degradation pattern and its adversarial-test requirement all carry
forward unchanged and are not restated here.

## What this adds

### 1. Shared vs private, made explicit

**The finding that motivates it:** the reference org holds **5,196 private**
memories and **1** org-scoped. Everything captured is private. The team-brain
premise is unexercised by real usage, and the dashboard currently hides that.

- The context list splits into two labelled groups: *Shared with your team* and
  *Only you*, each with a count. The split is the security boundary, so it is
  also the display boundary.
- A private item's detail offers **Share with the team**, calling the engine's
  existing `share` path. This is the highest-value action in the product: it is
  the only place a human turns private context into team context.
- Sharing is reversible from the same surface.

**Visibility is inherited, never restated.** The Aug-11 rule holds absolutely:
org-scoped rollups must never read `scope = 'private'`. The two groups are two
queries with two predicates, never one parameterised query — the same rule the
existing per-tab memory loaders follow, and for the same reason.

### 2. Proposals

The dreamer writes `memory_proposals` rows (`kind` add|revise|retire,
`proposed_content`, `evidence` jsonb, `confidence`, `status`) awaiting human
approval. There is no surface, so the job produces nothing actionable.

- A list of `status='open'` proposals. Each renders its diff and its evidence
  inline — prevalence, stale-serve count, last served — because the evidence at
  decision time *is* the feature. A link to evidence is not the same product.
- **Approve** applies through the engine's check-and-set path, so the dreamer
  obeys the same concurrency rules as any other writer. **Reject** closes it.
- `revise` needs no human authoring: `proposed_content` carries the replacement.

**Empty is the normal state.** The dreamer runs periodically and will often find
nothing. The empty state must read as *nothing needs your attention*, never as
*this feature is broken*. At time of writing the correct count is zero — the
dreamer has never completed a pass.

### 3. Evidence on a context item

`brain_recall_events.memory_ids` and `recall_outcomes` now make per-item
evidence answerable. The Aug-11 spec explicitly could not do this and said so:
*"`brain_recall_events` carries `result_count` but not returned ids"*. It does
now.

Item detail gains: recalled *n* times, used *n* times, served-stale count, and
the supersession chain rendered as a short chain — what this was, what replaced
it. That chain is the only graph in this design.

**Available fields only.** `recall_outcomes` has `used`, `usage_score`,
`served_stale`. It has **no** verdict column and no per-outcome agent
attribution. Any evidence copy implying pass/fail grading or naming the agent
that used a memory is fiction and must not ship.

### 4. Project sections

The Aug-11 design maps `decision → Decisions`, `plan → Plans`,
`fact → Constraints`. Production held **zero** decisions and zero plans, because
`capture.py` hardcoded `memory_type="fact"` and `/capture/event` defaulted to
`observation`.

The extraction fix (vex_engine PR #35) classifies into the taxonomy. Replayed
over 19 production traces it produced 10 decisions and 4 plans where the old
path produced none. The sections are therefore built as the Aug-11 design
specifies, and populate as classified writes accumulate.

**Existing rows are not reclassified.** Sections will look thin until new
captures accumulate. The empty state says so plainly rather than implying the
project has no decisions.

## Explicitly not built

- **A knowledge graph.** 359 edges across 5,227 memories — 7% connected. Graph
  expansion contributed nothing in 8 of 8 retrieval replays. A node-link view
  would advertise a feature that is not working. Revisit when the dreamer is
  creating links.
- **Separate pages for session traces or recall outcomes.** Evidence attaches to
  the thing it explains. A standalone table is observability nobody opens.
- **Charts.** Context health is counts and lists. The existing charts are Vex's
  latency and cost telemetry and stay where they are.
- **Claims.** `work_claims` holds 2 rows and none are active. Not enough signal
  to design against; revisit when agents actually claim work.

## Data and boundaries

Everything reads existing tables through new loaders in `apps/web`, following
the `memory.loader.ts` pattern: `server-only`, `cache()`, `getAgentGuardPool`,
org-scoped SQL, one visibility predicate per loader. Approve/reject and share
are the only writes, and each goes through an engine path that already exists.

Degradation follows the home page's existing `orFallback` pattern — a slow Neon
resume must not error the page.

## Testing

- Visibility: adversarial test per new loader — another user's private item with
  a distinctive literal must not appear, with a positive control proving the
  fixture is findable by its owner. Predicate mutation must fail the test.
- Empty states: no proposals; a project with no decisions; an org with nothing
  shared. Each asserts the reassuring copy, not merely an empty list.
- Evidence rendering: an item with recalls and stale-serves, and one with
  neither.
- The existing web suite must not drop.

## Success criteria

- A user can see, in one place, how much of their context is shared versus
  private — and share something without leaving the dashboard.
- A proposal can be approved or rejected, and approving applies the change.
- For any context item, a user can answer: how often was this used, and was it
  ever used after it stopped being true.
- No copy claims evidence the schema does not carry.
- Visibility adversarial tests pass and fail under predicate mutation.

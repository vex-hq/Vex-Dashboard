# Per-User Memory Drill-in — Design

**Status:** Approved design, ready for implementation plan
**Date:** 2026-06-03
**Area:** `apps/web` — Memory dashboard (`/home/[account]/memory`)

## Goal

Make each card on the Memory page's "Agent activity" grid clickable, opening a
per-identity view that shows **everything that identity did** — its captured
memories and its recall activity — scoped to the current org.

## Why this is needed

Today the cards are static `<Card>`s (no `onClick`/link). There is no way to
drill from "this identity captured 7 / recalled 27" into the underlying rows.

A subtle-but-critical point drove the design: the `agent_id` column is
**overloaded**. In the self-serve case it's a dev-tool agent
(`klio-host/claude-code`); in the B2B2C embed case (e.g. the MoonForge org) it's
an **end-user** (`spike-userB-gameY`). Both are just `agent_id` values in
`session_memories` / `brain_recall_events`.

The existing reliability page `agents/[agentId]` is **not** a valid target:
- It reads `agents`, `executions`, `agent_health_hourly`, `check_score_hourly`,
  `correction_stats_daily` — the Vex verification pipeline, a **different
  identity namespace**. `loadAgent` does `SELECT * FROM agents WHERE
  agent_id = $1`; a memory-only identity isn't in `agents`, so the page calls
  `notFound()` → **404**. Even if present, every panel queries `executions`,
  which is empty for memory-only identities.
- It's the wrong **domain** (reliability, not memory).

So this is a new, memory-specific screen built on the memory tables.

## Approved decisions

1. **Layout:** two sections (KPI header → "Captured memories" table → "Recall
   activity" table). Not a unified timeline (deferred to a possible v2).
2. **Labeling:** neutral wording — title the page by the identity itself
   (e.g. "Memory for `spike-userB-gameY`"). Avoid both "Agent" and "User" so we
   don't half-rename one screen ahead of a global, context-aware relabel.

## Data sources (all already exist — no engine/migration changes)

- **Captures** — `session_memories` (org-scoped, `scope='org'`,
  `status='active'`): `id, agent_id, memory_type, content, project_id,
  metadata->>'source' AS source, created_at`. Already filterable by `agent_id`
  via the existing `loadMemoryList(orgId, { agent_id, page })`.
- **Recalls** — `brain_recall_events` (org-scoped): `id, agent_id, query_text,
  result_count, source, created_at`. The migration added a `(org_id, agent_id)`
  index explicitly "to serve the dashboard's … per-agent drill-down." Recalls
  have never been surfaced in any UI; this screen is the first.

## Architecture

### Route

`apps/web/app/home/[account]/memory/agent/[...agentId]/page.tsx`

A **catch-all** segment (`[...agentId]`) so identities containing `/`
(`klio-host/claude-code`) survive routing. The page joins the segments back:
`decodeURIComponent` each part, then `.join('/')`.

The Memory page's agent cards link to it; see "Card link" below.

### Loaders (add to `apps/web/app/home/[account]/memory/_lib/server/memory.loader.ts`)

All loaders are `cache(...)`, bind `org_id` as `$1` and `agent_id` as a
positional param (never interpolated), and reuse the `getAgentGuardPool()`
pattern of the existing loaders.

1. **`loadAgentMemorySummary(orgId, agentId): Promise<AgentActivityRow>`**
   The single-identity slice of the existing `loadAgentActivity` aggregates —
   same `captured/facts/via_mcp/via_hook/last_captured` from `session_memories`
   and `recalled/last_recalled` from `brain_recall_events`, but with an added
   `AND agent_id = $N` and **no** `GROUP BY` (single row). Returns a zero-filled
   `AgentActivityRow` when the identity has no rows (so the page renders an
   empty state rather than throwing).

2. **`loadAgentRecalls(orgId, agentId, page): Promise<AgentRecallResult>`**
   New. Paginated rows from `brain_recall_events`:
   ```sql
   SELECT id, query_text, result_count, source, created_at,
          COUNT(*) OVER() AS total_count
   FROM brain_recall_events
   WHERE org_id = $1 AND agent_id = $2
   ORDER BY created_at DESC
   LIMIT $3 OFFSET $4
   ```
   New exported types `AgentRecallRow { id; query_text: string | null;
   result_count: number; source: string | null; created_at: string }` and
   `AgentRecallResult { rows: AgentRecallRow[]; pageCount: number }`. Reuse
   `MEMORY_PAGE_SIZE`.

3. **Captures** — reuse `loadMemoryList(orgId, { agent_id: agentId, page })`
   verbatim. No new loader.

### Components

- `memory/agent/[...agentId]/_components/agent-memory-header.tsx` — KPI row
  (Captured · Recalled · Last active · Facts/Hook/MCP badges), reusing the
  visual language of the existing `agent-activity.tsx` card body.
- `memory/agent/[...agentId]/_components/recall-activity-table.tsx` — the new
  recalls table: columns Query · Results · Source · Created. Empty state when no
  recalls.
- **Captures table:** reuse the existing Memories table component the Memory
  page already renders (the one fed by `loadMemoryList`). If it isn't already a
  standalone reusable component, extract it during implementation so both the
  Memory page and this drill-in share it (DRY).
- Page composes: back-link → header → "Captured memories" section → "Recall
  activity" section, mirroring `memory/[id]/page.tsx`'s structure/imports
  (`TeamAccountLayoutPageHeader`, `PageBody`, `AppBreadcrumbs`, `resolveOrgId`).

### Card link (`memory/_components/agent-activity.tsx`)

Wrap each card in a `next/link` `Link` to:
```
/home/${accountSlug}/memory/agent/${agent.agent_id
  .split('/').map(encodeURIComponent).join('/')}
```
Add `cursor-pointer` + hover affordance. `accountSlug` must be threaded into
`AgentActivity` (currently it only receives `agents`); pass it from the Memory
page. A small pure helper `encodeAgentIdPath(agentId): string` (and its inverse
`decodeAgentIdPath(segments: string[]): string`) lives in
`lib/agentguard/agent-id-path.ts` so encode/decode are symmetric and unit-tested.

## Data flow

1. Page: `const orgId = await resolveOrgId(account)`.
2. `const agentId = decodeAgentIdPath(params.agentId)` (catch-all → string).
3. `Promise.all([loadAgentMemorySummary(orgId, agentId),
   loadMemoryList(orgId, { agent_id: agentId, page: capturesPage }),
   loadAgentRecalls(orgId, agentId, recallsPage)])`.
4. Render. Two independent page params drive pagination:
   `?capturesPage` and `?recallsPage`.

## Security

- Every query is constrained by `org_id` **and** `agent_id`, both bound
  positionally — identical guarantee to `loadMemoryDetail` (one org can never
  read another org's rows). No string interpolation of user input.
- `agentId` from the URL is only ever used as a bound parameter and for display;
  it is never interpolated into SQL.

## Error handling

- Unknown / never-seen identity → `loadAgentMemorySummary` returns zeros and the
  two lists return empty; the page renders a friendly empty state
  ("No memory captured for this identity yet"). **No `notFound()`** — memory
  identities are dynamic, not a registered enum.
- Missing/invalid account → handled by `resolveOrgId` as today.

## Testing

- **Unit (`vitest`, already configured in `apps/web`):**
  - `agent-id-path.ts` round-trip: `decodeAgentIdPath(encodeAgentIdPath(x)) === x`
    for plain ids, slash ids (`klio-host/claude-code`), and special chars.
  - `loadAgentRecalls` / `loadAgentMemorySummary` SQL assembly against a mocked
    pool (assert org+agent binding, ordering, pagination), following whatever
    loader-test pattern exists; if none exists, at minimum cover the pure path
    helper and the page-param parsing.
- **Manual / e2e (smoke):** from the MoonForge org, click `spike-userB-gameY` →
  see its capture ("userB only asks about IAP monetization pricing") and its
  recall rows; confirm another org's identity 404s/empties (isolation).

## Out of scope (explicit follow-ups)

- **Unified activity timeline** (interleave captures + recalls chronologically) —
  the v2 of this screen.
- **Global "Agent → User" relabel** for embed orgs — a context-aware,
  cross-page change; tracked separately so labeling stays consistent.
- The reliability `agents/[agentId]` page is untouched.
- No engine or DB changes — all required data already exists.

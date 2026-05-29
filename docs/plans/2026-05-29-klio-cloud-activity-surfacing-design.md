# Klio Cloud Activity Surfacing — Design

> Status: approved (brainstorming) · 2026-05-29
> Next: `superpowers:writing-plans` → implementation plan, then `frontend-design` for the UI build.

## Goal

Make Klio Cloud memory **visible and trustworthy** in the Vex dashboard:

1. A new **Memory** section that shows *which agent captured/recalled what* and lets
   the user browse everything stored — so the user can answer "is Claude Code (or
   Cursor/Codex) actually doing the job?"
2. A new onboarding **"Connect your agents"** step that hands the user the
   `npx @klio-tech/klio@latest init` CLI so they wire their local agents over MCP +
   capture hooks (memory persists, the agent stays in the loop).

The user's thesis held up: the dashboard's **patterns, DB access, and design system are
all reusable** — but the memory *view itself is new* (the praised session view renders
verification `executions`, a different dataset).

## Context (what already exists)

- **Dashboard** = `vex_public/Dashboard`, a Makerkit `next-supabase-saas-kit-turbo`
  monorepo. The authenticated app is `apps/web`; UI is shadcn/ui + Tailwind with
  reusable `Card`/`Badge`/`Table`/`DataTable` (TanStack) + Recharts.
- **Data layer:** the dashboard queries the **same Neon Postgres**
  (`AGENTGUARD_DATABASE_URL`) the memory brain writes to, via a `pg` Pool
  (`apps/web/lib/agentguard/db.ts`). No REST client — direct SQL, tenant-scoped by
  `org_id`. The session loader already resolves `account → org_id`; the memory loader
  reuses that exact resolution.
- **Session view** (`apps/web/app/home/[account]/sessions/`) is the pattern to copy:
  `page.tsx` → `_lib/server/*.loader.ts` (parameterized SQL, `org_id = $1`) →
  `_components/*` (table + timeline). It renders `executions` (verification), **not**
  memories.
- **`session_memories`** (the brain table; migration 020/021) columns we read:
  `id, org_id, agent_id, memory_type, content, scope, status, space_id, project_id,
  metadata (jsonb), created_at`. Klio Cloud rows are `scope='org'`, `status='active'`.
  `metadata.source ∈ {hook, hook-transcript, user-trigger-phrase, mcp, curator}`.
- **API keys:** `createKey` (`apps/web/lib/agentguard/api-keys.ts`) mints `ag_live_*`,
  SHA-256 hashed into `organizations.api_keys` JSONB; allowed scopes today
  `['ingest','verify','read']`. Onboarding mints `['ingest','verify']` only.
- **Onboarding** (`apps/web/app/onboarding`): Welcome → InviteTeam → **ApiKey** →
  InstallSdk → VerifyConnection, driven by `onboarding-wizard.tsx`.
- **Capture/recall API** lives on the Vex MCP server (`vex_engine`,
  `services/mcp-server/app/capture.py`): `POST /capture/event|transcript|recall`,
  org-scoped by `X-Vex-Key`, agent by `X-Vex-Agent`.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Surface | **New "Memory" section** (own route), not a tab/panel |
| Content | **Overview + browser** (agent-activity cards *and* a filterable memory browser) |
| Onboarding | **New "Connect your agents" step** after the API-key step |
| Key scope | Add `'memory'` to the onboarding key + expose it in the api-keys UI |
| Attribution | **Per-tool `X-Vex-Agent`** — CLI tags each tool distinctly (0.9.1) |
| Recall tracking | **Include in v1** — log recall events so the overview shows recall activity |

## Architecture

Three repos, additive everywhere:

```
klio (npm CLI)                vex_engine (brain)               Dashboard (UI)
─────────────────             ──────────────────               ───────────────
per-tool X-Vex-Agent   ──▶    /capture/* writes agent_id ──▶   reads session_memories
recall logging client?        + brain_recall_events (022)      + brain_recall_events
                              recall-event INSERT on read       Memory section + onboarding
```

### A. Per-tool agent attribution (klio CLI, 0.9.1)

Today `deriveAgentId()` → one machine id `klio-<host>` shared by every wired tool, so
the brain can't distinguish Claude Code from Cursor on `mcp` writes. Change:

- `wireCloudAgents` sets `X-Vex-Agent = "<machineId>/<tool>"` per adapter
  (`/claude-code`, `/cursor`, `/codex`, `/claude-desktop`, `/opencode`, `/openclaw`).
- The `klio hook` client (Claude Code only) sends `"<machineId>/claude-code"`.
  `cloudConfig` stores the base `machineId`; the hook + each writer compose the suffix.
- `/` is header-safe and gives the dashboard a clean `split('/').pop()` → tool.
  Memories remain `scope='org'` (shared); this only sharpens provenance, not visibility.
- Ships as **0.9.1**; users re-run `klio init` to adopt (old single-id memories still
  display, just attributed to the machine).

### B. Recall event logging (vex_engine)

- **Migration 022** (additive): `brain_recall_events (id uuid pk, org_id text not null,
  agent_id text, project_id uuid null, query_text text null, result_count int,
  source text, created_at timestamptz default now())` + indexes
  `(org_id, created_at desc)` and `(org_id, agent_id)`.
- On `POST /capture/recall` **and** the MCP `recall` tool: best-effort `INSERT` after the
  read (failure logged, never breaks recall). `source` = `hook` (session-start) vs `mcp`.
- Nothing in `shared/*` changes; this is a new sibling table + a write at the call sites.

### C. Memory section (Dashboard) — `apps/web/app/home/[account]/memory`

Mirror the sessions module structure:

- `_lib/server/memory.loader.ts` — parameterized SQL on `session_memories`
  (`org_id = $1 AND scope='org' AND status='active'`) + `brain_recall_events`. Same
  `account → org_id` resolution as the sessions page. Loaders:
  - `loadAgentActivity(orgId)` — `GROUP BY agent_id`: capture count, last_active,
    type breakdown, source breakdown; joined with recall counts/last_recall from
    `brain_recall_events`.
  - `loadMemoryVolume(orgId, days)` — daily capture (and recall) counts for the chart.
  - `loadMemoryList(orgId, filters, offset)` — paginated rows for the browser.
  - `loadMemoryDetail(orgId, id)` — one memory.
- **Overview** (`_components/agent-activity.tsx`): per-agent cards — tool name (parsed
  from `agent_id`), captured N · recalled N · last active (relative + green "active 24h"
  dot) · type & source breakdown. Plus a "memories/day" Recharts area chart (14–30d).
- **Browser** (`_components/memory-table.tsx`): `DataTable` — type badge · content
  (truncated) · agent/tool · project · source · created_at. Filters: agent, type,
  source, project; search = `content ILIKE`. `LIMIT 25` offset pagination (like
  sessions). Row → detail drawer (full content, metadata, scope, project, timestamps).
- `page.tsx` composes `PageHeader` + `PageBody` with Overview above Browser. Add a
  sidebar nav entry "Memory".

### D. Onboarding "Connect your agents" step + scope fix

- **Scope fix (correctness):** `createOnboardingKeyAction` mints
  `['ingest','verify','memory']`; the api-keys create dialog (`create-key-dialog.tsx`)
  and `createKey` allow-list expose `memory`. Without it the CLI's `/verify` 403s.
- **New step** after `StepApiKey` in `onboarding-wizard.tsx`:
  `step-connect-agents.tsx` — shows `npx @klio-tech/klio@latest init` with
  copy-to-clipboard, a one-line explanation ("wires Claude Code / Cursor / Codex over
  MCP + capture hooks, so memory persists across sessions and your agent stays in the
  loop"), and a link to the Memory section. The existing Install-SDK (verification) step
  remains. i18n keys added under `onboarding.*`.

## Data flow

1. User onboards → mints a `memory`-scoped key → runs `klio init` → per-tool agents
   wired + Claude Code capture hooks installed.
2. Agents capture (`/capture/*`, `agent_id="<machine>/<tool>"`) and recall
   (`/capture/recall` + MCP `recall`, logged to `brain_recall_events`).
3. Dashboard Memory section reads `session_memories` + `brain_recall_events` (org-scoped)
   and renders per-agent activity + the browser.

## Non-goals (v1)

- No changes to the verification session view or any memory **write** path.
- No memory **delete** UI (read-only surfacing; there is no delete MCP tool).
- No real-time stream (page loads on navigation/refresh; WS is a later option).

## Testing

- **vex_engine:** migration 022 test (table/indexes exist, downgrade clean); capture
  tests assert a recall-event row is written on `/capture/recall` and the MCP `recall`
  tool (best-effort: a logging failure does not break recall).
- **klio CLI:** `wireCloudAgents` tests assert each adapter writes the per-tool
  `X-Vex-Agent`; hook test asserts the `/claude-code` suffix; cloudConfig unchanged.
- **Dashboard:** loader unit tests (SQL shape, org scoping, filter/pagination params);
  component render tests for the overview cards + browser; onboarding step render +
  the key-scope includes `memory`. `pnpm typecheck && pnpm lint && pnpm test` green.

## Rollout / ordering

1. vex_engine: migration 022 + recall logging → deploy (Railway).
2. klio CLI 0.9.1: per-tool attribution → publish.
3. Dashboard: Memory section + onboarding step + scope fix → ship.

Steps 1–2 are backward-compatible; the dashboard tolerates old single-id memories and an
empty `brain_recall_events`.

# Klio Cloud Activity Surfacing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task (the user chose subagent-driven execution; use frontend-design for the Dashboard UI tasks 13–15). Alternatively superpowers:executing-plans for a parallel session.

**Goal:** Surface Klio Cloud memory in the Vex dashboard — a per-agent activity overview + a memory browser — and add an onboarding step that hands users the `npx @klio-tech/klio@latest init` CLI; plus per-tool agent attribution and recall-event logging so "which agent is doing the job" is answerable.

**Architecture:** Three additive, independently-shippable phases. (1) `vex_engine` logs recall events into a new `brain_recall_events` table. (2) `klio` CLI tags each wired tool with a distinct `X-Vex-Agent`. (3) The Dashboard reads `session_memories` + `brain_recall_events` (same Neon DB, org-scoped) and renders a new Memory section, adds an onboarding connect step, and gives keys the `memory` scope.

**Tech Stack:** Python/FastAPI/SQLAlchemy/Alembic/pytest (vex_engine); TypeScript/node:test (klio CLI); Next.js Makerkit monorepo, pnpm, shadcn/ui + Tailwind + Recharts, `pg` (Dashboard).

**Design:** `docs/plans/2026-05-29-klio-cloud-activity-surfacing-design.md`

**Standing constraints:** purely additive (never touch the verification session view or any memory *write* path; no delete UI); every query tenant-scoped by `org_id`; recall logging is **best-effort** (a logging failure must NEVER break a recall). Commit locally per repo; **no push/publish until the user approves**. Author identity stays the repo default; no Co-Authored-By.

---

## Phase 1 — vex_engine: recall-event logging

Repo: `/Users/thakurg/Hive/Research/AgentGuard/vex_private/vex_engine`
Run tests: `PYTHONPATH=services/shared ./.venv/bin/python -m pytest services/mcp-server/tests/ -q` and `services/migrations/tests/`. Lint: `ruff check <files>` + `ruff format <files>`.

### Task 1: Migration 022 — `brain_recall_events`

**Files:**
- Create: `services/migrations/alembic/versions/022_brain_recall_events.py`
- Test: `services/migrations/tests/test_migration_022.py` (mirror `test_migration_021.py`)

**Step 1 — Write the migration** (mirror `021_brain_curator_state.py`; `revision="022"`, `down_revision="021"`):

```python
"""Klio brain: recall-event log.

ADDITIVE ONLY. Introduces ``brain_recall_events``, an append-only log of recall
(read) requests so the dashboard can show per-agent recall activity. Nothing
existing is touched; the verification path and session_memories are unaffected.

Revision ID: 022
Revises: 021
Create Date: 2026-05-29
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "brain_recall_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", sa.Text(), nullable=False),
        sa.Column("agent_id", sa.Text(), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("query_text", sa.Text(), nullable=True),
        sa.Column("result_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_brain_recall_events_org_created",
        "brain_recall_events",
        ["org_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_brain_recall_events_org_agent",
        "brain_recall_events",
        ["org_id", "agent_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_brain_recall_events_org_created", table_name="brain_recall_events")
    op.drop_index("ix_brain_recall_events_org_agent", table_name="brain_recall_events")
    op.drop_table("brain_recall_events")
```

**Step 2 — Test** (mirror `test_migration_021.py`: upgrade creates the table + indexes; downgrade drops them; `down_revision == "021"`). Run: `pytest services/migrations/tests/test_migration_022.py -v` → PASS.

**Step 3 — Commit:** `feat(migrations): 022 brain_recall_events (recall activity log)`

### Task 2: `log_recall_event` helper (shared, best-effort)

**Files:**
- Create: `services/mcp-server/app/recall_log.py`
- Test: `services/mcp-server/tests/test_recall_log.py`

**Step 1 — Write the failing test** (mock session; assert INSERT params; assert exceptions are swallowed):

```python
from unittest.mock import MagicMock
import app.recall_log as rl

def test_log_recall_event_inserts_row():
    db = MagicMock()
    rl.log_recall_event(db, org_id="o", agent_id="a/claude-code",
                        project_id=None, query_text="q", result_count=3, source="hook")
    assert db.execute.called
    params = db.execute.call_args.args[1]
    assert params["org_id"] == "o" and params["result_count"] == 3
    db.commit.assert_called_once()

def test_log_recall_event_swallows_errors():
    db = MagicMock(); db.execute.side_effect = RuntimeError("boom")
    rl.log_recall_event(db, org_id="o", agent_id=None, project_id=None,
                        query_text=None, result_count=0, source="mcp")  # must not raise
```

**Step 2 — Implement** `app/recall_log.py`:

```python
"""Best-effort recall-event logging for the Klio brain.

Appends a row to brain_recall_events (migration 022) for each recall, so the
dashboard can show per-agent recall activity. SYNCHRONOUS psycopg2 I/O — call via
anyio.to_thread from async handlers (see app.capture). Every failure is swallowed
and logged: logging a recall must NEVER break the recall itself.
"""
import logging
import uuid
from typing import Any, Optional

from sqlalchemy import text

logger = logging.getLogger("agentguard.mcp.recall_log")


def log_recall_event(db: Any, *, org_id: str, agent_id: Optional[str],
                     project_id: Optional[str], query_text: Optional[str],
                     result_count: int, source: str) -> None:
    try:
        db.execute(
            text(
                """
                INSERT INTO brain_recall_events
                  (id, org_id, agent_id, project_id, query_text, result_count, source)
                VALUES (:id, :org_id, :agent_id, :project_id, :query_text,
                        :result_count, :source)
                """
            ),
            {"id": str(uuid.uuid4()), "org_id": org_id, "agent_id": agent_id,
             "project_id": project_id, "query_text": query_text,
             "result_count": result_count, "source": source},
        )
        db.commit()
    except Exception:
        logger.warning("recall log failed for org %s; ignoring", org_id, exc_info=True)
```

**Step 3 — Run** `pytest services/mcp-server/tests/test_recall_log.py -v` → PASS. **Commit.**

### Task 3: Wire logging into `POST /capture/recall`

**Files:** Modify `services/mcp-server/app/capture.py`; Test: add to `services/mcp-server/tests/test_capture.py`.

**Step 1 — Failing test** (patch `app.capture.log_recall_event`; assert it's called with `result_count` + `source="hook"` for both the recency and vector branches):

```python
def test_recall_logs_event(client):
    logged = MagicMock()
    db_patch, _ = _patch_db()
    with (db_patch,
          patch("app.capture.retrieve_memories_scoped", AsyncMock(return_value=[_memrow()])),
          patch.object(capture.brain, "find_project_id", MagicMock(return_value=None)),
          patch("app.capture.log_recall_event", logged)):
        client.post("/capture/recall", json={"query": "x"})
    assert logged.call_args.kwargs["source"] == "hook"
    assert logged.call_args.kwargs["result_count"] == 1
```

**Step 2 — Implement:** import `from app.recall_log import log_recall_event`. In `capture_recall`, after `memories` is built (both branches), before returning, add (wrapped off the loop like the other sync DB calls):

```python
        await anyio.to_thread.run_sync(
            lambda: log_recall_event(
                db, org_id=org_id, agent_id=agent_id, project_id=project_id,
                query_text=(query or None), result_count=len(memories), source="hook",
            )
        )
```

Place it inside the `try` so the `finally: db.close()` still runs; the helper itself never raises. **Step 3 — Run test → PASS.**

### Task 4: Wire logging into the MCP `recall` tool

**Files:** Modify `services/mcp-server/app/mcp_app.py` (the `recall` tool / `_perform_recall`); Test: add to `services/mcp-server/tests/test_recall_tool.py`.

**Step 1 — Read** `_perform_recall` to find where `records` are fetched + the `db`/`org_id`/`agent_id`/`project_id` are in scope. **Step 2 — Failing test** asserting `log_recall_event` is called with `source="mcp"` and the right `result_count`. **Step 3 — Implement:** import `log_recall_event`; after the records are retrieved, add a best-effort call (the tool body already does sync DB inline, so a direct call is consistent here):

```python
    log_recall_event(db, org_id=org_id, agent_id=agent_id, project_id=project_id,
                     query_text=(query or None), result_count=len(records), source="mcp")
```

(Helper swallows its own errors, so no extra guard needed.) **Step 4 — Run** `test_recall_tool.py` → PASS.

### Task 5: Full suite + lint + commit

Run `PYTHONPATH=services/shared ./.venv/bin/python -m pytest services/mcp-server/tests/ -q` (expect all green) and `ruff check`/`ruff format` the touched files. **Commit:** `feat(mcp-server): log recall events (capture/recall + MCP recall tool)`.

---

## Phase 2 — klio CLI 0.9.1: per-tool agent attribution

Repo: `/Users/thakurg/Me/klio/npm`. Build: `npm run build`. Test: `npm test` (node:test) or `node --test --import tsx tests/<f>.test.ts`.

### Task 6: `perToolAgentId` helper

**Files:** Modify `src/cloud.ts`; Test: `tests/cloud.test.ts`.

**Step 1 — Failing test:**

```ts
test("perToolAgentId appends a tool suffix to the machine id", () => {
  assert.equal(perToolAgentId("klio-host", "claude-code"), "klio-host/claude-code");
  assert.equal(perToolAgentId("klio-host", "cursor"), "klio-host/cursor");
});
```

**Step 2 — Implement** in `cloud.ts`:

```ts
/**
 * Compose a per-tool agent id from the stable machine id + a tool name, e.g.
 * "klio-host" + "cursor" → "klio-host/cursor". The `/` is header-safe and lets
 * the dashboard split on the last `/` to recover the tool. Memories stay
 * org-scoped (shared); this only sharpens provenance.
 */
export function perToolAgentId(machineId: string, tool: string): string {
  return `${machineId}/${tool}`;
}
```

**Step 3 — Run** `node --test --import tsx tests/cloud.test.ts` → PASS. **Commit.**

### Task 7: wireCloudAgents tags each tool

**Files:** Modify `src/commands/wireCloudAgents.ts`; Test: `tests/wireCloudAgents.test.ts`.

**Step 1 — Failing test:** for each adapter (cursor, claude-code, codex, claude-desktop, opencode, openclaw), assert the written `X-Vex-Agent` equals `"<agentId>/<tool>"` (e.g. cursor's `mcp.json` header is `klio-mac/cursor`; the Claude Code `add-json` payload header is `klio-mac/claude-code`).

**Step 2 — Implement:** in `wireCloudAgents`, compute the per-tool id at dispatch and pass it to the writer instead of the raw `agentId`:

```ts
import { perToolAgentId } from "../cloud.js";
// ...
    try {
      await writer({
        apiKey: opts.apiKey,
        agentId: perToolAgentId(opts.agentId, name),  // name = adapter.name()
        claudeCliFn,
      });
```

Each writer already uses `args.agentId` for its header — no per-writer change needed. **Step 3 — Run** `tests/wireCloudAgents.test.ts` → PASS (update the existing header assertions to expect the suffix).

### Task 8: hook client sends the claude-code tool id

**Files:** Modify `src/commands/hook.ts`; Test: `tests/hook.test.ts`.

**Step 1 — Failing test:** assert the `X-Vex-Agent` header on the hook's POSTs equals `"<config.agentId>/claude-code"` (config stores the base machine id):

```ts
const headers = new Headers(calls[0].init.headers);
assert.equal(headers.get("X-Vex-Agent"), "klio-test/claude-code");
```

**Step 2 — Implement:** in `postCapture`, set the agent header via `perToolAgentId(config.agentId, "claude-code")` (Claude Code is the only host that fires `klio hook`). Import `perToolAgentId` from `../cloud.js`. cloudConfig is unchanged (still stores the base id). **Step 3 — Run** `tests/hook.test.ts` → PASS.

### Task 9: bump 0.9.1 + CHANGELOG + full suite + commit

**Files:** `package.json` (0.9.0 → 0.9.1), `../CHANGELOG.md` (new `## [0.9.1]` entry: "per-tool X-Vex-Agent attribution so the dashboard distinguishes Claude Code / Cursor / Codex; re-run `klio init` to adopt").

Run `npm run build && npm test` → all green. **Commit:** `feat(npm): per-tool X-Vex-Agent attribution; bump 0.9.1`. (Publish via the existing push-to-main CI workflow — only after the user approves the push.)

---

## Phase 3 — Dashboard: Memory section + onboarding + scope fix

Repo: `/Users/thakurg/Hive/Research/AgentGuard/vex_public/Dashboard`. Gate (no JS unit-test runner in `apps/web` — only `supabase db test`): `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build` must stay green. UI components (Tasks 13–15) are built with the **frontend-design** skill against the contracts below.

### Task 10: route, paths, nav entry

**Files:**
- Modify `apps/web/config/paths.config.ts` — add `accountMemory: '/home/[account]/memory'` (+ optional `accountMemoryDetail`).
- Modify `apps/web/config/team-account-navigation.config.tsx` — add a Memory entry under the monitoring `children`, mirroring Sessions:

```tsx
import { Brain } from 'lucide-react'; // or another lucide icon
{
  label: 'agentguard:nav.memory',
  path: createPath(pathsConfig.app.accountMemory, account),
  Icon: <Brain className={iconClasses} />,
},
```

- Modify i18n `apps/web/public/locales/en/agentguard.json` — add `nav.memory` (+ later memory.* + onboarding.connect* + apiKeys.scopeMemory*).

**Gate:** typecheck + lint. **Commit:** `feat(web): Memory route + nav entry`.

### Task 11: memory loader (data contract)

**Files:** Create `apps/web/app/home/[account]/memory/_lib/server/memory.loader.ts` (mirror `sessions/_lib/server/sessions.loader.ts`: `getAgentGuardPool()` from `lib/agentguard/db.ts`, parameterized SQL, `org_id = $1`).

Functions (all take `orgId: string` resolved by `resolveOrgId(account)`):

- `loadAgentActivity(orgId)` →
  ```sql
  SELECT m.agent_id,
         COUNT(*) AS captured,
         MAX(m.created_at) AS last_captured,
         COUNT(*) FILTER (WHERE m.memory_type = 'fact')        AS facts,
         COUNT(*) FILTER (WHERE m.metadata->>'source' = 'mcp') AS via_mcp,
         COUNT(*) FILTER (WHERE m.metadata->>'source' LIKE 'hook%') AS via_hook
  FROM session_memories m
  WHERE m.org_id = $1 AND m.scope = 'org' AND m.status = 'active'
  GROUP BY m.agent_id
  ```
  then LEFT JOIN recall counts:
  ```sql
  SELECT agent_id, COUNT(*) AS recalled, MAX(created_at) AS last_recalled
  FROM brain_recall_events WHERE org_id = $1 GROUP BY agent_id
  ```
  Merge in TS by `agent_id`; derive `tool = agent_id.split('/').pop()`.
- `loadMemoryVolume(orgId, days=30)` → daily `COUNT(*)` from `session_memories` (captures) and `brain_recall_events` (recalls), `date_trunc('day', created_at)`, last N days.
- `loadMemoryList(orgId, filters, page)` → paginated `session_memories` rows (`id, agent_id, memory_type, content, project_id, metadata->>'source' AS source, created_at`) with optional WHERE on `agent_id`, `memory_type`, `source`, `project_id`, and `content ILIKE '%'||$n||'%'`; `COUNT(*) OVER() AS total_count`; `ORDER BY created_at DESC LIMIT 25 OFFSET ...` (copy sessions' pagination exactly).
- `loadMemoryDetail(orgId, id)` → one row, org-scoped.

Define exported TS types (`AgentActivityRow`, `MemoryVolumePoint`, `MemoryListRow`, `MemoryDetail`). **Gate:** typecheck. **Commit:** `feat(web): memory loaders (session_memories + brain_recall_events)`.

### Task 12: API-key `memory` scope (correctness)

**Files (all three must change):**
- `apps/web/lib/agentguard/api-keys.ts` — `ALLOWED_SCOPES = new Set(['ingest','verify','read','memory'])`.
- `apps/web/app/onboarding/_lib/server-actions.ts` — `createOnboardingKeyAction` scopes → `['ingest','verify','memory']`.
- `apps/web/app/home/[account]/settings/api-keys/_components/create-key-dialog.tsx` — add a `memory` entry to `SCOPES` (`labelKey: 'agentguard:apiKeys.scopeMemory'`, `descKey: 'agentguard:apiKeys.scopeMemoryDescription'`).
- i18n: add `apiKeys.scopeMemory` + `apiKeys.scopeMemoryDescription`.

**Gate:** typecheck + lint. **Commit:** `feat(web): grant API keys the memory scope (onboarding + UI)`.

### Task 13: Memory Overview (frontend-design)

**Files:** Create `apps/web/app/home/[account]/memory/page.tsx` (server component: `const { account } = await params; const orgId = await resolveOrgId(account);` then call the loaders; compose `TeamAccountLayoutPageHeader` + `PageBody` exactly like `sessions/page.tsx`) and `_components/agent-activity.tsx` + `_components/memory-volume-chart.tsx`.

Overview = one card per agent: tool name (from `agent_id.split('/').pop()`), captured N · recalled N · last active (relative + green "active 24h" dot) · type & source breakdown. Plus a "memories/day" area chart using `@kit/ui/chart` (`ChartContainer` + Recharts `AreaChart`) — copy `apps/web/app/home/[account]/tools/_components/tool-usage-charts.tsx`.

Build with **frontend-design** for the visual layer. **Gate:** typecheck + lint + build. **Commit.**

### Task 14: Memory Browser (frontend-design)

**Files:** `_components/memory-table.tsx` (+ optional `[id]/page.tsx` or a detail drawer). Mirror `sessions/_components/sessions-table.tsx`: `Card` + `@kit/ui/table`, URL-param filters via `useRouter`/`useSearchParams` (`agent`, `type`, `source`, `project`, `q`, `page`). Columns: type badge · content (truncated) · agent/tool · project · source · created_at. Row → detail (full content, metadata, scope, project, timestamps). Read-only — no delete. **Gate:** typecheck + lint + build. **Commit.**

### Task 15: Onboarding "Connect your agents" step (frontend-design)

**Files:**
- Create `apps/web/app/onboarding/_components/step-connect-agents.tsx` (model on `step-api-key.tsx`: `'use client'`, `onNext`/`onBack`, motion intro, a card showing `npx @klio-tech/klio@latest init` with copy-to-clipboard, a one-line explanation: "wires Claude Code / Cursor / Codex over MCP + capture hooks, so memory persists across sessions and your agent stays in the loop", and a link to the Memory section).
- Modify `apps/web/app/onboarding/_components/onboarding-wizard.tsx`: bump `TOTAL_STEPS` 5 → 6; insert `case 3: return <StepConnectAgents key="step-3" onNext={goNext} onBack={goBack} />;` and renumber InstallSdk → 4, VerifyConnection → 5.
- i18n: add `onboarding.connectAgentsTitle` / `connectAgentsDescription` / `connectAgentsCommandLabel`.

Build with **frontend-design**. **Gate:** typecheck + lint + build green. **Commit:** `feat(web): onboarding "Connect your agents" CLI step`.

### Task 16: Final verification

`pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build` → all green. Confirm the verification session view, agents, alerts pages still build unchanged. **Commit** any cleanup.

---

## Execution order & checkpoints

1. **Phase 1** (vex_engine) → run migration 022 against prod Neon + deploy (user-approved).
2. **Phase 2** (CLI 0.9.1) → push to publish (user-approved).
3. **Phase 3** (Dashboard) → ship (user-approved).

Phases 1–2 are backward-compatible; the Dashboard tolerates old single-id memories and an empty `brain_recall_events`. Each task: red → green → commit. Nothing marked done on a red test (Phases 1–2) or a failing typecheck/lint/build (Phase 3).

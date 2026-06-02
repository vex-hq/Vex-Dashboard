import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

export const MEMORY_PAGE_SIZE = 25;

/**
 * Klio Cloud memories live at the org scope and stay active. Both predicates
 * are applied on every read so we never surface project/space-scoped or
 * archived rows in the org-shared memory views.
 */
const KLIO_CLOUD_SCOPE = 'org';
const KLIO_CLOUD_STATUS = 'active';

/**
 * Derive the human-facing tool name from an `agent_id` of the shape
 * `"<machine>/<tool>"` (e.g. `klio-host/claude-code` → `claude-code`).
 * Falls back to the whole `agent_id` when there is no `/`.
 */
function deriveTool(agentId: string): string {
  if (!agentId) return 'unknown';
  const lastSlash = agentId.lastIndexOf('/');

  if (lastSlash === -1 || lastSlash === agentId.length - 1) {
    return agentId;
  }

  return agentId.slice(lastSlash + 1);
}

// ---------------------------------------------------------------------------
// loadAgentActivity
// ---------------------------------------------------------------------------

export interface AgentActivityRow {
  agent_id: string;
  tool: string;
  captured: number;
  facts: number;
  via_mcp: number;
  via_hook: number;
  last_captured: string | null;
  recalled: number;
  last_recalled: string | null;
}

interface CaptureStatRow {
  agent_id: string;
  captured: string;
  last_captured: string | null;
  facts: string;
  via_mcp: string;
  via_hook: string;
}

interface RecallStatRow {
  agent_id: string;
  recalled: string;
  last_recalled: string | null;
}

/**
 * Per-agent capture stats (from `session_memories`) full-outer-merged with
 * recall stats (from `brain_recall_events`). An agent may appear with only
 * captures, only recalls, or both. Merge happens in TS keyed by `agent_id`.
 */
export const loadAgentActivity = cache(
  async (orgId: string): Promise<AgentActivityRow[]> => {
    const pool = getAgentGuardPool();

    const [captureResult, recallResult] = await Promise.all([
      pool.query<CaptureStatRow>(
        `
        SELECT
          agent_id,
          COUNT(*) AS captured,
          MAX(created_at)::text AS last_captured,
          COUNT(*) FILTER (WHERE memory_type = 'fact') AS facts,
          COUNT(*) FILTER (WHERE metadata->>'source' = 'mcp') AS via_mcp,
          COUNT(*) FILTER (WHERE metadata->>'source' LIKE 'hook%') AS via_hook
        FROM session_memories
        WHERE org_id = $1 AND scope = $2 AND status = $3
        GROUP BY agent_id
        `,
        [orgId, KLIO_CLOUD_SCOPE, KLIO_CLOUD_STATUS],
      ),
      pool.query<RecallStatRow>(
        `
        SELECT
          agent_id,
          COUNT(*) AS recalled,
          MAX(created_at)::text AS last_recalled
        FROM brain_recall_events
        WHERE org_id = $1
        GROUP BY agent_id
        `,
        [orgId],
      ),
    ]);

    const merged = new Map<string, AgentActivityRow>();

    const ensureRow = (agentId: string): AgentActivityRow => {
      const existing = merged.get(agentId);

      if (existing) {
        return existing;
      }

      const fresh: AgentActivityRow = {
        agent_id: agentId,
        tool: deriveTool(agentId),
        captured: 0,
        facts: 0,
        via_mcp: 0,
        via_hook: 0,
        last_captured: null,
        recalled: 0,
        last_recalled: null,
      };

      merged.set(agentId, fresh);

      return fresh;
    };

    for (const row of captureResult.rows) {
      const target = ensureRow(row.agent_id);

      merged.set(row.agent_id, {
        ...target,
        captured: parseInt(row.captured, 10),
        facts: parseInt(row.facts, 10),
        via_mcp: parseInt(row.via_mcp, 10),
        via_hook: parseInt(row.via_hook, 10),
        last_captured: row.last_captured,
      });
    }

    for (const row of recallResult.rows) {
      const target = ensureRow(row.agent_id);

      merged.set(row.agent_id, {
        ...target,
        recalled: parseInt(row.recalled, 10),
        last_recalled: row.last_recalled,
      });
    }

    return [...merged.values()].sort((a, b) => b.captured - a.captured);
  },
);

// ---------------------------------------------------------------------------
// loadAgentMemorySummary
// ---------------------------------------------------------------------------

/**
 * Capture + recall summary for a SINGLE identity (agent_id), org-scoped.
 * Mirrors loadAgentActivity's aggregates but for one agent. COUNT(*) with no
 * GROUP BY always yields one row (zeros when the identity has no rows), so the
 * returned AgentActivityRow is always defined.
 */
export const loadAgentMemorySummary = cache(
  async (orgId: string, agentId: string): Promise<AgentActivityRow> => {
    const pool = getAgentGuardPool();

    const [captureResult, recallResult] = await Promise.all([
      pool.query<{
        captured: string;
        last_captured: string | null;
        facts: string;
        via_mcp: string;
        via_hook: string;
      }>(
        `
        SELECT
          COUNT(*) AS captured,
          MAX(created_at)::text AS last_captured,
          COUNT(*) FILTER (WHERE memory_type = 'fact') AS facts,
          COUNT(*) FILTER (WHERE metadata->>'source' = 'mcp') AS via_mcp,
          COUNT(*) FILTER (WHERE metadata->>'source' LIKE 'hook%') AS via_hook
        FROM session_memories
        WHERE org_id = $1 AND scope = $2 AND status = $3 AND agent_id = $4
        `,
        [orgId, KLIO_CLOUD_SCOPE, KLIO_CLOUD_STATUS, agentId],
      ),
      pool.query<{ recalled: string; last_recalled: string | null }>(
        `
        SELECT COUNT(*) AS recalled, MAX(created_at)::text AS last_recalled
        FROM brain_recall_events
        WHERE org_id = $1 AND agent_id = $2
        `,
        [orgId, agentId],
      ),
    ]);

    const cap = captureResult.rows[0];
    const rec = recallResult.rows[0];

    return {
      agent_id: agentId,
      tool: deriveTool(agentId),
      captured: parseInt(cap?.captured ?? '0', 10),
      facts: parseInt(cap?.facts ?? '0', 10),
      via_mcp: parseInt(cap?.via_mcp ?? '0', 10),
      via_hook: parseInt(cap?.via_hook ?? '0', 10),
      last_captured: cap?.last_captured ?? null,
      recalled: parseInt(rec?.recalled ?? '0', 10),
      last_recalled: rec?.last_recalled ?? null,
    };
  },
);

// ---------------------------------------------------------------------------
// loadAgentRecalls
// ---------------------------------------------------------------------------

export interface AgentRecallRow {
  id: string;
  query_text: string | null;
  result_count: number;
  source: string | null;
  created_at: string;
}

export interface AgentRecallResult {
  rows: AgentRecallRow[];
  pageCount: number;
}

/**
 * Paginated recall-activity rows for a single identity, org-scoped, newest
 * first. Backed by the (org_id, agent_id) index on brain_recall_events.
 */
export const loadAgentRecalls = cache(
  async (
    orgId: string,
    agentId: string,
    page = 1,
  ): Promise<AgentRecallResult> => {
    const pool = getAgentGuardPool();
    const effectivePage = Math.max(1, page);
    const offset = (effectivePage - 1) * MEMORY_PAGE_SIZE;

    const result = await pool.query<AgentRecallRow & { total_count: string }>(
      `
      SELECT
        id,
        query_text,
        result_count::int AS result_count,
        source,
        created_at,
        COUNT(*) OVER() AS total_count
      FROM brain_recall_events
      WHERE org_id = $1 AND agent_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
      `,
      [orgId, agentId, MEMORY_PAGE_SIZE, offset],
    );

    const totalCount = parseInt(result.rows[0]?.total_count ?? '0', 10);
    const pageCount =
      totalCount === 0 ? 0 : Math.ceil(totalCount / MEMORY_PAGE_SIZE);

    return {
      rows: result.rows.map((row) => ({
        id: row.id,
        query_text: row.query_text,
        result_count: row.result_count,
        source: row.source,
        created_at: row.created_at,
      })),
      pageCount,
    };
  },
);

// ---------------------------------------------------------------------------
// loadMemoryVolume
// ---------------------------------------------------------------------------

export interface MemoryVolumePoint {
  day: string;
  captured: number;
  recalled: number;
}

interface DailyCountRow {
  day: string;
  count: string;
}

/**
 * Daily capture counts (from `session_memories`) and daily recall counts
 * (from `brain_recall_events`) over the last `days`, merged by day in TS.
 */
export const loadMemoryVolume = cache(
  async (orgId: string, days = 30): Promise<MemoryVolumePoint[]> => {
    const pool = getAgentGuardPool();

    const [captureResult, recallResult] = await Promise.all([
      pool.query<DailyCountRow>(
        `
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
          COUNT(*) AS count
        FROM session_memories
        WHERE org_id = $1
          AND scope = $2
          AND status = $3
          AND created_at >= NOW() - ($4 || ' days')::interval
        GROUP BY day
        ORDER BY day ASC
        `,
        [orgId, KLIO_CLOUD_SCOPE, KLIO_CLOUD_STATUS, days],
      ),
      pool.query<DailyCountRow>(
        `
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
          COUNT(*) AS count
        FROM brain_recall_events
        WHERE org_id = $1
          AND created_at >= NOW() - ($2 || ' days')::interval
        GROUP BY day
        ORDER BY day ASC
        `,
        [orgId, days],
      ),
    ]);

    const byDay = new Map<string, MemoryVolumePoint>();

    const ensurePoint = (day: string): MemoryVolumePoint => {
      const existing = byDay.get(day);

      if (existing) {
        return existing;
      }

      const fresh: MemoryVolumePoint = { day, captured: 0, recalled: 0 };
      byDay.set(day, fresh);

      return fresh;
    };

    for (const row of captureResult.rows) {
      const point = ensurePoint(row.day);
      byDay.set(row.day, { ...point, captured: parseInt(row.count, 10) });
    }

    for (const row of recallResult.rows) {
      const point = ensurePoint(row.day);
      byDay.set(row.day, { ...point, recalled: parseInt(row.count, 10) });
    }

    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  },
);

// ---------------------------------------------------------------------------
// loadMemoryList
// ---------------------------------------------------------------------------

export interface MemoryFilters {
  agent_id?: string;
  memory_type?: string;
  source?: string;
  project_id?: string;
  q?: string;
  page?: number;
}

export interface MemoryListRow {
  id: string;
  agent_id: string;
  memory_type: string;
  content: string;
  project_id: string | null;
  source: string | null;
  created_at: string;
}

export interface MemoryListResult {
  rows: MemoryListRow[];
  pageCount: number;
}

interface MemoryListQueryRow extends MemoryListRow {
  total_count: string;
}

/**
 * Paginated org-shared memory rows from `session_memories`.
 *
 * The WHERE clause is assembled dynamically but every dynamic value is bound
 * as a positional parameter ($1, $2, …) — user-supplied filters are NEVER
 * string-interpolated into the SQL text, so the query is injection-safe.
 */
export const loadMemoryList = cache(
  async (
    orgId: string,
    filters?: MemoryFilters,
    page = 1,
  ): Promise<MemoryListResult> => {
    const pool = getAgentGuardPool();
    const effectivePage = Math.max(1, filters?.page ?? page);
    const offset = (effectivePage - 1) * MEMORY_PAGE_SIZE;

    const conditions: string[] = ['org_id = $1', 'scope = $2', 'status = $3'];
    const params: unknown[] = [orgId, KLIO_CLOUD_SCOPE, KLIO_CLOUD_STATUS];
    let paramIndex = params.length + 1;

    if (filters?.agent_id) {
      conditions.push(`agent_id = $${paramIndex}`);
      params.push(filters.agent_id);
      paramIndex++;
    }

    if (filters?.memory_type) {
      conditions.push(`memory_type = $${paramIndex}`);
      params.push(filters.memory_type);
      paramIndex++;
    }

    if (filters?.source) {
      conditions.push(`metadata->>'source' = $${paramIndex}`);
      params.push(filters.source);
      paramIndex++;
    }

    if (filters?.project_id) {
      conditions.push(`project_id = $${paramIndex}`);
      params.push(filters.project_id);
      paramIndex++;
    }

    if (filters?.q) {
      conditions.push(`content ILIKE '%' || $${paramIndex} || '%'`);
      params.push(filters.q);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query<MemoryListQueryRow>(
      `
      SELECT
        id,
        agent_id,
        memory_type,
        content,
        project_id,
        metadata->>'source' AS source,
        created_at,
        COUNT(*) OVER() AS total_count
      FROM session_memories
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, MEMORY_PAGE_SIZE, offset],
    );

    const totalCount = parseInt(result.rows[0]?.total_count ?? '0', 10);
    const pageCount =
      totalCount === 0 ? 0 : Math.ceil(totalCount / MEMORY_PAGE_SIZE);

    return {
      rows: result.rows.map((row) => ({
        id: row.id,
        agent_id: row.agent_id,
        memory_type: row.memory_type,
        content: row.content,
        project_id: row.project_id,
        source: row.source,
        created_at: row.created_at,
      })),
      pageCount,
    };
  },
);

// ---------------------------------------------------------------------------
// loadMemoryDetail
// ---------------------------------------------------------------------------

export interface MemoryDetailRow {
  id: string;
  org_id: string;
  agent_id: string;
  memory_type: string;
  content: string;
  scope: string;
  status: string;
  space_id: string | null;
  project_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Load a single memory row by id, always constrained to the caller's org so
 * one org can never read another org's memory.
 */
export const loadMemoryDetail = cache(
  async (orgId: string, id: string): Promise<MemoryDetailRow | null> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<MemoryDetailRow>(
      `
      SELECT
        id,
        org_id,
        agent_id,
        memory_type,
        content,
        scope,
        status,
        space_id,
        project_id,
        metadata,
        created_at
      FROM session_memories
      WHERE org_id = $1 AND id = $2
      `,
      [orgId, id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0]!;
  },
);

import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import {
  MEMORY_PAGE_SIZE,
  MEMORY_STATUS_ACTIVE,
} from './memory-visibility.types';

export { MEMORY_PAGE_SIZE } from './memory-visibility.types';

/**
 * ORG-SCOPED ROLLUPS ONLY.
 *
 * This file holds the aggregates that describe the org's shared brain: agent
 * activity, capture/recall volume and the space list. The per-tab memory lists
 * live in three separate files — `private-memory.loader`,
 * `project-memory.loader` and `team-memory.loader` — because each carries a
 * different visibility predicate and merging them into one parameterised
 * loader is exactly the mistake the user-silo design forbids.
 *
 * Nothing here may read `scope = 'private'`. These rollups are rendered to
 * everyone in the org, so a private row reaching them would disclose one
 * person's activity to the team.
 */
const KLIO_CLOUD_SCOPE = 'org';
const KLIO_CLOUD_STATUS = MEMORY_STATUS_ACTIVE;

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
// loadSpaces
// ---------------------------------------------------------------------------

export interface SpaceOptionRow {
  id: string;
  name: string;
  slug: string;
}

/**
 * All spaces belonging to an org, used to populate the memory browser's space
 * filter. Unlike the type/source/project options (derived from the current
 * page of rows), spaces come from the `spaces` table directly so the dropdown
 * offers every space the org has — including ones with no memory on page one.
 * Tenant-scoped by `org_id`, so one org can never see another org's spaces.
 */
export const loadSpaces = cache(
  async (orgId: string): Promise<SpaceOptionRow[]> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<SpaceOptionRow>(
      `
      SELECT id, name, slug
      FROM spaces
      WHERE org_id = $1
      ORDER BY name ASC
      `,
      [orgId],
    );

    return result.rows;
  },
);

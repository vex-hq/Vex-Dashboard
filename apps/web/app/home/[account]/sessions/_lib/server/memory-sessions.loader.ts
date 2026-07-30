import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

export const MEMORY_SESSIONS_PAGE_SIZE = 25;

/**
 * A single session can hold thousands of memories — the largest in production
 * holds ~2,900 — so the detail view pages through them rather than loading the
 * whole session at once.
 */
export const SESSION_MEMORIES_PAGE_SIZE = 50;

/**
 * Time-range filter values accepted by the session views, mapped to a day count
 * that is passed to Postgres as a bound parameter. A whitelist rather than a
 * free-form interval string so nothing user-supplied reaches the SQL text.
 */
const TIME_RANGE_DAYS = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
} as const;

export type MemorySessionTimeRange = keyof typeof TIME_RANGE_DAYS;

export function isMemorySessionTimeRange(
  value: string | undefined,
): value is MemorySessionTimeRange {
  return value !== undefined && value in TIME_RANGE_DAYS;
}

/**
 * Memory types that read as a deliberate act by the agent rather than ambient
 * capture — `decide`, `plan` and `note` all land here. Counted together in the
 * list view because individually they are rare and together they are the signal
 * a human scanning the list is looking for.
 */
const DELIBERATE_MEMORY_TYPES = ['decision', 'plan', 'note'];

export interface MemorySessionFilters {
  agentId?: string;
  memoryType?: string;
  timeRange?: MemorySessionTimeRange;
  page?: number;
}

export interface MemorySessionRow {
  session_id: string;
  /** The agent that wrote the most memories in this session. */
  primary_agent_id: string;
  /** Distinct agents that wrote into this session — usually 1, sometimes more. */
  agent_count: number;
  captured: number;
  /** Active and not hidden from recall: what another agent can actually find. */
  recallable: number;
  facts: number;
  observations: number;
  summaries: number;
  deliberate: number;
  first_captured: string;
  last_captured: string;
}

export interface MemorySessionListResult {
  rows: MemorySessionRow[];
  pageCount: number;
}

interface MemorySessionQueryRow {
  session_id: string;
  primary_agent_id: string;
  agent_count: string;
  captured: string;
  recallable: string;
  facts: string;
  observations: string;
  summaries: string;
  deliberate: string;
  first_captured: string;
  last_captured: string;
  total_count: string;
}

/**
 * Shared aggregate expressions for a group of `session_memories` rows. Used by
 * both the list and the detail header so the two views can never disagree about
 * what "captured" or "recallable" means.
 *
 * `recallable` mirrors the engine's recall predicate: a memory is findable by
 * another agent only while it is `active` and not `recall_hidden`.
 */
const SESSION_AGGREGATES = `
  MODE() WITHIN GROUP (ORDER BY agent_id) AS primary_agent_id,
  COUNT(DISTINCT agent_id) AS agent_count,
  COUNT(*) AS captured,
  COUNT(*) FILTER (
    WHERE status = 'active' AND recall_hidden = FALSE
  ) AS recallable,
  COUNT(*) FILTER (WHERE memory_type = 'fact') AS facts,
  COUNT(*) FILTER (WHERE memory_type = 'observation') AS observations,
  COUNT(*) FILTER (WHERE memory_type = 'summary') AS summaries,
  COUNT(*) FILTER (
    WHERE memory_type = ANY($2::text[])
  ) AS deliberate,
  MIN(created_at)::text AS first_captured,
  MAX(created_at)::text AS last_captured
`;

function toMemorySessionRow(row: MemorySessionQueryRow): MemorySessionRow {
  return {
    session_id: row.session_id,
    primary_agent_id: row.primary_agent_id,
    agent_count: parseInt(row.agent_count, 10),
    captured: parseInt(row.captured, 10),
    recallable: parseInt(row.recallable, 10),
    facts: parseInt(row.facts, 10),
    observations: parseInt(row.observations, 10),
    summaries: parseInt(row.summaries, 10),
    deliberate: parseInt(row.deliberate, 10),
    first_captured: row.first_captured,
    last_captured: row.last_captured,
  };
}

/**
 * Paginated list of working sessions for an org, most recently active first.
 *
 * Grouped by `session_id` alone — not by `(session_id, agent_id)` — because a
 * session shared by two agents is the interesting case for a shared-memory
 * product, and splitting it into two rows would hide exactly that. The agent
 * columns therefore report the dominant agent plus how many took part.
 *
 * All scopes are included. The memory browser deliberately shows only
 * `scope = 'org'` because that is the org-shared view; a session view answers a
 * different question — "what did this piece of work produce" — and answering it
 * honestly means counting the agent- and session-scoped rows too, with
 * `recallable` distinguishing what other agents can actually find.
 */
export const loadMemorySessionList = cache(
  async (
    orgId: string,
    filters?: MemorySessionFilters,
  ): Promise<MemorySessionListResult> => {
    const pool = getAgentGuardPool();
    const page = Math.max(1, filters?.page ?? 1);
    const offset = (page - 1) * MEMORY_SESSIONS_PAGE_SIZE;

    const conditions = ['org_id = $1'];
    const params: unknown[] = [orgId, DELIBERATE_MEMORY_TYPES];
    let paramIndex = 3;

    if (filters?.agentId) {
      conditions.push(`agent_id = $${paramIndex}`);
      params.push(filters.agentId);
      paramIndex++;
    }

    if (filters?.memoryType) {
      conditions.push(`memory_type = $${paramIndex}`);
      params.push(filters.memoryType);
      paramIndex++;
    }

    if (filters?.timeRange) {
      conditions.push(
        `created_at >= NOW() - ($${paramIndex} || ' days')::interval`,
      );
      params.push(TIME_RANGE_DAYS[filters.timeRange]);
      paramIndex++;
    }

    const result = await pool.query<MemorySessionQueryRow>(
      `
      WITH grouped AS (
        SELECT
          session_id,
          ${SESSION_AGGREGATES}
        FROM session_memories
        WHERE ${conditions.join(' AND ')}
        GROUP BY session_id
      )
      SELECT *, COUNT(*) OVER() AS total_count
      FROM grouped
      ORDER BY last_captured DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, MEMORY_SESSIONS_PAGE_SIZE, offset],
    );

    const totalCount = parseInt(result.rows[0]?.total_count ?? '0', 10);

    return {
      rows: result.rows.map(toMemorySessionRow),
      pageCount:
        totalCount === 0
          ? 0
          : Math.ceil(totalCount / MEMORY_SESSIONS_PAGE_SIZE),
    };
  },
);

/**
 * The distinct agents that have written memory for this org, for the filter
 * dropdown. Sourced from `session_memories` rather than the `agents` table:
 * `agents` is populated by the Vex SDK, so a Klio-only org has rows here and
 * none there.
 */
export const loadMemorySessionAgents = cache(
  async (orgId: string): Promise<string[]> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<{ agent_id: string }>(
      `
      SELECT DISTINCT agent_id
      FROM session_memories
      WHERE org_id = $1
      ORDER BY agent_id
      `,
      [orgId],
    );

    return result.rows.map((row) => row.agent_id);
  },
);

/** The memory types present for this org, for the filter dropdown. */
export const loadMemorySessionTypes = cache(
  async (orgId: string): Promise<string[]> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<{ memory_type: string }>(
      `
      SELECT DISTINCT memory_type
      FROM session_memories
      WHERE org_id = $1
      ORDER BY memory_type
      `,
      [orgId],
    );

    return result.rows.map((row) => row.memory_type);
  },
);

export interface MemorySessionHeader extends MemorySessionRow {
  /** Every agent that wrote into the session, most prolific first. */
  agents: Array<{ agent_id: string; captured: number }>;
}

/**
 * Aggregates for one session, or `null` when the org has no memory under that
 * `session_id`. The `null` return is what makes the detail route safe against a
 * guessed or cross-tenant id: the org predicate is inside the query, so another
 * org's session reads as not-found.
 */
export const loadMemorySessionHeader = cache(
  async (
    sessionId: string,
    orgId: string,
  ): Promise<MemorySessionHeader | null> => {
    const pool = getAgentGuardPool();

    const [aggregateResult, agentResult] = await Promise.all([
      pool.query<MemorySessionQueryRow>(
        `
        SELECT
          session_id,
          ${SESSION_AGGREGATES}
        FROM session_memories
        WHERE org_id = $1 AND session_id = $3
        GROUP BY session_id
        `,
        [orgId, DELIBERATE_MEMORY_TYPES, sessionId],
      ),
      pool.query<{ agent_id: string; captured: string }>(
        `
        SELECT agent_id, COUNT(*) AS captured
        FROM session_memories
        WHERE org_id = $1 AND session_id = $2
        GROUP BY agent_id
        ORDER BY COUNT(*) DESC, agent_id ASC
        `,
        [orgId, sessionId],
      ),
    ]);

    const row = aggregateResult.rows[0];

    if (!row) {
      return null;
    }

    return {
      ...toMemorySessionRow(row),
      agents: agentResult.rows.map((agent) => ({
        agent_id: agent.agent_id,
        captured: parseInt(agent.captured, 10),
      })),
    };
  },
);

export interface SessionMemoryEntry {
  id: string;
  agent_id: string;
  memory_type: string;
  content: string;
  confidence: number | null;
  scope: string;
  status: string;
  source: string | null;
  recall_hidden: boolean;
  superseded_by: string | null;
  space_name: string | null;
  project_id: string | null;
  created_at: string;
}

export interface SessionMemoriesResult {
  rows: SessionMemoryEntry[];
  pageCount: number;
}

interface SessionMemoryQueryRow extends Omit<SessionMemoryEntry, 'confidence'> {
  confidence: string | null;
  total_count: string;
}

/**
 * One page of the memories a session produced, oldest first, so the page reads
 * as the trail the work left behind.
 *
 * Ordered by `created_at` with `sequence_number` only as a tiebreak:
 * `sequence_number` is populated for session-scoped writes but null for the
 * bulk of hook-captured rows, so it cannot carry the ordering on its own.
 */
export const loadSessionMemories = cache(
  async (
    sessionId: string,
    orgId: string,
    page = 1,
  ): Promise<SessionMemoriesResult> => {
    const pool = getAgentGuardPool();
    const effectivePage = Math.max(1, page);
    const offset = (effectivePage - 1) * SESSION_MEMORIES_PAGE_SIZE;

    const result = await pool.query<SessionMemoryQueryRow>(
      `
      SELECT
        m.id,
        m.agent_id,
        m.memory_type,
        m.content,
        m.confidence,
        m.scope,
        m.status,
        m.metadata->>'source' AS source,
        m.recall_hidden,
        m.superseded_by,
        s.name AS space_name,
        m.project_id,
        m.created_at::text AS created_at,
        COUNT(*) OVER() AS total_count
      FROM session_memories m
      LEFT JOIN spaces s ON s.id = m.space_id
      WHERE m.org_id = $1 AND m.session_id = $2
      ORDER BY m.created_at ASC, m.sequence_number ASC NULLS LAST, m.id ASC
      LIMIT $3 OFFSET $4
      `,
      [orgId, sessionId, SESSION_MEMORIES_PAGE_SIZE, offset],
    );

    const totalCount = parseInt(result.rows[0]?.total_count ?? '0', 10);

    return {
      rows: result.rows.map((row) => ({
        id: row.id,
        agent_id: row.agent_id,
        memory_type: row.memory_type,
        content: row.content,
        confidence: row.confidence === null ? null : Number(row.confidence),
        scope: row.scope,
        status: row.status,
        source: row.source,
        recall_hidden: row.recall_hidden,
        superseded_by: row.superseded_by,
        space_name: row.space_name,
        project_id: row.project_id,
        created_at: row.created_at,
      })),
      pageCount:
        totalCount === 0
          ? 0
          : Math.ceil(totalCount / SESSION_MEMORIES_PAGE_SIZE),
    };
  },
);

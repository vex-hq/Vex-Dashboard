import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import {
  type ArtifactCardRow,
  MEMORY_PAGE_SIZE,
  MEMORY_STATUS_ACTIVE,
  type MemoryListResult,
  type MemoryListRow,
  pageCountFor,
  pageWindow,
  toCount,
} from './memory-visibility.types';

/**
 * The **Team** tab — the org-scoped shared brain, readable by everyone in the
 * org.
 *
 * `scope = 'org'` is hard-coded, exactly as it was in the loader this replaces
 * (`memory.loader#loadMemoryList`). The move is not cosmetic: with `private`
 * and `project` scopes now real boundaries, the tab that reads `org` gets its
 * own file so that a change to it can never accidentally widen either of the
 * other two.
 *
 * Existing rows (all ~35k of them) are org-scoped with `user_id IS NULL` and
 * stay visible here — decision 6 of the user-silo design deliberately does not
 * retro-hide a team's accumulated brain.
 */
const ORG_SCOPE = 'org';

export interface TeamMemoryFilters {
  agent_id?: string;
  memory_type?: string;
  source?: string;
  provenance?: string;
  project_id?: string;
  space_id?: string;
  q?: string;
  page?: number;
}

interface TeamMemoryQueryRow extends MemoryListRow {
  total_count: string;
}

/**
 * Paginated org-shared memories, LEFT JOINed to `spaces` for the space name.
 * The join is itself org-scoped (`s.org_id = m.org_id`) so a space id shared
 * across tenants could never surface another org's space name.
 *
 * The WHERE clause is assembled dynamically but every dynamic value is bound
 * as a positional parameter — user-supplied filters are NEVER interpolated
 * into the SQL text.
 */
export const loadTeamMemories = cache(
  async (
    orgId: string,
    filters?: TeamMemoryFilters,
    page = 1,
  ): Promise<MemoryListResult> => {
    const pool = getAgentGuardPool();
    const { offset } = pageWindow(filters?.page ?? page);

    const conditions: string[] = [
      'm.org_id = $1',
      'm.scope = $2',
      'm.status = $3',
    ];
    const params: unknown[] = [orgId, ORG_SCOPE, MEMORY_STATUS_ACTIVE];
    let paramIndex = params.length + 1;

    const addFilter = (clause: (index: number) => string, value: unknown) => {
      conditions.push(clause(paramIndex));
      params.push(value);
      paramIndex++;
    };

    if (filters?.agent_id) {
      addFilter((i) => `m.agent_id = $${i}`, filters.agent_id);
    }

    if (filters?.memory_type) {
      addFilter((i) => `m.memory_type = $${i}`, filters.memory_type);
    }

    if (filters?.source) {
      addFilter((i) => `m.metadata->>'source' = $${i}`, filters.source);
    }

    if (filters?.provenance) {
      addFilter((i) => `m.provenance = $${i}`, filters.provenance);
    }

    if (filters?.project_id) {
      addFilter((i) => `m.project_id = $${i}`, filters.project_id);
    }

    if (filters?.space_id) {
      addFilter((i) => `m.space_id = $${i}`, filters.space_id);
    }

    if (filters?.q) {
      addFilter((i) => `m.content ILIKE '%' || $${i} || '%'`, filters.q);
    }

    const result = await pool.query<TeamMemoryQueryRow>(
      `
      SELECT
        m.id,
        m.agent_id,
        m.memory_type,
        m.content,
        m.provenance,
        m.project_id,
        m.space_id,
        s.name AS space_name,
        m.metadata->>'source' AS source,
        m.created_at,
        COUNT(*) OVER() AS total_count
      FROM session_memories m
      LEFT JOIN spaces s ON s.id = m.space_id AND s.org_id = m.org_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, MEMORY_PAGE_SIZE, offset],
    );

    return {
      rows: result.rows.map((row) => ({
        id: row.id,
        agent_id: row.agent_id,
        memory_type: row.memory_type,
        content: row.content,
        provenance: row.provenance,
        project_id: row.project_id,
        space_id: row.space_id,
        space_name: row.space_name,
        source: row.source,
        created_at: row.created_at,
      })),
      pageCount: pageCountFor(toCount(result.rows[0]?.total_count)),
    };
  },
);

/** Org-scoped artifacts, visible to everyone in the org. */
export const loadTeamArtifacts = cache(
  async (orgId: string, limit = 24): Promise<ArtifactCardRow[]> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<
      Omit<ArtifactCardRow, 'size_bytes'> & { size_bytes: string | null }
    >(
      `
      SELECT
        a.id,
        m.id AS memory_id,
        a.title,
        a.summary,
        a.kind,
        a.mime_type,
        a.size_bytes,
        m.created_at
      FROM session_memories m
      JOIN artifacts a
        ON a.id::text = m.metadata->>'artifact_id'
       AND a.org_id = m.org_id
      WHERE m.org_id = $1
        AND m.scope = $2
        AND m.status = $3
        AND m.memory_type = 'artifact'
        AND a.status = 'active'
      ORDER BY m.created_at DESC
      LIMIT $4
      `,
      [orgId, ORG_SCOPE, MEMORY_STATUS_ACTIVE, limit],
    );

    return result.rows.map((row) => ({
      ...row,
      size_bytes: row.size_bytes === null ? null : toCount(row.size_bytes),
    }));
  },
);

export interface OrgStorageTotal {
  memories: number;
  content_bytes: number;
  artifact_bytes: number;
}

/**
 * ONE org-wide storage total, for capacity and billing.
 *
 * Deliberately a single aggregate with **no GROUP BY**. The design allows
 * admins a whole-organisation number and nothing finer: a per-member
 * breakdown — even a bare count — discloses who is most active, who is storing
 * a lot and who went quiet. The private scope is opaque from outside including
 * its shape, so this function must never grow a `user_id` in its SELECT list.
 *
 * The number spans every scope because storage does; no content, owner or
 * shape of anyone's private scope is returned or returnable from it.
 */
export const loadOrgStorageTotal = cache(
  async (orgId: string): Promise<OrgStorageTotal> => {
    const pool = getAgentGuardPool();

    const [memoryResult, artifactResult] = await Promise.all([
      pool.query<{ memories: string; content_bytes: string | null }>(
        `
        SELECT
          COUNT(*) AS memories,
          COALESCE(SUM(octet_length(content)), 0) AS content_bytes
        FROM session_memories
        WHERE org_id = $1 AND status = $2
        `,
        [orgId, MEMORY_STATUS_ACTIVE],
      ),
      pool.query<{ artifact_bytes: string | null }>(
        `
        SELECT COALESCE(SUM(size_bytes), 0) AS artifact_bytes
        FROM artifacts
        WHERE org_id = $1 AND status = 'active'
        `,
        [orgId],
      ),
    ]);

    return {
      memories: toCount(memoryResult.rows[0]?.memories),
      content_bytes: toCount(memoryResult.rows[0]?.content_bytes),
      artifact_bytes: toCount(artifactResult.rows[0]?.artifact_bytes),
    };
  },
);

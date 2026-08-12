import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * The home stream: context items across everything the viewer can read.
 *
 * VISIBILITY IS INHERITED, NEVER RESTATED. Each UNIONed arm below is copied
 * from the silo loader that owns that scope; change those files first and
 * mirror here, never the reverse:
 *   - org arm      -> memory/_lib/server/team-memory.loader.ts
 *   - private arm  -> memory/_lib/server/private-memory.loader.ts
 *   - project arm  -> memory/_lib/server/project-memory.loader.ts (EXISTS
 *                     against project_members; membership in SQL, never TS)
 *
 * `recall_hidden` is filtered exactly as
 * `sessions/_lib/server/memory-sessions.loader.ts` filters it for its
 * `recallable` aggregate (`status = 'active' AND recall_hidden = FALSE`) —
 * the stream is a recall-shaped feed, so a memory that opted out of recall
 * must not resurface here either.
 */
const KINDS = new Set(['decision', 'plan', 'fact', 'note'] as const);
type KnownKind = 'decision' | 'plan' | 'fact' | 'note';

export interface ContextItem {
  id: string;
  kind: 'decision' | 'plan' | 'fact' | 'note' | 'other';
  content: string;
  scope: string;
  projectId: string | null;
  projectName: string | null;
  agentId: string | null;
  userId: string | null;
  createdAt: string; // ISO
  supersededBy: string | null; // id of the replacement, null = active
}

export interface StreamFilters {
  projectId?: string;
  agentId?: string;
  kind?: string;
  days?: number;
}

interface ContextStreamQueryRow {
  id: string;
  memory_type: string;
  content: string;
  scope: string;
  project_id: string | null;
  project_name: string | null;
  agent_id: string | null;
  user_id: string | null;
  created_at: string;
  superseded_by: string | null;
}

function isKnownKind(kind: string): kind is KnownKind {
  return KINDS.has(kind as KnownKind);
}

function toItem(row: ContextStreamQueryRow): ContextItem {
  return {
    id: row.id,
    kind: isKnownKind(row.memory_type) ? row.memory_type : 'other',
    content: row.content,
    scope: row.scope,
    projectId: row.project_id,
    projectName: row.project_name,
    agentId: row.agent_id,
    userId: row.user_id,
    createdAt: row.created_at,
    supersededBy: row.superseded_by,
  };
}

/**
 * Context items across every scope the viewer can read, newest first.
 *
 * @param orgId - The caller's org. Tenancy boundary, as everywhere else.
 * @param viewerUserId - The signed-in caller's user id, or `null` for an
 *   unattributed request (e.g. an API key with no `created_by`). A `null`
 *   viewer sees only `org`-scoped rows — the private and project arms are
 *   omitted from the SQL entirely rather than post-filtered.
 * @param filters - Optional narrowing by project, agent, kind and recency.
 * @param limit - Max rows returned, default 50.
 */
export const loadContextStream = cache(
  async (
    orgId: string,
    viewerUserId: string | null,
    filters: StreamFilters,
    limit = 50,
  ): Promise<ContextItem[]> => {
    const pool = getAgentGuardPool();
    const params: unknown[] = [orgId];
    const p = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    // Each arm mirrors its silo source's predicate exactly; see file header.
    const arms: string[] = [`(m.scope = 'org')`];
    if (viewerUserId) {
      const viewer = p(viewerUserId);
      arms.push(`(m.scope = 'private' AND m.user_id = ${viewer})`);
      arms.push(`(m.scope = 'project' AND EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = m.project_id AND pm.user_id = ${viewer}
      ))`);
    }

    const extra: string[] = [];
    if (filters.projectId) {
      extra.push(`m.project_id = ${p(filters.projectId)}`);
    }
    if (filters.agentId) {
      extra.push(`m.agent_id = ${p(filters.agentId)}`);
    }
    if (filters.kind && isKnownKind(filters.kind)) {
      extra.push(`m.memory_type = ${p(filters.kind)}`);
    }
    if (filters.days) {
      extra.push(
        `m.created_at > now() - (${p(filters.days)} || ' days')::interval`,
      );
    }

    const limitParam = p(limit);

    const { rows } = await pool.query<ContextStreamQueryRow>(
      `
      SELECT
        m.id,
        m.memory_type,
        m.content,
        m.scope,
        m.project_id,
        pr.display_name AS project_name,
        m.agent_id,
        m.user_id,
        m.created_at::text AS created_at,
        m.superseded_by
      FROM session_memories m
      LEFT JOIN projects pr ON pr.id = m.project_id AND pr.org_id = m.org_id
      WHERE m.org_id = $1
        AND m.status IN ('active', 'superseded')
        AND m.recall_hidden = FALSE
        AND (${arms.join(' OR ')})
        ${extra.length ? `AND ${extra.join(' AND ')}` : ''}
      ORDER BY m.created_at DESC
      LIMIT ${limitParam}
      `,
      params,
    );

    return rows.map(toItem);
  },
);

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

export interface ProjectPulseRow {
  projectId: string;
  name: string;
  itemsThisWeek: number;
  lastItemAt: string | null;
  agentsActive: string[];
}

interface ProjectPulseQueryRow {
  project_id: string;
  name: string;
  items_this_week: string;
  last_item_at: string | null;
  agents_active: string[];
}

function toPulseRow(row: ProjectPulseQueryRow): ProjectPulseRow {
  return {
    projectId: row.project_id,
    name: row.name,
    itemsThisWeek: parseInt(row.items_this_week, 10) || 0,
    lastItemAt: row.last_item_at,
    agentsActive: row.agents_active,
  };
}

/**
 * Per-project activity over the last 7 days, for the "what's moving" widget.
 *
 * Same three inherited visibility arms as {@link loadContextStream} — see
 * the file header. Membership is enforced in SQL via the same
 * `project_members` EXISTS check, never by fetching a wider set and
 * filtering in TypeScript.
 */
export const loadProjectPulse = cache(
  async (
    orgId: string,
    viewerUserId: string | null,
  ): Promise<ProjectPulseRow[]> => {
    const pool = getAgentGuardPool();
    const params: unknown[] = [orgId];
    const p = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    const arms: string[] = [`(m.scope = 'org')`];
    if (viewerUserId) {
      const viewer = p(viewerUserId);
      arms.push(`(m.scope = 'private' AND m.user_id = ${viewer})`);
      arms.push(`(m.scope = 'project' AND EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = m.project_id AND pm.user_id = ${viewer}
      ))`);
    }

    const { rows } = await pool.query<ProjectPulseQueryRow>(
      `
      SELECT
        pr.id AS project_id,
        pr.display_name AS name,
        COUNT(m.id) AS items_this_week,
        MAX(m.created_at)::text AS last_item_at,
        array_agg(DISTINCT m.agent_id) FILTER (
          WHERE m.agent_id IS NOT NULL
        ) AS agents_active
      FROM projects pr
      LEFT JOIN session_memories m
        ON m.project_id = pr.id
       AND m.org_id = pr.org_id
       AND m.status IN ('active', 'superseded')
       AND m.recall_hidden = FALSE
       AND m.created_at > now() - interval '7 days'
       AND (${arms.join(' OR ')})
      WHERE pr.org_id = $1
      GROUP BY pr.id, pr.display_name
      ORDER BY last_item_at DESC NULLS LAST
      `,
      params,
    );

    return rows.map((row) =>
      toPulseRow({
        ...row,
        agents_active: row.agents_active ?? [],
      }),
    );
  },
);

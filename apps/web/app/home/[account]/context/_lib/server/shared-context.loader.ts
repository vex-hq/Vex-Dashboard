import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import {
  CONTEXT_GROUP_LIMIT,
  CONTEXT_SCOPE_ORG,
  CONTEXT_STATUS_ACTIVE,
  type ContextGroup,
  type ContextListItem,
  toContextCount,
} from './context-surfaces.types';

/**
 * The **Shared with your team** half of the context split.
 *
 * `scope = 'org'` is hard-coded into the SQL text. There is no scope argument,
 * no viewer argument and no branch: this loader answers exactly one question,
 * "what can everybody in this org read", and it is rendered to everybody in
 * the org.
 *
 * NOTHING HERE MAY EVER READ `scope = 'private'`. That is the Aug-11 rule
 * ("org-scoped rollups must never read `scope = 'private'`") restated as code
 * rather than as a comment on a parameterised query. A private row reaching
 * this result set would disclose one person's context to their whole team —
 * which is precisely the boundary the split exists to make visible.
 *
 * WHY THIS IS A SEPARATE FILE FROM `my-private-context.loader`: the two groups
 * on the same screen are two queries with two predicates, never one query with
 * a scope parameter. A single `loadContextGroup(scope)` can be called with the
 * wrong scope; these two cannot. The duplication IS the safety property — see
 * `memory/_lib/server/private-memory.loader.ts`'s header for the longer
 * argument, which this file inherits wholesale.
 *
 * `project` scope is deliberately absent from this group. A project-scoped row
 * is readable by that project's members, not by the org, so it is neither
 * "shared with your team" in the org sense nor private; it belongs to the
 * project pane (`projects/[projectId]`), which already gates it on
 * `project_members`.
 */
interface SharedContextQueryRow {
  id: string;
  memory_type: string;
  content: string;
  project_id: string | null;
  project_name: string | null;
  agent_id: string | null;
  created_at: string;
  total_count: string;
}

function toItem(row: SharedContextQueryRow): ContextListItem {
  return {
    id: row.id,
    kind: row.memory_type,
    content: row.content,
    projectId: row.project_id,
    projectName: row.project_name,
    agentId: row.agent_id,
    createdAt: row.created_at,
  };
}

/**
 * Org-shared context items, newest first, capped at
 * {@link CONTEXT_GROUP_LIMIT}, with the honest total alongside.
 *
 * @param orgId - The caller's org, resolved by `resolveOrgId` (which asserts
 *   account membership before it hands one back). Tenancy boundary.
 */
export const loadSharedContext = cache(
  async (orgId: string): Promise<ContextGroup> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<SharedContextQueryRow>(
      `
      SELECT
        m.id,
        m.memory_type,
        m.content,
        m.project_id,
        pr.display_name AS project_name,
        m.agent_id,
        m.created_at::text AS created_at,
        COUNT(*) OVER() AS total_count
      FROM session_memories m
      LEFT JOIN projects pr ON pr.id = m.project_id AND pr.org_id = m.org_id
      WHERE m.org_id = $1
        AND m.scope = $2
        AND m.status = $3
        AND m.recall_hidden = FALSE
      ORDER BY m.created_at DESC
      LIMIT $4
      `,
      [orgId, CONTEXT_SCOPE_ORG, CONTEXT_STATUS_ACTIVE, CONTEXT_GROUP_LIMIT],
    );

    return {
      items: result.rows.map(toItem),
      total: toContextCount(result.rows[0]?.total_count),
    };
  },
);

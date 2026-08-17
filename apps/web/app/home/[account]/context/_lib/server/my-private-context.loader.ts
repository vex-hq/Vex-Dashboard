import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import {
  CONTEXT_GROUP_LIMIT,
  CONTEXT_SCOPE_PRIVATE,
  CONTEXT_STATUS_ACTIVE,
  type ContextGroup,
  type ContextListItem,
  toContextCount,
} from './context-surfaces.types';

/**
 * The **Only you** half of the context split — one person's private context,
 * and nobody else's.
 *
 * The query hard-codes `scope = 'private'` AND `user_id = <the signed-in
 * caller>`. There is no scope argument and no "viewer" argument distinct from
 * the owner: the only user id this function accepts is the caller's own, taken
 * from the session by `loadAccountViewer`, never from a URL segment, a query
 * string or a form field.
 *
 * ADMINS GET NOTHING HERE. No admin variant, no "as user" parameter, no
 * break-glass path — per the user-silo design (2026-08-01), a private scope an
 * administrator can read is not private. This mirrors
 * `memory/_lib/server/private-memory.loader.ts` exactly, deliberately: the
 * shared/private split is a new SURFACE over the same boundary, not a new
 * boundary, and a second query path with hand-rolled tenancy is where leaks
 * are born.
 *
 * Pre-031 rows carry `user_id IS NULL`; `user_id = $2` never matches NULL, so
 * legacy org rows cannot appear in a private group.
 */

/**
 * Fail closed on a blank/absent user id.
 *
 * A caller that lost its session and passed `''` would otherwise run
 * `user_id = ''`. That matches nothing today, but a privacy boundary must not
 * depend on a value comparing unequal by luck.
 */
function assertOwnerId(userId: string): string {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error(
      'loadMyPrivateContext: a non-blank user id is required. Private ' +
        'context is readable only by its owner, so there is no ' +
        'unattributed variant.',
    );
  }

  return userId;
}

interface PrivateContextQueryRow {
  id: string;
  memory_type: string;
  content: string;
  project_id: string | null;
  project_name: string | null;
  agent_id: string | null;
  created_at: string;
  total_count: string;
}

function toItem(row: PrivateContextQueryRow): ContextListItem {
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
 * The caller's own private context, newest first, capped at
 * {@link CONTEXT_GROUP_LIMIT}, with the honest total alongside.
 *
 * @param orgId - Tenancy boundary, as everywhere else.
 * @param userId - The SIGNED-IN caller's user id.
 */
export const loadMyPrivateContext = cache(
  async (orgId: string, userId: string): Promise<ContextGroup> => {
    const pool = getAgentGuardPool();
    const owner = assertOwnerId(userId);

    const result = await pool.query<PrivateContextQueryRow>(
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
        AND m.user_id = $2
        AND m.scope = $3
        AND m.status = $4
        AND m.recall_hidden = FALSE
      ORDER BY m.created_at DESC
      LIMIT $5
      `,
      [
        orgId,
        owner,
        CONTEXT_SCOPE_PRIVATE,
        CONTEXT_STATUS_ACTIVE,
        CONTEXT_GROUP_LIMIT,
      ],
    );

    return {
      items: result.rows.map(toItem),
      total: toContextCount(result.rows[0]?.total_count),
    };
  },
);

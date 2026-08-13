import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * Newest memory the signed-in viewer may read. Used only to pick the
 * onboarding landing URL — see `activationHref`.
 *
 * Visibility matches `loadContextStream`: org rows, the viewer's own
 * private rows, and project-scoped rows they hold a `project_members`
 * row for. No admin widening. Blank user id fails closed.
 */
export interface LatestVisibleWrite {
  id: string;
  projectId: string | null;
}

function assertUserId(userId: string): string {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('loadLatestVisibleWrite: a non-blank user id is required.');
  }

  return userId;
}

export const loadLatestVisibleWrite = cache(
  async (
    orgId: string,
    viewerUserId: string,
  ): Promise<LatestVisibleWrite | null> => {
    const viewer = assertUserId(viewerUserId);
    const pool = getAgentGuardPool();
    const params: unknown[] = [orgId, viewer];

    const { rows } = await pool.query<{
      id: string;
      project_id: string | null;
    }>(
      `
      SELECT m.id, m.project_id
      FROM session_memories m
      WHERE m.org_id = $1
        AND m.status IN ('active', 'superseded')
        AND m.recall_hidden = FALSE
        AND (
          m.scope = 'org'
          OR (m.scope = 'private' AND m.user_id = $2)
          OR (
            m.scope = 'project'
            AND EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = m.project_id
                AND pm.user_id = $2
            )
          )
        )
      ORDER BY m.created_at DESC
      LIMIT 1
      `,
      params,
    );

    const row = rows[0];
    if (!row) return null;

    return { id: row.id, projectId: row.project_id };
  },
);

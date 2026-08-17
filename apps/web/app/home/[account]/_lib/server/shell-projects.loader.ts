import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import {
  SHELL_SCOPE_ORG,
  SHELL_SCOPE_PRIVATE,
  SHELL_STATUS_ACTIVE,
  type ShellProject,
} from './shell-context.types';

/**
 * Projects with the count of context items in each and the age of the newest.
 *
 * Backs the prototype's Projects screen: Project · Items · Last.
 *
 * THE COUNT IS THE CALLER'S VIEW, NOT THE PROJECT'S TRUE SIZE. It counts only
 * rows this caller may see — org-scoped rows plus their own private ones — so
 * two members of the same org can legitimately see different numbers for the
 * same project. The alternative (counting every row regardless of scope) would
 * leak the size of colleagues' private context through a number, which is a
 * smaller leak than showing the rows but a leak all the same.
 *
 * The same two hard-coded scope branches as `shell-context.loader`, and for
 * the same reason: no scope argument, no viewer argument beyond the caller.
 *
 * Rows with no project are grouped under a null id and rendered as `unfiled`
 * by the screen, matching the prototype's fixture. They are not dropped —
 * unfiled context is still context, and hiding it would make the item counts
 * on this screen disagree with the total on Home.
 */
export const loadShellProjects = cache(
  async (orgId: string, userId: string): Promise<ShellProject[]> => {
    const pool = getAgentGuardPool();

    if (!userId) {
      throw new Error('loadShellProjects requires a signed-in user id');
    }

    const result = await pool.query<ShellProjectQueryRow>(
      `
      SELECT
        m.project_id AS id,
        pr.display_name AS name,
        COUNT(*) AS items,
        MAX(m.created_at)::text AS last
      FROM session_memories m
      LEFT JOIN projects pr ON pr.id = m.project_id AND pr.org_id = $1
      WHERE m.org_id = $1
        AND m.status = $3
        AND m.recall_hidden = FALSE
        AND (
          m.scope = $4
          OR (m.scope = $5 AND m.user_id = $2)
        )
      GROUP BY m.project_id, pr.display_name
      ORDER BY COUNT(*) DESC
      `,
      [
        orgId,
        userId,
        SHELL_STATUS_ACTIVE,
        SHELL_SCOPE_ORG,
        SHELL_SCOPE_PRIVATE,
      ],
    );

    return result.rows.map(toProject);
  },
);

interface ShellProjectQueryRow {
  id: string | null;
  name: string | null;
  items: string;
  last: string | null;
}

function toProject(row: ShellProjectQueryRow): ShellProject {
  return {
    id: row.id,
    // A project row deleted out from under its memories leaves a project_id
    // with no display_name. `unfiled` is the prototype's label for context
    // with no project, and it is the honest label here too.
    name: row.name ?? 'unfiled',
    items: Number(row.items) || 0,
    last: row.last,
  };
}

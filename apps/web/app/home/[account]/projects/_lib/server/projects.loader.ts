import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * Project membership reads for the `/projects` surface.
 *
 * The project LIST and the project MEMORIES are loaded by different modules on
 * purpose: `memory/_lib/server/project-memory.loader` owns anything that
 * returns memory content and bakes the `scope = 'project'` predicate in. This
 * file only ever returns project metadata and membership rows, never memory
 * content, so a mistake here cannot disclose what a project knows — only that
 * it exists and who is on it, which its members and org admins may see anyway.
 *
 * `project_members.user_id` holds the Supabase auth UUID, the same value the
 * engine writes to `session_memories.user_id`.
 */

export interface ProjectMemberRow {
  user_id: string;
  role: string;
  granted_by: string | null;
  granted_at: string | null;
}

/** Members of one project. Caller MUST have authorised access to the project. */
export const loadProjectMembers = cache(
  async (projectId: string): Promise<ProjectMemberRow[]> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<ProjectMemberRow>(
      `
      SELECT user_id, role, granted_by, granted_at::text AS granted_at
      FROM project_members
      WHERE project_id = $1
      ORDER BY granted_at ASC NULLS LAST
      `,
      [projectId],
    );

    return result.rows;
  },
);

/**
 * The caller's role on a project, or `null` when they hold no membership row.
 *
 * Used to decide whether they may grant/revoke access. Org admins are handled
 * separately by the caller — being an org admin is a Supabase fact, not an
 * engine one.
 */
export const loadMyProjectRole = cache(
  async (projectId: string, userId: string): Promise<string | null> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<{ role: string }>(
      `
      SELECT role FROM project_members
      WHERE project_id = $1 AND user_id = $2
      `,
      [projectId, userId],
    );

    return result.rows[0]?.role ?? null;
  },
);

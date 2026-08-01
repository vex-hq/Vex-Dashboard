import 'server-only';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * Project writes against the engine database.
 *
 * AUTHORISATION IS NOT DONE HERE. Every function in this file assumes the
 * caller has already established that the signed-in user may act on the
 * project — the server actions in
 * `app/home/[account]/projects/_lib/server/projects-actions.ts` are the choke
 * point, exactly as `resolveOrgId` is for org access. The functions still take
 * `orgId` on every statement so a project id from another tenant simply
 * matches nothing.
 */

export type ProjectMemberRole = 'member' | 'admin';

export interface ProjectRow {
  id: string;
  org_id: string;
  display_name: string;
  git_remote: string | null;
  repo_root_path: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface CreateProjectParams {
  orgId: string;
  displayName: string;
  gitRemote: string | null;
  repoRootPath: string | null;
  /** The creator, who is immediately made a project admin. */
  createdByUserId: string;
}

/**
 * Create a project and make its creator an admin of it in one transaction.
 *
 * The two statements must not be able to half-apply: a project with no admin
 * would be un-grantable by anyone but an org admin, and a membership row
 * pointing at a project that failed to insert is a dangling grant.
 *
 * Note the engine ALSO auto-creates projects on write (`ensure_project`) —
 * that is how 100+ of them exist. Explicit creation is for naming and
 * organising ahead of use, and for getting an owner attached.
 */
export async function createProject(
  params: CreateProjectParams,
): Promise<ProjectRow> {
  const pool = getAgentGuardPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const inserted = await client.query<ProjectRow>(
      `INSERT INTO projects (id, org_id, display_name, git_remote, repo_root_path)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING id, org_id, display_name, git_remote, repo_root_path,
                 created_at::text AS created_at, last_seen_at::text AS last_seen_at`,
      [
        params.orgId,
        params.displayName,
        params.gitRemote,
        params.repoRootPath,
      ],
    );

    const project = inserted.rows[0]!;

    await client.query(
      `INSERT INTO project_members (project_id, user_id, role, granted_by)
       VALUES ($1, $2, 'admin', $2)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [project.id, params.createdByUserId],
    );

    await client.query('COMMIT');

    return project;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Grant a user access to a project.
 *
 * Org-scoped by an `EXISTS` on the project row, so a project id belonging to
 * another tenant inserts nothing rather than silently creating a grant across
 * an org boundary. Returns false when nothing was written.
 */
export async function grantProjectMember(params: {
  orgId: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  grantedByUserId: string;
}): Promise<boolean> {
  const pool = getAgentGuardPool();

  const result = await pool.query(
    `INSERT INTO project_members (project_id, user_id, role, granted_by)
     SELECT p.id, $3, $4, $5
     FROM projects p
     WHERE p.id = $1 AND p.org_id = $2
     ON CONFLICT (project_id, user_id)
       DO UPDATE SET role = EXCLUDED.role, granted_by = EXCLUDED.granted_by`,
    [
      params.projectId,
      params.orgId,
      params.userId,
      params.role,
      params.grantedByUserId,
    ],
  );

  return (result.rowCount ?? 0) > 0;
}

/** Revoke a user's access to a project. Returns false when no row matched. */
export async function revokeProjectMember(params: {
  orgId: string;
  projectId: string;
  userId: string;
}): Promise<boolean> {
  const pool = getAgentGuardPool();

  const result = await pool.query(
    `DELETE FROM project_members pm
     USING projects p
     WHERE pm.project_id = p.id
       AND p.id = $1
       AND p.org_id = $2
       AND pm.user_id = $3`,
    [params.projectId, params.orgId, params.userId],
  );

  return (result.rowCount ?? 0) > 0;
}

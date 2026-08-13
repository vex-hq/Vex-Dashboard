import 'server-only';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import { recordProjectGrantAudit } from '~/lib/agentguard/project-grant-audit';
import {
  type ProjectMemberRole,
  normalizeProjectRole,
} from '~/lib/agentguard/project-roles';

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

export type { ProjectMemberRole };

export class LastProjectAdminError extends Error {
  constructor() {
    super('Cannot remove the last admin of this project');
    this.name = 'LastProjectAdminError';
  }
}

export interface ProjectRow {
  id: string;
  org_id: string;
  display_name: string;
  git_remote: string | null;
  repo_root_path: string | null;
  created_by: string | null;
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
  /** The creator's email, frozen into the audit row for that admin grant. */
  createdByEmail: string | null;
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
 * organising ahead of use, and for getting an owner attached
 * (`created_by` plus an admin membership row).
 */
export async function createProject(
  params: CreateProjectParams,
): Promise<ProjectRow> {
  const pool = getAgentGuardPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const inserted = await client.query<ProjectRow>(
      `INSERT INTO projects (id, org_id, display_name, git_remote, repo_root_path, created_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id, org_id, display_name, git_remote, repo_root_path, created_by,
                 created_at::text AS created_at, last_seen_at::text AS last_seen_at`,
      [
        params.orgId,
        params.displayName,
        params.gitRemote,
        params.repoRootPath,
        params.createdByUserId,
      ],
    );

    const project = inserted.rows[0]!;

    await client.query(
      `INSERT INTO project_members (project_id, user_id, role, granted_by)
       VALUES ($1, $2, 'admin', $2)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [project.id, params.createdByUserId],
    );

    // Creating a project hands its creator admin over it. That is a grant like
    // any other and is recorded like one — otherwise the audit trail for a
    // project would begin at its SECOND member, and the person who has held
    // admin from the start would be the one person it never names.
    await recordProjectGrantAudit(client, {
      orgId: params.orgId,
      projectId: project.id,
      grantedTo: params.createdByUserId,
      grantedToEmail: params.createdByEmail,
      grantedBy: params.createdByUserId,
      role: 'admin',
      action: 'grant',
    });

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
 * Grant a user access to a project, and record that grant, atomically.
 *
 * Org-scoped by an `EXISTS` on the project row, so a project id belonging to
 * another tenant inserts nothing rather than silently creating a grant across
 * an org boundary. Returns false when nothing was written — and in that case
 * no audit row is written either, because nothing happened to audit.
 *
 * The membership change and its `project_grant_audit` row share one
 * transaction. See `project-grant-audit.ts` for why that is not optional.
 */
export async function grantProjectMember(params: {
  orgId: string;
  projectId: string;
  userId: string;
  userEmail: string | null;
  role: ProjectMemberRole | 'member';
  grantedByUserId: string | null;
}): Promise<boolean> {
  const role = normalizeProjectRole(params.role);
  if (!role) {
    throw new Error(`unsupported project role: ${params.role}`);
  }

  const pool = getAgentGuardPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
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
        role,
        params.grantedByUserId,
      ],
    );

    const granted = (result.rowCount ?? 0) > 0;

    if (granted) {
      await recordProjectGrantAudit(client, {
        orgId: params.orgId,
        projectId: params.projectId,
        grantedTo: params.userId,
        grantedToEmail: params.userEmail,
        grantedBy: params.grantedByUserId,
        role,
        action: 'grant',
      });
    }

    await client.query('COMMIT');

    return granted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Revoke a user's access to a project, and record that revoke, atomically.
 * Returns false when no membership row matched.
 *
 * A REVOKE IS AUDITED EXACTLY AS A GRANT IS. An access change that leaves no
 * trace is how an ACL edit becomes invisible: reading only grants, a project
 * whose entire membership was removed still looks fully staffed.
 *
 * `DELETE … RETURNING pm.role` is what makes that recordable. The audit table
 * requires a role and constrains it to `('member','admin')`, so the row the
 * revoke writes carries the role the member actually HELD — captured by the
 * same statement that removes it, which is the only moment it is still known.
 * Reading it beforehand would be a second query with a race in between.
 *
 * The last project admin cannot be removed. After membership-only listing,
 * a project with no admin is unmanageable: nobody who can still see it can
 * grant anyone back in. The membership rows are locked first so two concurrent
 * last-admin revokes cannot both succeed.
 */
export async function revokeProjectMember(params: {
  orgId: string;
  projectId: string;
  userId: string;
  userEmail: string | null;
  revokedByUserId: string | null;
}): Promise<boolean> {
  const pool = getAgentGuardPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const locked = await client.query<{ user_id: string; role: string }>(
      `SELECT pm.user_id, pm.role
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.project_id = $1
         AND p.org_id = $2
       FOR UPDATE`,
      [params.projectId, params.orgId],
    );

    const target = locked.rows.find((row) => row.user_id === params.userId);

    if (!target) {
      await client.query('COMMIT');
      return false;
    }

    const adminCount = locked.rows.filter((row) => row.role === 'admin').length;

    if (target.role === 'admin' && adminCount <= 1) {
      await client.query('ROLLBACK');
      throw new LastProjectAdminError();
    }

    const result = await client.query<{ role: string }>(
      `DELETE FROM project_members pm
       USING projects p
       WHERE pm.project_id = p.id
         AND p.id = $1
         AND p.org_id = $2
         AND pm.user_id = $3
       RETURNING pm.role`,
      [params.projectId, params.orgId, params.userId],
    );

    const removed = result.rows[0];

    if (removed) {
      await recordProjectGrantAudit(client, {
        orgId: params.orgId,
        projectId: params.projectId,
        grantedTo: params.userId,
        grantedToEmail: params.userEmail,
        grantedBy: params.revokedByUserId,
        role: removed.role,
        action: 'revoke',
      });
    }

    await client.query('COMMIT');

    return removed !== undefined;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

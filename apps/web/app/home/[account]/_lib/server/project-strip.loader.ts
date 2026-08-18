import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import {
  type ProjectMemberRole,
  normalizeProjectRole,
} from '~/lib/agentguard/project-roles';

/** Where a project's captures land. Mirrors `projects.default_scope`. */
export type ProjectDefaultScope = 'private' | 'project' | 'org';

export interface ProjectStripData {
  projectId: string;
  name: string;
  defaultScope: ProjectDefaultScope;
  /** The caller's own narrowing opt-out, or null when following the project. */
  myOverride: 'private' | null;
  memberCount: number;
  /** The caller's role on the project, or null if they are not a member. */
  viewerRole: ProjectMemberRole | null;
}

/**
 * Everything the project strip shows, for a project named on the Context page.
 *
 * Resolves BY NAME because that is what the Projects screen puts in the query
 * string, and the name is what a person recognises. `org_id` is in the
 * predicate, so a name that exists in another tenant resolves to nothing here
 * rather than to their project.
 *
 * Returns null when the project does not exist in this org, when the name is
 * ambiguous (two projects, same display name — the strip cannot say which is
 * meant, so it says nothing), or when the caller is not a member. That last
 * case matters: a non-member must not learn a project's sharing posture, and
 * the same null that means "no such project" also means "not yours", so the
 * screen cannot be used to probe.
 */
export const loadProjectStrip = cache(
  async (
    orgId: string,
    projectName: string,
    userId: string,
  ): Promise<ProjectStripData | null> => {
    if (!orgId || !projectName || !userId) return null;

    const pool = getAgentGuardPool();

    const result = await pool.query<{
      id: string;
      display_name: string;
      default_scope: string;
      my_override: string | null;
      member_count: string;
      viewer_role: string | null;
      match_count: string;
    }>(
      `
      WITH matched AS (
        SELECT p.id, p.display_name, p.default_scope,
               COUNT(*) OVER() AS match_count
        FROM projects p
        WHERE p.org_id = $1 AND p.display_name = $2
      )
      SELECT
        m.id,
        m.display_name,
        m.default_scope,
        m.match_count,
        mine.scope_override AS my_override,
        mine.role AS viewer_role,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = m.id)
          AS member_count
      FROM matched m
      LEFT JOIN project_members mine
             ON mine.project_id = m.id AND mine.user_id = $3
      LIMIT 1
      `,
      [orgId, projectName, userId],
    );

    const row = result.rows[0];

    if (!row) return null;
    // Ambiguous name: two projects share it. Saying nothing beats guessing.
    if (Number(row.match_count) > 1) return null;
    // Not a member: same answer as "no such project", so this cannot be
    // used to discover whether a project exists or how it is shared.
    if (!row.viewer_role) return null;

    return {
      projectId: row.id,
      name: row.display_name,
      defaultScope: toScope(row.default_scope),
      myOverride: row.my_override === 'private' ? 'private' : null,
      memberCount: Number(row.member_count) || 0,
      viewerRole: normalizeProjectRole(row.viewer_role),
    };
  },
);

/** An unrecognised value reads as `private` — the narrowest, never a guess. */
function toScope(value: string | null): ProjectDefaultScope {
  return value === 'org' || value === 'project' ? value : 'private';
}

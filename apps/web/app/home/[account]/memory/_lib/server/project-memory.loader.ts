import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import {
  type ArtifactCardRow,
  MEMORY_PAGE_SIZE,
  MEMORY_STATUS_ACTIVE,
  type MemoryListResult,
  type MemoryListRow,
  pageCountFor,
  pageWindow,
  toCount,
} from './memory-visibility.types';

/**
 * The **Projects** tab — memories a project's members share with each other.
 *
 * Every query hard-codes `scope = 'project'`. Two things must not be conflated
 * here, and the user-silo design is emphatic about it:
 *
 *   - `project_id` as a COLUMN exists on ~32.5k rows whose scope is `org`.
 *     There it is a relevance filter, not a boundary, and those rows stay
 *     readable by the whole org.
 *   - `scope = 'project'` IS a boundary: readable only by that project's
 *     members (plus org admins).
 *
 * **The predicate is always `scope`, never the presence of `project_id`.**
 * Filtering on `project_id IS NOT NULL` would wrongly hide 32.5k org rows;
 * treating `project_id` as implying open access would leak project-scoped
 * ones.
 *
 * Membership is enforced in SQL via `EXISTS (SELECT 1 FROM project_members …)`
 * — never by fetching a wider set and filtering in TypeScript.
 */
const PROJECT_SCOPE = 'project';

/**
 * Who is asking.
 *
 * A required, explicit discriminated union rather than an optional
 * `isAdmin?: boolean`. There is no default to get wrong: a caller must state
 * which branch it wants, and the member branch cannot be constructed without a
 * user id.
 *
 * `admin` means an ORG admin, who by design sees every project's memories
 * including projects they are not a member of. It grants nothing in
 * `private-memory.loader` — admins see no private scope, ever.
 */
export type ProjectAccess =
  | { readonly kind: 'member'; readonly userId: string }
  | { readonly kind: 'admin' };

function assertAccess(access: ProjectAccess): ProjectAccess {
  if (access.kind === 'member' && access.userId.trim().length === 0) {
    throw new Error(
      'project loader: member access requires a non-blank user id.',
    );
  }

  return access;
}

/**
 * Build the visibility clause plus its bound parameters.
 *
 * Both branches are constant SQL text chosen by a discriminated union — no
 * caller-supplied string ever reaches the SQL, and the member branch always
 * binds the user id as a parameter.
 */
function visibilityClause(
  access: ProjectAccess,
  projectIdColumn: string,
  nextParamIndex: number,
): { sql: string; params: string[] } {
  if (access.kind === 'admin') {
    return { sql: 'TRUE', params: [] };
  }

  return {
    sql: `EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = ${projectIdColumn}
        AND pm.user_id = $${nextParamIndex}
    )`,
    params: [access.userId],
  };
}

export interface ProjectSummaryRow {
  id: string;
  display_name: string;
  git_remote: string | null;
  repo_root_path: string | null;
  member_count: number;
  memory_count: number;
  last_seen_at: string | null;
}

/**
 * Projects the caller may open: their own when they are a member, all of the
 * org's when they are an admin.
 *
 * `memory_count` counts `scope = 'project'` rows only — the rows the project
 * boundary actually governs. Org-scoped rows that merely carry this
 * `project_id` are counted on the Team tab, where they are readable.
 */
export const loadVisibleProjects = cache(
  async (
    orgId: string,
    access: ProjectAccess,
  ): Promise<ProjectSummaryRow[]> => {
    const pool = getAgentGuardPool();
    const visibility = visibilityClause(assertAccess(access), 'p.id', 4);

    const result = await pool.query<
      Omit<ProjectSummaryRow, 'member_count' | 'memory_count'> & {
        member_count: string;
        memory_count: string;
      }
    >(
      `
      SELECT
        p.id,
        p.display_name,
        p.git_remote,
        p.repo_root_path,
        p.last_seen_at,
        (
          SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id
        ) AS member_count,
        (
          SELECT COUNT(*)
          FROM session_memories m
          WHERE m.project_id = p.id
            AND m.org_id = p.org_id
            AND m.scope = $2
            AND m.status = $3
        ) AS memory_count
      FROM projects p
      WHERE p.org_id = $1
        AND ${visibility.sql}
      ORDER BY p.last_seen_at DESC NULLS LAST, p.display_name ASC
      `,
      [orgId, PROJECT_SCOPE, MEMORY_STATUS_ACTIVE, ...visibility.params],
    );

    return result.rows.map((row) => ({
      id: row.id,
      display_name: row.display_name,
      git_remote: row.git_remote,
      repo_root_path: row.repo_root_path,
      last_seen_at: row.last_seen_at,
      member_count: toCount(row.member_count),
      memory_count: toCount(row.memory_count),
    }));
  },
);

/**
 * A single project's header, or `null` when the caller may not see it.
 *
 * Returning `null` rather than throwing keeps "not a member" and "no such
 * project" indistinguishable, so the page cannot be used to enumerate project
 * ids.
 */
export const loadVisibleProject = cache(
  async (
    orgId: string,
    projectId: string,
    access: ProjectAccess,
  ): Promise<ProjectSummaryRow | null> => {
    const projects = await loadVisibleProjects(orgId, access);

    return projects.find((project) => project.id === projectId) ?? null;
  },
);

interface ProjectMemoryQueryRow extends MemoryListRow {
  total_count: string;
}

/** Paginated `scope = 'project'` memories for one project, newest first. */
export const loadProjectMemories = cache(
  async (
    orgId: string,
    projectId: string,
    access: ProjectAccess,
    page = 1,
  ): Promise<MemoryListResult> => {
    const pool = getAgentGuardPool();
    const visibility = visibilityClause(
      assertAccess(access),
      'm.project_id',
      5,
    );
    const { offset } = pageWindow(page);
    const limitIndex = 5 + visibility.params.length;

    const result = await pool.query<ProjectMemoryQueryRow>(
      `
      SELECT
        m.id,
        m.agent_id,
        m.memory_type,
        m.content,
        m.provenance,
        m.project_id,
        m.space_id,
        s.name AS space_name,
        m.metadata->>'source' AS source,
        m.created_at,
        COUNT(*) OVER() AS total_count
      FROM session_memories m
      LEFT JOIN spaces s ON s.id = m.space_id AND s.org_id = m.org_id
      WHERE m.org_id = $1
        AND m.project_id = $2
        AND m.scope = $3
        AND m.status = $4
        AND ${visibility.sql}
      ORDER BY m.created_at DESC
      LIMIT $${limitIndex} OFFSET $${limitIndex + 1}
      `,
      [
        orgId,
        projectId,
        PROJECT_SCOPE,
        MEMORY_STATUS_ACTIVE,
        ...visibility.params,
        MEMORY_PAGE_SIZE,
        offset,
      ],
    );

    return {
      rows: result.rows.map((row) => ({
        id: row.id,
        agent_id: row.agent_id,
        memory_type: row.memory_type,
        content: row.content,
        provenance: row.provenance,
        project_id: row.project_id,
        space_id: row.space_id,
        space_name: row.space_name,
        source: row.source,
        created_at: row.created_at,
      })),
      pageCount: pageCountFor(toCount(result.rows[0]?.total_count)),
    };
  },
);

/** Artifacts filed under one project, gated by the same membership predicate. */
export const loadProjectArtifacts = cache(
  async (
    orgId: string,
    projectId: string,
    access: ProjectAccess,
    limit = 24,
  ): Promise<ArtifactCardRow[]> => {
    const pool = getAgentGuardPool();
    const visibility = visibilityClause(
      assertAccess(access),
      'm.project_id',
      5,
    );
    const limitIndex = 5 + visibility.params.length;

    const result = await pool.query<
      Omit<ArtifactCardRow, 'size_bytes'> & { size_bytes: string | null }
    >(
      `
      SELECT
        a.id,
        m.id AS memory_id,
        a.title,
        a.summary,
        a.kind,
        a.mime_type,
        a.size_bytes,
        m.created_at
      FROM session_memories m
      JOIN artifacts a
        ON a.id::text = m.metadata->>'artifact_id'
       AND a.org_id = m.org_id
      WHERE m.org_id = $1
        AND m.project_id = $2
        AND m.scope = $3
        AND m.status = $4
        AND m.memory_type = 'artifact'
        AND a.status = 'active'
        AND ${visibility.sql}
      ORDER BY m.created_at DESC
      LIMIT $${limitIndex}
      `,
      [
        orgId,
        projectId,
        PROJECT_SCOPE,
        MEMORY_STATUS_ACTIVE,
        ...visibility.params,
        limit,
      ],
    );

    return result.rows.map((row) => ({
      ...row,
      size_bytes: row.size_bytes === null ? null : toCount(row.size_bytes),
    }));
  },
);

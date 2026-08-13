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
 * The **Projects** tab — memories filed on one project that this viewer
 * may read.
 *
 * Two scopes land here, and they must not be conflated:
 *
 *   - `scope = 'project'` IS a boundary: readable only by that project's
 *     members — no admin bypass. Membership is enforced in SQL via
 *     `EXISTS (SELECT 1 FROM project_members …)` — never by fetching a
 *     wider set and filtering in TypeScript.
 *   - `scope = 'private' AND user_id = <viewer>` with this `project_id`
 *     is the viewer's own capture tagged to the repo. The engine
 *     auto-creates projects on first write without enrolling a
 *     `project_members` row and lands hook/curator captures at private
 *     (see `loadContextView` / `loadProjectPulse`). Dropping that arm
 *     emptied every such project on this tab while the Hub still
 *     counted the writes.
 *
 * `project_id` as a COLUMN also exists on org-scoped rows. Those stay
 * on the Team tab — this loader never reads `scope = 'org'`. Treating
 * `project_id IS NOT NULL` as open access would leak project-scoped
 * rows; treating it as a Team filter would hide them from the org.
 *
 * MEMBERSHIP-ONLY, NO ADMIN BYPASS (2026-08-12 ruling): `project_members` is
 * the only gate for project visibility, full stop. This loader used to take
 * a `ProjectAccess` discriminated union with an `{ kind: 'admin' }` branch
 * that resolved the membership check to `TRUE`, letting an org admin read
 * (and see the existence of) any project regardless of membership. That
 * branch is gone, not defaulted off: there is no parameter left anywhere in
 * this file that can widen visibility past `project_members`. An org admin
 * who wants into a project now has to be granted membership like anyone
 * else. Migration 039 backfilled an owner for every existing project, so
 * this is safe: everyone still sees what they created.
 */
const PROJECT_SCOPE = 'project';
const PRIVATE_SCOPE = 'private';

function assertViewerUserId(viewerUserId: string): string {
  if (viewerUserId.trim().length === 0) {
    throw new Error('project loader: viewer user id is required.');
  }

  return viewerUserId;
}

/**
 * Build the membership visibility clause plus its bound parameter.
 *
 * Always an `EXISTS` against `project_members`, bound to the viewer's own
 * user id — never a caller-supplied string, never an unconditional `TRUE`.
 */
function visibilityClause(
  viewerUserId: string,
  projectIdColumn: string,
  nextParamIndex: number,
): { sql: string; params: string[] } {
  return {
    sql: `EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = ${projectIdColumn}
        AND pm.user_id = $${nextParamIndex}
    )`,
    params: [viewerUserId],
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
 * Projects the caller may open: only the ones they hold a `project_members`
 * row for. No admin-wide listing — see the file header.
 *
 * `memory_count` is what this viewer can actually read on the project:
 * `scope = 'project'` rows they are entitled to, plus their own private
 * rows tagged with this `project_id`. Org-scoped rows that merely carry
 * the id stay on the Team tab.
 */
export const loadVisibleProjects = cache(
  async (orgId: string, viewerUserId: string): Promise<ProjectSummaryRow[]> => {
    const pool = getAgentGuardPool();
    // $1 org, $2 project-scope, $3 status, $4 private-scope, $5 viewer.
    const viewer = assertViewerUserId(viewerUserId);
    const visibility = visibilityClause(viewer, 'p.id', 6);

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
            AND m.status = $3
            AND (
              m.scope = $2
              OR (m.scope = $4 AND m.user_id = $5)
            )
        ) AS memory_count
      FROM projects p
      WHERE p.org_id = $1
        AND ${visibility.sql}
      ORDER BY p.last_seen_at DESC NULLS LAST, p.display_name ASC
      `,
      [
        orgId,
        PROJECT_SCOPE,
        MEMORY_STATUS_ACTIVE,
        PRIVATE_SCOPE,
        viewer,
        ...visibility.params,
      ],
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
    viewerUserId: string,
  ): Promise<ProjectSummaryRow | null> => {
    const projects = await loadVisibleProjects(orgId, viewerUserId);

    return projects.find((project) => project.id === projectId) ?? null;
  },
);

interface ProjectMemoryQueryRow extends MemoryListRow {
  total_count: string;
}

/**
 * Paginated memories for one project this viewer may read: `scope =
 * 'project'` rows they are entitled to, plus their own private rows
 * tagged with this `project_id`. Newest first.
 */
export const loadProjectMemories = cache(
  async (
    orgId: string,
    projectId: string,
    viewerUserId: string,
    page = 1,
  ): Promise<MemoryListResult> => {
    const pool = getAgentGuardPool();
    // $1 org, $2 project id, $3 status, $4 project-scope, $5 private-scope,
    // $6 viewer. Membership bind starts at $7.
    const viewer = assertViewerUserId(viewerUserId);
    const visibility = visibilityClause(viewer, 'm.project_id', 7);
    const { offset } = pageWindow(page);
    const limitIndex = 7 + visibility.params.length;

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
        AND m.status = $3
        AND (
          (m.scope = $4 AND ${visibility.sql})
          OR (m.scope = $5 AND m.user_id = $6)
        )
      ORDER BY m.created_at DESC
      LIMIT $${limitIndex} OFFSET $${limitIndex + 1}
      `,
      [
        orgId,
        projectId,
        MEMORY_STATUS_ACTIVE,
        PROJECT_SCOPE,
        PRIVATE_SCOPE,
        viewer,
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

/**
 * Artifacts filed under one project, gated by the same item ladder as
 * {@link loadProjectMemories}: project-scoped rows the viewer may read,
 * plus their own private artifact rows tagged with this project.
 */
export const loadProjectArtifacts = cache(
  async (
    orgId: string,
    projectId: string,
    viewerUserId: string,
    limit = 24,
  ): Promise<ArtifactCardRow[]> => {
    const pool = getAgentGuardPool();
    const viewer = assertViewerUserId(viewerUserId);
    const visibility = visibilityClause(viewer, 'm.project_id', 7);
    const limitIndex = 7 + visibility.params.length;

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
        AND m.status = $3
        AND m.memory_type = 'artifact'
        AND a.status = 'active'
        AND (
          (m.scope = $4 AND ${visibility.sql})
          OR (m.scope = $5 AND m.user_id = $6)
        )
      ORDER BY m.created_at DESC
      LIMIT $${limitIndex}
      `,
      [
        orgId,
        projectId,
        MEMORY_STATUS_ACTIVE,
        PROJECT_SCOPE,
        PRIVATE_SCOPE,
        viewer,
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

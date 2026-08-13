import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import type { MemoryProvenance } from './memory-visibility.types';

/**
 * The single-memory drill-in, gated by the visibility ladder.
 *
 * The loader this replaces filtered on `org_id + id` alone. That was correct
 * while every row in the table was org-scoped; the moment `scope = 'private'`
 * rows exist it becomes the leak — any member of the org could open
 * `/memory/<uuid>` and read a teammate's private capture, and the three
 * carefully separated tab loaders would not have stopped them, because this
 * route never went through them.
 *
 * The ladder, enforced entirely in SQL:
 *
 *   private  → only the owner (`user_id = :me`). Admins included: no override.
 *   project  → project members only. No admin override — see
 *              MEMBERSHIP-ONLY, NO ADMIN BYPASS below.
 *   anything → everyone in the org (org / session / the deprecated agent scope,
 *              which stays readable per the design's "stop writing, keep
 *              reading" rule).
 *
 * MEMBERSHIP-ONLY, NO ADMIN BYPASS (2026-08-12 ruling): `project_members` is
 * the only gate for `scope = 'project'` rows. This loader used to take an
 * `isOrgAdmin` flag on `MemoryViewer` that widened the project branch to
 * `TRUE` for org admins — that field and the branch it fed are gone, not
 * defaulted off. An org admin who is not a member of a memory's project now
 * gets `null` for it, same as anyone else. See
 * `memory/_lib/server/project-memory.loader.ts`'s file header for the full
 * rationale.
 *
 * `viewer` is a required argument with no default. There is no
 * `loadMemoryDetail(orgId, id)` overload to fall back to, so a new call site
 * cannot forget to say who is asking.
 */
export interface MemoryViewer {
  /** The SIGNED-IN user's id. Never taken from the URL or a form field. */
  readonly userId: string | null;
}

export interface MemoryDetailRow {
  id: string;
  org_id: string;
  agent_id: string;
  memory_type: string;
  content: string;
  scope: string;
  status: string;
  provenance: MemoryProvenance;
  space_id: string | null;
  project_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Load one memory the viewer is allowed to read, or `null`.
 *
 * `null` covers "no such row" and "not yours" alike, so the route cannot be
 * used to probe for the existence of another person's memories.
 *
 * A `null` `viewer.userId` (an unattributed session) simply never satisfies
 * the private branch: `user_id = NULL` is never true in SQL, and the bound
 * parameter is passed as NULL rather than as a string that might match.
 */
export const loadMemoryDetailForViewer = cache(
  async (
    orgId: string,
    id: string,
    viewer: MemoryViewer,
  ): Promise<MemoryDetailRow | null> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<MemoryDetailRow>(
      `
      SELECT
        m.id,
        m.org_id,
        m.agent_id,
        m.memory_type,
        m.content,
        m.scope,
        m.status,
        m.provenance,
        m.space_id,
        m.project_id,
        m.metadata,
        m.created_at
      FROM session_memories m
      WHERE m.org_id = $1
        AND m.id = $2
        AND CASE m.scope
          WHEN 'private' THEN m.user_id IS NOT NULL AND m.user_id = $3
          WHEN 'project' THEN EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = m.project_id
              AND pm.user_id = $3
          )
          ELSE TRUE
        END
      `,
      [orgId, id, viewer.userId],
    );

    return result.rows[0] ?? null;
  },
);

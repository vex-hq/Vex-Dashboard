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
 * The **Mine** tab — one person's private memories, and nobody else's.
 *
 * Every query in this file hard-codes `scope = 'private'` AND
 * `user_id = <the signed-in caller>`. There is no scope argument and no
 * "viewer" argument: the only user id these functions accept is the caller's
 * own, and the caller is expected to pass the id of the session it is
 * rendering for.
 *
 * WHY THIS FILE EXISTS SEPARATELY: a single `loadMemories({ scope, userId })`
 * can be called with the wrong scope or a missing user id and will happily
 * render one person's private rows to another. `loadMyPrivateMemories(orgId,
 * userId)` cannot — the predicate is baked into the SQL text and `userId` is a
 * required positional parameter that is also asserted non-blank at runtime.
 * The duplication between this file, `project-memory.loader` and
 * `team-memory.loader` is the safety property. Do not "DRY" it up.
 *
 * ADMINS GET NOTHING HERE. There is deliberately no admin variant, no
 * "as user" parameter, and no break-glass path. Per the user-silo design
 * (2026-08-01) a private scope an administrator can read is not private. If a
 * future change needs a query that reads `scope = 'private'` for somebody who
 * is not the signed-in caller, that change is the bug this feature exists to
 * prevent.
 *
 * `user_id` holds the Supabase auth user UUID (the engine resolves it from the
 * OAuth principal, or from an API key's `created_by`), so the dashboard passes
 * `workspace.user.id` straight through.
 *
 * Pre-031 rows have `user_id IS NULL`; `user_id = $2` never matches NULL, so
 * legacy org rows can never leak into a private view.
 */
const PRIVATE_SCOPE = 'private';

/**
 * Fail closed on a blank/absent user id.
 *
 * Without this, a caller that lost its session and passed `''` or `undefined`
 * would run `user_id = ''`. That returns nothing today — but it is one schema
 * change or one coercion away from being a wildcard, and a privacy boundary
 * should not depend on a value comparing unequal by luck.
 */
function assertUserId(userId: string): string {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error(
      'loadMyPrivate*: a non-blank user id is required. Private memories are ' +
        'readable only by their owner, so there is no unattributed variant.',
    );
  }

  return userId;
}

interface PrivateMemoryQueryRow extends Omit<MemoryListRow, 'space_name'> {
  space_name: string | null;
  total_count: string;
}

/**
 * Paginated private memories owned by `userId`, newest first.
 *
 * @param orgId - The caller's org. Tenancy boundary, as everywhere else.
 * @param userId - The SIGNED-IN caller's user id. Never a user id taken from
 *   the URL, a form field or any other client-supplied source.
 */
export const loadMyPrivateMemories = cache(
  async (
    orgId: string,
    userId: string,
    page = 1,
  ): Promise<MemoryListResult> => {
    const pool = getAgentGuardPool();
    const owner = assertUserId(userId);
    const { offset } = pageWindow(page);

    const result = await pool.query<PrivateMemoryQueryRow>(
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
        AND m.user_id = $2
        AND m.scope = $3
        AND m.status = $4
      ORDER BY m.created_at DESC
      LIMIT $5 OFFSET $6
      `,
      [
        orgId,
        owner,
        PRIVATE_SCOPE,
        MEMORY_STATUS_ACTIVE,
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

export interface PrivateMemorySummary {
  total: number;
  inferred: number;
  artifacts: number;
  last_captured: string | null;
}

/**
 * Headline counts for the caller's own private scope.
 *
 * This is the ONLY private aggregate in the codebase and it is scoped to the
 * caller by the same `user_id = $2` predicate as the list. It is never
 * exposed per-member to an admin: a per-person private count discloses who is
 * active and who went quiet, which the design treats as a disclosure about
 * that person even though no content is shown.
 */
export const loadMyPrivateSummary = cache(
  async (orgId: string, userId: string): Promise<PrivateMemorySummary> => {
    const pool = getAgentGuardPool();
    const owner = assertUserId(userId);

    const result = await pool.query<{
      total: string;
      inferred: string;
      artifacts: string;
      last_captured: string | null;
    }>(
      `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE provenance = 'INFERRED') AS inferred,
        COUNT(*) FILTER (WHERE memory_type = 'artifact') AS artifacts,
        MAX(created_at)::text AS last_captured
      FROM session_memories
      WHERE org_id = $1
        AND user_id = $2
        AND scope = $3
        AND status = $4
      `,
      [orgId, owner, PRIVATE_SCOPE, MEMORY_STATUS_ACTIVE],
    );

    const row = result.rows[0];

    return {
      total: toCount(row?.total),
      inferred: toCount(row?.inferred),
      artifacts: toCount(row?.artifacts),
      last_captured: row?.last_captured ?? null,
    };
  },
);

/**
 * The caller's own private artifacts.
 *
 * Visibility comes from the `session_memories` pointer row — `artifacts` has
 * no `scope` and no `user_id`, so filtering it directly would be filtering
 * nothing. The join is org-scoped as well (`a.org_id = m.org_id`) so an
 * artifact id colliding across tenants could not surface another org's title.
 */
export const loadMyPrivateArtifacts = cache(
  async (
    orgId: string,
    userId: string,
    limit = 24,
  ): Promise<ArtifactCardRow[]> => {
    const pool = getAgentGuardPool();
    const owner = assertUserId(userId);

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
        AND m.user_id = $2
        AND m.scope = $3
        AND m.status = $4
        AND m.memory_type = 'artifact'
        AND a.status = 'active'
      ORDER BY m.created_at DESC
      LIMIT $5
      `,
      [orgId, owner, PRIVATE_SCOPE, MEMORY_STATUS_ACTIVE, limit],
    );

    return result.rows.map((row) => ({
      ...row,
      size_bytes: row.size_bytes === null ? null : toCount(row.size_bytes),
    }));
  },
);

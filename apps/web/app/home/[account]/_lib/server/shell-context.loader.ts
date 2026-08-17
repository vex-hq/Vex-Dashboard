import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import {
  SHELL_LIST_LIMIT,
  SHELL_SCOPE_ORG,
  SHELL_SCOPE_PRIVATE,
  SHELL_STATUS_ACTIVE,
  type ShellContextItem,
} from './shell-context.types';

/**
 * Every context item the CALLER may see, newest first.
 *
 * This backs the prototype's Context screen ("every item, freshest first") and
 * the row list on Home.
 *
 * ── THE VISIBILITY PREDICATE ────────────────────────────────────────────────
 *
 * Two scopes are readable here and they are BOTH written into the SQL text:
 *
 *   - `scope = 'org'`   — shared with the whole org, readable by any member.
 *   - `scope = 'private' AND user_id = $2` — the caller's own, and only theirs.
 *
 * There is no scope argument and no viewer argument distinct from the
 * signed-in caller. A reader checking this file does not have to trace a
 * parameter to a call site to know which rows come back: the answer is in the
 * WHERE clause.
 *
 * This is the same rule the shared/private split loaders follow. It differs
 * from them only in that this screen shows the union rather than two labelled
 * groups — which is what the prototype's Context screen is. The union is
 * expressed as two hard-coded branches, NOT as a scope parameter with two call
 * sites, because the parameterised form is the one whose wrong default leaks.
 *
 * `project` scope is deliberately absent. A project-scoped row is readable
 * only by that project's members, which is a membership check this query does
 * not make — so those rows stay out rather than being shown on a guess.
 *
 * Pre-031 rows carry `user_id IS NULL`. `m.user_id = $2` never matches NULL in
 * SQL, so those rows are invisible here rather than visible to everyone, which
 * is the safe direction for a row whose owner is not recorded.
 *
 * ── EVIDENCE ───────────────────────────────────────────────────────────────
 *
 * `recalls` and `served_stale` are aggregated in the same statement rather
 * than per row: a `memory_ids @> ARRAY[id]` probe per item would be one query
 * per row. Both aggregates are LEFT JOINed, so an item nobody ever recalled
 * comes back with 0 rather than being dropped from the list.
 */
export const loadShellContext = cache(
  async (orgId: string, userId: string): Promise<ShellContextItem[]> => {
    const pool = getAgentGuardPool();
    const owner = assertOwnerId(userId);

    const result = await pool.query<ShellContextQueryRow>(
      `
      WITH visible AS (
        SELECT
          m.id,
          m.memory_type,
          m.content,
          m.project_id,
          m.scope,
          m.superseded_by,
          m.created_at
        FROM session_memories m
        WHERE m.org_id = $1
          AND m.status = $3
          AND m.recall_hidden = FALSE
          AND (
            m.scope = $4
            OR (m.scope = $5 AND m.user_id = $2)
          )
        ORDER BY m.created_at DESC
        LIMIT $6
      ),
      recalls AS (
        SELECT e.memory_id, COUNT(*) AS n
        FROM brain_recall_events b
        CROSS JOIN LATERAL unnest(b.memory_ids) AS e(memory_id)
        WHERE b.org_id = $1
          AND e.memory_id IN (SELECT id FROM visible)
        GROUP BY e.memory_id
      ),
      outcomes AS (
        SELECT
          o.memory_id,
          COUNT(*) FILTER (WHERE o.served_stale) AS stale_n,
          COUNT(*) FILTER (WHERE o.used) AS used_n
        FROM recall_outcomes o
        WHERE o.org_id = $1
          AND o.memory_id IN (SELECT id FROM visible)
        GROUP BY o.memory_id
      )
      SELECT
        v.id,
        v.memory_type,
        v.content,
        pr.display_name AS project_name,
        v.scope,
        (v.superseded_by IS NOT NULL) AS superseded,
        v.created_at::text AS created_at,
        COALESCE(r.n, 0) AS recalls,
        COALESCE(s.stale_n, 0) AS served_stale,
        COALESCE(s.used_n, 0) AS used
      FROM visible v
      LEFT JOIN projects pr ON pr.id = v.project_id AND pr.org_id = $1
      LEFT JOIN recalls r ON r.memory_id = v.id
      LEFT JOIN outcomes s ON s.memory_id = v.id
      ORDER BY v.created_at DESC
      `,
      [
        orgId,
        owner,
        SHELL_STATUS_ACTIVE,
        SHELL_SCOPE_ORG,
        SHELL_SCOPE_PRIVATE,
        SHELL_LIST_LIMIT,
      ],
    );

    return result.rows.map(toItem);
  },
);

interface ShellContextQueryRow {
  id: string;
  memory_type: string;
  content: string;
  project_name: string | null;
  scope: string;
  superseded: boolean;
  created_at: string;
  recalls: string;
  served_stale: string;
  used: string;
}

function toItem(row: ShellContextQueryRow): ShellContextItem {
  return {
    id: row.id,
    kind: row.memory_type,
    content: row.content,
    projectName: row.project_name,
    scope: row.scope,
    superseded: row.superseded,
    createdAt: row.created_at,
    recalls: toCount(row.recalls),
    servedStale: toCount(row.served_stale),
    used: toCount(row.used),
  };
}

/** `COUNT(*)` arrives as a string from node-postgres; NaN must not escape. */
function toCount(value: string | null): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * A private-scope query with an empty owner would be a query with no owner
 * filter at all in every engine that coerces, so the empty string is refused
 * rather than sent. It matches nothing today; a privacy boundary should not
 * rest on that staying true.
 */
function assertOwnerId(userId: string): string {
  if (!userId) {
    throw new Error('loadShellContext requires a signed-in user id');
  }

  return userId;
}

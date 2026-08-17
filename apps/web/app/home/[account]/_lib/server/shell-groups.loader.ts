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
 * The two groups behind the Shared screen.
 *
 * ── WHY THESE EXIST RATHER THAN A FILTER ────────────────────────────────────
 *
 * The obvious implementation is to load the newest N rows once and partition
 * them on `scope` in the component. That is wrong, and wrong in exactly the
 * shape the reference org has: 5,196 private rows and 1 org-scoped one, the
 * shared row being old. It falls outside any "newest 200" window, so the
 * screen renders "Nothing shared yet" — a false statement, on the screen whose
 * entire purpose is to say what the team can see.
 *
 * `shell-shared.regression.test.ts` reproduces that and pins it.
 *
 * ── WHY THE SQL IS DUPLICATED ───────────────────────────────────────────────
 *
 * Two loaders, two hard-coded predicates, no scope argument — the same rule
 * `shared-context.loader` and `my-private-context.loader` follow, and the
 * duplication IS the safety property. A single `loadGroup(scope)` can be
 * called with the wrong scope; these two cannot. Factoring the shared SQL into
 * a helper that takes a predicate would recreate exactly the entry point whose
 * one wrong default renders one person's private context on another person's
 * screen.
 *
 * Each group is capped independently, so a large private group can never
 * squeeze the shared one out.
 */

/** Org-scoped rows. Readable by every member. No user filter, by design. */
export const loadShellSharedGroup = cache(
  async (orgId: string): Promise<ShellContextItem[]> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<GroupQueryRow>(
      `
      WITH visible AS (
        SELECT m.id, m.memory_type, m.content, m.project_id, m.scope,
               m.superseded_by, m.created_at
        FROM session_memories m
        WHERE m.org_id = $1
          AND m.status = $2
          AND m.recall_hidden = FALSE
          AND m.scope = $3
        ORDER BY m.created_at DESC
        LIMIT $4
      )
      ${EVIDENCE_TAIL}
      `,
      [orgId, SHELL_STATUS_ACTIVE, SHELL_SCOPE_ORG, SHELL_LIST_LIMIT],
    );

    return result.rows.map(toItem);
  },
);

/** The caller's OWN private rows. Never anybody else's. */
export const loadShellPrivateGroup = cache(
  async (orgId: string, userId: string): Promise<ShellContextItem[]> => {
    if (!userId) {
      throw new Error('loadShellPrivateGroup requires a signed-in user id');
    }

    const pool = getAgentGuardPool();

    const result = await pool.query<GroupQueryRow>(
      `
      WITH visible AS (
        SELECT m.id, m.memory_type, m.content, m.project_id, m.scope,
               m.superseded_by, m.created_at
        FROM session_memories m
        WHERE m.org_id = $1
          AND m.status = $2
          AND m.recall_hidden = FALSE
          AND m.scope = $3
          AND m.user_id = $5
        ORDER BY m.created_at DESC
        LIMIT $4
      )
      ${EVIDENCE_TAIL}
      `,
      [orgId, SHELL_STATUS_ACTIVE, SHELL_SCOPE_PRIVATE, SHELL_LIST_LIMIT, userId],
    );

    return result.rows.map(toItem);
  },
);

/**
 * The evidence joins, shared as TEXT ONLY.
 *
 * This fragment contains no predicate and no scope — it joins recall counts
 * onto whatever `visible` already selected. The visibility decision is made
 * entirely in each loader's own WHERE clause above, which is the thing a
 * reviewer needs to read, and it is complete in one place per loader.
 */
const EVIDENCE_TAIL = `
  , recalls AS (
    SELECT e.memory_id, COUNT(*) AS n
    FROM brain_recall_events b
    CROSS JOIN LATERAL unnest(b.memory_ids) AS e(memory_id)
    WHERE b.org_id = $1 AND e.memory_id IN (SELECT id FROM visible)
    GROUP BY e.memory_id
  ),
  outcomes AS (
    SELECT o.memory_id,
           COUNT(*) FILTER (WHERE o.served_stale) AS stale_n,
           COUNT(*) FILTER (WHERE o.used) AS used_n
    FROM recall_outcomes o
    WHERE o.org_id = $1 AND o.memory_id IN (SELECT id FROM visible)
    GROUP BY o.memory_id
  )
  SELECT
    v.id, v.memory_type, v.content,
    pr.display_name AS project_name,
    v.scope,
    (v.superseded_by IS NOT NULL) AS superseded,
    v.created_at::text AS created_at,
    COALESCE(r.n, 0) AS recalls,
    COALESCE(o.stale_n, 0) AS served_stale,
    COALESCE(o.used_n, 0) AS used
  FROM visible v
  LEFT JOIN projects pr ON pr.id = v.project_id AND pr.org_id = $1
  LEFT JOIN recalls r ON r.memory_id = v.id
  LEFT JOIN outcomes o ON o.memory_id = v.id
  ORDER BY v.created_at DESC
`;

interface GroupQueryRow {
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

function toItem(row: GroupQueryRow): ShellContextItem {
  return {
    id: row.id,
    kind: row.memory_type,
    content: row.content,
    projectName: row.project_name,
    scope: row.scope,
    superseded: row.superseded,
    createdAt: row.created_at,
    recalls: n(row.recalls),
    servedStale: n(row.served_stale),
    used: n(row.used),
  };
}

function n(value: string | null): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

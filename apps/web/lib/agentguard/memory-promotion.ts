import 'server-only';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * Promotion — moving a private memory into a shared scope, and back.
 *
 * THIS IS A PORT, NOT A NEW DESIGN. Every rule, every refusal code and the
 * shape of both SQL statements below are taken from the engine's
 * `shared/promotion.py` (`promote_memory`), which is the path the MCP `share`
 * tool calls. The dashboard cannot invoke that path over HTTP — the engine
 * authenticates with `X-Vex-Key` or an OAuth principal, and the dashboard
 * holds neither on a user's behalf (API keys are stored as SHA-256 hashes and
 * are unrecoverable by design) — so the write is made against the same engine
 * database the dashboard already reads, using the same guards, verbatim.
 * Divergence between this file and `shared/promotion.py` is a bug in this
 * file.
 *
 * The three rules, unchanged from the engine's module docstring:
 *
 *  1. **Only the owner may promote.** `user_id` on the row must equal the
 *     resolved caller. Not an admin, not a teammate — the owner. The predicate
 *     is part of the SELECT and repeated in the UPDATE, so a row belonging to
 *     somebody else is never fetched, let alone modified.
 *  2. **A non-owner sees `not_found`, never `forbidden`.** `forbidden`
 *     confirms the row exists, which is a disclosure about a scope whose whole
 *     promise is that its shape is invisible from outside.
 *  3. **The provenance label survives.** `provenance` is absent from the SET
 *     list — not defaulted, not recomputed, untouched. The moment an LLM's
 *     deduction becomes team truth is exactly when the INFERRED label matters
 *     most.
 *
 * THE REVERSE HAS NO ENGINE COUNTERPART. `shared/promotion.py` is one-way; the
 * 2026-08-17 addendum requires "Sharing is reversible from the same surface",
 * so {@link demoteMemory} is written here as the exact mirror of the promote
 * UPDATE with one extra guard: it will only pull back a row whose metadata
 * records that THIS caller promoted it out of private
 * (`metadata->>'shared_by'`, written by the promote path). A row somebody else
 * shared, or a row that was born org-scoped and never was anyone's private
 * context, is not this viewer's to withdraw — un-sharing those would remove
 * team context on one person's say-so.
 */

/** The scopes a private memory may be promoted into. Matches the engine. */
export const PROMOTABLE_SCOPES = ['org', 'project'] as const;

export type PromotableScope = (typeof PROMOTABLE_SCOPES)[number];

export type PromotionError =
  | 'invalid_id'
  | 'not_found'
  | 'already_shared'
  | 'no_project'
  | 'not_a_member'
  | 'unsupported_scope';

export type PromotionResult =
  | { shared: true; id: string; scope: PromotableScope; provenance: string }
  | { shared: false; error: PromotionError; scope?: string };

export type DemotionError = 'invalid_id' | 'not_found' | 'not_shared_by_you';

export type DemotionResult =
  | { reversed: true; id: string; scope: 'private'; shared: false }
  | { reversed: false; error: DemotionError };

/** Recorded in the row's metadata so the audit trail names the surface. */
const VIA = 'dashboard';

const PRIVATE_SCOPE = 'private';
const ACTIVE_STATUS = 'active';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export interface PromoteMemoryParams {
  orgId: string;
  memoryId: string;
  /**
   * The SIGNED-IN caller. `null` can never promote anything — an
   * unattributable request owns no private memories to share.
   */
  userId: string | null;
  to: PromotableScope;
}

/**
 * Move one of the caller's own private memories to `org` or `project`.
 *
 * Sharing to `project` additionally requires membership of the project the
 * memory is filed under, checked here for the same reason the engine's
 * `_perform_share` checks it: without it a user could push a private memory
 * across a boundary they have no standing in — writing across a line they
 * cannot read across.
 */
export async function promoteMemory(
  params: PromoteMemoryParams,
): Promise<PromotionResult> {
  const { orgId, memoryId, userId, to } = params;

  if (!PROMOTABLE_SCOPES.includes(to)) {
    return { shared: false, error: 'unsupported_scope' };
  }

  if (!isUuid(memoryId)) {
    return { shared: false, error: 'invalid_id' };
  }

  if (!userId) {
    // Indistinguishable from an unknown id on purpose: an unattributable
    // caller must not be able to probe which ids exist.
    return { shared: false, error: 'not_found' };
  }

  const pool = getAgentGuardPool();

  // The ownership predicate is part of the SELECT, not a comparison after a
  // wider read. A row belonging to somebody else is never fetched.
  const existing = await pool.query<{
    scope: string;
    project_id: string | null;
    provenance: string;
  }>(
    `
    SELECT scope, project_id, provenance
    FROM session_memories
    WHERE id = $1
      AND org_id = $2
      AND status = $3
      AND user_id = $4
    LIMIT 1
    `,
    [memoryId, orgId, ACTIVE_STATUS, userId],
  );

  const row = existing.rows[0];

  if (!row) {
    return { shared: false, error: 'not_found' };
  }

  if (row.scope !== PRIVATE_SCOPE) {
    // Already shared. Promoting again is a no-op at best and a scope
    // DOWNGRADE at worst (project → org widens it), so refuse and say so.
    return { shared: false, error: 'already_shared', scope: row.scope };
  }

  if (to === 'project') {
    if (row.project_id === null) {
      return { shared: false, error: 'no_project' };
    }

    const membership = await pool.query<{ one: number }>(
      `
      SELECT 1 AS one
      FROM project_members pm
      JOIN projects p ON p.id = pm.project_id
      WHERE pm.project_id = $1 AND pm.user_id = $2 AND p.org_id = $3
      LIMIT 1
      `,
      [row.project_id, userId, orgId],
    );

    if (membership.rows.length === 0) {
      return { shared: false, error: 'not_a_member' };
    }
  }

  // `scope = 'private' AND status = 'active'` repeats what the SELECT already
  // checked, and it is NOT redundant: under READ COMMITTED this UPDATE re-reads
  // the latest committed row, so anything committing between the two statements
  // is invisible to the check and visible to the write. Without the guard, a
  // concurrent share(to='project') followed by this share(to='org') leaves the
  // row at 'org' while telling the caller it landed at 'project' — the exact
  // downgrade the `already_shared` refusal exists to prevent, executed
  // silently.
  const updated = await pool.query(
    `
    UPDATE session_memories
    SET scope = $5,
        metadata = COALESCE(metadata, '{}'::jsonb)
                   || jsonb_build_object(
                        'shared_by', CAST($4 AS text),
                        'shared_at', NOW()::text,
                        'shared_via', CAST($6 AS text),
                        'shared_from', 'private'
                      ),
        updated_at = NOW()
    WHERE id = $1
      AND org_id = $2
      AND user_id = $4
      AND scope = $3
      AND status = 'active'
    `,
    [memoryId, orgId, PRIVATE_SCOPE, userId, to, VIA],
  );

  if (updated.rowCount === 0) {
    // The row stopped being a promotable private memory between the SELECT and
    // here. Nothing was written — that is the point — so report the refusal the
    // guard just enforced rather than a success that did not happen.
    const current = await pool.query<{ scope: string }>(
      `SELECT scope FROM session_memories WHERE id = $1 AND org_id = $2 LIMIT 1`,
      [memoryId, orgId],
    );

    return {
      shared: false,
      error: 'already_shared',
      scope: current.rows[0]?.scope ?? row.scope,
    };
  }

  return { shared: true, id: memoryId, scope: to, provenance: row.provenance };
}

export interface DemoteMemoryParams {
  orgId: string;
  memoryId: string;
  userId: string | null;
}

/**
 * Withdraw a share THIS caller made, returning the row to `private`.
 *
 * The guard is deliberately narrower than promote's. Promote asks "is this
 * your private row"; demote asks "is this a row you personally moved out of
 * private", by matching `metadata->>'shared_by'` against the caller. Ownership
 * alone is not enough: `user_id` survives promotion as AUTHORSHIP ("who taught
 * the team this"), and authorship of an org row that was never private is not
 * a licence to remove it from the team.
 *
 * `not_found` and "you did not share this" are separated, unlike promote's
 * uniform `not_found`, because by this point the row is already team-readable
 * — there is no private-scope shape left to conceal, and a caller who can read
 * the row is owed a reason the button did not work.
 */
export async function demoteMemory(
  params: DemoteMemoryParams,
): Promise<DemotionResult> {
  const { orgId, memoryId, userId } = params;

  if (!isUuid(memoryId)) {
    return { reversed: false, error: 'invalid_id' };
  }

  if (!userId) {
    return { reversed: false, error: 'not_found' };
  }

  const pool = getAgentGuardPool();

  const existing = await pool.query<{ scope: string; shared_by: string | null }>(
    `
    SELECT scope, metadata->>'shared_by' AS shared_by
    FROM session_memories
    WHERE id = $1 AND org_id = $2 AND status = $3
    LIMIT 1
    `,
    [memoryId, orgId, ACTIVE_STATUS],
  );

  const row = existing.rows[0];

  if (!row || row.scope === PRIVATE_SCOPE) {
    return { reversed: false, error: 'not_found' };
  }

  if (row.shared_by === null || row.shared_by !== userId) {
    // Somebody else's share, or a row that was never promoted through this
    // path at all. Either way it is not this caller's to withdraw. A row
    // shared by another person answers `not_found` — telling Alice that Bob
    // shared something would attribute a private-scope action to him.
    return {
      reversed: false,
      error: row.shared_by === null ? 'not_shared_by_you' : 'not_found',
    };
  }

  // Same re-read discipline as promote: the guard repeats `shared_by` and the
  // non-private scope so a concurrent change cannot slip between the check and
  // the write.
  const updated = await pool.query(
    `
    UPDATE session_memories
    SET scope = $3,
        metadata = COALESCE(metadata, '{}'::jsonb)
                   || jsonb_build_object(
                        'unshared_by', CAST($4 AS text),
                        'unshared_at', NOW()::text,
                        'unshared_via', CAST($5 AS text)
                      ),
        updated_at = NOW()
    WHERE id = $1
      AND org_id = $2
      AND status = 'active'
      AND scope <> $3
      AND metadata->>'shared_by' = $4
    `,
    [memoryId, orgId, PRIVATE_SCOPE, userId, VIA],
  );

  if (updated.rowCount === 0) {
    return { reversed: false, error: 'not_found' };
  }

  return { reversed: true, id: memoryId, scope: PRIVATE_SCOPE, shared: false };
}

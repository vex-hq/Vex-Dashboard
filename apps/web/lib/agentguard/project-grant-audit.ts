import 'server-only';

import type { PoolClient } from 'pg';

/**
 * The durable record of who changed a project's ACL.
 *
 * `project_grant_audit` (engine migration 032, `action` added by 033) is
 * append-only by intent: a demotion, a re-grant or a removal writes a NEW row
 * rather than editing the old one, so the sequence of ACL changes stays
 * reconstructible after an incident. There is deliberately no update and no
 * delete helper in this file.
 *
 * WHY THIS TAKES A `PoolClient` AND NOT A POOL. Every function here writes
 * inside the caller's transaction, alongside the `project_members` change it
 * describes. The two must commit or roll back together:
 *
 *   - an audit row for a grant that failed to insert is a lie — it says access
 *     was given when it was not;
 *   - a grant with no audit row is the gap this exists to close.
 *
 * Passing the pool instead would take a second connection and therefore a
 * second transaction, which reintroduces both failure modes. The engine's own
 * `record_grant_audit` writes after the grant has committed and swallows
 * failures on purpose (it must not undo an access change the caller was told
 * succeeded); the dashboard can do better because it owns the transaction, so
 * it does.
 */

/** The two verbs `project_grant_audit.action` accepts (CHECK-constrained). */
export type ProjectGrantAction = 'grant' | 'revoke';

/**
 * Which surface performed the change. The engine writes `'mcp'`; everything in
 * this app writes `'dashboard'`.
 */
export const DASHBOARD_SURFACE = 'dashboard';

export interface ProjectGrantAuditEntry {
  readonly orgId: string;
  readonly projectId: string;
  /** The user whose access changed. */
  readonly grantedTo: string;
  /**
   * Their email at the time of the change, or `null` when it could not be
   * resolved.
   *
   * Stored alongside the UUID even though it is redundant today: an email can
   * later be reassigned or the account deleted, so the UUID alone leaves "who
   * was this" unanswerable and the email alone leaves it ambiguous. Both,
   * frozen at the moment of the change.
   */
  readonly grantedToEmail: string | null;
  /**
   * Who performed it, or `null` when the caller is unattributable.
   *
   * Nullable on purpose: "we do not know who did this" is itself worth
   * recording and is strictly better than dropping the row.
   */
  readonly grantedBy: string | null;
  /**
   * For a grant, the role being given. For a revoke, the role the member
   * actually HELD when it was taken away — which is real information ("lost
   * admin" and "lost member" are different events) and satisfies the column's
   * `CHECK (role IN ('read','write','manage','admin'))` without weakening it.
   */
  readonly role: string;
  readonly action: ProjectGrantAction;
}

/**
 * Append one row describing an ACL change, inside the caller's transaction.
 *
 * Throws on failure, which rolls the membership change back with it. That is
 * the intended behaviour: an access change the dashboard cannot record is an
 * access change the dashboard does not make.
 */
export async function recordProjectGrantAudit(
  client: PoolClient,
  entry: ProjectGrantAuditEntry,
): Promise<void> {
  await client.query(
    `INSERT INTO project_grant_audit
       (id, org_id, project_id, granted_to, granted_to_email, granted_by,
        role, surface, action)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.orgId,
      entry.projectId,
      entry.grantedTo,
      entry.grantedToEmail,
      entry.grantedBy,
      entry.role,
      DASHBOARD_SURFACE,
      entry.action,
    ],
  );
}

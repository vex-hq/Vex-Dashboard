import 'server-only';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * Deciding a dreamer proposal: approve (apply) or reject (close).
 *
 * THIS IS A PORT of the engine's `app.proposals` (`POST /proposals/{id}/approve`
 * and `/reject`) plus `shared.memory.retract_memory`, for the same reason
 * `memory-promotion.ts` is a port: the dashboard cannot call those endpoints —
 * they authenticate with `X-Vex-Key` or an OAuth principal and the dashboard
 * holds neither on a user's behalf (API keys are stored as SHA-256 hashes and
 * are unrecoverable) — so the decision is written against the same engine
 * database, using the same guards, in the same order.
 *
 * THE CONCURRENCY CONTRACT, unchanged from the engine:
 *
 *  - Every decision CLAIMS the proposal first, with an atomic
 *    `UPDATE ... WHERE status = 'open'`. A lost claim is `already_decided`.
 *    There is no window in which two concurrent approvals, or an approve
 *    racing a reject, can both believe they own the decision.
 *  - If the apply then fails, the claim is REVERTED to `open` — status-guarded
 *    (`AND status = 'approved'`) so a revert can only ever undo the claim IT
 *    won. A proposal must never sit decided with nothing written.
 *  - Both paths require an attributable caller and record them in
 *    `decided_by`. A decision with no accountable human defeats the point of a
 *    review queue.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO: apply an `add` or a `revise`.
 * Both write memory CONTENT, which in the engine means
 * `shared.brain.write_scoped_memory` / `shared.memory.supersede_with_revision`
 * — and both of those redact the text and generate an embedding before the CAS
 * guard runs. Reproducing that here would mean a second write path with its own
 * redaction and its own embedding, drifting from the engine's, and storing rows
 * that recall cannot rank. So those kinds are refused with `engine_required`
 * BEFORE the claim is taken, leaving the proposal open and reviewable. Only
 * `retire` is applied, because `retract_memory` is pure SQL with no embedding
 * step and can be ported faithfully.
 */

export type ProposalDecisionError =
  | 'not_found'
  | 'already_decided'
  | 'attribution_required'
  | 'engine_required'
  | 'needs_content'
  | 'invalid_proposal'
  | 'forbidden';

export type ProposalDecisionResult =
  | { decided: true; status: 'approved' | 'rejected'; kind?: string }
  | { decided: false; error: ProposalDecisionError; kind?: string };

const STATUS_OPEN = 'open';
const STATUS_APPROVED = 'approved';
const STATUS_REJECTED = 'rejected';

/** Recorded on the retracted row so the audit trail names the surface. */
const RETRACT_VIA = 'dashboard-proposal-approved';
/**
 * The engine records its resolved agent principal in `retracted_by`. A
 * dashboard decision has no agent principal — a human clicked a button — so it
 * records the surface instead of inventing an agent id that never ran.
 */
const RETRACT_BY = 'dashboard';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

interface ProposalRow {
  id: string;
  kind: string;
  target_memory_id: string | null;
  proposed_content: string | null;
  status: string;
}

/** Read-only lookup for the 404/409 checks. NOT the concurrency guard. */
async function loadProposal(
  orgId: string,
  proposalId: string,
): Promise<ProposalRow | null> {
  const pool = getAgentGuardPool();

  const { rows } = await pool.query<ProposalRow>(
    `
    SELECT id, kind, target_memory_id, proposed_content, status
    FROM memory_proposals
    WHERE id = $1 AND org_id = $2
    `,
    [proposalId, orgId],
  );

  return rows[0] ?? null;
}

/**
 * Atomically transition `proposalId` from `open` to `status`.
 *
 * `true` means this call won the claim; `false` means somebody else already
 * decided it and the caller's job is to refuse, not to proceed.
 */
async function claimProposal(
  orgId: string,
  proposalId: string,
  status: typeof STATUS_APPROVED | typeof STATUS_REJECTED,
  decidedBy: string,
): Promise<boolean> {
  const pool = getAgentGuardPool();

  const result = await pool.query(
    `
    UPDATE memory_proposals
    SET status = $3, decided_at = NOW(), decided_by = $4
    WHERE id = $1 AND org_id = $2 AND status = '${STATUS_OPEN}'
    `,
    [proposalId, orgId, status, decidedBy],
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Undo a won claim whose apply then failed.
 *
 * Status-guarded so it can only undo the claim it won — never clobber a
 * decision another request has since made.
 */
async function revertClaim(orgId: string, proposalId: string): Promise<void> {
  const pool = getAgentGuardPool();

  await pool.query(
    `
    UPDATE memory_proposals
    SET status = '${STATUS_OPEN}', decided_at = NULL, decided_by = NULL
    WHERE id = $1 AND org_id = $2 AND status = '${STATUS_APPROVED}'
    `,
    [proposalId, orgId],
  );
}

/**
 * The engine's scope-authorization ladder for acting on an existing row, ported
 * from `shared.memory._authorize_scoped_action`.
 *
 *  - `private` owned by somebody else → `not_found` (indistinguishable from an
 *    id that was never issued; `forbidden` would confirm the row exists).
 *  - `project` the caller is not a member of → `not_found`, same reason. No
 *    org-admin override, matching the engine and the 2026-08-12 ruling.
 *  - `agent`-scoped → `forbidden`. A dashboard caller holds no agent
 *    principal, so it can never match; failing closed is correct.
 *  - anything else → allowed.
 */
async function authorizeScopedAction(
  orgId: string,
  memoryId: string,
  userId: string,
): Promise<'not_found' | 'forbidden' | null> {
  const pool = getAgentGuardPool();

  const { rows } = await pool.query<{
    scope: string;
    user_id: string | null;
    project_id: string | null;
  }>(
    `
    SELECT scope, user_id, project_id
    FROM session_memories
    WHERE id = $1 AND org_id = $2
    LIMIT 1
    `,
    [memoryId, orgId],
  );

  const row = rows[0];

  if (!row) {
    return 'not_found';
  }

  if (row.scope === 'private' && row.user_id !== userId) {
    return 'not_found';
  }

  if (row.scope === 'project') {
    if (!row.project_id) {
      return 'not_found'; // fails closed: an unnamed project cannot vouch
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
      return 'not_found';
    }
  }

  if (row.scope === 'agent') {
    return 'forbidden';
  }

  return null;
}

/**
 * Retract a memory — the port of `shared.memory.retract_memory`.
 *
 * ANY status is retractable, deliberately: the engine dropped its
 * `status = 'active'` filter because it made a curator-superseded row
 * permanently unforgettable. Retracting an already-retracted row is a harmless
 * idempotent no-op.
 */
async function retractMemory(
  orgId: string,
  memoryId: string,
  userId: string,
): Promise<{ forgotten: true } | { forgotten: false; error: string }> {
  if (!isUuid(memoryId)) {
    return { forgotten: false, error: 'invalid_id' };
  }

  const refusal = await authorizeScopedAction(orgId, memoryId, userId);

  if (refusal !== null) {
    return { forgotten: false, error: refusal };
  }

  const pool = getAgentGuardPool();

  await pool.query(
    `
    UPDATE session_memories
    SET status = 'retracted',
        metadata = COALESCE(metadata, '{}'::jsonb)
                   || jsonb_build_object(
                        'retracted_by', CAST($3 AS text),
                        'retracted_at', NOW()::text,
                        'retracted_via', CAST($4 AS text)
                      ),
        updated_at = NOW()
    WHERE id = $1 AND org_id = $2
    `,
    [memoryId, orgId, RETRACT_BY, RETRACT_VIA],
  );

  return { forgotten: true };
}

export interface ProposalDecisionParams {
  orgId: string;
  proposalId: string;
  /** The SIGNED-IN caller. `null` cannot decide anything. */
  userId: string | null;
}

/** Mark a proposal rejected. Never writes to memory — a reject is a record. */
export async function rejectProposal(
  params: ProposalDecisionParams,
): Promise<ProposalDecisionResult> {
  const { orgId, proposalId, userId } = params;

  if (!isUuid(proposalId)) {
    return { decided: false, error: 'not_found' };
  }

  if (!userId) {
    return { decided: false, error: 'attribution_required' };
  }

  const proposal = await loadProposal(orgId, proposalId);

  if (!proposal) {
    return { decided: false, error: 'not_found' };
  }

  if (proposal.status !== STATUS_OPEN) {
    return { decided: false, error: 'already_decided' };
  }

  const claimed = await claimProposal(
    orgId,
    proposalId,
    STATUS_REJECTED,
    userId,
  );

  if (!claimed) {
    return { decided: false, error: 'already_decided' };
  }

  return { decided: true, status: STATUS_REJECTED };
}

/**
 * Apply a proposal.
 *
 * `retire` retracts its target. `add` and `revise` are refused with
 * `engine_required` before any claim is taken — see this module's header for
 * why the dashboard must not write memory content itself.
 */
export async function approveProposal(
  params: ProposalDecisionParams,
): Promise<ProposalDecisionResult> {
  const { orgId, proposalId, userId } = params;

  if (!isUuid(proposalId)) {
    return { decided: false, error: 'not_found' };
  }

  if (!userId) {
    return { decided: false, error: 'attribution_required' };
  }

  const proposal = await loadProposal(orgId, proposalId);

  if (!proposal) {
    return { decided: false, error: 'not_found' };
  }

  if (proposal.status !== STATUS_OPEN) {
    return { decided: false, error: 'already_decided' };
  }

  if (proposal.kind === 'add' || proposal.kind === 'revise') {
    // Refused BEFORE the claim: the proposal stays open and reviewable, so
    // nothing is lost when the engine-backed path lands.
    return { decided: false, error: 'engine_required', kind: proposal.kind };
  }

  if (proposal.kind !== 'retire') {
    return { decided: false, error: 'invalid_proposal', kind: proposal.kind };
  }

  if (!proposal.target_memory_id) {
    return { decided: false, error: 'invalid_proposal', kind: proposal.kind };
  }

  const claimed = await claimProposal(
    orgId,
    proposalId,
    STATUS_APPROVED,
    userId,
  );

  if (!claimed) {
    return { decided: false, error: 'already_decided' };
  }

  const retracted = await retractMemory(
    orgId,
    proposal.target_memory_id,
    userId,
  );

  if (!retracted.forgotten) {
    await revertClaim(orgId, proposalId);

    return {
      decided: false,
      error: retracted.error === 'forbidden' ? 'forbidden' : 'not_found',
    };
  }

  return { decided: true, status: STATUS_APPROVED, kind: 'retire' };
}

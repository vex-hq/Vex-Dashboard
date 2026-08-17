import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * The dreamer's open proposals, for review.
 *
 * `memory_proposals` (migration 045) carries no `user_id` and no per-user
 * scope of its own: a proposal is a claim about the ORG's brain, filed for
 * whichever human gets to it first, and `_claim_proposal` in the engine's
 * `app.proposals` is what stops two of them deciding it twice. So this loader
 * is org-scoped and status-filtered, exactly like the engine's own
 * `GET /proposals?status=open`, and it is backed by the same
 * `ix_memory_proposals_org_status` index that endpoint uses.
 *
 * IT STILL NEVER READS `session_memories`' PRIVATE ROWS. `proposed_content`
 * and `diff` live on the proposal row itself; the target memory is named only
 * by id. A future change that joins this list to `session_memories` to show
 * the target's current content MUST carry the visibility ladder — a proposal
 * about a private row would otherwise print that row's content to the whole
 * org through the review queue. The join is deliberately absent today.
 *
 * `evidence` is rendered INLINE rather than linked. The addendum is explicit
 * about why: "the evidence at decision time *is* the feature. A link to
 * evidence is not the same product."
 */

/** Open proposals fetched per page. The queue is meant to be short. */
export const PROPOSAL_LIST_LIMIT = 50;

/** The only status this surface lists. Decided rows are history, not work. */
export const PROPOSAL_STATUS_OPEN = 'open';

/** `memory_proposals.kind`, per migration 045. */
export type ProposalKind = 'add' | 'revise' | 'retire';

const KNOWN_KINDS = new Set<ProposalKind>(['add', 'revise', 'retire']);

export function isProposalKind(value: string): value is ProposalKind {
  return KNOWN_KINDS.has(value as ProposalKind);
}

export interface OpenProposal {
  id: string;
  /** `add` / `revise` / `retire`, or the raw string if the engine adds one. */
  kind: string;
  /** Which detector filed it: tool_failure / bad_outcome_memory / … */
  detector: string;
  /** The scope the target (or new) memory lives at. */
  scope: string;
  targetMemoryId: string | null;
  /**
   * REVIEWER-FACING RATIONALE ONLY. Migration 045 is emphatic that `diff` is
   * never written to `session_memories` — it exists to help a human decide.
   */
  diff: string;
  /** The literal content approval would write. `null` → cannot be applied. */
  proposedContent: string | null;
  /** The detector's raw counted evidence, rendered inline. */
  evidence: Record<string, unknown>;
  confidence: number | null;
  createdAt: string;
}

interface ProposalQueryRow {
  id: string;
  kind: string;
  detector: string;
  scope: string;
  target_memory_id: string | null;
  diff: string;
  proposed_content: string | null;
  evidence: Record<string, unknown> | null;
  confidence: string | number | null;
  created_at: string;
}

function toProposal(row: ProposalQueryRow): OpenProposal {
  return {
    id: row.id,
    kind: row.kind,
    detector: row.detector,
    scope: row.scope,
    targetMemoryId: row.target_memory_id,
    diff: row.diff,
    proposedContent: row.proposed_content,
    evidence: row.evidence ?? {},
    confidence:
      row.confidence === null || row.confidence === undefined
        ? null
        : Number(row.confidence),
    createdAt: row.created_at,
  };
}

/**
 * This org's open proposals, newest first.
 *
 * Returns `[]` when there is nothing to review — which is the NORMAL state.
 * The dreamer runs periodically and will often find nothing, so the caller's
 * empty state must read as *nothing needs your attention*, never as *this
 * feature is broken*.
 */
export const loadOpenProposals = cache(
  async (orgId: string): Promise<OpenProposal[]> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<ProposalQueryRow>(
      `
      SELECT
        id,
        kind,
        detector,
        scope,
        target_memory_id,
        diff,
        proposed_content,
        evidence,
        confidence,
        created_at::text AS created_at
      FROM memory_proposals
      WHERE org_id = $1 AND status = $2
      ORDER BY created_at DESC
      LIMIT $3
      `,
      [orgId, PROPOSAL_STATUS_OPEN, PROPOSAL_LIST_LIMIT],
    );

    return result.rows.map(toProposal);
  },
);

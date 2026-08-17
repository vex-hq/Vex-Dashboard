import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import type {
  ContextItemDetail,
  ContextItemEvidence,
  SupersessionLink,
} from './context-surfaces.types';
import { toContextCount } from './context-surfaces.types';

/**
 * Per-item evidence, gated by the same visibility ladder as the memory detail
 * route.
 *
 * WHY EVIDENCE IS GATED AT ALL: a count is a disclosure. "This id was recalled
 * 274 times" tells you the id exists, that it is live, and how much somebody
 * leans on it — about a row the asker may have no right to read. So the ladder
 * runs FIRST, in SQL, as a join condition on `session_memories`, and the
 * evidence aggregates hang off the row that survived it. An id the viewer may
 * not read returns `null`, indistinguishable from an id that was never issued.
 *
 * The ladder is the one `memory-detail.loader.ts` already enforces, restated
 * here in the same CASE shape rather than imported, for the reason that file
 * and `private-memory.loader.ts` both give at length: each query owns its own
 * predicate, because a shared predicate builder is a single point at which
 * every call site can be widened at once.
 *
 *   private  → only the owner (`user_id = :viewer`). Admins included: no
 *              override, no break-glass.
 *   project  → project members only, via `EXISTS project_members`. No admin
 *              bypass (2026-08-12 ruling).
 *   anything → everyone in the org.
 *
 * AVAILABLE FIELDS ONLY. `recall_outcomes` carries `used`, `usage_score` and
 * `served_stale`. It has NO verdict column and NO per-outcome agent
 * attribution, so this loader returns three counts and nothing that could be
 * rendered as a pass/fail grade or as "agent X used this". See the 2026-08-17
 * addendum. `usage_score` is deliberately not surfaced: it is a nullable
 * numeric with no documented scale, and a number on screen with no scale is a
 * claim the schema does not support.
 */

export interface ContextViewer {
  /** The SIGNED-IN user's id. Never taken from the URL or a form field. */
  readonly userId: string | null;
}

interface DetailQueryRow {
  id: string;
  memory_type: string;
  content: string;
  scope: string;
  status: string;
  project_id: string | null;
  project_name: string | null;
  agent_id: string | null;
  created_at: string;
  owned_by_viewer: boolean;
  promoted_by_viewer: boolean;
  superseded_by: string | null;
}

interface EvidenceQueryRow {
  recalled_count: string;
  used_count: string;
  served_stale_count: string;
}

interface LinkQueryRow {
  id: string;
  content: string;
  created_at: string;
}

const ZERO_EVIDENCE: ContextItemEvidence = {
  recalledCount: 0,
  usedCount: 0,
  servedStaleCount: 0,
};

function toLink(row: LinkQueryRow | undefined): SupersessionLink | null {
  if (!row) return null;

  return { id: row.id, content: row.content, createdAt: row.created_at };
}

/**
 * The visibility-gated row, or `null`.
 *
 * `promoted_by_viewer` reads `metadata->>'shared_by'`, the marker
 * `shared.promotion.promote_memory` writes when it moves a row out of private.
 * It is the ONLY basis on which the reverse action is offered: a row somebody
 * else shared, or a row that was born org-scoped, is not this viewer's to pull
 * back.
 */
async function loadRow(
  orgId: string,
  id: string,
  viewer: ContextViewer,
): Promise<DetailQueryRow | null> {
  const pool = getAgentGuardPool();

  const result = await pool.query<DetailQueryRow>(
    `
    SELECT
      m.id,
      m.memory_type,
      m.content,
      m.scope,
      m.status,
      m.project_id,
      pr.display_name AS project_name,
      m.agent_id,
      m.created_at::text AS created_at,
      (m.user_id IS NOT NULL AND m.user_id = $3) AS owned_by_viewer,
      (m.metadata->>'shared_by' IS NOT NULL AND m.metadata->>'shared_by' = $3)
        AS promoted_by_viewer,
      m.superseded_by
    FROM session_memories m
    LEFT JOIN projects pr ON pr.id = m.project_id AND pr.org_id = m.org_id
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
}

/**
 * Counted evidence for one memory id, org-scoped.
 *
 * Called only AFTER {@link loadRow} has established the viewer may read the
 * row, so these two queries never need the ladder themselves — but they do
 * still carry `org_id`, because a tenancy fence that only one query in a pair
 * enforces is a tenancy fence waiting to be refactored away.
 *
 * `recalled_count` counts `brain_recall_events` rows whose `memory_ids` array
 * contains this id (migration 042 added that column; before it, this number
 * was unanswerable and the Aug-11 design said so).
 */
async function loadEvidence(
  orgId: string,
  id: string,
): Promise<ContextItemEvidence> {
  const pool = getAgentGuardPool();

  const [recallResult, outcomeResult] = await Promise.all([
    pool.query<{ recalled_count: string }>(
      `
      SELECT COUNT(*) AS recalled_count
      FROM brain_recall_events
      WHERE org_id = $1 AND memory_ids @> ARRAY[$2::uuid]
      `,
      [orgId, id],
    ),
    pool.query<Omit<EvidenceQueryRow, 'recalled_count'>>(
      `
      SELECT
        COUNT(*) FILTER (WHERE used) AS used_count,
        COUNT(*) FILTER (WHERE served_stale) AS served_stale_count
      FROM recall_outcomes
      WHERE org_id = $1 AND memory_id = $2::uuid
      `,
      [orgId, id],
    ),
  ]);

  return {
    recalledCount: toContextCount(recallResult.rows[0]?.recalled_count),
    usedCount: toContextCount(outcomeResult.rows[0]?.used_count),
    servedStaleCount: toContextCount(outcomeResult.rows[0]?.served_stale_count),
  };
}

/**
 * The two-node supersession chain: the row this one replaced, and the row that
 * replaced this one.
 *
 * TWO NODES, NOT A GRAPH. The addendum is explicit that this chain "is the
 * only graph in this design" and the knowledge graph is not built (359 edges
 * over 5,227 memories; graph expansion contributed nothing in 8 of 8 retrieval
 * replays). One step back and one step forward answers "what was this, what is
 * it now" without advertising a traversal that has no data behind it.
 *
 * Both halves re-apply the ladder. The chain can cross scope — a private row
 * may be superseded by an org-scoped one and vice versa — so the neighbour is
 * not covered by the check that admitted the row the viewer asked for.
 */
async function loadChainNeighbours(
  orgId: string,
  row: DetailQueryRow,
  viewer: ContextViewer,
): Promise<{ replaced: SupersessionLink | null; replacedBy: SupersessionLink | null }> {
  const pool = getAgentGuardPool();

  const LADDER = `
    CASE m.scope
      WHEN 'private' THEN m.user_id IS NOT NULL AND m.user_id = $3
      WHEN 'project' THEN EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = m.project_id AND pm.user_id = $3
      )
      ELSE TRUE
    END`;

  const [predecessorResult, successorResult] = await Promise.all([
    pool.query<LinkQueryRow>(
      `
      SELECT m.id, m.content, m.created_at::text AS created_at
      FROM session_memories m
      WHERE m.org_id = $1
        AND m.superseded_by = $2::uuid
        AND ${LADDER}
      ORDER BY m.created_at DESC
      LIMIT 1
      `,
      [orgId, row.id, viewer.userId],
    ),
    row.superseded_by === null
      ? Promise.resolve({ rows: [] as LinkQueryRow[] })
      : pool.query<LinkQueryRow>(
          `
          SELECT m.id, m.content, m.created_at::text AS created_at
          FROM session_memories m
          WHERE m.org_id = $1
            AND m.id = $2::uuid
            AND ${LADDER}
          LIMIT 1
          `,
          [orgId, row.superseded_by, viewer.userId],
        ),
  ]);

  return {
    replaced: toLink(predecessorResult.rows[0]),
    replacedBy: toLink(successorResult.rows[0]),
  };
}

/**
 * One context item with its evidence and its two-node chain, or `null` when
 * the viewer may not read it.
 *
 * `viewer` is a required argument with no default. There is no
 * `loadContextItemDetail(orgId, id)` overload to fall back to, so a new call
 * site cannot forget to say who is asking.
 */
export const loadContextItemDetail = cache(
  async (
    orgId: string,
    id: string,
    viewer: ContextViewer,
  ): Promise<ContextItemDetail | null> => {
    const row = await loadRow(orgId, id, viewer);

    if (!row) {
      return null;
    }

    const [evidence, chain] = await Promise.all([
      loadEvidence(orgId, row.id),
      loadChainNeighbours(orgId, row, viewer),
    ]);

    return {
      id: row.id,
      kind: row.memory_type,
      content: row.content,
      scope: row.scope,
      status: row.status,
      projectId: row.project_id,
      projectName: row.project_name,
      agentId: row.agent_id,
      createdAt: row.created_at,
      ownedByViewer: row.owned_by_viewer,
      promotedByViewer: row.promoted_by_viewer,
      evidence: evidence ?? ZERO_EVIDENCE,
      replaced: chain.replaced,
      replacedBy: chain.replacedBy,
    };
  },
);

/**
 * Shared row shapes for the context surfaces (shared/private split, per-item
 * evidence).
 *
 * TYPES ONLY — deliberately no query helpers, no predicate builders, no
 * "scope" parameter anywhere in this file.
 *
 * This mirrors `memory/_lib/server/memory-visibility.types.ts` and exists for
 * the same reason it does: the two halves of the shared/private split are two
 * loaders with two hard-coded predicates. Sharing a *type* costs nothing;
 * sharing a *query builder* would recreate the single `loadContext(scope)`
 * entry point whose one wrong default renders one person's private context on
 * another person's screen.
 */

/** Rows fetched per group on the context split. Both groups use the same cap. */
export const CONTEXT_GROUP_LIMIT = 50;

/** Only active rows are listed; retracted/superseded stay out of both groups. */
export const CONTEXT_STATUS_ACTIVE = 'active';

/** The scope a shared row lives at. Org is the only org-wide readable scope. */
export const CONTEXT_SCOPE_ORG = 'org';

/** The scope a private row lives at. */
export const CONTEXT_SCOPE_PRIVATE = 'private';

/** One row in either group of the shared/private split. */
export interface ContextListItem {
  id: string;
  kind: string;
  content: string;
  projectId: string | null;
  projectName: string | null;
  agentId: string | null;
  createdAt: string;
}

/** A labelled group on the split: its rows and the TOTAL matching count. */
export interface ContextGroup {
  items: ContextListItem[];
  /**
   * Total rows matching the group's predicate, not `items.length`. The list is
   * capped at {@link CONTEXT_GROUP_LIMIT}; the count is the honest total, and
   * the header shows the count because "5,196 private / 1 shared" is the fact
   * the surface exists to tell.
   */
  total: number;
}

/**
 * Per-item evidence.
 *
 * FIELDS THE SCHEMA ACTUALLY CARRIES, AND NOTHING ELSE. `recall_outcomes` has
 * `used`, `usage_score` and `served_stale`. It has NO verdict column and no
 * per-outcome agent attribution, so this shape carries no verdict and no agent
 * — any UI copy implying pass/fail grading, or naming the agent that used a
 * memory, would be fiction. See the 2026-08-17 addendum, "Available fields
 * only".
 */
export interface ContextItemEvidence {
  /** Times this memory's id appeared in `brain_recall_events.memory_ids`. */
  recalledCount: number;
  /** `recall_outcomes` rows for this memory with `used = TRUE`. */
  usedCount: number;
  /** `recall_outcomes` rows for this memory with `served_stale = TRUE`. */
  servedStaleCount: number;
}

/** One end of the supersession chain: what this was, or what replaced it. */
export interface SupersessionLink {
  id: string;
  content: string;
  createdAt: string;
}

/**
 * The item detail behind the peek pane: the row itself, its evidence, and a
 * short two-node supersession chain (predecessor / successor).
 *
 * `scope` is carried because the share action is only offered for a private
 * row and the reverse only for a row this viewer promoted.
 */
export interface ContextItemDetail {
  id: string;
  kind: string;
  content: string;
  scope: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  agentId: string | null;
  createdAt: string;
  /** TRUE when this viewer owns the row (`user_id` matches). */
  ownedByViewer: boolean;
  /** TRUE when this row was promoted out of private by this viewer. */
  promotedByViewer: boolean;
  evidence: ContextItemEvidence;
  /** The row this one replaced, if any. */
  replaced: SupersessionLink | null;
  /** The row that replaced this one, if any. */
  replacedBy: SupersessionLink | null;
}

/** Coerce a Postgres `count`/`bigint` text column into a number. */
export function toContextCount(
  value: string | number | null | undefined,
): number {
  if (typeof value === 'number') return value;

  return parseInt(value ?? '0', 10) || 0;
}

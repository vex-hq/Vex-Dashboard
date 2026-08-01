/**
 * Shared row shapes and constants for the three memory tabs.
 *
 * TYPES ONLY — deliberately no query helpers live here.
 *
 * The three tab loaders (`private-memory.loader`, `project-memory.loader`,
 * `team-memory.loader`) each own their own SQL and each bakes its own
 * visibility predicate in. Sharing a *type* costs nothing; sharing a *query
 * builder* would recreate the single `loadMemories(scope)` entry point the
 * user-silo design exists to prevent, where one wrong default renders one
 * person's private memories on another person's screen.
 */

/** Rows per page across every memory list. */
export const MEMORY_PAGE_SIZE = 25;

/** Only active rows are ever listed; retracted/superseded stay hidden. */
export const MEMORY_STATUS_ACTIVE = 'active';

/**
 * `session_memories.provenance` (migration 031, CHECK-constrained, NOT NULL).
 *
 * - `EXTRACTED` — stated directly by the user or an explicit tool call.
 * - `INFERRED`  — deduced by the curator or another LLM pass. A deduction, not
 *   a quote, and the UI must render it visibly differently.
 * - `AMBIGUOUS` — uncertain; surfaced for review rather than trusted.
 */
export type MemoryProvenance = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';

/** A row in any of the three memory tables. */
export interface MemoryListRow {
  id: string;
  agent_id: string;
  memory_type: string;
  content: string;
  provenance: MemoryProvenance;
  project_id: string | null;
  space_id: string | null;
  space_name: string | null;
  source: string | null;
  created_at: string;
}

export interface MemoryListResult {
  rows: MemoryListRow[];
  pageCount: number;
}

/**
 * An artifact card.
 *
 * Visibility never comes from the `artifacts` table — it has no `scope` and no
 * `user_id`. It comes from the `session_memories` pointer row
 * (`memory_type = 'artifact'`, `metadata->>'artifact_id'`), which carries the
 * scope and owner. Every artifact query therefore starts at `session_memories`
 * and joins outward.
 */
export interface ArtifactCardRow {
  /** `artifacts.id`. */
  id: string;
  /** The `session_memories` row that makes this artifact visible. */
  memory_id: string;
  title: string;
  summary: string | null;
  kind: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

/** Coerce a Postgres `count`/`bigint` text column into a number. */
export function toCount(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;

  return parseInt(value ?? '0', 10) || 0;
}

/** Total pages for a windowed `COUNT(*) OVER()` total. */
export function pageCountFor(totalCount: number): number {
  return totalCount === 0 ? 0 : Math.ceil(totalCount / MEMORY_PAGE_SIZE);
}

/** Clamp an incoming page number to a 1-based page and its LIMIT offset. */
export function pageWindow(page: number | undefined): {
  page: number;
  offset: number;
} {
  const effectivePage = Math.max(1, page ?? 1);

  return {
    page: effectivePage,
    offset: (effectivePage - 1) * MEMORY_PAGE_SIZE,
  };
}

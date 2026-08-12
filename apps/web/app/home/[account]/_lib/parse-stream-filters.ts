import type { StreamFilters } from './server/context-stream.loader';

/**
 * The raw shape of `page.tsx`'s `searchParams`, before validation. Every
 * field is a bare string (or absent) because that's what a URL query string
 * gives you — nothing here is trusted until it passes through
 * {@link parseStreamFilters}.
 */
export interface RawStreamSearchParams {
  project?: string;
  agent?: string;
  kind?: string;
  days?: string;
}

/**
 * The `kind` values `StreamFilters.kind` (and the loader's `isKnownKind`
 * guard) actually recognize. Kept in sync with
 * `_components/context-stream.tsx`'s `KIND_FILTER_OPTIONS` — both lists
 * intentionally exclude `'other'`, which is a display bucket for unknown
 * `memory_type` values, never a value stored or filterable in SQL.
 */
const KNOWN_KINDS = new Set(['decision', 'plan', 'fact', 'note']);

/**
 * Parse the home page's `?project=&agent=&kind=&days=` search params into
 * {@link StreamFilters}, server-side.
 *
 * This is what makes a filtered context-stream view shareable as a URL: the
 * page re-derives the same filters from the query string on every request,
 * rather than trusting client-held state. A bad or tampered value (unknown
 * `kind`, non-numeric or non-positive `days`) degrades to "no filter" —
 * never throws — because a stale bookmark or a hand-edited URL should fall
 * back to the unfiltered stream, not break the page.
 */
export function parseStreamFilters(
  params: RawStreamSearchParams,
): StreamFilters {
  const projectId = params.project?.trim() || undefined;
  const agentId = params.agent?.trim() || undefined;
  const kind =
    params.kind && KNOWN_KINDS.has(params.kind) ? params.kind : undefined;
  const days = parsePositiveInteger(params.days);

  return { projectId, agentId, kind, days };
}

/** A positive integer, and nothing else — no decimals, no leading `-`, no `0`. */
function parsePositiveInteger(raw: string | undefined): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;

  const parsed = Number(raw);
  return parsed > 0 ? parsed : undefined;
}

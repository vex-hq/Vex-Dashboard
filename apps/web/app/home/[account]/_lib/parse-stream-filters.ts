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
 * The Hub's resting view is the last 7 days. `?days=` omitted means 7.
 * `?days=all` is the explicit all-time opt-in. A bad or tampered value
 * (unknown `kind`, non-numeric days) degrades to the default rather than
 * throwing, so a stale bookmark never breaks the page.
 */
export const HUB_DEFAULT_STREAM_DAYS = 7;
export const HUB_ALL_TIME_DAYS_PARAM = 'all';

/**
 * Parse the home page's `?project=&agent=&kind=&days=` search params into
 * {@link StreamFilters}, server-side.
 *
 * This is what makes a filtered context-stream view shareable as a URL: the
 * page re-derives the same filters from the query string on every request,
 * rather than trusting client-held state.
 */
export function parseStreamFilters(
  params: RawStreamSearchParams,
): StreamFilters {
  const projectId = params.project?.trim() || undefined;
  const agentId = params.agent?.trim() || undefined;
  const kind =
    params.kind && KNOWN_KINDS.has(params.kind) ? params.kind : undefined;

  return { projectId, agentId, kind, days: parseDays(params.days) };
}

function parseDays(raw: string | undefined): number | undefined {
  if (raw === HUB_ALL_TIME_DAYS_PARAM) return undefined;
  if (!raw) return HUB_DEFAULT_STREAM_DAYS;

  return parsePositiveInteger(raw) ?? HUB_DEFAULT_STREAM_DAYS;
}

/** A positive integer, and nothing else — no decimals, no leading `-`, no `0`. */
function parsePositiveInteger(raw: string | undefined): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;

  const parsed = Number(raw);
  return parsed > 0 ? parsed : undefined;
}

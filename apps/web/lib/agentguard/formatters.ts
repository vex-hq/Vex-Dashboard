/**
 * Display formatting utilities for AgentGuard dashboard values.
 */

/**
 * Format a confidence score (0-1) as a percentage string.
 * Returns '—' for null/undefined values.
 */
export function formatConfidence(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format latency in milliseconds to a human-readable string.
 * Values >= 1000ms are shown in seconds.
 */
export function formatLatency(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(0)}ms`;
}

/**
 * Format a cost estimate as USD.
 */
export function formatCost(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

/**
 * Format token count with thousands separator.
 */
export function formatTokens(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('en-US');
}

/**
 * Format an ISO timestamp to a locale-aware short date/time string.
 */
export function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate a UUID or long ID to the first 8 characters for display.
 */
export function truncateId(id: string, length = 8): string {
  if (id.length <= length) return id;
  return `${id.slice(0, length)}…`;
}

/**
 * Largest-to-smallest unit ladder for {@link formatRelativeTime}. Each
 * threshold is the minimum age (in ms) at which that unit applies.
 */
const RELATIVE_TIME_UNITS: ReadonlyArray<{
  unit: Intl.RelativeTimeFormatUnit;
  ms: number;
}> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
];

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

/**
 * Format an ISO timestamp as a relative time string ("3 hours ago", "just
 * now"). Returns '—' for missing or unparseable input.
 *
 * `now` is injectable so callers (and their tests) can pin the reference
 * instant instead of depending on wall-clock time.
 */
export function formatRelativeTime(
  isoString: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!isoString) return '—';

  const then = new Date(isoString);
  if (Number.isNaN(then.getTime())) return '—';

  const diffMs = then.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  for (const { unit, ms } of RELATIVE_TIME_UNITS) {
    if (absMs >= ms) {
      return RELATIVE_TIME_FORMATTER.format(Math.round(diffMs / ms), unit);
    }
  }

  return RELATIVE_TIME_FORMATTER.format(0, 'second');
}

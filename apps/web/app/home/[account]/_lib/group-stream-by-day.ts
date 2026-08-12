import type { ContextItem } from './server/context-stream.loader';

/**
 * Groups an already-ordered (newest-first) `ContextItem[]` under day
 * headers for the Band 3 timeline — "Today" / "Yesterday" / weekday + date —
 * without re-sorting: within a day, items keep the order the loader gave
 * them (`ORDER BY created_at DESC`).
 *
 * Pure and framework-free so the day-boundary and label logic is
 * unit-testable without mounting `<ContextStream>`.
 */

export interface StreamDayGroup {
  /** 'YYYY-MM-DD', the UTC calendar day derived from each item's `createdAt`. */
  key: string;
  label: string;
  items: ContextItem[];
}

/**
 * `createdAt` is Postgres `timestamptz::text` — always `'YYYY-MM-DD
 * HH:MM:SS...'` or ISO-with-offset, so the first 10 characters are always
 * the calendar day. Slicing avoids a second Date parse per item.
 */
function dayKey(createdAt: string): string {
  return createdAt.slice(0, 10);
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayLabel(day: string, now: Date): string {
  const today = utcDayKey(now);
  const yesterday = utcDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  if (day === today) return 'Today';
  if (day === yesterday) return 'Yesterday';

  const date = new Date(`${day}T00:00:00Z`);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * @param items - Newest-first `ContextItem[]`, exactly as
 *   {@link loadContextStream} returns it. Never re-sorted here.
 * @param now - Injectable reference instant, matching `formatRelativeTime`'s
 *   convention, so "Today"/"Yesterday" is deterministic in tests.
 */
export function groupStreamByDay(
  items: ContextItem[],
  now: Date = new Date(),
): StreamDayGroup[] {
  const order: string[] = [];
  const byDay = new Map<string, ContextItem[]>();

  for (const item of items) {
    const key = dayKey(item.createdAt);
    let bucket = byDay.get(key);
    if (!bucket) {
      bucket = [];
      byDay.set(key, bucket);
      order.push(key);
    }
    bucket.push(item);
  }

  return order.map((key) => ({
    key,
    label: dayLabel(key, now),
    items: byDay.get(key)!,
  }));
}

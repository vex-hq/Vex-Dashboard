/**
 * Pure geometry + summary text for the Hub's inline-SVG sparklines
 * (`_components/sparkline.tsx`). No chart library: a single series is drawn
 * as a plain polyline against a recessive baseline, and every sparkline
 * carries a plain-English `aria-label` — a line alone communicates nothing
 * to a screen reader.
 *
 * The series passed in is always already gap-filled and zero-counted by the
 * loader (`gapFillSeries` in `hub-summary.loader.ts`) — this module never
 * fabricates or skips a day, it only maps counts to pixels and words.
 */

export interface SparklinePoint {
  day: string; // 'YYYY-MM-DD'
  count: number;
}

/**
 * An SVG `<path>` `d` attribute plotting `series` left-to-right across
 * `width`x`height`, inset by `padding` on every side. Values are plotted
 * as-is against a 0-based floor (counts are never negative) — no smoothing,
 * no interpolation across gaps, because the series has no gaps by the time
 * it reaches here.
 *
 * Returns '' for an empty series (nothing to plot).
 */
export function buildSparklinePath(
  series: SparklinePoint[],
  width: number,
  height: number,
  padding = 2,
): string {
  if (series.length === 0) return '';

  const max = series.reduce((best, point) => Math.max(best, point.count), 0);
  const innerWidth = Math.max(width - padding * 2, 0);
  const innerHeight = Math.max(height - padding * 2, 0);
  const stepX = series.length > 1 ? innerWidth / (series.length - 1) : 0;

  const coords = series.map((point, index) => {
    const x = padding + stepX * index;
    const ratio = max === 0 ? 0 : point.count / max;
    const y = padding + innerHeight * (1 - ratio);
    return `${round(x)},${round(y)}`;
  });

  return `M${coords.join(' L')}`;
}

function round(value: number): string {
  return value.toFixed(2);
}

/**
 * Plain-English description of `series` for `aria-label`, e.g. "30-day
 * activity, 142 items, peak 19 on 3 August" — or "30-day activity, no items"
 * when the whole window is empty. `windowDays` is passed rather than
 * inferred from `series.length` so a caller can still label a partial
 * series honestly.
 */
export function summarizeSparkline(
  series: SparklinePoint[],
  windowDays: number,
): string {
  const total = series.reduce((sum, point) => sum + point.count, 0);

  if (series.length === 0 || total === 0) {
    return `${windowDays}-day activity, no items`;
  }

  const peak = series.reduce(
    (best, point) => (point.count > best.count ? point : best),
    series[0]!,
  );

  return `${windowDays}-day activity, ${total} items, peak ${peak.count} on ${formatDayLabel(peak.day)}`;
}

/**
 * 'YYYY-MM-DD' -> "3 August", parsed as UTC so no local-timezone off-by-one.
 * Built from `getUTCDate()` + a month-only `toLocaleDateString` rather than
 * a combined `{ day, month }` format: `Intl`'s day/month ORDER for 'en-US'
 * is locale-defined (observed as "August 3" in this runtime's ICU data),
 * not the "day month" order this label always wants.
 */
function formatDayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const month = date.toLocaleDateString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });

  return `${date.getUTCDate()} ${month}`;
}

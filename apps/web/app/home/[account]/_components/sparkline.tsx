import { cn } from '@kit/ui/utils';

import {
  buildSparklinePath,
  summarizeSparkline,
  type SparklinePoint,
} from '../_lib/sparkline-geometry';

export interface SparklineProps {
  series: SparklinePoint[];
  /** The window the series spans, e.g. 30 — feeds the aria-label's "N-day activity" prefix. */
  windowDays: number;
  width?: number;
  height?: number;
  className?: string;
  /** Tailwind stroke-color class for the plotted line. Ink carries emphasis, never kind. */
  strokeClassName?: string;
}

/**
 * A single-series inline SVG sparkline: no chart library, no legend, no
 * axes — just a 2px rounded-cap line against a recessive baseline. The
 * series is plotted exactly as given (already gap-filled and zero-counted
 * upstream by `loadHubSummary`'s `gapFillSeries`).
 *
 * A line alone says nothing to a screen reader, so every sparkline carries
 * a plain-English `aria-label` ("30-day activity, 142 items, peak 19 on 3
 * August") via `role="img"` — see `sparkline-geometry.ts`'s
 * `summarizeSparkline`.
 */
export function Sparkline({
  series,
  windowDays,
  width = 120,
  height = 32,
  className,
  strokeClassName = 'stroke-primary',
}: SparklineProps) {
  const path = buildSparklinePath(series, width, height);
  const ariaLabel = summarizeSparkline(series, windowDays);
  const baselineY = height - 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className={cn('block overflow-visible', className)}
    >
      <line
        x1={2}
        y1={baselineY}
        x2={width - 2}
        y2={baselineY}
        className="stroke-border"
        strokeWidth={1}
      />
      {path ? (
        <path
          d={path}
          fill="none"
          className={strokeClassName}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

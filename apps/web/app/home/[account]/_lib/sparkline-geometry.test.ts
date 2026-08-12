import { describe, expect, it } from 'vitest';

import { buildSparklinePath, summarizeSparkline } from './sparkline-geometry';

describe('buildSparklinePath', () => {
  it('returns an empty string for an empty series', () => {
    expect(buildSparklinePath([], 100, 20)).toBe('');
  });

  it('plots a flat baseline at the bottom edge when every count is zero', () => {
    const path = buildSparklinePath(
      [
        { day: '2026-08-01', count: 0 },
        { day: '2026-08-02', count: 0 },
      ],
      100,
      20,
      2,
    );

    // Both points should sit on the inner-bottom edge (height - padding).
    // width=100, padding=2 -> the last x sits at padding + innerWidth = 98.
    expect(path).toBe('M2.00,18.00 L98.00,18.00');
  });

  it('plots the peak point at the top inner edge', () => {
    const path = buildSparklinePath(
      [
        { day: '2026-08-01', count: 0 },
        { day: '2026-08-02', count: 10 },
      ],
      100,
      20,
      2,
    );

    // Second point is the max (10) -> y = padding (top); x is still 98 (see
    // the flat-baseline test above for the width/padding math).
    expect(path).toBe('M2.00,18.00 L98.00,2.00');
  });

  // Mutation check: swapping `point.count / max` for `1 - point.count / max`
  // (or similar sign flip) would invert the chart — peak would sit at the
  // bottom instead of the top. This pins the direction.
  it('never inverts high values to the bottom', () => {
    const path = buildSparklinePath(
      [{ day: '2026-08-01', count: 5 }],
      50,
      20,
      2,
    );

    const [, y] = path.replace('M', '').split(',');
    // A single max-value point should sit at the top inner edge (y = padding).
    expect(Number(y)).toBeCloseTo(2, 1);
  });
});

describe('summarizeSparkline', () => {
  it('reports "no items" for an all-zero series', () => {
    const label = summarizeSparkline(
      [
        { day: '2026-08-01', count: 0 },
        { day: '2026-08-02', count: 0 },
      ],
      30,
    );

    expect(label).toBe('30-day activity, no items');
  });

  it('reports total and peak day/value in words', () => {
    const label = summarizeSparkline(
      [
        { day: '2026-08-01', count: 4 },
        { day: '2026-08-03', count: 19 },
        { day: '2026-08-05', count: 2 },
      ],
      30,
    );

    expect(label).toBe('30-day activity, 25 items, peak 19 on 3 August');
  });

  it('picks the first occurrence of a tied peak', () => {
    const label = summarizeSparkline(
      [
        { day: '2026-08-01', count: 5 },
        { day: '2026-08-02', count: 5 },
      ],
      30,
    );

    expect(label).toContain('peak 5 on 1 August');
  });
});

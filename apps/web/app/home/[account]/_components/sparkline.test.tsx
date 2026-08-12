// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Sparkline } from './sparkline';

describe('<Sparkline />', () => {
  it('exposes a plain-English aria-label summarizing the series', () => {
    render(
      <Sparkline
        series={[
          { day: '2026-08-01', count: 4 },
          { day: '2026-08-03', count: 19 },
        ]}
        windowDays={30}
      />,
    );

    expect(
      screen.getByRole('img', {
        name: '30-day activity, 23 items, peak 19 on 3 August',
      }),
    ).toBeInTheDocument();
  });

  it('renders no path when the series is empty, but still renders the baseline', () => {
    const { container } = render(<Sparkline series={[]} windowDays={30} />);

    expect(container.querySelector('path')).not.toBeInTheDocument();
    expect(container.querySelector('line')).toBeInTheDocument();
  });

  // Mutation check: dropping `role="img"` (or the aria-label) would make the
  // chart invisible to assistive tech with no way to tell — this pins that
  // an all-zero series still reports "no items" rather than silence.
  it('reports "no items" instead of a silent empty label for an all-zero series', () => {
    render(
      <Sparkline
        series={[
          { day: '2026-08-01', count: 0 },
          { day: '2026-08-02', count: 0 },
        ]}
        windowDays={30}
      />,
    );

    expect(
      screen.getByRole('img', { name: '30-day activity, no items' }),
    ).toBeInTheDocument();
  });
});

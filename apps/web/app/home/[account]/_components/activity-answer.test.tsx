// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { HubSummary } from '../_lib/server/hub-summary.loader';
import { ActivityAnswer } from './activity-answer';

function summary(overrides: Partial<HubSummary>): HubSummary {
  return {
    decisions7d: 0,
    plans7d: 0,
    facts7d: 0,
    notes7d: 0,
    projectsActive7d: 0,
    agentsActive7d: [],
    lastActivityAt: null,
    volume30d: [],
    projectSparks: [],
    ...overrides,
  };
}

describe('<ActivityAnswer />', () => {
  it('shows written, recalled and live as three numbers', () => {
    render(
      <ActivityAnswer
        summary={summary({ facts7d: 200, notes7d: 5 })}
        recalls={12}
      />,
    );

    expect(screen.getByTestId('hub-stat-written')).toHaveTextContent('205');
    expect(screen.getByTestId('hub-stat-recalled')).toHaveTextContent('12');
    expect(screen.getByTestId('hub-stat-live')).toHaveTextContent('0');
  });

  it('marks recalled as a warning when the brain is write-only', () => {
    render(<ActivityAnswer summary={summary({ facts7d: 205 })} recalls={0} />);

    expect(screen.getByTestId('hub-stat-recalled').querySelector('dd')).toHaveClass(
      'text-destructive',
    );
  });

  it('does not warn on zero recalled when nothing was written', () => {
    render(<ActivityAnswer summary={summary({})} recalls={0} />);

    expect(
      screen.getByTestId('hub-stat-recalled').querySelector('dd'),
    ).not.toHaveClass('text-destructive');
  });

  it('shows the last-activity relative time and named agents', () => {
    render(
      <ActivityAnswer
        summary={summary({
          lastActivityAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          agentsActive7d: ['agent-1', 'agent-2'],
        })}
      />,
    );

    const meta = screen.getByTestId('hub-answer-meta');
    expect(within(meta).getByText(/hour ago/i)).toBeInTheDocument();
    expect(screen.getByTestId('hub-agents-active')).toHaveAccessibleName(
      /2 agents active/i,
    );
    expect(within(meta).getByText('agent-1')).toBeInTheDocument();
    expect(within(meta).getByText('agent-2')).toBeInTheDocument();
  });

  it('shows a placeholder instead of a relative time when nothing has ever happened', () => {
    render(<ActivityAnswer summary={summary({ lastActivityAt: null })} />);

    expect(screen.getByTestId('hub-last-activity')).toHaveTextContent(
      /no activity yet/i,
    );
  });

  it('renders the week as a 7-day heat strip', () => {
    render(
      <ActivityAnswer
        summary={summary({
          volume30d: [
            { day: '2026-08-01', count: 3 },
            { day: '2026-08-02', count: 5 },
          ],
        })}
      />,
    );

    expect(
      screen.getByRole('img', { name: /7-day activity/i }),
    ).toBeInTheDocument();
  });
});

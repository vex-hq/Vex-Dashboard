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
  it('answers with decisions and plans, both counts and the project count large', () => {
    render(
      <ActivityAnswer
        summary={summary({
          decisions7d: 14,
          plans7d: 6,
          projectsActive7d: 3,
        })}
      />,
    );

    const line = screen.getByTestId('hub-answer-line');
    expect(within(line).getByText('14')).toBeInTheDocument();
    expect(within(line).getByText('6')).toBeInTheDocument();
    expect(within(line).getByText('3')).toBeInTheDocument();
    expect(within(line).getByText(/decisions/)).toBeInTheDocument();
    expect(within(line).getByText(/plans/)).toBeInTheDocument();
  });

  // Mutation check: dropping the `projects > 0` guard (always showing the
  // "across N projects" clause) would render "across 0 projects" here.
  it('drops the projects clause when no project is active, rather than saying "0 projects"', () => {
    render(
      <ActivityAnswer
        summary={summary({ decisions7d: 5, plans7d: 2, projectsActive7d: 0 })}
      />,
    );

    const line = screen.getByTestId('hub-answer-line');
    expect(within(line).queryByText('0')).not.toBeInTheDocument();
    expect(within(line).queryByText(/projects/)).not.toBeInTheDocument();
  });

  it('reports facts honestly when there are no decisions or plans this week', () => {
    render(<ActivityAnswer summary={summary({ facts7d: 31 })} />);

    const line = screen.getByTestId('hub-answer-line');
    expect(within(line).getByText('31')).toBeInTheDocument();
    expect(within(line).getByText(/facts/)).toBeInTheDocument();
    expect(within(line).getByText(/no decisions yet/i)).toBeInTheDocument();
  });

  it('renders a neutral sentence when nothing happened this week', () => {
    render(<ActivityAnswer summary={summary({})} />);

    const line = screen.getByTestId('hub-answer-line');
    expect(within(line).getByText(/no activity recorded this week/i)).toBeInTheDocument();
  });

  it('shows the last-activity relative time and active-agent count in the meta line', () => {
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
    expect(within(meta).getByText(/2 agents active/i)).toBeInTheDocument();
  });

  it('shows a placeholder instead of a relative time when nothing has ever happened', () => {
    render(<ActivityAnswer summary={summary({ lastActivityAt: null })} />);

    expect(screen.getByTestId('hub-last-activity')).toHaveTextContent(
      /no activity yet/i,
    );
  });

  it('renders the 30-day sparkline spanning the band', () => {
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
      screen.getByRole('img', { name: /30-day activity/i }),
    ).toBeInTheDocument();
  });
});

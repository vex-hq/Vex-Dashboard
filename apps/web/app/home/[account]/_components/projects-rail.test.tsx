// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ProjectPulse } from '../_lib/server/context-stream.loader';
import { ProjectsRail } from './projects-rail';

function pulse(overrides: Partial<ProjectPulse>): ProjectPulse {
  return {
    projectId: 'p-1',
    name: 'api-gateway',
    itemsThisWeek: 0,
    lastItemAt: null,
    agentsActive: [],
    createdBy: null,
    ...overrides,
  };
}

describe('<ProjectsRail />', () => {
  it('renders a card per project with items-this-week', () => {
    render(
      <ProjectsRail
        pulses={[
          pulse({ projectId: 'p-1', name: 'api-gateway', itemsThisWeek: 4 }),
          pulse({ projectId: 'p-2', name: 'billing-svc', itemsThisWeek: 0 }),
        ]}
        accountSlug="acme"
      />,
    );

    const cards = screen.getAllByTestId('project-pulse-card');
    expect(cards).toHaveLength(2);

    const first = within(cards[0] as HTMLElement);
    expect(first.getByText('api-gateway')).toBeInTheDocument();
    expect(first.getByText('4')).toBeInTheDocument();

    const second = within(cards[1] as HTMLElement);
    expect(second.getByText('billing-svc')).toBeInTheDocument();
    expect(second.getByText('0')).toBeInTheDocument();
  });

  it('renders the last-item relative age and active agents', () => {
    render(
      <ProjectsRail
        pulses={[
          pulse({
            projectId: 'p-1',
            name: 'api-gateway',
            lastItemAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            agentsActive: ['agent-1', 'agent-2'],
          }),
        ]}
        accountSlug="acme"
      />,
    );

    const card = screen.getByTestId('project-pulse-card');

    expect(within(card).getByText(/hour ago/i)).toBeInTheDocument();
    expect(within(card).getByText('agent-1')).toBeInTheDocument();
    expect(within(card).getByText('agent-2')).toBeInTheDocument();
  });

  it('shows a placeholder instead of a relative time when the project has never captured anything', () => {
    render(
      <ProjectsRail
        pulses={[pulse({ lastItemAt: null })]}
        accountSlug="acme"
      />,
    );

    const card = screen.getByTestId('project-pulse-card');
    expect(within(card).getByText('—')).toBeInTheDocument();
  });

  it('links each card to the project detail page', () => {
    render(
      <ProjectsRail
        pulses={[pulse({ projectId: 'proj-123', name: 'api-gateway' })]}
        accountSlug="acme"
      />,
    );

    const link = screen.getByRole('link', { name: /api-gateway/i });
    expect(link).toHaveAttribute('href', '/home/acme/projects/proj-123');
  });

  it('renders an empty state when there are no projects', () => {
    render(<ProjectsRail pulses={[]} accountSlug="acme" />);

    expect(screen.queryAllByTestId('project-pulse-card')).toHaveLength(0);
    expect(screen.getByText(/no project activity/i)).toBeInTheDocument();
  });
});

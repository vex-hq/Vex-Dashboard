// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ProjectUsage } from '../_lib/server/context-usage.loader';
import type { ProjectSpark } from '../_lib/server/hub-summary.loader';
import { ProjectTiles } from './project-tiles';

function spark(overrides: Partial<ProjectSpark>): ProjectSpark {
  return {
    projectId: 'p-1',
    name: 'api-gateway',
    series: [
      { day: '2026-08-01', count: 2 },
      { day: '2026-08-02', count: 4 },
    ],
    ...overrides,
  };
}

function usage(overrides: Partial<ProjectUsage>): ProjectUsage {
  return {
    projectId: 'p-1',
    projectName: 'api-gateway',
    memories30d: 12,
    recalls30d: 34,
    storageBytes: 2048,
    estContextTokens30d: 5000,
    ...overrides,
  };
}

describe('<ProjectTiles />', () => {
  it('renders one tile per project spark', () => {
    render(
      <ProjectTiles
        sparks={[
          spark({ projectId: 'p-1', name: 'api-gateway' }),
          spark({ projectId: 'p-2', name: 'billing-svc' }),
        ]}
        usage={[]}
        accountSlug="acme"
      />,
    );

    const tiles = screen.getAllByTestId('project-tile');
    expect(tiles).toHaveLength(2);
    expect(within(tiles[0] as HTMLElement).getByText('api-gateway')).toBeInTheDocument();
    expect(within(tiles[1] as HTMLElement).getByText('billing-svc')).toBeInTheDocument();
  });

  it('links each tile to the project detail page', () => {
    render(
      <ProjectTiles
        sparks={[spark({ projectId: 'proj-123', name: 'api-gateway' })]}
        usage={[]}
        accountSlug="acme"
      />,
    );

    const link = screen.getByRole('link', { name: /api-gateway/i });
    expect(link).toHaveAttribute('href', '/home/acme/projects/proj-123');
  });

  it('merges memories/recalls/storage from usage by projectId', () => {
    render(
      <ProjectTiles
        sparks={[spark({ projectId: 'p-1' })]}
        usage={[usage({ projectId: 'p-1' })]}
        accountSlug="acme"
      />,
    );

    expect(within(screen.getByTestId('memories-30d-p-1')).getByText('12')).toBeInTheDocument();
    expect(within(screen.getByTestId('recalls-30d-p-1')).getByText('34')).toBeInTheDocument();
  });

  it('renders zeroed stats, not "missing", for a project with no usage row', () => {
    render(
      <ProjectTiles
        sparks={[spark({ projectId: 'p-9', name: 'quiet-project' })]}
        usage={[]}
        accountSlug="acme"
      />,
    );

    expect(within(screen.getByTestId('memories-30d-p-9')).getByText('0')).toBeInTheDocument();
    expect(within(screen.getByTestId('recalls-30d-p-9')).getByText('0')).toBeInTheDocument();
  });

  it('does not put token estimates on the Hub pulse', () => {
    render(
      <ProjectTiles
        sparks={[spark({ projectId: 'p-1' })]}
        usage={[usage({ projectId: 'p-1', estContextTokens30d: 5000 })]}
        accountSlug="acme"
      />,
    );

    expect(screen.queryByText(/estimated/i)).not.toBeInTheDocument();
    expect(screen.queryByText('5,000')).not.toBeInTheDocument();
  });

  it('never labels the measured numbers as estimated', () => {
    render(
      <ProjectTiles
        sparks={[spark({ projectId: 'p-1' })]}
        usage={[usage({ projectId: 'p-1' })]}
        accountSlug="acme"
      />,
    );

    expect(
      within(screen.getByTestId('memories-30d-p-1')).queryByText(/estimated/i),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('recalls-30d-p-1')).queryByText(/estimated/i),
    ).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no project sparks', () => {
    render(<ProjectTiles sparks={[]} usage={[]} accountSlug="acme" />);

    expect(screen.queryAllByTestId('project-tile')).toHaveLength(0);
    expect(screen.getByText(/no project activity/i)).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContextView } from '../_lib/server/context-view.loader';
import { ProjectIssues } from './project-issues';

let currentSearchParams = new URLSearchParams();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/home/acme/projects/hirly',
  useSearchParams: () => currentSearchParams,
}));

function view(overrides: Partial<ContextView> = {}): ContextView {
  return {
    decisions: [
      {
        id: 'd1',
        kind: 'decision',
        content: 'Use REST not GraphQL',
        scope: 'project',
        projectId: 'hirly',
        projectName: 'hirly',
        agentId: 'curator',
        userId: 'u1',
        createdAt: '2026-08-12T12:00:00.000Z',
        supersededBy: null,
        replaced: [],
      },
    ],
    plans: [],
    constraints: [],
    recent: [],
    header: {
      members: 0,
      agentsActive: ['curator'],
      itemsThisWeek: 1,
      itemsTotal: 1,
    },
    ...overrides,
  };
}

describe('<ProjectIssues />', () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    replace.mockReset();
  });

  it('lists a truth as an issue and opens the peek', () => {
    render(
      <ProjectIssues
        view={view()}
        projectName="hirly"
        accountSlug="acme"
        projectId="hirly"
        recalled30d={0}
      />,
    );

    expect(screen.getAllByText('Use REST not GraphQL').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/not recalled this month/i)).toBeInTheDocument();
    expect(screen.getByTestId('project-issue-peek')).toHaveTextContent(
      'Use REST not GraphQL',
    );
  });

  it('writes a kind filter into the URL', () => {
    render(
      <ProjectIssues
        view={view()}
        projectName="hirly"
        accountSlug="acme"
        projectId="hirly"
        recalled30d={1}
      />,
    );

    fireEvent.click(screen.getByTestId('project-issue-filter-activity'));
    expect(String(replace.mock.calls.at(-1)?.[0])).toContain('kind=activity');
  });

  it('lists artifacts on their own tab, not as issues', () => {
    currentSearchParams = new URLSearchParams('kind=artifacts');

    render(
      <ProjectIssues
        view={view()}
        artifacts={[
          {
            id: 'mem-art',
            artifactId: 'art-1',
            title: 'auth-flow.md',
            summary: 'Login sequence the agents share.',
            kind: 'doc',
            mimeType: 'text/markdown',
            sizeBytes: 2048,
            createdAt: '2026-08-12T12:00:00.000Z',
          },
        ]}
        projectName="hirly"
        accountSlug="acme"
        projectId="hirly"
        recalled30d={1}
      />,
    );

    expect(screen.queryByText('Use REST not GraphQL')).not.toBeInTheDocument();
    expect(screen.getAllByText('auth-flow.md').length).toBeGreaterThan(0);
    expect(screen.getByTestId('project-artifact-peek')).toHaveTextContent(
      'Login sequence the agents share.',
    );
    expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute(
      'href',
      '/api/agentguard/artifacts/acme/mem-art',
    );
  });

  it('writes the artifacts filter into the URL', () => {
    render(
      <ProjectIssues
        view={view()}
        artifacts={[]}
        projectName="hirly"
        accountSlug="acme"
        projectId="hirly"
        recalled30d={1}
      />,
    );

    fireEvent.click(screen.getByTestId('project-issue-filter-artifacts'));
    expect(String(replace.mock.calls.at(-1)?.[0])).toContain('kind=artifacts');
  });

  it('explains an empty artifacts tab', () => {
    currentSearchParams = new URLSearchParams('kind=artifacts');

    render(
      <ProjectIssues
        view={view()}
        artifacts={[]}
        projectName="hirly"
        accountSlug="acme"
        projectId="hirly"
        recalled30d={1}
      />,
    );

    expect(screen.getByText(/no artifacts yet/i)).toBeInTheDocument();
    expect(
      screen.queryByTestId('project-artifact-peek'),
    ).not.toBeInTheDocument();
  });

  it('renders a private context without a project unused banner', () => {
    render(
      <ProjectIssues
        view={view()}
        projectName="Private"
        accountSlug="acme"
        backHref="/home/acme"
        backLabel="Back to Hub"
        memoriesHref="/home/acme/memory?tab=mine"
        memoriesLabel="View private memories"
      />,
    );

    expect(screen.getByRole('link', { name: /back to hub/i })).toHaveAttribute(
      'href',
      '/home/acme',
    );
    expect(
      screen.queryByText(/not recalled this month/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /view private memories/i }),
    ).toHaveAttribute('href', '/home/acme/memory?tab=mine');
  });

  it('shows project settings only when the viewer can manage access', () => {
    const { rerender } = render(
      <ProjectIssues
        view={view()}
        projectName="hirly"
        accountSlug="acme"
        projectId="hirly"
        recalled30d={1}
        access={{
          canManage: true,
          viewerRole: 'admin',
          members: [],
          candidates: [],
        }}
      />,
    );

    expect(screen.getByTestId('project-settings')).toBeInTheDocument();

    rerender(
      <ProjectIssues
        view={view()}
        projectName="hirly"
        accountSlug="acme"
        projectId="hirly"
        recalled30d={1}
        access={{
          canManage: false,
          viewerRole: 'read',
          members: [],
          candidates: [],
        }}
      />,
    );

    expect(screen.queryByTestId('project-settings')).not.toBeInTheDocument();
  });
});

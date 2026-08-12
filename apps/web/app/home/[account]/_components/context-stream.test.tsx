// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContextItem } from '../_lib/server/context-stream.loader';
import { ContextStream } from './context-stream';

/**
 * `ContextStream` reads AND writes `useSearchParams`/`useRouter` from
 * `next/navigation` (reads to render current filter state and the
 * filtered-empty explanation, writes on filter interaction). There's no app
 * router in a unit test, so both are mocked; `__setSearchParams` lets each
 * test configure the params `ContextStream` sees, matching how
 * `sessions-table.tsx` reads `?agent=&type=&timeRange=`.
 */
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/home/acme',
  useSearchParams: () => currentSearchParams,
}));

function setSearchParams(query: string): void {
  currentSearchParams = new URLSearchParams(query);
}

function item(overrides: Partial<ContextItem>): ContextItem {
  return {
    id: 'm-1',
    kind: 'decision',
    content: 'old decision text',
    scope: 'project',
    projectId: 'p-1',
    projectName: 'api-gateway',
    agentId: 'agent-1',
    userId: 'user-1',
    createdAt: new Date().toISOString(),
    supersededBy: null,
    ...overrides,
  };
}

describe('<ContextStream />', () => {
  beforeEach(() => {
    setSearchParams('');
  });

  it('renders a superseded item struck through with a replacement pointer', () => {
    render(
      <ContextStream
        items={[item({ supersededBy: 'm-9' })]}
        projects={[]}
        agents={[]}
      />,
    );

    const row = screen.getByText('old decision text');
    expect(row.closest('[data-superseded]')).not.toBeNull();
    expect(screen.getByText(/replaced/i)).toBeInTheDocument();
  });

  it('renders kind glyph, project and relative time on a row', () => {
    render(<ContextStream items={[item({})]} projects={[]} agents={[]} />);

    expect(screen.getByText('decision')).toBeInTheDocument();
    expect(screen.getByText('api-gateway')).toBeInTheDocument();
  });

  it('empty + filtered explains the filter instead of a bare blank', () => {
    // Two filters active in the URL (project + kind) — activeFilterCount is
    // derived from search params rather than accepted as a prop, so the
    // page (which owns the URL) never has to compute it separately.
    setSearchParams('project=p-1&kind=decision');

    render(<ContextStream items={[]} projects={[]} agents={[]} />);

    expect(screen.getByText(/no items match/i)).toBeInTheDocument();
  });

  it('renders a generic empty state when no filters are active', () => {
    render(<ContextStream items={[]} projects={[]} agents={[]} />);

    expect(screen.queryByText(/no items match/i)).not.toBeInTheDocument();
  });

  it('renders the replaced pointer as a clickable control when the replacement is rendered', () => {
    render(
      <ContextStream
        items={[
          item({
            id: 'm-1',
            content: 'old decision text',
            supersededBy: 'm-9',
          }),
          item({ id: 'm-9', content: 'new decision text', supersededBy: null }),
        ]}
        projects={[]}
        agents={[]}
      />,
    );

    const row = screen.getByText('old decision text').closest('li');
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLElement).getByRole('button', { name: /replaced/i }),
    ).toBeInTheDocument();
  });

  it('renders the replaced pointer as inert text when the replacement is not in the rendered items', () => {
    render(
      <ContextStream
        items={[
          item({
            id: 'm-1',
            content: 'old decision text',
            supersededBy: 'm-9',
          }),
        ]}
        projects={[]}
        agents={[]}
      />,
    );

    const row = screen.getByText('old decision text').closest('li');
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLElement).getByText(/replaced/i),
    ).toBeInTheDocument();
    expect(
      within(row as HTMLElement).queryByRole('button', { name: /replaced/i }),
    ).not.toBeInTheDocument();
  });

  it('groups rows under a "Today" day header for items created today', () => {
    render(
      <ContextStream
        items={[item({ createdAt: new Date().toISOString() })]}
        projects={[]}
        agents={[]}
      />,
    );

    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('groups rows under separate day headers when items span multiple days', () => {
    render(
      <ContextStream
        items={[
          item({ id: 'm-today', createdAt: new Date().toISOString() }),
          item({
            id: 'm-old',
            createdAt: new Date(
              Date.now() - 10 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          }),
        ]}
        projects={[]}
        agents={[]}
      />,
    );

    // Two distinct day headers, and "Today" is not the only one rendered.
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });

  // Mutation check: swapping the muted-ink class for the primary-ink class
  // (or vice versa) on either kind would collapse the whole point of the
  // redesign — deliberate writes (decisions/plans) must read differently
  // from telemetry (facts/notes) at a glance.
  it('renders decisions in primary ink and facts in muted ink — the hierarchy is the point', () => {
    render(
      <ContextStream
        items={[
          item({
            id: 'm-decision',
            kind: 'decision',
            content: 'decision text',
          }),
          item({ id: 'm-fact', kind: 'fact', content: 'fact text' }),
        ]}
        projects={[]}
        agents={[]}
      />,
    );

    const decisionButton = screen.getByText('decision text');
    const factButton = screen.getByText('fact text');

    expect(decisionButton.className).toContain('text-foreground');
    expect(decisionButton.className).not.toContain('text-muted-foreground');
    expect(factButton.className).toContain('text-muted-foreground');
  });

  it('renders a kind glyph for every row', () => {
    render(
      <ContextStream
        items={[item({ kind: 'plan' })]}
        projects={[]}
        agents={[]}
      />,
    );

    expect(screen.getByTestId('kind-glyph-plan')).toBeInTheDocument();
  });

  it('renders the toolbar without a "Clear" control when no filter is set', () => {
    render(<ContextStream items={[item({})]} projects={[]} agents={[]} />);

    expect(
      screen.queryByRole('button', { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the "Clear" control only once a filter is set', () => {
    setSearchParams('kind=decision');

    render(<ContextStream items={[item({})]} projects={[]} agents={[]} />);

    expect(
      screen.getByRole('button', { name: /clear filters/i }),
    ).toBeInTheDocument();
  });

  it('collapses the old boxed "Filters" panel title — the toolbar has no heading', () => {
    render(<ContextStream items={[item({})]} projects={[]} agents={[]} />);

    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });
});

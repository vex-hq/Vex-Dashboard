// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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
});

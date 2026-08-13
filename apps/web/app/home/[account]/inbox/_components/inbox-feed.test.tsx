// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContextItem } from '../../_lib/server/context-stream.loader';
import { InboxFeed } from './inbox-feed';

let currentSearchParams = new URLSearchParams();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/home/acme/inbox',
  useSearchParams: () => currentSearchParams,
}));

function item(over: Partial<ContextItem> = {}): ContextItem {
  return {
    id: 'mem-1',
    kind: 'decision',
    content: 'Use REST not GraphQL',
    scope: 'project',
    projectId: 'hirly',
    projectName: 'hirly',
    agentId: 'curator',
    userId: 'u1',
    createdAt: '2026-08-12T12:00:00.000Z',
    supersededBy: null,
    ...over,
  };
}

describe('<InboxFeed />', () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    replace.mockReset();
  });

  it('lists a write and peeks it', () => {
    render(<InboxFeed items={[item()]} accountSlug="acme" />);

    expect(screen.getAllByText('Use REST not GraphQL').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByTestId('inbox-peek')).toHaveTextContent('hirly');
    expect(screen.getByRole('link', { name: /open project/i })).toHaveAttribute(
      'href',
      '/home/acme/projects/hirly?item=mem-1',
    );
  });

  it('writes the selected item into the URL', () => {
    render(
      <InboxFeed
        items={[item(), item({ id: 'mem-2', content: 'Second write' })]}
        accountSlug="acme"
      />,
    );

    fireEvent.click(screen.getByTestId('inbox-item-mem-2'));
    expect(String(replace.mock.calls.at(-1)?.[0])).toContain('item=mem-2');
  });

  it('explains an empty inbox', () => {
    render(<InboxFeed items={[]} accountSlug="acme" />);

    expect(screen.getByText(/nothing written yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('inbox-peek')).not.toBeInTheDocument();
  });
});

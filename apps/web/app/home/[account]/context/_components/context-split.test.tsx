// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  ContextGroup,
  ContextItemDetail,
} from '../_lib/server/context-surfaces.types';
import { ContextSplit } from './context-split';

const currentSearchParams = new URLSearchParams();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/home/acme/context',
  useSearchParams: () => currentSearchParams,
}));

vi.mock('../_lib/server/context-actions', () => ({
  shareMemoryAction: vi.fn(),
  unshareMemoryAction: vi.fn(),
}));

function group(overrides: Partial<ContextGroup> = {}): ContextGroup {
  return { items: [], total: 0, ...overrides };
}

function item(id: string, content: string) {
  return {
    id,
    kind: 'fact',
    content,
    projectId: 'p1',
    projectName: 'klio',
    agentId: 'host/claude-code',
    createdAt: '2026-08-16T12:00:00.000Z',
  };
}

function detail(overrides: Partial<ContextItemDetail> = {}): ContextItemDetail {
  return {
    id: 'm1',
    kind: 'fact',
    content: 'Railway builds from GitHub source',
    scope: 'private',
    status: 'active',
    projectId: 'p1',
    projectName: 'klio',
    agentId: 'host/claude-code',
    createdAt: '2026-08-16T12:00:00.000Z',
    ownedByViewer: true,
    promotedByViewer: false,
    evidence: { recalledCount: 0, usedCount: 0, servedStaleCount: 0 },
    replaced: null,
    replacedBy: null,
    ...overrides,
  };
}

describe('<ContextSplit /> — the shared/private boundary as the display boundary', () => {
  it('labels both groups and shows each group’s own total', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group({ items: [item('s1', 'deploy from Railway')], total: 1 })}
        privateGroup={group({
          items: [item('p1', 'my own note')],
          total: 5196,
        })}
        detail={null}
      />,
    );

    const sharedHeading = screen.getByTestId('context-group-shared');
    const privateHeading = screen.getByTestId('context-group-private');

    expect(sharedHeading).toHaveTextContent(/shared with your team/i);
    expect(sharedHeading).toHaveTextContent('1');
    expect(privateHeading).toHaveTextContent(/only you/i);
    expect(privateHeading).toHaveTextContent('5,196');
  });

  it('tells an org with nothing shared what sharing is for, not that it is broken', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group()}
        privateGroup={group({ items: [item('p1', 'my note')], total: 1 })}
        detail={null}
      />,
    );

    const empty = screen.getByTestId('context-shared-empty');

    expect(empty).toHaveTextContent(/nothing shared yet/i);
    expect(empty).toHaveTextContent(/everyone on your team can then use it/i);
  });

  it('says plainly when the viewer has no private context of their own', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group({ items: [item('s1', 'team fact')], total: 1 })}
        privateGroup={group()}
        detail={null}
      />,
    );

    expect(screen.getByTestId('context-private-empty')).toHaveTextContent(
      /nothing private yet/i,
    );
  });
});

describe('<ContextSplit /> — per-item evidence', () => {
  it('renders recalled, used and served-stale counts', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group()}
        privateGroup={group({ items: [item('m1', 'x')], total: 1 })}
        detail={detail({
          evidence: { recalledCount: 274, usedCount: 3, servedStaleCount: 14 },
        })}
      />,
    );

    const evidence = screen.getByTestId('context-evidence');

    expect(within(evidence).getByTestId('evidence-recalled')).toHaveTextContent(
      '274',
    );
    expect(within(evidence).getByTestId('evidence-used')).toHaveTextContent(
      '3',
    );
    expect(within(evidence).getByTestId('evidence-stale')).toHaveTextContent(
      '14',
    );
  });

  it('renders zeroes as zeroes for an item with no recalls or stale serves', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group()}
        privateGroup={group({ items: [item('m1', 'x')], total: 1 })}
        detail={detail()}
      />,
    );

    const evidence = screen.getByTestId('context-evidence');

    expect(within(evidence).getByTestId('evidence-recalled')).toHaveTextContent(
      '0',
    );
    expect(within(evidence).getByTestId('evidence-stale')).toHaveTextContent(
      '0',
    );
    expect(
      screen.getByTestId('context-evidence-never-recalled'),
    ).toBeInTheDocument();
  });

  /**
   * `recall_outcomes` has `used`, `usage_score` and `served_stale`. It has NO
   * verdict column and NO per-outcome agent attribution, so no copy may imply
   * a pass/fail grade or name the agent that used a memory. This test is the
   * guard on that: it reads the rendered evidence pane as text and fails on
   * any of the words that would make it a lie.
   */
  it('makes no claim the schema cannot carry', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group()}
        privateGroup={group({ items: [item('m1', 'x')], total: 1 })}
        detail={detail({
          evidence: { recalledCount: 9, usedCount: 2, servedStaleCount: 1 },
        })}
      />,
    );

    const text = screen.getByTestId('context-evidence').textContent ?? '';

    for (const forbidden of [
      'verdict',
      'passed',
      'failed',
      'graded',
      'score',
      'used by claude',
      'used by codex',
    ]) {
      expect(text.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('renders the supersession chain as two nodes, no more', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group()}
        privateGroup={group({ items: [item('m1', 'x')], total: 1 })}
        detail={detail({
          replaced: {
            id: 'old',
            content: 'deploy with docker compose up -d',
            createdAt: '2026-03-01T00:00:00.000Z',
          },
          replacedBy: {
            id: 'new',
            content: 'Railway builds from GitHub source',
            createdAt: '2026-08-01T00:00:00.000Z',
          },
        })}
      />,
    );

    const chain = screen.getByTestId('context-chain');

    expect(within(chain).getByTestId('chain-replaced')).toHaveTextContent(
      /docker compose/,
    );
    expect(within(chain).getByTestId('chain-replaced-by')).toHaveTextContent(
      /GitHub source/,
    );
  });

  it('omits the chain entirely when there is none', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group()}
        privateGroup={group({ items: [item('m1', 'x')], total: 1 })}
        detail={detail()}
      />,
    );

    expect(screen.queryByTestId('context-chain')).toBeNull();
  });
});

describe('<ContextSplit /> — the share action', () => {
  it('offers Share with the team on a private item the viewer owns', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group()}
        privateGroup={group({ items: [item('m1', 'x')], total: 1 })}
        detail={detail({ scope: 'private', ownedByViewer: true })}
      />,
    );

    expect(screen.getByTestId('context-share')).toHaveTextContent(
      /share with the team/i,
    );
    expect(screen.queryByTestId('context-unshare')).toBeNull();
  });

  it('offers the reverse only on a share this viewer made', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group({ items: [item('m1', 'x')], total: 1 })}
        privateGroup={group()}
        detail={detail({
          scope: 'org',
          ownedByViewer: true,
          promotedByViewer: true,
        })}
      />,
    );

    expect(screen.getByTestId('context-unshare')).toHaveTextContent(
      /make private again/i,
    );
    expect(screen.queryByTestId('context-share')).toBeNull();
  });

  it('offers neither action on a shared item this viewer did not share', () => {
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group({ items: [item('m1', 'x')], total: 1 })}
        privateGroup={group()}
        detail={detail({
          scope: 'org',
          ownedByViewer: false,
          promotedByViewer: false,
        })}
      />,
    );

    expect(screen.queryByTestId('context-share')).toBeNull();
    expect(screen.queryByTestId('context-unshare')).toBeNull();
  });

  it('does not offer to share a private row the viewer does not own', () => {
    // Defense in depth: the loader cannot return one, but the button must not
    // exist even if a future loader change did.
    render(
      <ContextSplit
        accountSlug="acme"
        shared={group()}
        privateGroup={group({ items: [item('m1', 'x')], total: 1 })}
        detail={detail({ scope: 'private', ownedByViewer: false })}
      />,
    );

    expect(screen.queryByTestId('context-share')).toBeNull();
  });
});

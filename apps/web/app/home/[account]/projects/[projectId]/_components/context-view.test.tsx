// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ContextItem } from '~/home/[account]/_lib/server/context-stream.loader';

import type {
  ChainLink,
  ContextView as ContextViewData,
  ContextViewItem,
} from '../_lib/server/context-view.loader';
import { ProjectContextView } from './context-view';

function item(overrides: Partial<ContextItem>): ContextItem {
  return {
    id: 'm-1',
    kind: 'decision',
    content: 'use REST not GraphQL',
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

function viewItem(
  overrides: Partial<ContextItem> = {},
  replaced: ChainLink[] = [],
): ContextViewItem {
  return { ...item(overrides), replaced };
}

function view(overrides: Partial<ContextViewData> = {}): ContextViewData {
  return {
    decisions: [],
    plans: [],
    constraints: [],
    recent: [],
    header: { members: 0, agentsActive: [], itemsThisWeek: 0, itemsTotal: 0 },
    ...overrides,
  };
}

describe('<ProjectContextView />', () => {
  it('renders section headings in order: Decisions, Plans, Constraints, Recent', () => {
    render(
      <ProjectContextView
        view={view({
          decisions: [viewItem({ id: 'd-1', kind: 'decision' })],
          plans: [viewItem({ id: 'p-1', kind: 'plan' })],
          constraints: [viewItem({ id: 'c-1', kind: 'fact' })],
          recent: [item({ id: 'r-1' })],
        })}
      />,
    );

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual(['Decisions', 'Plans', 'Constraints', 'Recent']);
  });

  it('renders a decision with a replaced chain as an inline supersession line', () => {
    render(
      <ProjectContextView
        view={view({
          decisions: [
            viewItem({ id: 'd-1', content: 'use REST not GraphQL' }, [
              {
                id: 'r-1',
                content: 'use GraphQL everywhere',
                createdAt: '2026-03-15T12:00:00.000Z',
              },
            ]),
          ],
        })}
      />,
    );

    const line = screen.getByTestId('replaced-line-r-1');

    expect(line.textContent).toMatch(/replaced/i);
    expect(line.textContent).toContain('use GraphQL everywhere');
    expect(line.textContent).toContain('Mar');

    // The replaced content renders struck-through.
    expect(line.querySelector('s')).not.toBeNull();
    expect(line.querySelector('s')?.textContent).toBe(
      'use GraphQL everywhere',
    );
  });

  it('truncates a long replaced content preview', () => {
    const longContent = 'x'.repeat(120);

    render(
      <ProjectContextView
        view={view({
          decisions: [
            viewItem({ id: 'd-1' }, [
              {
                id: 'r-1',
                content: longContent,
                createdAt: '2026-01-05T12:00:00.000Z',
              },
            ]),
          ],
        })}
      />,
    );

    const struck = screen.getByTestId('replaced-line-r-1').querySelector('s');

    expect(struck?.textContent?.length).toBeLessThan(longContent.length);
    expect(struck?.textContent).toMatch(/…$/);
  });

  it('renders the brief-shaped empty state when the whole project is empty', () => {
    render(<ProjectContextView view={view()} />);

    expect(
      screen.getByText(
        'Nothing set down yet — decisions and plans your agents record will build this page.',
      ),
    ).toBeInTheDocument();

    expect(screen.queryByTestId('context-view-decisions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('context-view-recent')).not.toBeInTheDocument();
  });

  it('renders superseded items in Recent struck-through, consistent with the stream', () => {
    render(
      <ProjectContextView
        view={view({
          recent: [
            item({
              id: 'r-1',
              content: 'old fact',
              supersededBy: 'r-2',
            }),
          ],
        })}
      />,
    );

    const row = screen.getByText('old fact');
    expect(row.closest('[data-superseded]')).not.toBeNull();
    expect(row.className).toMatch(/line-through/);
  });

  it('renders header chips for members, agents active and items this week', () => {
    render(
      <ProjectContextView
        view={view({
          decisions: [viewItem({ id: 'd-1' })],
          header: {
            members: 4,
            agentsActive: ['agent-a', 'agent-b'],
            itemsThisWeek: 7,
            itemsTotal: 12,
          },
        })}
      />,
    );

    const members = screen.getByTestId('context-view-members');
    expect(members.textContent).toContain('4');

    const itemsThisWeek = screen.getByTestId('context-view-items-this-week');
    expect(itemsThisWeek.textContent).toContain('7');

    const agents = screen.getByTestId('context-view-agents-active');
    expect(agents.textContent).toContain('agent-a');
    expect(agents.textContent).toContain('agent-b');
  });
});

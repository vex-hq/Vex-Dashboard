import { describe, expect, it } from 'vitest';

import type { ContextItem } from './server/context-stream.loader';
import { groupStreamByDay } from './group-stream-by-day';

function item(overrides: Partial<ContextItem>): ContextItem {
  return {
    id: 'm-1',
    kind: 'decision',
    content: 'content',
    scope: 'org',
    projectId: null,
    projectName: null,
    agentId: null,
    userId: null,
    createdAt: '2026-08-12T10:00:00.000Z',
    supersededBy: null,
    ...overrides,
  };
}

// A fixed "now" so Today/Yesterday resolve deterministically regardless of
// when the suite runs.
const NOW = new Date('2026-08-12T18:00:00.000Z');

describe('groupStreamByDay', () => {
  it('labels the current UTC day "Today"', () => {
    const groups = groupStreamByDay(
      [item({ createdAt: '2026-08-12T09:00:00.000Z' })],
      NOW,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]!.label).toBe('Today');
  });

  it('labels the day before "Yesterday"', () => {
    const groups = groupStreamByDay(
      [item({ createdAt: '2026-08-11T23:59:00.000Z' })],
      NOW,
    );

    expect(groups[0]!.label).toBe('Yesterday');
  });

  it('labels older days as weekday + date', () => {
    const groups = groupStreamByDay(
      [item({ createdAt: '2026-08-05T09:00:00.000Z' })],
      NOW,
    );

    expect(groups[0]!.label).toBe('Wednesday, Aug 5');
  });

  it('keeps items in their given order within a day (no re-sort)', () => {
    const first = item({ id: 'm-1', createdAt: '2026-08-12T12:00:00.000Z' });
    const second = item({ id: 'm-2', createdAt: '2026-08-12T09:00:00.000Z' });

    const groups = groupStreamByDay([first, second], NOW);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['m-1', 'm-2']);
  });

  it('creates one group per distinct day, preserving first-seen order', () => {
    const groups = groupStreamByDay(
      [
        item({ id: 'a', createdAt: '2026-08-12T09:00:00.000Z' }),
        item({ id: 'b', createdAt: '2026-08-11T09:00:00.000Z' }),
        item({ id: 'c', createdAt: '2026-08-12T08:00:00.000Z' }),
      ],
      NOW,
    );

    expect(groups.map((g) => g.key)).toEqual(['2026-08-12', '2026-08-11']);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('returns an empty array for no items', () => {
    expect(groupStreamByDay([], NOW)).toEqual([]);
  });
});

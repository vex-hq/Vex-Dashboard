import { describe, expect, it } from 'vitest';

import { pickHubHighlights } from './hub-highlights';
import type { ContextItem } from './server/context-stream.loader';

function item(overrides: Partial<ContextItem>): ContextItem {
  return {
    id: 'm-1',
    kind: 'decision',
    content: 'we ship on Tuesdays',
    scope: 'org',
    projectId: 'p-1',
    projectName: 'api',
    agentId: 'claude-code',
    userId: null,
    createdAt: '2026-08-12T10:00:00Z',
    supersededBy: null,
    ...overrides,
  };
}

describe('pickHubHighlights', () => {
  it('returns the latest active decisions and plans, not facts', () => {
    const highlights = pickHubHighlights([
      item({ id: 'f-1', kind: 'fact', content: 'a fact' }),
      item({ id: 'd-1', kind: 'decision', content: 'newest decision' }),
      item({ id: 'p-1', kind: 'plan', content: 'a plan' }),
      item({ id: 'n-1', kind: 'note', content: 'a note' }),
    ]);

    expect(highlights.map((row) => row.id)).toEqual(['d-1', 'p-1']);
  });

  it('lists active writes before superseded ones', () => {
    const highlights = pickHubHighlights([
      item({
        id: 'old',
        content: 'old decision',
        supersededBy: 'new',
      }),
      item({ id: 'new', content: 'new decision' }),
    ]);

    expect(highlights.map((row) => row.id)).toEqual(['new', 'old']);
  });

  it('attaches retired predecessors that this write superseded', () => {
    const highlights = pickHubHighlights([
      item({
        id: 'old',
        content: 'auth returns 500',
        supersededBy: 'new',
      }),
      item({ id: 'new', content: 'auth returns 404' }),
    ]);

    expect(highlights[0]).toMatchObject({
      id: 'new',
      retired: ['auth returns 500'],
    });
  });

  it('fills with superseded writes only when fewer than the limit are active', () => {
    const highlights = pickHubHighlights([
      item({
        id: 'old',
        content: 'old decision',
        supersededBy: 'missing',
      }),
    ]);

    expect(highlights.map((row) => row.id)).toEqual(['old']);
  });

  it('caps at three', () => {
    const highlights = pickHubHighlights([
      item({ id: '1', content: 'one' }),
      item({ id: '2', content: 'two' }),
      item({ id: '3', content: 'three' }),
      item({ id: '4', content: 'four' }),
    ]);

    expect(highlights).toHaveLength(3);
    expect(highlights.map((row) => row.id)).toEqual(['1', '2', '3']);
  });

  it('falls back to the latest facts when no decisions or plans exist', () => {
    const highlights = pickHubHighlights([
      item({ id: 'f-1', kind: 'fact', content: 'persist author identity' }),
      item({ id: 'n-1', kind: 'note', content: 'a note' }),
    ]);

    expect(highlights.map((row) => row.id)).toEqual(['f-1']);
    expect(highlights[0]?.content).toBe('persist author identity');
  });
});

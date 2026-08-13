import { describe, expect, it } from 'vitest';

import {
  filterProjectIssues,
  flattenProjectIssues,
  formatArtifactSize,
  parseIssueFilter,
  pickProjectIssue,
  toProjectArtifacts,
} from './project-issues-model';
import type { ContextView } from './server/context-view.loader';

function view(overrides: Partial<ContextView> = {}): ContextView {
  return {
    decisions: [],
    plans: [],
    constraints: [],
    recent: [],
    header: { members: 0, agentsActive: [], itemsThisWeek: 0, itemsTotal: 0 },
    ...overrides,
  };
}

function item(
  id: string,
  kind: 'decision' | 'plan' | 'fact' | 'note',
  createdAt: string,
  supersededBy: string | null = null,
) {
  return {
    id,
    kind,
    content: `${kind} ${id}`,
    scope: 'private' as const,
    projectId: 'hirly',
    projectName: 'hirly',
    agentId: 'curator',
    userId: 'u1',
    createdAt,
    supersededBy,
  };
}

describe('flattenProjectIssues', () => {
  it('dedupes a decision that also appears in recent, newest first', () => {
    const decision = {
      ...item('d1', 'decision', '2026-08-12T12:00:00.000Z'),
      replaced: [
        { id: 'old', content: 'old', createdAt: '2026-08-01T00:00:00.000Z' },
      ],
    };
    const recentFact = item('f1', 'fact', '2026-08-12T18:00:00.000Z');

    const issues = flattenProjectIssues(
      view({
        decisions: [decision],
        recent: [decision, recentFact],
      }),
    );

    expect(issues.map((issue) => issue.id)).toEqual(['f1', 'd1']);
    expect(issues[1]?.replaced).toHaveLength(1);
  });
});

describe('filterProjectIssues / parseIssueFilter / pickProjectIssue', () => {
  const issues = flattenProjectIssues(
    view({
      decisions: [
        {
          ...item('d1', 'decision', '2026-08-12T12:00:00.000Z', 'd2'),
          replaced: [],
        },
      ],
      constraints: [
        { ...item('f1', 'fact', '2026-08-12T13:00:00.000Z'), replaced: [] },
      ],
    }),
  );

  it('defaults to issues (decisions and plans), not the fact log', () => {
    expect(parseIssueFilter(undefined)).toBe('issues');
    expect(parseIssueFilter('nope')).toBe('issues');
    expect(parseIssueFilter('artifacts')).toBe('artifacts');
    expect(
      filterProjectIssues(issues, 'issues').map((issue) => issue.id),
    ).toEqual(['d1']);
    expect(
      filterProjectIssues(issues, 'activity').map((issue) => issue.id),
    ).toEqual(['f1']);
    expect(
      filterProjectIssues(issues, 'replaced').map((issue) => issue.id),
    ).toEqual(['d1']);
    expect(filterProjectIssues(issues, 'artifacts')).toEqual([]);
  });

  it('keeps artifact cards out of the activity log', () => {
    const artifactAsOther = {
      ...issues[0]!,
      id: 'art-mem',
      kind: 'other' as const,
      supersededBy: null,
    };

    expect(
      filterProjectIssues(
        [...issues, artifactAsOther],
        'activity',
        new Set(['art-mem']),
      ).map((issue) => issue.id),
    ).toEqual(['f1']);
  });

  it('keeps a requested id when it is still visible', () => {
    expect(pickProjectIssue(issues, 'd1')).toBe('d1');
    expect(
      pickProjectIssue(filterProjectIssues(issues, 'activity'), 'd1'),
    ).toBe('f1');
  });
});

describe('toProjectArtifacts / formatArtifactSize', () => {
  it('keys the row on the memory card, not the artifact id', () => {
    const [artifact] = toProjectArtifacts([
      {
        id: 'artifact-uuid',
        memory_id: 'memory-uuid',
        title: 'auth-flow.md',
        summary: 'Login sequence',
        kind: 'doc',
        mime_type: 'text/markdown',
        size_bytes: 2048,
        created_at: '2026-08-12T12:00:00.000Z',
      },
    ]);

    expect(artifact).toMatchObject({
      id: 'memory-uuid',
      artifactId: 'artifact-uuid',
      title: 'auth-flow.md',
      mimeType: 'text/markdown',
      sizeBytes: 2048,
    });
    expect(formatArtifactSize(2048)).toBe('2.0 KB');
    expect(formatArtifactSize(null)).toBeNull();
  });
});

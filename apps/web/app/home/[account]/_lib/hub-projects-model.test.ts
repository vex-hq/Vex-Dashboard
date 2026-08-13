import { describe, expect, it } from 'vitest';

import {
  buildHubProjectRows,
  filterHubProjectRows,
  healthFacetCounts,
  leadFacetCounts,
  parseHealthFilter,
  projectHealth,
  statusPercent,
} from './hub-projects-model';
import type { ProjectPulse } from './server/context-stream.loader';
import type { ProjectUsage } from './server/context-usage.loader';
import type { ProjectSpark } from './server/hub-summary.loader';

const NOW = new Date('2026-08-12T18:00:00.000Z');

function usage(overrides: Partial<ProjectUsage>): ProjectUsage {
  return {
    projectId: 'hirly',
    projectName: 'hirly',
    memories30d: 186,
    recalls30d: 0,
    storageBytes: 0,
    estContextTokens30d: 0,
    ...overrides,
  };
}

function pulse(overrides: Partial<ProjectPulse>): ProjectPulse {
  return {
    projectId: 'hirly',
    name: 'hirly',
    itemsThisWeek: 4,
    lastItemAt: NOW.toISOString(),
    agentsActive: ['curator'],
    createdBy: 'user-abhishek',
    ...overrides,
  };
}

function spark(overrides: Partial<ProjectSpark>): ProjectSpark {
  return {
    projectId: 'hirly',
    name: 'hirly',
    series: [{ day: '2026-08-12', count: 4 }],
    createdBy: 'user-abhishek',
    ...overrides,
  };
}

const ABHISHEK = {
  userId: 'user-abhishek',
  name: 'Abhishek Thakur',
  pictureUrl: null,
};

describe('parseHealthFilter / projectHealth / statusPercent', () => {
  it('defaults unknown health filters to all', () => {
    expect(parseHealthFilter('on-track')).toBe('on-track');
    expect(parseHealthFilter('nope')).toBe('all');
  });

  it('is on track inside 7 days and no-updates after that', () => {
    expect(projectHealth(NOW.toISOString(), NOW)).toBe('on-track');
    expect(
      projectHealth(new Date('2026-07-01T00:00:00.000Z').toISOString(), NOW),
    ).toBe('no-updates');
    expect(projectHealth(null, NOW)).toBe('no-updates');
  });

  it('caps status at 100 and stays 0 when nothing was recalled', () => {
    expect(statusPercent(186, 0)).toBe(0);
    expect(statusPercent(10, 9)).toBe(90);
    expect(statusPercent(10, 50)).toBe(100);
    expect(statusPercent(0, 2)).toBe(0);
  });
});

describe('buildHubProjectRows', () => {
  it('merges usage, pulse and spark into a Linear project row', () => {
    const [row] = buildHubProjectRows(
      [usage({})],
      [pulse({})],
      [spark({})],
      NOW,
      new Map([[ABHISHEK.userId, ABHISHEK]]),
    );

    expect(row).toMatchObject({
      id: 'hirly',
      name: 'hirly',
      notes: 186,
      recalled: 0,
      lead: ABHISHEK,
      health: 'on-track',
      notRecalled: true,
      statusPercent: 0,
    });
  });

  it('does not use the active agent as lead', () => {
    const [row] = buildHubProjectRows(
      [usage({})],
      [pulse({ agentsActive: ['claude-code'], createdBy: 'user-abhishek' })],
      [],
      NOW,
      new Map([[ABHISHEK.userId, ABHISHEK]]),
    );

    expect(row?.lead).toEqual(ABHISHEK);
  });

  it('leaves lead empty when the creator is not a workspace member we can name', () => {
    const [row] = buildHubProjectRows(
      [usage({})],
      [pulse({ createdBy: 'user-gone' })],
      [],
      NOW,
      new Map(),
    );

    expect(row?.lead).toBeNull();
  });

  it('sorts by last activity, newest first', () => {
    const rows = buildHubProjectRows(
      [
        usage({ projectId: 'old', projectName: 'old', memories30d: 1 }),
        usage({ projectId: 'new', projectName: 'new', memories30d: 1 }),
      ],
      [
        pulse({
          projectId: 'old',
          name: 'old',
          lastItemAt: '2026-08-01T00:00:00.000Z',
        }),
        pulse({
          projectId: 'new',
          name: 'new',
          lastItemAt: '2026-08-12T00:00:00.000Z',
        }),
      ],
      [],
      NOW,
    );

    expect(rows.map((row) => row.id)).toEqual(['new', 'old']);
  });
});

describe('filterHubProjectRows / healthFacetCounts', () => {
  it('facets not-recalled separately from no-updates', () => {
    const rows = buildHubProjectRows(
      [
        usage({
          projectId: 'hirly',
          recalls30d: 0,
          memories30d: 186,
        }),
        usage({
          projectId: 'relio',
          projectName: 'relio',
          recalls30d: 0,
          memories30d: 82,
        }),
        usage({
          projectId: 'used',
          projectName: 'used',
          recalls30d: 9,
          memories30d: 20,
        }),
      ],
      [
        pulse({ projectId: 'hirly' }),
        pulse({
          projectId: 'relio',
          name: 'relio',
          lastItemAt: null,
          agentsActive: [],
        }),
        pulse({
          projectId: 'used',
          name: 'used',
          lastItemAt: NOW.toISOString(),
        }),
      ],
      [],
      NOW,
    );

    expect(healthFacetCounts(rows)).toEqual({
      onTrack: 2,
      noUpdates: 1,
      notRecalled: 2,
    });
    expect(
      filterHubProjectRows(rows, 'not-recalled').map((row) => row.id),
    ).toEqual(['hirly', 'relio']);
  });
});

describe('leadFacetCounts', () => {
  it('groups projects by the creating person, not the agent', () => {
    const people = new Map([[ABHISHEK.userId, ABHISHEK]]);
    const rows = buildHubProjectRows(
      [
        usage({ projectId: 'hirly' }),
        usage({ projectId: 'relio', projectName: 'relio' }),
      ],
      [
        pulse({ projectId: 'hirly', agentsActive: ['claude-code'] }),
        pulse({
          projectId: 'relio',
          name: 'relio',
          agentsActive: ['cursor'],
          createdBy: 'user-abhishek',
        }),
      ],
      [],
      NOW,
      people,
    );

    expect(leadFacetCounts(rows)).toEqual([{ lead: ABHISHEK, count: 2 }]);
  });
});

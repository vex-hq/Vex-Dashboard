import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mirrors `context-stream.loader.test.ts`'s mock exactly: the pool is faked
 * at the module boundary and `pool.query` is consumed FIFO via `queueRows`.
 * `loadHubSummary` issues three queries in a fixed order — rollup, org-wide
 * 30-day volume, project sparks — so `queueRows` seeds them in that order.
 *
 * Per this repo's testing policy (see the loader's file header), the mocked
 * pool never evaluates SQL, so seed-and-assert visibility/exclusion tests are
 * not written here — they would pass identically with the tenancy guard
 * deleted. The load-bearing assertions are (a) SQL-shape assertions on the
 * generated query text and bound params, and (b) TS-side assembly/arithmetic
 * assertions (gap-filling, ranking, capping). Every assertion below was
 * verified to fail under a deliberate mutation before being kept — see the
 * final report for the list of mutations exercised.
 */
const queryMock = vi.fn();
vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({ query: queryMock }),
}));
function queueRows(...payloads: Array<{ rows: unknown[] }>): void {
  for (const p of payloads) queryMock.mockResolvedValueOnce(p);
}
beforeEach(() => queryMock.mockReset());
afterEach(() => vi.resetModules());

function emptyRollup() {
  return { rows: [] as unknown[] };
}

describe('loadHubSummary — SQL shape', () => {
  it('binds org id and viewer id as params, never interpolated, across all three queries', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());
    await loadHubSummary('org-1', 'user-1');

    expect(queryMock).toHaveBeenCalledTimes(3);
    for (const call of queryMock.mock.calls) {
      const [sql, params] = call as [string, unknown[]];
      expect(params).toContain('org-1');
      expect(sql).not.toContain('org-1');
    }
    // Rollup and volume both key the private arm off this viewer.
    const [rollupSql, rollupParams] = queryMock.mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(rollupParams).toContain('user-1');
    expect(rollupSql).not.toContain('user-1');
  });

  it('the private arm is present and bound to the viewer id when a viewer is given', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());
    await loadHubSummary('org-1', 'user-1');

    const [rollupSql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(rollupSql).toMatch(/scope = 'org'/);
    expect(rollupSql).toMatch(/m\.scope = 'private' AND m\.user_id = \$\d+/);
    expect(rollupSql).toMatch(
      /m\.scope = 'project' AND EXISTS \(\s*SELECT 1 FROM project_members/,
    );
  });

  it('a null viewer omits the private and project arms entirely (org scope only)', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());
    await loadHubSummary('org-1', null);

    for (const call of queryMock.mock.calls) {
      const [sql] = call as [string, unknown[]];
      expect(sql).toMatch(/scope = 'org'/);
      expect(sql).not.toMatch(/scope = 'private'/);
      expect(sql).not.toContain('user-1');
    }
    // Fail-closed project listing gate, mirroring loadProjectPulse.
    const [sparkSql] = queryMock.mock.calls[2] as [string, unknown[]];
    expect(sparkSql).toMatch(/AND \(FALSE\)/);
  });

  it('carries the base status/recall_hidden predicate on every query', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());
    await loadHubSummary('org-1', 'user-1');

    for (const call of queryMock.mock.calls) {
      const [sql] = call as [string, unknown[]];
      expect(sql).toMatch(/status IN \('active', 'superseded'\)/);
      expect(sql).toMatch(/recall_hidden = FALSE/);
    }
  });

  it('projectSparks gates the projects FROM clause by membership, same as loadProjectPulse', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());
    await loadHubSummary('org-1', 'user-1');

    const [sparkSql] = queryMock.mock.calls[2] as [string, unknown[]];
    expect(sparkSql).toMatch(
      /EXISTS \(\s*SELECT 1 FROM project_members\s+pm\s+WHERE pm\.project_id = pr\.id/,
    );
  });

  it('no admin bypass (2026-08-12 ruling): the project-listing gate is always the membership EXISTS, never an unconditional TRUE', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());
    await loadHubSummary('org-1', 'user-1');

    const [sparkSql, sparkParams] = queryMock.mock.calls[2] as [
      string,
      unknown[],
    ];
    expect(sparkSql).toMatch(
      /EXISTS \(\s*SELECT 1 FROM project_members\s+pm\s+WHERE pm\.project_id = pr\.id/,
    );
    expect(sparkSql).not.toMatch(/AND \(TRUE\)/);
    expect(sparkSql).toMatch(/m\.scope = 'private' AND m\.user_id = /);
    expect(sparkParams).toContain('user-1');
  });

  it('caps the project spark set at 6 via a bound LIMIT param, never interpolated', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());
    await loadHubSummary('org-1', 'user-1');

    const [sparkSql, sparkParams] = queryMock.mock.calls[2] as [
      string,
      unknown[],
    ];
    expect(sparkSql).toMatch(/LIMIT \$\d+/);
    expect(sparkSql).not.toMatch(/LIMIT 6\b/);
    expect(sparkParams).toContain(6);
  });

  it('the rollup and volume windows are bound params (7 and 30), never interpolated', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());
    await loadHubSummary('org-1', 'user-1');

    const [rollupSql, rollupParams] = queryMock.mock.calls[0] as [
      string,
      unknown[],
    ];
    const [volumeSql, volumeParams] = queryMock.mock.calls[1] as [
      string,
      unknown[],
    ];
    expect(rollupParams).toContain(7);
    expect(rollupSql).not.toMatch(/'7'/);
    expect(volumeParams).toContain(30);
    expect(volumeSql).not.toMatch(/'30'/);
  });

  it('ranks projectSparks by total activity, most-active first', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());
    await loadHubSummary('org-1', 'user-1');

    const [sparkSql] = queryMock.mock.calls[2] as [string, unknown[]];
    expect(sparkSql).toMatch(/ORDER BY total DESC/);
  });
});

describe('loadHubSummary — TS assembly', () => {
  it('parses the rollup row into the four kind counts, projects active, agents active, last activity', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(
      {
        rows: [
          {
            decisions_7d: '3',
            plans_7d: '1',
            facts_7d: '9',
            notes_7d: '2',
            projects_active_7d: '4',
            agents_active_7d: ['claude-code', 'cursor'],
            last_activity_at: '2026-08-12T10:00:00Z',
          },
        ],
      },
      emptyRollup(),
      emptyRollup(),
    );

    const summary = await loadHubSummary('org-1', 'user-1');

    expect(summary.decisions7d).toBe(3);
    expect(summary.plans7d).toBe(1);
    expect(summary.facts7d).toBe(9);
    expect(summary.notes7d).toBe(2);
    expect(summary.projectsActive7d).toBe(4);
    expect(summary.agentsActive7d).toEqual(['claude-code', 'cursor']);
    expect(summary.lastActivityAt).toBe('2026-08-12T10:00:00Z');
  });

  it('defaults an empty rollup row to zeros, empty array, and null lastActivityAt', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());

    const summary = await loadHubSummary('org-1', null);

    expect(summary.decisions7d).toBe(0);
    expect(summary.plans7d).toBe(0);
    expect(summary.facts7d).toBe(0);
    expect(summary.notes7d).toBe(0);
    expect(summary.projectsActive7d).toBe(0);
    expect(summary.agentsActive7d).toEqual([]);
    expect(summary.lastActivityAt).toBeNull();
  });

  it('defaults a null agents_active_7d (all rows filtered out) to an empty array, not null', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(
      {
        rows: [
          {
            decisions_7d: '0',
            plans_7d: '0',
            facts_7d: '0',
            notes_7d: '0',
            projects_active_7d: '0',
            agents_active_7d: null,
            last_activity_at: null,
          },
        ],
      },
      emptyRollup(),
      emptyRollup(),
    );

    const summary = await loadHubSummary('org-1', 'user-1');
    expect(summary.agentsActive7d).toEqual([]);
  });

  it('gap-fills volume30d into a contiguous 30-day ascending series, zero-filling missing days', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    const today = new Date().toISOString().slice(0, 10);

    queueRows(
      emptyRollup(),
      { rows: [{ day: today, count: '5' }] },
      emptyRollup(),
    );

    const summary = await loadHubSummary('org-1', 'user-1');

    expect(summary.volume30d).toHaveLength(30);
    // Ascending order: earliest first, today last.
    expect(summary.volume30d[29]?.day).toBe(today);
    expect(summary.volume30d[29]?.count).toBe(5);
    // Everything else is zero-filled.
    const zeroFilled = summary.volume30d.slice(0, 29);
    expect(zeroFilled.every((p) => p.count === 0)).toBe(true);
    // Strictly ascending, no gaps or duplicates.
    const days = summary.volume30d.map((p) => p.day);
    expect(new Set(days).size).toBe(30);
    expect([...days].sort()).toEqual(days);
  });

  it('groups project spark rows by project, gap-fills each series to 30 days, and orders most-active first', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    const today = new Date().toISOString().slice(0, 10);

    queueRows(emptyRollup(), emptyRollup(), {
      rows: [
        {
          project_id: 'proj-1',
          name: 'Klio Engine',
          total: '12',
          day: today,
          count: '12',
        },
        {
          project_id: 'proj-2',
          name: 'Landing Site',
          total: '3',
          day: today,
          count: '3',
        },
      ],
    });

    const summary = await loadHubSummary('org-1', 'user-1');

    expect(summary.projectSparks).toHaveLength(2);
    expect(summary.projectSparks[0]).toMatchObject({
      projectId: 'proj-1',
      name: 'Klio Engine',
    });
    expect(summary.projectSparks[1]).toMatchObject({
      projectId: 'proj-2',
      name: 'Landing Site',
    });
    expect(summary.projectSparks[0]?.series).toHaveLength(30);
    expect(summary.projectSparks[0]?.series.at(-1)).toEqual({
      day: today,
      count: 12,
    });
  });

  it('caps projectSparks at 6 in TS even if more rows are returned than expected', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    const today = new Date().toISOString().slice(0, 10);

    const rows = Array.from({ length: 8 }, (_, i) => ({
      project_id: `proj-${i}`,
      name: `Project ${i}`,
      total: String(20 - i),
      day: today,
      count: '1',
    }));

    queueRows(emptyRollup(), emptyRollup(), { rows });

    const summary = await loadHubSummary('org-1', 'user-1');
    expect(summary.projectSparks).toHaveLength(6);
    expect(summary.projectSparks[0]?.projectId).toBe('proj-0');
  });

  it('an empty spark result yields an empty projectSparks array', async () => {
    const { loadHubSummary } = await import('./hub-summary.loader');
    queueRows(emptyRollup(), emptyRollup(), emptyRollup());

    const summary = await loadHubSummary('org-1', 'user-1');
    expect(summary.projectSparks).toEqual([]);
  });
});

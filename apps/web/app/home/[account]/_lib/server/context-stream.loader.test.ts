import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mirrors `memory.loader.test.ts`'s mock exactly: the pool is faked at the
 * module boundary and `pool.query` is consumed FIFO via `queueRows`.
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

describe('loadContextStream', () => {
  it('maps memory_type to the kind union, defaulting to other', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({
      rows: [
        row({ memory_type: 'decision' }),
        row({ memory_type: 'artifact' }),
      ],
    });
    const items = await loadContextStream('org-1', 'user-1', {});
    expect(items.map((i) => i.kind)).toEqual(['decision', 'other']);
  });

  it('passes viewer id and org into the query params, never interpolated', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadContextStream('org-1', 'user-1', { kind: 'decision', days: 7 });
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(params).toContain('org-1');
    expect(params).toContain('user-1');
    expect(sql).not.toContain('org-1'); // no string interpolation of tenancy
  });

  it('visibility SQL carries all three ladder arms', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadContextStream('org-1', 'user-1', {});
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    // The three arms, per the silo loaders they are copied from:
    expect(sql).toMatch(/scope = 'org'/);
    expect(sql).toMatch(/scope = 'private'/);
    expect(sql).toMatch(/EXISTS \(\s*SELECT 1 FROM project_members/);
  });

  it('a null viewer (unattributed key) gets org scope only', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadContextStream('org-1', null, {});
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/scope = 'org'/);
    expect(sql).not.toMatch(/scope = 'private'/);
    expect(sql).not.toMatch(/project_members/);
  });

  it('kind filter whitelist: an unknown kind never reaches the SQL', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadContextStream('org-1', 'user-1', { kind: "x'; DROP TABLE" });
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    // Assert on what the guard actually controls: an unwhitelisted kind must
    // never reach the bound params, and no memory_type clause is emitted at
    // all — not merely "the literal string DROP is absent", which passes
    // trivially since every filter value is bound, never interpolated, so
    // no filter value (malicious or not) can ever appear in the SQL text.
    expect(params).not.toContain("x'; DROP TABLE");
    expect(sql).not.toMatch(/memory_type =/);
  });
});

function row(over: Record<string, unknown>) {
  return {
    id: 'm-1',
    memory_type: 'note',
    content: 'x',
    scope: 'org',
    project_id: null,
    project_name: null,
    agent_id: 'claude-code',
    user_id: null,
    created_at: '2026-08-11T00:00:00Z',
    superseded_by: null,
    ...over,
  };
}

describe('loadProjectPulse', () => {
  it('maps grouped project rows into the pulse shape', async () => {
    const { loadProjectPulse } = await import('./context-stream.loader');
    queueRows({
      rows: [
        {
          project_id: 'proj-1',
          name: 'Klio Engine',
          items_this_week: '12',
          last_item_at: '2026-08-10T09:00:00Z',
          agents_active: ['claude-code', 'cursor'],
          created_by: 'user-alice',
        },
        {
          project_id: 'proj-2',
          name: 'Landing Site',
          items_this_week: '0',
          last_item_at: null,
          agents_active: [],
          created_by: null,
        },
      ],
    });

    const pulse = await loadProjectPulse('org-1', 'user-1');

    expect(pulse).toEqual([
      {
        projectId: 'proj-1',
        name: 'Klio Engine',
        itemsThisWeek: 12,
        lastItemAt: '2026-08-10T09:00:00Z',
        agentsActive: ['claude-code', 'cursor'],
        createdBy: 'user-alice',
      },
      {
        projectId: 'proj-2',
        name: 'Landing Site',
        itemsThisWeek: 0,
        lastItemAt: null,
        agentsActive: [],
        createdBy: null,
      },
    ]);
  });

  it('passes org and viewer as bound params, groups by project', async () => {
    const { loadProjectPulse } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadProjectPulse('org-1', 'user-1');
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(params).toContain('org-1');
    expect(params).toContain('user-1');
    expect(sql).not.toContain('org-1');
    expect(sql).toMatch(/GROUP BY/i);
    expect(sql).toMatch(/array_agg\(DISTINCT m\.agent_id\)/);
    expect(sql).toMatch(/pr\.created_by AS created_by/);
  });

  it('carries all three ladder arms, same as the stream', async () => {
    const { loadProjectPulse } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadProjectPulse('org-1', 'user-1');
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/scope = 'org'/);
    expect(sql).toMatch(/scope = 'private'/);
    expect(sql).toMatch(/EXISTS \(\s*SELECT 1 FROM project_members/);
  });

  it('a null viewer gets org scope only', async () => {
    const { loadProjectPulse } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadProjectPulse('org-1', null);
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/scope = 'org'/);
    expect(sql).not.toMatch(/scope = 'private'/);
    expect(sql).not.toMatch(/project_members/);
  });

  it('gates the projects FROM itself by membership, mirroring loadVisibleProjects (project-memory.loader.ts)', async () => {
    const { loadProjectPulse } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadProjectPulse('org-1', 'user-1');
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    // Distinct from the memory-arm EXISTS (which gates m.project_id) — this
    // one gates pr.id, i.e. the project row's own existence/metadata, not
    // just which memories are counted against it.
    expect(sql).toMatch(
      /EXISTS \(\s*SELECT 1 FROM project_members\s+pm\s+WHERE pm\.project_id = pr\.id/,
    );
  });

  // A seed-based exclusion test ("queue a member row and a non-member row,
  // assert only the member row survives") cannot work against the mocked
  // pool: `pool.query` is a `vi.fn()` that returns exactly what `queueRows`
  // seeds it with, regardless of the SQL text, so such a test would pass
  // even with the membership gate deleted entirely — it was removed for
  // being decorative (verified: it still passed with the gate stripped out
  // in review). The membership gate's load-bearing coverage is the
  // SQL-shape test above ("gates the projects FROM itself by membership"),
  // which fails when the gate is removed (verified by mutation, fix
  // round 1).

  it('a null viewer sees no projects at all (fail closed, no membership to check)', async () => {
    const { loadProjectPulse } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadProjectPulse('org-1', null);
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/AND \(FALSE\)/);
  });

  describe('no admin bypass (2026-08-12 ruling: membership is the only gate)', () => {
    it('the project-listing gate is always the membership EXISTS, never an unconditional TRUE', async () => {
      const { loadProjectPulse } = await import('./context-stream.loader');
      queueRows({ rows: [] });
      await loadProjectPulse('org-1', 'user-1');
      const [sql] = queryMock.mock.calls[0] as [string, unknown[]];

      expect(sql).toMatch(
        /EXISTS \(\s*SELECT 1 FROM project_members\s+pm\s+WHERE pm\.project_id = pr\.id/,
      );
      expect(sql).not.toMatch(/AND \(TRUE\)/);
    });

    it('never carries a HAVING clause — the admin-only activity floor is gone along with the admin path', async () => {
      const { loadProjectPulse } = await import('./context-stream.loader');
      queueRows({ rows: [] });
      await loadProjectPulse('org-1', 'user-1');
      const [sql] = queryMock.mock.calls[0] as [string, unknown[]];

      expect(sql).not.toMatch(/HAVING/i);
    });

    it('a null viewer never produces an unconditional TRUE listing gate either', async () => {
      const { loadProjectPulse } = await import('./context-stream.loader');
      queueRows({ rows: [] });
      await loadProjectPulse('org-1', null);
      const [sql] = queryMock.mock.calls[0] as [string, unknown[]];

      expect(sql).not.toMatch(/AND \(TRUE\)/);
      expect(sql).toMatch(/AND \(FALSE\)/);
    });
  });

  describe('rail LIMIT', () => {
    it('binds a LIMIT of 8 as a query parameter', async () => {
      const { loadProjectPulse } = await import('./context-stream.loader');
      queueRows({ rows: [] });
      await loadProjectPulse('org-1', 'user-1');
      const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];

      expect(sql).toMatch(/LIMIT \$\d+/);
      expect(params).toContain(8);
    });

    it('LIMIT is not string-interpolated: the literal "8" never appears bare in the SQL text', async () => {
      const { loadProjectPulse } = await import('./context-stream.loader');
      queueRows({ rows: [] });
      await loadProjectPulse('org-1', 'user-1');
      const [sql] = queryMock.mock.calls[0] as [string, unknown[]];

      expect(sql).not.toMatch(/LIMIT 8\b/);
    });
  });
});

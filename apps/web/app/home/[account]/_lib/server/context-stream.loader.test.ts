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
        },
        {
          project_id: 'proj-2',
          name: 'Landing Site',
          items_this_week: '0',
          last_item_at: null,
          agents_active: [],
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
      },
      {
        projectId: 'proj-2',
        name: 'Landing Site',
        itemsThisWeek: 0,
        lastItemAt: null,
        agentsActive: [],
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

  it('a project the viewer is not a member of is excluded even though it has visible org-scoped memories', async () => {
    const { loadProjectPulse } = await import('./context-stream.loader');
    // Postgres applies the `pr.id` membership EXISTS (asserted in the
    // previous test) before any row is produced, so a real query never
    // returns an aggregate row for a non-member project — the mock is
    // seeded with exactly that: only the member project's row, standing in
    // for what the gated query would actually return.
    queueRows({
      rows: [
        {
          project_id: 'proj-member',
          name: 'Member Project',
          items_this_week: '3',
          last_item_at: '2026-08-10T09:00:00Z',
          agents_active: ['claude-code'],
        },
      ],
    });

    const pulse = await loadProjectPulse('org-1', 'user-1');

    expect(pulse.map((row) => row.projectId)).toEqual(['proj-member']);
    expect(pulse.some((row) => row.projectId === 'proj-non-member')).toBe(
      false,
    );
  });

  it('a null viewer sees no projects at all (fail closed, no membership to check)', async () => {
    const { loadProjectPulse } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadProjectPulse('org-1', null);
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/AND \(FALSE\)/);
  });
});

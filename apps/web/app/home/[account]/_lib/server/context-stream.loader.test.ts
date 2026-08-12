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
    const [sql, params] = queryMock.mock.calls[0];
    expect(params).toContain('org-1');
    expect(params).toContain('user-1');
    expect(sql).not.toContain('org-1'); // no string interpolation of tenancy
  });

  it('visibility SQL carries all three ladder arms', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadContextStream('org-1', 'user-1', {});
    const [sql] = queryMock.mock.calls[0];
    // The three arms, per the silo loaders they are copied from:
    expect(sql).toMatch(/scope = 'org'/);
    expect(sql).toMatch(/scope = 'private'/);
    expect(sql).toMatch(/EXISTS \(\s*SELECT 1 FROM project_members/);
  });

  it('a null viewer (unattributed key) gets org scope only', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadContextStream('org-1', null, {});
    const [sql] = queryMock.mock.calls[0];
    expect(sql).toMatch(/scope = 'org'/);
    expect(sql).not.toMatch(/scope = 'private'/);
    expect(sql).not.toMatch(/project_members/);
  });

  it('kind filter whitelist: an unknown kind never reaches the SQL', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadContextStream('org-1', 'user-1', { kind: "x'; DROP TABLE" });
    const [sql] = queryMock.mock.calls[0];
    expect(sql).not.toContain('DROP');
  });
});

function row(over: Record<string, unknown>) {
  return {
    id: 'm-1', memory_type: 'note', content: 'x', scope: 'org',
    project_id: null, project_name: null, agent_id: 'claude-code',
    user_id: null, created_at: '2026-08-11T00:00:00Z', superseded_by: null,
    ...over,
  };
}

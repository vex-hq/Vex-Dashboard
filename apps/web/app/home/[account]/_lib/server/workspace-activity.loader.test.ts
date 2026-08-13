import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mirrors `memory.loader.test.ts` / `context-stream.loader.test.ts`'s mock
 * exactly: the pool is faked at the module boundary and `pool.query` is
 * consumed FIFO via `queueRows`. `pool.query` never evaluates SQL, so only
 * SQL-shape assertions and TS-mapping assertions are load-bearing here.
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

describe('loadHasAnyMemory', () => {
  it('binds org_id as a query parameter, never interpolated', async () => {
    const { loadHasAnyMemory } = await import('./workspace-activity.loader');
    queueRows({ rows: [] });
    await loadHasAnyMemory('org-1');
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual(['org-1']);
    expect(sql).not.toContain('org-1');
  });

  it('queries session_memories with LIMIT 1', async () => {
    const { loadHasAnyMemory } = await import('./workspace-activity.loader');
    queueRows({ rows: [] });
    await loadHasAnyMemory('org-1');
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/FROM session_memories/);
    expect(sql).toMatch(/LIMIT 1/);
  });

  it('carries no scope predicate — an org that writes only private-scope memory must still count as active', async () => {
    const { loadHasAnyMemory } = await import('./workspace-activity.loader');
    queueRows({ rows: [] });
    await loadHasAnyMemory('org-1');
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toMatch(/scope\s*=/);
  });

  it('carries no status predicate — a workspace with only superseded/archived rows must still count as having captured something', async () => {
    const { loadHasAnyMemory } = await import('./workspace-activity.loader');
    queueRows({ rows: [] });
    await loadHasAnyMemory('org-1');
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toMatch(/status\s*=/);
  });

  it('resolves true when the probe finds a row', async () => {
    const { loadHasAnyMemory } = await import('./workspace-activity.loader');
    queueRows({ rows: [{ '?column?': 1 }] });
    await expect(loadHasAnyMemory('org-1')).resolves.toBe(true);
  });

  it('resolves false when the probe finds no rows', async () => {
    const { loadHasAnyMemory } = await import('./workspace-activity.loader');
    queueRows({ rows: [] });
    await expect(loadHasAnyMemory('org-1')).resolves.toBe(false);
  });
});

describe('loadViewerHasWritten', () => {
  it('binds org and viewer, never interpolated', async () => {
    const { loadViewerHasWritten } =
      await import('./workspace-activity.loader');
    queueRows({ rows: [] });
    await loadViewerHasWritten('org-1', 'user-1');
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual(['org-1', 'user-1']);
    expect(sql).not.toContain('org-1');
    expect(sql).not.toContain('user-1');
    expect(sql).toMatch(/user_id = \$2/);
  });

  it('throws on a blank user id', async () => {
    const { loadViewerHasWritten } =
      await import('./workspace-activity.loader');
    await expect(loadViewerHasWritten('org-1', '')).rejects.toThrow(
      /non-blank user id/,
    );
    expect(queryMock).not.toHaveBeenCalled();
  });
});

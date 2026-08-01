import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for the Team (org-scope) loader.
 *
 * These moved here verbatim from `memory.loader.test.ts` when
 * `loadMemoryList` became `loadTeamMemories` and got its own file — the org
 * predicate, the parameter binding and the space join are unchanged, only the
 * module and the name moved, plus the new `provenance` column on each row.
 *
 * The mock `pool.query` is consumed FIFO: each call returns the next queued
 * `{ rows }` payload.
 */
const queryMock = vi.fn();

vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({ query: queryMock }),
}));

function queueRows(...payloads: Array<{ rows: unknown[] }>): void {
  for (const payload of payloads) {
    queryMock.mockResolvedValueOnce(payload);
  }
}

beforeEach(() => {
  queryMock.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

describe('loadTeamMemories', () => {
  it('binds the space filter as a parameter and keeps the query org-scoped', async () => {
    queueRows({ rows: [] });

    const { loadTeamMemories } = await import('./team-memory.loader');
    const { MEMORY_PAGE_SIZE } = await import('./memory-visibility.types');

    const spaceId = '11111111-2222-3333-4444-555555555555';

    await loadTeamMemories('org-5', { space_id: spaceId });

    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];

    // The org id is always the first bound parameter, so a space filter can
    // never widen the read beyond the caller's org.
    expect(params[0]).toBe('org-5');
    expect(params).toContain(spaceId);

    // Bound, never interpolated: the raw value must not appear in the SQL text.
    expect(sql).not.toContain(spaceId);
    expect(params).toEqual([
      'org-5',
      'org',
      'active',
      spaceId,
      MEMORY_PAGE_SIZE,
      0,
    ]);
  });

  it('maps the joined space name onto each row', async () => {
    queueRows({
      rows: [
        {
          id: 'mem-1',
          agent_id: 'klio-host/claude-code',
          memory_type: 'fact',
          content: 'deploys run on Fly',
          provenance: 'EXTRACTED',
          project_id: null,
          space_id: 'space-1',
          space_name: 'Platform',
          source: 'mcp',
          created_at: '2026-06-02T09:00:00.000Z',
          total_count: '1',
        },
        {
          id: 'mem-2',
          agent_id: 'klio-host/cursor',
          memory_type: 'note',
          content: 'org-brain write with no space',
          provenance: 'INFERRED',
          project_id: null,
          space_id: null,
          space_name: null,
          source: null,
          created_at: '2026-06-01T09:00:00.000Z',
          total_count: '1',
        },
      ],
    });

    const { loadTeamMemories } = await import('./team-memory.loader');

    const result = await loadTeamMemories('org-6');

    expect(result.rows[0]?.space_id).toBe('space-1');
    expect(result.rows[0]?.space_name).toBe('Platform');
    expect(result.rows[1]?.space_id).toBeNull();
    expect(result.rows[1]?.space_name).toBeNull();
  });
});

describe('loadOrgStorageTotal', () => {
  it('returns one workspace-wide total and never groups by user', async () => {
    queueRows(
      { rows: [{ memories: '35425', content_bytes: '9123456' }] },
      { rows: [{ artifact_bytes: '69' }] },
    );

    const { loadOrgStorageTotal } = await import('./team-memory.loader');

    const total = await loadOrgStorageTotal('org-7');

    expect(total).toEqual({
      memories: 35425,
      content_bytes: 9123456,
      artifact_bytes: 69,
    });

    // The admin storage figure is a single aggregate. A GROUP BY here would
    // turn a billing number into a per-person disclosure about who is active.
    for (const call of queryMock.mock.calls) {
      const [sql] = call as [string];
      expect(sql.toUpperCase()).not.toContain('GROUP BY');
      expect(sql).not.toContain('user_id');
    }
  });
});

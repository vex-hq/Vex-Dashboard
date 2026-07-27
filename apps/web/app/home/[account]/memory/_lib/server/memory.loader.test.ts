import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The mock `pool.query` is consumed FIFO: each call returns the next queued
 * `{ rows }` payload. Loaders that issue parallel queries (e.g. capture +
 * recall) drain two entries per invocation. `queueRows` seeds the queue and
 * tests assert on the TS-side transformation, never on the SQL text.
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
  // React's cache() memoizes per-args within a render; resetting modules
  // between tests guarantees each test re-imports fresh, un-memoized loaders.
  vi.resetModules();
});

describe('loadAgentMemorySummary', () => {
  it('parses populated capture + recall aggregates into a numeric row', async () => {
    queueRows(
      {
        rows: [
          {
            captured: '7',
            last_captured: '2026-06-02T10:00:00.000Z',
            facts: '3',
            via_mcp: '2',
            via_hook: '1',
          },
        ],
      },
      {
        rows: [{ recalled: '27', last_recalled: '2026-06-02T11:30:00.000Z' }],
      },
    );

    const { loadAgentMemorySummary } = await import('./memory.loader');

    const row = await loadAgentMemorySummary('org-1', 'klio-host/claude-code');

    expect(row).toEqual({
      agent_id: 'klio-host/claude-code',
      tool: 'claude-code',
      captured: 7,
      facts: 3,
      via_mcp: 2,
      via_hook: 1,
      last_captured: '2026-06-02T10:00:00.000Z',
      recalled: 27,
      last_recalled: '2026-06-02T11:30:00.000Z',
    });
  });

  it('returns zeros and nulls when the identity has no rows', async () => {
    queueRows(
      {
        rows: [
          {
            captured: '0',
            last_captured: null,
            facts: '0',
            via_mcp: '0',
            via_hook: '0',
          },
        ],
      },
      { rows: [{ recalled: '0', last_recalled: null }] },
    );

    const { loadAgentMemorySummary } = await import('./memory.loader');

    const row = await loadAgentMemorySummary('org-2', 'cursor');

    expect(row).toEqual({
      agent_id: 'cursor',
      tool: 'cursor',
      captured: 0,
      facts: 0,
      via_mcp: 0,
      via_hook: 0,
      last_captured: null,
      recalled: 0,
      last_recalled: null,
    });
  });
});

describe('loadMemoryList', () => {
  it('binds the space filter as a parameter and keeps the query org-scoped', async () => {
    queueRows({ rows: [] });

    const { loadMemoryList, MEMORY_PAGE_SIZE } =
      await import('./memory.loader');

    const spaceId = '11111111-2222-3333-4444-555555555555';

    await loadMemoryList('org-5', { space_id: spaceId });

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
          project_id: null,
          space_id: null,
          space_name: null,
          source: null,
          created_at: '2026-06-01T09:00:00.000Z',
          total_count: '1',
        },
      ],
    });

    const { loadMemoryList } = await import('./memory.loader');

    const result = await loadMemoryList('org-6');

    expect(result.rows[0]?.space_id).toBe('space-1');
    expect(result.rows[0]?.space_name).toBe('Platform');
    expect(result.rows[1]?.space_id).toBeNull();
    expect(result.rows[1]?.space_name).toBeNull();
  });
});

describe('loadSpaces', () => {
  it('returns the org-scoped space rows for the filter dropdown', async () => {
    queueRows({
      rows: [
        { id: 'space-1', name: 'Platform', slug: 'platform' },
        { id: 'space-2', name: 'Research', slug: 'research' },
      ],
    });

    const { loadSpaces } = await import('./memory.loader');

    const spaces = await loadSpaces('org-7');

    const [, params] = queryMock.mock.calls[0] as [string, unknown[]];

    expect(params).toEqual(['org-7']);
    expect(spaces).toEqual([
      { id: 'space-1', name: 'Platform', slug: 'platform' },
      { id: 'space-2', name: 'Research', slug: 'research' },
    ]);
  });
});

describe('loadAgentRecalls', () => {
  it('maps rows and computes pageCount from total_count', async () => {
    queueRows({
      rows: [
        {
          id: 'rec-1',
          query_text: 'how do I deploy',
          result_count: 4,
          source: 'mcp',
          created_at: '2026-06-02T09:00:00.000Z',
          total_count: '52',
        },
        {
          id: 'rec-2',
          query_text: null,
          result_count: 0,
          source: null,
          created_at: '2026-06-01T08:00:00.000Z',
          total_count: '52',
        },
      ],
    });

    const { loadAgentRecalls, MEMORY_PAGE_SIZE } =
      await import('./memory.loader');

    const result = await loadAgentRecalls('org-3', 'klio-host/cursor', 1);

    expect(result.rows).toEqual([
      {
        id: 'rec-1',
        query_text: 'how do I deploy',
        result_count: 4,
        source: 'mcp',
        created_at: '2026-06-02T09:00:00.000Z',
      },
      {
        id: 'rec-2',
        query_text: null,
        result_count: 0,
        source: null,
        created_at: '2026-06-01T08:00:00.000Z',
      },
    ]);
    expect(result.pageCount).toBe(Math.ceil(52 / MEMORY_PAGE_SIZE));
  });

  it('returns empty rows and pageCount 0 when there are no recalls', async () => {
    queueRows({ rows: [] });

    const { loadAgentRecalls } = await import('./memory.loader');

    const result = await loadAgentRecalls('org-4', 'windsurf');

    expect(result.rows).toEqual([]);
    expect(result.pageCount).toBe(0);
  });
});

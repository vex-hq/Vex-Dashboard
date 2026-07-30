import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The mock `pool.query` is consumed FIFO: each call returns the next queued
 * `{ rows }` payload. `loadMemorySessionHeader` issues two queries in parallel,
 * so it drains two entries per invocation.
 *
 * Assertions target the TS-side transformation and the bound parameters — the
 * parameters matter here because the filters are what keep user input out of the
 * SQL text.
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

function aggregateRow(overrides: Record<string, unknown> = {}) {
  return {
    session_id: 'klio-hook:abc',
    primary_agent_id: 'klio-host/claude-code',
    agent_count: '1',
    captured: '120',
    recallable: '44',
    facts: '40',
    observations: '75',
    summaries: '4',
    deliberate: '1',
    first_captured: '2026-07-01T09:00:00.000Z',
    last_captured: '2026-07-04T18:30:00.000Z',
    total_count: '3',
    ...overrides,
  };
}

beforeEach(() => {
  queryMock.mockReset();
});

afterEach(() => {
  // React's cache() memoizes per-args within a render; resetting modules
  // between tests guarantees each test re-imports fresh, un-memoized loaders.
  vi.resetModules();
});

describe('loadMemorySessionList', () => {
  it('parses aggregates into numbers and derives the page count', async () => {
    queueRows({ rows: [aggregateRow({ total_count: '30' })] });

    const { loadMemorySessionList } = await import('./memory-sessions.loader');

    const result = await loadMemorySessionList('org-1');

    expect(result.rows).toEqual([
      {
        session_id: 'klio-hook:abc',
        primary_agent_id: 'klio-host/claude-code',
        agent_count: 1,
        captured: 120,
        recallable: 44,
        facts: 40,
        observations: 75,
        summaries: 4,
        deliberate: 1,
        first_captured: '2026-07-01T09:00:00.000Z',
        last_captured: '2026-07-04T18:30:00.000Z',
      },
    ]);

    // 30 rows at 25 per page.
    expect(result.pageCount).toBe(2);
  });

  it('reports no pages when the org has no memory', async () => {
    queueRows({ rows: [] });

    const { loadMemorySessionList } = await import('./memory-sessions.loader');

    const result = await loadMemorySessionList('org-1');

    expect(result.rows).toEqual([]);
    expect(result.pageCount).toBe(0);
  });

  it('binds every filter as a parameter rather than inlining it', async () => {
    queueRows({ rows: [] });

    const { loadMemorySessionList } = await import('./memory-sessions.loader');

    await loadMemorySessionList('org-1', {
      agentId: 'klio-host/claude-code',
      memoryType: 'decision',
      timeRange: '7d',
      page: 2,
    });

    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];

    // org, deliberate-type array, then one placeholder per active filter, then
    // LIMIT/OFFSET.
    expect(params).toEqual([
      'org-1',
      ['decision', 'plan', 'note'],
      'klio-host/claude-code',
      'decision',
      7,
      25,
      25,
    ]);

    expect(sql).toContain('agent_id = $3');
    expect(sql).toContain('memory_type = $4');
    expect(sql).toContain("($5 || ' days')::interval");

    // No filter value may appear as literal SQL text.
    expect(sql).not.toContain('klio-host/claude-code');
    expect(sql).not.toContain('7 days');
  });

  it('clamps a page below 1 to the first page', async () => {
    queueRows({ rows: [] });

    const { loadMemorySessionList } = await import('./memory-sessions.loader');

    await loadMemorySessionList('org-1', { page: -5 });

    const [, params] = queryMock.mock.calls[0] as [string, unknown[]];

    // LIMIT 25 OFFSET 0.
    expect(params.slice(-2)).toEqual([25, 0]);
  });
});

describe('loadMemorySessionHeader', () => {
  it('returns null when the org has no memory under that session id', async () => {
    queueRows({ rows: [] }, { rows: [] });

    const { loadMemorySessionHeader } = await import(
      './memory-sessions.loader'
    );

    await expect(
      loadMemorySessionHeader('klio-hook:abc', 'org-1'),
    ).resolves.toBeNull();
  });

  it('scopes both queries to the org so another tenant reads as not-found', async () => {
    queueRows({ rows: [] }, { rows: [] });

    const { loadMemorySessionHeader } = await import(
      './memory-sessions.loader'
    );

    await loadMemorySessionHeader('klio-hook:abc', 'org-1');

    for (const [sql, params] of queryMock.mock.calls as Array<
      [string, unknown[]]
    >) {
      expect(sql).toContain('org_id = $1');
      expect(params[0]).toBe('org-1');
    }
  });

  it('attaches the per-agent breakdown to the aggregates', async () => {
    queueRows(
      { rows: [aggregateRow({ agent_count: '2' })] },
      {
        rows: [
          { agent_id: 'klio-host/claude-code', captured: '100' },
          { agent_id: 'klio-host/cursor', captured: '20' },
        ],
      },
    );

    const { loadMemorySessionHeader } = await import(
      './memory-sessions.loader'
    );

    const header = await loadMemorySessionHeader('klio-hook:abc', 'org-1');

    expect(header?.agent_count).toBe(2);
    expect(header?.agents).toEqual([
      { agent_id: 'klio-host/claude-code', captured: 100 },
      { agent_id: 'klio-host/cursor', captured: 20 },
    ]);
  });
});

describe('loadSessionMemories', () => {
  it('coerces confidence to a number and preserves nulls', async () => {
    queueRows({
      rows: [
        {
          id: 'm1',
          agent_id: 'klio-host/claude-code',
          memory_type: 'decision',
          content: 'Use Postgres.',
          confidence: '0.82',
          scope: 'org',
          status: 'active',
          source: 'mcp',
          recall_hidden: false,
          superseded_by: null,
          space_name: 'engineering',
          project_id: null,
          created_at: '2026-07-01T09:00:00.000Z',
          total_count: '120',
        },
        {
          id: 'm2',
          agent_id: 'klio-host/claude-code',
          memory_type: 'observation',
          content: 'Ran the suite.',
          confidence: null,
          scope: 'session',
          status: 'active',
          source: 'hook-tool',
          recall_hidden: true,
          superseded_by: null,
          space_name: null,
          project_id: 'proj-1',
          created_at: '2026-07-01T09:05:00.000Z',
          total_count: '120',
        },
      ],
    });

    const { loadSessionMemories } = await import('./memory-sessions.loader');

    const result = await loadSessionMemories('klio-hook:abc', 'org-1');

    expect(result.rows[0]?.confidence).toBe(0.82);
    expect(result.rows[1]?.confidence).toBeNull();
    expect(result.rows[1]?.recall_hidden).toBe(true);

    // 120 rows at 50 per page.
    expect(result.pageCount).toBe(3);
  });

  it('orders oldest first so the page reads as the trail the work left', async () => {
    queueRows({ rows: [] });

    const { loadSessionMemories } = await import('./memory-sessions.loader');

    await loadSessionMemories('klio-hook:abc', 'org-1');

    const [sql] = queryMock.mock.calls[0] as [string];

    expect(sql).toContain('ORDER BY m.created_at ASC');
    // sequence_number is null for most hook-captured rows, so it can only be a
    // tiebreak — never the leading sort key.
    expect(sql).toContain('m.sequence_number ASC NULLS LAST');
  });
});

describe('isMemorySessionTimeRange', () => {
  it('accepts the supported ranges and rejects anything else', async () => {
    const { isMemorySessionTimeRange } = await import(
      './memory-sessions.loader'
    );

    expect(isMemorySessionTimeRange('24h')).toBe(true);
    expect(isMemorySessionTimeRange('7d')).toBe(true);
    expect(isMemorySessionTimeRange('30d')).toBe(true);

    expect(isMemorySessionTimeRange('1y')).toBe(false);
    expect(isMemorySessionTimeRange(undefined)).toBe(false);
    expect(isMemorySessionTimeRange("1'; DROP TABLE session_memories--")).toBe(
      false,
    );
  });
});

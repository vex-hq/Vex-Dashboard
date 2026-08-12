import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The mock `pool.query` is consumed FIFO: each call returns the next queued
 * `{ rows }` payload. `loadContextUsage` issues four queries in a fixed
 * order — captures, recalls, mean length, storage — so `queueRows` seeds
 * them in that order. Per the Task 1 review's binding policy, seed-and-
 * assert tests cannot exercise the mocked pool's SQL (it is never
 * evaluated), so the load-bearing assertions here are (a) TS-side
 * arithmetic/merge on the queued rows and (b) SQL-shape assertions on the
 * generated text and the params array — never seed-and-assert-exclusion.
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

describe('loadContextUsage', () => {
  it('estimates context served = result_count_sum * mean_len / 4, floored', async () => {
    const { loadContextUsage } = await import('./context-usage.loader');
    queueRows(
      { rows: [{ project_id: 'p1', project_name: 'api', memories: '12' }] },
      { rows: [{ project_id: 'p1', recall_count: '5', result_sum: '30' }] },
      { rows: [{ mean_len: '400' }] },
      { rows: [] },
    );
    const [p1] = await loadContextUsage('org-1');
    expect(p1!.estContextTokens30d).toBe(3000); // 30 * 400 / 4
  });

  it('floors a non-integer estimate rather than rounding', async () => {
    const { loadContextUsage } = await import('./context-usage.loader');
    queueRows(
      { rows: [{ project_id: 'p1', project_name: 'api', memories: '1' }] },
      { rows: [{ project_id: 'p1', recall_count: '1', result_sum: '3' }] },
      { rows: [{ mean_len: '5' }] },
      { rows: [] },
    );
    const [p1] = await loadContextUsage('org-1');
    // 3 * 5 / 4 = 3.75 -> floors to 3, not 4.
    expect(p1!.estContextTokens30d).toBe(3);
  });

  it('recalls30d counts recall events (COUNT(*)), never result_count — the split fixture guards against re-conflation', async () => {
    const { loadContextUsage } = await import('./context-usage.loader');
    queueRows(
      { rows: [{ project_id: 'p1', project_name: 'api', memories: '12' }] },
      // 5 recall calls returned 30 results combined: recalls30d must read
      // 5 (events), never 30 (results) — the estimate alone uses 30.
      { rows: [{ project_id: 'p1', recall_count: '5', result_sum: '30' }] },
      { rows: [{ mean_len: '400' }] },
      { rows: [] },
    );
    const [p1] = await loadContextUsage('org-1');
    expect(p1).toEqual({
      projectId: 'p1',
      projectName: 'api',
      memories30d: 12,
      recalls30d: 5,
      storageBytes: 0,
      estContextTokens30d: 3000, // 30 * 400 / 4, NOT 5 * 400 / 4
    });
  });

  it('merges a captures-only project and a recalls-only project into two distinct rows', async () => {
    const { loadContextUsage } = await import('./context-usage.loader');
    queueRows(
      // p1 has captures, no recalls.
      { rows: [{ project_id: 'p1', project_name: 'api', memories: '5' }] },
      // p2 has recalls, no captures: 4 events returning 10 results total.
      { rows: [{ project_id: 'p2', recall_count: '4', result_sum: '10' }] },
      { rows: [{ mean_len: '200' }] },
      { rows: [] },
    );
    const rows = await loadContextUsage('org-2');

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        {
          projectId: 'p1',
          projectName: 'api',
          memories30d: 5,
          recalls30d: 0,
          storageBytes: 0,
          estContextTokens30d: 0,
        },
        {
          projectId: 'p2',
          projectName: null,
          memories30d: 0,
          recalls30d: 4, // events, not the result_sum of 10
          storageBytes: 0,
          estContextTokens30d: 500, // 10 * 200 / 4
        },
      ]),
    );
  });

  it('merges a project appearing in both queries into a single row, never two', async () => {
    const { loadContextUsage } = await import('./context-usage.loader');
    queueRows(
      { rows: [{ project_id: 'p1', project_name: 'api', memories: '5' }] },
      { rows: [{ project_id: 'p1', recall_count: '2', result_sum: '10' }] },
      { rows: [{ mean_len: '200' }] },
      { rows: [] },
    );
    const rows = await loadContextUsage('org-3');
    expect(rows).toHaveLength(1);
  });

  it('merges unattributed (project_id null) captures and recalls as one row', async () => {
    const { loadContextUsage } = await import('./context-usage.loader');
    queueRows(
      { rows: [{ project_id: null, project_name: null, memories: '3' }] },
      { rows: [{ project_id: null, recall_count: '2', result_sum: '6' }] },
      { rows: [{ mean_len: '100' }] },
      { rows: [] },
    );
    const rows = await loadContextUsage('org-4');
    expect(rows).toEqual([
      {
        projectId: null,
        projectName: null,
        memories30d: 3,
        recalls30d: 2,
        storageBytes: 0,
        estContextTokens30d: 150, // 6 * 100 / 4
      },
    ]);
  });

  it('returns an empty array when the org has no captures, recalls, or storage', async () => {
    const { loadContextUsage } = await import('./context-usage.loader');
    queueRows(
      { rows: [] },
      { rows: [] },
      { rows: [{ mean_len: null }] },
      { rows: [] },
    );
    const rows = await loadContextUsage('org-5');
    expect(rows).toEqual([]);
  });

  it('a project with storage but no 30d activity still merges to one row carrying storageBytes', async () => {
    const { loadContextUsage } = await import('./context-usage.loader');
    queueRows(
      { rows: [] }, // no captures in the window
      { rows: [] }, // no recalls in the window
      { rows: [{ mean_len: null }] },
      { rows: [{ project_id: 'p1', storage_bytes: '48000' }] },
    );
    const rows = await loadContextUsage('org-6');
    expect(rows).toEqual([
      {
        projectId: 'p1',
        projectName: null,
        memories30d: 0,
        recalls30d: 0,
        storageBytes: 48000,
        estContextTokens30d: 0,
      },
    ]);
  });

  it('merges storage into a project that also has 30d captures and recalls', async () => {
    const { loadContextUsage } = await import('./context-usage.loader');
    queueRows(
      { rows: [{ project_id: 'p1', project_name: 'api', memories: '5' }] },
      { rows: [{ project_id: 'p1', recall_count: '2', result_sum: '10' }] },
      { rows: [{ mean_len: '200' }] },
      { rows: [{ project_id: 'p1', storage_bytes: '12345' }] },
    );
    const rows = await loadContextUsage('org-7');
    expect(rows).toEqual([
      {
        projectId: 'p1',
        projectName: 'api',
        memories30d: 5,
        recalls30d: 2,
        storageBytes: 12345,
        estContextTokens30d: 500, // 10 * 200 / 4
      },
    ]);
  });

  it('issues four org-scoped queries, each binding org_id through the params array', async () => {
    const { loadContextUsage } = await import('./context-usage.loader');
    queueRows(
      { rows: [] },
      { rows: [] },
      { rows: [{ mean_len: null }] },
      { rows: [] },
    );
    await loadContextUsage('org-9');

    const calls = queryMock.mock.calls as [string, unknown[]][];
    expect(calls).toHaveLength(4);
    for (const [sql, params] of calls) {
      expect(sql).toMatch(/org_id\s*=\s*\$1/);
      expect(params).toEqual(['org-9']);
      // Tenancy must never be string-interpolated into the SQL text.
      expect(sql).not.toContain('org-9');
    }

    const [captureSql, recallSql, meanLenSql, storageSql] = calls.map(
      ([sql]) => sql,
    );

    // Task 1's review flagged the `display_name` (not `name`) gotcha on the
    // projects table — guard the capture query against regressing on it.
    expect(captureSql).toMatch(/display_name/);
    expect(captureSql).toContain('session_memories');
    expect(captureSql).toMatch(/interval '30 days'/);

    expect(recallSql).toContain('brain_recall_events');
    expect(recallSql).toMatch(/COUNT\(\*\)\s+AS\s+recall_count/i);
    expect(recallSql).toMatch(/SUM\(\s*result_count\s*\)/i);
    expect(recallSql).toMatch(/interval '30 days'/);

    expect(meanLenSql).toContain('session_memories');
    expect(meanLenSql).toMatch(/length\(\s*content\s*\)/i);

    // Storage is a level, not a flow: all-time, no 30-day window.
    expect(storageSql).toContain('session_memories');
    expect(storageSql).toMatch(/SUM\(\s*length\(\s*content\s*\)\s*\)/i);
    expect(storageSql).not.toMatch(/interval '30 days'/);
  });
});

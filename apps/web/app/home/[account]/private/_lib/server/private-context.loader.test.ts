import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Same mock policy as `context-view.loader.test.ts`: `pool.query` returns
 * whatever we queue. Visibility is proven by SQL-shape assertions, not by
 * the mock filtering rows.
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

const EMPTY_HEADER_ROW = {
  items_this_week: '0',
  items_total: '0',
  agents_active: null,
};

describe('loadPrivateContextView', () => {
  it("throws on a blank user id instead of querying user_id = ''", async () => {
    const { loadPrivateContextView } = await import('./private-context.loader');

    await expect(loadPrivateContextView('org-1', '')).rejects.toThrow(
      /non-blank user id/,
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('scopes every list query to the owner, private, and no project', async () => {
    const { loadPrivateContextView } = await import('./private-context.loader');

    queueRows({ rows: [] }, { rows: [] }, { rows: [EMPTY_HEADER_ROW] });

    await loadPrivateContextView('org-1', 'user-1');

    expect(queryMock).toHaveBeenCalledTimes(3);

    for (const [sql, params] of queryMock.mock.calls as Array<
      [string, unknown[]]
    >) {
      expect(sql).toMatch(/m\.project_id IS NULL/);
      expect(sql).toMatch(/m\.user_id = \$2/);
      expect(sql).toMatch(/m\.scope = \$3/);
      expect(sql).not.toMatch(/scope = 'org'/);
      expect(sql).not.toMatch(/project_members/);
      expect(sql).not.toContain('org-1');
      expect(sql).not.toContain('user-1');
      expect(params[0]).toBe('org-1');
      expect(params[1]).toBe('user-1');
      expect(params[2]).toBe('private');
    }
  });

  it('skips the chain walk when there are no active section items', async () => {
    const { loadPrivateContextView } = await import('./private-context.loader');

    queueRows({ rows: [] }, { rows: [] }, { rows: [EMPTY_HEADER_ROW] });

    await loadPrivateContextView('org-1', 'user-1');
    expect(queryMock).toHaveBeenCalledTimes(3);
  });

  it('assembles section rows by memory type and never re-filters visibility', async () => {
    const { loadPrivateContextView } = await import('./private-context.loader');

    queueRows(
      {
        rows: [
          {
            id: 'd1',
            memory_type: 'decision',
            content: 'keep this private',
            scope: 'private',
            project_id: null,
            project_name: null,
            agent_id: 'curator',
            user_id: 'user-1',
            created_at: '2026-08-12T00:00:00Z',
            superseded_by: null,
          },
          {
            id: 'f1',
            memory_type: 'fact',
            content: 'a capture',
            scope: 'private',
            project_id: null,
            project_name: null,
            agent_id: 'curator',
            user_id: 'user-1',
            created_at: '2026-08-12T01:00:00Z',
            superseded_by: null,
          },
        ],
      },
      { rows: [] },
      { rows: [EMPTY_HEADER_ROW] },
      { rows: [] },
    );

    const view = await loadPrivateContextView('org-1', 'user-1');

    expect(view.decisions.map((item) => item.id)).toEqual(['d1']);
    expect(view.constraints.map((item) => item.id)).toEqual(['f1']);
    expect(view.plans).toEqual([]);
    expect(queryMock).toHaveBeenCalledTimes(4);
    const [chainSql] = queryMock.mock.calls[3] as [string, unknown[]];
    expect(chainSql).toMatch(/m\.project_id IS NULL/);
    expect(chainSql).toMatch(/m\.user_id = \$2/);
  });
});

describe('loadPrivateContextArtifacts', () => {
  it("joins artifacts through the owner's unscoped private card", async () => {
    const { loadPrivateContextArtifacts } =
      await import('./private-context.loader');

    queueRows({ rows: [] });

    await loadPrivateContextArtifacts('org-1', 'user-1', 40);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/m\.project_id IS NULL/);
    expect(sql).toMatch(/m\.user_id = \$2/);
    expect(sql).toMatch(/m\.scope = \$3/);
    expect(sql).toMatch(/m\.memory_type = 'artifact'/);
    expect(sql).not.toMatch(/project_members/);
    expect(sql).not.toMatch(/scope = 'org'/);
    expect(params).toEqual(['org-1', 'user-1', 'private', 'active', 40]);
  });

  it('throws on a blank user id', async () => {
    const { loadPrivateContextArtifacts } =
      await import('./private-context.loader');

    await expect(loadPrivateContextArtifacts('org-1', '  ')).rejects.toThrow(
      /non-blank user id/,
    );
    expect(queryMock).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({ query: queryMock }),
}));

beforeEach(() => {
  queryMock.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

describe('loadLatestVisibleWrite', () => {
  it('throws on a blank user id and does not query', async () => {
    const { loadLatestVisibleWrite } =
      await import('./activation-landing.loader');

    await expect(loadLatestVisibleWrite('org-1', '')).rejects.toThrow(
      /non-blank user id/,
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('scopes the newest write to org, own-private, and member projects', async () => {
    const { loadLatestVisibleWrite } =
      await import('./activation-landing.loader');

    queryMock.mockResolvedValueOnce({
      rows: [{ id: 'mem-1', project_id: 'proj-9' }],
    });

    await expect(loadLatestVisibleWrite('org-1', 'user-1')).resolves.toEqual({
      id: 'mem-1',
      projectId: 'proj-9',
    });

    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/m\.scope = 'org'/);
    expect(sql).toMatch(/m\.scope = 'private' AND m\.user_id = \$2/);
    expect(sql).toMatch(/EXISTS \(/);
    expect(sql).toMatch(/project_members/);
    expect(sql).not.toMatch(/isOrgAdmin|kind = 'admin'/);
    expect(sql).not.toContain('org-1');
    expect(sql).not.toContain('user-1');
    expect(params).toEqual(['org-1', 'user-1']);
  });

  it('returns null when the viewer has nothing visible', async () => {
    const { loadLatestVisibleWrite } =
      await import('./activation-landing.loader');

    queryMock.mockResolvedValueOnce({ rows: [] });

    await expect(loadLatestVisibleWrite('org-1', 'user-1')).resolves.toBeNull();
  });
});

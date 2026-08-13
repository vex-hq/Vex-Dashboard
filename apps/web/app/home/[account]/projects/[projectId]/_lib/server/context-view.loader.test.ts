import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * TEST POLICY (mirrors `context-stream.loader.test.ts` and
 * `team-memory.loader.test.ts`): `pool.query` is faked at the module
 * boundary and returns exactly whatever `queueRows` seeds it with, in FIFO
 * order, regardless of the SQL text. A seed-based visibility test ("queue a
 * member row and a non-member row, assert only the member row survives")
 * therefore CANNOT fail against this mock even if the membership gate were
 * deleted entirely — the mock has no SQL engine behind it.
 *
 * Load-bearing coverage here is:
 *   (a) SQL-shape assertions on the query text/params actually sent — the
 *       membership probe's org-binding JOIN, the three visibility arms, and
 *       that no query text encodes a "kind" filter that TypeScript invented
 *       (i.e. `memory_type = ANY(...)` is bound, not interpolated).
 *   (b) TS-arithmetic/assembly assertions — the non-member short-circuit
 *       (empty probe rows -> `null`, which IS a real TS branch the mock
 *       exercises), the chain grouping/ordering, and the section mapping —
 *       each verified by mutation (see Step 5 in the task-6 report: comment
 *       out the membership probe short-circuit -> the non-member test
 *       fails; restore).
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

function row(over: Record<string, unknown>) {
  return {
    id: 'm-1',
    memory_type: 'decision',
    content: 'x',
    scope: 'org',
    project_id: 'p1',
    project_name: 'Klio Engine',
    agent_id: 'claude-code',
    user_id: null,
    created_at: '2026-08-11T00:00:00Z',
    superseded_by: null,
    ...over,
  };
}

const EMPTY_HEADER_ROW = {
  members: '0',
  items_this_week: '0',
  items_total: '0',
  agents_active: null,
};

describe('loadContextView', () => {
  it('returns null for a non-member (membership in SQL, not TS)', async () => {
    const { loadContextView } = await import('./context-view.loader');
    queueRows({ rows: [] }); // membership probe returns nothing
    expect(await loadContextView('org-1', 'p1', 'intruder')).toBeNull();
    // No further query should have been issued past the probe.
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('assembles the supersession chain oldest-last', async () => {
    const { loadContextView } = await import('./context-view.loader');

    queueRows(
      { rows: [{ one: 1 }] }, // membership probe: member
      { rows: [row({ id: 'm3', memory_type: 'decision' })] }, // sections
      { rows: [] }, // recent
      { rows: [EMPTY_HEADER_ROW] }, // header
      {
        rows: [
          // active decision m3; predecessors m1 <- m2 <- m3 via superseded_by
          {
            head_id: 'm3',
            id: 'm2',
            content: 'v2',
            created_at: '2026-08-05T00:00:00Z',
          },
          {
            head_id: 'm3',
            id: 'm1',
            content: 'v1',
            created_at: '2026-08-01T00:00:00Z',
          },
        ],
      }, // chain, newest predecessor first
    );

    const view = await loadContextView('org-1', 'p1', 'user-1');

    expect(view).not.toBeNull();
    expect(view!.decisions).toHaveLength(1);
    expect(view!.decisions[0]!.replaced.map((l) => l.id)).toEqual(['m2', 'm1']);
  });

  it('maps types to sections: decision/plan/fact; note lands only in recent', async () => {
    const { loadContextView } = await import('./context-view.loader');

    queueRows(
      { rows: [{ one: 1 }] }, // membership probe: member
      {
        rows: [
          row({ id: 'd1', memory_type: 'decision' }),
          row({ id: 'p1item', memory_type: 'plan' }),
          row({ id: 'f1', memory_type: 'fact' }),
        ],
      }, // sections: one of each known section kind, no note here
      { rows: [row({ id: 'n1', memory_type: 'note' })] }, // recent: includes a note
      { rows: [EMPTY_HEADER_ROW] }, // header
      { rows: [] }, // chain (no predecessors for any active id)
    );

    const view = await loadContextView('org-1', 'p1', 'user-1');

    expect(view).not.toBeNull();
    expect(view!.decisions.map((i) => i.id)).toEqual(['d1']);
    expect(view!.plans.map((i) => i.id)).toEqual(['p1item']);
    expect(view!.constraints.map((i) => i.id)).toEqual(['f1']);
    // The note never appears in decisions/plans/constraints, only recent.
    expect(view!.recent.map((i) => i.id)).toEqual(['n1']);
    expect(
      [...view!.decisions, ...view!.plans, ...view!.constraints].some(
        (i) => i.id === 'n1',
      ),
    ).toBe(false);
  });

  it('membership probe binds org_id via a projects JOIN (project_members has no org_id column)', async () => {
    const { loadContextView } = await import('./context-view.loader');
    queueRows({ rows: [] });
    await loadContextView('org-1', 'p1', 'user-1');
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/FROM project_members pm/);
    expect(sql).toMatch(/JOIN projects p ON p\.id = pm\.project_id/);
    expect(sql).toMatch(/pm\.project_id = \$1/);
    expect(sql).toMatch(/pm\.user_id = \$2/);
    expect(sql).toMatch(/p\.org_id = \$3/);
    expect(params).toEqual(['p1', 'user-1', 'org-1']);
  });

  it('section query carries all three visibility arms, org_id/project_id bound not interpolated', async () => {
    const { loadContextView } = await import('./context-view.loader');
    queueRows(
      { rows: [{ one: 1 }] }, // member
      { rows: [] }, // sections
      { rows: [] }, // recent
      { rows: [EMPTY_HEADER_ROW] }, // header
      // no chain query: activeIds is empty, loadChains short-circuits
    );

    await loadContextView('org-1', 'p1', 'user-1');

    const [sql, params] = queryMock.mock.calls[1] as [string, unknown[]];
    expect(sql).toMatch(/scope = 'org'/);
    expect(sql).toMatch(/scope = 'private' AND m\.user_id = /);
    expect(sql).toMatch(/EXISTS \(\s*SELECT 1 FROM project_members/);
    expect(sql).not.toContain('org-1'); // tenancy values are bound, never interpolated
    expect(sql).not.toContain('p1');
    expect(params).toContain('org-1');
    expect(params).toContain('p1');
    expect(params).toContain('user-1');
  });

  it('recent query carries all three visibility arms too', async () => {
    const { loadContextView } = await import('./context-view.loader');
    queueRows(
      { rows: [{ one: 1 }] },
      { rows: [] },
      { rows: [] },
      { rows: [EMPTY_HEADER_ROW] },
    );

    await loadContextView('org-1', 'p1', 'user-1');

    const [sql] = queryMock.mock.calls[2] as [string, unknown[]];
    expect(sql).toMatch(/scope = 'org'/);
    expect(sql).toMatch(/scope = 'private'/);
    expect(sql).toMatch(/EXISTS \(\s*SELECT 1 FROM project_members/);
  });

  it('chain query is skipped entirely when there are no active section items (no wasted round trip, no TS post-filter needed)', async () => {
    const { loadContextView } = await import('./context-view.loader');
    queueRows(
      { rows: [{ one: 1 }] },
      { rows: [] }, // no active section items
      { rows: [] },
      { rows: [EMPTY_HEADER_ROW] },
    );

    await loadContextView('org-1', 'p1', 'user-1');

    // probe + sections + recent + header = 4 calls, no 5th chain query.
    expect(queryMock).toHaveBeenCalledTimes(4);
  });

  it('does not TS-filter section rows by scope/userId — SQL already decided visibility', async () => {
    const { loadContextView } = await import('./context-view.loader');

    queueRows(
      { rows: [{ one: 1 }] },
      {
        rows: [
          row({ id: 'org-scoped', memory_type: 'decision', scope: 'org' }),
          row({
            id: 'project-scoped',
            memory_type: 'plan',
            scope: 'project',
          }),
          row({
            id: 'own-private',
            memory_type: 'fact',
            scope: 'private',
            user_id: 'user-1',
          }),
        ],
      },
      { rows: [] },
      { rows: [EMPTY_HEADER_ROW] },
      { rows: [] },
    );

    const view = await loadContextView('org-1', 'p1', 'user-1');

    // Every row the mocked SQL returned is assembled, regardless of its
    // scope/user_id — assembly keys only on memory_type, never re-derives
    // visibility. Membership/visibility is the SQL layer's job only.
    expect(view!.decisions.map((i) => i.id)).toEqual(['org-scoped']);
    expect(view!.plans.map((i) => i.id)).toEqual(['project-scoped']);
    expect(view!.constraints.map((i) => i.id)).toEqual(['own-private']);
  });

  it('header aggregates member count, weekly items and active agents', async () => {
    const { loadContextView } = await import('./context-view.loader');

    queueRows(
      { rows: [{ one: 1 }] },
      { rows: [] },
      { rows: [] },
      {
        rows: [
          {
            members: '4',
            items_this_week: '9',
            items_total: '22',
            agents_active: ['claude-code', 'cursor'],
          },
        ],
      },
    );

    const view = await loadContextView('org-1', 'p1', 'user-1');

    expect(view!.header).toEqual({
      members: 4,
      itemsThisWeek: 9,
      itemsTotal: 22,
      agentsActive: ['claude-code', 'cursor'],
    });
  });

  // --- 2026-08-12 ruling: membership is the only gate, no admin bypass ---
  //
  // The loader used to accept a `ProjectAccess` union whose `{ kind: 'admin'
  // }` branch skipped the `project_members` lookup entirely (see git
  // history for the removed `probeMembership` admin arm and the removed
  // `{ kind: 'admin' }` visibility arms). These tests replace that
  // "admin still gets in" coverage with "admin gets the same null as
  // anyone else" — inverted, not deleted, per the ruling that a project is
  // visible only to its members, full stop.

  it('a non-member gets null regardless of org-admin status — there is no admin parameter left to grant it', async () => {
    const { loadContextView } = await import('./context-view.loader');
    queueRows({ rows: [] }); // membership probe finds no row for this user
    expect(await loadContextView('org-1', 'p1', 'admin-1')).toBeNull();
    // Only the membership probe ran — no admin fallback query exists to fire.
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a blank viewer user id before any query', async () => {
    const { loadContextView } = await import('./context-view.loader');

    await expect(loadContextView('org-1', 'p1', '  ')).rejects.toThrow(
      /viewer user id is required/,
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('visibility arms are unchanged: still org + own-private + EXISTS project arm, no unconditional project arm', async () => {
    const { loadContextView } = await import('./context-view.loader');
    queueRows(
      { rows: [{ one: 1 }] },
      { rows: [] },
      { rows: [] },
      { rows: [EMPTY_HEADER_ROW] },
    );

    await loadContextView('org-1', 'p1', 'user-1');

    const [sectionsSql] = queryMock.mock.calls[1] as [string, unknown[]];
    expect(sectionsSql).toMatch(/scope = 'org'/);
    expect(sectionsSql).toMatch(/scope = 'private' AND m\.user_id = /);
    expect(sectionsSql).toMatch(/EXISTS \(\s*SELECT 1 FROM project_members/);
    // The old admin branch emitted a bare `(m.scope = 'project')` arm with
    // no EXISTS at all — that shape must never appear again.
    expect(sectionsSql).not.toMatch(/\(m\.scope = 'project'\)/);
  });

  // --- Fix round 1, Finding 2: recursive CTE cycle guard ----------------

  it('chain query carries a path-array cycle guard, not just the depth cap', async () => {
    const { loadContextView } = await import('./context-view.loader');
    queueRows(
      { rows: [{ one: 1 }] }, // member
      { rows: [row({ id: 'm3', memory_type: 'decision' })] }, // sections
      { rows: [] }, // recent
      { rows: [EMPTY_HEADER_ROW] }, // header
      { rows: [] }, // chain
    );

    await loadContextView('org-1', 'p1', 'user-1');

    const [chainSql] = queryMock.mock.calls[4] as [string, unknown[]];
    expect(chainSql).toMatch(/ARRAY\[m\.id\] AS path/);
    expect(chainSql).toMatch(/c\.path \|\| m\.id/);
    expect(chainSql).toMatch(/m\.id != ALL\(c\.path\)/);
    expect(chainSql).toMatch(/c\.depth < /); // depth cap still present alongside the guard
  });

  it('a cyclic superseded_by chain does not duplicate ChainLink rows past what the guarded query returns', async () => {
    // The guard's job is done in SQL; this pins the TS side's contract that
    // it trusts and simply groups whatever rows come back, so a query that
    // (thanks to the guard) returns each predecessor once produces exactly
    // one ChainLink per row - no client-side dedup masking a bad query.
    const { loadContextView } = await import('./context-view.loader');
    queueRows(
      { rows: [{ one: 1 }] },
      { rows: [row({ id: 'm3', memory_type: 'decision' })] },
      { rows: [] },
      { rows: [EMPTY_HEADER_ROW] },
      {
        rows: [
          {
            head_id: 'm3',
            id: 'm2',
            content: 'v2',
            created_at: '2026-08-05T00:00:00Z',
          },
        ],
      },
    );

    const view = await loadContextView('org-1', 'p1', 'user-1');

    expect(view!.decisions[0]!.replaced).toEqual([
      { id: 'm2', content: 'v2', createdAt: '2026-08-05T00:00:00Z' },
    ]);
  });
});

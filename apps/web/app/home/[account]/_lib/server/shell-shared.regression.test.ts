import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * REGRESSION: the shared group must not be a filter over a capped list.
 *
 * The Shared screen originally derived its two groups by loading the newest
 * `SHELL_LIST_LIMIT` rows and partitioning them on `scope`. That is wrong in
 * exactly the shape this org has: 5,196 private rows and 1 org-scoped one. If
 * the shared row is not among the newest 200, the screen renders "Nothing
 * shared yet" — a false statement, on the screen whose entire purpose is to
 * tell you what the team can see.
 *
 * The fixture below reproduces that: one old shared row, buried under more
 * recent private rows than the cap. The shared group must still find it.
 */

const db = new PGlite();

vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({
    query: (sql: string, params?: unknown[]) => db.query(sql, params),
  }),
}));

const ORG = 'org-alpha';
const ALICE = '11111111-1111-1111-1111-111111111111';
const BURIED_SHARED = 'BURIED_SHARED_RT4';

const SCHEMA = `
CREATE TABLE projects (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  display_name varchar NOT NULL
);
CREATE TABLE session_memories (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  agent_id varchar NOT NULL,
  user_id varchar,
  memory_type varchar NOT NULL,
  content text NOT NULL,
  scope varchar NOT NULL,
  status varchar NOT NULL DEFAULT 'active',
  project_id uuid,
  recall_hidden boolean NOT NULL DEFAULT false,
  superseded_by uuid,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE brain_recall_events (
  id uuid PRIMARY KEY, org_id varchar NOT NULL, agent_id varchar,
  source text, memory_ids uuid[], created_at timestamptz DEFAULT now()
);
CREATE TABLE recall_outcomes (
  id uuid PRIMARY KEY, org_id varchar NOT NULL, memory_id uuid NOT NULL,
  used boolean NOT NULL DEFAULT false, served_stale boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
`;

beforeAll(async () => {
  await db.exec(SCHEMA);

  // The shared row, oldest of all.
  await db.query(
    `INSERT INTO session_memories
       (id, org_id, agent_id, user_id, memory_type, content, scope, created_at)
     VALUES ('eeeeeeee-0000-0000-0000-000000000001',$1,'a',$2,'fact',$3,'org',
             now() - interval '400 days')`,
    [ORG, ALICE, `${BURIED_SHARED} the one shared item`],
  );

  // 250 newer private rows — more than SHELL_LIST_LIMIT, so the shared row
  // falls outside any "newest N" window.
  for (let i = 0; i < 250; i += 1) {
    await db.query(
      `INSERT INTO session_memories
         (id, org_id, agent_id, user_id, memory_type, content, scope, created_at)
       VALUES ($1,$2,'a',$3,'fact',$4,'private', now() - ($5 || ' minutes')::interval)`,
      [
        `ffffffff-0000-0000-0000-${String(i).padStart(12, '0')}`,
        ORG,
        ALICE,
        `private row ${i}`,
        String(i),
      ],
    );
  }
});

describe('the shared group', () => {
  it('finds a shared row buried beneath more recent private rows', async () => {
    const { loadShellSharedGroup } = await import('./shell-groups.loader');

    const contents = (await loadShellSharedGroup(ORG))
      .map((i) => i.content)
      .join(' | ');

    expect(contents).toContain(BURIED_SHARED);
  });

  it('caps each group independently, so private cannot squeeze out shared', async () => {
    const { loadShellSharedGroup, loadShellPrivateGroup } = await import(
      './shell-groups.loader'
    );

    const [shared, mine] = await Promise.all([
      loadShellSharedGroup(ORG),
      loadShellPrivateGroup(ORG, ALICE),
    ]);

    expect(shared).toHaveLength(1);
    expect(mine.length).toBeGreaterThan(100);
  });

  it('never returns another user private row in the private group', async () => {
    await db.query(
      `INSERT INTO session_memories
         (id, org_id, agent_id, user_id, memory_type, content, scope)
       VALUES ('eeeeeeee-0000-0000-0000-000000000009',$1,'a',$2,'fact',$3,'private')`,
      [ORG, '99999999-9999-9999-9999-999999999999', 'BOB_ONLY_PP1 not alice'],
    );

    vi.resetModules();
    const fresh = await import('./shell-groups.loader');
    const contents = (await fresh.loadShellPrivateGroup(ORG, ALICE))
      .map((i) => i.content)
      .join(' | ');

    expect(contents).not.toContain('BOB_ONLY_PP1');
    expect(contents).toContain('private row 1');
  });

  it('refuses an empty owner id on the private group', async () => {
    const { loadShellPrivateGroup } = await import('./shell-groups.loader');

    await expect(loadShellPrivateGroup(ORG, '')).rejects.toThrow();
  });

  it('is NOT recoverable by filtering the capped union list', async () => {
    // The bug, demonstrated. This is why the screen uses the dedicated
    // loaders rather than partitioning `loadShellContext` on scope.
    const { loadShellContext } = await import('./shell-context.loader');

    const union = await loadShellContext(ORG, ALICE);
    const sharedFromUnion = union.filter((i) => i.scope === 'org');

    expect(sharedFromUnion).toHaveLength(0);
  });
});

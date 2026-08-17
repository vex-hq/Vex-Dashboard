import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * ADVERSARIAL VISIBILITY TESTS FOR THE SHELL LOADERS.
 *
 * Same discipline as `context/_lib/server/context-visibility.integration.test.ts`
 * and for the same reason: the thing under test is a SQL predicate, so these run
 * against a REAL Postgres (PGlite, in-process — no Docker, no network, no shared
 * database). A mocked `pool.query` would prove the TypeScript mapping and
 * nothing about whether `m.user_id = $2` is in the WHERE clause.
 *
 * `loadShellContext` is the widest read in the product: it returns the UNION of
 * org-scoped rows and the caller's own private rows, which is exactly the shape
 * most likely to leak if a branch is written loosely. Every "another user's
 * private item must not appear" case carries a DISTINCTIVE LITERAL and is paired
 * with a positive control proving the same fixture IS findable by its owner —
 * without the pair, a loader returning nothing to anybody would pass the file
 * while the feature was dead.
 *
 * These tests are required to FAIL under predicate mutation. Verified by
 * removing `AND m.user_id = $2` from the private branch of `shell-context`,
 * `shell-projects` and `shell-stats` in turn.
 */

const db = new PGlite();

vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({
    query: (sql: string, params?: unknown[]) => db.query(sql, params),
  }),
}));

const ORG = 'org-alpha';
const OTHER_ORG = 'org-beta';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

const PROJECT = 'aaaaaaaa-0000-0000-0000-000000000001';
const PROJECT_TWO = 'aaaaaaaa-0000-0000-0000-000000000002';

/** The literals an adversarial assertion greps for. Never reused. */
const ALICE_PRIVATE = 'ALICE_PRIVATE_QW3';
const BOB_PRIVATE = 'BOB_PRIVATE_ZR8';
const OTHER_ORG_LITERAL = 'OTHERORG_MN4';
const SHARED_LITERAL = 'TEAM_SHARED_KP6';
const PROJECT_SCOPED = 'PROJECT_SCOPED_VB2';
const HIDDEN_LITERAL = 'RECALL_HIDDEN_TX9';
const RETRACTED_LITERAL = 'RETRACTED_LM5';
const UNFILED_LITERAL = 'UNFILED_HJ7';

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
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  agent_id varchar,
  source text,
  memory_ids uuid[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE recall_outcomes (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  memory_id uuid NOT NULL,
  used boolean NOT NULL DEFAULT false,
  served_stale boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE memory_proposals (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  status text NOT NULL DEFAULT 'open'
);
`;

let loadShellContext: typeof import('./shell-context.loader').loadShellContext;
let loadShellProjects: typeof import('./shell-projects.loader').loadShellProjects;
let loadShellHomeStats: typeof import('./shell-stats.loader').loadShellHomeStats;
let loadShellNavCounts: typeof import('./shell-stats.loader').loadShellNavCounts;
let loadShellRecallSources: typeof import('./shell-agents.loader').loadShellRecallSources;

let memoryCounter = 0;

async function memory(fields: {
  org?: string;
  user?: string | null;
  scope: string;
  content: string;
  project?: string | null;
  status?: string;
  hidden?: boolean;
  superseded?: boolean;
  kind?: string;
}) {
  memoryCounter += 1;
  const id = `bbbbbbbb-0000-0000-0000-${String(memoryCounter).padStart(12, '0')}`;

  await db.query(
    `INSERT INTO session_memories
       (id, org_id, agent_id, user_id, memory_type, content, scope, status,
        project_id, recall_hidden, superseded_by, created_at)
     VALUES ($1,$2,'agent-1',$3,$4,$5,$6,$7,$8,$9,$10, now() - ($11 || ' minutes')::interval)`,
    [
      id,
      fields.org ?? ORG,
      fields.user ?? null,
      fields.kind ?? 'fact',
      fields.content,
      fields.scope,
      fields.status ?? 'active',
      fields.project ?? null,
      fields.hidden ?? false,
      fields.superseded ? '99999999-0000-0000-0000-000000000000' : null,
      String(memoryCounter),
    ],
  );

  return id;
}

let aliceSharedId = '';

beforeAll(async () => {
  await db.exec(SCHEMA);

  await db.query(
    `INSERT INTO projects (id, org_id, display_name) VALUES ($1,$2,$3), ($4,$5,$6)`,
    [PROJECT, ORG, 'Agent Memory', PROJECT_TWO, ORG, 'hirly'],
  );

  aliceSharedId = await memory({
    user: ALICE,
    scope: 'org',
    content: `${SHARED_LITERAL} the team can read this`,
    project: PROJECT,
  });

  await memory({
    user: ALICE,
    scope: 'private',
    content: `${ALICE_PRIVATE} only Alice`,
    project: PROJECT,
  });

  await memory({
    user: BOB,
    scope: 'private',
    content: `${BOB_PRIVATE} only Bob`,
    project: PROJECT_TWO,
  });

  await memory({
    org: OTHER_ORG,
    user: ALICE,
    scope: 'org',
    content: `${OTHER_ORG_LITERAL} different tenant`,
  });

  await memory({
    user: BOB,
    scope: 'project',
    content: `${PROJECT_SCOPED} project scope`,
    project: PROJECT,
  });

  // An active, visible row with NO project. The hidden and retracted rows
  // below are also project-less, but both are excluded — without this one the
  // "unfiled" assertion would be testing a group that cannot exist.
  await memory({
    user: ALICE,
    scope: 'private',
    content: `${UNFILED_LITERAL} no project`,
    project: null,
  });

  await memory({
    user: ALICE,
    scope: 'private',
    content: `${HIDDEN_LITERAL} hidden from recall`,
    hidden: true,
  });

  await memory({
    user: ALICE,
    scope: 'private',
    content: `${RETRACTED_LITERAL} retracted`,
    status: 'retracted',
  });

  ({ loadShellContext } = await import('./shell-context.loader'));
  ({ loadShellProjects } = await import('./shell-projects.loader'));
  ({ loadShellHomeStats, loadShellNavCounts } =
    await import('./shell-stats.loader'));
  ({ loadShellRecallSources } = await import('./shell-agents.loader'));
});

const contentsFor = async (user: string) =>
  (await loadShellContext(ORG, user)).map((i) => i.content).join(' | ');

describe('loadShellContext — the union read', () => {
  it("never returns another user's private row", async () => {
    const seen = await contentsFor(ALICE);

    expect(seen).not.toContain(BOB_PRIVATE);
  });

  it('shows Bob his own row — the fixture is findable by its owner', async () => {
    // Positive control. Without it, a loader returning nothing to anybody
    // would pass the assertion above while the screen was dead.
    const seen = await contentsFor(BOB);

    expect(seen).toContain(BOB_PRIVATE);
  });

  it("returns the caller's own private rows", async () => {
    expect(await contentsFor(ALICE)).toContain(ALICE_PRIVATE);
  });

  it('returns org-scoped rows to every member', async () => {
    expect(await contentsFor(ALICE)).toContain(SHARED_LITERAL);
    expect(await contentsFor(BOB)).toContain(SHARED_LITERAL);
  });

  it('never crosses the org boundary', async () => {
    expect(await contentsFor(ALICE)).not.toContain(OTHER_ORG_LITERAL);
  });

  it('excludes project-scoped rows, which need a membership check this query does not make', async () => {
    expect(await contentsFor(BOB)).not.toContain(PROJECT_SCOPED);
  });

  it('excludes recall-hidden and non-active rows', async () => {
    const seen = await contentsFor(ALICE);

    expect(seen).not.toContain(HIDDEN_LITERAL);
    expect(seen).not.toContain(RETRACTED_LITERAL);
  });

  it('refuses an empty owner id rather than querying without one', async () => {
    await expect(loadShellContext(ORG, '')).rejects.toThrow();
  });

  it('orders newest first', async () => {
    const rows = await loadShellContext(ORG, ALICE);
    const times = rows.map((r) => new Date(r.createdAt).getTime());

    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('reports scope so the shared badge can render, and marks supersession', async () => {
    const rows = await loadShellContext(ORG, ALICE);
    const shared = rows.find((r) => r.content.includes(SHARED_LITERAL));

    expect(shared?.scope).toBe('org');
    expect(shared?.superseded).toBe(false);
  });

  it('returns zero recalls for an item nobody recalled, rather than dropping it', async () => {
    const rows = await loadShellContext(ORG, ALICE);
    const shared = rows.find((r) => r.content.includes(SHARED_LITERAL));

    expect(shared).toBeDefined();
    expect(shared?.recalls).toBe(0);
    expect(shared?.servedStale).toBe(0);
  });

  it('counts recalls and stale serves for an item that has them', async () => {
    await db.query(
      `INSERT INTO brain_recall_events (id, org_id, agent_id, source, memory_ids)
       VALUES ('cccccccc-0000-0000-0000-000000000001',$1,'a','hook',ARRAY[$2::uuid]),
              ('cccccccc-0000-0000-0000-000000000002',$1,'a','hook',ARRAY[$2::uuid])`,
      [ORG, aliceSharedId],
    );
    await db.query(
      `INSERT INTO recall_outcomes (id, org_id, memory_id, used, served_stale)
       VALUES ('dddddddd-0000-0000-0000-000000000001',$1,$2,true,true)`,
      [ORG, aliceSharedId],
    );

    // cache() memoises per argument tuple, so a fresh import is needed to see
    // rows inserted after the first call in this file.
    vi.resetModules();
    const fresh = await import('./shell-context.loader');
    const rows = await fresh.loadShellContext(ORG, ALICE);
    const shared = rows.find((r) => r.content.includes(SHARED_LITERAL));

    expect(shared?.recalls).toBe(2);
    expect(shared?.servedStale).toBe(1);
  });
});

describe('loadShellProjects', () => {
  it('counts only rows the caller may see', async () => {
    const alice = await loadShellProjects(ORG, ALICE);
    const bob = await loadShellProjects(ORG, BOB);

    const aliceHirly = alice.find((p) => p.name === 'hirly');
    const bobHirly = bob.find((p) => p.name === 'hirly');

    // hirly holds exactly one row: Bob's private one. Alice must not see it
    // counted — a count is a smaller leak than a row, but a leak all the same.
    expect(aliceHirly).toBeUndefined();
    expect(bobHirly?.items).toBe(1);
  });

  it('labels rows with no project as unfiled rather than dropping them', async () => {
    const rows = await loadShellProjects(ORG, ALICE);

    expect(rows.some((p) => p.name === 'unfiled')).toBe(true);
  });

  it('refuses an empty owner id', async () => {
    await expect(loadShellProjects(ORG, '')).rejects.toThrow();
  });
});

describe('loadShellHomeStats', () => {
  it("counts the caller's private rows, never another user's", async () => {
    const alice = await loadShellHomeStats(ORG, ALICE);
    const bob = await loadShellHomeStats(ORG, BOB);

    // Alice: 1 org + 2 private visible (hidden and retracted excluded).
    expect(alice.privateActive).toBe(2);
    expect(bob.privateActive).toBe(1);
  });

  it('counts org-scoped rows the same for everyone', async () => {
    const alice = await loadShellHomeStats(ORG, ALICE);
    const bob = await loadShellHomeStats(ORG, BOB);

    expect(alice.orgActive).toBe(1);
    expect(bob.orgActive).toBe(1);
  });

  it('refuses an empty owner id', async () => {
    await expect(loadShellHomeStats(ORG, '')).rejects.toThrow();
  });
});

describe('loadShellNavCounts', () => {
  it('scopes the context count to the caller', async () => {
    const alice = await loadShellNavCounts(ORG, ALICE);
    const bob = await loadShellNavCounts(ORG, BOB);

    expect(alice.context).toBe(3);
    expect(bob.context).toBe(2);
  });

  it('reports the shared count identically for both', async () => {
    expect((await loadShellNavCounts(ORG, ALICE)).shared).toBe(1);
    expect((await loadShellNavCounts(ORG, BOB)).shared).toBe(1);
  });

  it('returns nulls rather than zeros when there is no signed-in user', async () => {
    // Absent renders as no badge. Zero would be a claim made on a failure.
    expect(await loadShellNavCounts(ORG, '')).toEqual({
      projects: null,
      context: null,
      shared: null,
      proposals: null,
      agents: null,
    });
  });
});

describe('loadShellRecallSources', () => {
  it('groups by source and stays inside the org', async () => {
    vi.resetModules();
    const fresh = await import('./shell-agents.loader');
    const rows = await fresh.loadShellRecallSources(ORG);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.source).toBe('hook');
    expect(rows[0]?.recalls).toBe(2);
  });

  it('maps hook to claude-code, and shows anything else verbatim', async () => {
    const { displayRecallSource } = await import('./shell-agents.loader');

    expect(displayRecallSource('hook')).toBe('claude-code (hooks)');
    expect(displayRecallSource('mcp')).toBe('mcp');
    expect(displayRecallSource('unknown')).toBe('unknown');
  });
});

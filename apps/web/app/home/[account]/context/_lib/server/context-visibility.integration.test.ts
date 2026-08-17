import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * ADVERSARIAL VISIBILITY TESTS FOR THE CONTEXT SURFACES.
 *
 * Same discipline as `memory/_lib/server/memory-visibility.integration.test.ts`
 * and for the same reason: the thing under test is a SQL predicate, so these
 * run against a REAL Postgres (PGlite, in-process — no Docker, no network, no
 * shared database). A mocked `pool.query` would prove the TypeScript mapping
 * and nothing about whether `user_id = $2` is in the WHERE clause.
 *
 * Every "another user's private item must not appear" case carries a
 * DISTINCTIVE LITERAL and is paired with a positive control proving the same
 * fixture IS findable by its owner. Without the pair, a loader returning
 * nothing to anybody — a typo'd scope, a dropped parameter — would pass the
 * whole file while the feature was dead.
 *
 * These tests are required to FAIL under predicate mutation. Verified by hand
 * on 2026-08-17 by removing `AND m.user_id = $2` from
 * `my-private-context.loader` (BOB_PRIVATE_LITERAL then appears in Alice's
 * group) and by widening `shared-context.loader`'s scope predicate to
 * `m.scope = ANY(ARRAY['org','private'])` (both private literals then appear
 * in the org-scoped group).
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

/** The literals an adversarial assertion greps for. Never reused. */
const ALICE_PRIVATE_LITERAL = 'ALICE_PRIVATE_ZQ7';
const BOB_PRIVATE_LITERAL = 'BOB_PRIVATE_XK4';
const OTHER_ORG_LITERAL = 'OTHERORG_SHARED_MN9';
const SHARED_LITERAL = 'TEAM_SHARED_PL2';

const SCHEMA = `
CREATE TABLE projects (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  display_name varchar NOT NULL
);

CREATE TABLE project_members (
  project_id uuid NOT NULL,
  user_id varchar NOT NULL,
  role varchar NOT NULL DEFAULT 'member',
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE session_memories (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  agent_id varchar NOT NULL,
  user_id varchar,
  memory_type varchar NOT NULL,
  content text NOT NULL,
  scope varchar NOT NULL CHECK (scope IN ('private','project','org','session','agent')),
  status varchar NOT NULL DEFAULT 'active',
  project_id uuid,
  metadata jsonb,
  recall_hidden boolean NOT NULL DEFAULT false,
  superseded_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE brain_recall_events (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  agent_id varchar NOT NULL,
  memory_ids uuid[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE recall_outcomes (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  recall_event_id uuid NOT NULL,
  memory_id uuid NOT NULL,
  session_outcome_id uuid,
  used boolean NOT NULL DEFAULT false,
  usage_score numeric,
  served_stale boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE memory_proposals (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  scope text NOT NULL,
  kind text NOT NULL,
  detector text NOT NULL,
  target_memory_id uuid,
  dedup_key text NOT NULL,
  diff text NOT NULL,
  proposed_content text,
  evidence jsonb NOT NULL,
  confidence numeric,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);
`;

let seq = 0;

function nextId(): string {
  seq += 1;

  return `beefcafe-0000-0000-0000-${String(seq).padStart(12, '0')}`;
}

interface SeedMemory {
  org?: string;
  userId?: string | null;
  scope: 'private' | 'project' | 'org';
  content: string;
  projectId?: string | null;
  memoryType?: string;
  status?: string;
  supersededBy?: string | null;
  metadata?: Record<string, unknown>;
}

async function seedMemory(memory: SeedMemory): Promise<string> {
  const id = nextId();

  await db.query(
    `INSERT INTO session_memories
       (id, org_id, agent_id, user_id, memory_type, content, scope, status,
        project_id, metadata, superseded_by)
     VALUES ($1,$2,'host/claude-code',$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,
    [
      id,
      memory.org ?? ORG,
      memory.userId ?? null,
      memory.memoryType ?? 'fact',
      memory.content,
      memory.scope,
      memory.status ?? 'active',
      memory.projectId ?? null,
      JSON.stringify(memory.metadata ?? { source: 'mcp' }),
      memory.supersededBy ?? null,
    ],
  );

  return id;
}

const seeded: Record<string, string> = {};

beforeAll(async () => {
  await db.exec(SCHEMA);

  await db.query(
    `INSERT INTO projects (id, org_id, display_name) VALUES ($1,$2,'alpha-project')`,
    [PROJECT, ORG],
  );
  await db.query(
    `INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,'admin')`,
    [PROJECT, ALICE],
  );

  seeded.alicePrivate = await seedMemory({
    userId: ALICE,
    scope: 'private',
    projectId: PROJECT,
    content: `${ALICE_PRIVATE_LITERAL} my own unshared note`,
  });

  seeded.bobPrivate = await seedMemory({
    userId: BOB,
    scope: 'private',
    content: `${BOB_PRIVATE_LITERAL} salary negotiation notes`,
  });

  seeded.orgShared = await seedMemory({
    userId: ALICE,
    scope: 'org',
    projectId: PROJECT,
    content: `${SHARED_LITERAL} the deploy target is Railway`,
    metadata: { source: 'mcp', shared_by: ALICE, shared_from: 'private' },
  });

  seeded.otherOrgShared = await seedMemory({
    org: OTHER_ORG,
    userId: BOB,
    scope: 'org',
    content: `${OTHER_ORG_LITERAL} another tenant's shared fact`,
  });

  // A retired predecessor and its live replacement, for the chain assertions.
  seeded.replacement = await seedMemory({
    userId: ALICE,
    scope: 'private',
    content: 'CHAIN_HEAD deploys run from GitHub source',
  });
  seeded.predecessor = await seedMemory({
    userId: ALICE,
    scope: 'private',
    content: 'CHAIN_TAIL deploys run from Docker Hub',
    status: 'superseded',
    supersededBy: seeded.replacement,
  });

  // Evidence for `alicePrivate`: two recalls, one used, one served stale.
  const eventA = nextId();
  const eventB = nextId();

  await db.query(
    `INSERT INTO brain_recall_events (id, org_id, agent_id, memory_ids)
     VALUES ($1,$2,'host/claude-code',ARRAY[$3::uuid]),
            ($4,$2,'host/claude-code',ARRAY[$3::uuid])`,
    [eventA, ORG, seeded.alicePrivate, eventB],
  );
  await db.query(
    `INSERT INTO recall_outcomes
       (id, org_id, recall_event_id, memory_id, used, served_stale)
     VALUES ($1,$2,$3,$4,TRUE,FALSE), ($5,$2,$6,$4,FALSE,TRUE)`,
    [nextId(), ORG, eventA, seeded.alicePrivate, nextId(), eventB],
  );

  // A recall of BOB's private item, in the same org. The evidence loader must
  // refuse it for Alice — evidence about a row she cannot read is still a
  // disclosure about that row.
  const eventBob = nextId();
  await db.query(
    `INSERT INTO brain_recall_events (id, org_id, agent_id, memory_ids)
     VALUES ($1,$2,'host/codex',ARRAY[$3::uuid])`,
    [eventBob, ORG, seeded.bobPrivate],
  );

  await db.query(
    `INSERT INTO memory_proposals
       (id, org_id, scope, kind, detector, target_memory_id, dedup_key, diff,
        proposed_content, evidence, confidence, status)
     VALUES
       ($1,$2,'org','retire','stale_serve_cluster',$3,'k1',
        'Retire: the Docker Hub deploy note',NULL,
        '{"prevalence": 14, "detector": "stale_serve_cluster"}'::jsonb,0.86,'open'),
       ($4,$5,'org','retire','stale_serve_cluster',NULL,'k2',
        'OTHERORG_PROPOSAL should never appear',NULL,'{}'::jsonb,NULL,'open'),
       ($6,$2,'org','add','tool_failure',NULL,'k3',
        'Closed proposal, must not be listed','content','{}'::jsonb,NULL,'rejected')`,
    [nextId(), ORG, seeded.predecessor, nextId(), OTHER_ORG, nextId()],
  );
});

describe('loadSharedContext (org scope only)', () => {
  it('returns the org-scoped group and never a private row', async () => {
    const { loadSharedContext } = await import('./shared-context.loader');
    const group = await loadSharedContext(ORG);
    const blob = JSON.stringify(group);

    expect(blob).toContain(SHARED_LITERAL); // positive control
    expect(blob).not.toContain(ALICE_PRIVATE_LITERAL);
    expect(blob).not.toContain(BOB_PRIVATE_LITERAL);
  });

  it('never returns another org’s shared row', async () => {
    const { loadSharedContext } = await import('./shared-context.loader');
    const group = await loadSharedContext(ORG);

    expect(JSON.stringify(group)).not.toContain(OTHER_ORG_LITERAL);
  });

  it('counts only the rows it may read', async () => {
    const { loadSharedContext } = await import('./shared-context.loader');

    expect((await loadSharedContext(ORG)).total).toBe(1);
  });
});

describe('loadMyPrivateContext (private scope, owner only)', () => {
  it('returns the caller’s own private rows and nobody else’s', async () => {
    const { loadMyPrivateContext } = await import(
      './my-private-context.loader'
    );
    const group = await loadMyPrivateContext(ORG, ALICE);
    const blob = JSON.stringify(group);

    expect(blob).toContain(ALICE_PRIVATE_LITERAL); // positive control
    expect(blob).not.toContain(BOB_PRIVATE_LITERAL);
  });

  it('shows Bob his own row — the fixture is findable by its owner', async () => {
    const { loadMyPrivateContext } = await import(
      './my-private-context.loader'
    );

    expect(JSON.stringify(await loadMyPrivateContext(ORG, BOB))).toContain(
      BOB_PRIVATE_LITERAL,
    );
  });

  it('never returns a shared row in the private group', async () => {
    const { loadMyPrivateContext } = await import(
      './my-private-context.loader'
    );

    expect(JSON.stringify(await loadMyPrivateContext(ORG, ALICE))).not.toContain(
      SHARED_LITERAL,
    );
  });

  it('refuses a blank user id rather than running a wildcard query', async () => {
    const { loadMyPrivateContext } = await import(
      './my-private-context.loader'
    );

    await expect(loadMyPrivateContext(ORG, '')).rejects.toThrow(/user id/i);
  });
});

describe('loadContextItemDetail (evidence, ladder-gated)', () => {
  it('returns counted evidence for a row the viewer owns', async () => {
    const { loadContextItemDetail } = await import('./item-evidence.loader');
    const detail = await loadContextItemDetail(ORG, seeded.alicePrivate!, {
      userId: ALICE,
    });

    expect(detail).not.toBeNull();
    expect(detail!.evidence.recalledCount).toBe(2);
    expect(detail!.evidence.usedCount).toBe(1);
    expect(detail!.evidence.servedStaleCount).toBe(1);
    expect(detail!.ownedByViewer).toBe(true);
  });

  it('reports zeroes, not nulls, for a row with no recalls at all', async () => {
    const { loadContextItemDetail } = await import('./item-evidence.loader');
    const detail = await loadContextItemDetail(ORG, seeded.orgShared!, {
      userId: BOB,
    });

    expect(detail).not.toBeNull();
    expect(detail!.evidence).toEqual({
      recalledCount: 0,
      usedCount: 0,
      servedStaleCount: 0,
    });
  });

  it('refuses another user’s private row, evidence included', async () => {
    const { loadContextItemDetail } = await import('./item-evidence.loader');

    expect(
      await loadContextItemDetail(ORG, seeded.bobPrivate!, { userId: ALICE }),
    ).toBeNull();
    // Positive control: Bob can read his own.
    expect(
      await loadContextItemDetail(ORG, seeded.bobPrivate!, { userId: BOB }),
    ).not.toBeNull();
  });

  it('renders the supersession chain as two nodes', async () => {
    const { loadContextItemDetail } = await import('./item-evidence.loader');
    const head = await loadContextItemDetail(ORG, seeded.replacement!, {
      userId: ALICE,
    });
    const tail = await loadContextItemDetail(ORG, seeded.predecessor!, {
      userId: ALICE,
    });

    expect(head!.replaced?.id).toBe(seeded.predecessor);
    expect(head!.replacedBy).toBeNull();
    expect(tail!.replacedBy?.id).toBe(seeded.replacement);
    expect(tail!.replaced).toBeNull();
  });

  it('marks a row this viewer promoted as reversible by them', async () => {
    const { loadContextItemDetail } = await import('./item-evidence.loader');
    const asAlice = await loadContextItemDetail(ORG, seeded.orgShared!, {
      userId: ALICE,
    });
    const asBob = await loadContextItemDetail(ORG, seeded.orgShared!, {
      userId: BOB,
    });

    expect(asAlice!.promotedByViewer).toBe(true);
    expect(asBob!.promotedByViewer).toBe(false);
  });
});

describe('loadOpenProposals', () => {
  it('lists this org’s open proposals with their evidence inline', async () => {
    const { loadOpenProposals } = await import(
      '../../../proposals/_lib/server/proposals.loader'
    );
    const rows = await loadOpenProposals(ORG);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.diff).toContain('Docker Hub');
    expect(rows[0]!.evidence).toMatchObject({ prevalence: 14 });
  });

  it('never lists another org’s proposal, nor a decided one', async () => {
    const { loadOpenProposals } = await import(
      '../../../proposals/_lib/server/proposals.loader'
    );
    const blob = JSON.stringify(await loadOpenProposals(ORG));

    expect(blob).not.toContain('OTHERORG_PROPOSAL');
    expect(blob).not.toContain('must not be listed');
  });
});

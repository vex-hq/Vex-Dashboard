import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * PROPOSAL DECISION TESTS.
 *
 * The concurrency guard is a single status-predicated UPDATE, so it is tested
 * against a real Postgres (PGlite, in-process) — a mocked pool would prove the
 * mapping and nothing about `AND status = 'open'`.
 *
 * Fixtures only. Nothing here touches a production database.
 */

const db = new PGlite();

/**
 * PGlite reports write counts as `affectedRows`; `pg` (what production uses)
 * reports `rowCount`. The guards under test branch on `rowCount`, so the mock
 * translates — without this, `rowCount === 0` is `undefined === 0` and every
 * check-and-set guard silently passes whether or not it matched a row.
 */
vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({
    query: async (sql: string, params?: unknown[]) => {
      const result = await db.query(sql, params);

      return { ...result, rowCount: result.affectedRows ?? result.rows.length };
    },
  }),
}));

const ORG = 'org-alpha';
const OTHER_ORG = 'org-beta';
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const PROJECT = 'aaaaaaaa-0000-0000-0000-000000000001';

const RETIRE = 'f00d0000-0000-0000-0000-000000000001';
const REVISE = 'f00d0000-0000-0000-0000-000000000002';
const ADD = 'f00d0000-0000-0000-0000-000000000003';
const FOREIGN = 'f00d0000-0000-0000-0000-000000000004';
const RETIRE_PRIVATE = 'f00d0000-0000-0000-0000-000000000005';

const TARGET_ORG = 'b0b00000-0000-0000-0000-000000000001';
const TARGET_BOB_PRIVATE = 'b0b00000-0000-0000-0000-000000000002';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY, org_id varchar NOT NULL, display_name varchar NOT NULL
);
CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid NOT NULL, user_id varchar NOT NULL,
  role varchar NOT NULL DEFAULT 'member', PRIMARY KEY (project_id, user_id)
);
CREATE TABLE IF NOT EXISTS session_memories (
  id uuid PRIMARY KEY, org_id varchar NOT NULL, agent_id varchar NOT NULL,
  user_id varchar, memory_type varchar NOT NULL, content text NOT NULL,
  scope varchar NOT NULL, status varchar NOT NULL DEFAULT 'active',
  provenance varchar NOT NULL DEFAULT 'EXTRACTED', project_id uuid,
  metadata jsonb, updated_at timestamptz, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memory_proposals (
  id uuid PRIMARY KEY, org_id varchar NOT NULL, scope text NOT NULL,
  kind text NOT NULL, detector text NOT NULL, target_memory_id uuid,
  dedup_key text NOT NULL, diff text NOT NULL, proposed_content text,
  evidence jsonb NOT NULL, confidence numeric,
  status text NOT NULL DEFAULT 'open', created_at timestamptz DEFAULT now(),
  decided_at timestamptz, decided_by uuid
);
`;

beforeEach(async () => {
  await db.exec(SCHEMA);
  await db.exec(
    `DELETE FROM memory_proposals; DELETE FROM session_memories;
     DELETE FROM project_members; DELETE FROM projects;`,
  );

  await db.query(
    `INSERT INTO projects (id, org_id, display_name) VALUES ($1,$2,'alpha')`,
    [PROJECT, ORG],
  );

  await db.query(
    `INSERT INTO session_memories
       (id, org_id, agent_id, user_id, memory_type, content, scope, metadata)
     VALUES ($1,$3,'host/cc',$4,'fact','deploy from Docker Hub','org','{}'::jsonb),
            ($2,$3,'host/cc',$5,'fact','BOB_PRIVATE_TARGET','private','{}'::jsonb)`,
    [TARGET_ORG, TARGET_BOB_PRIVATE, ORG, ALICE, BOB],
  );

  await db.query(
    `INSERT INTO memory_proposals
       (id, org_id, scope, kind, detector, target_memory_id, dedup_key, diff,
        proposed_content, evidence, status)
     VALUES
       ($1,$6,'org','retire','stale_serve_cluster',$7,'k1','retire it',NULL,'{}'::jsonb,'open'),
       ($2,$6,'org','revise','bad_outcome_memory',$7,'k2','revise it','new text','{}'::jsonb,'open'),
       ($3,$6,'org','add','tool_failure',NULL,'k3','add it','brand new','{}'::jsonb,'open'),
       ($4,$9,'org','retire','stale_serve_cluster',$7,'k4','other org','{}',' {}'::jsonb,'open'),
       ($5,$6,'private','retire','stale_serve_cluster',$8,'k5','retire bob''s',NULL,'{}'::jsonb,'open')`,
    [
      RETIRE,
      REVISE,
      ADD,
      FOREIGN,
      RETIRE_PRIVATE,
      ORG,
      TARGET_ORG,
      TARGET_BOB_PRIVATE,
      OTHER_ORG,
    ],
  );
});

async function statusOf(id: string): Promise<string> {
  const { rows } = await db.query<{ status: string }>(
    `SELECT status FROM memory_proposals WHERE id = $1`,
    [id],
  );

  return rows[0]!.status;
}

async function memoryStatusOf(id: string): Promise<string> {
  const { rows } = await db.query<{ status: string }>(
    `SELECT status FROM session_memories WHERE id = $1`,
    [id],
  );

  return rows[0]!.status;
}

describe('rejectProposal', () => {
  it('closes an open proposal and records who decided it', async () => {
    const { rejectProposal } = await import('./proposal-decisions');

    expect(
      await rejectProposal({
        orgId: ORG,
        proposalId: RETIRE,
        userId: ALICE,
      }),
    ).toEqual({ decided: true, status: 'rejected' });
    expect(await statusOf(RETIRE)).toBe('rejected');

    const { rows } = await db.query<{ decided_by: string }>(
      `SELECT decided_by FROM memory_proposals WHERE id = $1`,
      [RETIRE],
    );

    expect(rows[0]!.decided_by).toBe(ALICE);
  });

  it('refuses a second decision — the claim is check-and-set', async () => {
    const { rejectProposal } = await import('./proposal-decisions');
    await rejectProposal({ orgId: ORG, proposalId: RETIRE, userId: ALICE });

    expect(
      await rejectProposal({ orgId: ORG, proposalId: RETIRE, userId: BOB }),
    ).toEqual({ decided: false, error: 'already_decided' });
  });

  /**
   * THE RACE, not the replay. The sequential "refuses a second decision" case
   * above is caught by the pre-flight status read and would still pass with the
   * `AND status = 'open'` guard deleted from the claim UPDATE. This case is the
   * one that fails without it: both callers read `open` BEFORE either writes,
   * so only the atomic claim can separate them.
   */
  it('lets exactly one of two concurrent deciders win the claim', async () => {
    const { rejectProposal } = await import('./proposal-decisions');

    const [first, second] = await Promise.all([
      rejectProposal({ orgId: ORG, proposalId: RETIRE, userId: ALICE }),
      rejectProposal({ orgId: ORG, proposalId: RETIRE, userId: BOB }),
    ]);

    const outcomes = [first, second].map((r) => r.decided).sort();

    expect(outcomes).toEqual([false, true]);
    expect(await statusOf(RETIRE)).toBe('rejected');
  });

  it('never touches another org’s proposal', async () => {
    const { rejectProposal } = await import('./proposal-decisions');

    expect(
      await rejectProposal({ orgId: ORG, proposalId: FOREIGN, userId: ALICE }),
    ).toEqual({ decided: false, error: 'not_found' });
    expect(await statusOf(FOREIGN)).toBe('open');
  });

  it('refuses an unattributed caller — a decision needs a human', async () => {
    const { rejectProposal } = await import('./proposal-decisions');

    expect(
      await rejectProposal({ orgId: ORG, proposalId: RETIRE, userId: null }),
    ).toEqual({ decided: false, error: 'attribution_required' });
    expect(await statusOf(RETIRE)).toBe('open');
  });
});

describe('approveProposal', () => {
  it('applies a retire by retracting the target memory', async () => {
    const { approveProposal } = await import('./proposal-decisions');

    expect(
      await approveProposal({ orgId: ORG, proposalId: RETIRE, userId: ALICE }),
    ).toEqual({ decided: true, status: 'approved', kind: 'retire' });
    expect(await statusOf(RETIRE)).toBe('approved');
    expect(await memoryStatusOf(TARGET_ORG)).toBe('retracted');
  });

  it('reverts its own claim when the retraction is refused', async () => {
    const { approveProposal } = await import('./proposal-decisions');

    // Bob's private row: Alice may not act on it, so the apply fails and the
    // proposal must go back to `open` rather than sit approved with nothing
    // written.
    expect(
      await approveProposal({
        orgId: ORG,
        proposalId: RETIRE_PRIVATE,
        userId: ALICE,
      }),
    ).toEqual({ decided: false, error: 'not_found' });
    expect(await statusOf(RETIRE_PRIVATE)).toBe('open');
    expect(await memoryStatusOf(TARGET_BOB_PRIVATE)).toBe('active');
  });

  it('refuses a revise without claiming it — the engine owns that write', async () => {
    const { approveProposal } = await import('./proposal-decisions');

    expect(
      await approveProposal({ orgId: ORG, proposalId: REVISE, userId: ALICE }),
    ).toEqual({ decided: false, error: 'engine_required', kind: 'revise' });
    expect(await statusOf(REVISE)).toBe('open');
  });

  it('refuses an add without claiming it', async () => {
    const { approveProposal } = await import('./proposal-decisions');

    expect(
      await approveProposal({ orgId: ORG, proposalId: ADD, userId: ALICE }),
    ).toEqual({ decided: false, error: 'engine_required', kind: 'add' });
    expect(await statusOf(ADD)).toBe('open');
  });

  it('refuses an already-decided proposal', async () => {
    const { approveProposal, rejectProposal } =
      await import('./proposal-decisions');
    await rejectProposal({ orgId: ORG, proposalId: RETIRE, userId: ALICE });

    expect(
      await approveProposal({ orgId: ORG, proposalId: RETIRE, userId: ALICE }),
    ).toEqual({ decided: false, error: 'already_decided' });
    expect(await memoryStatusOf(TARGET_ORG)).toBe('active');
  });

  it('refuses an unattributed caller', async () => {
    const { approveProposal } = await import('./proposal-decisions');

    expect(
      await approveProposal({ orgId: ORG, proposalId: RETIRE, userId: null }),
    ).toEqual({ decided: false, error: 'attribution_required' });
    expect(await statusOf(RETIRE)).toBe('open');
  });

  it('treats a non-uuid id the same as one that was never issued', async () => {
    const { approveProposal } = await import('./proposal-decisions');

    expect(
      await approveProposal({
        orgId: ORG,
        proposalId: 'not-a-uuid',
        userId: ALICE,
      }),
    ).toEqual({ decided: false, error: 'not_found' });
  });
});

import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * PROMOTION / DEMOTION ADVERSARIAL TESTS.
 *
 * Sharing is the one path in the product where something private becomes
 * something a team can read, so its guards are tested against a real Postgres
 * (PGlite, in-process) rather than a mocked pool — the guards ARE SQL.
 *
 * Fixtures only. No production database is touched by this file or by anything
 * it exercises.
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
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const PROJECT = 'aaaaaaaa-0000-0000-0000-000000000001';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  display_name varchar NOT NULL
);
CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid NOT NULL,
  user_id varchar NOT NULL,
  role varchar NOT NULL DEFAULT 'member',
  PRIMARY KEY (project_id, user_id)
);
CREATE TABLE IF NOT EXISTS session_memories (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  agent_id varchar NOT NULL,
  user_id varchar,
  memory_type varchar NOT NULL,
  content text NOT NULL,
  scope varchar NOT NULL,
  status varchar NOT NULL DEFAULT 'active',
  provenance varchar NOT NULL DEFAULT 'EXTRACTED',
  project_id uuid,
  metadata jsonb,
  updated_at timestamptz,
  created_at timestamptz DEFAULT now()
);
`;

const MINE = 'cafed00d-0000-0000-0000-000000000001';
const BOBS = 'cafed00d-0000-0000-0000-000000000002';
const INFERRED = 'cafed00d-0000-0000-0000-000000000003';
const UNFILED = 'cafed00d-0000-0000-0000-000000000004';

beforeEach(async () => {
  await db.exec(SCHEMA);
  await db.exec(
    `DELETE FROM session_memories; DELETE FROM project_members; DELETE FROM projects;`,
  );

  await db.query(
    `INSERT INTO projects (id, org_id, display_name) VALUES ($1,$2,'alpha')`,
    [PROJECT, ORG],
  );
  await db.query(
    `INSERT INTO project_members (project_id, user_id) VALUES ($1,$2)`,
    [PROJECT, ALICE],
  );

  await db.query(
    `INSERT INTO session_memories
       (id, org_id, agent_id, user_id, memory_type, content, scope, provenance,
        project_id, metadata)
     VALUES
       ($1,$5,'host/cc',$6,'fact','ALICE_ITEM','private','EXTRACTED',$8,'{}'::jsonb),
       ($2,$5,'host/cc',$7,'fact','BOB_ITEM','private','EXTRACTED',NULL,'{}'::jsonb),
       ($3,$5,'host/cc',$6,'fact','ALICE_INFERRED','private','INFERRED',$8,'{}'::jsonb),
       ($4,$5,'host/cc',$6,'fact','ALICE_UNFILED','private','EXTRACTED',NULL,'{}'::jsonb)`,
    [MINE, BOBS, INFERRED, UNFILED, ORG, ALICE, BOB, PROJECT],
  );
});

async function scopeOf(id: string): Promise<string> {
  const { rows } = await db.query<{ scope: string }>(
    `SELECT scope FROM session_memories WHERE id = $1`,
    [id],
  );

  return rows[0]!.scope;
}

describe('promoteMemory', () => {
  it('promotes the caller’s own private row to org', async () => {
    const { promoteMemory } = await import('./memory-promotion');
    const result = await promoteMemory({
      orgId: ORG,
      memoryId: MINE,
      userId: ALICE,
      to: 'org',
    });

    expect(result).toMatchObject({ shared: true, scope: 'org' });
    expect(await scopeOf(MINE)).toBe('org');
  });

  it('refuses somebody else’s row with not_found, never forbidden', async () => {
    const { promoteMemory } = await import('./memory-promotion');
    const result = await promoteMemory({
      orgId: ORG,
      memoryId: BOBS,
      userId: ALICE,
      to: 'org',
    });

    expect(result).toEqual({ shared: false, error: 'not_found' });
    expect(await scopeOf(BOBS)).toBe('private');
  });

  it('refuses an unattributed caller', async () => {
    const { promoteMemory } = await import('./memory-promotion');

    expect(
      await promoteMemory({
        orgId: ORG,
        memoryId: MINE,
        userId: null,
        to: 'org',
      }),
    ).toEqual({ shared: false, error: 'not_found' });
    expect(await scopeOf(MINE)).toBe('private');
  });

  it('refuses a second promotion rather than silently downgrading scope', async () => {
    const { promoteMemory } = await import('./memory-promotion');
    await promoteMemory({
      orgId: ORG,
      memoryId: MINE,
      userId: ALICE,
      to: 'project',
    });
    const again = await promoteMemory({
      orgId: ORG,
      memoryId: MINE,
      userId: ALICE,
      to: 'org',
    });

    expect(again).toMatchObject({ shared: false, error: 'already_shared' });
    expect(await scopeOf(MINE)).toBe('project');
  });

  it('refuses to share to a project when the row is unfiled', async () => {
    const { promoteMemory } = await import('./memory-promotion');

    expect(
      await promoteMemory({
        orgId: ORG,
        memoryId: UNFILED,
        userId: ALICE,
        to: 'project',
      }),
    ).toEqual({ shared: false, error: 'no_project' });
  });

  it('refuses a project the caller is not a member of', async () => {
    const { promoteMemory } = await import('./memory-promotion');
    await db.query(`DELETE FROM project_members WHERE user_id = $1`, [ALICE]);

    expect(
      await promoteMemory({
        orgId: ORG,
        memoryId: MINE,
        userId: ALICE,
        to: 'project',
      }),
    ).toEqual({ shared: false, error: 'not_a_member' });
    expect(await scopeOf(MINE)).toBe('private');
  });

  it('refuses a scope that is not org or project', async () => {
    const { promoteMemory } = await import('./memory-promotion');

    expect(
      await promoteMemory({
        orgId: ORG,
        memoryId: MINE,
        userId: ALICE,
        to: 'agent' as 'org',
      }),
    ).toEqual({ shared: false, error: 'unsupported_scope' });
  });

  it('does not launder INFERRED provenance into EXTRACTED', async () => {
    const { promoteMemory } = await import('./memory-promotion');
    await promoteMemory({
      orgId: ORG,
      memoryId: INFERRED,
      userId: ALICE,
      to: 'org',
    });

    const { rows } = await db.query<{ provenance: string }>(
      `SELECT provenance FROM session_memories WHERE id = $1`,
      [INFERRED],
    );

    expect(rows[0]!.provenance).toBe('INFERRED');
  });

  it('records who shared it, when, and that it came from private', async () => {
    const { promoteMemory } = await import('./memory-promotion');
    await promoteMemory({
      orgId: ORG,
      memoryId: MINE,
      userId: ALICE,
      to: 'org',
    });

    const { rows } = await db.query<{ metadata: Record<string, string> }>(
      `SELECT metadata FROM session_memories WHERE id = $1`,
      [MINE],
    );

    expect(rows[0]!.metadata).toMatchObject({
      shared_by: ALICE,
      shared_from: 'private',
      shared_via: 'dashboard',
    });
  });
});

describe('demoteMemory (the reverse of a share)', () => {
  it('pulls back a row this caller promoted', async () => {
    const { demoteMemory, promoteMemory } = await import('./memory-promotion');
    await promoteMemory({
      orgId: ORG,
      memoryId: MINE,
      userId: ALICE,
      to: 'org',
    });

    expect(
      await demoteMemory({ orgId: ORG, memoryId: MINE, userId: ALICE }),
    ).toMatchObject({ shared: false, scope: 'private', reversed: true });
    expect(await scopeOf(MINE)).toBe('private');
  });

  it('refuses to pull back a share somebody else made', async () => {
    const { demoteMemory, promoteMemory } = await import('./memory-promotion');
    await promoteMemory({
      orgId: ORG,
      memoryId: BOBS,
      userId: BOB,
      to: 'org',
    });

    expect(
      await demoteMemory({ orgId: ORG, memoryId: BOBS, userId: ALICE }),
    ).toEqual({ reversed: false, error: 'not_found' });
    expect(await scopeOf(BOBS)).toBe('org');
  });

  it('refuses a row that was never promoted through this path', async () => {
    const { demoteMemory } = await import('./memory-promotion');
    await db.query(
      `UPDATE session_memories SET scope = 'org', metadata = '{}'::jsonb WHERE id = $1`,
      [MINE],
    );

    expect(
      await demoteMemory({ orgId: ORG, memoryId: MINE, userId: ALICE }),
    ).toEqual({ reversed: false, error: 'not_shared_by_you' });
    expect(await scopeOf(MINE)).toBe('org');
  });
});

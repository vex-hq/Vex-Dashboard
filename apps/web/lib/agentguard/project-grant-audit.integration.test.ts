import { PGlite } from '@electric-sql/pglite';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

/**
 * ACL AUDIT TESTS.
 *
 * These run against a REAL Postgres (PGlite, in-process) rather than a mocked
 * `pool.query`, for the same reason the memory visibility tests do: the things
 * under test are a transaction boundary and two CHECK constraints. A mock that
 * records the SQL it was handed would pass just as happily against code that
 * wrote the audit row on a second connection, or wrote a revoke as a grant.
 *
 * The schema below mirrors the live one after engine migrations 032 and 033 —
 * including `role`'s CHECK, which this change is explicitly not allowed to
 * weaken, and `action`'s, which 033 adds.
 */

const db = new PGlite();

/**
 * PGlite reports statement effects as `affectedRows`; `pg` calls the same
 * number `rowCount`, and the code under test branches on it. Translating here
 * — rather than making the production code accept either — keeps the harness
 * faithful to the driver the app actually runs on.
 */
async function query<T>(sql: string, params?: unknown[]) {
  const result = await db.query<T>(sql, params);

  return { ...result, rowCount: result.affectedRows ?? result.rows.length };
}

vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({
    query,
    connect: async () => ({
      query,
      release: () => undefined,
    }),
  }),
}));

const ORG = 'org-alpha';
const OTHER_ORG = 'org-beta';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

const PROJECT = 'aaaaaaaa-0000-0000-0000-000000000001';
const OTHER_ORG_PROJECT = 'aaaaaaaa-0000-0000-0000-000000000002';

const SCHEMA = `
CREATE TABLE projects (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  display_name varchar NOT NULL,
  git_remote text,
  repo_root_path text,
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz
);

CREATE TABLE project_members (
  project_id uuid NOT NULL,
  user_id varchar NOT NULL,
  role varchar NOT NULL DEFAULT 'member',
  granted_by varchar,
  granted_at timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE project_grant_audit (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  project_id uuid NOT NULL,
  granted_to varchar NOT NULL,
  granted_to_email varchar,
  granted_by varchar,
  role varchar NOT NULL
    CONSTRAINT ck_project_grant_audit_role CHECK (role IN ('member','admin')),
  surface varchar NOT NULL,
  action varchar NOT NULL DEFAULT 'grant'
    CONSTRAINT ck_project_grant_audit_action CHECK (action IN ('grant','revoke')),
  granted_at timestamptz NOT NULL DEFAULT now()
);
`;

interface AuditRow {
  org_id: string;
  project_id: string;
  granted_to: string;
  granted_to_email: string | null;
  granted_by: string | null;
  role: string;
  surface: string;
  action: string;
}

async function auditRows(): Promise<AuditRow[]> {
  const result = await db.query<AuditRow>(
    `SELECT org_id, project_id, granted_to, granted_to_email, granted_by,
            role, surface, action
     FROM project_grant_audit
     ORDER BY granted_at ASC, action ASC`,
  );

  return result.rows;
}

async function memberRoles(): Promise<
  Array<{ user_id: string; role: string }>
> {
  const result = await db.query<{ user_id: string; role: string }>(
    `SELECT user_id, role FROM project_members ORDER BY user_id`,
  );

  return result.rows;
}

beforeAll(async () => {
  await db.exec(SCHEMA);
});

beforeEach(async () => {
  await db.exec(`
    DELETE FROM project_grant_audit;
    DELETE FROM project_members;
    DELETE FROM projects;
  `);

  await db.query(
    `INSERT INTO projects (id, org_id, display_name)
     VALUES ($1, $2, 'alice-project'), ($3, $4, 'other-tenant-project')`,
    [PROJECT, ORG, OTHER_ORG_PROJECT, OTHER_ORG],
  );
});

afterAll(async () => {
  await db.close();
});

describe('grants are recorded durably, not only in the log', () => {
  it('writes exactly one audit row per grant, on the dashboard surface', async () => {
    const { grantProjectMember } = await import('./projects');

    const granted = await grantProjectMember({
      orgId: ORG,
      projectId: PROJECT,
      userId: BOB,
      userEmail: 'bob@oppla.ai',
      role: 'member',
      grantedByUserId: ALICE,
    });

    expect(granted).toBe(true);
    expect(await auditRows()).toEqual([
      {
        org_id: ORG,
        project_id: PROJECT,
        granted_to: BOB,
        granted_to_email: 'bob@oppla.ai',
        granted_by: ALICE,
        role: 'member',
        surface: 'dashboard',
        action: 'grant',
      },
    ]);
  });

  it('records a re-grant as a new row rather than editing the old one', async () => {
    const { grantProjectMember } = await import('./projects');

    for (const role of ['member', 'admin'] as const) {
      await grantProjectMember({
        orgId: ORG,
        projectId: PROJECT,
        userId: BOB,
        userEmail: 'bob@oppla.ai',
        role,
        grantedByUserId: ALICE,
      });
    }

    // The table is append-only: the promotion must not overwrite the history
    // of Bob having once been a plain member.
    const rows = await auditRows();

    expect(rows.map((row) => row.role)).toEqual(['member', 'admin']);
    expect(await memberRoles()).toEqual([{ user_id: BOB, role: 'admin' }]);
  });

  it('records an unattributable grant rather than dropping it', async () => {
    const { grantProjectMember } = await import('./projects');

    await grantProjectMember({
      orgId: ORG,
      projectId: PROJECT,
      userId: BOB,
      userEmail: null,
      role: 'member',
      grantedByUserId: null,
    });

    const [row] = await auditRows();

    // "We do not know who did this" is worth recording; a NOT NULL granted_by
    // would have forced the row to be discarded instead.
    expect(row?.granted_by).toBeNull();
    expect(row?.granted_to_email).toBeNull();
  });

  it('records the admin grant that project creation performs', async () => {
    const { createProject } = await import('./projects');

    const project = await createProject({
      orgId: ORG,
      displayName: 'new-project',
      gitRemote: null,
      repoRootPath: null,
      createdByUserId: ALICE,
      createdByEmail: 'alice@oppla.ai',
    });

    expect(project.created_by).toBe(ALICE);
    expect(await auditRows()).toEqual([
      {
        org_id: ORG,
        project_id: project.id,
        granted_to: ALICE,
        granted_to_email: 'alice@oppla.ai',
        granted_by: ALICE,
        role: 'admin',
        surface: 'dashboard',
        action: 'grant',
      },
    ]);
  });
});

describe('revokes are recorded too — an untraced revoke is an invisible access change', () => {
  it('writes a revoke row carrying the role the member actually held', async () => {
    const { grantProjectMember, revokeProjectMember } =
      await import('./projects');

    await grantProjectMember({
      orgId: ORG,
      projectId: PROJECT,
      userId: BOB,
      userEmail: 'bob@oppla.ai',
      role: 'admin',
      grantedByUserId: ALICE,
    });

    const revoked = await revokeProjectMember({
      orgId: ORG,
      projectId: PROJECT,
      userId: BOB,
      userEmail: 'bob@oppla.ai',
      revokedByUserId: ALICE,
    });

    expect(revoked).toBe(true);
    expect(await memberRoles()).toEqual([]);

    const rows = await auditRows();

    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({
      org_id: ORG,
      project_id: PROJECT,
      granted_to: BOB,
      granted_to_email: 'bob@oppla.ai',
      granted_by: ALICE,
      // 'admin', not the default 'member': the row says what was actually
      // lost. Anything else would misdescribe the event while satisfying the
      // constraint.
      role: 'admin',
      surface: 'dashboard',
      action: 'revoke',
    });
  });

  it('is distinguishable from a grant of the same role to the same person', async () => {
    const { grantProjectMember, revokeProjectMember } =
      await import('./projects');

    await grantProjectMember({
      orgId: ORG,
      projectId: PROJECT,
      userId: BOB,
      userEmail: 'bob@oppla.ai',
      role: 'member',
      grantedByUserId: ALICE,
    });
    await revokeProjectMember({
      orgId: ORG,
      projectId: PROJECT,
      userId: BOB,
      userEmail: 'bob@oppla.ai',
      revokedByUserId: ALICE,
    });

    const rows = await auditRows();

    // Without `action` these two rows would be byte-identical, and the
    // reconstructed history would show Bob being granted access twice.
    expect(rows.map((row) => row.action)).toEqual(['grant', 'revoke']);
  });

  it('writes nothing when there was no membership to revoke', async () => {
    const { revokeProjectMember } = await import('./projects');

    const revoked = await revokeProjectMember({
      orgId: ORG,
      projectId: PROJECT,
      userId: BOB,
      userEmail: null,
      revokedByUserId: ALICE,
    });

    expect(revoked).toBe(false);
    expect(await auditRows()).toEqual([]);
  });
});

describe('the audit row and the membership change share one transaction', () => {
  it('rolls the grant back when the audit row cannot be written', async () => {
    const { grantProjectMember } = await import('./projects');

    // Force the audit INSERT to fail. This stands in for a constraint
    // violation, a disk-full, a table that has not been migrated yet — any
    // reason the record cannot be made.
    await db.exec(
      `ALTER TABLE project_grant_audit
         ADD CONSTRAINT tmp_reject_everything CHECK (surface = 'impossible')`,
    );

    try {
      await expect(
        grantProjectMember({
          orgId: ORG,
          projectId: PROJECT,
          userId: BOB,
          userEmail: 'bob@oppla.ai',
          role: 'member',
          grantedByUserId: ALICE,
        }),
      ).rejects.toThrow();

      // THE POINT: a grant whose audit row failed did not happen. If these
      // were two transactions, Bob would be a member with no record of how.
      expect(await memberRoles()).toEqual([]);
      expect(await auditRows()).toEqual([]);
    } finally {
      await db.exec(
        `ALTER TABLE project_grant_audit DROP CONSTRAINT tmp_reject_everything`,
      );
    }
  });

  it('rolls the revoke back when the audit row cannot be written', async () => {
    const { grantProjectMember, revokeProjectMember } =
      await import('./projects');

    await grantProjectMember({
      orgId: ORG,
      projectId: PROJECT,
      userId: BOB,
      userEmail: 'bob@oppla.ai',
      role: 'member',
      grantedByUserId: ALICE,
    });

    await db.exec(
      `ALTER TABLE project_grant_audit
         ADD CONSTRAINT tmp_reject_everything CHECK (action = 'impossible')
         NOT VALID`,
    );

    try {
      await expect(
        revokeProjectMember({
          orgId: ORG,
          projectId: PROJECT,
          userId: BOB,
          userEmail: 'bob@oppla.ai',
          revokedByUserId: ALICE,
        }),
      ).rejects.toThrow();

      // The membership survives. An access change that cannot be recorded is
      // an access change the dashboard does not make.
      expect(await memberRoles()).toEqual([{ user_id: BOB, role: 'member' }]);
    } finally {
      await db.exec(
        `ALTER TABLE project_grant_audit DROP CONSTRAINT tmp_reject_everything`,
      );
    }
  });
});

describe('a cross-tenant grant changes nothing and records nothing', () => {
  it('refuses a project id belonging to another org', async () => {
    const { grantProjectMember } = await import('./projects');

    const granted = await grantProjectMember({
      orgId: ORG,
      projectId: OTHER_ORG_PROJECT,
      userId: BOB,
      userEmail: 'bob@oppla.ai',
      role: 'admin',
      grantedByUserId: ALICE,
    });

    expect(granted).toBe(false);
    expect(await memberRoles()).toEqual([]);
    // No membership was created, so there is nothing to audit — and an audit
    // row for a grant that did not happen would be a false record.
    expect(await auditRows()).toEqual([]);
  });
});

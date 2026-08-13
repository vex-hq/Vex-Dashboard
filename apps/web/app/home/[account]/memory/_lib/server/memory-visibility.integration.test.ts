import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * ADVERSARIAL CROSS-USER TESTS.
 *
 * These run against a REAL Postgres (PGlite, in-process — no Docker, no
 * network, no shared database) rather than a mocked `pool.query`. That matters:
 * the thing under test is a SQL predicate. A mock that returns whatever rows
 * the test queued proves the TypeScript mapping and nothing about whether
 * `user_id = $2` is actually in the WHERE clause — it would pass just as
 * happily against a loader that read everybody's private memories.
 *
 * Every "user B cannot see user A" case is paired with a positive control
 * proving A CAN see their own. Without the pair, a loader that returned
 * nothing to anyone — a typo'd scope, a broken join, a dropped parameter —
 * would pass the whole suite while the feature was entirely dead.
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
const ADMIN = '33333333-3333-3333-3333-333333333333';

const PROJECT_ALICE = 'aaaaaaaa-0000-0000-0000-000000000001';
const PROJECT_ORPHAN = 'aaaaaaaa-0000-0000-0000-000000000002';

/**
 * The columns these loaders touch, mirroring the live schema after migration
 * 031: `user_id` nullable, `provenance` NOT NULL and CHECK-constrained, `scope`
 * CHECK-constrained to the five legal values.
 */
const SCHEMA = `
CREATE TABLE spaces (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  name varchar NOT NULL,
  slug varchar NOT NULL
);

CREATE TABLE projects (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  space_id uuid,
  git_remote text,
  repo_root_path text,
  display_name varchar NOT NULL,
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

CREATE TABLE artifacts (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  title varchar NOT NULL,
  summary text,
  kind varchar,
  mime_type varchar,
  size_bytes bigint,
  status varchar NOT NULL DEFAULT 'active'
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
  provenance varchar NOT NULL DEFAULT 'EXTRACTED'
    CHECK (provenance IN ('EXTRACTED','INFERRED','AMBIGUOUS')),
  space_id uuid,
  project_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
`;

let seq = 0;

function nextId(): string {
  seq += 1;

  return `deadbeef-0000-0000-0000-${String(seq).padStart(12, '0')}`;
}

interface SeedMemory {
  org?: string;
  userId?: string | null;
  scope: 'private' | 'project' | 'org' | 'session' | 'agent';
  content: string;
  projectId?: string | null;
  provenance?: 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';
  memoryType?: string;
  artifactId?: string | null;
  status?: string;
}

async function seedMemory(memory: SeedMemory): Promise<string> {
  const id = nextId();

  await db.query(
    `INSERT INTO session_memories
       (id, org_id, agent_id, user_id, memory_type, content, scope, status,
        provenance, project_id, metadata)
     VALUES ($1,$2,'host/claude-code',$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
    [
      id,
      memory.org ?? ORG,
      memory.userId ?? null,
      memory.memoryType ?? 'fact',
      memory.content,
      memory.scope,
      memory.status ?? 'active',
      memory.provenance ?? 'EXTRACTED',
      memory.projectId ?? null,
      JSON.stringify(
        memory.artifactId
          ? { source: 'mcp', artifact_id: memory.artifactId }
          : { source: 'mcp' },
      ),
    ],
  );

  return id;
}

async function seedArtifact(title: string, org = ORG): Promise<string> {
  const id = nextId();

  await db.query(
    `INSERT INTO artifacts (id, org_id, title, summary, kind, mime_type, size_bytes)
     VALUES ($1,$2,$3,'summary','document','text/plain',69)`,
    [id, org, title],
  );

  return id;
}

const seeded: Record<string, string> = {};

beforeAll(async () => {
  await db.exec(SCHEMA);

  await db.query(
    `INSERT INTO projects (id, org_id, display_name, repo_root_path)
     VALUES ($1,$2,'alice-project','/repo/alice'), ($3,$2,'orphan-project','/repo/orphan')`,
    [PROJECT_ALICE, ORG, PROJECT_ORPHAN],
  );

  // Alice is the only member of alice-project. orphan-project has NO members,
  // so it exists but is invisible to every non-admin.
  await db.query(
    `INSERT INTO project_members (project_id, user_id, role, granted_by)
     VALUES ($1,$2,'admin',$2)`,
    [PROJECT_ALICE, ALICE],
  );

  const aliceArtifact = await seedArtifact('alice-private-artifact');
  const projectArtifact = await seedArtifact('alice-project-artifact');
  const orgArtifact = await seedArtifact('org-artifact');

  seeded.alicePrivate = await seedMemory({
    userId: ALICE,
    scope: 'private',
    content: 'ALICE_SECRET therapy appointment on Thursday',
  });

  seeded.alicePrivateInferred = await seedMemory({
    userId: ALICE,
    scope: 'private',
    content: 'ALICE_SECRET prefers to work late',
    provenance: 'INFERRED',
  });

  seeded.bobPrivate = await seedMemory({
    userId: BOB,
    scope: 'private',
    content: 'BOB_SECRET salary negotiation notes',
  });

  seeded.adminPrivate = await seedMemory({
    userId: ADMIN,
    scope: 'private',
    content: 'ADMIN_SECRET my own private note',
  });

  seeded.alicePrivateArtifact = await seedMemory({
    userId: ALICE,
    scope: 'private',
    content: '[artifact] ALICE_SECRET design doc',
    memoryType: 'artifact',
    artifactId: aliceArtifact,
  });

  seeded.projectMemory = await seedMemory({
    userId: ALICE,
    scope: 'project',
    projectId: PROJECT_ALICE,
    content: 'PROJECT_FACT the deploy target is Fly',
  });

  seeded.projectArtifact = await seedMemory({
    userId: ALICE,
    scope: 'project',
    projectId: PROJECT_ALICE,
    content: '[artifact] PROJECT_FACT architecture',
    memoryType: 'artifact',
    artifactId: projectArtifact,
  });

  seeded.orphanProjectMemory = await seedMemory({
    userId: ALICE,
    scope: 'project',
    projectId: PROJECT_ORPHAN,
    content: 'ORPHAN_FACT nobody is a member of this project',
  });

  seeded.orgMemory = await seedMemory({
    scope: 'org',
    content: 'ORG_FACT the team ships on Fridays',
  });

  seeded.orgArtifact = await seedMemory({
    scope: 'org',
    content: '[artifact] ORG_FACT runbook',
    memoryType: 'artifact',
    artifactId: orgArtifact,
  });

  // A pre-031 row: org-scoped, project_id set, user_id NULL. Decision 6 says
  // it stays readable by the whole org — and it must never be mistaken for
  // somebody's private memory, nor hidden because it carries a project id.
  seeded.legacyRow = await seedMemory({
    scope: 'org',
    userId: null,
    projectId: PROJECT_ALICE,
    content: 'LEGACY_FACT written before the user silo existed',
  });

  // Another tenant, same-shaped data.
  seeded.otherOrgPrivate = await seedMemory({
    org: OTHER_ORG,
    userId: ALICE,
    scope: 'private',
    content: 'OTHER_ORG_SECRET alice in a different tenant',
  });
});

afterAll(async () => {
  await db.close();
});

function contents(rows: Array<{ content: string }>): string[] {
  return rows.map((row) => row.content);
}

describe('Mine tab — scope=private is readable only by its owner', () => {
  it('does not return Alice’s private memories to Bob', async () => {
    const { loadMyPrivateMemories } = await import('./private-memory.loader');

    const result = await loadMyPrivateMemories(ORG, BOB);

    expect(contents(result.rows).join(' ')).not.toContain('ALICE_SECRET');
    expect(contents(result.rows)).toEqual([
      'BOB_SECRET salary negotiation notes',
    ]);
  });

  it('POSITIVE CONTROL: returns Alice’s own private memories to Alice', async () => {
    const { loadMyPrivateMemories } = await import('./private-memory.loader');

    const result = await loadMyPrivateMemories(ORG, ALICE);

    // Proves the suite is testing a live query: if the loader returned nothing
    // to everybody, every negative test above would still pass.
    expect(contents(result.rows).join(' ')).toContain('ALICE_SECRET');
    expect(result.rows).toHaveLength(3);
    expect(contents(result.rows).join(' ')).not.toContain('BOB_SECRET');
  });

  it('gives an ORG ADMIN nothing but their own private memories', async () => {
    const { loadMyPrivateMemories } = await import('./private-memory.loader');

    // The admin is asking as themselves — the only way this loader can be
    // called. There is no admin parameter to widen it, by design.
    const result = await loadMyPrivateMemories(ORG, ADMIN);

    expect(contents(result.rows)).toEqual(['ADMIN_SECRET my own private note']);
    expect(contents(result.rows).join(' ')).not.toContain('ALICE_SECRET');
    expect(contents(result.rows).join(' ')).not.toContain('BOB_SECRET');
  });

  it('never returns legacy rows whose user_id is NULL', async () => {
    const { loadMyPrivateMemories } = await import('./private-memory.loader');

    // `user_id = $2` is never true for NULL, so unattributed pre-031 rows
    // cannot fall into anybody's private view.
    const alice = await loadMyPrivateMemories(ORG, ALICE);
    const bob = await loadMyPrivateMemories(ORG, BOB);

    expect(
      [...contents(alice.rows), ...contents(bob.rows)].join(' '),
    ).not.toContain('LEGACY_FACT');
  });

  it('does not cross the org boundary for the same user id', async () => {
    const { loadMyPrivateMemories } = await import('./private-memory.loader');

    const result = await loadMyPrivateMemories(ORG, ALICE);

    expect(contents(result.rows).join(' ')).not.toContain('OTHER_ORG_SECRET');
  });

  it('refuses a blank user id instead of matching everything', async () => {
    const { loadMyPrivateMemories, loadMyPrivateSummary } =
      await import('./private-memory.loader');

    await expect(loadMyPrivateMemories(ORG, '')).rejects.toThrow(
      /non-blank user id/,
    );
    await expect(loadMyPrivateSummary(ORG, '   ')).rejects.toThrow(
      /non-blank user id/,
    );
  });

  it('scopes the private summary counts to the caller', async () => {
    const { loadMyPrivateSummary } = await import('./private-memory.loader');

    const alice = await loadMyPrivateSummary(ORG, ALICE);
    const bob = await loadMyPrivateSummary(ORG, BOB);

    expect(alice.total).toBe(3);
    expect(alice.inferred).toBe(1);
    expect(alice.artifacts).toBe(1);
    expect(bob.total).toBe(1);
  });

  it('keeps private artifacts private, and shows the owner their own', async () => {
    const { loadMyPrivateArtifacts } = await import('./private-memory.loader');

    const bob = await loadMyPrivateArtifacts(ORG, BOB);
    const alice = await loadMyPrivateArtifacts(ORG, ALICE);

    expect(bob).toHaveLength(0);
    expect(alice.map((artifact) => artifact.title)).toEqual([
      'alice-private-artifact',
    ]);
  });
});

describe('Team tab — scope=org only', () => {
  it('never leaks a private or project row into the shared brain', async () => {
    const { loadTeamMemories } = await import('./team-memory.loader');

    const result = await loadTeamMemories(ORG);
    const joined = contents(result.rows).join(' ');

    expect(joined).not.toContain('ALICE_SECRET');
    expect(joined).not.toContain('BOB_SECRET');
    expect(joined).not.toContain('PROJECT_FACT');
    expect(joined).not.toContain('ORPHAN_FACT');
  });

  it('POSITIVE CONTROL: returns the org rows, including legacy project-tagged ones', async () => {
    const { loadTeamMemories } = await import('./team-memory.loader');

    const result = await loadTeamMemories(ORG);
    const joined = contents(result.rows).join(' ');

    expect(joined).toContain('ORG_FACT the team ships on Fridays');

    // The predicate is `scope`, never the presence of `project_id`: a legacy
    // org row carrying a project id stays readable by the whole org.
    expect(joined).toContain('LEGACY_FACT');
  });

  it('returns only org-scoped artifacts', async () => {
    const { loadTeamArtifacts } = await import('./team-memory.loader');

    const artifacts = await loadTeamArtifacts(ORG);

    expect(artifacts.map((artifact) => artifact.title)).toEqual([
      'org-artifact',
    ]);
  });
});

describe('Projects tab — scope=project is gated by project_members, no admin bypass (2026-08-12 ruling)', () => {
  it('returns nothing to a non-member asking for a project’s memories', async () => {
    const { loadProjectMemories } = await import('./project-memory.loader');

    const result = await loadProjectMemories(ORG, PROJECT_ALICE, BOB);

    expect(result.rows).toHaveLength(0);
  });

  it('POSITIVE CONTROL: returns them to a member', async () => {
    const { loadProjectMemories } = await import('./project-memory.loader');

    const result = await loadProjectMemories(ORG, PROJECT_ALICE, ALICE);

    expect(contents(result.rows).join(' ')).toContain('PROJECT_FACT');
  });

  it('does NOT let an org admin read a project they are not a member of (inverted 2026-08-12: membership is the only gate)', async () => {
    const { loadProjectMemories } = await import('./project-memory.loader');

    const result = await loadProjectMemories(ORG, PROJECT_ORPHAN, ADMIN);

    expect(contents(result.rows).join(' ')).not.toContain('ORPHAN_FACT');
    expect(result.rows).toHaveLength(0);
  });

  it('lists only the caller’s projects — an org admin with no membership row anywhere sees an empty list, same as any other non-member (inverted)', async () => {
    const { loadVisibleProjects } = await import('./project-memory.loader');

    const asAlice = await loadVisibleProjects(ORG, ALICE);
    const asBob = await loadVisibleProjects(ORG, BOB);
    const asAdmin = await loadVisibleProjects(ORG, ADMIN);

    expect(asAlice.map((project) => project.display_name)).toEqual([
      'alice-project',
    ]);
    expect(asBob).toHaveLength(0);
    // ADMIN holds no project_members row on either seeded project. The
    // old admin branch (`{ kind: 'admin' }` -> `TRUE`) is gone, so the
    // listing gate is membership on the project row itself — nothing shows.
    expect(asAdmin).toHaveLength(0);
  });

  it('counts only project-scoped rows, not org rows that carry a project id', async () => {
    const { loadVisibleProjects } = await import('./project-memory.loader');

    const [project] = await loadVisibleProjects(ORG, ALICE);

    // alice-project holds two project-scoped rows plus one LEGACY org row.
    expect(project?.memory_count).toBe(2);
    expect(project?.member_count).toBe(1);
  });

  it('gates project artifacts by the same membership predicate', async () => {
    const { loadProjectArtifacts } = await import('./project-memory.loader');

    const asBob = await loadProjectArtifacts(ORG, PROJECT_ALICE, BOB);
    const asAlice = await loadProjectArtifacts(ORG, PROJECT_ALICE, ALICE);

    expect(asBob).toHaveLength(0);
    expect(asAlice.map((artifact) => artifact.title)).toEqual([
      'alice-project-artifact',
    ]);
  });

  it('rejects a blank viewer user id', async () => {
    const { loadProjectMemories } = await import('./project-memory.loader');

    await expect(loadProjectMemories(ORG, PROJECT_ALICE, '')).rejects.toThrow(
      /viewer user id is required/,
    );
  });
});

describe('Memory detail — the drill-in obeys the same ladder, no admin bypass (2026-08-12 ruling)', () => {
  it('will not open Alice’s private memory for Bob', async () => {
    const { loadMemoryDetailForViewer } =
      await import('./memory-detail.loader');

    const row = await loadMemoryDetailForViewer(ORG, seeded.alicePrivate!, {
      userId: BOB,
    });

    expect(row).toBeNull();
  });

  it('will not open Alice’s private memory for an ORG ADMIN', async () => {
    const { loadMemoryDetailForViewer } =
      await import('./memory-detail.loader');

    // The whole point of the feature: administrative power over the workspace
    // is not power over a person's private scope.
    const row = await loadMemoryDetailForViewer(ORG, seeded.alicePrivate!, {
      userId: ADMIN,
    });

    expect(row).toBeNull();
  });

  it('POSITIVE CONTROL: opens it for Alice', async () => {
    const { loadMemoryDetailForViewer } =
      await import('./memory-detail.loader');

    const row = await loadMemoryDetailForViewer(ORG, seeded.alicePrivate!, {
      userId: ALICE,
    });

    expect(row?.content).toContain('ALICE_SECRET');
    expect(row?.provenance).toBe('EXTRACTED');
  });

  it('will not open a project memory for a non-member — including an org admin with no membership row (inverted 2026-08-12: no `isOrgAdmin` field left to grant it) — but will for a member', async () => {
    const { loadMemoryDetailForViewer } =
      await import('./memory-detail.loader');

    const asBob = await loadMemoryDetailForViewer(ORG, seeded.projectMemory!, {
      userId: BOB,
    });
    const asAlice = await loadMemoryDetailForViewer(
      ORG,
      seeded.projectMemory!,
      { userId: ALICE },
    );
    const asAdmin = await loadMemoryDetailForViewer(
      ORG,
      seeded.projectMemory!,
      { userId: ADMIN },
    );

    expect(asBob).toBeNull();
    expect(asAlice?.content).toContain('PROJECT_FACT');
    expect(asAdmin).toBeNull();
  });

  it('opens an org memory for anyone in the org, including an unattributed session', async () => {
    const { loadMemoryDetailForViewer } =
      await import('./memory-detail.loader');

    const row = await loadMemoryDetailForViewer(ORG, seeded.orgMemory!, {
      userId: null,
    });

    expect(row?.content).toContain('ORG_FACT');
  });
});

describe('invariant: only the private loader may read scope=private', () => {
  it('no other loader in this directory mentions the private scope', () => {
    const dir = import.meta.dirname;

    const offenders = readdirSync(dir)
      .filter((file) => file.endsWith('.ts') && !file.includes('.test.'))
      .filter(
        (file) =>
          file !== 'private-memory.loader.ts' &&
          file !== 'memory-detail.loader.ts' &&
          file !== 'memory-visibility.types.ts',
      )
      .filter((file) => {
        const source = readFileSync(path.join(dir, file), 'utf8')
          // Comments discuss the private scope at length — deliberately. Only
          // executable code counts as "reading" it.
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');

        return (
          /['"`]private['"`]/.test(source) ||
          /scope\s*=\s*'private'/.test(source)
        );
      });

    // If this fails, a loader outside the two audited files has learned to
    // read private rows. That is the change this feature exists to prevent —
    // review the diff before touching this test.
    expect(offenders).toEqual([]);
  });
});

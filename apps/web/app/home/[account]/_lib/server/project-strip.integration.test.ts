import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The strip tells you how a project shares. That is information, so who may
 * read it is a boundary, and boundaries here are SQL predicates — real
 * Postgres, not a mocked pool.
 *
 * The case that matters: a non-member must get the same answer as someone
 * asking about a project that does not exist. If "not yours" and "no such
 * thing" were distinguishable, the Context page would become a way to
 * enumerate an org's projects and read their sharing posture.
 */

const db = new PGlite();

vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({
    query: (sql: string, params?: unknown[]) => db.query(sql, params),
  }),
}));

const ORG = 'org-strip';
const OTHER_ORG = 'org-other';
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

const P_SHARED = 'aaaaaaaa-0000-0000-0000-0000000000a1';
const P_TWIN_A = 'aaaaaaaa-0000-0000-0000-0000000000a2';
const P_TWIN_B = 'aaaaaaaa-0000-0000-0000-0000000000a3';
const P_OTHER_ORG = 'aaaaaaaa-0000-0000-0000-0000000000a4';

const SCHEMA = `
CREATE TABLE projects (
  id uuid PRIMARY KEY,
  org_id varchar NOT NULL,
  display_name varchar NOT NULL,
  default_scope text NOT NULL DEFAULT 'private'
);
CREATE TABLE project_members (
  project_id uuid NOT NULL,
  user_id varchar NOT NULL,
  role varchar NOT NULL DEFAULT 'write',
  scope_override text,
  PRIMARY KEY (project_id, user_id)
);
`;

let loadProjectStrip: typeof import('./project-strip.loader').loadProjectStrip;

beforeAll(async () => {
  await db.exec(SCHEMA);

  await db.query(
    `INSERT INTO projects (id, org_id, display_name, default_scope) VALUES
       ($1,$5,'Agent Memory','org'),
       ($2,$5,'Twin',        'org'),
       ($3,$5,'Twin',        'private'),
       ($4,$6,'Agent Memory','org')`,
    [P_SHARED, P_TWIN_A, P_TWIN_B, P_OTHER_ORG, ORG, OTHER_ORG],
  );

  await db.query(
    `INSERT INTO project_members (project_id, user_id, role, scope_override)
     VALUES ($1,$2,'admin',NULL), ($3,$2,'write',NULL), ($4,$2,'write',NULL)`,
    [P_SHARED, ALICE, P_TWIN_A, P_TWIN_B],
  );

  ({ loadProjectStrip } = await import('./project-strip.loader'));
});

describe('loadProjectStrip', () => {
  it('reports the setting to a member', async () => {
    const strip = await loadProjectStrip(ORG, 'Agent Memory', ALICE);

    expect(strip?.defaultScope).toBe('org');
    expect(strip?.viewerRole).toBe('admin');
    expect(strip?.memberCount).toBe(1);
  });

  it('tells a NON-member nothing — same answer as an unknown project', async () => {
    const notMine = await loadProjectStrip(ORG, 'Agent Memory', BOB);
    const missing = await loadProjectStrip(ORG, 'No Such Project', BOB);

    expect(notMine).toBeNull();
    expect(missing).toBeNull();
  });

  it('never resolves a name belonging to another org', async () => {
    // Bob is in no project here; Alice is. Neither may reach OTHER_ORG's
    // identically named project through this org's id.
    expect(await loadProjectStrip(OTHER_ORG, 'Agent Memory', ALICE)).toBeNull();
  });

  it('says nothing when the name is ambiguous', async () => {
    // Two projects called "Twin" with DIFFERENT settings. Guessing one would
    // show a sharing posture that may not be the project being looked at.
    expect(await loadProjectStrip(ORG, 'Twin', ALICE)).toBeNull();
  });

  it('reports the caller own override, not somebody else', async () => {
    await db.query(
      `UPDATE project_members SET scope_override = 'private'
        WHERE project_id = $1 AND user_id = $2`,
      [P_SHARED, ALICE],
    );
    await db.query(
      `INSERT INTO project_members (project_id, user_id, role, scope_override)
       VALUES ($1,$2,'write',NULL)`,
      [P_SHARED, BOB],
    );

    vi.resetModules();
    const fresh = await import('./project-strip.loader');

    expect((await fresh.loadProjectStrip(ORG, 'Agent Memory', ALICE))?.myOverride).toBe(
      'private',
    );
    expect((await fresh.loadProjectStrip(ORG, 'Agent Memory', BOB))?.myOverride).toBeNull();
  });

  it('refuses empty arguments rather than querying without them', async () => {
    expect(await loadProjectStrip('', 'Agent Memory', ALICE)).toBeNull();
    expect(await loadProjectStrip(ORG, 'Agent Memory', '')).toBeNull();
  });
});

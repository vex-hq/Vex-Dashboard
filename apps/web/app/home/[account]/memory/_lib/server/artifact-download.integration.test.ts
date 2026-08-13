import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * ADVERSARIAL DOWNLOAD TESTS.
 *
 * A download is the highest-consequence read in the product: a leaky memory
 * list shows a sentence, a leaky download hands over the file. So every
 * refusal below is paired with a positive control proving the entitled viewer
 * CAN get the artifact — without the pair, a resolver that returned `null` to
 * everybody (a typo'd join, a dropped parameter, a wrong scope) would pass the
 * whole suite while the feature was dead.
 *
 * Real Postgres (PGlite), not a mocked pool, for the same reason as the
 * visibility suite: the thing under test is a SQL predicate.
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

const PROJECT = 'aaaaaaaa-0000-0000-0000-000000000001';

const SCHEMA = `
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
  inline_text text,
  storage_uri text,
  version integer NOT NULL DEFAULT 1,
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
  provenance varchar NOT NULL DEFAULT 'EXTRACTED',
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

async function seedArtifact(
  title: string,
  options: { org?: string; status?: string; inline?: string | null } = {},
): Promise<string> {
  const id = nextId();
  const inline = options.inline ?? null;

  await db.query(
    `INSERT INTO artifacts
       (id, org_id, title, summary, kind, mime_type, size_bytes, inline_text,
        storage_uri, version, status)
     VALUES ($1,$2,$3,'summary','document','text/plain',69,$4,$5,1,$6)`,
    [
      id,
      options.org ?? ORG,
      title,
      inline,
      inline === null
        ? `s3://klio-artifacts/${options.org ?? ORG}/${id}/v1`
        : null,
      options.status ?? 'active',
    ],
  );

  return id;
}

async function seedCard(card: {
  org?: string;
  userId?: string | null;
  scope: 'private' | 'project' | 'org';
  projectId?: string | null;
  artifactId: string | null;
  memoryType?: string;
}): Promise<string> {
  const id = nextId();

  await db.query(
    `INSERT INTO session_memories
       (id, org_id, agent_id, user_id, memory_type, content, scope, status,
        provenance, project_id, metadata)
     VALUES ($1,$2,'host/claude-code',$3,$4,'[artifact] card',$5,'active',
             'EXTRACTED',$6,$7::jsonb)`,
    [
      id,
      card.org ?? ORG,
      card.userId ?? null,
      card.memoryType ?? 'artifact',
      card.scope,
      card.projectId ?? null,
      JSON.stringify(
        card.artifactId
          ? { source: 'mcp', artifact_id: card.artifactId }
          : { source: 'mcp' },
      ),
    ],
  );

  return id;
}

const cards: Record<string, string> = {};

beforeAll(async () => {
  await db.exec(SCHEMA);

  await db.query(
    `INSERT INTO project_members (project_id, user_id, role, granted_by)
     VALUES ($1,$2,'admin',$2)`,
    [PROJECT, ALICE],
  );

  cards.alicePrivate = await seedCard({
    userId: ALICE,
    scope: 'private',
    artifactId: await seedArtifact('alice-private-design-doc'),
  });

  cards.project = await seedCard({
    userId: ALICE,
    scope: 'project',
    projectId: PROJECT,
    artifactId: await seedArtifact('project-architecture'),
  });

  cards.org = await seedCard({
    scope: 'org',
    artifactId: await seedArtifact('org-runbook'),
  });

  cards.inline = await seedCard({
    userId: ALICE,
    scope: 'private',
    artifactId: await seedArtifact('inline-note', { inline: 'the bytes' }),
  });

  cards.retracted = await seedCard({
    scope: 'org',
    artifactId: await seedArtifact('retracted-doc', { status: 'retracted' }),
  });

  // A plain memory, not an artifact card.
  cards.notAnArtifact = await seedCard({
    scope: 'org',
    artifactId: null,
    memoryType: 'fact',
  });

  // Another tenant holding a card for its own artifact.
  cards.otherOrg = await seedCard({
    org: OTHER_ORG,
    scope: 'org',
    artifactId: await seedArtifact('other-tenant-secret', { org: OTHER_ORG }),
  });
});

afterAll(async () => {
  await db.close();
});

async function download(
  orgId: string,
  memoryId: string,
  viewer: { userId: string | null; isOrgAdmin: boolean },
) {
  const { loadDownloadableArtifact } =
    await import('./artifact-download.loader');

  return loadDownloadableArtifact(orgId, memoryId, viewer);
}

describe('a private artifact is downloadable only by its owner', () => {
  it('refuses a teammate', async () => {
    const result = await download(ORG, cards.alicePrivate!, {
      userId: BOB,
      isOrgAdmin: false,
    });

    // Proves: knowing the card id is not enough. Bob is a legitimate member of
    // the org with a valid session and still gets nothing.
    expect(result).toBeNull();
  });

  it('refuses an ORG ADMIN', async () => {
    const result = await download(ORG, cards.alicePrivate!, {
      userId: ADMIN,
      isOrgAdmin: true,
    });

    // Proves: the design's hardest promise holds on the download path too.
    // Administrative power over the workspace is not power over a person's
    // private files, and there is no parameter here that would widen it.
    expect(result).toBeNull();
  });

  it('refuses an unattributed session', async () => {
    const result = await download(ORG, cards.alicePrivate!, {
      userId: null,
      isOrgAdmin: false,
    });

    // Proves: a null user id does not degrade into "match anything".
    expect(result).toBeNull();
  });

  it('POSITIVE CONTROL: gives it to Alice', async () => {
    const result = await download(ORG, cards.alicePrivate!, {
      userId: ALICE,
      isOrgAdmin: false,
    });

    // Proves the three refusals above mean something: the same call with the
    // right identity really does resolve to the artifact.
    expect(result?.title).toBe('alice-private-design-doc');
    expect(result?.storageUri).toContain('/v1');
  });
});

describe('a project artifact is downloadable only by its members', () => {
  it('refuses a non-member', async () => {
    const result = await download(ORG, cards.project!, {
      userId: BOB,
      isOrgAdmin: false,
    });

    // Proves: `scope = 'project'` is a boundary, not a label. Bob can see the
    // org's shared brain and still cannot pull this file.
    expect(result).toBeNull();
  });

  it('refuses an org admin who is not a member of the project', async () => {
    const result = await download(ORG, cards.project!, {
      userId: ADMIN,
      isOrgAdmin: true,
    });

    // The 2026-08-12 ruling: membership in `project_members` is the ONLY gate
    // for a project, with no org-admin bypass anywhere in the engine or the
    // dashboard. This test previously asserted the opposite — it was written
    // when admin widening still applied here, and was left behind when the
    // bypass was removed, so `main` shipped red until this was corrected.
    expect(result).toBeNull();
  });

  it('POSITIVE CONTROL: gives it to a member', async () => {
    const asAlice = await download(ORG, cards.project!, {
      userId: ALICE,
      isOrgAdmin: false,
    });

    // Proves the membership predicate is being evaluated rather than the
    // project simply being unreadable for everyone — without which the two
    // refusals above would pass vacuously.
    expect(asAlice?.title).toBe('project-architecture');
  });
});

describe('the org boundary holds', () => {
  it('refuses another tenant’s artifact card', async () => {
    const result = await download(ORG, cards.otherOrg!, {
      userId: ALICE,
      isOrgAdmin: true,
    });

    // Proves: org isolation is not weakened by the new path. Even an admin,
    // naming a real card id, cannot reach across tenants.
    expect(result).toBeNull();
  });

  it('POSITIVE CONTROL: the owning tenant can', async () => {
    const result = await download(OTHER_ORG, cards.otherOrg!, {
      userId: BOB,
      isOrgAdmin: false,
    });

    expect(result?.title).toBe('other-tenant-secret');
  });
});

describe('everything else refuses identically', () => {
  it('returns null for an org memory that is not an artifact card', async () => {
    const result = await download(ORG, cards.notAnArtifact!, {
      userId: BOB,
      isOrgAdmin: false,
    });

    expect(result).toBeNull();
  });

  it('returns null for a retracted artifact the card still points at', async () => {
    const result = await download(ORG, cards.retracted!, {
      userId: BOB,
      isOrgAdmin: false,
    });

    expect(result).toBeNull();
  });

  it('returns null for a malformed id without letting it reach the query', async () => {
    // `id = $1` against a uuid column would raise on a non-uuid; refusing
    // early keeps a probe from telling the caller anything by its error.
    const result = await download(ORG, 'not-a-uuid', {
      userId: ALICE,
      isOrgAdmin: false,
    });

    expect(result).toBeNull();
  });

  it('POSITIVE CONTROL: an org artifact is downloadable by anyone in the org', async () => {
    const result = await download(ORG, cards.org!, {
      userId: BOB,
      isOrgAdmin: false,
    });

    expect(result?.title).toBe('org-runbook');
  });
});

describe('inline artifacts', () => {
  it('carries the inline text instead of a storage uri, under the same gate', async () => {
    const asBob = await download(ORG, cards.inline!, {
      userId: BOB,
      isOrgAdmin: false,
    });
    const asAlice = await download(ORG, cards.inline!, {
      userId: ALICE,
      isOrgAdmin: false,
    });

    // Small text artifacts never reached object storage. They are served
    // directly by the route, so they must be gated by exactly the same
    // predicate — a second path is a second chance to forget.
    expect(asBob).toBeNull();
    expect(asAlice?.inlineText).toBe('the bytes');
    expect(asAlice?.storageUri).toBeNull();
  });
});

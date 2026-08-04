import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The download route, end to end from a Request to a Response.
 *
 * The entitlement predicate itself is covered against real Postgres in
 * `memory/_lib/server/artifact-download.integration.test.ts`. What this file
 * adds is the HTTP contract on top of it, because a route can undo a correct
 * loader in three specific ways and each one is asserted here:
 *
 *   - by signing before checking, so an unauthorised request still receives a
 *     URL. AN UNAUTHORISED REQUEST THAT RETURNS A URL IS THE FAILURE THIS
 *     WHOLE FEATURE EXISTS TO PREVENT, so the refusal tests assert on the
 *     absence of a `Location` header, not merely on the status code;
 *   - by answering refusals differently from each other, turning the route
 *     into a probe for which private artifacts exist;
 *   - by trusting a user id from the URL rather than the session.
 *
 * Only the session and the database are faked. The loader, the ladder, the
 * presigner and the response construction are all real.
 */

const db = new PGlite();

const ORG = 'org-alpha';
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const ADMIN = '33333333-3333-3333-3333-333333333333';

const ALICE_PRIVATE_CARD = 'deadbeef-0000-0000-0000-000000000001';
const ORG_CARD = 'deadbeef-0000-0000-0000-000000000002';
const INLINE_CARD = 'deadbeef-0000-0000-0000-000000000003';

const ALICE_ARTIFACT = 'beefdead-0000-0000-0000-000000000001';
const ORG_ARTIFACT = 'beefdead-0000-0000-0000-000000000002';
const INLINE_ARTIFACT = 'beefdead-0000-0000-0000-000000000003';

/** The session under test. Mutated per case; never read from the URL. */
let viewer = { userId: ALICE, isOrgAdmin: false };

/** Whether the caller is a member of the account named in the URL. */
let isAccountMember = true;

vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({
    query: (sql: string, params?: unknown[]) => db.query(sql, params),
  }),
}));

vi.mock('~/lib/agentguard/resolve-org-id', async () => {
  const { AccountMembershipError } = await import(
    '~/lib/agentguard/require-account-membership'
  );

  return {
    resolveOrgId: async () => {
      if (!isAccountMember) {
        throw new AccountMembershipError();
      }

      return ORG;
    },
  };
});

/**
 * Whether the caller has a session at all. When false the viewer loader
 * redirects, exactly as `requireUserInServerComponent` does in production —
 * which in a route handler escapes as a redirect the browser follows.
 */
let isAuthenticated = true;

vi.mock('~/home/[account]/_lib/server/account-viewer', () => ({
  loadAccountViewer: async () => {
    if (!isAuthenticated) {
      // The shape of the error Next's `redirect()` throws.
      const error = new Error('NEXT_REDIRECT') as Error & { digest: string };
      error.digest = 'NEXT_REDIRECT;replace;/auth/sign-in;307;';
      throw error;
    }

    return { ...viewer, accountSlug: 'acme' };
  },
}));

vi.mock('@kit/shared/logger', () => ({
  getLogger: async () => ({
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  }),
}));

const SCHEMA = `
CREATE TABLE project_members (
  project_id uuid NOT NULL,
  user_id varchar NOT NULL,
  role varchar NOT NULL DEFAULT 'member',
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
  scope varchar NOT NULL,
  status varchar NOT NULL DEFAULT 'active',
  provenance varchar NOT NULL DEFAULT 'EXTRACTED',
  space_id uuid,
  project_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
`;

async function get(memoryId: string): Promise<Response> {
  const { GET } = await import('./route');

  return GET(
    new Request(`http://localhost/api/agentguard/artifacts/acme/${memoryId}`),
    { params: Promise.resolve({ account: 'acme', memoryId }) },
  );
}

beforeAll(async () => {
  process.env.KLIO_ARTIFACT_S3_ENDPOINT = 'https://r2.example';
  process.env.KLIO_ARTIFACT_S3_ACCESS_KEY_ID = 'test-key';
  process.env.KLIO_ARTIFACT_S3_SECRET_ACCESS_KEY = 'test-secret'; // pragma: allowlist secret
  process.env.KLIO_ARTIFACT_S3_REGION = 'auto';

  await db.exec(SCHEMA);

  await db.query(
    `INSERT INTO artifacts (id, org_id, title, storage_uri, inline_text)
     VALUES ($1,$2,'alice private report.pdf',$3,NULL),
            ($4,$2,'org runbook',$5,NULL),
            ($6,$2,'inline note',NULL,'the bytes')`,
    [
      ALICE_ARTIFACT,
      ORG,
      `s3://klio-artifacts/${ORG}/${ALICE_ARTIFACT}/v1`,
      ORG_ARTIFACT,
      `s3://klio-artifacts/${ORG}/${ORG_ARTIFACT}/v1`,
      INLINE_ARTIFACT,
    ],
  );

  await db.query(
    `INSERT INTO session_memories
       (id, org_id, agent_id, user_id, memory_type, content, scope, metadata)
     VALUES ($1,$2,'a',$3,'artifact','[artifact]','private',$4::jsonb),
            ($5,$2,'a',NULL,'artifact','[artifact]','org',$6::jsonb),
            ($7,$2,'a',$3,'artifact','[artifact]','private',$8::jsonb)`,
    [
      ALICE_PRIVATE_CARD,
      ORG,
      ALICE,
      JSON.stringify({ artifact_id: ALICE_ARTIFACT }),
      ORG_CARD,
      JSON.stringify({ artifact_id: ORG_ARTIFACT }),
      INLINE_CARD,
      JSON.stringify({ artifact_id: INLINE_ARTIFACT }),
    ],
  );
});

afterAll(async () => {
  await db.close();
});

describe('an unauthorised download is refused before anything is signed', () => {
  it('gives a teammate a 404 and NO url for a private artifact', async () => {
    viewer = { userId: BOB, isOrgAdmin: false };

    const response = await get(ALICE_PRIVATE_CARD);

    expect(response.status).toBe(404);
    // The assertion that matters: no signed URL escaped. A 404 carrying a
    // Location header would be a hole with a tidy status code on it.
    expect(response.headers.get('location')).toBeNull();
    expect(await response.text()).not.toContain('X-Amz-Signature');
  });

  it('gives an ORG ADMIN a 404 and NO url for the same artifact', async () => {
    viewer = { userId: ADMIN, isOrgAdmin: true };

    const response = await get(ALICE_PRIVATE_CARD);

    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBeNull();
  });

  it('gives a non-member of the workspace the same 404', async () => {
    viewer = { userId: BOB, isOrgAdmin: false };
    isAccountMember = false;

    try {
      const response = await get(ORG_CARD);

      // Identical to every other refusal: whether this workspace exists is not
      // something a non-member learns from a download URL.
      expect(response.status).toBe(404);
      expect(response.headers.get('location')).toBeNull();
    } finally {
      isAccountMember = true;
    }
  });

  it('refuses an unknown id with the same status and body as a forbidden one', async () => {
    viewer = { userId: BOB, isOrgAdmin: false };

    const forbidden = await get(ALICE_PRIVATE_CARD);
    const missing = await get('deadbeef-0000-0000-0000-00000000ffff');

    // Indistinguishable on purpose: otherwise the route enumerates which
    // private artifacts exist.
    expect(missing.status).toBe(forbidden.status);
    expect(await missing.text()).toBe(await forbidden.text());
  });
});

describe('POSITIVE CONTROL: the owner gets a real, bounded download', () => {
  it('redirects Alice to a presigned url for her own artifact', async () => {
    viewer = { userId: ALICE, isOrgAdmin: false };

    const response = await get(ALICE_PRIVATE_CARD);

    expect(response.status).toBe(302);

    const location = new URL(response.headers.get('location')!);

    // Proves the refusals above are refusals and not a dead route.
    expect(location.pathname).toBe(
      `/klio-artifacts/${ORG}/${ALICE_ARTIFACT}/v1`,
    );
    expect(location.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(location.searchParams.get('response-content-disposition')).toBe(
      'attachment; filename="alice-private-report.pdf"',
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('serves an inline artifact as an attachment, gated the same way', async () => {
    viewer = { userId: BOB, isOrgAdmin: false };
    expect((await get(INLINE_CARD)).status).toBe(404);

    viewer = { userId: ALICE, isOrgAdmin: false };
    const response = await get(INLINE_CARD);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('the bytes');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="inline-note"',
    );
    // Customer content served from our origin must not be sniffed into
    // something executable.
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('lets anyone in the org download an org-scoped artifact', async () => {
    viewer = { userId: BOB, isOrgAdmin: false };

    const response = await get(ORG_CARD);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain(ORG_ARTIFACT);
  });
});


/**
 * An expired session must not turn a download into a corrupt file.
 *
 * The Download control is an `<a download>` link. A browser does not follow a
 * sign-in bounce for a download — it saves whatever comes back. A redirect to
 * the sign-in page therefore lands in the user's Downloads folder as an HTML
 * body named after the memory id, with an extension guessed from the content
 * type. Observed in production: a file called
 * `d885272e-…-24de2fb16b9f.js` that would not open, which reads as "the file
 * is corrupt" when the real cause is "your session expired".
 */
describe('an unauthenticated request', () => {
  it('gets a 401 and NOT a redirect to the sign-in page', async () => {
    isAuthenticated = false;

    try {
      const response = await get(ORG_CARD);

      expect(response.status).toBe(401);
      // The assertions that matter: nothing for the browser to follow, and
      // nothing it would save as a file.
      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('content-type')).toContain(
        'application/json',
      );
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).not.toContain('<html');
    } finally {
      isAuthenticated = true;
    }
  });

  it('still serves an authenticated caller — the control', async () => {
    isAuthenticated = true;
    viewer = { userId: ALICE, isOrgAdmin: false };

    const response = await get(ORG_CARD);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('X-Amz-Signature');
  });
});

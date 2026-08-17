import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountMembershipError } from '~/lib/agentguard/require-account-membership';
import { mintWsToken } from '~/lib/agentguard/ws-token';

/**
 * The membership gate is the entire authorisation story for the realtime
 * feed: the engine can only check that a token is well-signed and unexpired,
 * so whether the caller may read a given org is decided here and nowhere
 * else. These tests hold that gate in place.
 */

const resolveOrgId = vi.hoisted(() => vi.fn());
const loggerError = vi.hoisted(() => vi.fn());

vi.mock('~/lib/agentguard/resolve-org-id', () => ({ resolveOrgId }));

vi.mock('@kit/shared/logger', () => ({
  getLogger: async () => ({
    error: loggerError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

// A literal chosen for this file, never deployed anywhere. The real signing
// secret lives only in AGENTGUARD_WS_TOKEN_SECRET.
const SECRET = 'route-test-signing-secret'; // pragma: allowlist secret
const ORG = 'org-resolved-from-membership';

async function callRoute(account: string) {
  const { GET } = await import('./route');

  return GET(new Request('http://localhost/api/agentguard/ws-token/acme'), {
    params: Promise.resolve({ account }),
  });
}

describe('GET /api/agentguard/ws-token/[account]', () => {
  const original = process.env.AGENTGUARD_WS_TOKEN_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AGENTGUARD_WS_TOKEN_SECRET = SECRET;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.AGENTGUARD_WS_TOKEN_SECRET;
    } else {
      process.env.AGENTGUARD_WS_TOKEN_SECRET = original;
    }
  });

  it('mints a token for the org the membership check resolved', async () => {
    resolveOrgId.mockResolvedValue(ORG);

    const response = await callRoute('acme');
    const body = (await response.json()) as {
      token: string;
      expiresAt: number;
    };

    expect(response.status).toBe(200);
    expect(resolveOrgId).toHaveBeenCalledWith('acme');

    // The token must be for the RESOLVED org, never the requested slug.
    expect(body.token).toBe(
      mintWsToken({
        orgId: ORG,
        secret: SECRET,
        expiresAt: body.expiresAt,
      }),
    );
  });

  it('never caches the credential', async () => {
    resolveOrgId.mockResolvedValue(ORG);

    const response = await callRoute('acme');

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('refuses a non-member with 404 and no token', async () => {
    resolveOrgId.mockRejectedValue(new AccountMembershipError());

    const response = await callRoute('someone-elses-workspace');
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(404);
    expect(body).not.toHaveProperty('token');
  });

  it('does not distinguish "not a member" from "no such workspace"', async () => {
    // Same status, same body. Otherwise the route enumerates workspace slugs.
    resolveOrgId.mockRejectedValue(new AccountMembershipError('no such row'));

    const missing = await callRoute('does-not-exist');

    resolveOrgId.mockRejectedValue(new AccountMembershipError('not a member'));

    const forbidden = await callRoute('exists-but-not-mine');

    expect(missing.status).toBe(forbidden.status);
    expect(await missing.json()).toEqual(await forbidden.json());
  });

  it('answers 401 rather than redirecting when there is no session', async () => {
    // The session helpers throw a NEXT_REDIRECT, which is right for a page and
    // wrong for a fetch — the hook would try to parse sign-in HTML as JSON.
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;replace;/auth/sign-in;307;',
    });

    resolveOrgId.mockRejectedValue(redirect);

    const response = await callRoute('acme');

    expect(response.status).toBe(401);
    expect(await response.json()).not.toHaveProperty('token');
  });

  it('returns 503 and logs when the signing secret is unconfigured', async () => {
    resolveOrgId.mockResolvedValue(ORG);
    delete process.env.AGENTGUARD_WS_TOKEN_SECRET;

    const response = await callRoute('acme');

    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty('token');
    expect(loggerError).toHaveBeenCalled();
  });

  it('rejects an empty account slug before touching anything', async () => {
    const response = await callRoute('');

    expect(response.status).toBe(404);
    expect(resolveOrgId).not.toHaveBeenCalled();
  });

  it('lets an unexpected error surface instead of failing open', async () => {
    // A database outage must not be mistaken for "authorised".
    resolveOrgId.mockRejectedValue(new Error('connection terminated'));

    await expect(callRoute('acme')).rejects.toThrow('connection terminated');
  });
});

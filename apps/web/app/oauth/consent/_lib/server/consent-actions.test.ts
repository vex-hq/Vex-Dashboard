/**
 * Unit tests for consent-actions.ts.
 *
 * The Supabase client, consent-service module, and @kit/next/actions +
 * @kit/supabase/* packages are all mocked — no network calls, no Next.js
 * runtime.  All fixtures use obviously fake identifiers so the file is safe
 * for a public repository.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fake data fixtures — obviously fake, no production identifiers
// ---------------------------------------------------------------------------

const FAKE_USER_ID = 'user-00000000-0000-0000-0000-000000000001';
const FAKE_AUTH_ID = 'auth-id-actions-00000000-0000-0000-0000-000000000002';
const FAKE_CLIENT_ID = 'client-id-00000000-0000-0000-0000-000000000003';
const FAKE_CLIENT_NAME = 'Test MCP Client';
const FAKE_REDIRECT_HINT = 'https://localhost:9999/oauth/callback';
const FAKE_REDIRECT_URL =
  'https://localhost:9999/oauth/callback?code=abc&state=xyz';
const FAKE_DENY_REDIRECT_URL =
  'https://localhost:9999/oauth/callback?error=access_denied&state=xyz';
const FAKE_GRANT_ID = 'grant-id-00000000-0000-0000-0000-000000000004';
const FAKE_TEAM_SLUG = 'acme-team';

const FAKE_DETAILS = {
  authorizationId: FAKE_AUTH_ID,
  clientId: FAKE_CLIENT_ID,
  clientName: FAKE_CLIENT_NAME,
  scopes: ['openid', 'profile'],
  redirectHint: FAKE_REDIRECT_HINT,
};

// ---------------------------------------------------------------------------
// Mock: consent-service
// ---------------------------------------------------------------------------

const mockGetAuthorizationDetails = vi.fn();
const mockApproveAuthorization = vi.fn();
const mockDenyAuthorization = vi.fn();

vi.mock('~/lib/oauth/consent-service', () => ({
  getAuthorizationDetails: (...args: unknown[]) =>
    mockGetAuthorizationDetails(...args),
  approveAuthorization: (...args: unknown[]) =>
    mockApproveAuthorization(...args),
  denyAuthorization: (...args: unknown[]) => mockDenyAuthorization(...args),
  ConsentServiceError: class ConsentServiceError extends Error {
    constructor(
      message: string,
      public readonly cause?: unknown,
    ) {
      super(message);
      this.name = 'ConsentServiceError';
    }
  },
}));

// ---------------------------------------------------------------------------
// Mock: @kit/supabase/server-client + @kit/supabase/require-user
// ---------------------------------------------------------------------------

const mockSupabaseFrom = vi.fn();
const mockSupabaseClient = { from: mockSupabaseFrom };

vi.mock('@kit/supabase/server-client', () => ({
  getSupabaseServerClient: () => mockSupabaseClient,
}));

// enhanceAction calls requireUser internally via getSupabaseServerClient,
// but we stub enhanceAction itself so we can inject the user directly.
vi.mock('@kit/supabase/require-user', () => ({
  requireUser: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: @kit/next/actions  (enhanceAction)
//
// The real enhanceAction runs Zod validation + auth via requireUser.  We stub
// it to a thin wrapper that: validates the schema, injects FAKE_USER as the
// user, and calls the inner function — so action logic can be tested without
// a real Next.js / Supabase runtime.
// ---------------------------------------------------------------------------

vi.mock('@kit/next/actions', () => ({
  enhanceAction: (
    fn: (data: unknown, user: unknown) => unknown,
    config: {
      schema?: {
        safeParseAsync: (d: unknown) => Promise<{
          success: boolean;
          data?: unknown;
          error?: { message: string };
        }>;
      };
    },
  ) => {
    return async (params: unknown) => {
      // Validate with the schema if present
      if (config.schema) {
        const parsed = await config.schema.safeParseAsync(params);
        if (!parsed.success) {
          throw new Error(parsed.error?.message ?? 'Invalid request body');
        }
        return fn(parsed.data, { id: FAKE_USER_ID });
      }
      return fn(params, { id: FAKE_USER_ID });
    };
  },
}));

// ---------------------------------------------------------------------------
// Call-order tracking
// ---------------------------------------------------------------------------

const callOrder: string[] = [];

function trackCall(name: string) {
  callOrder.push(name);
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
  callOrder.length = 0;
});

afterEach(() => {
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Deny path
// ---------------------------------------------------------------------------

describe('submitConsentAction — deny', () => {
  it('calls denyAuthorization and returns redirectTo without touching grants', async () => {
    mockDenyAuthorization.mockResolvedValueOnce({
      redirectTo: FAKE_DENY_REDIRECT_URL,
    });

    const { submitConsentAction } = await import('./consent-actions');

    const result = await submitConsentAction({
      authorizationId: FAKE_AUTH_ID,
      decision: 'deny',
    });

    expect(result).toEqual({ redirectTo: FAKE_DENY_REDIRECT_URL });
    expect(mockDenyAuthorization).toHaveBeenCalledWith(
      mockSupabaseClient,
      FAKE_AUTH_ID,
    );

    // No grant table writes
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Approve — happy path
// ---------------------------------------------------------------------------

describe('submitConsentAction — approve (happy path)', () => {
  it('revokes existing grant, inserts new grant, calls approveAuthorization in order', async () => {
    // Server-side re-fetch returns consent_required
    mockGetAuthorizationDetails.mockImplementation(async () => {
      trackCall('getAuthorizationDetails');
      return { kind: 'consent_required', details: FAKE_DETAILS };
    });

    // approveAuthorization succeeds
    mockApproveAuthorization.mockImplementation(async () => {
      trackCall('approveAuthorization');
      return { redirectTo: FAKE_REDIRECT_URL };
    });

    // Wire the `from` mock to return the right chain per table
    let oauthGrantsCallCount = 0;
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        const maybeSingle = vi.fn().mockResolvedValue({
          data: {
            id: 'account-uuid-001',
            slug: FAKE_TEAM_SLUG,
            is_personal_account: false,
          },
          error: null,
        });
        const eqInner = vi.fn().mockReturnValue({ maybeSingle });
        const sel = vi.fn().mockReturnValue({ eq: eqInner });
        return { select: sel };
      }

      if (table === 'oauth_grants') {
        oauthGrantsCallCount++;

        if (oauthGrantsCallCount === 1) {
          // First call → revoke-existing UPDATE
          const revokeIs = vi.fn().mockResolvedValue({ error: null });
          const revokeEqInner = vi.fn().mockReturnValue({ is: revokeIs });
          const revokeEqOuter = vi.fn().mockReturnValue({ eq: revokeEqInner });
          return {
            update: vi.fn().mockImplementation(() => {
              trackCall('revokeExistingGrant');
              return { eq: revokeEqOuter };
            }),
          };
        }

        // Second call → INSERT new grant
        const single = vi.fn().mockImplementation(async () => {
          trackCall('insertGrant');
          return { data: { id: FAKE_GRANT_ID }, error: null };
        });
        const insertSelect = vi.fn().mockReturnValue({ single });
        return { insert: vi.fn().mockReturnValue({ select: insertSelect }) };
      }

      return {};
    });

    const { submitConsentAction } = await import('./consent-actions');

    const result = await submitConsentAction({
      authorizationId: FAKE_AUTH_ID,
      decision: 'approve',
      accountSlug: FAKE_TEAM_SLUG,
    });

    expect(result).toEqual({ redirectTo: FAKE_REDIRECT_URL });

    // Verify strict ordering: revoke → insert → approve
    const revokeIdx = callOrder.indexOf('revokeExistingGrant');
    const insertIdx = callOrder.indexOf('insertGrant');
    const approveIdx = callOrder.indexOf('approveAuthorization');

    expect(revokeIdx).toBeGreaterThanOrEqual(0);
    expect(insertIdx).toBeGreaterThan(revokeIdx);
    expect(approveIdx).toBeGreaterThan(insertIdx);
  });
});

// ---------------------------------------------------------------------------
// Approve — already_consented on server-side re-fetch
// ---------------------------------------------------------------------------

describe('submitConsentAction — approve with already_consented re-fetch', () => {
  it('returns redirectTo without writing any grant rows', async () => {
    mockGetAuthorizationDetails.mockResolvedValueOnce({
      kind: 'already_consented',
      redirectTo: FAKE_REDIRECT_URL,
    });

    const { submitConsentAction } = await import('./consent-actions');

    const result = await submitConsentAction({
      authorizationId: FAKE_AUTH_ID,
      decision: 'approve',
      accountSlug: FAKE_TEAM_SLUG,
    });

    expect(result).toEqual({ redirectTo: FAKE_REDIRECT_URL });

    // No grant table writes
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Approve — forged / unreadable slug
// ---------------------------------------------------------------------------

describe('submitConsentAction — approve with unreadable slug', () => {
  it('rejects when the slug returns no account (RLS prevents access)', async () => {
    mockGetAuthorizationDetails.mockResolvedValueOnce({
      kind: 'consent_required',
      details: FAKE_DETAILS,
    });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        const maybeSingle = vi
          .fn()
          .mockResolvedValue({ data: null, error: null });
        const eq = vi.fn().mockReturnValue({ maybeSingle });
        const select = vi.fn().mockReturnValue({ eq });
        return { select };
      }
      return {};
    });

    const { submitConsentAction } = await import('./consent-actions');

    await expect(
      submitConsentAction({
        authorizationId: FAKE_AUTH_ID,
        decision: 'approve',
        accountSlug: 'forged-slug',
      }),
    ).rejects.toThrow('not accessible');

    // No grant inserts
    // The second call to from() (for oauth_grants INSERT) should never happen
    const grantCalls = mockSupabaseFrom.mock.calls.filter(
      (c: unknown[]) => c[0] === 'oauth_grants',
    );
    expect(grantCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Approve — personal account slug
// ---------------------------------------------------------------------------

describe('submitConsentAction — approve with personal account slug', () => {
  it('rejects when the account is personal', async () => {
    mockGetAuthorizationDetails.mockResolvedValueOnce({
      kind: 'consent_required',
      details: FAKE_DETAILS,
    });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        const maybeSingle = vi.fn().mockResolvedValue({
          data: {
            id: 'personal-uuid',
            slug: 'my-personal',
            is_personal_account: true,
          },
          error: null,
        });
        const eq = vi.fn().mockReturnValue({ maybeSingle });
        const select = vi.fn().mockReturnValue({ eq });
        return { select };
      }
      return {};
    });

    const { submitConsentAction } = await import('./consent-actions');

    await expect(
      submitConsentAction({
        authorizationId: FAKE_AUTH_ID,
        decision: 'approve',
        accountSlug: 'my-personal',
      }),
    ).rejects.toThrow('personal accounts');

    // No grant inserts
    const grantCalls = mockSupabaseFrom.mock.calls.filter(
      (c: unknown[]) => c[0] === 'oauth_grants',
    );
    expect(grantCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Approve — approveAuthorization throws → compensating revoke
// ---------------------------------------------------------------------------

describe('submitConsentAction — compensating revoke on approval failure', () => {
  it('revokes the inserted grant and rethrows when approveAuthorization fails', async () => {
    mockGetAuthorizationDetails.mockResolvedValueOnce({
      kind: 'consent_required',
      details: FAKE_DETAILS,
    });

    mockApproveAuthorization.mockRejectedValueOnce(
      new Error('Approval service unavailable'),
    );

    // Track calls for the compensating revoke
    const compensatingRevokeIs = vi.fn().mockResolvedValue({ error: null });
    const compensatingRevokeEq = vi
      .fn()
      .mockReturnValue({ is: compensatingRevokeIs });
    const compensatingRevokeUpdate = vi
      .fn()
      .mockReturnValue({ eq: compensatingRevokeEq });

    let oauthGrantsCallCount = 0;

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        const maybeSingle = vi.fn().mockResolvedValue({
          data: {
            id: 'account-uuid-001',
            slug: FAKE_TEAM_SLUG,
            is_personal_account: false,
          },
          error: null,
        });
        const eq = vi.fn().mockReturnValue({ maybeSingle });
        const select = vi.fn().mockReturnValue({ eq });
        return { select };
      }

      if (table === 'oauth_grants') {
        oauthGrantsCallCount++;

        if (oauthGrantsCallCount === 1) {
          // First call → revoke existing (no-op, no rows to revoke)
          // Action chains: .update().eq(user_id).eq(client_id).is(revoked_at)
          const revokeIs = vi.fn().mockResolvedValue({ error: null });
          const revokeEqInner = vi.fn().mockReturnValue({ is: revokeIs });
          const revokeEqOuter = vi.fn().mockReturnValue({ eq: revokeEqInner });
          return { update: vi.fn().mockReturnValue({ eq: revokeEqOuter }) };
        }

        if (oauthGrantsCallCount === 2) {
          // Second call → insert new grant
          const single = vi.fn().mockResolvedValue({
            data: { id: FAKE_GRANT_ID },
            error: null,
          });
          const select = vi.fn().mockReturnValue({ single });
          return { insert: vi.fn().mockReturnValue({ select }) };
        }

        if (oauthGrantsCallCount === 3) {
          // Third call → compensating revoke after approval failure
          trackCall('compensatingRevoke');
          return { update: compensatingRevokeUpdate };
        }
      }

      return {};
    });

    const { submitConsentAction } = await import('./consent-actions');

    await expect(
      submitConsentAction({
        authorizationId: FAKE_AUTH_ID,
        decision: 'approve',
        accountSlug: FAKE_TEAM_SLUG,
      }),
    ).rejects.toThrow('Approval service unavailable');

    // Compensating revoke must have been called
    expect(callOrder).toContain('compensatingRevoke');
    expect(compensatingRevokeUpdate).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Approve — schema validation: missing accountSlug for approve
// ---------------------------------------------------------------------------

describe('submitConsentAction — schema validation', () => {
  it('rejects when decision is approve but accountSlug is missing', async () => {
    const { submitConsentAction } = await import('./consent-actions');

    await expect(
      submitConsentAction({
        authorizationId: FAKE_AUTH_ID,
        decision: 'approve',
        // No accountSlug
      } as Parameters<typeof submitConsentAction>[0]),
    ).rejects.toThrow();
  });
});

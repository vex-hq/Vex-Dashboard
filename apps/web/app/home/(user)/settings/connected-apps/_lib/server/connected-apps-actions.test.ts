/**
 * Unit tests for connected-apps-actions.ts.
 *
 * The Supabase client and @kit/next/actions + @kit/supabase/* packages are
 * all mocked — no network calls, no Next.js runtime.  All fixtures use
 * obviously fake identifiers safe for a public repository.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fake data fixtures — obviously fake, no production identifiers
// ---------------------------------------------------------------------------

const FAKE_USER_ID = 'user-00000000-0000-0000-0000-111111111111';
const FAKE_GRANT_ID = '00000000-aaaa-bbbb-cccc-000000000001';
const UNKNOWN_GRANT_ID = '00000000-ffff-ffff-ffff-000000000099';
const FOREIGN_GRANT_ID = '00000000-dddd-dddd-dddd-000000000077';

// ---------------------------------------------------------------------------
// Mock: @kit/supabase/server-client
// ---------------------------------------------------------------------------

const mockSupabaseFrom = vi.fn();
const mockSupabaseClient = { from: mockSupabaseFrom };

vi.mock('@kit/supabase/server-client', () => ({
  getSupabaseServerClient: () => mockSupabaseClient,
}));

// ---------------------------------------------------------------------------
// Mock: @kit/next/actions  (enhanceAction)
//
// Thin wrapper: validates schema, injects a fake user, and invokes the inner
// function directly — no real Next.js / Supabase auth runtime needed.
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
// Query chain builder helpers
// ---------------------------------------------------------------------------

/** Build a mock chain for a successful update that matches rows. */
function buildRevokeChain(returnedRows: unknown[]) {
  const select = vi.fn().mockResolvedValue({ data: returnedRows, error: null });
  const is = vi.fn().mockReturnValue({ select });
  const eq = vi.fn().mockReturnValue({ is });
  const update = vi.fn().mockReturnValue({ eq });

  return { update, eq, is, select };
}

/** Build a mock chain for an update that hits a DB error. */
function buildErrorChain(message: string) {
  const select = vi.fn().mockResolvedValue({
    data: null,
    error: { message },
  });
  const is = vi.fn().mockReturnValue({ select });
  const eq = vi.fn().mockReturnValue({ is });
  const update = vi.fn().mockReturnValue({ eq });

  return { update, eq, is, select };
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Happy path — revoke succeeds
// ---------------------------------------------------------------------------

describe('revokeGrantAction — happy path', () => {
  it('calls update with grantId + revoked_at guard and returns { success: true }', async () => {
    const chain = buildRevokeChain([{ id: FAKE_GRANT_ID }]);
    mockSupabaseFrom.mockReturnValue({ update: chain.update });

    const { revokeGrantAction } = await import('./connected-apps-actions');

    const result = await revokeGrantAction({ grantId: FAKE_GRANT_ID });

    expect(result).toEqual({ success: true });

    // Verify the update was called
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) }),
    );

    // Verify .eq('id', grantId) was chained
    expect(chain.eq).toHaveBeenCalledWith('id', FAKE_GRANT_ID);

    // Verify .is('revoked_at', null) was chained — ensures only active grants
    // are targeted and the guard cannot be bypassed.
    expect(chain.is).toHaveBeenCalledWith('revoked_at', null);
  });
});

// ---------------------------------------------------------------------------
// Zero rows matched — no existence leak
// ---------------------------------------------------------------------------

describe('revokeGrantAction — zero rows matched', () => {
  it('returns { success: false } when an unknown grantId matches no rows', async () => {
    const chain = buildRevokeChain([]); // empty = no rows updated
    mockSupabaseFrom.mockReturnValue({ update: chain.update });

    const { revokeGrantAction } = await import('./connected-apps-actions');

    const result = await revokeGrantAction({ grantId: UNKNOWN_GRANT_ID });

    expect(result).toEqual({ success: false });
  });

  it('returns { success: false } for a foreign grantId (owned by another user)', async () => {
    // RLS at the DB level prevents the update; PostgREST returns an empty
    // rows array rather than an error in this case.
    const chain = buildRevokeChain([]);
    mockSupabaseFrom.mockReturnValue({ update: chain.update });

    const { revokeGrantAction } = await import('./connected-apps-actions');

    const result = await revokeGrantAction({ grantId: FOREIGN_GRANT_ID });

    // Must return the same shape as the unknown-id case — no existence leak.
    expect(result).toEqual({ success: false });
  });

  it('returns the same response shape for both unknown and foreign ids', async () => {
    const chain = buildRevokeChain([]);
    mockSupabaseFrom.mockReturnValue({ update: chain.update });

    const { revokeGrantAction } = await import('./connected-apps-actions');

    const unknownResult = await revokeGrantAction({ grantId: UNKNOWN_GRANT_ID });
    const foreignResult = await revokeGrantAction({ grantId: FOREIGN_GRANT_ID });

    // Both cases must be identical — callers cannot distinguish them.
    expect(unknownResult).toEqual(foreignResult);
  });
});

// ---------------------------------------------------------------------------
// DB error propagation
// ---------------------------------------------------------------------------

describe('revokeGrantAction — database error', () => {
  it('throws when the database returns an error', async () => {
    const chain = buildErrorChain('foreign key violation');
    mockSupabaseFrom.mockReturnValue({ update: chain.update });

    const { revokeGrantAction } = await import('./connected-apps-actions');

    await expect(
      revokeGrantAction({ grantId: FAKE_GRANT_ID }),
    ).rejects.toThrow('Failed to revoke grant: foreign key violation');
  });
});

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('revokeGrantAction — schema validation', () => {
  it('rejects when grantId is not a valid UUID', async () => {
    const { revokeGrantAction } = await import('./connected-apps-actions');

    await expect(
      revokeGrantAction({ grantId: 'not-a-uuid' }),
    ).rejects.toThrow();
  });

  it('rejects when grantId is missing', async () => {
    const { revokeGrantAction } = await import('./connected-apps-actions');

    await expect(
      revokeGrantAction({} as Parameters<typeof revokeGrantAction>[0]),
    ).rejects.toThrow();
  });

  it('accepts a valid UUID grantId', async () => {
    const chain = buildRevokeChain([{ id: FAKE_GRANT_ID }]);
    mockSupabaseFrom.mockReturnValue({ update: chain.update });

    const { revokeGrantAction } = await import('./connected-apps-actions');

    // Should not throw
    await expect(
      revokeGrantAction({ grantId: FAKE_GRANT_ID }),
    ).resolves.toEqual({ success: true });
  });
});

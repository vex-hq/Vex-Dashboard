/**
 * Unit tests for require-account-membership.ts.
 *
 * The Supabase server client is fully mocked — no network calls, no Supabase
 * process. All fixtures use obviously fake identifiers so the file is safe for
 * a public repository.
 *
 * The guard is the single choke point that stops a signed-in user from acting
 * on a workspace they do not belong to, so every failure mode below must fail
 * CLOSED (throw), never fall through.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fake data fixtures — obviously fake, no production identifiers
// ---------------------------------------------------------------------------

const MEMBER_SLUG = 'acme-team';
const VICTIM_SLUG = 'victim-workspace';
const FAKE_ACCOUNT_ID = 'account-00000000-0000-0000-0000-000000000001';

// ---------------------------------------------------------------------------
// Mock: @kit/supabase/server-client
// ---------------------------------------------------------------------------

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockSupabaseClient = { from: mockFrom };

vi.mock('@kit/supabase/server-client', () => ({
  getSupabaseServerClient: () => mockSupabaseClient,
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
});

afterEach(() => {
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requireAccountMembership', () => {
  it('resolves for a slug the caller can read under RLS (member)', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: FAKE_ACCOUNT_ID },
      error: null,
    });

    const { requireAccountMembership } = await import(
      './require-account-membership'
    );

    await expect(
      requireAccountMembership(MEMBER_SLUG),
    ).resolves.toBeUndefined();

    // The check must run against the RLS-scoped `accounts` table, by slug.
    expect(mockFrom).toHaveBeenCalledWith('accounts');
    expect(mockEq).toHaveBeenCalledWith('slug', MEMBER_SLUG);
  });

  it('throws Forbidden when RLS returns no row (non-member)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { requireAccountMembership } = await import(
      './require-account-membership'
    );

    await expect(requireAccountMembership(VICTIM_SLUG)).rejects.toThrow(
      /Forbidden: not a member of this account/,
    );
  });

  it('throws AccountMembershipError (typed) for a non-member', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { requireAccountMembership, AccountMembershipError } = await import(
      './require-account-membership'
    );

    await expect(requireAccountMembership(VICTIM_SLUG)).rejects.toBeInstanceOf(
      AccountMembershipError,
    );
  });

  it('fails closed when the membership query returns an error', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'connection reset' },
    });

    const { requireAccountMembership } = await import(
      './require-account-membership'
    );

    await expect(requireAccountMembership(MEMBER_SLUG)).rejects.toThrow(
      /Forbidden: not a member of this account/,
    );
  });

  it('fails closed when the Supabase client throws', async () => {
    mockMaybeSingle.mockRejectedValue(new Error('network down'));

    const { requireAccountMembership } = await import(
      './require-account-membership'
    );

    await expect(requireAccountMembership(MEMBER_SLUG)).rejects.toThrow(
      /Forbidden: not a member of this account/,
    );
  });

  it('rejects a blank slug without querying at all', async () => {
    const { requireAccountMembership } = await import(
      './require-account-membership'
    );

    await expect(requireAccountMembership('   ')).rejects.toThrow(
      /Forbidden: not a member of this account/,
    );

    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('requireMemberAccountId', () => {
  it('returns the account id for a member', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: FAKE_ACCOUNT_ID },
      error: null,
    });

    const { requireMemberAccountId } = await import(
      './require-account-membership'
    );

    await expect(requireMemberAccountId(MEMBER_SLUG)).resolves.toBe(
      FAKE_ACCOUNT_ID,
    );
  });

  it('throws Forbidden for a non-member instead of returning an id', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { requireMemberAccountId } = await import(
      './require-account-membership'
    );

    await expect(requireMemberAccountId(VICTIM_SLUG)).rejects.toThrow(
      /Forbidden: not a member of this account/,
    );
  });
});

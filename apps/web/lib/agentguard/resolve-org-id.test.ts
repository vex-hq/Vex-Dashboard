/**
 * Unit tests for resolve-org-id.ts.
 *
 * `resolveOrgId` queries the RAW AgentGuard pg pool, which bypasses Supabase
 * RLS entirely. A caller-supplied account slug therefore MUST be authorised
 * before the pool is touched, otherwise any signed-in user can act on any
 * workspace by guessing its slug.
 *
 * Both the pg pool and the Supabase server client are fully mocked — no
 * network calls, no database. All fixtures use obviously fake identifiers so
 * the file is safe for a public repository.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fake data fixtures — obviously fake, no production identifiers
// ---------------------------------------------------------------------------

const MEMBER_SLUG = 'acme-team';
const VICTIM_SLUG = 'victim-workspace';
const FAKE_ACCOUNT_ID = 'account-00000000-0000-0000-0000-000000000001';
const FAKE_ORG_ID = 'org-00000000-0000-0000-0000-000000000002';

// ---------------------------------------------------------------------------
// Mock: AgentGuard pg pool
// ---------------------------------------------------------------------------

const mockPoolQuery = vi.fn();

vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({ query: mockPoolQuery }),
}));

// ---------------------------------------------------------------------------
// Mock: @kit/supabase/server-client
//
// The real `requireAccountMembership` runs against this mock, so these tests
// exercise the guard end-to-end rather than stubbing it out.
// ---------------------------------------------------------------------------

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
}));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@kit/supabase/server-client', () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  mockEq.mockReturnValue({
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
  });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });

  mockSingle.mockResolvedValue({ data: { id: FAKE_ACCOUNT_ID }, error: null });
});

afterEach(() => {
  vi.resetModules();
});

function grantMembership() {
  mockMaybeSingle.mockResolvedValue({
    data: { id: FAKE_ACCOUNT_ID },
    error: null,
  });
}

function denyMembership() {
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveOrgId — membership enforcement', () => {
  it('throws Forbidden for a non-member and never touches the pg pool', async () => {
    denyMembership();

    const { resolveOrgId } = await import('./resolve-org-id');

    await expect(resolveOrgId(VICTIM_SLUG)).rejects.toThrow(
      /Forbidden: not a member of this account/,
    );

    // The critical assertion: the RLS-bypassing pool must never be reached.
    expect(mockPoolQuery).not.toHaveBeenCalled();
  });

  it('fails closed (and skips the pool) when the membership check errors', async () => {
    mockMaybeSingle.mockRejectedValue(new Error('supabase unreachable'));

    const { resolveOrgId } = await import('./resolve-org-id');

    await expect(resolveOrgId(VICTIM_SLUG)).rejects.toThrow(
      /Forbidden: not a member of this account/,
    );

    expect(mockPoolQuery).not.toHaveBeenCalled();
  });

  it('resolves the org id for a member', async () => {
    grantMembership();

    mockPoolQuery.mockResolvedValueOnce({ rows: [{ org_id: FAKE_ORG_ID }] });

    const { resolveOrgId } = await import('./resolve-org-id');

    await expect(resolveOrgId(MEMBER_SLUG)).resolves.toBe(FAKE_ORG_ID);

    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
    expect(mockPoolQuery.mock.calls[0]?.[1]).toEqual([MEMBER_SLUG]);
  });

  it('auto-provisions an organization for a member with no org row yet', async () => {
    grantMembership();

    // 1st: account_slug lookup → miss. Slug is not a UUID, so no fallback.
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });
    // 2nd: the INSERT ... RETURNING org_id
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ org_id: FAKE_ACCOUNT_ID }] });

    const { resolveOrgId } = await import('./resolve-org-id');

    await expect(resolveOrgId(MEMBER_SLUG)).resolves.toBe(FAKE_ACCOUNT_ID);
    expect(mockPoolQuery).toHaveBeenCalledTimes(2);
  });
});

describe('resolveOrgIdAsSystem — server-trusted escape hatch', () => {
  it('resolves without a membership check for server-trusted callers', async () => {
    denyMembership();

    mockPoolQuery.mockResolvedValueOnce({ rows: [{ org_id: FAKE_ORG_ID }] });

    const { resolveOrgIdAsSystem } = await import('./resolve-org-id');

    await expect(resolveOrgIdAsSystem(VICTIM_SLUG)).resolves.toBe(FAKE_ORG_ID);
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
  });
});

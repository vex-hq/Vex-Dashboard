/**
 * Unit tests for the onboarding server actions.
 *
 * These actions accept an `accountSlug` straight from the client and then act
 * with the SERVICE-ROLE admin client (which bypasses RLS entirely), so the
 * caller's membership and permissions must be verified server-side first.
 *
 * Every collaborator is mocked — no network calls, no Supabase process, no
 * Next.js runtime. All fixtures use obviously fake identifiers so the file is
 * safe for a public repository.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fake data fixtures — obviously fake, no production identifiers
// ---------------------------------------------------------------------------

const FAKE_USER_ID = 'user-00000000-0000-0000-0000-000000000001';
const FAKE_ACCOUNT_ID = 'account-00000000-0000-0000-0000-000000000002';
const MEMBER_SLUG = 'acme-team';
const VICTIM_SLUG = 'victim-workspace';
const FAKE_ORG_ID = 'org-00000000-0000-0000-0000-000000000003';

const FORBIDDEN_MESSAGE = 'Forbidden: not a member of this account';

// ---------------------------------------------------------------------------
// Mock: membership guard
// ---------------------------------------------------------------------------

const mockRequireMemberAccountId = vi.fn();
const mockRequireAccountMembership = vi.fn();

vi.mock('~/lib/agentguard/require-account-membership', () => ({
  requireMemberAccountId: (...args: unknown[]) =>
    mockRequireMemberAccountId(...args),
  requireAccountMembership: (...args: unknown[]) =>
    mockRequireAccountMembership(...args),
}));

// ---------------------------------------------------------------------------
// Mock: invitation permissions (shared with MakerKit's own invite action)
// ---------------------------------------------------------------------------

const mockCheckInvitationPermissions = vi.fn();

vi.mock('@kit/team-accounts/permissions/invitation-permissions', () => ({
  checkInvitationPermissions: (...args: unknown[]) =>
    mockCheckInvitationPermissions(...args),
}));

// ---------------------------------------------------------------------------
// Mock: invitations service + admin client
// ---------------------------------------------------------------------------

const mockSendInvitations = vi.fn();
const mockCreateAccountInvitationsService = vi.fn(() => ({
  sendInvitations: mockSendInvitations,
}));

vi.mock('@kit/team-accounts/services/account-invitations.service', () => ({
  createAccountInvitationsService: (...args: unknown[]) =>
    mockCreateAccountInvitationsService(...(args as [])),
}));

const mockGetSupabaseServerAdminClient = vi.fn(() => ({ admin: true }));

vi.mock('@kit/supabase/server-admin-client', () => ({
  getSupabaseServerAdminClient: () => mockGetSupabaseServerAdminClient(),
}));

// ---------------------------------------------------------------------------
// Mock: supabase user client + requireUser
// ---------------------------------------------------------------------------

vi.mock('@kit/supabase/server-client', () => ({
  getSupabaseServerClient: () => ({ from: vi.fn() }),
}));

vi.mock('@kit/supabase/require-user', () => ({
  requireUser: vi.fn(async () => ({ data: { id: FAKE_USER_ID } })),
}));

// ---------------------------------------------------------------------------
// Mock: onboarding loader + api keys + org resolution
// ---------------------------------------------------------------------------

const mockUpdateOnboardingStep = vi.fn();
const mockCompleteOnboarding = vi.fn();

vi.mock('~/lib/agentguard/onboarding.loader', () => ({
  updateOnboardingStep: (...args: unknown[]) =>
    mockUpdateOnboardingStep(...args),
  completeOnboarding: (...args: unknown[]) => mockCompleteOnboarding(...args),
}));

const mockCreateKey = vi.fn();
const mockListKeys = vi.fn(async () => []);
const mockRevokeKey = vi.fn();

vi.mock('~/lib/agentguard/api-keys', () => ({
  createKey: (...args: unknown[]) => mockCreateKey(...args),
  listKeys: () => mockListKeys(),
  revokeKey: (...args: unknown[]) => mockRevokeKey(...args),
}));

const mockResolveOrgId = vi.fn(async () => FAKE_ORG_ID);

vi.mock('~/lib/agentguard/resolve-org-id', () => ({
  resolveOrgId: () => mockResolveOrgId(),
}));

// ---------------------------------------------------------------------------
// Mock: @kit/next/actions (enhanceAction)
//
// The real enhanceAction runs Zod validation + auth. We stub it to a thin
// wrapper that validates the schema and injects a fake authenticated user.
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
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  mockRequireMemberAccountId.mockResolvedValue(FAKE_ACCOUNT_ID);
  mockRequireAccountMembership.mockResolvedValue(undefined);
  mockCheckInvitationPermissions.mockResolvedValue({ allowed: true });
  mockSendInvitations.mockResolvedValue(undefined);
  mockCreateAccountInvitationsService.mockReturnValue({
    sendInvitations: mockSendInvitations,
  });
  mockListKeys.mockResolvedValue([]);
  mockCreateKey.mockResolvedValue({
    key: 'ag_fake_key',
    entry: { id: 'key-1' },
  });
  mockResolveOrgId.mockResolvedValue(FAKE_ORG_ID);
});

afterEach(() => {
  vi.resetModules();
});

const ONE_INVITE = [{ email: 'invitee@example.test', role: 'member' as const }];
const OWNER_INVITE = [
  { email: 'attacker@example.test', role: 'owner' as const },
];

// ---------------------------------------------------------------------------
// sendInvitesAction
// ---------------------------------------------------------------------------

describe('sendInvitesAction — authorisation', () => {
  it('refuses a caller who is not a member of the target workspace', async () => {
    mockRequireMemberAccountId.mockRejectedValue(new Error(FORBIDDEN_MESSAGE));

    const { sendInvitesAction } = await import('./server-actions');

    await expect(
      sendInvitesAction({ accountSlug: VICTIM_SLUG, invites: OWNER_INVITE }),
    ).rejects.toThrow(/Forbidden: not a member of this account/);

    // The service-role admin client must never be reached.
    expect(mockGetSupabaseServerAdminClient).not.toHaveBeenCalled();
    expect(mockSendInvitations).not.toHaveBeenCalled();
  });

  it('refuses a member who lacks invites.manage / exceeds their role', async () => {
    mockCheckInvitationPermissions.mockResolvedValue({
      allowed: false,
      reason: 'You cannot invite members with the "owner" role',
    });

    const { sendInvitesAction } = await import('./server-actions');

    await expect(
      sendInvitesAction({ accountSlug: MEMBER_SLUG, invites: OWNER_INVITE }),
    ).rejects.toThrow(/owner/);

    expect(mockGetSupabaseServerAdminClient).not.toHaveBeenCalled();
    expect(mockSendInvitations).not.toHaveBeenCalled();
    expect(mockUpdateOnboardingStep).not.toHaveBeenCalled();
  });

  it('checks permissions against the RLS-resolved account id and the caller', async () => {
    const { sendInvitesAction } = await import('./server-actions');

    await sendInvitesAction({
      accountSlug: MEMBER_SLUG,
      invites: OWNER_INVITE,
    });

    expect(mockRequireMemberAccountId).toHaveBeenCalledWith(MEMBER_SLUG);
    expect(mockCheckInvitationPermissions).toHaveBeenCalledWith(
      FAKE_ACCOUNT_ID,
      FAKE_USER_ID,
      OWNER_INVITE,
    );
  });

  it('sends invitations for a permitted caller', async () => {
    const { sendInvitesAction } = await import('./server-actions');

    const result = await sendInvitesAction({
      accountSlug: MEMBER_SLUG,
      invites: ONE_INVITE,
    });

    expect(result).toEqual({ success: true, count: 1 });
    expect(mockSendInvitations).toHaveBeenCalledWith({
      accountSlug: MEMBER_SLUG,
      invitations: ONE_INVITE,
      invitedBy: FAKE_USER_ID,
    });
  });
});

// ---------------------------------------------------------------------------
// createOnboardingKeyAction
// ---------------------------------------------------------------------------

describe('createOnboardingKeyAction — authorisation', () => {
  it('refuses a non-member before revoking any existing keys (no DoS)', async () => {
    mockResolveOrgId.mockRejectedValue(new Error(FORBIDDEN_MESSAGE));

    const { createOnboardingKeyAction } = await import('./server-actions');

    await expect(
      createOnboardingKeyAction({ accountSlug: VICTIM_SLUG }),
    ).rejects.toThrow(/Forbidden: not a member of this account/);

    expect(mockRevokeKey).not.toHaveBeenCalled();
    expect(mockCreateKey).not.toHaveBeenCalled();
  });

  it('mints a key for a member', async () => {
    const { createOnboardingKeyAction } = await import('./server-actions');

    const result = await createOnboardingKeyAction({
      accountSlug: MEMBER_SLUG,
    });

    expect(result.key).toBe('ag_fake_key');
    expect(mockCreateKey).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateOnboardingStepAction / completeOnboardingAction
// ---------------------------------------------------------------------------

describe('onboarding progress actions — authorisation', () => {
  it('updateOnboardingStepAction refuses a non-member', async () => {
    mockRequireAccountMembership.mockRejectedValue(
      new Error(FORBIDDEN_MESSAGE),
    );

    const { updateOnboardingStepAction } = await import('./server-actions');

    await expect(
      updateOnboardingStepAction({ accountSlug: VICTIM_SLUG, step: 1 }),
    ).rejects.toThrow(/Forbidden: not a member of this account/);

    expect(mockUpdateOnboardingStep).not.toHaveBeenCalled();
  });

  it('completeOnboardingAction refuses a non-member', async () => {
    mockRequireAccountMembership.mockRejectedValue(
      new Error(FORBIDDEN_MESSAGE),
    );

    const { completeOnboardingAction } = await import('./server-actions');

    await expect(
      completeOnboardingAction({ accountSlug: VICTIM_SLUG }),
    ).rejects.toThrow(/Forbidden: not a member of this account/);

    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
  });

  it('completeOnboardingAction succeeds for a member', async () => {
    const { completeOnboardingAction } = await import('./server-actions');

    await expect(
      completeOnboardingAction({ accountSlug: MEMBER_SLUG }),
    ).resolves.toEqual({ success: true });

    expect(mockCompleteOnboarding).toHaveBeenCalledWith(MEMBER_SLUG);
  });
});

/**
 * Unit tests for the onboarding server actions.
 *
 * These actions accept an `accountSlug` straight from the client and then act
 * on the resolved workspace — minting and revoking API keys, writing onboarding
 * progress — so the caller's membership must be verified server-side first.
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
const MEMBER_SLUG = 'acme-team';
const VICTIM_SLUG = 'victim-workspace';
const FAKE_ORG_ID = 'org-00000000-0000-0000-0000-000000000003';

const FORBIDDEN_MESSAGE = 'Forbidden: not a member of this account';

// ---------------------------------------------------------------------------
// Mock: membership guard
// ---------------------------------------------------------------------------

const mockRequireAccountMembership = vi.fn();

vi.mock('~/lib/agentguard/require-account-membership', () => ({
  requireAccountMembership: (...args: unknown[]) =>
    mockRequireAccountMembership(...args),
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

const mockLoadLatestVisibleWrite = vi.fn(
  async (
    _orgId: string,
    _userId: string,
  ): Promise<{ id: string; projectId: string | null } | null> => null,
);

vi.mock('./server/activation-landing.loader', () => ({
  loadLatestVisibleWrite: (
    orgId: string,
    userId: string,
  ): Promise<{ id: string; projectId: string | null } | null> =>
    mockLoadLatestVisibleWrite(orgId, userId),
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

  mockRequireAccountMembership.mockResolvedValue(undefined);
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

  it('persists the RunLocal step index so a refresh resumes on that screen', async () => {
    const { createOnboardingKeyAction } = await import('./server-actions');

    await createOnboardingKeyAction({ accountSlug: MEMBER_SLUG });

    // Step 1 is RunLocal — the screen that mints the key and hands the user the
    // terminal command. Resuming past it would skip the point of the screen.
    expect(mockUpdateOnboardingStep).toHaveBeenCalledWith(MEMBER_SLUG, 1);
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
    ).resolves.toEqual({ success: true, href: `/home/${MEMBER_SLUG}` });

    expect(mockCompleteOnboarding).toHaveBeenCalledWith(MEMBER_SLUG);
  });

  it('lands on the project when the newest visible write has one', async () => {
    mockLoadLatestVisibleWrite.mockResolvedValueOnce({
      id: 'mem-1',
      projectId: 'proj-9',
    });

    const { completeOnboardingAction } = await import('./server-actions');

    await expect(
      completeOnboardingAction({ accountSlug: MEMBER_SLUG }),
    ).resolves.toEqual({
      success: true,
      href: `/home/${MEMBER_SLUG}/projects/proj-9?item=mem-1`,
    });
  });
});

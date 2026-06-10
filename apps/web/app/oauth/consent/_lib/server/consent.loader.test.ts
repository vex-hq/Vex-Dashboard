/**
 * Unit tests for consent.loader.ts.
 *
 * The Supabase client and consent-service module are fully mocked — no
 * network calls, no Supabase process.  All fixtures use obviously fake
 * identifiers so the file is safe for a public repository.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fake data fixtures — obviously fake, no production identifiers
// ---------------------------------------------------------------------------

const FAKE_AUTH_ID = 'auth-id-loader-00000000-0000-0000-0000-000000000001';
const FAKE_CLIENT_ID = 'client-id-00000000-0000-0000-0000-000000000002';
const FAKE_CLIENT_NAME = 'Test MCP Client';
const FAKE_REDIRECT_HINT = 'https://localhost:9999/oauth/callback';
const FAKE_REDIRECT_URL =
  'https://localhost:9999/oauth/callback?code=abc&state=xyz';

const FAKE_DETAILS = {
  authorizationId: FAKE_AUTH_ID,
  clientId: FAKE_CLIENT_ID,
  clientName: FAKE_CLIENT_NAME,
  scopes: ['openid', 'profile'],
  redirectHint: FAKE_REDIRECT_HINT,
};

const TEAM_ACCOUNTS = [
  { slug: 'acme-corp', name: 'Acme Corp', is_personal_account: false },
  { slug: 'beta-team', name: 'Beta Team', is_personal_account: false },
];

// ---------------------------------------------------------------------------
// Mock the consent-service module
// ---------------------------------------------------------------------------

const mockGetAuthorizationDetails = vi.fn();

vi.mock('~/lib/oauth/consent-service', () => ({
  getAuthorizationDetails: (...args: unknown[]) =>
    mockGetAuthorizationDetails(...args),
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
// Supabase client mock builder
// ---------------------------------------------------------------------------

function buildMockClient(accountRows: unknown[]): SupabaseClient {
  const order = vi.fn().mockReturnValue({ data: accountRows, error: null });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });

  return {
    from: vi.fn().mockReturnValue({ select }),
  } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.resetModules();
});

describe('loadConsentPage', () => {
  describe('already_consented passthrough', () => {
    it('returns the already_consented union without loading accounts', async () => {
      mockGetAuthorizationDetails.mockResolvedValueOnce({
        kind: 'already_consented',
        redirectTo: FAKE_REDIRECT_URL,
      });

      const client = buildMockClient([]);
      const { loadConsentPage } = await import('./consent.loader');

      const result = await loadConsentPage(client, FAKE_AUTH_ID);

      expect(result).toEqual({
        kind: 'already_consented',
        redirectTo: FAKE_REDIRECT_URL,
      });

      // Should not have queried accounts at all
      expect(client.from).not.toHaveBeenCalled();
    });
  });

  describe('consent_required — happy path', () => {
    it('returns details and the mapped team workspaces', async () => {
      mockGetAuthorizationDetails.mockResolvedValueOnce({
        kind: 'consent_required',
        details: FAKE_DETAILS,
      });

      const client = buildMockClient(TEAM_ACCOUNTS);
      const { loadConsentPage } = await import('./consent.loader');

      const result = await loadConsentPage(client, FAKE_AUTH_ID);

      expect(result).toMatchObject({
        kind: 'consent_required',
        details: FAKE_DETAILS,
        workspaces: [
          { slug: 'acme-corp', name: 'Acme Corp' },
          { slug: 'beta-team', name: 'Beta Team' },
        ],
      });
    });

    it('returns an empty workspace list when the user has no team accounts', async () => {
      mockGetAuthorizationDetails.mockResolvedValueOnce({
        kind: 'consent_required',
        details: FAKE_DETAILS,
      });

      const client = buildMockClient([]);
      const { loadConsentPage } = await import('./consent.loader');

      const result = await loadConsentPage(client, FAKE_AUTH_ID);

      expect(result).toMatchObject({ workspaces: [] });
    });

    it('filters out rows with a null slug', async () => {
      mockGetAuthorizationDetails.mockResolvedValueOnce({
        kind: 'consent_required',
        details: FAKE_DETAILS,
      });

      const accountsWithNullSlug = [
        { slug: null, name: 'Ghost Team', is_personal_account: false },
        { slug: 'real-team', name: 'Real Team', is_personal_account: false },
      ];

      const client = buildMockClient(accountsWithNullSlug);
      const { loadConsentPage } = await import('./consent.loader');

      const result = await loadConsentPage(client, FAKE_AUTH_ID);

      expect(result).toMatchObject({
        workspaces: [{ slug: 'real-team', name: 'Real Team' }],
      });
    });
  });

  describe('error handling', () => {
    it('propagates ConsentServiceError from getAuthorizationDetails', async () => {
      const { ConsentServiceError } =
        await import('~/lib/oauth/consent-service');

      mockGetAuthorizationDetails.mockRejectedValueOnce(
        new ConsentServiceError('Authorization not found or has expired.'),
      );

      const client = buildMockClient([]);
      const { loadConsentPage } = await import('./consent.loader');

      await expect(loadConsentPage(client, FAKE_AUTH_ID)).rejects.toThrow(
        'Authorization not found or has expired.',
      );
    });

    it('throws when the accounts query returns an error', async () => {
      mockGetAuthorizationDetails.mockResolvedValueOnce({
        kind: 'consent_required',
        details: FAKE_DETAILS,
      });

      const order = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });

      const client = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as SupabaseClient;

      const { loadConsentPage } = await import('./consent.loader');

      await expect(loadConsentPage(client, FAKE_AUTH_ID)).rejects.toThrow(
        'Failed to load team workspaces: DB error',
      );
    });
  });
});

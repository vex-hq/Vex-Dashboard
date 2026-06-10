/**
 * Unit tests for consent-service.ts.
 *
 * Transport is fully mocked: we inject a fake SupabaseClient whose
 * `auth.oauth.*` methods are vitest spies. No network calls are made.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ConsentServiceError,
  approveAuthorization,
  denyAuthorization,
  getAuthorizationDetails,
} from './consent-service';

// ---------------------------------------------------------------------------
// Fake data fixtures — obviously fake, no production identifiers
// ---------------------------------------------------------------------------

const FAKE_AUTH_ID = 'auth-id-test-00000000-0000-0000-0000-000000000001';
const FAKE_CLIENT_ID = 'client-id-00000000-0000-0000-0000-000000000002';
const FAKE_CLIENT_NAME = 'Acme MCP Client';
const FAKE_REDIRECT_URI = 'https://localhost:9999/oauth/callback';
const FAKE_REDIRECT_URL =
  'https://localhost:9999/oauth/callback?code=test-code-abc&state=xyz';
const FAKE_DENY_REDIRECT_URL =
  'https://localhost:9999/oauth/callback?error=access_denied&state=xyz';
const FAKE_SCOPE = 'openid profile email';

// ---------------------------------------------------------------------------
// Mock builder
// ---------------------------------------------------------------------------

/**
 * Build a minimal SupabaseClient fake with controllable `auth.oauth` methods.
 * Each method is a fresh `vi.fn()` so tests can configure it per-scenario.
 */
function buildMockClient(overrides?: {
  getAuthorizationDetails?: ReturnType<typeof vi.fn>;
  approveAuthorization?: ReturnType<typeof vi.fn>;
  denyAuthorization?: ReturnType<typeof vi.fn>;
}): SupabaseClient {
  return {
    auth: {
      oauth: {
        getAuthorizationDetails:
          overrides?.getAuthorizationDetails ?? vi.fn(),
        approveAuthorization: overrides?.approveAuthorization ?? vi.fn(),
        denyAuthorization: overrides?.denyAuthorization ?? vi.fn(),
      },
    },
  } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// getAuthorizationDetails
// ---------------------------------------------------------------------------

describe('getAuthorizationDetails', () => {
  it('maps a full details response to AuthorizationDetails', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: {
        authorization_id: FAKE_AUTH_ID,
        redirect_uri: FAKE_REDIRECT_URI,
        scope: FAKE_SCOPE,
        client: {
          id: FAKE_CLIENT_ID,
          name: FAKE_CLIENT_NAME,
          uri: 'https://acme.example.com',
          logo_uri: 'https://acme.example.com/logo.png',
        },
        user: { id: 'user-001', email: 'test@example.com' },
      },
      error: null,
    });

    const client = buildMockClient({ getAuthorizationDetails: mockGet });
    const result = await getAuthorizationDetails(client, FAKE_AUTH_ID);

    expect(result).toEqual({
      authorizationId: FAKE_AUTH_ID,
      clientId: FAKE_CLIENT_ID,
      clientName: FAKE_CLIENT_NAME,
      scopes: ['openid', 'profile', 'email'],
      redirectHint: FAKE_REDIRECT_URI,
    });
    expect(mockGet).toHaveBeenCalledWith(FAKE_AUTH_ID);
  });

  it('splits a space-separated scope string into an array', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: {
        authorization_id: FAKE_AUTH_ID,
        redirect_uri: FAKE_REDIRECT_URI,
        scope: 'read:agents write:sessions',
        client: { id: FAKE_CLIENT_ID, name: 'Test', uri: '', logo_uri: '' },
        user: { id: 'u-2', email: 'a@b.com' },
      },
      error: null,
    });

    const client = buildMockClient({ getAuthorizationDetails: mockGet });
    const result = await getAuthorizationDetails(client, FAKE_AUTH_ID);

    expect(result.scopes).toEqual(['read:agents', 'write:sessions']);
  });

  it('returns an empty scopes array when scope is an empty string', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: {
        authorization_id: FAKE_AUTH_ID,
        redirect_uri: FAKE_REDIRECT_URI,
        scope: '',
        client: { id: FAKE_CLIENT_ID, name: 'Test', uri: '', logo_uri: '' },
        user: { id: 'u-3', email: 'c@d.com' },
      },
      error: null,
    });

    const client = buildMockClient({ getAuthorizationDetails: mockGet });
    const result = await getAuthorizationDetails(client, FAKE_AUTH_ID);

    expect(result.scopes).toEqual([]);
  });

  it('throws ConsentServiceError with alreadyConsented when Supabase returns only redirect_url', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: { redirect_url: FAKE_REDIRECT_URL },
      error: null,
    });

    const client = buildMockClient({ getAuthorizationDetails: mockGet });

    await expect(
      getAuthorizationDetails(client, FAKE_AUTH_ID),
    ).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ConsentServiceError)) return false;
      const cause = err.cause as Record<string, unknown> | undefined;
      return cause?.alreadyConsented === true && cause?.redirectTo === FAKE_REDIRECT_URL;
    });
  });

  it('throws ConsentServiceError with a useful message on SDK error', async () => {
    const sdkError = { message: 'Authorization request expired', status: 404 };
    const mockGet = vi.fn().mockResolvedValue({ data: null, error: sdkError });

    const client = buildMockClient({ getAuthorizationDetails: mockGet });

    await expect(
      getAuthorizationDetails(client, FAKE_AUTH_ID),
    ).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ConsentServiceError)) return false;
      return (
        err.message.toLowerCase().includes('expired') ||
        err.message.toLowerCase().includes('not found')
      );
    });
  });

  it('throws ConsentServiceError when the SDK call itself throws (network error)', async () => {
    const mockGet = vi
      .fn()
      .mockRejectedValue(new Error('Network connection refused'));

    const client = buildMockClient({ getAuthorizationDetails: mockGet });

    await expect(
      getAuthorizationDetails(client, FAKE_AUTH_ID),
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof ConsentServiceError &&
        err.message.includes('Network connection refused')
      );
    });
  });

  it('throws ConsentServiceError immediately for an empty authorization ID', async () => {
    const client = buildMockClient();

    await expect(getAuthorizationDetails(client, '  ')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ConsentServiceError &&
        err.message.includes('must not be empty'),
    );
  });
});

// ---------------------------------------------------------------------------
// approveAuthorization
// ---------------------------------------------------------------------------

describe('approveAuthorization', () => {
  it('returns redirectTo from the SDK redirect_url on success', async () => {
    const mockApprove = vi.fn().mockResolvedValue({
      data: { redirect_url: FAKE_REDIRECT_URL },
      error: null,
    });

    const client = buildMockClient({ approveAuthorization: mockApprove });
    const result = await approveAuthorization(client, FAKE_AUTH_ID);

    expect(result).toEqual({ redirectTo: FAKE_REDIRECT_URL });
    expect(mockApprove).toHaveBeenCalledWith(FAKE_AUTH_ID, {
      skipBrowserRedirect: true,
    });
  });

  it('throws ConsentServiceError with a useful message on SDK error', async () => {
    const sdkError = { message: 'Not found', status: 404 };
    const mockApprove = vi
      .fn()
      .mockResolvedValue({ data: null, error: sdkError });

    const client = buildMockClient({ approveAuthorization: mockApprove });

    await expect(
      approveAuthorization(client, FAKE_AUTH_ID),
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof ConsentServiceError &&
        (err.message.toLowerCase().includes('expired') ||
          err.message.toLowerCase().includes('approve'))
      );
    });
  });

  it('throws ConsentServiceError when the SDK call itself throws (network error)', async () => {
    const mockApprove = vi
      .fn()
      .mockRejectedValue(new Error('fetch failed'));

    const client = buildMockClient({ approveAuthorization: mockApprove });

    await expect(
      approveAuthorization(client, FAKE_AUTH_ID),
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof ConsentServiceError && err.message.includes('fetch failed')
      );
    });
  });

  it('throws ConsentServiceError immediately for an empty authorization ID', async () => {
    const client = buildMockClient();

    await expect(approveAuthorization(client, '')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ConsentServiceError &&
        err.message.includes('must not be empty'),
    );
  });
});

// ---------------------------------------------------------------------------
// denyAuthorization
// ---------------------------------------------------------------------------

describe('denyAuthorization', () => {
  it('returns redirectTo from the SDK redirect_url on success', async () => {
    const mockDeny = vi.fn().mockResolvedValue({
      data: { redirect_url: FAKE_DENY_REDIRECT_URL },
      error: null,
    });

    const client = buildMockClient({ denyAuthorization: mockDeny });
    const result = await denyAuthorization(client, FAKE_AUTH_ID);

    expect(result).toEqual({ redirectTo: FAKE_DENY_REDIRECT_URL });
    expect(mockDeny).toHaveBeenCalledWith(FAKE_AUTH_ID, {
      skipBrowserRedirect: true,
    });
  });

  it('the deny redirect URL contains access_denied', async () => {
    const mockDeny = vi.fn().mockResolvedValue({
      data: { redirect_url: FAKE_DENY_REDIRECT_URL },
      error: null,
    });

    const client = buildMockClient({ denyAuthorization: mockDeny });
    const result = await denyAuthorization(client, FAKE_AUTH_ID);

    expect(result.redirectTo).toContain('access_denied');
  });

  it('throws ConsentServiceError with a useful message on SDK error', async () => {
    const sdkError = { message: 'Expired', status: 410 };
    const mockDeny = vi
      .fn()
      .mockResolvedValue({ data: null, error: sdkError });

    const client = buildMockClient({ denyAuthorization: mockDeny });

    await expect(denyAuthorization(client, FAKE_AUTH_ID)).rejects.toSatisfy(
      (err: unknown) => {
        return (
          err instanceof ConsentServiceError &&
          (err.message.toLowerCase().includes('expired') ||
            err.message.toLowerCase().includes('deny'))
        );
      },
    );
  });

  it('throws ConsentServiceError when the SDK call itself throws (network error)', async () => {
    const mockDeny = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));

    const client = buildMockClient({ denyAuthorization: mockDeny });

    await expect(denyAuthorization(client, FAKE_AUTH_ID)).rejects.toSatisfy(
      (err: unknown) => {
        return (
          err instanceof ConsentServiceError &&
          err.message.includes('Failed to fetch')
        );
      },
    );
  });

  it('throws ConsentServiceError immediately for an empty authorization ID', async () => {
    const client = buildMockClient();

    await expect(denyAuthorization(client, '')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ConsentServiceError &&
        err.message.includes('must not be empty'),
    );
  });
});

// ---------------------------------------------------------------------------
// ConsentServiceError
// ---------------------------------------------------------------------------

describe('ConsentServiceError', () => {
  it('has name ConsentServiceError', () => {
    const err = new ConsentServiceError('test message');

    expect(err.name).toBe('ConsentServiceError');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConsentServiceError);
  });

  it('stores the cause', () => {
    const cause = new Error('raw sdk error');
    const err = new ConsentServiceError('wrapped', cause);

    expect(err.cause).toBe(cause);
    expect(err.message).toBe('wrapped');
  });
});

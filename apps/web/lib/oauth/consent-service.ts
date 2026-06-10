/**
 * Consent service for the Supabase OAuth 2.1 authorization server.
 *
 * When an MCP client starts the authorization code flow, Supabase Auth redirects
 * the user to our consent page with an `authorization_id` query parameter. This
 * module wraps the three SDK calls needed to implement that page:
 *
 *   1. `getAuthorizationDetails` – fetch client name, requested scopes, and
 *      redirect URI so the consent UI can render them.
 *   2. `approveAuthorization` – record consent and receive the redirect URL
 *      (including the authorization code) to send the user back to the client.
 *   3. `denyAuthorization` – reject the request and receive the redirect URL
 *      (including an `error=access_denied` parameter).
 *
 * Pinned contract (derived from @supabase/supabase-js 2.95.3):
 *   - Query parameter:  `authorization_id`
 *   - SDK namespace:    `supabase.auth.oauth.*`
 *   - Details method:   `supabase.auth.oauth.getAuthorizationDetails(id)`
 *   - Approve method:   `supabase.auth.oauth.approveAuthorization(id, { skipBrowserRedirect: true })`
 *   - Deny method:      `supabase.auth.oauth.denyAuthorization(id, { skipBrowserRedirect: true })`
 *   - Redirect field:   `data.redirect_url` (string) on approve/deny responses
 *   - Details shape:    `data.authorization_id` present → consent required;
 *                       only `data.redirect_url` present → already consented, redirect immediately.
 *
 * Reference docs:
 *   https://supabase.com/docs/guides/auth/oauth-server/getting-started
 *   https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
 *   https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Normalized authorization details returned to the consent page.
 *
 * `redirectHint` is the base redirect URI registered by the OAuth client (no
 * code/state appended yet). It can be displayed to reassure users where they
 * will be sent after consent.
 */
export interface AuthorizationDetails {
  authorizationId: string;
  clientId: string;
  clientName: string | null;
  scopes: string[];
  redirectHint: string | null;
}

/**
 * Returned by `approveAuthorization` and `denyAuthorization`.
 * The caller must `router.replace(redirectTo)` or set `window.location.href`.
 */
export interface ConsentDecisionResult {
  redirectTo: string;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/**
 * Thrown by every function in this module on any failure.
 * `message` is safe to surface in the UI; `cause` carries the raw SDK error.
 */
export class ConsentServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ConsentServiceError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract a user-readable string from an unknown thrown value.
 * Narrows safely so we never call `.message` on a non-Error.
 */
function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the details needed to render the consent screen.
 *
 * When the user has already consented to the same set of scopes Supabase may
 * return only a `redirect_url` (auto-approve). In that case this function
 * throws a `ConsentServiceError` with `cause` set to `{ alreadyConsented: true,
 * redirectTo: string }` so the caller can redirect immediately without
 * rendering the consent page.
 *
 * Requires an active authenticated session on `client`.
 *
 * @param client - Supabase client with an authenticated session.
 * @param authorizationId - Value of the `authorization_id` query parameter.
 */
export async function getAuthorizationDetails(
  client: SupabaseClient,
  authorizationId: string,
): Promise<AuthorizationDetails> {
  if (!authorizationId.trim()) {
    throw new ConsentServiceError('Authorization ID must not be empty.');
  }

  let data: Awaited<
    ReturnType<typeof client.auth.oauth.getAuthorizationDetails>
  >['data'];
  let error: Awaited<
    ReturnType<typeof client.auth.oauth.getAuthorizationDetails>
  >['error'];

  try {
    ({ data, error } = await client.auth.oauth.getAuthorizationDetails(
      authorizationId,
    ));
  } catch (thrown: unknown) {
    throw new ConsentServiceError(
      `Failed to fetch authorization details: ${messageFrom(thrown)}`,
      thrown,
    );
  }

  if (error !== null) {
    throw new ConsentServiceError(
      `Authorization not found or has expired. Please restart the login flow.`,
      error,
    );
  }

  if (data === null) {
    throw new ConsentServiceError(
      'Received an empty response when fetching authorization details.',
    );
  }

  // Type-narrow: if `authorization_id` is absent the user already consented
  // and Supabase returned only a redirect_url. Surface this so the caller can
  // handle the redirect rather than rendering the (now pointless) consent page.
  if (!('authorization_id' in data)) {
    throw new ConsentServiceError(
      'Authorization was already approved. Redirecting back to the application.',
      { alreadyConsented: true, redirectTo: data.redirect_url },
    );
  }

  const scopeString: string = data.scope ?? '';
  const scopes = scopeString
    .split(' ')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    authorizationId: data.authorization_id,
    clientId: data.client.id,
    clientName: data.client.name ?? null,
    scopes,
    redirectHint: data.redirect_uri ?? null,
  };
}

/**
 * Approve the authorization request and obtain the redirect URL.
 *
 * Passes `skipBrowserRedirect: true` so the SDK does not navigate
 * automatically — the caller handles the redirect for better UX control
 * (e.g. showing a loading state or using Next.js router).
 *
 * @param client - Supabase client with an authenticated session.
 * @param authorizationId - The `authorization_id` being approved.
 */
export async function approveAuthorization(
  client: SupabaseClient,
  authorizationId: string,
): Promise<ConsentDecisionResult> {
  if (!authorizationId.trim()) {
    throw new ConsentServiceError('Authorization ID must not be empty.');
  }

  let data: Awaited<
    ReturnType<typeof client.auth.oauth.approveAuthorization>
  >['data'];
  let error: Awaited<
    ReturnType<typeof client.auth.oauth.approveAuthorization>
  >['error'];

  try {
    ({ data, error } = await client.auth.oauth.approveAuthorization(
      authorizationId,
      { skipBrowserRedirect: true },
    ));
  } catch (thrown: unknown) {
    throw new ConsentServiceError(
      `Failed to approve authorization: ${messageFrom(thrown)}`,
      thrown,
    );
  }

  if (error !== null) {
    throw new ConsentServiceError(
      'Could not approve this authorization. It may have expired — please restart the login flow.',
      error,
    );
  }

  if (data === null || !data.redirect_url) {
    throw new ConsentServiceError(
      'Approval succeeded but no redirect URL was returned. Please contact support.',
    );
  }

  return { redirectTo: data.redirect_url };
}

/**
 * Deny the authorization request and obtain the redirect URL.
 *
 * The redirect URL will include `error=access_denied` query parameters so
 * the OAuth client can inform the user that the request was rejected.
 *
 * @param client - Supabase client with an authenticated session.
 * @param authorizationId - The `authorization_id` being denied.
 */
export async function denyAuthorization(
  client: SupabaseClient,
  authorizationId: string,
): Promise<ConsentDecisionResult> {
  if (!authorizationId.trim()) {
    throw new ConsentServiceError('Authorization ID must not be empty.');
  }

  let data: Awaited<
    ReturnType<typeof client.auth.oauth.denyAuthorization>
  >['data'];
  let error: Awaited<
    ReturnType<typeof client.auth.oauth.denyAuthorization>
  >['error'];

  try {
    ({ data, error } = await client.auth.oauth.denyAuthorization(
      authorizationId,
      { skipBrowserRedirect: true },
    ));
  } catch (thrown: unknown) {
    throw new ConsentServiceError(
      `Failed to deny authorization: ${messageFrom(thrown)}`,
      thrown,
    );
  }

  if (error !== null) {
    throw new ConsentServiceError(
      'Could not deny this authorization. It may have already expired.',
      error,
    );
  }

  if (data === null || !data.redirect_url) {
    throw new ConsentServiceError(
      'Denial succeeded but no redirect URL was returned. Please contact support.',
    );
  }

  return { redirectTo: data.redirect_url };
}

import { NextResponse } from 'next/server';

import { getLogger } from '@kit/shared/logger';

import { AccountMembershipError } from '~/lib/agentguard/require-account-membership';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import {
  WsTokenSecretMissingError,
  issueWsToken,
} from '~/lib/agentguard/ws-token';

/**
 * GET /api/agentguard/ws-token/[account]
 *
 * Mints the short-lived credential the browser presents to `dashboard-api`'s
 * `/ws` feed, for exactly one workspace.
 *
 * This route is the whole authorisation story for the realtime feed. The
 * engine can only check that a token is well-signed and unexpired; it has no
 * session and no idea who is holding it. Everything about *who may read which
 * org* is decided here, which is why the org id is never taken from the
 * client:
 *
 *  - `account` arrives in the URL and is therefore untrusted. `resolveOrgId`
 *    asserts the signed-in user is a member of that account before it will
 *    name an org, and fails closed. Naming somebody else's slug yields 404,
 *    not their feed.
 *  - The response carries a token for the *resolved* org and nothing else.
 *    There is no parameter that widens it, and no "all orgs" form.
 *
 * The token is a bearer credential with a five-minute life. It is never
 * logged, and `Cache-Control: no-store` keeps it out of shared caches and the
 * browser's disk cache — the same treatment the presigned artifact URLs get.
 */

/**
 * Every refusal is the same 404 with the same message. Whether a workspace
 * exists is not something a non-member gets to learn by asking for a token.
 */
function notFound() {
  return NextResponse.json(
    { error: 'Not found' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * Next's `redirect()` signals itself by throwing an error carrying a
 * `NEXT_REDIRECT` digest. The session helpers behind `resolveOrgId` call it
 * when there is no session, which is right for a page and wrong for a fetch:
 * the hook would receive the sign-in HTML with a 200 and try to parse it as
 * JSON.
 */
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

function unauthenticated() {
  return NextResponse.json(
    { error: 'Sign in to subscribe to live updates' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ account: string }> },
) {
  const { account } = await params;

  if (!account) {
    return notFound();
  }

  let orgId: string;

  try {
    orgId = await resolveOrgId(account);
  } catch (error) {
    if (error instanceof AccountMembershipError) {
      return notFound();
    }

    if (isRedirectError(error)) {
      return unauthenticated();
    }

    throw error;
  }

  try {
    const { token, expiresAt } = issueWsToken(orgId);

    return NextResponse.json(
      { token, expiresAt },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof WsTokenSecretMissingError) {
      // A misconfiguration, not a client error. Say so in the logs, where an
      // operator will see it, and return a plain 503 — the hook backs off and
      // the charts fall back to their last server render.
      const logger = await getLogger();

      logger.error(
        { name: 'agentguard.ws-token', orgId },
        'AGENTGUARD_WS_TOKEN_SECRET is not configured; the realtime feed is unavailable',
      );

      return NextResponse.json(
        { error: 'Realtime updates are unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    throw error;
  }
}

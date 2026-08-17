import 'server-only';

import { createHmac } from 'crypto';

import {
  WS_TOKEN_TTL_SECONDS,
  WS_TOKEN_VERSION,
} from '~/lib/agentguard/ws-token.constants';

export {
  WS_SUBPROTOCOL,
  WS_TOKEN_TTL_SECONDS,
  WS_TOKEN_VERSION,
} from '~/lib/agentguard/ws-token.constants';

/**
 * Mints the short-lived, org-scoped credential the browser presents to
 * `dashboard-api`'s `/ws` feed.
 *
 * WHY THIS EXISTS
 * ---------------
 * `/ws` used to accept every socket that reached it and fan every org's
 * execution metadata — `org_id`, `agent_id`, `session_id`, execution ids,
 * latency, token counts, cost estimates, trace S3 keys — out to all of them.
 * The engine side now authenticates the handshake and buckets connections by
 * org. This is the other half: the browser has to arrive holding something.
 *
 * WHY NOT `X-Vex-Key`
 * -------------------
 * Two independent reasons, either sufficient:
 *
 *  1. A browser cannot set request headers on a WebSocket handshake, so the
 *     key would have to ride in the URL or the subprotocol — a long-lived
 *     credential carrying `ingest`/`verify`/`read`/`memory` scopes, sitting
 *     in a place every reverse proxy writes to disk. It must never reach a
 *     browser at all.
 *  2. There is no key to send. This app talks to the engine database directly
 *     through its own pool and serves every workspace from one deployment; a
 *     Vex key belongs to exactly one org, and stored keys are SHA-256 hashes
 *     with show-once plaintext. We could not fetch the caller's key if we
 *     wanted to.
 *
 * So the authority is the thing this tier actually has: an authenticated
 * session, and `resolveOrgId`, which asserts account membership before it
 * will name an org. The token is the receipt for that check. It grants one
 * capability — read this org's execution feed — for a few minutes, and it
 * cannot be exchanged for anything else.
 *
 * FORMAT
 * ------
 * `v1.<b64url(org_id)>.<exp>.<b64url(hmac_sha256(secret, "v1.<b64url(org_id)>.<exp>"))>`
 *
 * Unpadded base64url, so every character is a legal RFC 7230 token character
 * and the whole string is valid in a `Sec-WebSocket-Protocol` header. The
 * engine verifies the identical string in Python
 * (`services/dashboard-api/app/ws_auth.py`); both suites pin the fixed
 * vector in {@link import('./ws-token.fixture').WS_TOKEN_TEST_VECTOR}, so
 * the two implementations cannot drift apart into a silent outage.
 */

export class WsTokenSecretMissingError extends Error {
  constructor() {
    super(
      'AGENTGUARD_WS_TOKEN_SECRET is not set; the realtime dashboard feed ' +
        'cannot be authenticated.',
    );

    this.name = 'WsTokenSecretMissingError';
  }
}

/** Base64url, unpadded — the engine strips padding too and the two must agree. */
function base64url(input: Buffer): string {
  return input.toString('base64url');
}

function signingInput(encodedOrgId: string, exp: number): string {
  return `${WS_TOKEN_VERSION}.${encodedOrgId}.${exp}`;
}

/**
 * Read the shared HMAC secret.
 *
 * Throws rather than returning a default. A fallback secret here would be a
 * signing key committed to a public repo, which is the same as no
 * authentication at all — and it would fail *open* rather than closed.
 *
 * @throws {WsTokenSecretMissingError} when the variable is unset or blank.
 */
export function getWsTokenSecret(): string {
  const secret = process.env.AGENTGUARD_WS_TOKEN_SECRET;

  if (!secret) {
    throw new WsTokenSecretMissingError();
  }

  return secret;
}

export interface MintWsTokenParams {
  orgId: string;
  secret: string;
  /** Integer Unix timestamp the token dies at. */
  expiresAt: number;
}

/**
 * Sign a token for `orgId`.
 *
 * SECURITY: `orgId` must come from {@link import('./resolve-org-id').resolveOrgId},
 * which asserts the signed-in user is a member of the account. Passing a
 * client-supplied org here mints a credential for a workspace the caller may
 * have no business reading.
 */
export function mintWsToken({
  orgId,
  secret,
  expiresAt,
}: MintWsTokenParams): string {
  if (!orgId) {
    throw new Error('orgId must not be empty');
  }

  if (!secret) {
    throw new WsTokenSecretMissingError();
  }

  const encodedOrgId = base64url(Buffer.from(orgId, 'utf8'));
  const payload = signingInput(encodedOrgId, expiresAt);

  const signature = base64url(
    createHmac('sha256', secret).update(payload, 'ascii').digest(),
  );

  return `${payload}.${signature}`;
}

export interface IssuedWsToken {
  token: string;
  /** Integer Unix timestamp, so the client can refresh before it lapses. */
  expiresAt: number;
}

/**
 * Mint a token for `orgId` valid for {@link WS_TOKEN_TTL_SECONDS}.
 *
 * @param orgId - A membership-checked org id. See {@link mintWsToken}.
 * @param now - Current epoch milliseconds; injectable for tests.
 */
export function issueWsToken(orgId: string, now = Date.now()): IssuedWsToken {
  const expiresAt = Math.floor(now / 1000) + WS_TOKEN_TTL_SECONDS;

  return {
    token: mintWsToken({ orgId, secret: getWsTokenSecret(), expiresAt }),
    expiresAt,
  };
}

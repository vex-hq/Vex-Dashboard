/**
 * Constants shared between the server-side minter (`ws-token.ts`, which is
 * `server-only`) and the browser hook that presents the token
 * (`use-agentguard-updates.ts`).
 *
 * Split out precisely because `ws-token.ts` imports `server-only` and would
 * poison a client bundle. Nothing secret lives here — these are wire-format
 * facts the client legitimately needs.
 */

/** Token version prefix. Bump when the signed payload's shape changes. */
export const WS_TOKEN_VERSION = 'v1';

/**
 * The subprotocol `dashboard-api` negotiates.
 *
 * The client offers this AND the token:
 * `new WebSocket(url, [WS_SUBPROTOCOL, token])`. The server picks this one and
 * echoes only it, never the credential.
 *
 * The `Sec-WebSocket-Protocol` header is the transport for the credential
 * because it is a *header*: unlike a query string it stays out of proxy access
 * logs, `Referer`, and browser history, while still being settable from
 * browser JavaScript — which custom headers on a WebSocket handshake are not.
 */
export const WS_SUBPROTOCOL = 'vex.ws.v1';

/**
 * Token lifetime, in seconds. Short on purpose: the credential is visible to
 * page JavaScript. Must stay at or under the engine's `MAX_TOKEN_LIFETIME_S`
 * (15 min), which refuses longer-lived tokens even when correctly signed.
 */
export const WS_TOKEN_TTL_SECONDS = 5 * 60;

/** Route that mints a token for one account slug. */
export function wsTokenEndpoint(accountSlug: string): string {
  return `/api/agentguard/ws-token/${encodeURIComponent(accountSlug)}`;
}

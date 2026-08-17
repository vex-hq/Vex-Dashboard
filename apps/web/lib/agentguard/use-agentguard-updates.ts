'use client';

import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

import {
  WS_SUBPROTOCOL,
  wsTokenEndpoint,
} from '~/lib/agentguard/ws-token.constants';

const WS_URL = process.env.NEXT_PUBLIC_AGENTGUARD_WS_URL;
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1_000;

interface UseAgentGuardUpdatesOptions {
  /**
   * The workspace whose feed to subscribe to. Required: it selects the org the
   * minted token is scoped to, and the feed no longer has an unscoped form.
   */
  accountSlug: string;
  agentId?: string;
  enabled?: boolean;
}

/**
 * Connects to the AgentGuard dashboard-api WebSocket and triggers a
 * server-component refresh when new execution events arrive.
 *
 * AUTHENTICATION
 * --------------
 * The socket is no longer opened bare. Before connecting, this fetches a
 * short-lived org-scoped token from `/api/agentguard/ws-token/[account]`,
 * which mints it only after asserting the signed-in user is a member of that
 * account. The token is then offered as a `Sec-WebSocket-Protocol` value:
 *
 *     new WebSocket(url, [WS_SUBPROTOCOL, token])
 *
 * — a *header*, so unlike a query string it stays out of proxy access logs,
 * `Referer` and browser history, while still being settable from browser
 * JavaScript, which custom headers on a WebSocket handshake are not. The
 * long-lived `X-Vex-Key` is never sent here and never reaches the browser at
 * all; see `lib/agentguard/ws-token.ts` for why that key could not be used
 * even if we wanted to.
 *
 * The token gates the handshake only. Once a socket is open the engine keeps
 * it open, so there is nothing to refresh mid-connection — each reconnect
 * simply mints a fresh one.
 *
 * Uses exponential back-off for reconnection (up to MAX_RETRIES) and
 * debounces rapid updates to a single `router.refresh()` per 500 ms.
 */
export function useAgentGuardUpdates(
  options: UseAgentGuardUpdatesOptions,
): void {
  const router = useRouter();

  const { accountSlug, agentId, enabled } = options;

  // The refresh callback is read through a ref so the connection effect does
  // not list `router` as a dependency. It used to, via `scheduleRefresh`, and
  // a new router identity would tear down and rebuild the socket — which now
  // costs a token fetch as well as a handshake.
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (!WS_URL || enabled === false || !accountSlug) return;

    let cancelled = false;
    let socket: WebSocket | null = null;
    let retries = 0;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleRefresh() {
      // Debounce: coalesce rapid updates into a single refresh.
      if (refreshTimer) return;

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        routerRef.current.refresh();
      }, 500);
    }

    function scheduleRetry() {
      if (cancelled || retries >= MAX_RETRIES) return;

      const delay = BASE_DELAY_MS * Math.pow(2, retries);
      retries++;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void connect();
      }, delay);
    }

    async function fetchToken(): Promise<string | null> {
      try {
        const response = await fetch(wsTokenEndpoint(accountSlug), {
          // A bearer credential must never be served from a cache, and the
          // route already says so; this stops the browser trying.
          cache: 'no-store',
        });

        if (!response.ok) return null;

        const body = (await response.json()) as { token?: string };

        return body.token ?? null;
      } catch {
        // Offline, aborted, or a non-JSON body from a sign-in bounce.
        return null;
      }
    }

    async function connect() {
      const token = await fetchToken();

      // A refused or unavailable token is not fatal: the charts keep whatever
      // the last server render gave them and we back off. Without a token
      // there is no point opening a socket — the engine would close it 1008.
      if (cancelled || !token) {
        if (!cancelled) scheduleRetry();

        return;
      }

      const ws = new WebSocket(WS_URL!, [WS_SUBPROTOCOL, token]);
      socket = ws;

      ws.onopen = () => {
        retries = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            data?: { agent_id?: string };
          };

          if (msg.type === 'execution.new') {
            // Cosmetic only. Tenancy is enforced server-side by the token's
            // org scope; this narrows an already-scoped feed to one agent so
            // the detail page does not refresh on its siblings' traffic.
            if (agentId && msg.data?.agent_id !== agentId) {
              return;
            }

            scheduleRefresh();
          }
        } catch {
          // Ignore malformed messages.
        }
      };

      ws.onclose = () => {
        if (socket === ws) socket = null;

        scheduleRetry();
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    void connect();

    return () => {
      cancelled = true;
      socket?.close();

      if (refreshTimer) clearTimeout(refreshTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [accountSlug, agentId, enabled]);
}

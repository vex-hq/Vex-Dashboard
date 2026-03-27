import { NextResponse } from 'next/server';

import { enhanceRouteHandler } from '@kit/next/routes';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createNangoService } from '~/lib/integrations/nango.service';

/**
 * GET /api/integrations/slack/channels?connectionId=<nango_connection_id>&accountSlug=<slug>
 *
 * Fetches available Slack channels via Nango proxy for a given connection.
 * Verifies the connection belongs to the caller's organization before proxying.
 */
export const GET = enhanceRouteHandler(
  async ({ request }) => {
    const connectionId = request.nextUrl.searchParams.get('connectionId');
    const accountSlug = request.nextUrl.searchParams.get('accountSlug');

    if (!connectionId || !accountSlug) {
      return NextResponse.json(
        { error: 'connectionId and accountSlug are required' },
        { status: 400 },
      );
    }

    // Verify connection ownership: resolve org from slug, then check connection belongs to it
    const orgId = await resolveOrgId(accountSlug);
    const pool = getAgentGuardPool();
    const ownershipCheck = await pool.query<{ id: string }>(
      `SELECT ic.id
       FROM integration_connections ic
       WHERE ic.nango_connection_id = $1
         AND ic.org_id = $2`,
      [connectionId, orgId],
    );

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 },
      );
    }

    try {
      const nango = createNangoService();
      const data = await nango.get<{
        ok: boolean;
        channels?: Array<{ id: string; name: string }>;
      }>({
        provider: 'slack',
        connectionId,
        endpoint: '/conversations.list',
        queryParams: {
          types: 'public_channel,private_channel',
          exclude_archived: 'true',
          limit: '200',
        },
      });

      if (!data.ok || !data.channels) {
        return NextResponse.json({ error: 'Slack API error' }, { status: 502 });
      }

      const channels = data.channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
      }));

      return NextResponse.json({ channels });
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch channels' },
        { status: 502 },
      );
    }
  },
  { auth: true },
);

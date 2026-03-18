import { NextResponse } from 'next/server';

import { enhanceRouteHandler } from '@kit/next/routes';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createNangoService } from '~/lib/integrations/nango.service';

/**
 * POST /api/integrations/slack/join-channel
 *
 * Adds the Slack bot to a channel via Nango proxy.
 * Must be called before sending messages to a channel the bot hasn't joined.
 */
export const POST = enhanceRouteHandler(
  async ({ request }) => {
    const body = (await request.json()) as {
      connectionId?: string;
      channelId?: string;
      accountSlug?: string;
    };

    const { connectionId, channelId, accountSlug } = body;

    if (!connectionId || !channelId || !accountSlug) {
      return NextResponse.json(
        { error: 'connectionId, channelId, and accountSlug are required' },
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

      const result = await nango.post<{ ok: boolean; error?: string }>({
        provider: 'slack',
        connectionId,
        endpoint: '/conversations.join',
        data: { channel: channelId },
      });

      if (!result.ok && result.error !== 'already_in_channel') {
        const errorMessages: Record<string, string> = {
          channel_not_found: 'Channel not found',
          is_archived: 'Channel is archived',
          method_not_supported_for_channel_type:
            'Cannot join this type of channel',
        };

        const message =
          errorMessages[result.error ?? ''] ?? 'Failed to join channel';

        return NextResponse.json({ error: message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: 'Failed to join channel' },
        { status: 502 },
      );
    }
  },
  { auth: true },
);

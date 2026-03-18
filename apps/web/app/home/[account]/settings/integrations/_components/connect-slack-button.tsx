'use client';

import { useState, useTransition } from 'react';

import Nango from '@nangohq/frontend';

import { Button } from '@kit/ui/button';
import { toast } from '@kit/ui/sonner';
import { Trans } from '@kit/ui/trans';

import {
  createConnectSessionAction,
  saveSlackConnectionAction,
} from '../_lib/server/integrations-actions';

interface ConnectSlackButtonProps {
  accountSlug: string;
}

export function ConnectSlackButton({ accountSlug }: ConnectSlackButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    startTransition(async () => {
      try {
        setIsConnecting(true);

        const { sessionToken } = await createConnectSessionAction({
          accountSlug,
          provider: 'slack',
        });

        const nango = new Nango({ connectSessionToken: sessionToken });
        const result = await nango.auth('slack');

        if (result.connectionId) {
          await saveSlackConnectionAction({
            accountSlug,
            nangoConnectionId: result.connectionId,
          });

          toast.success('Slack connected successfully!');
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('closed')) {
          return;
        }

        toast.error('Failed to connect Slack');
        console.error('Slack connection error:', error);
      } finally {
        setIsConnecting(false);
      }
    });
  };

  return (
    <Button onClick={handleConnect} disabled={isPending || isConnecting}>
      {isPending || isConnecting ? (
        'Connecting...'
      ) : (
        <Trans i18nKey="agentguard:integrations.connectSlack" />
      )}
    </Button>
  );
}

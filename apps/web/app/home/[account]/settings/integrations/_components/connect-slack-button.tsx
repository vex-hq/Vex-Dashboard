'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = useCallback(async () => {
    if (isConnecting) return;

    setIsConnecting(true);

    try {
      // Step 1: Get session token from server
      const { sessionToken } = await createConnectSessionAction({
        accountSlug,
        provider: 'slack',
      });

      // Step 2: Open Nango auth — must not be wrapped in startTransition
      // to avoid browser popup blocker
      const nango = new Nango({ connectSessionToken: sessionToken });
      const result = await nango.auth('slack');

      // Step 3: Save connection
      if (result.connectionId) {
        await saveSlackConnectionAction({
          accountSlug,
          nangoConnectionId: result.connectionId,
        });

        toast.success('Slack connected successfully!');
        router.refresh();
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
  }, [accountSlug, isConnecting, router]);

  return (
    <Button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? (
        'Connecting...'
      ) : (
        <Trans i18nKey="agentguard:integrations.connectSlack" />
      )}
    </Button>
  );
}

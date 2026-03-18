'use client';

import { useEffect, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';

import type { IntegrationConnection } from '~/lib/agentguard/types';

import { createAlertRuleAction } from '../_lib/server/integrations-actions';

interface SlackChannel {
  id: string;
  name: string;
}

interface CreateRuleDialogProps {
  accountSlug: string;
  slackConnections: IntegrationConnection[];
}

export default function CreateRuleDialog({
  accountSlug,
  slackConnections,
}: CreateRuleDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState('0.60');
  const [selectedConnection, setSelectedConnection] = useState(
    slackConnections[0]?.id ?? '',
  );
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(false);

  useEffect(() => {
    if (!selectedConnection || !open) return;

    const connection = slackConnections.find(
      (c) => c.id === selectedConnection,
    );

    if (!connection) return;

    let cancelled = false;

    async function fetchChannels() {
      setLoadingChannels(true);

      try {
        const res = await fetch(
          `/api/integrations/slack/channels?connectionId=${connection!.nango_connection_id}&accountSlug=${accountSlug}`,
        );
        const data = (await res.json()) as { channels: SlackChannel[] };

        if (!cancelled) {
          setChannels(data.channels ?? []);
          setSelectedChannel('');
        }
      } catch {
        if (!cancelled) {
          setChannels([]);
          setSelectedChannel('');
        }
      } finally {
        if (!cancelled) {
          setLoadingChannels(false);
        }
      }
    }

    void fetchChannels();

    return () => {
      cancelled = true;
    };
  }, [selectedConnection, open, slackConnections, accountSlug]);

  function resetForm() {
    setName('');
    setThreshold('0.60');
    setSelectedConnection(slackConnections[0]?.id ?? '');
    setChannels([]);
    setSelectedChannel('');
  }

  function isFormValid(): boolean {
    const thresholdNum = parseFloat(threshold);

    return (
      name.trim().length > 0 &&
      !isNaN(thresholdNum) &&
      thresholdNum >= 0 &&
      thresholdNum <= 1 &&
      selectedConnection.length > 0 &&
      selectedChannel.length > 0
    );
  }

  function handleCreate() {
    const channel = channels.find((c) => c.id === selectedChannel);

    if (!channel) return;

    startTransition(async () => {
      await createAlertRuleAction({
        accountSlug,
        name: name.trim(),
        confidenceThreshold: parseFloat(threshold),
        channelType: 'slack',
        connectionId: selectedConnection,
        slackChannelId: channel.id,
        slackChannelName: channel.name,
      });

      setOpen(false);
      resetForm();
      router.refresh();
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Trans i18nKey="agentguard:integrations.addRule" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="agentguard:integrations.createRuleTitle" />
          </DialogTitle>
          <DialogDescription>
            <Trans i18nKey="agentguard:integrations.createRuleDescription" />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="rule-name">
              <Trans i18nKey="agentguard:integrations.ruleName" />
            </Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Low confidence alert"
              maxLength={255}
            />
          </div>

          {/* Confidence Threshold */}
          <div className="space-y-2">
            <Label htmlFor="rule-threshold">
              <Trans i18nKey="agentguard:integrations.threshold" />
            </Label>
            <Input
              id="rule-threshold"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              <Trans i18nKey="agentguard:integrations.thresholdHelp" />
            </p>
          </div>

          {/* Slack Connection (only if multiple) */}
          {slackConnections.length > 1 && (
            <div className="space-y-2">
              <Label>
                <Trans i18nKey="agentguard:integrations.slackConnection" />
              </Label>
              <Select
                value={selectedConnection}
                onValueChange={setSelectedConnection}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {slackConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.workspace_name ?? conn.provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Slack Channel */}
          <div className="space-y-2">
            <Label>
              <Trans i18nKey="agentguard:integrations.slackChannel" />
            </Label>
            {loadingChannels ? (
              <p className="text-muted-foreground text-sm">
                <Trans i18nKey="agentguard:integrations.loadingChannels" />
              </p>
            ) : (
              <Select
                value={selectedChannel}
                onValueChange={setSelectedChannel}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      channels.length === 0
                        ? 'No channels available'
                        : 'Select a channel'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      #{ch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            <Trans i18nKey="agentguard:integrations.cancel" />
          </Button>
          <Button onClick={handleCreate} disabled={!isFormValid() || pending}>
            <Trans i18nKey="agentguard:integrations.create" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

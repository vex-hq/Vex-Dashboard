'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Bell } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Switch } from '@kit/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

import type {
  AlertRuleWithChannel,
  IntegrationConnection,
} from '~/lib/agentguard/types';

import {
  deleteAlertRuleAction,
  toggleAlertRuleAction,
} from '../_lib/server/integrations-actions';
import CreateRuleDialog from './create-rule-dialog';

interface AlertRulesTableProps {
  alertRules: AlertRuleWithChannel[];
  connections: IntegrationConnection[];
  accountSlug: string;
}

export default function AlertRulesTable({
  alertRules,
  connections,
  accountSlug,
}: AlertRulesTableProps) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<AlertRuleWithChannel | null>(
    null,
  );

  const slackConnections = connections.filter((c) => c.provider === 'slack');
  const hasSlack = slackConnections.length > 0;

  function handleDelete() {
    if (!deleteTarget) return;

    startDelete(async () => {
      await deleteAlertRuleAction({
        accountSlug,
        ruleId: deleteTarget.id,
      });

      setDeleteTarget(null);
      router.refresh();
    });
  }

  function handleToggle(rule: AlertRuleWithChannel) {
    startToggle(async () => {
      await toggleAlertRuleAction({
        accountSlug,
        ruleId: rule.id,
        enabled: !rule.enabled,
      });

      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                <Trans i18nKey="agentguard:integrations.alertRulesTitle" />
              </CardTitle>
              <CardDescription>
                <Trans i18nKey="agentguard:integrations.alertRulesDescription" />
              </CardDescription>
            </div>
            {hasSlack && alertRules.length > 0 && (
              <CreateRuleDialog
                accountSlug={accountSlug}
                slackConnections={slackConnections}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {alertRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <Bell className="text-muted-foreground h-6 w-6" />
              </div>
              <h3 className="text-foreground text-sm font-medium">
                <Trans i18nKey="agentguard:integrations.noAlertRules" />
              </h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-center text-xs">
                <Trans i18nKey="agentguard:integrations.noAlertRulesDescription" />
              </p>
              {hasSlack && (
                <div className="mt-4">
                  <CreateRuleDialog
                    accountSlug={accountSlug}
                    slackConnections={slackConnections}
                  />
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans i18nKey="agentguard:integrations.name" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:integrations.threshold" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:integrations.channel" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:integrations.enabled" />
                  </TableHead>
                  <TableHead>
                    <Trans i18nKey="agentguard:integrations.actions" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertRules.map((rule) => (
                  <TableRow
                    key={rule.id}
                    className={!rule.enabled ? 'opacity-50' : ''}
                  >
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {'< '}
                        {rule.confidence_threshold.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rule.slack_channel_name ? (
                        <span className="font-mono text-sm">
                          #{rule.slack_channel_name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.enabled}
                        disabled={toggling}
                        onCheckedChange={() => handleToggle(rule)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(rule)}
                      >
                        <Trans i18nKey="agentguard:integrations.delete" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans i18nKey="agentguard:integrations.deleteConfirmTitle" />
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <Trans
                  i18nKey="agentguard:integrations.deleteConfirmDescription"
                  values={{ name: deleteTarget.name }}
                />
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              <Trans i18nKey="agentguard:integrations.cancel" />
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trans i18nKey="agentguard:integrations.deleteConfirm" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

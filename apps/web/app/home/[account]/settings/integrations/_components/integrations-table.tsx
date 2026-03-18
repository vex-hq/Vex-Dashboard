'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Plug } from 'lucide-react';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

import type { IntegrationConnection } from '~/lib/agentguard/types';

import { deleteConnectionAction } from '../_lib/server/integrations-actions';
import { ConnectSlackButton } from './connect-slack-button';

interface IntegrationsTableProps {
  connections: IntegrationConnection[];
  accountSlug: string;
}

export default function IntegrationsTable({
  connections,
  accountSlug,
}: IntegrationsTableProps) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [deleteTarget, setDeleteTarget] =
    useState<IntegrationConnection | null>(null);

  function handleDisconnect() {
    if (!deleteTarget) return;

    startDelete(async () => {
      await deleteConnectionAction({
        accountSlug,
        connectionId: deleteTarget.id,
      });

      setDeleteTarget(null);
      router.refresh();
    });
  }

  const hasSlack = connections.some((c) => c.provider === 'slack');

  if (connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:integrations.connectionsTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:integrations.connectionsDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Plug className="text-muted-foreground h-6 w-6" />
          </div>
          <h3 className="text-foreground text-sm font-medium">
            <Trans i18nKey="agentguard:integrations.noConnections" />
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-center text-xs">
            <Trans i18nKey="agentguard:integrations.noConnectionsDescription" />
          </p>
          <div className="mt-4">
            <ConnectSlackButton accountSlug={accountSlug} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                <Trans i18nKey="agentguard:integrations.connectionsTitle" />
              </CardTitle>
              <CardDescription>
                <Trans i18nKey="agentguard:integrations.connectionsDescription" />
              </CardDescription>
            </div>
            {!hasSlack && <ConnectSlackButton accountSlug={accountSlug} />}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans i18nKey="agentguard:integrations.provider" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:integrations.workspace" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:integrations.status" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:integrations.connectedAt" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:integrations.actions" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map((conn) => (
                <TableRow key={conn.id}>
                  <TableCell className="font-medium capitalize">
                    {conn.provider}
                  </TableCell>
                  <TableCell>{conn.workspace_name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        conn.status === 'connected'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }
                    >
                      {conn.status === 'connected' ? (
                        <Trans i18nKey="agentguard:integrations.connected" />
                      ) : (
                        conn.status
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(conn.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(conn)}
                    >
                      <Trans i18nKey="agentguard:integrations.disconnect" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
              <Trans i18nKey="agentguard:integrations.disconnectConfirmTitle" />
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <Trans
                  i18nKey="agentguard:integrations.disconnectConfirmDescription"
                  values={{
                    provider: deleteTarget.provider,
                    workspace:
                      deleteTarget.workspace_name ?? deleteTarget.provider,
                  }}
                />
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              <Trans i18nKey="agentguard:integrations.cancel" />
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trans i18nKey="agentguard:integrations.disconnect" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

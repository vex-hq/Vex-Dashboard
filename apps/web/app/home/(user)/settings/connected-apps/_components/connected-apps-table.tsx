'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

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

import { formatTimestamp } from '~/lib/agentguard/formatters';

import type { ConnectedApp } from '../_lib/server/connected-apps.loader';
import { revokeGrantAction } from '../_lib/server/connected-apps-actions';

interface ConnectedAppsTableProps {
  apps: ConnectedApp[];
}

export default function ConnectedAppsTable({ apps }: ConnectedAppsTableProps) {
  const router = useRouter();
  const [revoking, startRevoke] = useTransition();
  const [revokeTarget, setRevokeTarget] = useState<ConnectedApp | null>(null);

  function handleRevoke() {
    if (!revokeTarget) return;

    startRevoke(async () => {
      await revokeGrantAction({ grantId: revokeTarget.id });
      setRevokeTarget(null);
      router.refresh();
    });
  }

  if (apps.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-muted-foreground mb-2 text-4xl">&#128279;</div>
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="agentguard:connectedApps.noApps" />
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            <Trans i18nKey="agentguard:connectedApps.noAppsDescription" />
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:connectedApps.pageTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:connectedApps.pageDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans i18nKey="agentguard:connectedApps.client" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:connectedApps.workspace" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:connectedApps.connectedAt" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:connectedApps.actions" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                      {app.oauth_client_id}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {app.account_slug}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatTimestamp(app.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRevokeTarget(app)}
                    >
                      <Trans i18nKey="agentguard:connectedApps.revokeAccess" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans i18nKey="agentguard:connectedApps.revokeConfirmTitle" />
            </AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget && (
                <Trans
                  i18nKey="agentguard:connectedApps.revokeConfirmDescription"
                  values={{ clientId: revokeTarget.oauth_client_id }}
                />
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>
              <Trans i18nKey="agentguard:connectedApps.cancel" />
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trans i18nKey="agentguard:connectedApps.revokeConfirm" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

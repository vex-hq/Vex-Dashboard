'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FlaskConical, Trash2 } from 'lucide-react';

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

import type { Experiment } from '~/lib/agentguard/types';

import { deleteExperimentAction } from '../_lib/server/experiments-actions';

interface ExperimentsTableProps {
  experiments: Experiment[];
  accountSlug: string;
}

const STATUS_BADGE_CLASS: Record<Experiment['status'], string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const MODE_BADGE_CLASS: Record<Experiment['mode'], string> = {
  offline:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  live: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

function getStatusI18nKey(status: Experiment['status']): string {
  const map: Record<Experiment['status'], string> = {
    draft: 'agentguard:experiments.statusDraft',
    running: 'agentguard:experiments.statusRunning',
    completed: 'agentguard:experiments.statusCompleted',
  };
  return map[status];
}

function getModeI18nKey(mode: Experiment['mode']): string {
  const map: Record<Experiment['mode'], string> = {
    offline: 'agentguard:experiments.modeOffline',
    live: 'agentguard:experiments.modeLive',
  };
  return map[mode];
}

export function ExperimentsTable({
  experiments,
  accountSlug,
}: ExperimentsTableProps) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<Experiment | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;

    startDelete(async () => {
      await deleteExperimentAction({
        accountSlug,
        experimentId: deleteTarget.id,
      });

      setDeleteTarget(null);
      router.refresh();
    });
  }

  if (experiments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:experiments.pageTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:experiments.pageDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <FlaskConical className="text-muted-foreground h-6 w-6" />
          </div>
          <h3 className="text-foreground text-sm font-medium">
            <Trans i18nKey="agentguard:experiments.noExperiments" />
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-center text-xs">
            <Trans i18nKey="agentguard:experiments.noExperimentsDescription" />
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
            <Trans i18nKey="agentguard:experiments.pageTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:experiments.pageDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans i18nKey="agentguard:experiments.name" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:experiments.mode" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:experiments.status" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:experiments.variants" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:experiments.createdAt" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:experiments.actions" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {experiments.map((experiment) => (
                <TableRow key={experiment.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/home/${accountSlug}/experiments/${experiment.id}`}
                      className="hover:underline"
                    >
                      {experiment.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={MODE_BADGE_CLASS[experiment.mode]}
                    >
                      <Trans i18nKey={getModeI18nKey(experiment.mode)} />
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUS_BADGE_CLASS[experiment.status]}
                    >
                      <Trans i18nKey={getStatusI18nKey(experiment.status)} />
                    </Badge>
                  </TableCell>
                  <TableCell>{experiment.variants.length}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(experiment.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(experiment);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
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
              <Trans i18nKey="agentguard:experiments.deleteConfirmTitle" />
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <Trans
                  i18nKey="agentguard:experiments.deleteConfirmDescription"
                  values={{ name: deleteTarget.name }}
                />
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              <Trans i18nKey="agentguard:experiments.cancel" />
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trans i18nKey="agentguard:experiments.deleteExperiment" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

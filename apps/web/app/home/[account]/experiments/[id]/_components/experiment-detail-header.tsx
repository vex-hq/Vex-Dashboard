'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Check, Copy, Trash2 } from 'lucide-react';

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
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import type { Experiment } from '~/lib/agentguard/types';

import {
  deleteExperimentAction,
  updateExperimentStatusAction,
} from '../../_lib/server/experiments-actions';

interface ExperimentDetailHeaderProps {
  experiment: Experiment;
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

export function ExperimentDetailHeader({
  experiment,
  accountSlug,
}: ExperimentDetailHeaderProps) {
  const router = useRouter();
  const [completing, startComplete] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleMarkCompleted() {
    startComplete(async () => {
      await updateExperimentStatusAction({
        accountSlug,
        experimentId: experiment.id,
        status: 'completed',
      });

      router.refresh();
    });
  }

  function handleDelete() {
    startDelete(async () => {
      await deleteExperimentAction({
        accountSlug,
        experimentId: experiment.id,
      });

      router.push(`/home/${accountSlug}/experiments`);
    });
  }

  async function handleCopyId() {
    await navigator.clipboard.writeText(experiment.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">{experiment.name}</CardTitle>

              {experiment.description && (
                <p className="text-muted-foreground text-sm">
                  {experiment.description}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={STATUS_BADGE_CLASS[experiment.status]}
                >
                  <Trans i18nKey={getStatusI18nKey(experiment.status)} />
                </Badge>

                <Badge
                  variant="outline"
                  className={MODE_BADGE_CLASS[experiment.mode]}
                >
                  <Trans i18nKey={getModeI18nKey(experiment.mode)} />
                </Badge>

                <span className="text-muted-foreground text-xs">
                  {experiment.variants.length}{' '}
                  <Trans i18nKey="agentguard:experiments.variants" />
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {experiment.status === 'running' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkCompleted}
                  disabled={completing}
                >
                  <Trans i18nKey="agentguard:experiments.markCompleted" />
                </Button>
              )}

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                <Trans i18nKey="agentguard:experiments.deleteExperiment" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Experiment ID:
            </span>
            <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
              {experiment.id}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleCopyId}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans i18nKey="agentguard:experiments.deleteConfirmTitle" />
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="agentguard:experiments.deleteConfirmDescription"
                values={{ name: experiment.name }}
              />
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

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
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import { Trans } from '@kit/ui/trans';

import { deleteDatasetAction } from '../../../experiments/_lib/server/experiments-actions';

interface DeleteDatasetButtonProps {
  datasetId: string;
  datasetName: string;
  accountSlug: string;
}

export function DeleteDatasetButton({
  datasetId,
  datasetName,
  accountSlug,
}: DeleteDatasetButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  function handleDelete() {
    startDelete(async () => {
      await deleteDatasetAction({
        accountSlug,
        datasetId,
      });

      router.push(`/home/${accountSlug}/datasets`);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trans i18nKey="agentguard:datasets.deleteDataset" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="agentguard:datasets.deleteConfirmTitle" />
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans
              i18nKey="agentguard:datasets.deleteConfirmDescription"
              values={{ name: datasetName }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>
            <Trans i18nKey="agentguard:datasets.cancel" />
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trans i18nKey="agentguard:datasets.deleteDataset" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

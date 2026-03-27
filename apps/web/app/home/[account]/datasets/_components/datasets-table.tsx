'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Database } from 'lucide-react';

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

import type { Dataset } from '~/lib/agentguard/types';

import { deleteDatasetAction } from '../../experiments/_lib/server/experiments-actions';

interface DatasetsTableProps {
  datasets: Dataset[];
  accountSlug: string;
}

export default function DatasetsTable({
  datasets,
  accountSlug,
}: DatasetsTableProps) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;

    startDelete(async () => {
      await deleteDatasetAction({
        accountSlug,
        datasetId: deleteTarget.id,
      });

      setDeleteTarget(null);
      router.refresh();
    });
  }

  if (datasets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:datasets.pageTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:datasets.pageDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Database className="text-muted-foreground h-6 w-6" />
          </div>
          <h3 className="text-foreground text-sm font-medium">
            <Trans i18nKey="agentguard:datasets.noDatasets" />
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-center text-xs">
            <Trans i18nKey="agentguard:datasets.noDatasetsDescription" />
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
            <Trans i18nKey="agentguard:datasets.pageTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:datasets.pageDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans i18nKey="agentguard:datasets.name" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:datasets.items" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:datasets.created" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="agentguard:datasets.actions" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.map((dataset) => (
                <TableRow key={dataset.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/home/${accountSlug}/datasets/${dataset.id}`}
                      className="text-primary hover:underline"
                    >
                      {dataset.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Trans
                      i18nKey="agentguard:datasets.itemCount"
                      values={{ count: dataset.items.length }}
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(dataset.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(dataset)}
                    >
                      <Trans i18nKey="agentguard:datasets.deleteDataset" />
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
              <Trans i18nKey="agentguard:datasets.deleteConfirmTitle" />
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <Trans
                  i18nKey="agentguard:datasets.deleteConfirmDescription"
                  values={{ name: deleteTarget.name }}
                />
              )}
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
    </>
  );
}
